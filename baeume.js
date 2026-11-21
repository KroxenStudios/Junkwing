import * as THREE from "three";

// baumarten: art 0 steht in karten ohne viertes feld. kegel/kugel-kronen halten die dreieckszahl niedrig (handy)
export const BAUM_ARTEN = [
  { id: "fichte", de: "Fichte", en: "Spruce" },
  { id: "laub", de: "Laubbaum", en: "Broadleaf" },
  { id: "birke", de: "Birke", en: "Birch" },
  { id: "kiefer", de: "Kiefer", en: "Pine" },
  { id: "pappel", de: "Pappel", en: "Poplar" },
  { id: "eiche", de: "Eiche", en: "Oak" }
];

const kegel = new THREE.ConeGeometry(1, 2.4, 7);
const kugel = new THREE.IcosahedronGeometry(1, 1);
const stammGeo = new THREE.CylinderGeometry(0.15, 0.2, 1, 6);

// je art: krone (geometrie), kh = hoehe der kronenmitte (x groesse), ks = kronenmasse (x groesse),
// sh/sw = stammhoehe und -breite (x groesse), farben der krone, stamm = stammfarbe
const FORM = [
  { geo: kegel, kh: 1.05, ks: [0.7, 0.7, 0.7], sh: 0.5, sw: 0.45, stamm: "#6b4a2d", farben: ["#2f8f4e", "#3aa35a", "#2a7d46", "#4a9a40"] },
  { geo: kugel, kh: 1.15, ks: [0.72, 0.6, 0.72], sh: 0.7, sw: 0.5, stamm: "#6b4a2d", farben: ["#4f9a3c", "#5fae46", "#3f8a3a", "#6aa84a"] },
  { geo: kugel, kh: 1.25, ks: [0.42, 0.6, 0.42], sh: 0.85, sw: 0.32, stamm: "#e6e2d6", farben: ["#8fc255", "#9ccf62", "#7fb34a", "#a5d46e"] },
  { geo: kugel, kh: 1.28, ks: [0.8, 0.28, 0.8], sh: 0.9, sw: 0.34, stamm: "#8a5a38", farben: ["#3b7a45", "#46864c", "#33693d", "#4a8f50"] },
  { geo: kugel, kh: 1.3, ks: [0.3, 0.95, 0.3], sh: 0.45, sw: 0.3, stamm: "#7d6a4f", farben: ["#6fae3f", "#7cbb48", "#5f9c36", "#87c350"] },
  { geo: kugel, kh: 1.05, ks: [0.95, 0.65, 0.95], sh: 0.55, sw: 0.7, stamm: "#5e4128", farben: ["#3f7f33", "#4a8c3a", "#356f2c", "#58983f"] }
];

// baut die baeume als instanzen in gruppe. liste: [x, z, groesse, art?]; hoehe(x, z) = gelaendehoehe.
// rueckgabe: die erzeugten instanz-netze; mesh.userData.indizes[instanzNr] = platz in liste (fuer die auswahl im editor)
export function baueBaeume(liste, hoehe, gruppe, daten = {}) {
  const nachArt = FORM.map(() => []);
  liste.forEach((b, i) => nachArt[Math.min(FORM.length - 1, Math.max(0, b[3] | 0))].push(i));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), farbe = new THREE.Color();
  const erzeugt = [];
  nachArt.forEach((indizes, art) => {
    if (!indizes.length) return;
    const f = FORM[art];
    const kronen = new THREE.InstancedMesh(f.geo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: art !== 0 }), indizes.length);
    const staemme = new THREE.InstancedMesh(stammGeo, new THREE.MeshStandardMaterial({ color: f.stamm, roughness: 1 }), indizes.length);
    indizes.forEach((i, k) => {
      const [x, z, s] = liste[i];
      const y = hoehe(x, z);
      m4.compose(new THREE.Vector3(x, y + s * f.sh * 0.5, z), q, new THREE.Vector3(s * f.sw, s * f.sh, s * f.sw));
      staemme.setMatrixAt(k, m4);
      m4.compose(new THREE.Vector3(x, y + s * f.kh, z), q, new THREE.Vector3(s * f.ks[0], s * f.ks[1], s * f.ks[2]));
      kronen.setMatrixAt(k, m4);
      kronen.setColorAt(k, farbe.set(f.farben[i % f.farben.length]));
    });
    for (const m of [kronen, staemme]) {
      m.frustumCulled = false;
      m.userData = { ...daten, indizes };
      gruppe.add(m);
      erzeugt.push(m);
    }
  });
  return erzeugt;
}
