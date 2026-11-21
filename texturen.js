import * as THREE from "three";

// texturen der häuser: helle muster, die das material mit seiner farbe einfärbt (so braucht jede textur nur ein bild, die farbe
// kommt aus dem material). erzeugt per canvas, nur im browser; ohne dom bleibt es bei der reinen farbe.
// eine kachel ist 1 m: boxGeo skaliert die uv-koordinaten jeder fläche in meter, damit nichts gedehnt wird.

const GROESSE = 256;
const cache = new Map();

function zufall(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const grau = (g, a = 1) => `rgba(${g},${g},${g},${a})`;

const MUSTER = {
  putz(c, w) {
    c.fillStyle = grau(236); c.fillRect(0, 0, w, w);
    const r = zufall(11);
    for (let i = 0; i < 5000; i++) { c.fillStyle = grau(196 + Math.floor(r() * 60), 0.5); c.fillRect(r() * w, r() * w, 1 + r() * 2, 1 + r() * 2); }
  },
  beton(c, w) {
    c.fillStyle = grau(214); c.fillRect(0, 0, w, w);
    const r = zufall(23);
    for (let i = 0; i < 9000; i++) { c.fillStyle = grau(150 + Math.floor(r() * 90), 0.35); c.fillRect(r() * w, r() * w, 1 + r() * 1.5, 1 + r() * 1.5); }
    c.strokeStyle = grau(150, 0.5); c.lineWidth = 2; c.strokeRect(1, 1, w - 2, w - 2);
  },
  ziegel(c, w) {
    c.fillStyle = grau(238); c.fillRect(0, 0, w, w);
    const r = zufall(31), bw = w / 4, bh = w / 8;
    for (let z = 0; z < 8; z++) for (let s = -1; s < 5; s++) {
      const x = s * bw + (z % 2 ? bw / 2 : 0);
      c.fillStyle = grau(170 + Math.floor(r() * 60)); c.fillRect(x + 2, z * bh + 2, bw - 4, bh - 4);
    }
  },
  stein(c, w) {
    c.fillStyle = grau(232); c.fillRect(0, 0, w, w);
    const r = zufall(41);
    let y = 0;
    while (y < w) {
      const h = 28 + r() * 30;
      let x = -r() * 40;
      while (x < w) {
        const bw = 36 + r() * 50;
        c.fillStyle = grau(165 + Math.floor(r() * 70)); c.fillRect(x + 2, y + 2, bw - 4, h - 4);
        x += bw;
      }
      y += h;
    }
  },
  holz(c, w) {
    const r = zufall(53), n = 8, bw = w / n;
    for (let i = 0; i < n; i++) {
      const g = 190 + Math.floor(r() * 50);
      c.fillStyle = grau(g); c.fillRect(i * bw, 0, bw, w);
      for (let k = 0; k < 14; k++) { c.fillStyle = grau(g - 40, 0.25); c.fillRect(i * bw + r() * bw, 0, 1, w); }
      c.fillStyle = grau(120, 0.7); c.fillRect(i * bw, 0, 2, w);
    }
  },
  parkett(c, w) {
    const r = zufall(61), n = 8, bh = w / n;
    for (let z = 0; z < n; z++) {
      let x = -r() * 60;
      while (x < w) {
        const bw = 70 + r() * 40, g = 195 + Math.floor(r() * 50);
        c.fillStyle = grau(g); c.fillRect(x, z * bh, bw, bh);
        c.fillStyle = grau(110, 0.6); c.fillRect(x, z * bh, 2, bh); c.fillRect(x, z * bh, bw, 2);
        x += bw;
      }
    }
  },
  fliesen(c, w) {
    c.fillStyle = grau(250); c.fillRect(0, 0, w, w);
    const n = 4, k = w / n, r = zufall(71);
    for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) { c.fillStyle = grau(214 + Math.floor(r() * 30)); c.fillRect(x * k + 3, z * k + 3, k - 6, k - 6); }
  },
  metall(c, w) {
    const n = 12;
    for (let i = 0; i < w; i++) { const g = 176 + Math.floor(60 * (0.5 + 0.5 * Math.sin((i / w) * Math.PI * 2 * n))); c.fillStyle = grau(g); c.fillRect(i, 0, 1, w); }
  }
};

// die textur zu einer id (null bei "glatt" oder ohne canvas)
export function textur(art) {
  if (!art || art === "glatt" || !MUSTER[art]) return null;
  if (cache.has(art)) return cache.get(art);
  let t = null;
  if (typeof document !== "undefined") {
    const cv = document.createElement("canvas");
    cv.width = cv.height = GROESSE;
    const c = cv.getContext?.("2d");
    if (c) {
      MUSTER[art](c, GROESSE);
      t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    }
  }
  cache.set(art, t);
  return t;
}

const GLAS = { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1, depthWrite: false };
export const istGlas = art => art === "glas";
const matCache = new Map();
// material aus farbe, textur und optionen; gleiche angaben teilen sich ein material
export function materialFuer(farbe, art, extra = {}) {
  const key = `${farbe}|${art}|${JSON.stringify(extra)}`;
  // glas: durchsichtig, glatt und leicht spiegelnd (die farbe tönt es); wirft keinen schatten (siehe istGlas)
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.9, map: textur(art), ...(art === "glas" ? GLAS : {}), ...extra }));
  return matCache.get(key);
}

const geoCache = new Map();
// quader (breite, höhe, tiefe in m) mit uv in metern: auf jeder fläche wiederholt sich die textur je meter einmal
export function boxGeo(sx, sy, sz) {
  const key = `${sx.toFixed(3)}|${sy.toFixed(3)}|${sz.toFixed(3)}`;
  let g = geoCache.get(key);
  if (g) return g;
  g = new THREE.BoxGeometry(sx, sy, sz);
  g.userData.geteilt = true;   // gehört dem cache, nicht dem haus
  const uv = g.attributes.uv;
  // reihenfolge der flächen: +x, -x, +y, -y, +z, -z, je 4 ecken; (u, v) = (breite, höhe) der fläche
  const maße = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * maße[f][0], uv.getY(k) * maße[f][1]); }
  uv.needsUpdate = true;
  geoCache.set(key, g);
  return g;
}
export const gebeGeometrienFrei = () => { for (const g of geoCache.values()) g.dispose(); geoCache.clear(); };
