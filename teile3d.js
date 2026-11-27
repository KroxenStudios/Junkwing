import * as THREE from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import {
  TEILE, ORIENT, ZELLE, analysiere, zellMitte, radRadius
} from "./bau.js";

const mats = new Map();
export function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...extra }));
  }
  return mats.get(key);
}

const DUNKEL = "#2a2d33";
const REIFEN = "#1b1d21";
const CHROM = { color: "#c9ced6", metalness: 0.1, roughness: 0.7 };

export function orientQuat(o) {
  const m = ORIENT[o];
  const m4 = new THREE.Matrix4().set(
    m[0], m[1], m[2], 0,
    m[3], m[4], m[5], 0,
    m[6], m[7], m[8], 0,
    0, 0, 0, 1
  );
  return new THREE.Quaternion().setFromRotationMatrix(m4);
}

const S = ZELLE / 2;
const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

function rundBox(w, h, d, r, nb = null, weg = null) {
  const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
  const pos = g.attributes.position, nor = g.attributes.normal;
  const halb = [w / 2, h / 2, d / 2];
  const hi = [0, 1, 2].map(a => halb[a] - (nb && nb[a * 2] ? 0 : r));
  const lo = [0, 1, 2].map(a => -halb[a] + (nb && nb[a * 2 + 1] ? 0 : r));
  const v = [0, 0, 0], k = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    for (let a = 0; a < 3; a++) {
      const x = pos.getComponent(i, a);
      v[a] = Math.abs(Math.abs(x) - halb[a] / 2) < 1e-6 ? (x > 0 ? hi[a] : lo[a]) : x;
      k[a] = Math.max(lo[a], Math.min(hi[a], v[a]));
    }
    const dx = v[0] - k[0], dy = v[1] - k[1], dz = v[2] - k[2];
    const len = Math.hypot(dx, dy, dz);
    if (len > 1e-6) {
      nor.setXYZ(i, dx / len, dy / len, dz / len);
      pos.setXYZ(i, k[0] + dx / len * r, k[1] + dy / len * r, k[2] + dz / len * r);
    } else pos.setXYZ(i, v[0], v[1], v[2]);
  }
  if (weg && weg.some(Boolean)) {
    const alt = g.index.array, neu = [];
    g.groups.forEach((gr, i) => {
      if (weg[i]) return;
      for (let k = gr.start; k < gr.start + gr.count; k++) neu.push(alt[k]);
    });
    g.setIndex(neu);
    g.clearGroups();
  }
  return g;
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const r = Math.min(0.06, Math.min(w, h, d) / 4);
  const m = new THREE.Mesh(geo(`b${w},${h},${d}`, () => rundBox(w, h, d, r)), material);
  m.position.set(x, y, z);
  return m;
}

const WUERFEL = new Set(["block", "panzer", "glas"]);
function schachbrett(c, p, versatz = 0) {
  const f = new THREE.Color(c);
  const hsl = {};
  f.getHSL(hsl, THREE.SRGBColorSpace);
  const heller = (p.x + p.y + p.z) % 2 === 0;
  const d = (hsl.l < 0.5 ? 0.06 : -0.06) * (heller ? 1 : 0) + versatz;
  f.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + d)), THREE.SRGBColorSpace);
  return "#" + f.getHexString();
}
const bits = a => (a ? a.map(n => (n ? 1 : 0)).join("") : "-");
function wuerfelGeo(nb, weg = null) {
  return geo("w" + bits(nb) + "c" + bits(weg), () => rundBox(ZELLE, ZELLE, ZELLE, 0.06, nb, weg));
}
function wuerfel(material, nb) {
  return new THREE.Mesh(wuerfelGeo(nb), material);
}
const instMats = {};
function instMat(t) {
  if (!instMats[t]) {
    instMats[t] = t === "panzer" ? new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4, metalness: 0.3 })
      : t === "glas" ? new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, metalness: 0 });
  }
  return instMats[t];
}

function leuchte(farbe, staerke = 1.5) {
  return new THREE.MeshStandardMaterial({ color: "#10141a", emissive: farbe, emissiveIntensity: staerke, roughness: 0.4 });
}

function zyl(r1, r2, h, material, x = 0, y = 0, z = 0, seg = 18) {
  const m = new THREE.Mesh(geo(`c${r1},${r2},${h},${seg}`, () => new THREE.CylinderGeometry(r1, r2, h, seg)), material);
  m.position.set(x, y, z);
  return m;
}

const E = S - 0.002;
const keilGeo = () => geo("keil", () => new ConvexGeometry([
  v3(-E, -E, -E), v3(E, -E, -E), v3(-E, -E, E), v3(E, -E, E), v3(-E, E, E), v3(E, E, E)
]));
const eckGeo = () => geo("ecke", () => new ConvexGeometry([
  v3(-E, -E, -E), v3(E, -E, -E), v3(-E, -E, E), v3(E, -E, E), v3(E, E, E)
]));

export function teilModell(p, nb = null) {
  const c = p.c || "#1a1c20";
  const farbe = mat(c);
  const g = new THREE.Group();
  const out = { obj: g };

  switch (p.t) {
    case "block":
      g.add(wuerfel(mat(schachbrett(c, p)), nb));
      break;
    case "panzer":
      g.add(wuerfel(mat(schachbrett(c, p, -0.05), { roughness: 0.4, metalness: 0.3 }), nb));
      break;
    case "glas":
      g.add(wuerfel(mat(c, { transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }), nb));
      break;
    case "helium":
      g.add(wuerfel(mat(schachbrett(c === "#1a1c20" ? "#9fd8ff" : c, p), { transparent: true, opacity: 0.7, roughness: 0.2 }), nb));
      break;
    case "halb":
      g.add(box(ZELLE - 0.004, S - 0.004, ZELLE - 0.004, farbe, 0, -S / 2));
      break;
    case "keil":
      g.add(new THREE.Mesh(keilGeo(), farbe));
      break;
    case "ecke":
      g.add(new THREE.Mesh(eckGeo(), farbe));
      break;
    case "sitz": {
      const polster = farbe;
      g.add(box(0.48, 0.12, 0.48, mat(DUNKEL), 0, -0.19));
      g.add(box(0.42, 0.1, 0.4, polster, 0, -0.08, -0.02));
      g.add(box(0.42, 0.42, 0.09, polster, 0, 0.06, 0.19));
      g.add(box(0.3, 0.1, 0.06, mat(DUNKEL), 0, 0.22, 0.2));
      break;
    }
    case "servo": {
      g.add(box(0.42, 0.3, 0.42, mat(DUNKEL), 0, -0.1));
      g.add(box(0.43, 0.06, 0.43, farbe, 0, -0.05));
      const kopf = new THREE.Group();
      kopf.add(zyl(0.19, 0.19, 0.1, mat("#c9ced6", CHROM), 0, 0.2, 0, 24));
      out.kopf = kopf;
      break;
    }
    case "mikro": {
      g.add(box(0.42, 0.2, 0.42, mat(DUNKEL), 0, -0.15));
      g.add(box(0.43, 0.05, 0.43, farbe, 0, -0.04));
      g.add(box(0.06, 0.2, 0.3, mat("#c9ced6", CHROM), -0.2, 0.08));
      g.add(box(0.06, 0.2, 0.3, mat("#c9ced6", CHROM), 0.2, 0.08));
      const kopf = new THREE.Group();
      kopf.add(zyl(0.17, 0.17, 0.08, mat("#c9ced6", CHROM), 0, 0.22, 0, 24));
      kopf.add(box(0.34, 0.06, 0.34, farbe, 0, 0.26));
      out.kopf = kopf;
      break;
    }
    case "wand":
      g.add(box(ZELLE - 0.004, 0.08, ZELLE - 0.004, farbe, 0, -ZELLE / 2 + 0.04, 0));
      break;
    case "bruch": {
      g.add(box(0.46, 0.14, 0.46, farbe, 0, -0.18));
      g.add(zyl(0.09, 0.09, 0.2, mat(DUNKEL), 0, 0));
      const kopf = new THREE.Group();
      kopf.add(box(0.46, 0.14, 0.46, farbe, 0, 0.18));
      out.kopf = kopf;
      break;
    }
    case "auspuff":
      g.add(zyl(0.06, 0.06, 0.5, mat("#3a4048"), 0, 0));
      out.emit = [0, 0.25, 0];
      break;
    case "nebel": {
      g.add(box(0.4, 0.3, 0.4, mat("#3a4048"), 0, -0.1));
      g.add(zyl(0.12, 0.09, 0.16, farbe, 0, 0.13));
      out.emit = [0, 0.24, 0];
      break;
    }
    case "duese": {
      g.add(box(0.36, 0.06, 0.36, mat(DUNKEL), 0, -0.22));
      g.add(zyl(0.21, 0.21, 0.26, mat("#d9dde3", { metalness: 0.1, roughness: 0.7 }), 0, -0.07, 0, 24));
      g.add(zyl(0.15, 0.2, 0.18, mat("#5d6168", { metalness: 0.1, roughness: 0.7 }), 0, 0.15, 0, 24));
      out.emit = [0, 0.26, 0];
      break;
    }
    case "rakete": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.16, 0.16, 0.3, mat("#f2f2f2"), 0, -0.05, 0, 22));
      g.add(zyl(0.09, 0.19, 0.16, mat("#3b3f45", { metalness: 0.1, roughness: 0.7 }), 0, 0.17, 0, 22));
      out.emit = [0, 0.26, 0];
      break;
    }
    case "fluegel":
      g.add(box(ZELLE - 0.004, 0.06, ZELLE - 0.004, farbe));
      break;
    case "steuerflaeche": {
      g.add(box(ZELLE - 0.004, 0.06, S, farbe, 0, 0, -S / 2));
      const klappe = new THREE.Group();
      klappe.add(box(ZELLE - 0.004, 0.06, S - 0.01, farbe, 0, 0, S / 2));
      g.add(klappe);
      out.klappe = klappe;
      break;
    }
    case "explosive":
    case "scheinwerfer": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.13, 0.17, 0.12, mat("#c9ced6", CHROM), 0, 0.02, 0, 22));
      const linse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.115, 0.012, 22),
        new THREE.MeshStandardMaterial({ color: "#fffbe8", emissive: p.k?.farbe || "#fff6d0", emissiveIntensity: 0, roughness: 0.2 })
      );
      linse.position.set(0, 0.085, 0);
      linse.userData.keinSchatten = true;
      g.add(linse);
      out.linse = linse;
      out.emit = [0, 0.2, 0];
      break;
    }
    case "leiter": {
      const metall = mat("#b8bcc4", { metalness: 0.1, roughness: 0.7 });
      for (const sx of [-1, 1]) g.add(box(0.04, ZELLE - 0.004, 0.05, metall, sx * 0.15, 0, 0));
      for (let i = 0; i < 5; i++) g.add(box(0.3, 0.03, 0.03, farbe, 0, -0.2 + i * 0.1, 0));
      break;
    }
    case "propeller": {
      g.add(box(0.3, 0.04, 0.3, mat(DUNKEL), 0, -0.23));
      g.add(zyl(0.16, 0.16, 0.26, mat("#5d6168", { metalness: 0.1, roughness: 0.7 }), 0, -0.08, 0, 24));
      g.add(zyl(0.04, 0.09, 0.1, mat("#c9ced6", CHROM), 0, 0.1, 0, 16));
      const rotor = new THREE.Group();
      rotor.position.y = 0.16;
      for (const s of [1, -1]) {
        const blatt = box(0.62, 0.012, 0.09, mat("#2b2f36"), s * 0.34, 0, 0);
        blatt.rotation.x = 0.35 * s;
        rotor.add(blatt);
      }
      g.add(rotor);
      const scheibe = new THREE.Mesh(
        new THREE.CircleGeometry(0.66, 36),
        new THREE.MeshBasicMaterial({ color: "#dfe6ee", transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
      );
      scheibe.rotation.x = -Math.PI / 2;
      scheibe.position.y = 0.16;
      scheibe.visible = false;
      scheibe.userData.keinSchatten = true;
      g.add(scheibe);
      out.rotor = { rotor, scheibe, winkel: 0 };
      break;
    }
    case "tank": {
      g.add(zyl(0.225, 0.225, ZELLE - 0.06, farbe, 0, 0, 0, 24));
      break;
    }
    case "motor": {
      const stahl = mat("#3a4048", { metalness: 0.1, roughness: 0.7 });
      g.add(box(ZELLE - 0.04, ZELLE - 0.12, ZELLE - 0.04, farbe));
      break;
    }
    case "turbo": {
      const alu = mat("#c9ced6", CHROM);
      g.add(box(0.4, 0.16, 0.4, farbe, 0, -0.17));
      const schnecke = new THREE.Mesh(geo("schnecke", () => new THREE.TorusGeometry(0.13, 0.075, 10, 26, Math.PI * 1.75)), alu);
      schnecke.position.set(0, 0.04, 0.02);
      g.add(schnecke);
      const mund = zyl(0.09, 0.07, 0.2, mat(DUNKEL), 0, 0.04, 0.1);
      mund.rotation.x = Math.PI / 2;
      g.add(mund, zyl(0.05, 0.05, 0.16, alu, 0.14, 0.17, 0.02, 12));
      break;
    }
    case "lader": {
      const alu = mat("#c9ced6", CHROM);
      g.add(box(0.42, 0.22, 0.46, farbe, 0, -0.12));
      for (const sx of [-0.1, 0.1]) {
        const walze = zyl(0.095, 0.095, 0.44, alu, sx, 0.04, 0, 16);
        walze.rotation.x = Math.PI / 2;
        g.add(walze);
      }
      g.add(box(0.24, 0.09, 0.2, mat(DUNKEL), 0, 0.17, -0.03));
      const scheibe = zyl(0.08, 0.08, 0.04, mat(DUNKEL), 0, -0.08, 0.235, 18);
      scheibe.rotation.x = Math.PI / 2;
      g.add(scheibe);
      break;
    }
    case "nox": {
      const lack = mat(c === "#1a1c20" ? "#1f6fe0" : c, { roughness: 0.35, metalness: 0.25 });
      for (const sz of [-0.15, 0.13]) g.add(box(0.34, 0.1, 0.06, mat(DUNKEL), 0, -0.19, sz));
      const flasche = zyl(0.15, 0.15, 0.36, lack, 0, -0.02, -0.03, 20);
      const hals = zyl(0.05, 0.13, 0.07, lack, 0, -0.02, 0.185, 16);
      const ventil = zyl(0.035, 0.035, 0.05, mat("#c9ced6", CHROM), 0, -0.02, 0.222, 10);
      for (const t of [flasche, hals, ventil]) t.rotation.x = Math.PI / 2;
      g.add(flasche, hals, ventil);
      break;
    }
    case "verschluss": {
      const stahl = mat("#2b2f36", { metalness: 0.1, roughness: 0.7 });
      g.add(box(ZELLE - 0.004, ZELLE - 0.004, ZELLE - 0.004, farbe));
      break;
    }
    case "munition": {
      const gruen = mat("#4b5a3a", { roughness: 0.8 });
      g.add(box(ZELLE - 0.004, ZELLE - 0.004, ZELLE - 0.004, farbe));
      const stahl = mat("#2b2f36", { metalness: 0.1, roughness: 0.7 });
      break;
    }
    case "schnellfeuer": {
      const stahl = mat("#2b2f36", { metalness: 0.1, roughness: 0.7 });
      const r = 0.025 + ((p.k?.kaliber ?? 30) / 155) * 0.1;
      g.add(box(ZELLE - 0.06, ZELLE * 0.5, ZELLE - 0.06, farbe, 0, -ZELLE / 4));
      for (const sx of [-1, 1]) {
        g.add(zyl(r, r, ZELLE * 0.75, stahl, sx * 0.08, ZELLE * 0.12, 0, 14));
      }
      break;
    }
    case "geschuetz": {
      const r = 0.04 + ((p.k?.kaliber ?? 75) / 155) * 0.17;
      const stahl = mat("#2b2f36", { metalness: 0.1, roughness: 0.7 });
      g.add(zyl(r, r, ZELLE, stahl, 0, 0, 0, 20));
      break;
    }
    case "kamera": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(box(0.26, 0.2, 0.34, mat("#2b2f36"), 0, -0.1));
      g.add(zyl(0.1, 0.12, 0.14, mat("#111418"), 0, 0.07, 0, 20));
      out.emit = [0, 0.22, 0];
      break;
    }
    case "unterboden": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(box(0.44, 0.04, 0.12, mat("#1b1e24"), 0, -0.18));
      const linse = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.07), leuchte(p.k?.farbe || "#ff2bd6", 0));
      linse.position.set(0, -0.15, 0);
      linse.userData.keinSchatten = true;
      g.add(linse);
      out.linse = linse;
      out.emit = [0, 0.1, 0];
      break;
    }
    case "strahler": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.03, 0.03, 0.14, mat("#3b3f45"), 0, -0.14, 0, 10));
      g.add(box(0.42, 0.1, 0.42, mat("#2b2f36", { metalness: 0.3, roughness: 0.5 }), 0, 0));
      for (let n = -1; n <= 1; n++) g.add(box(0.44, 0.012, 0.03, mat("#9aa6b2", { metalness: 0.6, roughness: 0.3 }), 0, 0.055, n * 0.13));
      const linse = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.01, 0.36), new THREE.MeshStandardMaterial({ color: "#f4f8ff", emissive: p.k?.farbe || "#e8f4ff", emissiveIntensity: 0, roughness: 0.2 }));
      linse.position.set(0, 0.052, 0);
      linse.userData.keinSchatten = true;
      g.add(linse);
      out.linse = linse;
      out.emit = [0, 0.1, 0];
      break;
    }
    case "blinker": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.17, 0.2, 0.12, mat("#2b2f36"), 0, -0.14, 0, 20));
      const linse = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), leuchte(p.k?.farbe || "#ffa31a", 0));
      linse.position.set(0, -0.08, 0);
      linse.userData.keinSchatten = true;
      g.add(linse);
      out.linse = linse;
      out.emit = [0, 0.1, 0];
      break;
    }
    case "blaulicht": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.17, 0.2, 0.08, mat("#2b2f36"), 0, -0.17, 0, 20));
      const spiegel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.015), mat("#d9dde3", { metalness: 0.6, roughness: 0.2 }));
      spiegel.position.set(0, -0.04, 0);
      g.add(spiegel);
      const linse = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: "#9fc0ff", emissive: p.k?.farbe || "#2f6bff", emissiveIntensity: 0, transparent: true, opacity: 0.85, roughness: 0.15 })
      );
      linse.position.set(0, -0.13, 0);
      linse.userData.keinSchatten = true;
      g.add(linse);
      out.linse = linse;
      out.emit = [0, 0.1, 0];
      break;
    }
    case "laser": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.07, 0.09, 0.2, mat("#20252c", { metalness: 0.3, roughness: 0.5 }), 0, -0.1, 0, 16));
      g.add(zyl(0.035, 0.035, 0.08, mat("#9aa6b2", { metalness: 0.6, roughness: 0.2 }), 0, 0.04, 0, 12));
      const laenge = Math.max(5, Math.min(1000, p.k?.messweite ?? 60));
      const strahl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, laenge, 6),
        new THREE.MeshBasicMaterial({ color: p.k?.farbe || "#ff2b2b", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      strahl.position.y = 0.08 + laenge / 2;
      strahl.visible = false;
      strahl.userData.keinSchatten = true;
      strahl.raycast = () => {};
      g.add(strahl);
      out.linse = strahl;
      out.emit = [0, 0.1, 0];
      break;
    }
    case "funken":
    case "regenbogen":
    case "staubspur":
    case "plasma": {
      const ring = { funken: "#ffb347", regenbogen: "#ff4fd8", staubspur: "#b59a73", plasma: "#6fb7ff" }[p.t];
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.1, 0.15, 0.2, mat("#2b2f36", { metalness: 0.3, roughness: 0.5 }), 0, -0.1, 0, 18));
      g.add(zyl(0.12, 0.12, 0.03, leuchte(p.k?.farbe && p.t !== "regenbogen" ? p.k.farbe : ring, 1.6), 0, 0.0, 0, 18));
      g.add(zyl(0.07, 0.1, 0.05, mat("#111418"), 0, 0.04, 0, 18));
      out.emit = [0, 0.1, 0];
      break;
    }
    case "konfetti": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.13, 0.08, 0.34, mat("#e5484d"), 0, -0.05, 0, 18));
      g.add(zyl(0.135, 0.135, 0.04, mat("#f5a524"), 0, -0.12, 0, 18));
      g.add(zyl(0.1, 0.1, 0.04, mat("#46b96b"), 0, 0.03, 0, 18));
      g.add(zyl(0.08, 0.08, 0.01, mat("#111418"), 0, 0.125, 0, 18));
      out.emit = [0, 0.14, 0];
      break;
    }
    case "rauchwerfer": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      for (const sx of [-1, 1]) {
        g.add(zyl(0.075, 0.075, 0.3, mat("#4a545c", { metalness: 0.2, roughness: 0.6 }), sx * 0.1, -0.06, 0, 14));
        g.add(zyl(0.06, 0.06, 0.01, mat("#111418"), sx * 0.1, 0.095, 0, 14));
      }
      g.add(box(0.1, 0.06, 0.1, mat("#ffcf2b"), 0, -0.16, 0));
      out.emit = [0, 0.12, 0];
      break;
    }
    case "fackel": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.07, 0.07, 0.3, mat("#c0392b"), 0, -0.07, 0, 14));
      g.add(zyl(0.072, 0.072, 0.04, mat("#f2f2f2"), 0, -0.1, 0, 14));
      const linse = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: "#ffd9c4", emissive: p.k?.farbe || "#ff5a2a", emissiveIntensity: 0, roughness: 0.3 }));
      linse.position.set(0, 0.1, 0);
      linse.userData.keinSchatten = true;
      g.add(linse);
      out.linse = linse;
      out.emit = [0, 0.14, 0];
      break;
    }
    case "stoersender": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.02, 0.03, 0.34, mat("#3b3f45", { metalness: 0.3, roughness: 0.5 }), 0, -0.05, 0, 10));
      for (const a of [0, 2.1, 4.2]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 5), mat("#9aa6b2"));
        arm.position.set(Math.cos(a) * 0.07, 0.04, Math.sin(a) * 0.07);
        arm.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        g.add(arm);
      }
      const linse = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 28), leuchte(p.k?.farbe || "#7dffb0", 0));
      linse.rotation.x = Math.PI / 2;
      linse.position.y = 0.1;
      linse.userData.keinSchatten = true;
      g.add(linse);
      out.linse = linse;
      out.emit = [0, 0.2, 0];
      break;
    }
    case "schild": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.13, 0.15, 0.16, mat("#2b2f36", { metalness: 0.3, roughness: 0.5 }), 0, -0.13, 0, 20));
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 24), leuchte(p.k?.farbe || "#4dd2ff", 1.4)));
      g.children[g.children.length - 1].rotation.x = Math.PI / 2;
      g.children[g.children.length - 1].position.y = 0.02;
      const blase = new THREE.Mesh(
        new THREE.SphereGeometry(1, 28, 16),
        new THREE.MeshBasicMaterial({ color: p.k?.farbe || "#4dd2ff", transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      blase.scale.setScalar(Math.max(0.5, Math.min(50, p.k?.reichweite ?? 3)));
      blase.visible = false;
      blase.userData.keinSchatten = true;
      blase.raycast = () => {};
      g.add(blase);
      out.linse = blase;
      out.emit = [0, 0.1, 0];
      break;
    }
    case "feuerloescher": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.1, 0.1, 0.3, mat("#d63031"), 0, -0.07, 0, 18));
      g.add(zyl(0.05, 0.07, 0.06, mat("#111418"), 0, 0.11, 0, 14));
      const schlauch = zyl(0.02, 0.02, 0.1, mat("#111418"), 0.08, 0.1, 0, 8);
      schlauch.rotation.z = Math.PI / 2;
      g.add(schlauch);
      out.emit = [0, 0.15, 0];
      break;
    }
    case "lidar": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.14, 0.16, 0.08, mat("#20252c", { metalness: 0.3, roughness: 0.5 }), 0, -0.16, 0, 24));
      const kopf = new THREE.Group();
      kopf.position.y = -0.04;
      kopf.add(zyl(0.05, 0.06, 0.14, mat("#15181d", { metalness: 0.4, roughness: 0.4 }), 0, 0, 0, 16));
      const schlitz = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.012), leuchte("#2fe6ff", 2));
      schlitz.position.set(0, 0.02, 0.058);
      schlitz.userData.keinSchatten = true;
      kopf.add(schlitz);
      const spiegel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.05), mat("#9aa6b2", { metalness: 0.6, roughness: 0.2 }));
      spiegel.position.set(0, 0.075, 0.02);
      spiegel.rotation.x = -0.6;
      kopf.add(spiegel);
      g.add(kopf);
      const kuppel = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: "#7fe8ff", transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, depthWrite: false })
      );
      kuppel.position.y = -0.12;
      kuppel.userData.keinSchatten = true;
      g.add(kuppel);
      out.emit = [0, 0.2, 0];
      out.sensor = {
        typ: "lidar",
        anim: (t, v) => {
          kopf.rotation.y = t * 9;
          schlitz.material.emissiveIntensity = 1.2 + 4 * v + 0.6 * Math.sin(t * 30);
        }
      };
      break;
    }
    case "radar": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.03, 0.045, 0.2, mat("#3b3f45", { metalness: 0.3, roughness: 0.5 }), 0, -0.12, 0, 12));
      const dreher = new THREE.Group();
      dreher.position.y = 0.04;
      const schuessel = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.4),
        new THREE.MeshStandardMaterial({ color: "#d9dee6", metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide })
      );
      schuessel.rotation.x = -Math.PI / 2 + 0.25;
      schuessel.position.set(0, 0.03, -0.05);
      dreher.add(schuessel);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), mat("#3b3f45"));
      arm.rotation.x = Math.PI / 2;
      arm.position.set(0, 0.04, 0.05);
      dreher.add(arm);
      const spitze = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), leuchte("#ff8a1f", 1));
      spitze.position.set(0, 0.04, 0.13);
      spitze.userData.keinSchatten = true;
      dreher.add(spitze);
      g.add(dreher);
      out.emit = [0, 0.2, 0];
      out.sensor = {
        typ: "radar",
        anim: (t, v) => {
          dreher.rotation.y = t * 2.2;
          spitze.material.emissiveIntensity = 0.5 + 3.5 * v * (0.6 + 0.4 * Math.sin(t * 12));
        }
      };
      break;
    }
    case "gyro": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.05, 0.08, 0.1, mat("#20252c", { metalness: 0.3, roughness: 0.5 }), 0, -0.17, 0, 18));
      const mitte = new THREE.Group();
      mitte.position.y = -0.02;
      const kern = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), leuchte("#9b6bff", 1.6));
      kern.userData.keinSchatten = true;
      mitte.add(kern);
      const ringe = [0.115, 0.145, 0.175].map((r, n) => {
        const ring = new THREE.Group();
        ring.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 8, 40), mat(["#c9ced6", "#b8a3ff", "#8fe3ff"][n], { metalness: 0.6, roughness: 0.25 })));
        mitte.add(ring);
        return ring;
      });
      g.add(mitte);
      out.emit = [0, 0.2, 0];
      out.sensor = {
        typ: "gyro",
        anim: (t, v) => {
          const s = 0.8 + 7 * v;
          ringe[0].rotation.x = t * s;
          ringe[1].rotation.y = t * s * 1.3;
          ringe[2].rotation.z = t * s * 1.7;
          kern.material.emissiveIntensity = 1.2 + 2 * v;
        }
      };
      break;
    }
    case "hoehe": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      g.add(zyl(0.16, 0.18, 0.05, mat("#1d2228", { metalness: 0.3, roughness: 0.5 }), 0, -0.17, 0, 28));
      const pings = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(
          new THREE.RingGeometry(0.12, 0.15, 40),
          new THREE.MeshBasicMaterial({ color: "#4dffb4", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        );
        m.rotation.x = -Math.PI / 2;
        m.position.y = -0.14;
        m.userData.keinSchatten = true;
        g.add(m);
        return m;
      });
      const punkt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16), leuchte("#4dffb4", 2));
      punkt.position.y = -0.14;
      punkt.userData.keinSchatten = true;
      g.add(punkt);
      out.emit = [0, 0.2, 0];
      out.sensor = {
        typ: "hoehe",
        anim: (t, v) => {
          const tempo = 0.5 + 2.2 * v;
          pings.forEach((m, n) => {
            const ph = (t * tempo + n / 3) % 1;
            m.scale.setScalar(0.25 + ph * 0.95);
            m.material.opacity = (1 - ph) * 0.85;
          });
        }
      };
      break;
    }
    case "kraft": {
      g.add(box(0.3, 0.05, 0.3, mat(DUNKEL), 0, -0.225));
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) g.add(zyl(0.012, 0.012, 0.1, mat("#9aa0a8", CHROM), sx * 0.09, -0.16, sz * 0.09, 6));
      const kristall = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), leuchte("#35f0a0", 1.6));
      kristall.scale.y = 1.55;
      kristall.userData.keinSchatten = true;
      g.add(kristall);
      const gruen = new THREE.Color("#35f0a0"), bernstein = new THREE.Color("#ffb347"), rot = new THREE.Color("#ff4a4a");
      out.emit = [0, 0.22, 0];
      out.sensor = {
        typ: "kraft",
        anim: (t, v) => {
          kristall.rotation.y = t * (0.8 + 4 * v);
          kristall.position.y = 0.0 + Math.sin(t * 2.2) * 0.012;
          const f = v < 0.5 ? gruen.clone().lerp(bernstein, v * 2) : bernstein.clone().lerp(rot, (v - 0.5) * 2);
          kristall.material.emissive.copy(f);
          kristall.material.emissiveIntensity = 1.4 + 2 * v + 0.3 * Math.sin(t * 6);
          kristall.scale.setScalar(1 + 0.12 * v);
          kristall.scale.y *= 1.55;
        }
      };
      break;
    }
    case "fallschirm": {
      g.add(box(0.36, 0.05, 0.36, mat(DUNKEL), 0, -0.22));
      g.add(box(0.34, 0.26, 0.3, farbe, 0, -0.06));
      out.emit = [0, 0.08, 0];
      break;
    }
    case "rad_lenk":
    case "rad_fest": {
      const r = radRadius(p);
      const orient = new THREE.Group();
      orient.quaternion.copy(orientQuat(p.o));
      const spin = new THREE.Group();
      orient.add(spin);
      orient.add(zyl(0.04, 0.04, 0.16, mat("#9aa0a8", CHROM), 0, -0.17));
      spin.add(zyl(r, r, 0.2, mat(REIFEN, { roughness: 0.95 }), 0, 0, 0, 28));
      spin.add(zyl(r * 0.62, r * 0.62, 0.205, farbe, 0, 0, 0, 24));
      const lenk = new THREE.Group();
      lenk.add(orient);
      g.add(lenk);
      out.rad = { lenk, spin, bock: false };
      break;
    }
    case "rad_bock": {
      const r = radRadius(p);
      const orient = new THREE.Group();
      orient.quaternion.copy(orientQuat(p.o));
      orient.add(box(0.26, 0.03, 0.26, mat(DUNKEL), 0, -0.235));
      const schwenk = new THREE.Group();
      orient.add(schwenk);
      const gabel = mat("#c9ced6", CHROM);
      schwenk.add(zyl(0.05, 0.05, 0.05, gabel, 0, -0.2));
      schwenk.add(box(0.03, 0.22, 0.08, gabel, 0.07, -0.08, 0));
      schwenk.add(box(0.03, 0.22, 0.08, gabel, -0.07, -0.08, 0));
      const spin = new THREE.Group();
      spin.rotation.z = Math.PI / 2;
      const dreh = new THREE.Group();
      spin.add(dreh);
      dreh.add(zyl(r, r, 0.08, mat("#30343a", { roughness: 0.9 }), 0, 0, 0, 22));
      dreh.add(zyl(r * 0.5, r * 0.5, 0.085, farbe, 0, 0, 0, 16));
      schwenk.add(spin);
      g.add(orient);
      out.rad = { schwenk, spin: dreh, bock: true };
      break;
    }
  }

  if (!TEILE[p.t].rad && !WUERFEL.has(p.t)) g.quaternion.copy(orientQuat(p.o));
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = !o.userData.keinSchatten;
      o.receiveShadow = true;
    }
  });
  if (out.kopf) {
    out.kopf.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }
  return out;
}

const KOERPER_FARBEN = ["#46b96b", "#2f9ee0", "#f5a524", "#e5484d", "#6e56cf", "#ffd43b", "#ff7ab6", "#38d6d6"];

export function fahrzeugGrafik(plan, opts = {}) {
  const ana = opts.ana || analysiere(plan);
  const groups = ana.bodies.map(() => new THREE.Group());
  const raeder = new Map();
  const emit = new Map();
  const teilObj = new Map();
  const sitze = [];
  const klappen = new Map();
  const lampen = new Map();
  const rotoren = new Map();
  const sensoren = new Map();
  const leitern = [];

  const kopfZiel = new Map();
  for (const gl of ana.gelenke) kopfZiel.set(gl.teil, gl.bodyB);

  const wuerfelZellen = new Set();
  for (const q of plan.parts) if (WUERFEL.has(q.t)) wuerfelZellen.add(`${q.x},${q.y},${q.z}`);
  const nachbarn = p => {
    if (!WUERFEL.has(p.t)) return null;
    const hat = (dx, dy, dz) => wuerfelZellen.has(`${p.x + dx},${p.y + dy},${p.z + dz}`);
    return [hat(1, 0, 0), hat(-1, 0, 0), hat(0, 1, 0), hat(0, -1, 0), hat(0, 0, 1), hat(0, 0, -1)];
  };

  const instGruppen = new Map();
  const undurchsichtig = new Set();
  for (const q of plan.parts) if (q.t === "block" || q.t === "panzer") undurchsichtig.add(`${q.x},${q.y},${q.z}`);
  const sicht = p => {
    const hat = (dx, dy, dz) => undurchsichtig.has(`${p.x + dx},${p.y + dy},${p.z + dz}`);
    return [hat(1, 0, 0), hat(-1, 0, 0), hat(0, 1, 0), hat(0, -1, 0), hat(0, 0, 1), hat(0, 0, -1)];
  };

  plan.parts.forEach((p, i) => {
    const bi = ana.bodyOf[i];
    const c = zellMitte(p);
    const u = ana.bodies[bi].ursprung;
    if (WUERFEL.has(p.t) && !opts.einzeln) {
      const pp = opts.koerperFarben ? { ...p, c: KOERPER_FARBEN[bi % KOERPER_FARBEN.length] } : p;
      const weg = p.t === "glas" ? null : sicht(p);
      const proxy = new THREE.Object3D();
      proxy.position.set(c[0] - u[0], c[1] - u[1], c[2] - u[2]);
      groups[bi].add(proxy);
      teilObj.set(i, proxy);
      if (weg && weg.every(Boolean)) return;
      const nb = nachbarn(p);
      const key = `${bi}|${p.t}|${bits(nb)}|${bits(weg)}`;
      if (!instGruppen.has(key)) instGruppen.set(key, { bi, t: p.t, nb, weg, liste: [] });
      instGruppen.get(key).liste.push({ i, proxy, farbe: p.t === "glas" ? (pp.c || "#1a1c20") : schachbrett(pp.c || "#1a1c20", pp, p.t === "panzer" ? -0.05 : 0) });
      return;
    }
    const m = teilModell(opts.koerperFarben ? { ...p, c: KOERPER_FARBEN[bi % KOERPER_FARBEN.length] } : p, nachbarn(p));
    m.obj.position.set(c[0] - u[0], c[1] - u[1], c[2] - u[2]);
    m.obj.traverse(o => { o.userData.teil = i; });
    groups[bi].add(m.obj);
    teilObj.set(i, m.obj);

    if (m.kopf) {
      const ziel = kopfZiel.has(i) ? kopfZiel.get(i) : bi;
      const u2 = ana.bodies[ziel].ursprung;
      m.kopf.position.set(c[0] - u2[0], c[1] - u2[1], c[2] - u2[2]);
      m.kopf.quaternion.copy(orientQuat(p.o));
      m.kopf.traverse(o => { o.userData.teil = i; });
      groups[ziel].add(m.kopf);
    }
    if (m.klappe) klappen.set(i, m.klappe);
    if (m.linse) lampen.set(i, m.linse);
    if (m.rotor) rotoren.set(i, m.rotor);
    if (m.sensor) sensoren.set(i, m.sensor);
    if (p.t === "leiter") leitern.push(m.obj);
    if (m.rad) raeder.set(i, { ...m.rad, obj: m.obj, basisY: m.obj.position.y });
    if (m.emit) emit.set(i, { body: bi, obj: m.obj, punkt: new THREE.Vector3(...m.emit) });
    if (p.t === "sitz") sitze.push({ index: i, body: bi, obj: m.obj });
  });

  const mtx = new THREE.Matrix4(), farbe = new THREE.Color();
  for (const gr of instGruppen.values()) {
    const im = new THREE.InstancedMesh(wuerfelGeo(gr.nb, gr.weg), instMat(gr.t), gr.liste.length);
    im.castShadow = true;
    im.receiveShadow = true;
    im.userData.teilVon = gr.liste.map(e => e.i);
    gr.liste.forEach((e, k) => {
      mtx.makeTranslation(e.proxy.position.x, e.proxy.position.y, e.proxy.position.z);
      im.setMatrixAt(k, mtx);
      im.setColorAt(k, farbe.set(e.farbe));
      e.proxy.userData.instanz = { mesh: im, idx: k };
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    groups[gr.bi].add(im);
  }

  return { ana, plan, groups, raeder, emit, sitz: sitze[0] || null, sitze, klappen, lampen, rotoren, sensoren, leitern, teilObj };
}

export function teilVonTreffer(h) {
  const v = h.object.userData.teilVon;
  return v ? v[h.instanceId] : h.object.userData.teil;
}

export function faerbeInstanz(proxy, faktor) {
  const ins = proxy.userData.instanz;
  if (!ins) return false;
  const c = new THREE.Color();
  ins.mesh.getColorAt(ins.idx, c);
  ins.mesh.setColorAt(ins.idx, c.multiplyScalar(faktor));
  ins.mesh.instanceColor.needsUpdate = true;
  return true;
}

export function trenneGrafik(grafik, t) {
  const g = new THREE.Group();
  let obj = grafik.teilObj.get(t.teil);
  const von = grafik.groups[t.von];
  if (!obj || !von) return g;
  const ins = obj.userData.instanz;
  if (ins) {
    const p = grafik.plan.parts[t.teil];
    ins.mesh.setMatrixAt(ins.idx, new THREE.Matrix4().makeScale(0, 0, 0));
    ins.mesh.instanceMatrix.needsUpdate = true;
    const echt = teilModell(p, null).obj;
    echt.position.copy(obj.position);
    echt.traverse(o => { o.userData.teil = t.teil; });
    obj.parent?.remove(obj);
    grafik.teilObj.set(t.teil, echt);
    obj = echt;
  }
  g.position.copy(obj.position).applyQuaternion(von.quaternion).add(von.position);
  g.quaternion.copy(von.quaternion);
  obj.position.set(0, 0, 0);
  g.add(obj);
  const e = grafik.emit.get(t.teil);
  if (e) e.body = t.index;
  return g;
}

export function setzeRaeder(grafik, zustand) {
  for (const z of zustand) {
    const r = grafik.raeder.get(z.teil);
    if (!r) continue;
    r.obj.position.y = r.basisY - z.feder;
    if (r.bock) {
      r.schwenk.rotation.y = z.lenk;
      r.spin.rotation.y = z.dreh;
    } else {
      r.lenk.rotation.y = z.lenk;
      r.spin.rotation.y = z.dreh;
    }
  }
}

export function schirmModell(flaeche, farbe) {
  const r = Math.sqrt(flaeche / Math.PI);
  const leine = r * 2.2;
  const offen = Math.PI * 0.42;
  const g = new THREE.Group();
  const kuppel = new THREE.Group();
  const bahnen = [
    new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.85, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.85, side: THREE.DoubleSide })
  ];
  for (let i = 0; i < 12; i++) {
    const bahn = new THREE.Mesh(
      new THREE.SphereGeometry(r, 4, 10, (i / 12) * Math.PI * 2, Math.PI / 6, 0, offen),
      bahnen[i % 2]
    );
    bahn.castShadow = true;
    kuppel.add(bahn);
  }
  kuppel.rotation.x = Math.PI / 2;
  kuppel.scale.set(1, 0.6, 1);
  kuppel.position.z = leine - r * Math.cos(offen) * 0.6;
  g.add(kuppel);
  const pts = [];
  const randR = r * Math.sin(offen);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push(0, 0, 0, Math.cos(a) * randR, Math.sin(a) * randR, leine);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: "#e8e8e8" })));
  return g;
}

export function geistModell(p, farbe) {
  const m = teilModell(p);
  const g = new THREE.Group();
  g.add(m.obj);
  if (m.kopf) {
    m.kopf.quaternion.copy(orientQuat(p.o));
    g.add(m.kopf);
  }
  const material = new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.45, depthWrite: false });
  g.traverse(o => {
    if (o.isMesh) {
      o.material = material;
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  g.userData.material = material;
  return g;
}

export function spielfigur(color, look) {
  const group = new THREE.Group();
  figurAktualisieren(group, color, look);
  return group;
}

export function figurAktualisieren(group, color) {
  for (const m of group.userData.eigeneStoffe || []) m.dispose();
  const eigeneStoffe = [];
  const neuerStoff = optionen => { const m = new THREE.MeshStandardMaterial(optionen); eigeneStoffe.push(m); return m; };
  for (const c of [...group.children]) {
    if (!c.userData.figurTeil) continue;
    group.remove(c);
    c.traverse(o => { if (o.isMesh && o.geometry && !o.userData.geteilt) o.geometry.dispose(); });
  }
  const clothes = neuerStoff({ color, roughness: 0.7 });
  const hose = neuerStoff({ color: new THREE.Color(color).multiplyScalar(0.62), roughness: 0.78 });
  const neutral = mat("#e8e4de", { roughness: 0.85 });
  const schuh = mat("#2a2f38", { roughness: 0.7 });

  const part = (geometry, material, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.userData.figurTeil = true;
    parent.add(mesh);
    return mesh;
  };

  part(new THREE.CapsuleGeometry(0.26, 0.42, 6, 16), clothes, 0, 0.9, 0);
  part(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), neutral, 0, 1.24, 0);
  part(new THREE.SphereGeometry(0.19, 24, 18), neutral, 0, 1.42, 0);

  const armGeo = new THREE.CapsuleGeometry(0.075, 0.32, 4, 10);
  const handGeo = new THREE.SphereGeometry(0.068, 12, 10);
  const leftArm = new THREE.Group(); leftArm.position.set(-0.33, 1.1, 0); group.add(leftArm);
  const rightArm = new THREE.Group(); rightArm.position.set(0.33, 1.1, 0); group.add(rightArm);
  for (const arm of [leftArm, rightArm]) {
    arm.userData.figurTeil = true;
    part(armGeo, clothes, 0, -0.2, 0, arm);
    part(handGeo, neutral, 0, -0.47, 0, arm);
  }

  const legGeo = new THREE.CapsuleGeometry(0.09, 0.3, 4, 10);
  const schuhGeo = new THREE.BoxGeometry(0.17, 0.08, 0.28);
  const leftLeg = new THREE.Group(); leftLeg.position.set(-0.14, 0.5, 0); group.add(leftLeg);
  const rightLeg = new THREE.Group(); rightLeg.position.set(0.14, 0.5, 0); group.add(rightLeg);
  for (const leg of [leftLeg, rightLeg]) {
    leg.userData.figurTeil = true;
    part(legGeo, hose, 0, -0.21, 0, leg);
    part(schuhGeo, schuh, 0, -0.47, -0.045, leg);
  }

  group.userData = { leftLeg, rightLeg, leftArm, rightArm, clothes, eigeneStoffe };
}

export function setzeSitzen(figur, sitzen) {
  const u = figur.userData;
  const bein = sitzen ? Math.PI / 2 : 0;
  u.leftLeg.rotation.x = bein;
  u.rightLeg.rotation.x = bein;
  u.leftArm.rotation.x = sitzen ? 1.0 : 0;
  u.rightArm.rotation.x = sitzen ? 1.0 : 0;
}

export function textSprite(text, { breite = 512, hoehe = 128, font = "bold 44px system-ui, sans-serif", bg = "rgba(8,14,24,0.82)", fg = "#fff", skala = 1.7 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = breite;
  canvas.height = hoehe;
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = bg;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 14, breite - 40, hoehe - 28, 28);
  else ctx.rect(20, 14, breite - 40, hoehe - 28);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, breite / 2, hoehe / 2, breite - 70);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(skala, skala * hoehe / breite, 1);
  sprite.renderOrder = 9;
  return sprite;
}

const animierteNamen = new Set();
function zeichneEffektName(ctx, text, tag, t, breite, hoehe) {
  ctx.clearRect(0, 0, breite, hoehe);
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(8,14,24,0.82)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 14, breite - 40, hoehe - 28, 28);
  else ctx.rect(20, 14, breite - 40, hoehe - 28);
  ctx.fill();
  const x = breite / 2, y = hoehe / 2, max = breite - 70;
  ctx.shadowBlur = 0;
  switch (tag) {
    case "gold": {
      const w = Math.min(max, ctx.measureText(text).width), v = ((t * 0.5) % 1) * (w * 2) - w;
      const g = ctx.createLinearGradient(x - w / 2 + v, 0, x + w / 2 + v, 0);
      g.addColorStop(0, "#a8741a"); g.addColorStop(0.35, "#ffe9a0"); g.addColorStop(0.5, "#fff6d0"); g.addColorStop(0.65, "#d4af37"); g.addColorStop(1, "#a8741a");
      ctx.fillStyle = g;
      break;
    }
    case "regenbogen": {
      const w = Math.min(max, ctx.measureText(text).width);
      const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${((i * 60) + t * 120) % 360}, 100%, 65%)`);
      ctx.fillStyle = g;
      break;
    }
    case "neon":
      ctx.fillStyle = "#fff";
      ctx.shadowColor = Math.sin(t * 2.2) > 0 ? "#ff2bd6" : "#2bd9ff";
      ctx.shadowBlur = 14 + 8 * Math.sin(t * 6);
      break;
    case "feuer": {
      const g = ctx.createLinearGradient(0, y - 24, 0, y + 24);
      g.addColorStop(0, "#fff3b0"); g.addColorStop(0.5, "#ffb02b"); g.addColorStop(1, "#ff3d00");
      ctx.fillStyle = g;
      ctx.shadowColor = "#ff5a00";
      ctx.shadowBlur = 10 + Math.random() * 8;
      break;
    }
    case "glitch": {
      if (Math.sin(t * 2.6) > 0.82 && Math.random() < 0.7) {
        ctx.fillStyle = "#ff2b4d"; ctx.fillText(text, x + 4 * (Math.random() - 0.5) * 2, y, max);
        ctx.fillStyle = "#2bd9ff"; ctx.fillText(text, x - 4 * (Math.random() - 0.5) * 2, y, max);
      }
      ctx.fillStyle = "#fff";
      break;
    }
    default: ctx.fillStyle = "#fff";
  }
  ctx.fillText(text, x, y, max);
  ctx.shadowBlur = 0;
}
export function namensSprite(text, tag, opts = {}) {
  const sprite = textSprite(text, opts);
  if (!["gold", "neon", "regenbogen", "feuer", "glitch"].includes(tag)) return sprite;
  const canvas = sprite.material.map.image;
  const ctx = canvas.getContext("2d");
  sprite.userData.anim = t => {
    zeichneEffektName(ctx, text, tag, t, canvas.width, canvas.height);
    sprite.material.map.needsUpdate = true;
  };
  sprite.userData.anim(0);
  animierteNamen.add(sprite);
  return sprite;
}
let namenLetzt = 0;
export function aktualisiereNamen(t) {
  if (t - namenLetzt < 0.066) return;
  namenLetzt = t;
  for (const s of animierteNamen) {
    if (!s.parent) { animierteNamen.delete(s); continue; }
    s.userData.anim(t);
  }
}

export function entsorge(obj) {
  obj.traverse(o => {
    if (o.isSprite) {
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
}
