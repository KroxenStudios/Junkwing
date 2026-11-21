import { SITZ_RECHTE, RECHTE_GRUPPE } from "./bau.js";

const klemme = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

const rechteCache = new WeakMap();
export function sitzRechte(bauplan, i) {
  const sitz = bauplan.parts[i];
  if (!sitz || sitz.t !== "sitz") return null;
  let karte = rechteCache.get(bauplan);
  if (!karte) rechteCache.set(bauplan, (karte = new Map()));
  const alt = karte.get(i);
  if (alt && alt.k === sitz.k) return alt;
  const recht = Object.fromEntries(SITZ_RECHTE.map(([r]) => [r, sitz.k?.[r] !== false]));
  const erlaubt = new Set(), gesperrt = new Set();
  if (!Object.values(recht).every(Boolean)) {
    for (const p of bauplan.parts) {
      const g = RECHTE_GRUPPE[p.t];
      if (!g) continue;
      for (const t of [p.k?.taste, p.k?.plus, p.k?.minus, p.k?.wechsel, p.k?.hoch, p.k?.runter]) if (t) (recht[g] ? erlaubt : gesperrt).add(t);
    }
  }
  const neu = { k: sitz.k, recht, erlaubt, gesperrt, fremd: sitz.k?.fremd === true };
  karte.set(i, neu);
  return neu;
}

export function filtereEingabe(ein, bauplan, i) {
  const r = sitzRechte(bauplan, i);
  if (!r) return ein;
  const { recht, erlaubt, gesperrt } = r;
  if (!gesperrt.size && recht.fahren && recht.flug) return ein;
  const aus = { ...ein, tasten: new Set([...ein.tasten].filter(t => erlaubt.has(t) || !gesperrt.has(t))) };
  if (!recht.fahren) { aus.gas = 0; aus.lenk = 0; aus.bremse = false; }
  if (!recht.flug) aus.achsen = {};
  return aus;
}

export function fremdeEingabe(roh, bauplan, sitzIndex) {
  const rechte = sitzRechte(bauplan, sitzIndex);
  if (!rechte?.fremd || !Array.isArray(roh)) return null;
  const [gas, lenk, bremse, tasten, nick, roll] = roh;
  const achsen = {};
  if (Number.isFinite(nick) && nick) achsen.nick = klemme(nick);
  if (Number.isFinite(roll) && roll) achsen.roll = klemme(roll);
  return filtereEingabe({
    gas: klemme(Number(gas) || 0), lenk: klemme(Number(lenk) || 0), bremse: !!bremse, achsen,
    tasten: new Set(Array.isArray(tasten) ? tasten.filter(t => typeof t === "string").slice(0, 24) : [])
  }, bauplan, sitzIndex);
}

export function mischeEingaben(liste) {
  if (!liste.length) return { gas: 0, lenk: 0, bremse: true, tasten: new Set() };
  if (liste.length === 1) return liste[0];
  const tasten = new Set();
  const achsen = {};
  let gas = 0, lenk = 0, bremse = false;
  for (const e of liste) {
    gas += e.gas; lenk += e.lenk;
    bremse ||= e.bremse;
    for (const t of e.tasten) tasten.add(t);
    for (const [k, v] of Object.entries(e.achsen || {})) achsen[k] = klemme((achsen[k] || 0) + v);
  }
  return { gas: klemme(gas), lenk: klemme(lenk), bremse, achsen, tasten };
}
