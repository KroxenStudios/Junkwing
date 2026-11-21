import * as THREE from "three";
import { hausPos, briefkastenPos, HAUS_Z, WOHN_X, KLEIN_VERSATZ, setzeWohnHoehe, wohnHoehe } from "./haus.js";
import { baueBaeume } from "./baeume.js";

// wohngegend: 20 grundstücke in einer reihe an einer straße, auf einer eigenen, eingeebneten fläche weit weg vom flughafen und
// von jedem asphalt (die weltdaten haben dort hügel; flacheWohngegendAb ebnet die fläche ein). ein grundstück ist ein rasenstück mit
// hecken zu den nachbarn; es bleibt leer, solange niemand dort wohnt. das haus und der kleine parkplatz kommen erst mit dem
// spieler (haus.js). es gibt keine anderen häuser. maßstab wie die häuser: die figur ist etwa 1 m hoch, also sind bäume 3 bis 5 m,
// laternen 3 m und die straße 6 m breit.

const ANZAHL = 20, BREITE = 16;
const STRASSE_Z = HAUS_Z + KLEIN_VERSATZ + 14;          // mitte der straße, hinter dem kleinen parkplatz und dem gehweg
const X0 = WOHN_X - (ANZAHL * BREITE) / 2 - 20, X1 = WOHN_X + (ANZAHL * BREITE) / 2 + 20, XM = WOHN_X, XL = X1 - X0;
const GARTEN_Z0 = HAUS_Z - 16, GARTEN_Z1 = HAUS_Z + KLEIN_VERSATZ + 6.2;   // grundstück: vom garten hinter dem haus bis zum parkplatz
const FLAECHE = { x0: X0 - 8, x1: X1 + 8, z0: GARTEN_Z0 - 8, z1: STRASSE_Z + 12 };   // wird eingeebnet
const RAND = 140;                                        // m: weicher übergang zum gelände

const glatt = t => t * t * (3 - 2 * t);

// ebnet die fläche in den weltdaten (heightfield und gezeichnetes gelände teilen sich d.h) auf die mittlere höhe ein, mit weichem
// rand, und nimmt bäume und felsen dort weg. rückgabe: die höhe der fläche. vor baueGelaende aufrufen
export function flacheWohngegendAb(d) {
  if (!d?.h || !d.n) return 0;
  const n = d.n, s = d.schritt, h = d.h;
  const im = (x, z, r = 0) => x >= FLAECHE.x0 - r && x <= FLAECHE.x1 + r && z >= FLAECHE.z0 - r && z <= FLAECHE.z1 + r;
  let summe = 0, anzahl = 0;
  for (let ix = 0; ix < n; ix++) {
    const x = d.x0 + ix * s;
    if (x < FLAECHE.x0 - s || x > FLAECHE.x1 + s) continue;
    for (let iz = 0; iz < n; iz++) {
      const z = d.z0 + iz * s;
      if (z < FLAECHE.z0 - s || z > FLAECHE.z1 + s) continue;
      summe += h[ix * n + iz];
      anzahl++;
    }
  }
  if (!anzahl) return 0;
  const y = Math.round((summe / anzahl) * 10) / 10;
  for (let ix = 0; ix < n; ix++) {
    const x = d.x0 + ix * s;
    if (x < FLAECHE.x0 - RAND || x > FLAECHE.x1 + RAND) continue;
    for (let iz = 0; iz < n; iz++) {
      const z = d.z0 + iz * s;
      const dx = Math.max(FLAECHE.x0 - x, 0, x - FLAECHE.x1), dz = Math.max(FLAECHE.z0 - z, 0, z - FLAECHE.z1);
      const abstand = Math.hypot(dx, dz);
      if (abstand >= RAND) continue;
      const w = 1 - glatt(abstand / RAND);
      const k = ix * n + iz;
      h[k] += (y - h[k]) * w;
    }
  }
  // bäume und felsen (flache listen x, z, größe) auf der fläche entfernen
  for (const schluessel of ["baeume", "felsen"]) {
    const alt = d[schluessel];
    if (!alt?.length) continue;
    const neu = [];
    for (let i = 0; i + 2 < alt.length; i += 3) if (!im(alt[i], alt[i + 1], 12)) neu.push(alt[i], alt[i + 1], alt[i + 2]);
    d[schluessel] = Array.isArray(alt) ? neu : Float32Array.from(neu);
  }
  setzeWohnHoehe(y);
  return y;
}

// ob (x, z) auf der wohngegend liegt (z. b. um dort keine zufallsbäume zu setzen), mit abstand r
export const aufWohngegend = (x, z, r = 0) => x >= FLAECHE.x0 - r && x <= FLAECHE.x1 + r && z >= FLAECHE.z0 - r && z <= FLAECHE.z1 + r;

export function baueWohngegend({ scene, world, RAPIER, mat }) {
  const Y = wohnHoehe();
  const gr = new THREE.Group();
  gr.position.y = Y;
  scene.add(gr);
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const flach = (breite, laenge, farbe, x, z, lage, y = 0.02) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(breite, laenge), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: lage, polygonOffsetUnits: lage }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    gr.add(m);
    return m;
  };
  const fest = (x, y, z, sx, sy, sz, farbe) => {
    const m = new THREE.Mesh(geoBox, mat(farbe, { roughness: 0.85 }));
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    gr.add(m);
    world.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2).setTranslation(x, y + Y, z).setFriction(0.9));
    return m;
  };

  // grundstücke: je ein rasenstück (leicht wechselnde farbe), solange niemand dort wohnt bleibt es eine leere wiese
  const xs = Array.from({ length: ANZAHL }, (_, i) => hausPos(i).x).sort((a, b) => a - b);
  const tief = GARTEN_Z1 - GARTEN_Z0;
  const gruene = ["#5f9f50", "#68a756", "#5a9a4c", "#6aa95a"];
  xs.forEach((x, i) => flach(BREITE - 0.2, tief, gruene[i % gruene.length], x, (GARTEN_Z0 + GARTEN_Z1) / 2, -1, 0.012));
  // gehwege und straße (6 m) davor
  flach(XL, 3, "#bdb9ae", XM, STRASSE_Z - 5.5, -2, 0.025);
  flach(XL, 3, "#bdb9ae", XM, STRASSE_Z + 5.5, -2, 0.025);
  flach(XL, 6, "#44474c", XM, STRASSE_Z, -2, 0.03);
  const striche = [];
  for (let x = X0 + 3; x < X1; x += 5) striche.push(x);
  const linie = new THREE.InstancedMesh(geoBox, new THREE.MeshBasicMaterial({ color: "#e8e6dc" }), striche.length);
  const m4 = new THREE.Matrix4();
  striche.forEach((x, i) => { m4.compose(new THREE.Vector3(x, 0.045, STRASSE_Z), new THREE.Quaternion(), new THREE.Vector3(1.5, 0.01, 0.12)); linie.setMatrixAt(i, m4); });
  linie.frustumCulled = false;
  gr.add(linie);

  // hecken zwischen den grundstücken und an den enden (0,8 m hoch), fest
  const grenzen = [xs[0] - BREITE / 2, ...xs.slice(0, -1).map((x, i) => (x + xs[i + 1]) / 2), xs[xs.length - 1] + BREITE / 2];
  for (const x of grenzen) fest(x, 0.4, (GARTEN_Z0 + GARTEN_Z1) / 2 - 3, 0.5, 0.8, tief - 6, "#3f7d35");
  // hecke am hinteren ende der grundstücke
  fest(XM, 0.4, GARTEN_Z0, ANZAHL * BREITE, 0.8, 0.5, "#3f7d35");

  // laternen am gehweg: mast (3 m) und leuchtkopf als instanzen
  const mastX = [];
  for (let x = X0 + 10; x < X1; x += 24) mastX.push(x);
  const maste = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.05, 3, 8), mat("#3a4352", { metalness: 0.4 }), mastX.length);
  const koepfe = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: "#fff3c4", emissive: "#ffd36b", emissiveIntensity: 0.8 }), mastX.length);
  mastX.forEach((x, i) => {
    m4.compose(new THREE.Vector3(x, 1.5, STRASSE_Z - 4.2), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    maste.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, 3.05, STRASSE_Z - 4.2), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    koepfe.setMatrixAt(i, m4);
  });
  maste.frustumCulled = koepfe.frustumCulled = false;
  maste.castShadow = true;
  gr.add(maste, koepfe);

  // bäume (größe 2 bis 3,5, also etwa 3 bis 5 m hoch): gegenüber der straße und je einer im garten der grundstücke
  const baeume = [];
  const arten = [1, 2, 5, 1, 4, 2];
  let n = 0;
  for (let x = X0 + 6; x < X1; x += 12) baeume.push([x + (rnd() - 0.5) * 3, STRASSE_Z + 8, 2.4 + rnd() * 1.1, arten[n++ % arten.length]]);
  for (const x of xs) baeume.push([x + (rnd() < 0.5 ? -5 : 5) + rnd(), HAUS_Z - 8 - rnd() * 3, 2 + rnd() * 1.2, arten[n++ % arten.length]]);
  baueBaeume(baeume, () => 0, gr);

  // briefkasten am rand jedes grundstücks (haus.js legt die stelle fest: dort lässt er sich öffnen, wenn ein haus da steht)
  for (let lot = 0; lot < ANZAHL; lot++) {
    const bp = briefkastenPos(lot);
    fest(bp.x, 0.25, bp.z, 0.06, 0.5, 0.06, "#6b4a2d");
    const k = new THREE.Mesh(geoBox, mat("#e5484d", { roughness: 0.6 }));
    k.scale.set(0.3, 0.2, 0.2);
    k.position.set(bp.x, 0.58, bp.z);
    gr.add(k);
  }
}
