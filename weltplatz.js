// weltplatz: die vom konto kroxenstudios im welt-editor gesetzten grundstücke und assets (format "junkwing-welt", version 1).
// reine daten und prüfung ohne THREE und dom: client, editor und server benutzen dieselbe funktion (bereinigeWelt).
//
// {
//   "format": "junkwing-welt", "v": 1,
//   "plaetze": [ { "id": 0, "x": 1300, "z": 1780, "b": 48, "t": 72 }, ... ],   // grundstücke: mitte (m), breite x, tiefe z; id = die platznummer (lot) im spiel
//   "assets": [ { "k": "deko", "t": 3, "x": 10, "z": 20, "y": null, "r": 0, "s": 1 }, ... ]   // k: "deko" (index in DEKO) oder "baum" (index in BAUM_ARTEN);
//                                                                                              // y = null: auf dem gelände, sonst höhe in m; r in grad; s = größe
// }
// ohne gespeicherte welt (oder ohne grundstücke) gilt die alte reihe aus 20 grundstücken in der wohngegend (haus.js).

export const FORMAT = "junkwing-welt";
export const GRENZEN = { plaetze: 40, assets: 3000, b: [24, 80], t: [40, 120], welt: 20000, deko: 25, baum: 6, groesse: [0.2, 8] };

const zahl = (v, lo, hi, vorgabe) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : vorgabe; };
const rund = (n, st = 0.1) => Math.round(n / st) * st;

export function leereWelt() { return { format: FORMAT, v: 1, plaetze: [], assets: [] }; }

// prüft und bereinigt (objekt oder json-text): rückgabe ein kanonisches dokument oder null
export function bereinigeWelt(roh) {
  let d = roh;
  if (typeof roh === "string") { try { d = JSON.parse(roh); } catch { return null; } }
  if (!d || typeof d !== "object" || d.format !== FORMAT || d.v !== 1) return null;
  const G = GRENZEN;
  const plaetze = [], ids = new Set();
  for (const e of (Array.isArray(d.plaetze) ? d.plaetze : []).slice(0, G.plaetze)) {
    if (!e || typeof e !== "object") continue;
    const id = Math.floor(Number(e.id));
    if (!(id >= 0 && id < G.plaetze) || ids.has(id)) continue;
    ids.add(id);
    plaetze.push({ id, x: rund(zahl(e.x, -G.welt, G.welt, 0)), z: rund(zahl(e.z, -G.welt, G.welt, 0)), b: Math.round(zahl(e.b, G.b[0], G.b[1], 48)), t: Math.round(zahl(e.t, G.t[0], G.t[1], 72)) });
  }
  plaetze.sort((a, b) => a.id - b.id);
  const assets = [];
  for (const e of (Array.isArray(d.assets) ? d.assets : []).slice(0, G.assets)) {
    if (!e || (e.k !== "deko" && e.k !== "baum")) continue;
    const t = Math.floor(Number(e.t));
    if (!(t >= 0 && t < G[e.k])) continue;
    assets.push({ k: e.k, t, x: rund(zahl(e.x, -G.welt, G.welt, 0)), z: rund(zahl(e.z, -G.welt, G.welt, 0)), y: e.y == null ? null : rund(zahl(e.y, -500, 3000, 0)), r: Math.round(zahl(e.r, 0, 359, 0)), s: rund(zahl(e.s, G.groesse[0], G.groesse[1], 1), 0.05) });
  }
  return { format: FORMAT, v: 1, plaetze, assets };
}

// freier platz: ein neues grundstück bekommt die kleinste unbenutzte id
export function freieId(welt) {
  const benutzt = new Set(welt.plaetze.map(p => p.id));
  for (let i = 0; i < GRENZEN.plaetze; i++) if (!benutzt.has(i)) return i;
  return -1;
}
