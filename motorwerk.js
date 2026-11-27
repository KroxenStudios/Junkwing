export const LEERLAUF = 900, ROTBEREICH = 7200;
export const GAENGE = [3.4, 2.1, 1.45, 1.1, 0.88], ACHSE = 3.7;
export const AUFLADER = ["turbo", "lader", "nox"];

const PS_IN_WATT = 735.5;
const DECKEL = 2.8;
const FEUER_AB = 1.5;

const klemm = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);
const weich = (a, b, x) => {
  const t = klemm((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const glocke = u => u * (1 - 2.2 * (u - 0.62) * (u - 0.62));
const SPITZE = Array.from({ length: 101 }, (_, i) => glocke(i / 100)).reduce((a, b) => Math.max(a, b));

const gestaffelt = liste => liste.sort((a, b) => b - a).reduce((s, d, n) => s + (n ? d / 2 : d), 0);

export function anbauten(parts, zaehlt = () => true) {
  const turbo = [], lader = [];
  let nox = 0;
  parts.forEach((p, i) => {
    if (!AUFLADER.includes(p.t) || !zaehlt(i)) return;
    if (p.t === "turbo") turbo.push(p.k?.druck ?? 0.8);
    else if (p.t === "lader") lader.push(p.k?.druck ?? 0.5);
    else nox += p.k?.ps ?? 100;
  });
  return { turbo: gestaffelt(turbo), lader: gestaffelt(lader), nox };
}

export const ladeZiel = u => weich(0.28, 0.58, u);

export function traegeNach(ist, soll, dt) {
  const tau = soll > ist ? 0.9 : 0.35;
  return ist + (soll - ist) * (1 - Math.exp(-dt / tau));
}

export function ladeFaktor(a, spool, u = 0.8) {
  const verdichter = a.lader > 0 ? a.lader * (0.24 + 0.2 * u) : 0;
  return Math.min(DECKEL, 1 + 0.45 * a.turbo * spool + verdichter);
}

export function messwerte(nennPS, a, u, spool, noxAn) {
  const faktor = ladeFaktor(a, spool, u);
  const spritzt = noxAn && a.nox > 0 && u > 0.3;
  const ps = nennPS * Math.max(0, glocke(u) / SPITZE) * faktor + (spritzt ? a.nox : 0);
  const drehzahl = u * ROTBEREICH;
  return {
    drehzahl, ps, spritzt,
    nm: drehzahl > 1 ? ps * PS_IN_WATT / (drehzahl * Math.PI / 30) : 0,
    bar: a.turbo * spool + a.lader * (0.55 + 0.45 * u),
    glut: glut(faktor + (spritzt ? a.nox / Math.max(nennPS, 1) : 0), spritzt)
  };
}

export function glut(verhaeltnis, spritzt = false) {
  if (spritzt) return 1;
  return verhaeltnis < FEUER_AB ? 0 : Math.min(1, 0.35 + (verhaeltnis - FEUER_AB) / 0.8);
}

export function flammenAus(parts, fx) {
  let staerke = 0, blau = false;
  for (const [i, s] of fx) {
    const t = parts[i]?.t;
    if (s <= 0 || !AUFLADER.includes(t)) continue;
    if (t === "nox") blau = true;
    staerke = Math.max(staerke, s);
  }
  return staerke > 0 ? { staerke, blau } : null;
}
