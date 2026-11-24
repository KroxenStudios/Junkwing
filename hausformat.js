// hausformat: das dateiformat der selbstgebauten häuser ("junkwing-haus", version 1) und alles, was daran hängt. reine daten und logik
// ohne THREE und dom: editor, spiel und server benutzen dieselbe prüfung (bereinigeHaus) und dieselbe umwandlung (defAusDoc).
//
// aufbau einer datei (json), alle maße in blöcken zu 0,5 m, das haus steht in der mitte des grundstücks:
// {
//   "format": "junkwing-haus", "v": 1,
//   "name": "Mein Haus",
//   "masse": [26, 20, 10],                       // breite x, tiefe z, höhe y in blöcken (höchstens 80 x 80 x 100 = 40 x 40 x 50 m)
//   "keller": 0,                                 // so viele der untersten ebenen (y = 0 bis keller-1) liegen unter dem boden (0 = kein keller, höchstens 8 = 4 m); der boden liegt bei y = keller
//   "material": [ { "id": 1, "farbe": "#d8cfc0", "textur": "putz" }, ... ],   // farbe + textur; blöcke verweisen nur auf die id
//   "boden": 3,                                  // standardmaterial für neuen fußboden (nur noch eine vorgabe des editors)
//   "fussboden": [ [x0, y0, z0, x1, y1, z1, material], ... ],   // fußboden nur dort, wo er mit dem werkzeug gesetzt wurde: eine 8-cm-platte unten in jeder zelle, fest
//   // (fehlt das feld in einer älteren datei, wird der alte boden über die grundfläche der blöcke daraus gemacht)
//   "quader": [ [x0, y0, z0, x1, y1, z1, material], ... ],   // die sichtbare wand: gefüllte quader, x1/y1/z1 exklusiv (kanonisch)
//   "hitbox": { "auto": true, "quader": [ [x0, y0, z0, x1, y1, z1], ... ] },   // die feste kollision, getrennt von der wand: bei
//                                                // auto = true folgt sie den wänden (standard, der editor baut beides in einem zug), sonst gilt nur
//                                                // diese eigene liste (z. b. dünnere hitboxen, kein stoßen an zierblöcken, unsichtbare wände)
//   "teile": [ { "t": "tuer", "x": 12, "y": 0, "z": 19, "a": 0, "h": 1, "haus": true, "m": 4 }, ... ],   // türen, klappen, geheimwände
//   "objekte": [ { "a": "sofa", "x": 6.5, "y": 0, "z": 4, "r": 0 }, ... ]                                // einrichtung
// }
// blöcke liegen auf einem raster x 0..masse[0]-1, z 0..masse[1]-1, y 0..masse[2]-1. ein teil belegt ein feld der wand (eine zelle dick):
// tuer 2 breit x 3 hoch, klappe 1 x 1, geheim 2 x 3; a = 0: die wand läuft entlang x, a = 1: entlang z; (x, y, z) ist die untere
// linke zelle. beim bereinigen werden die blöcke in den feldern der teile entfernt (die öffnung). genau eine tür darf "haus" sein: die
// haustür (nur mit hausschlüssel zu öffnen); alle anderen sind innentüren. objekte: x, z in blöcken (halbe schritte), y in blöcken
// über dem boden, r = drehung in 90-grad-schritten.

export const FORMAT = "junkwing-haus";
export const VERSION = 1;
export const BLOCK = 0.5;
export const GRENZEN = { x: [8, 80], z: [8, 80], y: [4, 100], keller: 8, quader: 2500, voxel: 60000, teile: 40, objekte: 100, material: 16, name: 30, tuer: 12, klappe: 30, geheim: 4 };
export const TEIL_MASSE = { tuer: [2, 3], klappe: [1, 1], geheim: [2, 3] };   // [breite, höhe] in blöcken
export const BODEN_DICKE = 0.08;   // m: dicke einer fußbodenplatte
export const SCHWELLE = 0.04;   // m: bodenplatte, keine stufe in der tür

// texturen: id, name (de, en). die bilder erzeugt texturen.js (browser); hier stehen nur die namen
export const TEXTUREN = [
  ["glatt", "Glatt", "Plain"], ["putz", "Putz", "Stucco"], ["ziegel", "Ziegel", "Brick"], ["holz", "Holzbretter", "Planks"],
  ["stein", "Naturstein", "Stone"], ["fliesen", "Fliesen", "Tiles"], ["beton", "Beton", "Concrete"], ["parkett", "Parkett", "Parquet"], ["metall", "Wellblech", "Corrugated"], ["glas", "Glas (durchsichtig)", "Glass (transparent)"]
];
export const TEXTUR_IDS = TEXTUREN.map(t => t[0]);
export const STANDARD_FARBEN = ["#e8dfd0", "#c9b79c", "#9fa8b3", "#c97b63", "#9a5a48", "#7a4a2e", "#a07a4a", "#5f9f50", "#4a7fb0", "#e5b84a", "#e5484d", "#f2f2f2", "#6b6f75", "#2b2f36"];

// einrichtung (assets): teile [ox, oy, oz, sx, sy, sz, farbe, extra] relativ zur mitte am boden (länge entlang x, vorderseite +z)
// und eine feste hitbox solid = [sx, sy, sz] (null = nicht fest). maße für die 1 m große figur: sofa 1,5 m, tisch 0,45 m hoch
const BEINE4 = (d, h, f, b = 0.06) => [[-d, -d], [d, -d], [-d, d], [d, d]].map(([x, z]) => [x, h / 2, z, b, h, b, f]);
// leiter: länge n in blöcken, die schienen stehen an der wand (hinten, -z), man steht vorn (+z); oben steigt man nach vorn ab
function leiterTeile(n) {
  const l = n * BLOCK, aus = [[-0.2, l / 2, -0.1, 0.05, l, 0.05, "#8a6a45"], [0.2, l / 2, -0.1, 0.05, l, 0.05, "#8a6a45"]];
  for (let y = 0.25; y < l - 0.05; y += 0.3) aus.push([0, y, -0.1, 0.4, 0.04, 0.04, "#a88358"]);
  return aus;
}
export const LEITER_STANDARD = 6;
export const moebelTeile = (typ, n) => (typ === "leiter" ? leiterTeile(n || LEITER_STANDARD) : MOEBEL[typ].teile);
export const MOEBEL = {
  sofa: { de: "Sofa", en: "Sofa", solid: [1.5, 0.7, 0.7], teile: [[0, 0.2, 0, 1.5, 0.35, 0.7, "#7a5a8a"], [0, 0.5, -0.3, 1.5, 0.4, 0.15, "#6a4a7a"], [-0.72, 0.38, 0, 0.1, 0.35, 0.7, "#6a4a7a"], [0.72, 0.38, 0, 0.1, 0.35, 0.7, "#6a4a7a"]] },
  tisch: { de: "Tisch", en: "Table", solid: [0.9, 0.46, 0.9], teile: [[0, 0.43, 0, 0.9, 0.06, 0.9, "#a07a4a"], ...BEINE4(0.4, 0.4, "#8a6638")] },
  stuhl: { de: "Stuhl", en: "Chair", solid: [0.35, 0.6, 0.35], teile: [[0, 0.22, 0, 0.35, 0.05, 0.35, "#b58a55"], [0, 0.42, -0.16, 0.35, 0.36, 0.04, "#b58a55"], ...BEINE4(0.14, 0.2, "#8a6638", 0.04)] },
  bett: { de: "Bett", en: "Bed", solid: [1.8, 0.45, 0.9], teile: [[0, 0.18, 0, 1.8, 0.2, 0.9, "#7a5a3a"], [0, 0.32, 0, 1.7, 0.12, 0.85, "#e8e4dc"], [-0.7, 0.4, 0, 0.3, 0.08, 0.5, "#ffffff"], [0.2, 0.4, 0, 1.0, 0.06, 0.85, "#c0504d"]] },
  regal: { de: "Regal", en: "Shelf", solid: [1.0, 1.6, 0.3], teile: [[0, 0.8, 0, 1.0, 1.6, 0.3, "#8a6a45"], [0, 0.5, 0.01, 0.9, 0.03, 0.3, "#a88358"], [0, 1.0, 0.01, 0.9, 0.03, 0.3, "#a88358"], [-0.3, 1.15, 0.05, 0.12, 0.25, 0.2, "#c0504d"], [-0.1, 1.15, 0.05, 0.1, 0.22, 0.2, "#4a7fb0"], [0.15, 0.65, 0.05, 0.3, 0.12, 0.2, "#e5b84a"]] },
  herd: { de: "Herd", en: "Stove", solid: [1.0, 0.55, 0.5], teile: [[0, 0.25, 0, 1.0, 0.5, 0.5, "#d8d8d8"], [0, 0.52, 0, 1.0, 0.03, 0.5, "#2a2a2a"], [-0.25, 0.545, 0, 0.18, 0.01, 0.18, "#777777"], [0.25, 0.545, 0, 0.18, 0.01, 0.18, "#777777"], [0, 0.4, 0.26, 0.4, 0.12, 0.02, "#555555"]] },
  schreibtisch: { de: "Schreibtisch", en: "Desk", solid: [1.1, 0.55, 0.55], teile: [[0, 0.5, 0, 1.1, 0.05, 0.55, "#8a6a45"], [-0.5, 0.25, 0, 0.06, 0.5, 0.5, "#6e5438"], [0.5, 0.25, 0, 0.06, 0.5, 0.5, "#6e5438"], [0.2, 0.6, -0.1, 0.3, 0.16, 0.02, "#111111"]] },
  lampe: { de: "Stehlampe", en: "Floor lamp", solid: [0.25, 1.2, 0.25], teile: [[0, 0.02, 0, 0.25, 0.04, 0.25, "#444444"], [0, 0.55, 0, 0.04, 1.1, 0.04, "#444444"], [0, 1.15, 0, 0.3, 0.25, 0.3, "#fff3c4", { emissive: "#ffd36b", emissiveIntensity: 0.9 }]] },
  pflanze: { de: "Pflanze", en: "Plant", solid: [0.3, 0.7, 0.3], teile: [[0, 0.12, 0, 0.25, 0.24, 0.25, "#b0603a"], [0, 0.45, 0, 0.32, 0.4, 0.32, "#3f8f45"], [0.08, 0.62, 0.05, 0.22, 0.22, 0.22, "#4fa24f"]] },
  truhe: { de: "Truhe (Kiste)", en: "Chest", solid: [0.6, 0.38, 0.35], teile: [[0, 0.15, 0, 0.6, 0.3, 0.35, "#a9794a"], [0, 0.33, 0, 0.62, 0.06, 0.37, "#8a5f36"], [0, 0.2, 0.18, 0.1, 0.08, 0.02, "#e5b84a"]] },
  esstisch: { de: "Esstisch", en: "Dining table", solid: [1.4, 0.46, 0.85], teile: [[0, 0.43, 0, 1.4, 0.06, 0.85, "#8a5a32"], ...[[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]].map(([x, z]) => [x, 0.2, z, 0.07, 0.4, 0.07, "#6e4526"])] },
  kommode: { de: "Kommode", en: "Dresser", solid: [0.8, 0.63, 0.4], teile: [[0, 0.3, 0, 0.8, 0.6, 0.4, "#8a6a45"], [0, 0.615, 0, 0.84, 0.03, 0.44, "#a88358"], [-0.2, 0.4, 0.21, 0.08, 0.04, 0.02, "#e5b84a"], [0.2, 0.4, 0.21, 0.08, 0.04, 0.02, "#e5b84a"]] },
  kuehlschrank: { de: "Kühlschrank", en: "Fridge", solid: [0.6, 1.1, 0.6], teile: [[0, 0.55, 0, 0.6, 1.1, 0.6, "#e9eef2"], [0.22, 0.75, 0.31, 0.04, 0.3, 0.03, "#8a949e"], [0, 0.8, 0.301, 0.58, 0.01, 0.01, "#b8c2ca"]] },
  kamin: { de: "Kamin", en: "Fireplace", solid: [0.5, 1.0, 1.2], teile: [[0, 0.5, 0, 0.5, 1.0, 1.2, "#9a8a7a"], [0.26, 0.28, 0, 0.02, 0.4, 0.6, "#222222"], [0.27, 0.2, 0, 0.02, 0.22, 0.4, "#ff8a3c", { emissive: "#ff6a1a", emissiveIntensity: 1 }], [0, 1.25, 0, 0.36, 0.5, 0.5, "#8a7a6a"]] },
  klavier: { de: "Klavier", en: "Piano", solid: [1.2, 0.9, 0.5], teile: [[0, 0.45, 0, 1.2, 0.9, 0.5, "#1c1c22"], [0, 0.8, 0.28, 1.0, 0.04, 0.12, "#f4f4f0"], [0, 0.18, 0.4, 0.5, 0.36, 0.25, "#2a2a30"]] },
  wanne: { de: "Badewanne", en: "Bathtub", solid: [1.5, 0.5, 0.7], teile: [[0, 0.25, 0, 1.5, 0.5, 0.7, "#f2f2f2"], [0, 0.49, 0, 1.3, 0.02, 0.5, "#9fd4e8"], [-0.62, 0.55, 0, 0.05, 0.1, 0.05, "#8a949e"]] },
  schrank: { de: "Schrank", en: "Wardrobe", solid: [1.0, 1.6, 0.5], teile: [[0, 0.8, 0, 1.0, 1.6, 0.5, "#7a5a3a"], [0, 0.8, 0.255, 0.02, 1.5, 0.01, "#5a3d24"], [-0.1, 0.8, 0.265, 0.04, 0.2, 0.02, "#e5b84a"], [0.1, 0.8, 0.265, 0.04, 0.2, 0.02, "#e5b84a"]] },
  fernseher: { de: "Fernseher", en: "TV", solid: [0.9, 1.1, 0.4], teile: [[0, 0.28, 0, 0.9, 0.56, 0.4, "#6b5a4a"], [0, 0.85, 0, 0.8, 0.5, 0.06, "#111111"], [0, 0.85, 0.035, 0.7, 0.4, 0.01, "#1a2a3a", { emissive: "#2a4a6a", emissiveIntensity: 0.6 }]] },
  bild: { de: "Bild (Wand)", en: "Picture (wall)", solid: null, teile: [[0, 0.3, 0, 0.8, 0.6, 0.03, "#6b4a2d"], [0, 0.3, 0.017, 0.7, 0.5, 0.01, "#6aa0d0"]] },
  leiter: { de: "Leiter", en: "Ladder", solid: null, teile: leiterTeile(6) },
  teppich: { de: "Teppich", en: "Rug", solid: null, teile: [[0, 0.03, 0, 2, 0.02, 1.4, "#a04040"], [0, 0.035, 0, 1.7, 0.02, 1.1, "#c47a5a"]] }
};
export const MOEBEL_IDS = Object.keys(MOEBEL);
// grundfläche eines möbels [länge, tiefe] in m (hitbox oder umfang der teile), für die vorschau im editor
export function moebelFlaeche(typ) {
  const m = MOEBEL[typ];
  if (!m) return [0.5, 0.5];
  if (typ === "leiter") return [0.5, 0.3];
  if (m.solid) return [m.solid[0], m.solid[2]];
  let x = 0.2, z = 0.2;
  for (const [ox, , oz, sx, , sz] of m.teile) { x = Math.max(x, Math.abs(ox) * 2 + sx); z = Math.max(z, Math.abs(oz) * 2 + sz); }
  return [x, z];
}

const ganz = (v, lo, hi, vorgabe) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : vorgabe; };
const halb = (v, lo, hi, vorgabe) => { const n = Math.round(Number(v) * 2) / 2; return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : vorgabe; };
const text = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

// ---------------------------------------------------------------------------
// voxelraster: die blöcke als zuordnung zelle -> material; schnelles setzen, entfernen und das zusammenfassen zu quadern
// ---------------------------------------------------------------------------
export class Voxel {
  constructor(mx, mz, my) {
    this.mx = mx; this.mz = mz; this.my = my;
    this.zellen = new Map();
  }
  schluessel(x, y, z) { return (y * this.mz + z) * this.mx + x; }
  drin(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.mx && y < this.my && z < this.mz; }
  setze(x, y, z, m) { if (this.drin(x, y, z)) this.zellen.set(this.schluessel(x, y, z), m); }
  nimm(x, y, z) { this.zellen.delete(this.schluessel(x, y, z)); }
  hole(x, y, z) { return this.drin(x, y, z) ? this.zellen.get(this.schluessel(x, y, z)) || 0 : 0; }
  anzahl() { return this.zellen.size; }
  // füllt einen quader [x0, x1) x [y0, y1) x [z0, z1) mit m (m = 0 leert ihn)
  fuelle(x0, y0, z0, x1, y1, z1, m) {
    for (let y = Math.max(0, y0); y < Math.min(this.my, y1); y++) for (let z = Math.max(0, z0); z < Math.min(this.mz, z1); z++) for (let x = Math.max(0, x0); x < Math.min(this.mx, x1); x++) {
      if (m) this.zellen.set(this.schluessel(x, y, z), m); else this.zellen.delete(this.schluessel(x, y, z));
    }
  }
  // greedy: möglichst große gleichfarbige quader (kanonisch: gleiche blöcke ergeben immer dieselbe liste)
  zuQuader() {
    const { mx, mz, my } = this;
    const besucht = new Set(), aus = [];
    const frei = (x, y, z, m) => this.zellen.get(this.schluessel(x, y, z)) === m && !besucht.has(this.schluessel(x, y, z));
    for (const k of [...this.zellen.keys()].sort((a, b) => a - b)) {
      if (besucht.has(k)) continue;
      const m = this.zellen.get(k), x0 = k % mx, z0 = Math.floor(k / mx) % mz, y0 = Math.floor(k / (mx * mz));
      let x1 = x0 + 1;
      while (x1 < mx && frei(x1, y0, z0, m)) x1++;
      let z1 = z0 + 1;
      while (z1 < mz) { let ok = true; for (let x = x0; x < x1 && ok; x++) ok = frei(x, y0, z1, m); if (!ok) break; z1++; }
      let y1 = y0 + 1;
      while (y1 < my) { let ok = true; for (let z = z0; z < z1 && ok; z++) for (let x = x0; x < x1 && ok; x++) ok = frei(x, y1, z, m); if (!ok) break; y1++; }
      for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) besucht.add(this.schluessel(x, y, z));
      aus.push([x0, y0, z0, x1, y1, z1, m]);
    }
    return aus;
  }
  static ausQuader(liste, mx, mz, my) {
    const v = new Voxel(mx, mz, my);
    for (const q of liste || []) v.fuelle(q[0], q[1], q[2], q[3], q[4], q[5], q[6]);
    return v;
  }
}

// die zellen, die ein teil belegt: [[x, y, z], ...]
export function teilZellen(t) {
  const [w, h] = TEIL_MASSE[t.t] || [1, 1];
  const aus = [];
  for (let y = t.y; y < t.y + h; y++) for (let i = 0; i < w; i++) aus.push(t.a === 1 ? [t.x, y, t.z + i] : [t.x + i, y, t.z]);
  return aus;
}

// die festen quader des hauses ([x0, y0, z0, x1, y1, z1] ohne material): bei auto die wände, sonst die eigene hitbox-liste
export function kollisionsQuader(doc) {
  return doc.hitbox && doc.hitbox.auto === false ? doc.hitbox.quader : doc.quader.map(q => q.slice(0, 6));
}

export function neuesHaus(name = "Mein Haus") {
  return bereinigeHaus({
    format: FORMAT, v: VERSION, name, masse: [26, 20, 10],
    material: [{ id: 1, farbe: "#e8dfd0", textur: "putz" }, { id: 2, farbe: "#7a4a2e", textur: "holz" }, { id: 3, farbe: "#a07a4a", textur: "parkett" }, { id: 4, farbe: "#6e4b3a", textur: "ziegel" }, { id: 5, farbe: "#bfe3f2", textur: "glas" }],
    boden: 3, quader: [], teile: [], objekte: []
  });
}

// prüft und bereinigt ein haus (objekt oder json-text). rückgabe: ein kanonisches dokument oder null. unbrauchbares wird verworfen,
// zahlen werden begrenzt, quader werden über das raster neu zusammengefasst (keine überlappung, höchstens GRENZEN.quader)
export function bereinigeHaus(roh) {
  let d = roh;
  if (typeof roh === "string") { try { d = JSON.parse(roh); } catch { return null; } }
  if (!d || typeof d !== "object" || d.format !== FORMAT || d.v !== VERSION) return null;
  const G = GRENZEN;
  const m = Array.isArray(d.masse) ? d.masse : [];
  const mx = ganz(m[0], G.x[0], G.x[1], 26), mz = ganz(m[1], G.z[0], G.z[1], 20), my = ganz(m[2], G.y[0], G.y[1], 10);
  const keller = ganz(d.keller, 0, Math.min(G.keller, my - 1), 0);

  const material = [];
  const ids = new Set();
  for (const e of Array.isArray(d.material) ? d.material : []) {
    if (material.length >= G.material || !e || typeof e !== "object") continue;
    const id = ganz(e.id, 1, 99, 0);
    if (!id || ids.has(id)) continue;
    ids.add(id);
    material.push({ id, farbe: /^#[0-9a-f]{6}$/i.test(e.farbe) ? e.farbe.toLowerCase() : "#cccccc", textur: TEXTUR_IDS.includes(e.textur) ? e.textur : "glatt" });
  }
  if (!material.length) { material.push({ id: 1, farbe: "#e8dfd0", textur: "putz" }); ids.add(1); }
  const vorgabe = material[0].id;

  const v = new Voxel(mx, mz, my);
  for (const q of (Array.isArray(d.quader) ? d.quader : []).slice(0, G.quader)) {
    if (!Array.isArray(q) || q.length < 7) continue;
    const x0 = ganz(q[0], 0, mx, 0), y0 = ganz(q[1], 0, my, 0), z0 = ganz(q[2], 0, mz, 0);
    const x1 = ganz(q[3], x0, mx, x0), y1 = ganz(q[4], y0, my, y0), z1 = ganz(q[5], z0, mz, z0);
    if (x1 <= x0 || y1 <= y0 || z1 <= z0) continue;
    v.fuelle(x0, y0, z0, x1, y1, z1, ids.has(Math.floor(q[6])) ? Math.floor(q[6]) : vorgabe);
    if (v.anzahl() > G.voxel) return null;
  }

  // fußboden: eigene platten nur dort, wo gesetzt. alte dateien ohne das feld: der frühere boden über der grundfläche der blöcke (ebene 0)
  const fv = new Voxel(mx, mz, my);
  const bodenId0 = ids.has(Math.floor(d.boden)) ? Math.floor(d.boden) : 0;
  if (Array.isArray(d.fussboden)) {
    for (const q of d.fussboden.slice(0, G.quader)) {
      if (!Array.isArray(q) || q.length < 7) continue;
      const x0 = ganz(q[0], 0, mx, 0), y0 = ganz(q[1], 0, my, 0), z0 = ganz(q[2], 0, mz, 0);
      const x1 = ganz(q[3], x0, mx, x0), y1 = ganz(q[4], y0, my, y0), z1 = ganz(q[5], z0, mz, z0);
      if (x1 <= x0 || y1 <= y0 || z1 <= z0) continue;
      fv.fuelle(x0, y0, z0, x1, y1, z1, ids.has(Math.floor(q[6])) ? Math.floor(q[6]) : vorgabe);
      if (fv.anzahl() > G.voxel) return null;
    }
  } else if (bodenId0 && v.anzahl()) {
    let x0 = mx, x1 = 0, z0 = mz, z1 = 0;
    for (const [k] of v.zellen) { const x = k % mx, z = Math.floor(k / mx) % mz; x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); z0 = Math.min(z0, z); z1 = Math.max(z1, z + 1); }
    fv.fuelle(x0, 0, z0, x1, 1, z1, bodenId0);
  }

  // teile: begrenzt je art, nur eine haustür, innerhalb des rasters; ihre felder werden als öffnung aus den blöcken genommen
  const teile = [];
  const zaehler = { tuer: 0, klappe: 0, geheim: 0 };
  let haustuer = false;
  for (const e of (Array.isArray(d.teile) ? d.teile : []).slice(0, G.teile)) {
    if (!e || !TEIL_MASSE[e.t] || zaehler[e.t] >= G[e.t]) continue;
    const t = { t: e.t, x: ganz(e.x, 0, mx - 1, 0), y: ganz(e.y, 0, my - 1, 0), z: ganz(e.z, 0, mz - 1, 0), a: e.a === 1 ? 1 : 0, h: e.h === -1 ? -1 : 1, haus: false, m: ids.has(Math.floor(e.m)) ? Math.floor(e.m) : vorgabe };
    const zellen = teilZellen(t);
    if (!zellen.every(([x, y, z]) => v.drin(x, y, z))) continue;
    if (e.t === "tuer" && e.haus === true && !haustuer) { t.haus = true; haustuer = true; }
    zaehler[e.t]++;
    teile.push(t);
    for (const [x, y, z] of zellen) v.nimm(x, y, z);
  }

  const objekte = [];
  for (const e of (Array.isArray(d.objekte) ? d.objekte : []).slice(0, G.objekte)) {
    if (!e || !MOEBEL[e.a]) continue;
    objekte.push({ a: e.a, x: halb(e.x, 0, mx, mx / 2), y: halb(e.y, 0, my, 0), z: halb(e.z, 0, mz, mz / 2), r: ganz(e.r, 0, 3, 0), ...(e.a === "leiter" ? { n: ganz(e.n, 1, G.y[1], LEITER_STANDARD) } : {}) });
  }

  const bodenId = ids.has(Math.floor(d.boden)) ? Math.floor(d.boden) : 0;
  // hitbox: auto folgt den wänden, sonst die eigene liste (über dasselbe raster bereinigt, ohne die öffnungen der teile)
  const auto = !(d.hitbox && d.hitbox.auto === false);
  const hv = new Voxel(mx, mz, my);
  if (!auto) {
    for (const q of (Array.isArray(d.hitbox.quader) ? d.hitbox.quader : []).slice(0, G.quader)) {
      if (!Array.isArray(q) || q.length < 6) continue;
      const x0 = ganz(q[0], 0, mx, 0), y0 = ganz(q[1], 0, my, 0), z0 = ganz(q[2], 0, mz, 0);
      const x1 = ganz(q[3], x0, mx, x0), y1 = ganz(q[4], y0, my, y0), z1 = ganz(q[5], z0, mz, z0);
      if (x1 > x0 && y1 > y0 && z1 > z0) hv.fuelle(x0, y0, z0, x1, y1, z1, 1);
      if (hv.anzahl() > G.voxel) return null;
    }
    for (const t of teile) for (const [x, y, z] of teilZellen(t)) hv.nimm(x, y, z);
  }
  return { format: FORMAT, v: VERSION, name: text(d.name, G.name) || "Haus", masse: [mx, mz, my], keller, material, boden: bodenId, fussboden: fv.zuQuader(), quader: v.zuQuader(), hitbox: { auto, quader: auto ? [] : hv.zuQuader().map(q => q.slice(0, 6)) }, teile, objekte };
}

// hinweise für den ersteller (nichts davon verhindert das speichern): { art: "fehler" | "hinweis", text: [de, en] }
export function pruefeHaus(doc) {
  const aus = [];
  if (!doc.quader.length) aus.push({ art: "fehler", text: ["Das Haus hat noch keine Blöcke.", "The house has no blocks yet."] });
  if (!doc.teile.some(t => t.t === "tuer" && t.haus)) aus.push({ art: "hinweis", text: ["Keine Haustür: jeder kann das Haus betreten (oder niemand, wenn die Wände dicht sind).", "No front door: anyone can enter the house (or nobody if the walls are closed)."] });
  if (!doc.objekte.some(o => o.a === "truhe")) aus.push({ art: "hinweis", text: ["Keine Truhe: im Haus lassen sich keine Gegenstände ablegen.", "No chest: nothing can be stored in the house."] });
  if (!doc.teile.some(t => t.t === "geheim")) aus.push({ art: "hinweis", text: ["Keine Geheimwand.", "No secret wall."] });
  return aus;
}

// aus einem dokument die bauvorlage des spiels (wie die presets in haus.js): meter, ursprung = mitte am boden, vorderseite +z
export function defAusDoc(doc) {
  const [mx, mz, my] = doc.masse;
  const farbe = Object.fromEntries(doc.material.map(m => [m.id, m]));
  const keller = doc.keller || 0;   // die untersten ebenen liegen unter dem boden: der boden (meter 0) liegt bei y = keller
  const bx = x => (x - mx / 2) * BLOCK, bz = z => (z - mz / 2) * BLOCK, by = y => (y - keller) * BLOCK;
  const boxen = [];
  // fußboden: je zelle eine platte unten in der zelle (sichtbar und fest). die platten liegen in der kollision, egal ob die hitbox der wände automatisch ist
  const boden = [];
  for (const [x0, y0, z0, x1, y1, z1, m] of doc.fussboden || []) {
    const f = farbe[m] || doc.material[0];
    for (let y = y0; y < y1; y++) {
      boxen.push([(bx(x0) + bx(x1)) / 2, by(y) + BODEN_DICKE / 2, (bz(z0) + bz(z1)) / 2, (x1 - x0) * BLOCK, BODEN_DICKE, (z1 - z0) * BLOCK, f.farbe, f.textur]);
      boden.push([(bx(x0) + bx(x1)) / 2, by(y) + BODEN_DICKE / 2, (bz(z0) + bz(z1)) / 2, (x1 - x0) * BLOCK, BODEN_DICKE, (z1 - z0) * BLOCK]);
    }
  }
  for (const [x0, y0, z0, x1, y1, z1, m] of doc.quader) {
    const f = farbe[m] || doc.material[0];
    boxen.push([(bx(x0) + bx(x1)) / 2, by((y0 + y1) / 2), (bz(z0) + bz(z1)) / 2, (x1 - x0) * BLOCK, (y1 - y0) * BLOCK, (z1 - z0) * BLOCK, f.farbe, f.textur]);
  }
  // kollision getrennt von den sichtbaren boxen: [mx, my, mz, sx, sy, sz] (die bodenplatte ist nur optik, der boden ist das gelände)
  const kollision = boden.concat(kollisionsQuader(doc).map(([x0, y0, z0, x1, y1, z1]) => [(bx(x0) + bx(x1)) / 2, by((y0 + y1) / 2), (bz(z0) + bz(z1)) / 2, (x1 - x0) * BLOCK, (y1 - y0) * BLOCK, (z1 - z0) * BLOCK]));
  // teile: mitte des felds; die tür sitzt auf der bodenplatte. [typ, x, y, z, angel, innen, achse, material]
  const bloecke = doc.teile.map(t => {
    const [w, h] = TEIL_MASSE[t.t];
    const cx = t.a === 1 ? bx(t.x + 0.5) : bx(t.x + w / 2), cz = t.a === 1 ? bz(t.z + w / 2) : bz(t.z + 0.5);
    const cy = by(t.y) + (t.y === 0 ? SCHWELLE : 0) + (h * BLOCK) / 2;
    const f = farbe[t.m] || doc.material[0];
    return [t.t, cx, cy, cz, t.h, t.t === "tuer" ? !t.haus : false, t.a, f.farbe, f.textur];
  });
  // geheimwand zuerst nach hinten sortieren ist nicht nötig; die haustür muss aber das erste "tuer" sein (tests, schlüssel)
  bloecke.sort((a, b) => (a[0] === "tuer" && !a[5] ? 0 : 1) - (b[0] === "tuer" && !b[5] ? 0 : 1));
  const moebel = doc.objekte.map(o => [o.a, bx(o.x), bz(o.z), o.r, by(o.y), o.n]);
  // leitern: mitte, unterkante, oberkante und die richtung, in die man oben absteigt (die vorderseite des objekts: r = 0 nach +z, 1 nach +x, ...)
  const leitern = doc.objekte.filter(o => o.a === "leiter").map(o => ({ x: bx(o.x), z: bz(o.z), y0: by(o.y), y1: by(o.y) + (o.n || LEITER_STANDARD) * BLOCK, ex: [0, 1, 0, -1][o.r], ez: [1, 0, -1, 0][o.r] }));
  // die grube im boden: das rechteck [x0, z0, x1, z1] (meter, relativ zur hausmitte), in dem blöcke unter dem boden liegen (null ohne keller)
  let grube = null;
  if (keller) for (const q of doc.quader) if (q[1] < keller) {
    grube = grube ? [Math.min(grube[0], bx(q[0])), Math.min(grube[1], bz(q[2])), Math.max(grube[2], bx(q[3])), Math.max(grube[3], bz(q[5]))] : [bx(q[0]), bz(q[2]), bx(q[3]), bz(q[5])];
  }
  return {
    name: { de: doc.name, en: doc.name }, boxen, kollision, bloecke, b: mx * BLOCK, t: mz * BLOCK, h: (my - keller) * BLOCK, tiefe: keller * BLOCK, grube, moebel, leitern, raeume: 0, weg: null, eigen: true
  };
}
