import * as THREE from "three";
import { hoeheBei } from "./weltdaten.js";
import { WASSER_Y, MEERBODEN, WELT_HALB, WELT_MITTE, hafenDaten, meerRand } from "./meerdaten.js";
export { WASSER_Y, MEERBODEN, WELT_HALB, WELT_MITTE, hafenDaten, meerRand };


function hash(a, b) {
  let h = Math.imul(a + 1013, 0x9e3779b1) ^ Math.imul(b + 7919, 0x85ebca6b);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const INSEL_ZELLE = 2500;
const INSEL_ANZAHL = (2 * WELT_HALB) / INSEL_ZELLE;
const INSEL_CHANCE = 0.22;
const INSEL_SICHT = 4500;

export function baueMeer({ RAPIER, world, scene, box, schild, d, hafenName = "Hafen" }) {
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(WELT_HALB + 10000, 1, WELT_HALB + 10000).setTranslation(WELT_MITTE[0], MEERBODEN - 1, WELT_MITTE[1]).setFriction(0.9)
  );
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: "#b9a974", roughness: 1 }));
  boden.rotation.x = -Math.PI / 2;
  boden.position.y = MEERBODEN;
  scene.add(boden);

  const FLAECHE = 9000;
  const wasserMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      zeit: { value: 0 },
      sonne: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      flach: { value: new THREE.Color("#2f9bb8") },
      tief: { value: new THREE.Color("#0b3f6b") },
      himmelFarbe: { value: new THREE.Color("#a9d4ee") }
    }]),
    vertexShader: `
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float zeit;
      uniform vec3 sonne, flach, tief, himmelFarbe;
      varying vec3 vW;
      #include <common>
      #include <fog_pars_fragment>
      vec3 welle(vec2 p, vec2 k, float amp, float tempo) {
        float ph = dot(k, p) + zeit * tempo;
        return vec3(-amp * k.x * cos(ph), 0.0, -amp * k.y * cos(ph));
      }
      void main() {
        vec2 p = vW.xz;
        vec3 g = vec3(0.0);
        g += welle(p, vec2(0.11, 0.05), 0.55, 0.9);
        g += welle(p, vec2(-0.07, 0.15), 0.4, 1.3);
        g += welle(p, vec2(0.31, -0.22), 0.22, 1.9);
        g += welle(p, vec2(-0.5, -0.41), 0.12, 2.6);
        g += welle(p, vec2(0.93, 0.7), 0.05, 3.7);
        vec3 n = normalize(vec3(g.x, 1.0, g.z));
        vec3 v = normalize(cameraPosition - vW);
        if (v.y < 0.0) { n.y = -n.y; v.y = -v.y; }
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        float tiefe = clamp(length(cameraPosition - vW) / 900.0, 0.0, 1.0);
        vec3 grund = mix(flach, tief, 0.35 + 0.5 * tiefe);
        vec3 farbe = mix(grund, himmelFarbe, clamp(fres + 0.08, 0.0, 1.0));
        vec3 r = reflect(-sonne, n);
        float glanz = pow(max(dot(r, v), 0.0), 140.0);
        farbe += vec3(1.0, 0.95, 0.8) * glanz * 1.4;
        float schaum = smoothstep(0.62, 0.95, length(g.xz)) * 0.35;
        farbe = mix(farbe, vec3(0.92, 0.97, 1.0), schaum);
        gl_FragColor = vec4(farbe, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
  const wasser = new THREE.Mesh(new THREE.PlaneGeometry(FLAECHE, FLAECHE), wasserMat);
  wasser.rotation.x = -Math.PI / 2;
  wasser.position.y = WASSER_Y;
  wasser.frustumCulled = false;
  scene.add(wasser);

  const R_OBEN = 45, R_UNTEN = 60, HOEHE_OBEN = 1;
  const inselGeo = new THREE.CylinderGeometry(R_OBEN, R_UNTEN, HOEHE_OBEN - MEERBODEN, 32, 1);
  const inselMat = [
    new THREE.MeshStandardMaterial({ color: "#d9c58b", roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: "#5fa050", roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: "#d9c58b", roughness: 1 })
  ];
  const hullPunkte = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    hullPunkte.push(Math.cos(a) * R_OBEN, HOEHE_OBEN, Math.sin(a) * R_OBEN, Math.cos(a) * R_UNTEN, MEERBODEN, Math.sin(a) * R_UNTEN);
  }
  const hullDaten = new Float32Array(hullPunkte);
  const inseln = new Map();

  const inselPos = (ci, cj) => {
    if (hash(ci, cj) > INSEL_CHANCE) return null;
    const u = (ci + 0.15 + hash(ci + 91, cj) * 0.7) * INSEL_ZELLE;
    const v = (cj + 0.15 + hash(ci, cj + 57) * 0.7) * INSEL_ZELLE;
    return [WELT_MITTE[0] - WELT_HALB + u, WELT_MITTE[1] - WELT_HALB + v];
  };
  const festland = d ? Math.max(d.groesse / 2 + 200, 0) : 0;

  let letzteX = 1e9, letzteZ = 1e9;
  function pflegeInseln(cx, cz) {
    if (Math.hypot(cx - letzteX, cz - letzteZ) < 150) return;
    letzteX = cx; letzteZ = cz;
    const gewollt = new Map();
    for (let ci = 0; ci < INSEL_ANZAHL; ci++) {
      for (let cj = 0; cj < INSEL_ANZAHL; cj++) {
        const p = inselPos(ci, cj);
        if (!p) continue;
        for (const kx of [-1, 0, 1]) {
          for (const kz of [-1, 0, 1]) {
            const x = p[0] + kx * 2 * WELT_HALB, z = p[1] + kz * 2 * WELT_HALB;
            if (Math.hypot(x - cx, z - cz) > INSEL_SICHT) continue;
            if (Math.abs(x - WELT_MITTE[0]) < festland && Math.abs(z - WELT_MITTE[1]) < festland) continue;
            gewollt.set(`${ci}_${cj}_${kx}_${kz}`, [x, z]);
          }
        }
      }
    }
    for (const [k, e] of inseln) {
      if (gewollt.has(k)) continue;
      scene.remove(e.mesh);
      world.removeCollider(e.kol, true);
      inseln.delete(k);
    }
    for (const [k, [x, z]] of gewollt) {
      if (inseln.has(k)) continue;
      const mesh = new THREE.Mesh(inselGeo, inselMat);
      mesh.position.set(x, (HOEHE_OBEN + MEERBODEN) / 2, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
      const desc = RAPIER.ColliderDesc.convexHull(hullDaten);
      if (!desc) { scene.remove(mesh); continue; }
      const kol = world.createCollider(desc.setTranslation(x, 0, z).setFriction(0.9));
      inseln.set(k, { mesh, kol });
    }
  }

  const aktualisiere = (kamera, zeit) => {
    const cx = kamera.position.x, cz = kamera.position.z;
    wasser.position.x = boden.position.x = cx;
    wasser.position.z = boden.position.z = cz;
    wasserMat.uniforms.zeit.value = zeit / 1000;
    pflegeInseln(cx, cz);
  };

  const wrapVerschiebung = (x, z) => {
    let dx = 0, dz = 0;
    if (x > WELT_MITTE[0] + WELT_HALB) dx = -2 * WELT_HALB;
    else if (x < WELT_MITTE[0] - WELT_HALB) dx = 2 * WELT_HALB;
    if (z > WELT_MITTE[1] + WELT_HALB) dz = -2 * WELT_HALB;
    else if (z < WELT_MITTE[1] - WELT_HALB) dz = 2 * WELT_HALB;
    return dx || dz ? [dx, dz] : null;
  };

  if (d) baueHafen({ d, scene, box, schild, hafenName });
  const nachHimmel = (kamera, sz, sonnenRichtung) => {
    if (sonnenRichtung) wasserMat.uniforms.sonne.value.copy(sonnenRichtung).normalize();
    wasserMat.uniforms.himmelFarbe.value.copy(sz.fog.color);
    if (kamera.position.y >= WASSER_Y) return;
    sz.fog.color.set("#0e4d7d");
    sz.fog.near = 1;
    sz.fog.far = 70;
  };

  return { aktualisiere, nachHimmel, wrapVerschiebung, inselAnzahl: () => inseln.size };
}

function baueHafen({ d, scene, box, schild, hafenName }) {
  const hf = hafenDaten(d);
  const laenge = hf.kaiBis - hf.kaiVon;
  const platte = new THREE.Mesh(
    new THREE.PlaneGeometry(hf.breite * 2, laenge),
    new THREE.MeshStandardMaterial({ color: "#9a9fa5", roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
  );
  platte.rotation.x = -Math.PI / 2;
  platte.position.set(hf.x, 0.03, (hf.kaiVon + hf.kaiBis) / 2);
  platte.receiveShadow = true;
  scene.add(platte);

  for (const sx of [-1, 1]) {
    const x = hf.x + sx * 95;
    box(new THREE.Vector3(x, -0.25, hf.kaiBis + 44), [3, 0.25, 50], null, "#8a7a63");
    for (let z = hf.kaiBis + 10; z <= hf.kaiBis + 90; z += 20) {
      for (const px of [-2.6, 2.6]) {
        const pfahl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 20, 8), new THREE.MeshStandardMaterial({ color: "#5d5143", roughness: 1 }));
        pfahl.position.set(x + px, -10, z);
        scene.add(pfahl);
      }
    }
  }
  for (let x = hf.x - 130; x <= hf.x + 130; x += 20) {
    const poller = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.7, 10), new THREE.MeshStandardMaterial({ color: "#2d3138", roughness: 0.7 }));
    poller.position.set(x, 0.38, hf.kaiBis - 3);
    scene.add(poller);
  }
  const tafel = schild?.(hafenName, { skala: 12, bg: "rgba(20,60,160,0.92)" });
  if (tafel) { tafel.position.set(hf.x, 9, hf.kaiBis - 20); scene.add(tafel); }
}

export function hafenStart(d, nummer) {
  const hf = hafenDaten(d);
  return { x: hf.x + (((nummer % 7) + 7) % 7 - 3) * 18, z: hf.rampeEnde + 80 };
}
