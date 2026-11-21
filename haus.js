import * as THREE from "three";
import { MOEBEL, MOEBEL_IDS, defAusDoc } from "./hausformat.js";
import { materialFuer, boxGeo, istGlas } from "./texturen.js";

// häuser: jeder spieler hat ein festes haus (keine räder, kein verschieben). der server vergibt es mit dem parkplatz (state.hs)
// und lässt es nach dem gehen eines angemeldeten spielers 10 minuten stehen. vor dem haus liegt ein kleiner parkplatz in
// legacy-größe (faktor 1), der große parkplatz (faktor 5) bleibt auf dem flugplatz.

export const EIGEN = 100;   // hs-variante eines selbstgebauten hauses (das dokument kommt separat, siehe setzeDoc)
export const HAUS_VARIANTEN = 8;   // 3 kleine hütten und 5 große häuser (siehe VARIANTEN)
export const HAUS_Z = 1780;           // mitte der häuser, die vorderseite zeigt nach +z
export const WOHN_X = 1300;           // mitte der reihe: eine eigene, eingeebnete fläche weit weg vom flughafen (siehe wohngegend.js)
export const KLEIN_VERSATZ = 12;      // abstand der mitte des kleinen parkplatzes vor der hausmitte
export const KLEIN_K = 1;             // legacy-größe
// maße in blöcken zu 0,5 m (wie das bausystem, BAU.ZELLE): die figur ist etwa 1 m = 2 blöcke hoch, ein haus also nur knapp doppelt so hoch
export const BLOCK = 0.5;
const ABSTAND = 16, ANZAHL = 20;
let wohnY = 0;                        // höhe der fläche (das gelände wird dort eingeebnet), ohne weltdaten 0
export const setzeWohnHoehe = y => { wohnY = Number(y) || 0; };
export const wohnHoehe = () => wohnY;
const GEHEIM_ZYKLUS = 12000, GEHEIM_OFFEN = 3000;   // geheimwand: alle 12 s für 3 s ohne hitbox

// position der hausmitte am boden: ein grundstück je parkplatznummer, 20 in einer reihe, 16 m breit
export function hausPos(lot) {
  return new THREE.Vector3(WOHN_X + ((((lot % ANZAHL) + ANZAHL) % ANZAHL) - (ANZAHL - 1) / 2) * ABSTAND, wohnY, HAUS_Z);
}
export const kleinerPlatz = lot => hausPos(lot).add(new THREE.Vector3(0, 0, KLEIN_VERSATZ));
// briefkasten am rand des grundstücks (steht für alle zugänglich an der straße; wohngegend.js zeichnet ihn dort)
export const briefkastenPos = lot => hausPos(lot).add(new THREE.Vector3(7, 0.55, KLEIN_VERSATZ + 14 - 7.4));
const TUER_AUTO_ZU = 8;   // s: eine geöffnete haustür fällt wieder zu (und ist dann wieder abgeschlossen)

// ---------------------------------------------------------------------------
// bauvarianten als daten (in hausmaßen, ursprung = mitte am boden):
//   boxen   [mx, my, mz, sx, sy, sz, farbe]  feste teile (wände, boden, dach)
//   bloecke [typ, x, y, z, hinge]            typ tuer (schwenkt waagrecht), klappe (1 x 1 block, schwenkt senkrecht),
//                                            geheim (zeitweise ohne hitbox); x/y/z = mitte des blocks, hinge -1/+1 = seite
// blockgrößen in metern: die figur ist als kapsel 0,5 m breit und 1 m hoch, die tür muss also breiter und höher sein als 1 x 2 blöcke
// ---------------------------------------------------------------------------
const WAND = 0.15;
export const BLOCK_MASS = { tuer: [2 * BLOCK, 3 * BLOCK], klappe: [BLOCK, BLOCK], geheim: [2 * BLOCK, 3 * BLOCK] };   // [breite, höhe] in m
const SCHWELLE = 0.04;    // boden: keine stufe in der tür

// wand entlang x bei z; luecken [start, breite, unten, oben]: darüber und darunter bleibt wand stehen
function wandX(boxen, z, x0, x1, h, farbe, luecken = []) {
  let c = x0;
  for (const [s, b, u, o] of [...luecken].sort((a, bb) => a[0] - bb[0])) {
    if (s > c) boxen.push([(c + s) / 2, h / 2, z, s - c, h, WAND, farbe]);
    if (u > 0) boxen.push([s + b / 2, u / 2, z, b, u, WAND, farbe]);
    if (o < h) boxen.push([s + b / 2, (o + h) / 2, z, b, h - o, WAND, farbe]);
    c = s + b;
  }
  if (x1 > c) boxen.push([(c + x1) / 2, h / 2, z, x1 - c, h, WAND, farbe]);
}

export const MOEBEL_TYPEN = MOEBEL_IDS;   // die einrichtung steht in hausformat.js (gemeinsam mit dem editor)


function huette({ name, b, t, h, farbe, tuerX, tuerHinge, klappenX, geheimX, geheimHinten, moebel = [] }) {
  const boxen = [], bloecke = [];
  const x0 = -b / 2, x1 = b / 2, zv = t / 2, zh = -t / 2;
  const [tw, th] = BLOCK_MASS.tuer, [kw, kh] = BLOCK_MASS.klappe, [gw, gh] = BLOCK_MASS.geheim;
  boxen.push([0, 0.02, 0, b, SCHWELLE, t, "#8a7a66"]);                         // boden
  boxen.push([0, h + 0.07, 0, b + 0.3, 0.14, t + 0.3, "#6e4b3a"]);              // dach
  // vorderwand: tür und klappen (1 x 1 block, als fenster auf 2 bis 3 blöcken höhe)
  const luecken = [[tuerX - tw / 2, tw, SCHWELLE, SCHWELLE + th]];
  bloecke.push(["tuer", tuerX, SCHWELLE + th / 2, zv, tuerHinge]);
  for (const kx of klappenX) {
    luecken.push([kx - kw / 2, kw, 2 * BLOCK, 2 * BLOCK + kh]);
    bloecke.push(["klappe", kx, 2 * BLOCK + kh / 2, zv, 1]);
  }
  wandX(boxen, zv, x0, x1, h, farbe, luecken);
  wandX(boxen, zh, x0, x1, h, farbe);
  for (const sx of [x0, x1]) boxen.push([sx, h / 2, 0, WAND, h, t, farbe]);   // seitenwände
  // innenwand mit geheimwand: dahinter liegt ein verstecktes zimmer
  const zi = zh + geheimHinten;
  wandX(boxen, zi, x0, x1, h, farbe, [[geheimX - gw / 2, gw, SCHWELLE, SCHWELLE + gh]]);
  bloecke.push(["geheim", geheimX, SCHWELLE + gh / 2, zi, 1]);
  return { name, boxen, bloecke, b, t, h, moebel, raeume: 2, weg: [[tuerX, zv - 0.6], [geheimX, zi + 0.7], [geheimX, zi - 0.45]] };
}

// große häuser: vorne ein wohnbereich (halle), dahinter durch eine querwand (z = zTrenn) abgetrennte räume. die querwand hat öffnungen:
// "tuer" (innentür, ohne schloss), "durchgang" (offen) oder "geheim" (die geheimwand zum versteck); längswände (zWaende, x-werte) trennen
// die hinteren räume. weg = route von der haustür zum versteck (der test läuft sie ab)
function grossHaus({ name, b, t, h, farbe, tuerX, tuerHinge = -1, klappenX = [], zTrenn, oeffnungen, zWaende = [], moebel = [] }) {
  const boxen = [], bloecke = [];
  const x0 = -b / 2, x1 = b / 2, zv = t / 2, zh = -t / 2;
  const [tw, th] = BLOCK_MASS.tuer, [kw, kh] = BLOCK_MASS.klappe, [gw, gh] = BLOCK_MASS.geheim;
  boxen.push([0, 0.02, 0, b, SCHWELLE, t, "#8a7a66"]);
  boxen.push([0, h + 0.07, 0, b + 0.3, 0.14, t + 0.3, "#6e4b3a"]);
  const front = [[tuerX - tw / 2, tw, SCHWELLE, SCHWELLE + th]];
  bloecke.push(["tuer", tuerX, SCHWELLE + th / 2, zv, tuerHinge]);
  for (const kx of klappenX) {
    front.push([kx - kw / 2, kw, 2 * BLOCK, 2 * BLOCK + kh]);
    bloecke.push(["klappe", kx, 2 * BLOCK + kh / 2, zv, 1]);
  }
  wandX(boxen, zv, x0, x1, h, farbe, front);
  wandX(boxen, zh, x0, x1, h, farbe);
  for (const sx of [x0, x1]) boxen.push([sx, h / 2, 0, WAND, h, t, farbe]);
  const quer = [];
  let geheimX = 0;
  for (const o of oeffnungen) {
    const geheim = o.art === "geheim", w = geheim ? gw : tw, hh = geheim ? gh : th;
    quer.push([o.x - w / 2, w, SCHWELLE, SCHWELLE + hh]);
    if (o.art === "tuer") bloecke.push(["tuer", o.x, SCHWELLE + th / 2, zTrenn, o.hinge ?? 1, 1]);
    if (geheim) { bloecke.push(["geheim", o.x, SCHWELLE + gh / 2, zTrenn, 1]); geheimX = o.x; }
  }
  wandX(boxen, zTrenn, x0, x1, h, farbe, quer);
  for (const x of zWaende) boxen.push([x, h / 2, (zh + zTrenn) / 2, WAND, h, zTrenn - zh, farbe]);
  return {
    name, boxen, bloecke, b, t, h, moebel, raeume: 2 + zWaende.length,
    weg: [[tuerX, zv - 0.6], [geheimX, zTrenn + 0.7], [geheimX, zTrenn - 0.5]]
  };
}

// maße in metern, ein block = 0,5 m: 12 x 10 x 4, 14 x 10 x 4 und 10 x 10 x 5 blöcke
export const VARIANTEN = [
  // moebel [typ, x, z, drehung in 90-grad-schritten]; wohnraum vorne, dahinter das versteck (nur über die geheimwand erreichbar)
  huette({ name: { de: "Hütte", en: "Cabin" }, b: 12 * BLOCK, t: 10 * BLOCK, h: 4 * BLOCK, farbe: "#d8cfc0", tuerX: 0, tuerHinge: -1, klappenX: [-1.75, 1.75], geheimX: 1.5, geheimHinten: 1.4,
    moebel: [["sofa", -2.45, 0.9, 1], ["tisch", 1.7, 1.45, 0], ["stuhl", 0.95, 1.45, 1], ["stuhl", 2.6, 1.45, 3], ["regal", 2.75, 0, 1], ["lampe", -2.65, 2.15, 0], ["teppich", -0.1, 0.5, 0], ["pflanze", 2.65, 2.2, 0],
      ["bett", -1.7, -1.8, 0], ["truhe", 2.6, -2.0, 0]] }),
  huette({ name: { de: "Langhaus", en: "Longhouse" }, b: 14 * BLOCK, t: 10 * BLOCK, h: 4 * BLOCK, farbe: "#c9b79c", tuerX: -1.75, tuerHinge: 1, klappenX: [0.25, 1.25, 2.5], geheimX: -1.5, geheimHinten: 1.4,
    moebel: [["herd", 3.15, 1.4, 1], ["regal", 3.2, 0.2, 1], ["tisch", 0.8, 0.6, 0], ["stuhl", 0.8, 1.35, 2], ["sofa", 1.2, -0.65, 2], ["lampe", -3.2, 2.2, 0], ["teppich", 0.8, 0.8, 0], ["pflanze", 3.2, 2.2, 0],
      ["bett", 2.5, -1.8, 0], ["truhe", -2.6, -1.9, 0]] }),
  huette({ name: { de: "Würfelhaus", en: "Cube house" }, b: 10 * BLOCK, t: 10 * BLOCK, h: 5 * BLOCK, farbe: "#9fa8b3", tuerX: 1.1, tuerHinge: -1, klappenX: [-1.25], geheimX: -0.5, geheimHinten: 1.3,
    moebel: [["bett", 1.95, -0.2, 1], ["schreibtisch", -1.7, 2.1, 0], ["stuhl", -1.7, 1.45, 2], ["regal", -2.28, 0.4, 1], ["teppich", -0.3, 0.8, 0], ["lampe", -2.2, -0.95, 0],
      ["truhe", 1.5, -1.9, 0], ["regal", -1.8, -2.2, 0]] }),

  // --- große häuser (max. 13 x 10 m passt auf das 16 m breite grundstück) ---
  grossHaus({ name: { de: "Villa", en: "Villa" }, b: 13, t: 10, h: 3, farbe: "#e8dfd0", tuerX: 0, tuerHinge: -1, klappenX: [-3.2, 3.2, -5.2, 5.2], zTrenn: -0.5,
    oeffnungen: [{ x: -4.4, art: "tuer", hinge: 1 }, { x: 0, art: "durchgang" }, { x: 4.4, art: "geheim" }], zWaende: [-2.2, 2.2],
    moebel: [["sofa", -1.8, 0.1, 0], ["tisch", -1.8, 1.5, 0], ["sofa", -5.0, 2.6, 1], ["kamin", -6.15, 3.0, 0], ["klavier", 6.1, 3.0, 3], ["regal", 6.2, 0.9, 3], ["pflanze", -6.0, 4.5, 0], ["pflanze", 6.0, 4.5, 0], ["lampe", -6.1, 0.3, 0], ["teppich", -2.2, 2.0, 0],
      ["bett", -4.6, -3.9, 0], ["kommode", -3.1, -4.6, 0], ["lampe", -6.0, -1.4, 0], ["teppich", -4.6, -2.6, 0],
      ["herd", 0, -4.65, 0], ["kuehlschrank", -1.5, -4.6, 0], ["esstisch", 0, -2.6, 0], ["stuhl", -0.9, -1.7, 2], ["stuhl", 0.9, -1.7, 2], ["kommode", 1.6, -4.6, 0],
      ["truhe", 5.8, -4.5, 0], ["regal", 3.0, -4.7, 0], ["teppich", 4.4, -2.5, 0], ["lampe", 6.1, -1.2, 0]] }),
  grossHaus({ name: { de: "Landhaus", en: "Country house" }, b: 12, t: 10, h: 3, farbe: "#c9a97a", tuerX: -3, tuerHinge: 1, klappenX: [0.5, 2.5, 4.5], zTrenn: 0.5,
    oeffnungen: [{ x: -3.2, art: "durchgang" }, { x: 0.9, art: "tuer", hinge: -1 }, { x: 4.4, art: "geheim" }], zWaende: [-1.2, 3.0],
    moebel: [["sofa", -5.0, 1.0, 0], ["tisch", -5.0, 2.2, 0], ["kamin", -5.65, 3.8, 0], ["esstisch", 3.3, 3.9, 0], ["stuhl", 2.4, 3.9, 1], ["stuhl", 4.2, 3.9, 3], ["herd", 5.65, 1.6, 3], ["kuehlschrank", 5.6, 2.7, 3], ["pflanze", -5.7, 4.6, 0], ["lampe", 1.2, 4.6, 0], ["teppich", -4.6, 2.4, 0],
      ["bett", -4.2, -3.9, 0], ["kommode", -2.0, -4.6, 0], ["wanne", -5.0, -1.0, 0], ["lampe", -5.8, -2.4, 0], ["teppich", -3.5, -2.4, 0],
      ["schreibtisch", 0.9, -4.5, 0], ["stuhl", 0.9, -3.7, 2], ["pflanze", -0.8, -4.6, 0],
      ["truhe", 5.5, -4.5, 0], ["regal", 3.4, -4.7, 0], ["lampe", 5.7, -0.9, 0], ["teppich", 4.4, -2.5, 0]] }),
  grossHaus({ name: { de: "Loft", en: "Loft" }, b: 12, t: 9, h: 3.5, farbe: "#9fa8b3", tuerX: 2, tuerHinge: 1, klappenX: [-4.5, -2, 4.5], zTrenn: -1.5,
    oeffnungen: [{ x: -4.2, art: "durchgang" }, { x: -1, art: "tuer", hinge: -1 }, { x: 3.8, art: "geheim" }], zWaende: [0.8],
    moebel: [["sofa", -3.0, 2.5, 0], ["sofa", -3.0, -0.4, 2], ["tisch", -3.0, 1.1, 0], ["klavier", -5.65, 3.0, 1], ["esstisch", 4.4, 1.6, 1], ["herd", 5.65, 2.9, 3], ["kuehlschrank", 5.6, 3.9, 3], ["lampe", 0.3, 4.2, 0], ["pflanze", -5.7, -0.8, 0], ["teppich", -3.0, 1.1, 0],
      ["bett", -3.5, -3.4, 0], ["kommode", -5.3, -4.2, 0], ["lampe", -5.8, -2.2, 0], ["wanne", -1.8, -4.0, 0],
      ["truhe", 5.4, -3.9, 0], ["regal", 1.6, -4.2, 0], ["lampe", 5.7, -2.0, 0], ["teppich", 3.4, -3.0, 0]] }),
  grossHaus({ name: { de: "Bungalow", en: "Bungalow" }, b: 13, t: 8, h: 2.5, farbe: "#e0dacd", tuerX: 0, tuerHinge: -1, klappenX: [-2.5, 2.5, -5.5, 5.5], zTrenn: -0.5,
    oeffnungen: [{ x: -4.8, art: "tuer", hinge: 1 }, { x: 0, art: "durchgang" }, { x: 4.8, art: "geheim" }], zWaende: [-3, 3],
    moebel: [["sofa", -3.2, 0.1, 0], ["tisch", -3.2, 1.5, 0], ["kamin", -6.15, 2.0, 0], ["esstisch", 4.0, 3.0, 0], ["regal", 6.2, 1.0, 3], ["pflanze", -6.0, 3.5, 0], ["pflanze", 6.0, 3.5, 0], ["lampe", 1.5, 3.6, 0], ["teppich", -3.2, 1.6, 0],
      ["bett", -4.9, -3.0, 0], ["lampe", -6.1, -1.2, 0], ["kommode", -3.5, -3.6, 0],
      ["herd", 0, -3.65, 0], ["kuehlschrank", -1.5, -3.6, 0], ["esstisch", 0, -2.0, 0], ["stuhl", -0.9, -1.15, 2], ["stuhl", 0.9, -1.15, 2],
      ["truhe", 6.0, -3.6, 0], ["regal", 3.4, -3.7, 0], ["lampe", 6.1, -1.2, 0], ["teppich", 4.8, -2.2, 0]] }),
  grossHaus({ name: { de: "Herrenhaus", en: "Manor" }, b: 13, t: 10, h: 3.5, farbe: "#9a5a48", tuerX: 2, tuerHinge: 1, klappenX: [-4.5, -1, 4.5, 6], zTrenn: 1.5,
    oeffnungen: [{ x: -4.4, art: "tuer", hinge: 1 }, { x: 0, art: "durchgang" }, { x: 4.4, art: "geheim" }], zWaende: [-2.3, 2.3],
    moebel: [["kommode", -5.8, 4.5, 0], ["lampe", -0.5, 4.6, 0], ["pflanze", 6.0, 4.6, 0], ["pflanze", -6.0, 2.0, 0], ["teppich", -3.5, 3.4, 0], ["klavier", -2.9, 2.0, 0],
      ["bett", -4.6, -3.8, 0], ["kommode", -3.0, -4.6, 0], ["lampe", -6.0, 0.8, 0], ["wanne", -5.2, -1.6, 0], ["teppich", -3.9, -2.3, 0],
      ["regal", -1.2, -4.7, 0], ["regal", 0, -4.7, 0], ["regal", 1.2, -4.7, 0], ["esstisch", 0, -1.6, 0], ["stuhl", -0.9, -0.7, 2], ["stuhl", 0.9, -0.7, 2],
      ["truhe", 5.8, -4.6, 0], ["regal", 3.0, -4.7, 0], ["lampe", 6.1, -1.0, 0], ["teppich", 4.4, -2.5, 0]] })
];

// ---------------------------------------------------------------------------
// verwaltung: häuser nach dem server-stand aufbauen und entfernen, türen animieren
// ---------------------------------------------------------------------------
export function erzeugeHaeuser({ scene, world, RAPIER, mat, textSprite }) {
  const haeuser = new Map();   // lot -> { v, gruppe, cols, bloecke, platz }
  const eigene = new Map();    // lot -> bauvorlage eines selbstgebauten hauses (aus dem dokument, defAusDoc)
  let sollV = new Map();       // zuletzt gemeldete varianten je parkplatz
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  // schild je grundstück: "frei" ohne bewohner, mit haus der parkplatz. beide liegen bereit, sichtbar ist je eines
  const schilder = [];
  if (textSprite) {
    for (let lot = 0; lot < ANZAHL; lot++) {
      const p = kleinerPlatz(lot);
      const frei = textSprite(`Grundstück ${lot + 1} · frei`, { skala: 2.2, bg: "rgba(60,110,60,0.92)" });
      const belegt = textSprite(`P${lot + 1} · Haus`, { skala: 2.2, bg: "rgba(20,60,160,0.92)" });
      for (const sp of [frei, belegt]) { sp.position.set(p.x - 6.9, p.y + 1.7, p.z + 6.4); scene.add(sp); }
      belegt.visible = false;
      schilder.push({ frei, belegt });
    }
  }

  function collider(pos, halb) {
    return world.createCollider(RAPIER.ColliderDesc.cuboid(halb[0], halb[1], halb[2]).setTranslation(pos.x, pos.y, pos.z).setFriction(0.9));
  }

  function baue(lot, v) {
    const def = v >= EIGEN ? eigene.get(lot) : VARIANTEN[((v % VARIANTEN.length) + VARIANTEN.length) % VARIANTEN.length];
    if (!def) return null;   // selbstgebaut, das dokument ist noch nicht da
    const basis = hausPos(lot);
    const gruppe = new THREE.Group();
    gruppe.position.copy(basis);
    const cols = [], bloecke = [];
    let truhePos = null;   // die erste truhe des hauses ist seine kiste
    for (const [mx, my, mz, sx, sy, sz, farbe, art] of def.boxen) {
      // sichtbare wand: mit textur (uv in metern) oder einfarbig; die kollision kommt getrennt (def.kollision), sonst aus den boxen
      let m;
      if (art && art !== "glatt") {
        m = new THREE.Mesh(boxGeo(sx, sy, sz), materialFuer(farbe, art));
      } else {
        m = new THREE.Mesh(geoBox, mat(farbe, { roughness: 0.85 }));
        m.scale.set(sx, sy, sz);
      }
      m.position.set(mx, my, mz);
      m.castShadow = !istGlas(art);   // glas wirft keinen schatten
      m.receiveShadow = true;
      gruppe.add(m);
      if (!def.kollision) cols.push(collider(basis.clone().add(new THREE.Vector3(mx, my, mz)), [sx / 2, sy / 2, sz / 2]));
    }
    for (const [mx, my, mz, sx, sy, sz] of def.kollision || []) cols.push(collider(basis.clone().add(new THREE.Vector3(mx, my, mz)), [sx / 2, sy / 2, sz / 2]));
    // einrichtung: sichtbare teile und eine feste hitbox je stück (der teppich liegt nur auf dem boden)
    for (const [typ, mx, mz, dreh, my0] of def.moebel) {
      const hoehe = my0 || 0;
      const m = MOEBEL[typ];
      if (!m) continue;
      const g = new THREE.Group();
      g.position.set(mx, hoehe, mz);
      g.rotation.y = (dreh || 0) * Math.PI / 2;
      for (const [ox, oy, oz, sx, sy, sz, farbe, extra] of m.teile) {
        const t = new THREE.Mesh(geoBox, mat(farbe, { roughness: 0.8, ...(extra || {}) }));
        t.scale.set(sx, sy, sz);
        t.position.set(ox, oy, oz);
        t.castShadow = t.receiveShadow = true;
        g.add(t);
      }
      gruppe.add(g);
      if (typ === "truhe" && !truhePos) truhePos = basis.clone().add(new THREE.Vector3(mx, hoehe + 0.25, mz));
      if (m.solid) {
        const quer = (dreh || 0) % 2 === 1;   // eine viertel drehung tauscht länge und tiefe
        const halb = quer ? [m.solid[2] / 2, m.solid[1] / 2, m.solid[0] / 2] : [m.solid[0] / 2, m.solid[1] / 2, m.solid[2] / 2];
        cols.push(collider(basis.clone().add(new THREE.Vector3(mx, hoehe + m.solid[1] / 2, mz)), halb));
      }
    }
    for (const [typ, x, y, z, hinge, innen, achse, bfarbe, btextur] of def.bloecke) {
      // das teil sitzt in einem halter in der mitte seines felds (achse 1 = wand entlang z: der halter ist um 90 grad gedreht);
      // schwenkpunkt: tür an der seite, klappe an der oberkante; das blatt liegt relativ zum schwenkpunkt
      const geheim = typ === "geheim";
      const [bw, bh] = BLOCK_MASS[typ], dicke = geheim ? WAND : 0.06;
      const farbe = bfarbe || (typ === "tuer" ? "#7a4a2e" : typ === "klappe" ? "#5b6770" : def.boxen[2]?.[6] || "#d8cfc0");
      const halter = new THREE.Group();
      halter.position.set(x, y, z);
      halter.rotation.y = achse === 1 ? Math.PI / 2 : 0;
      const pivot = new THREE.Group();
      const extra = geheim ? { transparent: true } : {};
      const blatt = new THREE.Mesh(boxGeo(1, 1, 1), bfarbe ? materialFuer(bfarbe, btextur, extra) : mat(farbe, { roughness: 0.8, ...extra }));
      blatt.scale.set(bw, bh, dicke);
      blatt.castShadow = blatt.receiveShadow = true;
      if (typ === "tuer") { pivot.position.set(hinge * bw / 2, 0, 0); blatt.position.set(-hinge * bw / 2, 0, 0); }
      else if (typ === "klappe") { pivot.position.set(0, bh / 2, 0); blatt.position.set(0, -bh / 2, 0); }
      pivot.add(blatt);
      halter.add(pivot);
      gruppe.add(halter);
      const halb = achse === 1 ? [dicke / 2, bh / 2, bw / 2] : [bw / 2, bh / 2, dicke / 2];
      const b = { lot, typ, hinge, innen: !!innen, achse: achse === 1 ? 1 : 0, pivot, blatt, mitte: basis.clone().add(new THREE.Vector3(x, y, z)), halb, offen: 0, ziel: 0, col: null };
      b.col = collider(b.mitte, b.halb);
      bloecke.push(b);
    }
    scene.add(gruppe);
    // kleiner parkplatz vor dem haus (legacy-größe)
    const platz = new THREE.Group();
    const p = kleinerPlatz(lot);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(12.4 * KLEIN_K, 0.04, 12.4 * KLEIN_K), new THREE.MeshStandardMaterial({ color: "#cfcac0", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    pad.position.set(p.x, p.y + 0.02, p.z);
    pad.receiveShadow = true;
    platz.add(pad);
    for (const sx of [-1, 1]) {
      const l = new THREE.Mesh(geoBox, new THREE.MeshBasicMaterial({ color: "#f2f2f2" }));
      l.scale.set(0.1, 0.01, 12.2);
      l.position.set(p.x + sx * 6.6, p.y + 0.05, p.z);
      platz.add(l);
    }
    scene.add(platz);
    return { v, gruppe, cols, bloecke, platz, basis, truhePos, hash: "", besitzer: 0 };
  }

  function entferne(h) {
    for (const c of h.cols) try { world.removeCollider(c, true); } catch {}
    for (const b of h.bloecke) if (b.col) try { world.removeCollider(b.col, true); } catch {}
    for (const g of [h.gruppe, h.platz]) {
      scene.remove(g);
      g.traverse(o => { if (o.isMesh && o.geometry !== geoBox && !o.geometry.userData.geteilt) o.geometry.dispose(); });
    }
  }

  // hs aus dem server-state: [[parkplatz, variante, 1 = besitzer da, hash des hauscodes], ...]
  function setze(hs) {
    const liste = Array.isArray(hs) ? hs : [];
    const soll = new Map(liste.map(e => [Number(e[0]), Number(e[1]) || 0]));
    for (const [lot, h] of [...haeuser]) {
      if (!soll.has(lot) || soll.get(lot) !== h.v) { entferne(h); haeuser.delete(lot); }
    }
    for (const [lot, v] of soll) if (!haeuser.has(lot)) { const h = baue(lot, v); if (h) haeuser.set(lot, h); }
    sollV = soll;
    for (const e of liste) {
      const h = haeuser.get(Number(e[0]));
      if (h) { h.besitzer = e[2] ? 1 : 0; h.hash = typeof e[3] === "string" ? e[3] : ""; }
    }
    schilder.forEach((sc, lot) => { sc.belegt.visible = haeuser.has(lot); sc.frei.visible = !haeuser.has(lot); });
  }

  // das dokument eines selbstgebauten hauses (vom server): vorlage merken und das haus neu aufbauen, falls es steht oder schon erwartet wird
  function setzeDoc(lot, doc) {
    if (!doc) { eigene.delete(lot); return; }
    eigene.set(lot, defAusDoc(doc));
    const h = haeuser.get(lot);
    if (h && h.v >= EIGEN) { entferne(h); haeuser.delete(lot); }
    if (sollV.get(lot) >= EIGEN) { const neu = baue(lot, sollV.get(lot)); if (neu) { haeuser.set(lot, neu); neu.hash = ""; } }
  }

  function setzeBlock(b, offen) {
    b.offen = offen;
    const w = offen * (b.typ === "tuer" ? 1.75 : b.typ === "klappe" ? 1.4 : 0);
    if (b.typ === "tuer") b.pivot.rotation.y = -b.hinge * w;
    else if (b.typ === "klappe") b.pivot.rotation.x = -w;
    else if (b.typ === "geheim") b.blatt.material.opacity = 1 - 0.7 * offen;
  }

  function aktualisiere(dt) {
    const geheimOffen = (Date.now() % GEHEIM_ZYKLUS) < GEHEIM_OFFEN ? 1 : 0;
    for (const h of haeuser.values()) {
      for (const b of h.bloecke) {
        if (b.typ === "geheim") b.ziel = geheimOffen;
        // haustür: nach einer weile fällt sie zu
        if (b.typ === "tuer" && b.ziel === 1) { b.offenZeit = (b.offenZeit || 0) + dt; if (b.offenZeit > TUER_AUTO_ZU) b.ziel = 0; }
        else b.offenZeit = 0;
        if (b.offen === b.ziel) continue;
        const schritt = dt * (b.typ === "geheim" ? 5 : 4);
        setzeBlock(b, b.offen < b.ziel ? Math.min(b.ziel, b.offen + schritt) : Math.max(b.ziel, b.offen - schritt));
        // hitbox: nur bei geschlossenem block; ab einem viertel offen kann man durch
        const soll = b.offen < 0.25;
        if (soll && !b.col) b.col = collider(b.mitte, b.halb);
        else if (!soll && b.col) { try { world.removeCollider(b.col, true); } catch {} b.col = null; }
      }
    }
  }

  // nächste tür oder klappe in reichweite (die geheimwand öffnet sich von selbst)
  function naechster(pos, reichweite = 1.6) {
    let best = null, bd = reichweite;
    for (const h of haeuser.values()) {
      for (const b of h.bloecke) {
        if (b.typ === "geheim") continue;
        const d = Math.hypot(b.mitte.x - pos.x, b.mitte.y - pos.y, b.mitte.z - pos.z);
        if (d < bd) { bd = d; best = b; }
      }
    }
    return best;
  }
  const schalte = b => { if (b) { b.ziel = b.ziel ? 0 : 1; b.offenZeit = 0; } return !!b; };

  // nächstes ding zum benutzen: tür, klappe, truhe (nur wo ein haus steht) oder briefkasten. { art, lot, block?, d }
  function naechstesZiel(pos, reichweite = 1.6) {
    let best = null;
    const nimm = (art, lot, p, block) => {
      const d = Math.hypot(p.x - pos.x, p.y - pos.y, p.z - pos.z);
      if (d < (best ? best.d : reichweite)) best = { art, lot, block, d };
    };
    for (const [lot, h] of haeuser) {
      for (const b of h.bloecke) if (b.typ !== "geheim") nimm(b.typ, lot, b.mitte, b);
      if (h.truhePos) nimm("truhe", lot, h.truhePos);
      nimm("brief", lot, briefkastenPos(lot));
    }
    return best;
  }

  return { setze, setzeDoc, aktualisiere, naechster, naechstesZiel, schalte, haus: lot => haeuser.get(lot), hat: lot => haeuser.has(lot), anzahl: () => haeuser.size, haeuser };
}
