import * as THREE from "three";
import * as F from "./hausformat.js";
import * as B from "./hausbau.js";
import { materialFuer, boxGeo } from "./texturen.js";

// haus-editor: ein würfel-editor (blöcke zu 0,5 m) mit wänden, türen, klappen, geheimwänden und einrichtung. die sichtbare wand und die
// hitbox (die feste kollision) sind getrennte listen im dokument (hausformat.js); standardmäßig baut man beides in einem zug
// (hitbox = auto), über "hitbox bearbeiten" lässt sich die kollision unabhängig von der wand ändern.

const L = (de, en) => (window.WG ? WG.L(de, en) : de);
const LAGER = "bastelkarre-haeuser";
const MAX_LOKAL = 10;

export function ladeLokal() {
  try { const l = JSON.parse(localStorage.getItem(LAGER) || "[]"); return Array.isArray(l) ? l.map(F.bereinigeHaus).filter(Boolean) : []; } catch { return []; }
}
function schreibeLokal(liste) { try { localStorage.setItem(LAGER, JSON.stringify(liste)); return true; } catch { return false; } }
export function speichereLokal(doc, index = -1) {
  const liste = ladeLokal();
  if (index >= 0 && index < liste.length) liste[index] = doc;
  else if (liste.length >= MAX_LOKAL) return -1;
  else { liste.push(doc); index = liste.length - 1; }
  return schreibeLokal(liste) ? index : -1;
}
export function loescheLokal(index) { const l = ladeLokal(); l.splice(index, 1); schreibeLokal(l); }
export function dateiSpeichern(doc) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(doc)], { type: "application/json" }));
  a.download = (doc.name.replace(/[^\w\-äöüÄÖÜß ]+/g, "").trim() || "haus") + ".bkhaus.json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const WERKZEUGE = [
  ["wuerfel", "Würfel", "Cube", "1"], ["entfernen", "Entfernen", "Remove", "2"], ["pinsel", "Farbe auftragen", "Paint", "3"],
  ["wand", "Wand", "Wall", "4"], ["quader", "Quader", "Block", "5"], ["raum", "Raum (hohl)", "Room (hollow)", "6"],
  ["tuer", "Tür", "Door", "7"], ["klappe", "Klappe", "Hatch", "8"], ["geheim", "Geheimwand", "Secret wall", "9"],
  ["objekt", "Objekt setzen", "Place object", "0"], ["auswahl", "Auswählen", "Select", "V"], ["bloecke", "Blöcke wählen", "Select blocks", "B"]
];
const BAU_WERKZEUGE = new Set(["wuerfel", "entfernen", "pinsel", "wand", "quader", "raum"]);

const css = `
body.hauseditor #game > :not(#scene) { display: none !important; }
body.hauseditor { overflow: hidden; }
#he { position: fixed; inset: 0; z-index: 50; font: 13px/1.35 system-ui, sans-serif; color: #f4f7fb; user-select: none; touch-action: none; }
#he[hidden] { display: none; }
#he .flaeche { position: absolute; inset: 0; cursor: crosshair; }
#he .glas { position: absolute; padding: 10px; border-radius: 16px; background: linear-gradient(160deg, rgba(255,255,255,0.20), rgba(255,255,255,0.06)); border: 1px solid rgba(255,255,255,0.30);
  backdrop-filter: blur(18px) saturate(1.4); -webkit-backdrop-filter: blur(18px) saturate(1.4); box-shadow: inset 0 1px 1px rgba(255,255,255,0.4), 0 14px 40px rgba(0,0,0,0.35); }
#he .oben { top: 10px; left: 10px; right: 10px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
#he .links { top: 66px; left: 10px; width: 150px; display: grid; gap: 4px; max-height: calc(100vh - 150px); overflow: auto; }
#he .rechts { top: 66px; right: 10px; width: 270px; display: grid; gap: 8px; max-height: calc(100vh - 150px); overflow: auto; }
#he button { font: inherit; color: inherit; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.24); border-radius: 9px; padding: 6px 10px; cursor: pointer; text-align: left; }
#he button:hover { background: rgba(255,255,255,0.24); }
#he button.an { background: #ffb547; color: #1b1b1b; border-color: #ffb547; }
#he button.primaer { background: #e10600; border-color: #e10600; }
#he input[type=text], #he input[type=number], #he select { font: inherit; color: inherit; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.28); border-radius: 8px; padding: 4px 7px; }
#he input[type=range] { width: 100%; }
#he label { display: grid; gap: 2px; } #he label b { font-weight: 600; opacity: 0.8; font-size: 12px; }
#he h3 { margin: 4px 0 0; font-size: 12px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.06em; }
#he .zeile { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
#he .farben { display: flex; gap: 4px; flex-wrap: wrap; }
#he .farben i { width: 22px; height: 22px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; }
#he .farben i.an { border-color: #fff; }
#he .mat { display: flex; gap: 4px; flex-wrap: wrap; }
#he .mat button { width: 34px; height: 34px; padding: 0; border-radius: 8px; text-align: center; font-weight: 700; text-shadow: 0 1px 3px #000a; }
#he .mat button.an { outline: 2px solid #ffd24a; }
#he .status { left: 10px; bottom: 10px; max-width: calc(100vw - 20px); position: absolute; padding: 6px 12px; border-radius: 12px; background: rgba(10,14,22,0.7); }
#he .status.fehler { background: rgba(122,26,22,0.85); }
#he .hilfe { opacity: 0.75; font-size: 12px; }
@media (max-width: 760px) { #he .rechts { top: auto; bottom: 46px; max-height: 38vh; width: 230px; } #he .links { width: 118px; } }
`;

const el = (tag, props = {}, ...kinder) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e[k] = v;
  }
  e.append(...kinder);
  return e;
};
const klammer = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// schnittstelle: { zu(), verwenden(doc) }
export function erzeugeHausEditor({ renderer, schnittstelle }) {
  const stil = document.createElement("style");
  stil.textContent = css;
  document.head.append(stil);

  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#a9cde6");
  const kamera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
  szene.add(new THREE.HemisphereLight("#ffffff", "#6b7a5a", 1.1));
  const sonne = new THREE.DirectionalLight("#fff4de", 2.2);
  sonne.position.set(12, 24, 10);
  szene.add(sonne);
  const gruppe = new THREE.Group();   // wände, teile, objekte (wird bei jeder änderung neu gebaut)
  szene.add(gruppe);
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const geist = new THREE.LineSegments(new THREE.EdgesGeometry(geoBox), new THREE.LineBasicMaterial({ color: "#ffd24a", depthTest: false }));
  geist.renderOrder = 20;
  geist.visible = false;
  szene.add(geist);
  const auswahlRahmen = new THREE.BoxHelper(new THREE.Object3D(), "#ffd24a");
  auswahlRahmen.visible = false;
  szene.add(auswahlRahmen);

  let offen = false, dok = null, vox = null, hbVox = null;
  let werkzeug = "wuerfel", modus = "wand";        // modus: was die bau-werkzeuge ändern: "wand" oder "hitbox"
  let aktMat = 1, hoehe = 3, ebene = 0, objektTyp = "sofa", objektDreh = 0, hingeSeite = 1, hausTuer = false, hbZeigen = false;
  let start = null;                               // erste ecke von wand, quader, raum
  let auswahl = null;                             // { art: "objekt" | "teil", i }
  let materialGlobal = false;                     // false: eine änderung von farbe/textur gilt nur für die nächsten blöcke (neues material)
  let blockSel = new Set();                       // ausgewählte blöcke (schlüssel des rasters), z. b. um sie anders zu färben
  let undoStapel = [], geaendert = false, quelle = -1;
  let ziehen = null, cursor = null;
  const tasten = new Set();
  const cam = { x: 0, y: 1, z: 0, yaw: 0.6, pitch: 0.75, dist: 13 };
  const raycaster = new THREE.Raycaster();

  const wurzel = el("div", { id: "he", hidden: true });
  const flaeche = el("div", { class: "flaeche" });
  const oben = el("div", { class: "glas oben" });
  const links = el("div", { class: "glas links" });
  const rechts = el("div", { class: "glas rechts" });
  const status = el("div", { class: "status" });
  wurzel.append(flaeche, oben, links, rechts, status);
  document.body.append(wurzel);

  const meldung = (t, fehler = false) => { status.textContent = t; status.classList.toggle("fehler", fehler); };
  const ziel = () => (modus === "hitbox" ? hbVox : vox);

  // ---------------------------------------------------------------------------
  // dokument <-> raster
  // ---------------------------------------------------------------------------
  function ladeDok(d) {
    dok = F.bereinigeHaus(d) || F.neuesHaus();
    const [mx, mz, my] = dok.masse;
    vox = F.Voxel.ausQuader(dok.quader, mx, mz, my);
    // die öffnungen der teile bleiben leer (beim bereinigen schon entfernt)
    hbVox = F.Voxel.ausQuader(F.kollisionsQuader(dok).map(q => [...q, 1]), mx, mz, my);
    if (!dok.material.some(m => m.id === aktMat)) aktMat = dok.material[0].id;
    modus = dok.hitbox.auto ? "wand" : modus;
    start = null;
    auswahl = null;
    blockSel = new Set();
    baueAlles();
  }
  // aktuellen stand in das dokument schreiben und kanonisch bereinigen
  function sync() {
    dok.quader = vox.zuQuader();
    dok.hitbox = { auto: dok.hitbox.auto, quader: dok.hitbox.auto ? [] : hbVox.zuQuader().map(q => q.slice(0, 6)) };
    return F.bereinigeHaus(dok);
  }
  function sichere() {
    undoStapel.push(JSON.stringify(sync()));
    if (undoStapel.length > 80) undoStapel.shift();
    geaendert = true;
  }
  function zurueck() {
    const s = undoStapel.pop();
    if (!s) return;
    ladeDok(JSON.parse(s));
  }

  // ---------------------------------------------------------------------------
  // szene bauen
  // ---------------------------------------------------------------------------
  function leere(g) {
    for (const k of [...g.children]) {
      g.remove(k);
      k.traverse(o => { if (o.geometry && !o.geometry.userData.geteilt && o.geometry !== geoBox) o.geometry.dispose(); });
    }
  }
  const wp = (x, y, z) => B.blockZuWelt({ x, y, z }, dok.masse);
  function baueSzene() {
    leere(gruppe);
    const [mx, mz, my] = dok.masse;
    // boden und raster
    const bw = mx * F.BLOCK, bt = mz * F.BLOCK;
    const gras = new THREE.Mesh(new THREE.PlaneGeometry(bw + 14, bt + 14), new THREE.MeshStandardMaterial({ color: "#6aa24f", roughness: 1 }));
    gras.rotation.x = -Math.PI / 2;
    gras.position.y = -0.02;
    gruppe.add(gras);
    const pos = [];
    for (let x = 0; x <= mx; x++) pos.push((x - mx / 2) * F.BLOCK, 0.005, -bt / 2, (x - mx / 2) * F.BLOCK, 0.005, bt / 2);
    for (let z = 0; z <= mz; z++) pos.push(-bw / 2, 0.005, (z - mz / 2) * F.BLOCK, bw / 2, 0.005, (z - mz / 2) * F.BLOCK);
    const raster = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)), new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.22 }));
    gruppe.add(raster);
    // wände (mit schnitt: ab der ebene ausgeblendet) und bodenplatte
    let sicht = vox;
    if (ebene > 0) { sicht = new F.Voxel(mx, mz, my); for (const [k, m] of vox.zellen) if (Math.floor(k / (mx * mz)) < ebene) sicht.zellen.set(k, m); }
    const stand = sync() || dok;   // frisch bereinigt: die hitbox-liste ist aktuell
    const def = F.defAusDoc({ ...stand, quader: sicht.zuQuader() });
    for (const [x, y, z, sx, sy, sz, farbe, art] of def.boxen) {
      const m = new THREE.Mesh(boxGeo(sx, sy, sz), materialFuer(farbe, art));
      m.position.set(x, y, z);
      gruppe.add(m);
    }
    // hitbox als grüne durchsichtige boxen (im hitbox-modus oder auf wunsch)
    if (modus === "hitbox" || hbZeigen) {
      const hm = new THREE.MeshBasicMaterial({ color: "#22d36b", transparent: true, opacity: 0.28, depthWrite: false });
      for (const [x, y, z, sx, sy, sz] of def.kollision) {
        const b = new THREE.Mesh(boxGeo(sx, sy, sz), hm);
        b.position.set(x, y, z);
        gruppe.add(b);
        const kante = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo(sx, sy, sz)), new THREE.LineBasicMaterial({ color: "#22d36b" }));
        kante.position.copy(b.position);
        gruppe.add(kante);
      }
    }
    // ausgewählte blöcke: gelbe, leicht größere durchsichtige boxen
    if (blockSel.size) {
      const sv = new F.Voxel(mx, mz, my);
      for (const k of blockSel) if (vox.zellen.has(k)) sv.zellen.set(k, 1);
      const sm = new THREE.MeshBasicMaterial({ color: "#ffd24a", transparent: true, opacity: 0.45, depthWrite: false });
      for (const [x0, y0, z0, x1, y1, z1] of sv.zuQuader()) {
        const a = wp(x0, y0, z0), b = wp(x1, y1, z1);
        const m = new THREE.Mesh(geoBox, sm);
        m.scale.set(b.x - a.x + 0.02, b.y - a.y + 0.02, b.z - a.z + 0.02);
        m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
        gruppe.add(m);
      }
    }
    // teile (geschlossen dargestellt)
    const farbeVon = Object.fromEntries(dok.material.map(m => [m.id, m]));
    dok.teile.forEach((t, i) => {
      const [w, h] = F.TEIL_MASSE[t.t];
      const f = farbeVon[t.m] || dok.material[0];
      const dick = t.t === "geheim" ? 0.3 : 0.12;
      const m = new THREE.Mesh(boxGeo(1, 1, 1), materialFuer(f.farbe, f.textur, t.t === "geheim" ? { transparent: true, opacity: 0.85 } : {}));
      m.scale.set(t.a === 1 ? dick : w * F.BLOCK, h * F.BLOCK, t.a === 1 ? w * F.BLOCK : dick);
      const c = wp(t.a === 1 ? t.x + 0.5 : t.x + w / 2, t.y + h / 2, t.a === 1 ? t.z + w / 2 : t.z + 0.5);
      m.position.set(c.x, c.y + (t.y === 0 ? F.SCHWELLE : 0), c.z);
      m.userData = { teil: i };
      gruppe.add(m);
      if (t.haus) {   // die haustür bekommt einen gelben streifen
        const s = new THREE.Mesh(geoBox, new THREE.MeshBasicMaterial({ color: "#ffd24a" }));
        s.scale.set(m.scale.x + 0.02, 0.05, m.scale.z + 0.02);
        s.position.set(m.position.x, m.position.y + m.scale.y / 2 + 0.03, m.position.z);
        gruppe.add(s);
      }
    });
    // einrichtung
    dok.objekte.forEach((o, i) => {
      const g = objektGruppe(o.a);
      const p = wp(o.x, o.y, o.z);
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = o.r * Math.PI / 2;
      g.userData = { objekt: i };
      g.traverse(k => { if (k !== g) k.userData = { objekt: i }; });
      gruppe.add(g);
    });
    zeigeAuswahl();
  }
  function objektGruppe(typ) {
    const g = new THREE.Group();
    for (const [ox, oy, oz, sx, sy, sz, farbe, extra] of F.MOEBEL[typ].teile) {
      const m = new THREE.Mesh(geoBox, materialFuer(farbe, "glatt", { roughness: 0.8, ...(extra || {}) }));
      m.scale.set(sx, sy, sz);
      m.position.set(ox, oy, oz);
      g.add(m);
    }
    return g;
  }
  function zeigeAuswahl() {
    auswahlRahmen.visible = false;
    if (!auswahl) return;
    const obj = gruppe.children.find(k => k.userData && k.userData[auswahl.art === "objekt" ? "objekt" : "teil"] === auswahl.i && (k.isGroup || k.isMesh));
    if (!obj) return;
    auswahlRahmen.setFromObject(obj);
    auswahlRahmen.visible = true;
  }
  let bauTimer = 0;
  function baueAlles() { baueSzene(); baueRechts(); status.textContent = zaehler(); }
  function planeBau() { if (!bauTimer) bauTimer = setTimeout(() => { bauTimer = 0; baueSzene(); }, 40); }
  function zaehler() {
    const h = F.pruefeHaus(sync());
    return `${vox.anzahl()} ${L("Blöcke", "blocks")} · ${dok.teile.length} ${L("Teile", "parts")} · ${dok.objekte.length} ${L("Objekte", "objects")}${h.length ? " · " + h[0].text[window.WG?.lang === "en" ? 1 : 0] : ""}`;
  }

  // ---------------------------------------------------------------------------
  // zeiger, strahl, werkzeuge
  // ---------------------------------------------------------------------------
  function strahlAus(ev) {
    const mx = (ev.clientX / innerWidth) * 2 - 1, my = -(ev.clientY / innerHeight) * 2 + 1;
    kamera.updateMatrixWorld();
    raycaster.setFromCamera({ x: mx, y: my }, kamera);
  }
  function blockStrahl() {
    const o = B.weltZuBlock(raycaster.ray.origin, dok.masse);
    const d = raycaster.ray.direction;
    return { o, d: { x: d.x / F.BLOCK, y: d.y / F.BLOCK, z: d.z / F.BLOCK } };
  }
  function treffer() {
    const { o, d } = blockStrahl();
    return B.strahlVoxel(vox, o, d, 400, ebene);
  }
  function bodenPunkt() {
    const { o, d } = blockStrahl();
    return B.bodenTreffer(o, d);
  }
  // die zelle für bauwerkzeuge: vor der getroffenen fläche oder auf dem boden; nach dem ersten klick auf der ebene des startpunkts
  function zielZelle() {
    if (start && ["wand", "quader", "raum"].includes(werkzeug)) {
      const { o, d } = blockStrahl();
      if (Math.abs(d.y) < 1e-6) return null;
      const t = (start.y - o.y) / d.y;
      if (t < 0) return null;
      return { x: Math.floor(o.x + d.x * t), y: start.y, z: Math.floor(o.z + d.z * t) };
    }
    return B.setzZelle(treffer(), bodenPunkt());
  }
  const innen = z => z && vox.drin(z.x, z.y, z.z);

  function setzeZellen(zellen, m) {
    const v = ziel();
    for (const [x, y, z] of zellen) if (v.drin(x, y, z)) v.setze(x, y, z, m);
    // wände über türen: das teil verschwindet (sonst wäre die öffnung nur im bild)
    if (modus === "wand") {
      const belegt = new Set(zellen.map(([x, y, z]) => v.schluessel(x, y, z)));
      dok.teile = dok.teile.filter(t => !F.teilZellen(t).some(([x, y, z]) => belegt.has(v.schluessel(x, y, z))));
    }
  }
  function entferneZelle(z) {
    ziel().nimm(z.x, z.y, z.z);
  }
  function aktion(ev, erstes) {
    const z = zielZelle();
    switch (werkzeug) {
      case "wuerfel": {
        if (!innen(z)) return;
        const key = `${z.x},${z.y},${z.z}`;
        if (ziehen && ziehen.letzte === key) return;
        if (ziehen) ziehen.letzte = key;
        setzeZellen([[z.x, z.y, z.z]], modus === "hitbox" ? 1 : aktMat);
        break;
      }
      case "entfernen": {
        // erst teile und objekte unter dem zeiger, sonst der block
        if (erstes) {
          const p = pickMesh();
          if (p) { if (p.teil !== undefined) dok.teile.splice(p.teil, 1); else dok.objekte.splice(p.objekt, 1); auswahl = null; break; }
        }
        const t = treffer();
        if (!t) return;
        const key = `${t.x},${t.y},${t.z}`;
        if (ziehen && ziehen.letzte === key) return;
        if (ziehen) ziehen.letzte = key;
        entferneZelle(t);
        break;
      }
      case "pinsel": {
        const t = treffer();
        if (!t || modus === "hitbox") return;
        vox.setze(t.x, t.y, t.z, aktMat);
        break;
      }
      case "wand": case "quader": case "raum": {
        if (!erstes) return;
        if (!innen(z)) return;
        if (!start) { start = z; meldung(L("Zweite Ecke anklicken (Esc bricht ab)", "Click the second corner (Esc cancels)")); return; }
        const f = { wand: B.zellenWand, quader: B.zellenQuader, raum: B.zellenRaum }[werkzeug];
        setzeZellen(f(start, z, hoehe), modus === "hitbox" ? 1 : aktMat);
        start = null;
        break;
      }
      case "tuer": case "klappe": case "geheim": {
        if (!erstes) return;
        const t = treffer();
        if (!t) return meldung(L("Eine Wand anklicken", "Click a wall"), true);
        const teil = B.teilAusTreffer(t, werkzeug, { hinge: hingeSeite, haus: hausTuer, material: aktMat }, dok.masse);
        if (!B.teilPlatzieren(dok, vox, teil)) return meldung(L("Passt nicht ins Raster", "Does not fit the grid"), true);
        break;
      }
      case "objekt": {
        if (!erstes) return;
        const p = objektPunkt();
        if (!p) return;
        dok.objekte.push({ a: objektTyp, x: p.x, y: p.y, z: p.z, r: objektDreh });
        auswahl = { art: "objekt", i: dok.objekte.length - 1 };
        break;
      }
      case "auswahl": {
        if (!erstes) return;
        const p = pickMesh();
        auswahl = p ? (p.teil !== undefined ? { art: "teil", i: p.teil } : { art: "objekt", i: p.objekt }) : null;
        baueRechts();
        zeigeAuswahl();
        return;
      }
    }
    baueSzene();
    status.textContent = zaehler();
  }
  function pickMesh() {
    const treffer = raycaster.intersectObjects(gruppe.children, true).find(h => h.object.userData && (h.object.userData.teil !== undefined || h.object.userData.objekt !== undefined));
    return treffer ? treffer.object.userData : null;
  }
  // position eines objekts: auf der oberseite eines blocks oder auf dem boden, in halben blöcken
  function objektPunkt() {
    const { o, d } = blockStrahl();
    const t = B.strahlVoxel(vox, o, d, 400, ebene);
    let p, y = 0;
    if (t && t.ny === 1) { p = { x: o.x + d.x * t.t, z: o.z + d.z * t.t }; y = t.y + 1; }
    else { p = B.bodenTreffer(o, d); }
    if (!p) return null;
    return { x: klammer(Math.round(p.x * 2) / 2, 0, dok.masse[0]), z: klammer(Math.round(p.z * 2) / 2, 0, dok.masse[1]), y };
  }
  // vorschau (gelber rahmen): ein quader in blockkoordinaten (x, y, z, breite, höhe, tiefe)
  function geistBox(x, y, z, nx, ny, nz) {
    const c = wp(x + nx / 2, y + ny / 2, z + nz / 2);
    geist.position.set(c.x, c.y, c.z);
    geist.scale.set(nx * F.BLOCK, ny * F.BLOCK, nz * F.BLOCK);
    geist.visible = true;
  }
  function aktualisiereGeist() {
    geist.visible = false;
    if (!offen || ziehen?.art === "kamera") return;
    if (BAU_WERKZEUGE.has(werkzeug)) {
      if (werkzeug === "entfernen") { const t = treffer(); if (t) geistBox(t.x, t.y, t.z, 1, 1, 1); return; }
      const z = zielZelle();
      if (!z || !innen(z)) return;
      if (start && werkzeug !== "wuerfel" && werkzeug !== "pinsel") {
        const x0 = Math.min(start.x, z.x), x1 = Math.max(start.x, z.x) + 1, z0 = Math.min(start.z, z.z), z1 = Math.max(start.z, z.z) + 1;
        if (werkzeug === "wand") {
          const lang = Math.abs(z.x - start.x) >= Math.abs(z.z - start.z);
          if (lang) geistBox(x0, start.y, start.z, x1 - x0, hoehe, 1); else geistBox(start.x, start.y, z0, 1, hoehe, z1 - z0);
        } else geistBox(x0, start.y, z0, x1 - x0, hoehe, z1 - z0);
        return;
      }
      geistBox(z.x, z.y, z.z, 1, 1, 1);
    } else if (werkzeug === "objekt") {
      const p = objektPunkt();
      if (!p) return;
      const [fl, ft] = F.moebelFlaeche(objektTyp);
      const q = objektDreh % 2 === 1;
      const w = wp(p.x, p.y, p.z);
      geist.position.set(w.x, w.y + 0.4, w.z);
      geist.scale.set(q ? ft : fl, 0.8, q ? fl : ft);
      geist.visible = true;
    } else if (["tuer", "klappe", "geheim"].includes(werkzeug)) {
      const t = treffer();
      if (!t) return;
      const teil = B.teilAusTreffer(t, werkzeug, { hinge: hingeSeite }, dok.masse);
      const [w, h] = F.TEIL_MASSE[werkzeug];
      if (teil.a === 1) geistBox(teil.x, teil.y, teil.z, 1, h, w); else geistBox(teil.x, teil.y, teil.z, w, h, 1);
    }
  }

  flaeche.addEventListener("contextmenu", e => e.preventDefault());
  flaeche.addEventListener("pointerdown", ev => {
    flaeche.setPointerCapture(ev.pointerId);
    strahlAus(ev);
    if (ev.button === 2 || ev.button === 1) { ziehen = { art: "kamera", x: ev.clientX, y: ev.clientY }; return; }
    if (ev.button !== 0) return;
    if (werkzeug === "bloecke") {   // klick wählt einen block, ziehen bis zu einem zweiten block wählt den ganzen quader dazwischen
      const t = treffer();
      ziehen = { art: "box", a: t, add: ev.shiftKey || ev.ctrlKey };
      return;
    }
    if (werkzeug !== "auswahl") sichere();
    ziehen = { art: "malen", letzte: "" };
    aktion(ev, true);
  });
  flaeche.addEventListener("pointermove", ev => {
    strahlAus(ev);
    if (ziehen?.art === "kamera") {
      cam.yaw -= (ev.clientX - ziehen.x) * 0.005;
      cam.pitch = klammer(cam.pitch + (ev.clientY - ziehen.y) * 0.005, 0.05, 1.5);
      ziehen.x = ev.clientX; ziehen.y = ev.clientY;
      return;
    }
    // würfel und farbe lassen sich ziehen; entfernen nimmt pro klick genau einen block (kein versehentliches wegwischen)
    if (ziehen?.art === "malen" && ["wuerfel", "pinsel"].includes(werkzeug)) aktion(ev, false);
    aktualisiereGeist();
  });
  const los = ev => {
    if (ziehen?.art === "box" && ev && ev.clientX !== undefined) {
      strahlAus(ev);
      const a = ziehen.a, b = treffer();
      if (!ziehen.add) blockSel = new Set();
      if (a && b) {
        for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) for (let z = Math.min(a.z, b.z); z <= Math.max(a.z, b.z); z++) for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
          if ((!ebene || y < ebene) && vox.hole(x, y, z)) blockSel.add(vox.schluessel(x, y, z));
        }
      }
      baueAlles();
    }
    ziehen = null;
  };
  flaeche.addEventListener("pointerup", los);
  flaeche.addEventListener("pointercancel", los);
  flaeche.addEventListener("wheel", ev => { ev.preventDefault(); cam.dist = klammer(cam.dist * (ev.deltaY > 0 ? 1.12 : 0.89), 3, 60); }, { passive: false });

  const imFeld = t => !!(t && t.closest && t.closest("input, textarea, select"));
  addEventListener("keydown", ev => {
    if (!offen || imFeld(ev.target)) return;
    ev.stopImmediatePropagation();
    const k = ev.key.toLowerCase();
    if (ev.ctrlKey && k === "z") { ev.preventDefault(); zurueck(); return; }
    if (k === "escape") { start = null; auswahl = null; blockSel = new Set(); baueAlles(); return; }
    if (k === "r") { if (auswahl?.art === "objekt") { sichere(); const o = dok.objekte[auswahl.i]; o.r = (o.r + 1) % 4; baueSzene(); } else objektDreh = (objektDreh + 1) % 4; return; }
    if (k === "delete" || k === "backspace") { loescheAuswahl(); return; }
    const w = WERKZEUGE.find(x => x[3].toLowerCase() === k);
    if (w && !ev.ctrlKey) { waehle(w[0]); return; }
    tasten.add(k);
  }, true);
  addEventListener("keyup", ev => { tasten.delete(ev.key.toLowerCase()); }, true);
  addEventListener("blur", () => tasten.clear());
  addEventListener("resize", () => { kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix(); });

  // aktionen auf der blockauswahl: anderes material, löschen, alles wählen, aufheben (jeweils rückgängig-fähig)
  function wendeMaterialAn() {
    if (!blockSel.size) return;
    if (modus === "hitbox") return meldung(L("Die Hitbox hat kein Material.", "The hitbox has no material."), true);
    sichere();
    for (const k of blockSel) if (vox.zellen.has(k)) vox.zellen.set(k, aktMat);
    baueAlles();
    meldung(L(`${blockSel.size} Blöcke mit Material ${aktMat} versehen.`, `${blockSel.size} blocks set to material ${aktMat}.`));
  }
  function loescheBlockAuswahl() {
    if (!blockSel.size) return;
    sichere();
    for (const k of blockSel) vox.zellen.delete(k);
    blockSel = new Set();
    baueAlles();
  }
  function waehleAlle() {
    blockSel = new Set();
    const [mx, mz] = dok.masse;
    for (const k of vox.zellen.keys()) if (!ebene || Math.floor(k / (mx * mz)) < ebene) blockSel.add(k);
    baueAlles();
  }
  function hebeAuf() { blockSel = new Set(); baueAlles(); }
  function loescheAuswahl() {
    if (!auswahl) return;
    sichere();
    if (auswahl.art === "teil") B.teilEntfernen(dok, auswahl.i); else dok.objekte.splice(auswahl.i, 1);
    auswahl = null;
    baueAlles();
  }

  // ---------------------------------------------------------------------------
  // oberfläche
  // ---------------------------------------------------------------------------
  const werkzeugKnoepfe = new Map();
  for (const [id, de, en, taste] of WERKZEUGE) {
    const b = el("button", { type: "button", onclick: () => waehle(id) }, `${L(de, en)}  `, el("small", { style: "opacity:.5" }, taste));
    werkzeugKnoepfe.set(id, b);
    links.append(b);
  }
  links.append(el("div", { class: "hilfe" }, L("Rechte Maustaste: drehen · Rad: zoomen · WASD/QE: bewegen · R: Objekt drehen · Entf: löschen · Strg+Z: zurück", "Right mouse: orbit · wheel: zoom · WASD/QE: move · R: rotate object · Del: delete · Ctrl+Z: undo")));
  function waehle(w) {
    werkzeug = w;
    start = null;
    for (const [id, b] of werkzeugKnoepfe) b.classList.toggle("an", id === w);
    baueRechts();
    meldung(zaehler());
  }

  const nameFeld = el("input", { type: "text", maxLength: F.GRENZEN.name, placeholder: L("Name des Hauses", "House name"), onchange: () => { sichere(); dok.name = nameFeld.value.trim() || "Haus"; } });
  const dateiEingabe = el("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: async () => {
    const f = dateiEingabe.files[0];
    dateiEingabe.value = "";
    if (!f) return;
    const d = F.bereinigeHaus(await f.text().catch(() => ""));
    if (!d) return meldung(L("Die Datei ist kein gültiges Haus.", "That file is not a valid house."), true);
    sichere();
    ladeDok(d);
    nameFeld.value = dok.name;
    meldung(L("Haus geladen.", "House loaded."));
  } });
  const ladeListe = el("select", { onchange: () => {
    const i = Number(ladeListe.value);
    if (!(i >= 0)) return;
    const d = ladeLokal()[i];
    if (d) { sichere(); quelle = i; ladeDok(d); nameFeld.value = dok.name; meldung(L("Geladen.", "Loaded.")); }
    ladeListe.value = "";
  } });
  function fuelleListe() {
    ladeListe.replaceChildren(el("option", { value: "" }, L("Meine Häuser …", "My houses …")), ...ladeLokal().map((d, i) => el("option", { value: String(i) }, d.name)));
  }
  oben.append(
    el("button", { type: "button", onclick: () => schliesse() }, "← " + L("Zurück", "Back")),
    el("button", { type: "button", onclick: () => { if (geaendert && !confirm(L("Ungespeicherte Änderungen verwerfen?", "Discard unsaved changes?"))) return; undoStapel = []; geaendert = false; quelle = -1; ladeDok(F.neuesHaus()); nameFeld.value = dok.name; } }, L("Neu", "New")),
    el("button", { type: "button", onclick: () => zurueck() }, L("Rückgängig", "Undo")),
    el("button", { type: "button", onclick: () => {
      const d = sync();
      const i = speichereLokal(d, quelle);
      if (i < 0) return meldung(L(`Der Browser-Speicher ist voll (höchstens ${MAX_LOKAL} Häuser).`, `Browser storage is full (at most ${MAX_LOKAL} houses).`), true);
      quelle = i; geaendert = false; fuelleListe();
      meldung(L("Gespeichert.", "Saved."));
    } }, L("Speichern", "Save")),
    ladeListe,
    el("button", { type: "button", onclick: () => dateiSpeichern(sync()) }, L("Export", "Export")),
    el("button", { type: "button", onclick: () => dateiEingabe.click() }, L("Import", "Import")),
    el("button", { type: "button", class: "primaer", onclick: () => { const d = sync(); schnittstelle.verwenden(d); meldung(L("Als dein Haus eingestellt.", "Set as your house.")); } }, L("Als mein Haus verwenden", "Use as my house")),
    nameFeld, dateiEingabe);

  function schieber(text, wert, lo, hi, bei, ende) {
    const aus = el("b", {}, `${text}: ${wert}`);
    const f = el("input", { type: "range", min: lo, max: hi, step: 1, value: wert });
    f.addEventListener("input", () => { aus.textContent = `${text}: ${f.value}`; bei(Number(f.value)); });
    f.addEventListener("change", () => ende?.(Number(f.value)));
    return el("label", {}, aus, f);
  }
  // wird das material schon benutzt (blöcke, teile, boden)?
  function materialBenutzt(id) {
    return dok.boden === id || dok.teile.some(t => t.m === id) || [...vox.zellen.values()].includes(id);
  }
  // farbe/textur des aktuellen materials ändern. standard: ein benutztes material bleibt wie es ist, die änderung steckt in einem neuen
  // material, das für die nächsten blöcke gilt (so wird nicht das ganze haus zu glas, nur weil man ein fenster will).
  // mit "gilt für alle blöcke" ändert sich das material überall
  function aendereMaterial(felder) {
    sichere();
    const m = aktuellesMaterial();
    if (!materialGlobal && materialBenutzt(m.id) && dok.material.length < F.GRENZEN.material) {
      const id = Math.max(...dok.material.map(x => x.id)) + 1;
      dok.material.push({ id, farbe: m.farbe, textur: m.textur, ...felder });
      aktMat = id;
      meldung(L(`Neues Material ${id} für die nächsten Blöcke (die vorhandenen bleiben).`, `New material ${id} for the next blocks (existing ones stay).`));
    } else {
      Object.assign(m, felder);
    }
    baueAlles();
  }
  // ein fenster: das glas-material für die nächsten blöcke wählen (wird bei bedarf angelegt)
  function glasWaehlen() {
    let g = dok.material.find(x => x.textur === "glas");
    if (!g) {
      if (dok.material.length >= F.GRENZEN.material) return meldung(L("Keine freie Materialnummer mehr.", "No free material slot left."), true);
      sichere();
      g = { id: Math.max(...dok.material.map(x => x.id)) + 1, farbe: "#bfe3f2", textur: "glas" };
      dok.material.push(g);
    }
    aktMat = g.id;
    baueAlles();
    meldung(L(`Material ${g.id} (Glas) gewählt: die nächsten Blöcke sind Fenster.`, `Material ${g.id} (glass) chosen: the next blocks are windows.`));
  }
  function aktuellesMaterial() { return dok.material.find(m => m.id === aktMat) || dok.material[0]; }
  function baueRechts() {
    rechts.replaceChildren();
    // bearbeiten: wand oder hitbox (getrennt)
    rechts.append(el("h3", {}, L("Bearbeiten", "Editing")),
      el("div", { class: "zeile" },
        el("button", { type: "button", class: modus === "wand" ? "an" : "", onclick: () => { modus = "wand"; baueAlles(); } }, L("Wand", "Wall")),
        el("button", { type: "button", class: modus === "hitbox" ? "an" : "", onclick: () => {
          if (dok.hitbox.auto) { sichere(); dok.hitbox = { auto: false, quader: [] }; hbVox = F.Voxel.ausQuader(vox.zuQuader().map(q => [...q.slice(0, 6), 1]), ...[dok.masse[0], dok.masse[1], dok.masse[2]]); meldung(L("Die Hitbox ist jetzt von der Wand getrennt (Kopie der Wände).", "The hitbox is now separate from the wall (a copy of the walls).")); }
          modus = "hitbox"; baueAlles();
        } }, L("Hitbox", "Hitbox"))),
      el("div", { class: "hilfe" }, dok.hitbox.auto ? L("Hitbox = Wand (automatisch). „Hitbox“ löst sie von der Wand.", "Hitbox = wall (automatic). “Hitbox” detaches it from the wall.") : L("Die Hitbox ist eigenständig; die Werkzeuge ändern sie, nicht die Wand.", "The hitbox is separate; the tools change it, not the wall.")),
      dok.hitbox.auto ? "" : el("button", { type: "button", onclick: () => { if (!confirm(L("Eigene Hitbox verwerfen und wieder den Wänden folgen?", "Discard the custom hitbox and follow the walls again?"))) return; sichere(); dok.hitbox = { auto: true, quader: [] }; modus = "wand"; baueAlles(); } }, L("Wieder automatisch", "Back to automatic")),
      el("label", { style: "display:flex;gap:6px;align-items:center" }, el("input", { type: "checkbox", checked: hbZeigen, onchange: e => { hbZeigen = e.target.checked; baueSzene(); } }), L("Hitboxen anzeigen", "Show hitboxes")));

    // material: farben und texturen
    rechts.append(el("h3", {}, L("Material", "Material")),
      el("div", { class: "mat" }, ...dok.material.map(m => el("button", { type: "button", class: m.id === aktMat ? "an" : "", title: `${m.farbe} · ${m.textur}`, style: `background:${m.farbe}`, onclick: () => { aktMat = m.id; baueRechts(); } }, String(m.id))),
        dok.material.length < F.GRENZEN.material ? el("button", { type: "button", title: L("Neues Material", "New material"), onclick: () => {
          sichere();
          const id = Math.max(...dok.material.map(m => m.id)) + 1;
          dok.material.push({ id, farbe: aktuellesMaterial().farbe, textur: aktuellesMaterial().textur });
          aktMat = id; baueAlles();
        } }, "+") : ""));
    const m = aktuellesMaterial();
    rechts.append(
      el("div", { class: "farben" }, ...F.STANDARD_FARBEN.map(f => el("i", { class: f === m.farbe ? "an" : "", style: `background:${f}`, onclick: () => aendereMaterial({ farbe: f }) }))),
      el("div", { class: "zeile" }, el("input", { type: "color", value: m.farbe, onchange: e => aendereMaterial({ farbe: e.target.value }) }), el("span", { class: "hilfe" }, L("eigene Farbe", "custom colour"))),
      el("label", {}, el("b", {}, L("Textur", "Texture")), el("select", { onchange: e => aendereMaterial({ textur: e.target.value }) }, ...F.TEXTUREN.map(([id, de, en]) => el("option", { value: id, selected: id === m.textur }, L(de, en))))),
      el("div", { class: "zeile" },
        el("button", { type: "button", title: L("Wählt das Glas-Material für die nächsten Blöcke; die vorhandenen bleiben unverändert.", "Picks the glass material for the next blocks; existing ones stay unchanged."), onclick: () => glasWaehlen() }, L("Fenster (Glas) für nächste Blöcke", "Window (glass) for next blocks"))),
      el("label", { style: "display:flex;gap:6px;align-items:center", title: L("Aus: eine Änderung von Farbe oder Textur betrifft nur die nächsten Blöcke (neues Material). An: alle Blöcke mit diesem Material ändern sich.", "Off: changing colour or texture only affects the next blocks (new material). On: every block with this material changes.") },
        el("input", { type: "checkbox", checked: materialGlobal, onchange: e => { materialGlobal = e.target.checked; } }), L("Änderung gilt für alle Blöcke dieses Materials", "Change applies to all blocks of this material")),
      el("label", {}, el("b", {}, L("Boden (Platte über der Grundfläche)", "Floor (slab over the footprint)")), el("select", { onchange: e => { sichere(); dok.boden = Number(e.target.value); baueSzene(); } },
        el("option", { value: 0, selected: !dok.boden }, L("kein Boden", "no floor")), ...dok.material.map(x => el("option", { value: x.id, selected: x.id === dok.boden }, `${x.id} · ${x.textur}`)))));

    // optionen des werkzeugs
    if (["wand", "quader", "raum"].includes(werkzeug)) rechts.append(el("h3", {}, L("Höhe", "Height")), schieber(L("Höhe (Blöcke)", "Height (blocks)"), hoehe, 1, dok.masse[2], v => { hoehe = v; }));
    if (["tuer", "klappe", "geheim"].includes(werkzeug)) {
      rechts.append(el("h3", {}, L("Teil", "Part")),
        el("div", { class: "zeile" }, el("button", { type: "button", class: hingeSeite === 1 ? "an" : "", onclick: () => { hingeSeite = 1; baueRechts(); } }, L("Angel rechts", "Hinge right")), el("button", { type: "button", class: hingeSeite === -1 ? "an" : "", onclick: () => { hingeSeite = -1; baueRechts(); } }, L("Angel links", "Hinge left"))),
        werkzeug === "tuer" ? el("label", { style: "display:flex;gap:6px;align-items:center" }, el("input", { type: "checkbox", checked: hausTuer, onchange: e => { hausTuer = e.target.checked; } }), L("Haustür (nur mit Hausschlüssel)", "Front door (house key only)")) : "",
        el("div", { class: "hilfe" }, L("Auf eine Wand klicken: die Öffnung wird aus der Wand genommen. Tür 2 × 3, Klappe 1 × 1, Geheimwand 2 × 3 Blöcke.", "Click a wall: the opening is cut from the wall. Door 2 × 3, hatch 1 × 1, secret wall 2 × 3 blocks.")));
    }
    if (werkzeug === "objekt" || (werkzeug === "auswahl" && auswahl?.art === "objekt")) {
      if (werkzeug === "objekt") rechts.append(el("h3", {}, L("Objekt", "Object")), el("div", { class: "zeile" }, ...F.MOEBEL_IDS.map(id => el("button", { type: "button", class: id === objektTyp ? "an" : "", onclick: () => { objektTyp = id; baueRechts(); } }, L(F.MOEBEL[id].de, F.MOEBEL[id].en)))));
      if (auswahl?.art === "objekt") {
        const o = dok.objekte[auswahl.i];
        rechts.append(el("h3", {}, L("Auswahl", "Selection")), el("div", { class: "zeile" },
          el("button", { type: "button", onclick: () => { sichere(); o.r = (o.r + 1) % 4; baueSzene(); } }, L("Drehen (R)", "Rotate (R)")),
          el("button", { type: "button", onclick: () => { sichere(); o.y = Math.min(dok.masse[2], o.y + 0.5); baueSzene(); } }, L("Höher", "Higher")),
          el("button", { type: "button", onclick: () => { sichere(); o.y = Math.max(0, o.y - 0.5); baueSzene(); } }, L("Tiefer", "Lower")),
          el("button", { type: "button", onclick: () => loescheAuswahl() }, L("Löschen", "Delete"))));
      }
    }
    if (werkzeug === "auswahl" && auswahl?.art === "teil") {
      const t = dok.teile[auswahl.i];
      rechts.append(el("h3", {}, L("Auswahl", "Selection")), el("div", { class: "hilfe" }, `${t.t}${t.haus ? " · " + L("Haustür", "front door") : ""}`),
        el("div", { class: "zeile" },
          t.t === "tuer" ? el("button", { type: "button", onclick: () => { sichere(); const war = t.haus; for (const x of dok.teile) x.haus = false; t.haus = !war; baueSzene(); baueRechts(); } }, t.haus ? L("Keine Haustür", "Not the front door") : L("Zur Haustür machen", "Make front door")) : "",
          el("button", { type: "button", onclick: () => { sichere(); t.h = -t.h; baueSzene(); } }, L("Angel wechseln", "Flip hinge")),
          el("button", { type: "button", onclick: () => loescheAuswahl() }, L("Löschen", "Delete"))));
    }

    // blockauswahl: material anwenden, aufheben
    if (werkzeug === "bloecke" || blockSel.size) {
      rechts.append(el("h3", {}, L("Blockauswahl", "Block selection")),
        el("div", { class: "hilfe" }, `${blockSel.size} ${L("Blöcke gewählt", "blocks selected")}. ${L("Klick wählt einen Block, Ziehen bis zu einem zweiten Block wählt den Quader dazwischen, Umschalt/Strg fügt hinzu.", "Click selects a block, dragging to a second block selects the box in between, Shift/Ctrl adds.")}`),
        el("div", { class: "zeile" },
          el("button", { type: "button", class: "primaer", onclick: () => wendeMaterialAn() }, L(`Material ${aktMat} anwenden`, `Apply material ${aktMat}`)),
          el("button", { type: "button", onclick: () => hebeAuf() }, L("Auswahl aufheben", "Clear selection"))),
        el("div", { class: "zeile" },
          el("button", { type: "button", onclick: () => waehleAlle() }, L("Alles auswählen", "Select all")),
          el("button", { type: "button", onclick: () => loescheBlockAuswahl() }, L("Auswahl löschen", "Delete selection"))));
    }

    // schnitt und größe
    rechts.append(el("h3", {}, L("Ansicht", "View")), schieber(L("Schnitt: Ebene (0 = alles)", "Cut level (0 = all)"), ebene, 0, dok.masse[2], v => { ebene = v; planeBau(); }));
    rechts.append(el("h3", {}, L("Größe des Rasters", "Grid size")),
      schieber(L("Breite", "Width"), dok.masse[0], F.GRENZEN.x[0], F.GRENZEN.x[1], () => {}, v => groesse(0, v)),
      schieber(L("Tiefe", "Depth"), dok.masse[1], F.GRENZEN.z[0], F.GRENZEN.z[1], () => {}, v => groesse(1, v)),
      schieber(L("Höhe", "Height"), dok.masse[2], F.GRENZEN.y[0], F.GRENZEN.y[1], () => {}, v => groesse(2, v)),
      el("div", { class: "hilfe" }, L("Ein Block = 0,5 m. Das Grundstück fasst 26 × 20 Blöcke (13 × 10 m).", "One block = 0.5 m. The plot holds 26 × 20 blocks (13 × 10 m).")));
  }
  function groesse(achse, wert) {
    sichere();
    const d = sync();
    d.masse[achse] = wert;
    ladeDok(d);
  }

  // ---------------------------------------------------------------------------
  // öffnen, schließen, bild
  // ---------------------------------------------------------------------------
  function oeffne(startDok = null, index = -1) {
    offen = true;
    wurzel.hidden = false;
    document.body.classList.add("hauseditor");
    undoStapel = [];
    geaendert = false;
    quelle = index;
    aktMat = 1;
    modus = "wand";
    ebene = 0;
    ladeDok(startDok || F.neuesHaus());
    nameFeld.value = dok.name;
    fuelleListe();
    cam.x = 0; cam.y = 1; cam.z = 0; cam.yaw = 0.6; cam.pitch = 0.75; cam.dist = 14;
    kamera.aspect = innerWidth / innerHeight;
    kamera.updateProjectionMatrix();
    setzeKamera();
    waehle("wuerfel");
  }
  function schliesse() {
    if (geaendert && !confirm(L("Ungespeicherte Änderungen verwerfen?", "Discard unsaved changes?"))) return;
    offen = false;
    wurzel.hidden = true;
    document.body.classList.remove("hauseditor");
    tasten.clear();
    schnittstelle.zu();
  }
  // die kamera aus yaw, pitch und abstand um den zielpunkt (auch beim öffnen: ein klick vor dem ersten bild muss treffen)
  function setzeKamera() {
    kamera.position.set(cam.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, cam.y + Math.sin(cam.pitch) * cam.dist, cam.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
    kamera.lookAt(cam.x, cam.y, cam.z);
    kamera.updateMatrixWorld();
  }
  function frame(dt) {
    const tempo = (2 + cam.dist * 0.7) * dt * (tasten.has("shift") ? 2.5 : 1);
    const vx = -Math.sin(cam.yaw), vz = -Math.cos(cam.yaw);
    let fw = 0, sd = 0;
    if (tasten.has("w") || tasten.has("arrowup")) fw += 1;
    if (tasten.has("s") || tasten.has("arrowdown")) fw -= 1;
    if (tasten.has("d") || tasten.has("arrowright")) sd += 1;
    if (tasten.has("a") || tasten.has("arrowleft")) sd -= 1;
    cam.x = klammer(cam.x + (vx * fw - vz * sd) * tempo, -20, 20);
    cam.z = klammer(cam.z + (vz * fw + vx * sd) * tempo, -20, 20);
    if (tasten.has("e")) cam.y = Math.min(12, cam.y + tempo);
    if (tasten.has("q")) cam.y = Math.max(0, cam.y - tempo);
    setzeKamera();
    if (auswahlRahmen.visible) auswahlRahmen.update();
    renderer.render(szene, kamera);
  }

  return { oeffne, frame, aktiv: () => offen, schliesse: () => { offen = false; wurzel.hidden = true; document.body.classList.remove("hauseditor"); }, dokument: () => (dok ? sync() : null) };
}
