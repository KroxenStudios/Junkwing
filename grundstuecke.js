import * as THREE from "three";
import { hausPos, briefkastenPos, KELLER_TIEFE, gruben } from "./haus.js";
import { hoeheBei } from "./weltdaten.js";
import { baueDeko } from "./deko.js";
import { baueBaeume } from "./baeume.js";

// grundstücke aus dem welt-editor (weltplatz.js): jedes grundstück ist ein eigenes, eingeebnetes rechteck im gelände. wie die alte wohngegend
// (wohngegend.js) liegt das gelände dort KELLER_TIEFE unter dem boden, bodenplatten bilden den boden wieder aus, und ein haus mit keller
// schneidet seine grube hinein. alles hier ist fest (collider) und sichtbar. das haus steht in der mitte des rechtecks, die vorderseite zeigt nach +z.

const RAND = 70;   // m: weicher übergang zum gelände rund um ein grundstück
const glatt = t => t * t * (3 - 2 * t);

// ebnet jedes grundstück in den weltdaten ein (setzt p.y = höhe des bodens), nimmt bäume und felsen dort weg. vor baueGelaende aufrufen
export function ebneGrundstuecke(d, plaetze) {
  if (!d?.h || !d.n || !plaetze?.length) return;
  const n = d.n, s = d.schritt, h = d.h;
  for (const p of plaetze) {
    // mittlere höhe aus einem raster von stichproben über das rechteck (vor dem einebnen)
    let summe = 0, anzahl = 0;
    for (let i = 0; i <= 4; i++) for (let k = 0; k <= 4; k++) { summe += hoeheBei(d, p.x - p.b / 2 + (p.b * i) / 4, p.z - p.t / 2 + (p.t * k) / 4); anzahl++; }
    const y = p.y = Math.round((summe / anzahl) * 10) / 10;
    const x0 = p.x - p.b / 2, x1 = p.x + p.b / 2, z0 = p.z - p.t / 2, z1 = p.z + p.t / 2;
    for (let ix = 0; ix < n; ix++) {
      const x = d.x0 + ix * s;
      if (x < x0 - RAND || x > x1 + RAND) continue;
      for (let iz = 0; iz < n; iz++) {
        const z = d.z0 + iz * s;
        if (z < z0 - RAND || z > z1 + RAND) continue;
        const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1);
        const abstand = Math.hypot(dx, dz);
        if (abstand >= RAND) continue;
        const k = ix * n + iz;
        const kern = abstand === 0 && x >= x0 + s && x <= x1 - s && z >= z0 + s && z <= z1 - s;
        h[k] += ((kern ? y - KELLER_TIEFE : y) - h[k]) * (1 - glatt(abstand / RAND));
      }
    }
    for (const schluessel of ["baeume", "felsen"]) {
      const alt = d[schluessel];
      if (!alt?.length) continue;
      const neu = [];
      for (let i = 0; i + 2 < alt.length; i += 3) if (!(alt[i] >= x0 - 8 && alt[i] <= x1 + 8 && alt[i + 1] >= z0 - 8 && alt[i + 1] <= z1 + 8)) neu.push(alt[i], alt[i + 1], alt[i + 2]);
      d[schluessel] = Array.isArray(alt) ? neu : Float32Array.from(neu);
    }
  }
}

export function baueGrundstuecke({ scene, world, RAPIER, mat, plaetze }) {
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const seiten = mat("#7a6048", { roughness: 1 }), gras = mat("#5f9f50", { roughness: 0.95 }), fuell = mat("#4a3b2c", { roughness: 1 });
  const oben = [seiten, seiten, gras, seiten, seiten, seiten];
  const stand = new Map();   // id -> { gruppe, cols }

  const platte = (st, x0, x1, z0, z1, y0, y1, mats) => {
    if (x1 - x0 < 0.01 || z1 - z0 < 0.01 || y1 - y0 < 0.01) return;
    const m = new THREE.Mesh(geoBox, mats);
    m.scale.set(x1 - x0, y1 - y0, z1 - z0);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.receiveShadow = true;
    st.gruppe.add(m);
    st.cols.push(world.createCollider(RAPIER.ColliderDesc.cuboid((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2).setTranslation(m.position.x, m.position.y, m.position.z).setFriction(0.95)));
  };
  const weg = st => { scene.remove(st.gruppe); for (const c of st.cols) try { world.removeCollider(c, true); } catch {} };

  // ein grundstück (neu) bauen; g = grube des hauses ({ rect, tiefe }) oder null
  function baueLot(p, g) {
    const alt = stand.get(p.id);
    if (alt) weg(alt);
    const st = { gruppe: new THREE.Group(), cols: [] };
    stand.set(p.id, st);
    scene.add(st.gruppe);
    const y = p.y || 0, T = KELLER_TIEFE;
    const x0 = p.x - p.b / 2, x1 = p.x + p.b / 2, z0 = p.z - p.t / 2, z1 = p.z + p.t / 2;
    // die platten liegen mit der oberkante bei y; ihre mitte (y - T/2) bis y
    const pl = (a, b, c, e, ya, yb, mats) => platte(st, a, b, c, e, y + ya, y + yb, mats);
    if (!g) pl(x0, x1, z0, z1, -T, 0, oben);
    else {
      const hx0 = Math.max(x0, p.x + g.rect[0] + 0.05), hz0 = Math.max(z0, p.z + g.rect[1] + 0.05), hx1 = Math.min(x1, p.x + g.rect[2] - 0.05), hz1 = Math.min(z1, p.z + g.rect[3] - 0.05);
      pl(x0, hx0, z0, z1, -T, 0, oben);
      pl(hx1, x1, z0, z1, -T, 0, oben);
      pl(hx0, hx1, z0, hz0, -T, 0, oben);
      pl(hx0, hx1, hz1, z1, -T, 0, oben);
      pl(hx0, hx1, hz0, hz1, -T, -g.tiefe, fuell);
    }
    // briefkasten (haus.js legt die stelle fest) und vier eckpfosten als grundstücksgrenze
    const bp = briefkastenPos(p.id);
    const pfosten = (x, z, h, farbe) => { const m = new THREE.Mesh(geoBox, mat(farbe, { roughness: 0.8 })); m.scale.set(0.12, h, 0.12); m.position.set(x, y + h / 2, z); m.castShadow = true; st.gruppe.add(m); };
    pfosten(bp.x, bp.z, 0.5, "#6b4a2d");
    const k = new THREE.Mesh(geoBox, mat("#e5484d", { roughness: 0.6 }));
    k.scale.set(0.3, 0.2, 0.2);
    k.position.set(bp.x, y + 0.58, bp.z);
    st.gruppe.add(k);
    for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) pfosten(cx, cz, 1.2, "#f2f2f2");
    st.cols.push(world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 0.25, 0.15).setTranslation(bp.x, y + 0.25, bp.z)));
  }
  for (const p of plaetze) baueLot(p, gruben.map.get(p.id) || null);
  const nachId = new Map(plaetze.map(p => [p.id, p]));
  gruben.hoerer = (lot, g) => { const p = nachId.get(lot); if (p) baueLot(p, g); };
  return { hausPos };
}

// assets (deko und bäume) aus dem welt-editor als gruppe; hoehe(x, z) = geländehöhe. rückgabe die gruppe (zum entfernen: scene.remove)
export function baueWeltAssets(scene, assets, hoehe) {
  const gruppe = new THREE.Group();
  const baeume = [];
  for (const a of assets) {
    if (a.k === "baum") { baeume.push([a.x, a.z, a.s * 3, a.t]); continue; }
    const g = baueDeko(a.t, a.s);
    g.position.set(a.x, a.y ?? hoehe(a.x, a.z), a.z);
    g.rotation.y = (a.r * Math.PI) / 180;
    g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    gruppe.add(g);
  }
  if (baeume.length) baueBaeume(baeume, hoehe, gruppe);
  scene.add(gruppe);
  return gruppe;
}
