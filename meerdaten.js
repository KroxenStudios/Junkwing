import { hoeheBei } from "./weltdaten.js";


export const WASSER_Y = -2;
export const MEERBODEN = -16;
export const WELT_HALB = 25000;
export const WELT_MITTE = [0, -708];

const RAND_BAND = 900;
const glatt = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function hafenDaten(d) {
  const kante = d.z0 + d.groesse;
  return {
    x: 0,
    kante,
    kaiVon: kante - 800,
    kaiBis: kante - 520,
    rampeEnde: kante - 450,
    breite: 150
  };
}

export function meerRand(d) {
  const n = d.n, s = d.schritt, hf = hafenDaten(d);
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      const k = ix * n + iz;
      const x = d.x0 + ix * s, z = d.z0 + iz * s;
      const rand = Math.min(x - d.x0, d.x0 + d.groesse - x, z - d.z0, d.z0 + d.groesse - z);
      const w = glatt(0, 1, 1 - rand / RAND_BAND);
      let h0 = d.h[k] > 0 ? 45 * Math.tanh(d.h[k] / 160) : d.h[k] * 0.3;
      const ex = 1 - glatt(0, 150, Math.abs(x) - 760), ez = glatt(-1560 - 150, -1560, z) * (1 - glatt(220, 370, z));
      h0 *= 1 - ex * ez;
      let h = h0 * (1 - w) + MEERBODEN * w;
      const mx = 1 - glatt(hf.breite, hf.breite + 90, Math.abs(x - hf.x));
      const mz = glatt(hf.kaiVon - 200, hf.kaiVon, z);
      const profil = -10 * glatt(hf.kaiBis, hf.kaiBis + 120, z) - 6 * glatt(hf.kante - 300, hf.kante, z);
      const m = mx * mz;
      h = h * (1 - m) + profil * m;
      d.h[k] = h;
    }
  }
  const frei = (x, z) => !(Math.abs(x) < 800 && z > -1580 && z < 240);
  const trocken = (x, z) => frei(x, z) && hoeheBei(d, x, z) > WASSER_Y + 0.8;
  d.gebaeude = d.gebaeude.filter(g => trocken(g[0], g[1]));
  const flach = a => {
    const out = [];
    for (let i = 0; i < a.length; i += 3) if (trocken(a[i], a[i + 1])) out.push(a[i], a[i + 1], a[i + 2]);
    return out;
  };
  d.baeume = flach(d.baeume);
  d.felsen = flach(d.felsen);
}
