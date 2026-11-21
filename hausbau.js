// hausbau: die reine bearbeitungslogik des haus-editors (ohne THREE und dom, testbar). koordinaten in blöcken: x, z auf dem raster
// des hauses, y nach oben; ein block = 0,5 m. der ursprung des hauses (0, 0) liegt in der mitte des rasters.

import { BLOCK, TEIL_MASSE, teilZellen } from "./hausformat.js";

// welt (meter, ursprung = mitte des hauses am boden) <-> block-koordinaten (kommazahlen)
export const weltZuBlock = (p, masse) => ({ x: p.x / BLOCK + masse[0] / 2, y: p.y / BLOCK, z: p.z / BLOCK + masse[1] / 2 });
export const blockZuWelt = (b, masse) => ({ x: (b.x - masse[0] / 2) * BLOCK, y: b.y * BLOCK, z: (b.z - masse[1] / 2) * BLOCK });

// strahl durch das raster (amanatides/woo): die erste gefüllte zelle mit der fläche, durch die der strahl eintritt. o, d in block-koordinaten.
// ebene > 0 blendet zellen ab dieser höhe aus (schnitt, um in das haus zu sehen). rückgabe { x, y, z, nx, ny, nz, t } oder null
export function strahlVoxel(v, o, d, maxLaenge = 400, ebene = 0) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x) || 1, sy = Math.sign(d.y) || 1, sz = Math.sign(d.z) || 1;
  const tdx = d.x ? Math.abs(1 / d.x) : Infinity, tdy = d.y ? Math.abs(1 / d.y) : Infinity, tdz = d.z ? Math.abs(1 / d.z) : Infinity;
  let tx = d.x ? ((sx > 0 ? x + 1 : x) - o.x) / d.x : Infinity;
  let ty = d.y ? ((sy > 0 ? y + 1 : y) - o.y) / d.y : Infinity;
  let tz = d.z ? ((sz > 0 ? z + 1 : z) - o.z) / d.z : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 2000 && t <= maxLaenge; i++) {
    if (v.drin(x, y, z) && (!ebene || y < ebene) && v.hole(x, y, z)) return { x, y, z, nx, ny, nz, t };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}

// schnittpunkt des strahls mit dem boden (y = 0): { x, z, t } oder null (strahl zeigt nach oben)
export function bodenTreffer(o, d) {
  if (d.y >= -1e-6) return null;
  const t = -o.y / d.y;
  return t < 0 ? null : { x: o.x + d.x * t, z: o.z + d.z * t, t };
}

// zellen für die werkzeuge; a und b sind { x, y, z } (ganze zahlen), hoehe in blöcken ab a.y
const bereich = (a, b) => [Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.z, b.z), Math.max(a.z, b.z)];
export function zellenWand(a, b, hoehe) {
  const aus = [];
  const entlangX = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z);
  const [x0, x1, z0, z1] = bereich(a, b);
  for (let h = 0; h < hoehe; h++) {
    if (entlangX) for (let x = x0; x <= x1; x++) aus.push([x, a.y + h, a.z]);
    else for (let z = z0; z <= z1; z++) aus.push([a.x, a.y + h, z]);
  }
  return aus;
}
export function zellenQuader(a, b, hoehe) {
  const aus = [];
  const [x0, x1, z0, z1] = bereich(a, b);
  for (let h = 0; h < hoehe; h++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) aus.push([x, a.y + h, z]);
  return aus;
}
// hohler raum: nur die vier wände (eine zelle dick), ohne boden und decke
export function zellenRaum(a, b, hoehe) {
  const [x0, x1, z0, z1] = bereich(a, b);
  return zellenQuader(a, b, hoehe).filter(([x, , z]) => x === x0 || x === x1 || z === z0 || z === z1);
}

// ein teil aus dem treffer auf eine wand: die wandachse folgt der getroffenen fläche (fläche in z-richtung: wand entlang x)
export function teilAusTreffer(treffer, art, { hinge = 1, haus = false, material = 1 } = {}, masse) {
  const [w] = TEIL_MASSE[art];
  const a = Math.abs(treffer.nx) > 0 ? 1 : 0;
  let x = treffer.x, z = treffer.z;
  // das teil liegt in der wand: bei einer fläche in +z/+x ist es die zelle des treffers selbst
  if (a === 0) x = Math.min(Math.max(0, x), masse[0] - w);
  else z = Math.min(Math.max(0, z), masse[1] - w);
  const y = art === "klappe" ? treffer.y : 0;
  return { t: art, x, y, z, a, h: hinge === -1 ? -1 : 1, haus: art === "tuer" && !!haus, m: material };
}

// setzt ein teil: ersetzt überlappende teile, nimmt die öffnung aus dem raster (v), hält die haustür eindeutig. rückgabe: false, wenn es nicht passt
export function teilPlatzieren(doc, v, teil) {
  const zellen = teilZellen(teil);
  if (!zellen.every(([x, y, z]) => v.drin(x, y, z))) return false;
  const belegt = new Set(zellen.map(([x, y, z]) => v.schluessel(x, y, z)));
  doc.teile = doc.teile.filter(t => !teilZellen(t).some(([x, y, z]) => belegt.has(v.schluessel(x, y, z))));
  if (teil.haus) for (const t of doc.teile) t.haus = false;
  doc.teile.push(teil);
  for (const [x, y, z] of zellen) v.nimm(x, y, z);
  return true;
}

// entfernt ein teil; die öffnung bleibt leer
export function teilEntfernen(doc, index) {
  if (index >= 0 && index < doc.teile.length) doc.teile.splice(index, 1);
}

// die zelle für das setzen eines würfels: bei einem treffer die nachbarzelle vor der fläche, sonst die bodenzelle
export function setzZelle(treffer, boden) {
  if (treffer) return { x: treffer.x + treffer.nx, y: treffer.y + treffer.ny, z: treffer.z + treffer.nz };
  if (boden) return { x: Math.floor(boden.x), y: 0, z: Math.floor(boden.z) };
  return null;
}
