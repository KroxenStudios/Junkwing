import * as THREE from "three";

import { DEKO } from "./dekodaten.js";
export { DEKO };

const matCache = new Map();
const mat = (farbe, extra = {}) => {
  const key = farbe + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.9, flatShading: true, ...extra }));
  return matCache.get(key);
};
const geoBox = new THREE.BoxGeometry(1, 1, 1);
const geoZyl = new THREE.CylinderGeometry(1, 1, 1, 10);
const geoKegel = new THREE.ConeGeometry(1, 1, 7);
const geoKugel = new THREE.IcosahedronGeometry(1, 0);

function teil(g, geo, farbe, pos, skal, rot = [0, 0, 0], extra) {
  const m = new THREE.Mesh(geo, mat(farbe, extra));
  m.position.set(...pos);
  m.scale.set(...skal);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function baueDeko(typ, s = 1) {
  const g = new THREE.Group();
  switch (typ) {
    case 0:
      teil(g, geoBox, "#a07a45", [0, 0.6, 0], [1.2, 1.2, 1.2]);
      teil(g, geoBox, "#7d5c32", [0, 0.6, 0], [1.24, 0.12, 1.24]);
      break;
    case 1:
      teil(g, geoZyl, "#b8472f", [0, 0.5, 0], [0.4, 1, 0.4]);
      teil(g, geoZyl, "#8f3624", [0, 0.9, 0], [0.42, 0.06, 0.42]);
      teil(g, geoZyl, "#8f3624", [0, 0.1, 0], [0.42, 0.06, 0.42]);
      break;
    case 2:
      teil(g, geoBox, "#4a7fb0", [0, 1.3, 0], [6, 2.6, 2.4]);
      for (let i = -2; i <= 2; i++) teil(g, geoBox, "#3b6791", [i * 1.15, 1.3, 1.22], [0.12, 2.4, 0.08]);
      break;
    case 3:
      for (let i = -2; i <= 2; i++) teil(g, geoBox, "#6b6f75", [i * 1.25, 0.8, 0], [0.12, 1.6, 0.12]);
      teil(g, geoBox, "#8d9298", [0, 1.1, 0], [5, 0.9, 0.04], [0, 0, 0], { transparent: true, opacity: 0.55 });
      teil(g, geoBox, "#6b6f75", [0, 1.55, 0], [5, 0.08, 0.08]);
      break;
    case 4:
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4 - r; i++) {
        teil(g, geoBox, r ? "#b09a6e" : "#c2ad80", [(i - (3 - r) / 2) * 1.0, 0.25 + r * 0.5, 0], [0.95, 0.5, 0.9]);
      }
      break;
    case 5:
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) teil(g, geoBox, "#6e5a3c", [x, 2.7, z], [0.3, 5.4, 0.3]);
      teil(g, geoBox, "#7a6446", [0, 5.4, 0], [2.8, 0.3, 2.8]);
      teil(g, geoBox, "#8a7352", [0, 6.4, 0], [2, 1.8, 2]);
      teil(g, geoKegel, "#5b4a33", [0, 7.7, 0], [1.9, 1, 1.9], [0, Math.PI / 4, 0]);
      teil(g, geoBox, "#2b2f36", [0, 6.5, 1.01], [1.4, 0.5, 0.05]);
      break;
    case 6:
      teil(g, geoKegel, "#8c9a6a", [0, 1.1, 0], [2.4, 2.2, 2.4], [0, Math.PI / 4, 0]);
      teil(g, geoBox, "#2b2f36", [0, 0.6, 1.2], [0.7, 1.1, 0.04], [0.3, 0, 0]);
      break;
    case 7:
      teil(g, geoKugel, "#3d8a45", [0, 0.55, 0], [0.9, 0.65, 0.9]);
      teil(g, geoKugel, "#4a9c50", [0.5, 0.4, 0.3], [0.55, 0.45, 0.55]);
      break;
    case 8:
      teil(g, geoZyl, "#5a8f4a", [0, 1.2, 0], [0.22, 2.4, 0.22]);
      teil(g, geoZyl, "#5a8f4a", [0.5, 1.5, 0], [0.16, 0.9, 0.16], [0, 0, 0.5]);
      teil(g, geoZyl, "#5a8f4a", [-0.5, 1.2, 0], [0.15, 0.8, 0.15], [0, 0, -0.5]);
      break;
    case 9:
      teil(g, geoZyl, "#7d6140", [0, 2.4, 0], [0.2, 4.8, 0.2], [0.06, 0, 0.05]);
      for (let i = 0; i < 6; i++) {
        const w = (i / 6) * Math.PI * 2;
        teil(g, geoBox, "#3f8f45", [Math.cos(w) * 0.9, 4.7, Math.sin(w) * 0.9], [1.9, 0.06, 0.5], [0, -w, 0.35]);
      }
      break;
    case 10:
      teil(g, geoBox, "#b4aa98", [-1.6, 1.2, 0], [2.4, 2.4, 0.4]);
      teil(g, geoBox, "#a89e8c", [0.6, 0.8, 0], [2, 1.6, 0.4]);
      teil(g, geoBox, "#9c9282", [2, 1.6, 0.4], [0.4, 3.2, 1.6]);
      break;
    case 11:
      teil(g, geoZyl, "#c8ccd1", [0, 1.6, 0], [1.7, 3.2, 1.7]);
      teil(g, geoKegel, "#9ea3a9", [0, 3.5, 0], [1.75, 0.6, 1.75]);
      teil(g, geoBox, "#7a7f86", [1.75, 1.2, 0], [0.1, 2.4, 0.3]);
      break;
    case 12:
      for (const r of [[0, 0, 0.8], [0, 0.8, 0], [0.8, 0, 0]]) teil(g, geoBox, "#7b7e82", [0, 0.7, 0], [0.18, 1.8, 0.18], r.map(v => v));
      break;
    case 13:
      teil(g, geoZyl, "#5f6368", [0, 3, 0], [0.1, 6, 0.1]);
      teil(g, geoBox, "#5f6368", [0.4, 5.9, 0], [0.9, 0.08, 0.08]);
      teil(g, geoBox, "#ffe9a8", [0.8, 5.8, 0], [0.3, 0.1, 0.2], [0, 0, 0], { emissive: "#ffd36b", emissiveIntensity: 0.6 });
      break;
    case 14:
      teil(g, geoBox, "#7a4a38", [0, 0.6, 0], [4, 0.8, 1.8]);
      teil(g, geoBox, "#6a4132", [-0.2, 1.2, 0], [2, 0.7, 1.6]);
      for (const [x, z] of [[-1.3, 0.9], [1.3, 0.9], [-1.3, -0.9], [1.3, -0.9]]) teil(g, geoZyl, "#2b2f36", [x, 0.35, z], [0.35, 0.3, 0.35], [Math.PI / 2, 0, 0]);
      break;
    case 15: {   // strauch: haselartig, mehrere hohe blaetterkugeln
      teil(g, geoKugel, "#4d8f3a", [0, 0.9, 0], [0.8, 0.85, 0.8]);
      teil(g, geoKugel, "#5ea046", [0.55, 0.7, 0.25], [0.6, 0.65, 0.6]);
      teil(g, geoKugel, "#468535", [-0.5, 0.65, -0.2], [0.6, 0.6, 0.6]);
      teil(g, geoZyl, "#6b4a2d", [0, 0.25, 0], [0.08, 0.5, 0.08]);
      break;
    }
    case 16:   // hecke: langer dichter block mit rundem oberteil
      teil(g, geoBox, "#3f7d35", [0, 0.55, 0], [3.2, 1.1, 0.9]);
      teil(g, geoKugel, "#4a8c3d", [0, 1.1, 0], [1.6, 0.35, 0.5]);
      break;
    case 17:   // farn: wedel als schraege flache blaetter im kreis
      for (let i = 0; i < 9; i++) {
        const w = (i / 9) * Math.PI * 2;
        teil(g, geoBox, i % 2 ? "#4f9a45" : "#5aa84c", [Math.cos(w) * 0.45, 0.35, Math.sin(w) * 0.45], [0.9, 0.04, 0.22], [0, -w, 0.7]);
      }
      break;
    case 18:   // brombeere: niedrig, dunkel, rote beeren
      teil(g, geoKugel, "#2f5f2a", [0, 0.45, 0], [1.1, 0.55, 1.1]);
      teil(g, geoKugel, "#3a6e32", [0.6, 0.3, 0.3], [0.7, 0.4, 0.7]);
      for (const [x, y, z] of [[0.4, 0.8, 0.2], [-0.3, 0.75, 0.5], [0.1, 0.85, -0.4], [-0.6, 0.6, -0.2]]) teil(g, geoKugel, "#7a1d3a", [x, y, z], [0.1, 0.1, 0.1]);
      break;
    case 19:   // ginster: gruen mit gelben bluetenkugeln
      teil(g, geoKugel, "#5f8f3a", [0, 0.75, 0], [0.8, 0.8, 0.8]);
      for (const [x, y, z] of [[0.3, 1.1, 0.2], [-0.3, 1.0, -0.2], [0.1, 1.25, -0.3], [-0.4, 0.8, 0.4], [0.5, 0.85, -0.3]]) teil(g, geoKugel, "#f2d230", [x, y, z], [0.22, 0.22, 0.22]);
      break;
    case 20:   // heidekraut: flaches violettes polster
      teil(g, geoKugel, "#8a5a99", [0, 0.2, 0], [1.4, 0.3, 1.4]);
      teil(g, geoKugel, "#6f4a82", [0.5, 0.18, 0.3], [0.8, 0.25, 0.8]);
      teil(g, geoKugel, "#9a6aa8", [-0.6, 0.18, -0.2], [0.7, 0.22, 0.7]);
      break;
    case 21:   // blumenwiese: gruene scheibe mit bunten punkten
      teil(g, geoZyl, "#6aa84a", [0, 0.03, 0], [1.6, 0.06, 1.6]);
      ["#e5484d", "#f2d230", "#ffffff", "#6a8cff", "#e58ad0", "#ff9a3c"].forEach((c, i) => {
        const w = i * 1.05, r = 0.4 + (i % 3) * 0.3;
        teil(g, geoKugel, c, [Math.cos(w) * r, 0.2, Math.sin(w) * r], [0.1, 0.1, 0.1]);
        teil(g, geoZyl, "#4f8a3a", [Math.cos(w) * r, 0.1, Math.sin(w) * r], [0.015, 0.2, 0.015]);
      });
      break;
    case 22:   // schilf: duenne hohe halme mit kolben
      for (let i = 0; i < 9; i++) {
        const w = i * 2.4, r = 0.15 + (i % 4) * 0.12, h = 1.7 + (i % 3) * 0.4;
        teil(g, geoZyl, "#8fa35a", [Math.cos(w) * r, h / 2, Math.sin(w) * r], [0.025, h, 0.025], [Math.sin(w) * 0.1, 0, Math.cos(w) * 0.1]);
        if (i % 2 === 0) teil(g, geoZyl, "#6b4a2d", [Math.cos(w) * r, h - 0.1, Math.sin(w) * r], [0.06, 0.28, 0.06]);
      }
      break;
    case 23:   // liegender baumstamm
      teil(g, geoZyl, "#6b4a2d", [0, 0.4, 0], [0.38, 3.8, 0.38], [0, 0, Math.PI / 2]);
      teil(g, geoZyl, "#c9a46a", [1.9, 0.4, 0], [0.3, 0.04, 0.3], [0, 0, Math.PI / 2]);
      teil(g, geoZyl, "#5a3d24", [-0.6, 0.85, 0], [0.09, 0.5, 0.09], [0.4, 0, 0.3]);
      break;
    case 24:   // jungtanne: kleiner kegel-stapel
      teil(g, geoZyl, "#6b4a2d", [0, 0.2, 0], [0.07, 0.4, 0.07]);
      teil(g, geoKegel, "#2f8f4e", [0, 0.7, 0], [0.7, 0.8, 0.7]);
      teil(g, geoKegel, "#3aa35a", [0, 1.2, 0], [0.5, 0.7, 0.5]);
      teil(g, geoKegel, "#2a7d46", [0, 1.65, 0], [0.3, 0.6, 0.3]);
      break;
    default:
      teil(g, geoBox, "#999999", [0, 0.5, 0], [1, 1, 1]);
  }
  g.scale.setScalar(s);
  return g;
}
