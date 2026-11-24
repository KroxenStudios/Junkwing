import * as THREE from "three";
import { DEKO } from "./dekodaten.js";
import { BAUM_ARTEN } from "./baeume.js";
import * as W from "./weltplatz.js";

// welt-editor (nur für das konto kroxenstudios): grundstücke und assets in der echten welt setzen. es gibt keine eigene szene: der editor
// fliegt mit einer dev-kamera durch die welt des spiels (scene, camera) und zeichnet nur seine hilfen dazu. gespeichert wird auf dem
// konten-server (weltplatz.js, geprüft wie überall); danach lädt das spiel neu, weil das gelände unter den grundstücken eingeebnet wird.
// steuerung: rechte maustaste halten und ziehen = umsehen · WASD = fliegen · Q/E = runter/hoch · Umschalt = schnell · Mausrad = tempo

const L = (de, en) => (window.WG ? WG.L(de, en) : de);
const el = (tag, props = {}, ...kinder) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "style") e.style.cssText = v;
    else e[k] = v;
  }
  e.append(...kinder);
  return e;
};

const css = `
#we { position: fixed; inset: 0; z-index: 40; pointer-events: none; font: 13px system-ui, sans-serif; color: #fff; }
#we[hidden] { display: none; }
#we .glas { pointer-events: auto; position: absolute; background: rgba(20,24,32,0.82); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px; backdrop-filter: blur(8px); display: grid; gap: 6px; }
#we .links { left: 10px; top: 10px; width: 210px; }
#we .rechts { right: 10px; top: 10px; width: 250px; max-height: calc(100vh - 80px); overflow: auto; }
#we .status { left: 50%; transform: translateX(-50%); bottom: 12px; padding: 6px 12px; pointer-events: none; }
#we button { font: inherit; color: #fff; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; padding: 5px 8px; cursor: pointer; text-align: left; }
#we button.an { background: #2f6fe0; border-color: #6aa0ff; }
#we button.primaer { background: #1f9d55; border-color: #4ad08a; }
#we label { display: grid; gap: 2px; } #we label b { font-weight: 600; opacity: 0.8; font-size: 12px; }
#we h3 { margin: 4px 0 0; font-size: 12px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.06em; }
#we .hilfe { opacity: 0.7; font-size: 12px; }
#we .dekoWahl { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; } #we .dekoWahl button { padding: 3px 6px; font-size: 12px; }
body.welteditor #game > :not(#scene) { display: none !important; }
body.welteditor #hauptmenue, body.welteditor #menueTint, body.welteditor #invRad, body.welteditor .hausKnopf, body.welteditor #hausWahl, body.welteditor #anmeldeFrage { display: none !important; }
`;

export function erzeugeWeltEditor({ scene, camera, renderer, schnittstelle }) {
  const stil = document.createElement("style");
  stil.textContent = css;
  document.head.append(stil);
  const wurzel = el("div", { id: "we", hidden: true });
  const links = el("div", { class: "glas links" }), rechts = el("div", { class: "glas rechts" }), status = el("div", { class: "glas status" });
  wurzel.append(links, rechts, status);
  document.body.append(wurzel);

  let offen = false, welt = W.leereWelt(), geaendert = false;
  let werkzeug = "platz", auswahl = null, verschieben = false;
  let platzB = 48, platzT = 72, assetK = "deko", assetT = 0, assetS = 1, assetR = 0;
  const cam = { x: 0, y: 40, z: 0, yaw: 0, pitch: -0.5, tempo: 40 };
  const tasten = new Set();
  const hilfen = new THREE.Group();
  const raycaster = new THREE.Raycaster();
  let ziehen = null, hit = null, assetGruppe = null;
  const meldung = (t, fehler = false) => { status.textContent = t; status.style.color = fehler ? "#ff8a8a" : "#fff"; };
  const klammer = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ---------------------------------------------------------------------------
  // hilfen in der welt: grundstücksrahmen, vorschau
  // ---------------------------------------------------------------------------
  const linie = new THREE.LineBasicMaterial({ color: "#ffd24a", depthTest: false });
  const linieAus = new THREE.LineBasicMaterial({ color: "#4ad0ff", depthTest: false });
  function rahmen(p, material) {
    const y = (p.y ?? schnittstelle.hoehe(p.x, p.z)) + 0.4;
    const pts = [];
    const x0 = p.x - p.b / 2, x1 = p.x + p.b / 2, z0 = p.z - p.t / 2, z1 = p.z + p.t / 2;
    const seg = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 4); for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; pts.push(new THREE.Vector3(ax + (bx - ax) * t0, schnittstelle.hoehe(ax + (bx - ax) * t0, az + (bz - az) * t0) + 0.4, az + (bz - az) * t0), new THREE.Vector3(ax + (bx - ax) * t1, schnittstelle.hoehe(ax + (bx - ax) * t1, az + (bz - az) * t1) + 0.4, az + (bz - az) * t1)); } };
    seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
    const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), material);
    l.renderOrder = 10;
    // mast mit der nummer: ein hoher strich in der mitte der vorderkante (die vorderseite zeigt nach +z)
    const m = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, y, z1), new THREE.Vector3(p.x, y + 8, z1), new THREE.Vector3(p.x, y, p.z), new THREE.Vector3(p.x, y + 3, p.z)]), material);
    m.renderOrder = 10;
    return [l, m];
  }
  function baueHilfen() {
    for (const k of [...hilfen.children]) { hilfen.remove(k); k.geometry?.dispose(); }
    welt.plaetze.forEach((p, i) => hilfen.add(...rahmen(p, auswahl?.art === "platz" && auswahl.i === i ? linie : linieAus)));
    welt.assets.forEach((a, i) => {
      const y = a.y ?? schnittstelle.hoehe(a.x, a.z);
      const sel = auswahl?.art === "asset" && auswahl.i === i;
      const m = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x, y, a.z), new THREE.Vector3(a.x, y + 6 * Math.max(1, a.s), a.z)]), sel ? linie : linieAus);
      m.renderOrder = 10;
      hilfen.add(m);
    });
    if (hit && werkzeug === "platz" && !auswahl) for (const k of rahmen({ x: hit.x, z: hit.z, b: platzB, t: platzT }, linie)) { k.userData.geist = true; hilfen.add(k); }
  }
  function baueAssets() {
    if (assetGruppe) { scene.remove(assetGruppe); assetGruppe.traverse(o => o.geometry && !o.geometry.userData?.geteilt && o.geometry.dispose?.()); }
    assetGruppe = schnittstelle.baueAssets(welt.assets);
  }

  // ---------------------------------------------------------------------------
  // zeiger: strahl auf das gelände
  // ---------------------------------------------------------------------------
  function strahl(ev) {
    raycaster.setFromCamera({ x: (ev.clientX / innerWidth) * 2 - 1, y: -(ev.clientY / innerHeight) * 2 + 1 }, camera);
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    let t = 0, letzt = 0, schritt = 1;
    for (let i = 0; i < 4000 && t < 6000; i++) {
      const p = o.clone().addScaledVector(d, t);
      if (p.y <= schnittstelle.hoehe(p.x, p.z)) {
        let lo = letzt, hi = t;   // bisektion zwischen dem letzten punkt darüber und dem ersten darunter
        for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2, q = o.clone().addScaledVector(d, mid); if (q.y <= schnittstelle.hoehe(q.x, q.z)) hi = mid; else lo = mid; }
        const q = o.clone().addScaledVector(d, hi);
        return { x: q.x, y: q.y, z: q.z };
      }
      letzt = t;
      t += schritt;
      schritt = Math.min(20, schritt * 1.03 + 0.05);
    }
    return null;
  }
  const inPlatz = (p, x, z) => Math.abs(x - p.x) <= p.b / 2 && Math.abs(z - p.z) <= p.t / 2;
  function waehleBei(h) {
    let best = null, bd = 1e9;
    welt.assets.forEach((a, i) => { const d = Math.hypot(a.x - h.x, a.z - h.z); if (d < Math.max(2.5, 2.5 * a.s) && d < bd) { bd = d; best = { art: "asset", i }; } });
    if (best) return best;
    const i = welt.plaetze.findIndex(p => inPlatz(p, h.x, h.z));
    return i >= 0 ? { art: "platz", i } : null;
  }
  function klick(ev) {
    const h = strahl(ev);
    if (!h) return;
    if (verschieben && auswahl) {
      const e = auswahl.art === "platz" ? welt.plaetze[auswahl.i] : welt.assets[auswahl.i];
      e.x = Math.round(h.x * 10) / 10; e.z = Math.round(h.z * 10) / 10;
      if (auswahl.art === "platz") delete e.y;
      verschieben = false;
      geaendert = true;
      baueAssets(); baueHilfen(); baueRechts();
      return;
    }
    if (werkzeug === "platz") {
      const gewaehlt = waehleBei(h);
      if (gewaehlt?.art === "platz") { auswahl = gewaehlt; baueHilfen(); baueRechts(); return; }
      const id = W.freieId(welt);
      if (id < 0) return meldung(L("Alle 40 Grundstücke sind vergeben.", "All 40 plots are used."), true);
      welt.plaetze.push({ id, x: Math.round(h.x * 10) / 10, z: Math.round(h.z * 10) / 10, b: platzB, t: platzT });
      welt.plaetze.sort((a, b) => a.id - b.id);
      auswahl = { art: "platz", i: welt.plaetze.findIndex(p => p.id === id) };
      geaendert = true;
    } else if (werkzeug === "asset") {
      if (welt.assets.length >= W.GRENZEN.assets) return meldung(L("Zu viele Assets.", "Too many assets."), true);
      welt.assets.push({ k: assetK, t: assetT, x: Math.round(h.x * 10) / 10, z: Math.round(h.z * 10) / 10, y: null, r: assetR, s: assetS });
      auswahl = { art: "asset", i: welt.assets.length - 1 };
      geaendert = true;
      baueAssets();
    } else {
      auswahl = waehleBei(h);
    }
    baueHilfen();
    baueRechts();
  }
  function loesche() {
    if (!auswahl) return;
    (auswahl.art === "platz" ? welt.plaetze : welt.assets).splice(auswahl.i, 1);
    auswahl = null; geaendert = true;
    baueAssets(); baueHilfen(); baueRechts();
  }

  // ---------------------------------------------------------------------------
  // oberfläche
  // ---------------------------------------------------------------------------
  const knoepfe = new Map();
  for (const [id, de, en] of [["platz", "Grundstück setzen", "Place plot"], ["asset", "Asset setzen", "Place asset"], ["waehlen", "Auswählen", "Select"]]) {
    const b = el("button", { type: "button", onclick: () => waehle(id) }, L(de, en));
    knoepfe.set(id, b);
    links.append(b);
  }
  function waehle(w) { werkzeug = w; verschieben = false; if (w !== "waehlen") auswahl = null; for (const [id, b] of knoepfe) b.classList.toggle("an", id === w); baueHilfen(); baueRechts(); }
  links.append(
    el("h3", {}, L("Welt", "World")),
    el("div", { class: "hilfe" }, L("Rechte Maustaste halten: umsehen · WASD fliegen · Q/E runter/hoch · Umschalt schnell · Rad: Tempo", "Hold right mouse: look · WASD fly · Q/E down/up · Shift fast · wheel: speed")),
    el("button", { type: "button", class: "primaer", onclick: () => speichern() }, L("Speichern (Server)", "Save (server)")),
    el("button", { type: "button", onclick: () => schliesse(true) }, "← " + L("Hauptmenü", "Main menu")));

  function schieber(text, wert, lo, hi, schritt, bei) {
    const aus = el("b", {}, `${text}: ${wert}`);
    const f = el("input", { type: "range", min: lo, max: hi, step: schritt, value: wert });
    f.addEventListener("input", () => { aus.textContent = `${text}: ${f.value}`; bei(Number(f.value)); });
    return el("label", {}, aus, f);
  }
  function assetWahl() {
    const liste = assetK === "deko" ? DEKO : BAUM_ARTEN;
    return el("div", { class: "dekoWahl" }, ...liste.map((d, i) => el("button", { type: "button", class: i === assetT ? "an" : "", onclick: () => { assetT = i; baueRechts(); } }, L(d.de, d.en))));
  }
  function baueRechts() {
    rechts.replaceChildren();
    if (werkzeug === "platz") rechts.append(el("h3", {}, L("Grundstück", "Plot")),
      schieber(L("Breite (m)", "Width (m)"), platzB, W.GRENZEN.b[0], W.GRENZEN.b[1], 2, v => { platzB = v; baueHilfen(); }),
      schieber(L("Tiefe (m)", "Depth (m)"), platzT, W.GRENZEN.t[0], W.GRENZEN.t[1], 2, v => { platzT = v; baueHilfen(); }),
      el("div", { class: "hilfe" }, L("Klicken setzt ein Grundstück (Mitte = Hausmitte, die Vorderseite zeigt nach +z, davor liegt der Parkplatz). Auf ein vorhandenes klicken wählt es. Das Gelände wird nach dem Speichern darunter eingeebnet; Keller bekommen dort eine Grube.", "Click places a plot (centre = house centre, the front faces +z, the parking lot lies in front). Clicking an existing one selects it. The terrain is levelled under it after saving; basements get a pit there.")));
    if (werkzeug === "asset") rechts.append(el("h3", {}, L("Asset", "Asset")),
      el("div", { class: "dekoWahl" }, el("button", { type: "button", class: assetK === "deko" ? "an" : "", onclick: () => { assetK = "deko"; assetT = 0; baueRechts(); } }, L("Objekte", "Objects")), el("button", { type: "button", class: assetK === "baum" ? "an" : "", onclick: () => { assetK = "baum"; assetT = 0; baueRechts(); } }, L("Bäume", "Trees"))),
      assetWahl(),
      schieber(L("Größe", "Size"), assetS, W.GRENZEN.groesse[0], 4, 0.05, v => { assetS = v; }),
      schieber(L("Drehung (°)", "Rotation (°)"), assetR, 0, 359, 5, v => { assetR = v; }));
    if (auswahl) {
      const e = auswahl.art === "platz" ? welt.plaetze[auswahl.i] : welt.assets[auswahl.i];
      if (!e) { auswahl = null; return; }
      rechts.append(el("h3", {}, L("Auswahl", "Selection")),
        el("div", { class: "hilfe" }, auswahl.art === "platz" ? `${L("Grundstück", "Plot")} P${e.id + 1} · ${e.b} × ${e.t} m · (${e.x}, ${e.z})` : `${e.k} #${e.t} · (${e.x}, ${e.z})`),
        el("button", { type: "button", class: verschieben ? "an" : "", onclick: () => { verschieben = !verschieben; baueRechts(); meldung(verschieben ? L("Auf die neue Stelle klicken", "Click the new spot") : ""); } }, L("Verschieben", "Move")),
        auswahl.art === "platz"
          ? el("div", {}, schieber(L("Breite (m)", "Width (m)"), e.b, W.GRENZEN.b[0], W.GRENZEN.b[1], 2, v => { e.b = v; geaendert = true; baueHilfen(); }), schieber(L("Tiefe (m)", "Depth (m)"), e.t, W.GRENZEN.t[0], W.GRENZEN.t[1], 2, v => { e.t = v; geaendert = true; baueHilfen(); }))
          : el("div", {}, schieber(L("Größe", "Size"), e.s, W.GRENZEN.groesse[0], 4, 0.05, v => { e.s = v; geaendert = true; baueAssets(); }), schieber(L("Drehung (°)", "Rotation (°)"), e.r, 0, 359, 5, v => { e.r = v; geaendert = true; baueAssets(); })),
        el("button", { type: "button", onclick: () => loesche() }, L("Löschen (Entf)", "Delete (Del)")));
    }
  }

  async function speichern() {
    meldung(L("Speichere …", "Saving …"));
    try {
      const sauber = W.bereinigeWelt(welt);
      if (!sauber) return meldung(L("Die Welt ist ungültig.", "The world is invalid."), true);
      await schnittstelle.speichern(sauber);
      geaendert = false;
      meldung(L("Gespeichert. Das Spiel lädt neu …", "Saved. The game reloads …"));
      setTimeout(() => location.reload(), 900);
    } catch (e) { meldung(L("Speichern fehlgeschlagen: ", "Saving failed: ") + (e?.message || e), true); }
  }

  // ---------------------------------------------------------------------------
  // eingabe und kamera
  // ---------------------------------------------------------------------------
  const flaeche = renderer.domElement;
  const imFeld = t => !!(t && t.closest && t.closest("input, textarea, select"));
  function ptrDown(ev) {
    if (!offen || ev.target !== flaeche) return;
    if (ev.button === 2) { ziehen = { x: ev.clientX, y: ev.clientY }; flaeche.setPointerCapture(ev.pointerId); return; }
    if (ev.button === 0) klick(ev);
  }
  function ptrMove(ev) {
    if (!offen) return;
    if (ziehen) {
      cam.yaw -= (ev.clientX - ziehen.x) * 0.004;
      cam.pitch = klammer(cam.pitch - (ev.clientY - ziehen.y) * 0.004, -1.55, 1.55);
      ziehen.x = ev.clientX; ziehen.y = ev.clientY;
      return;
    }
    if (ev.target === flaeche && werkzeug === "platz" && !auswahl) { hit = strahl(ev); baueHilfen(); }
  }
  function ptrUp() { ziehen = null; }
  function rad(ev) { if (offen && ev.target === flaeche) { ev.preventDefault(); cam.tempo = klammer(cam.tempo * (ev.deltaY > 0 ? 0.85 : 1.18), 3, 600); meldung(`${L("Tempo", "Speed")}: ${Math.round(cam.tempo)} m/s`); } }
  function taste(ev) {
    if (!offen || imFeld(ev.target)) return;
    const k = ev.key.toLowerCase();
    if (ev.type === "keyup") { tasten.delete(k); return; }
    ev.stopImmediatePropagation();
    if (k === "escape") { if (verschieben || auswahl) { verschieben = false; auswahl = null; baueHilfen(); baueRechts(); } else schliesse(true); return; }
    if (k === "delete" || k === "backspace") { loesche(); return; }
    tasten.add(k);
  }
  flaeche.addEventListener("contextmenu", e => { if (offen) e.preventDefault(); });
  addEventListener("pointerdown", ptrDown);
  addEventListener("pointermove", ptrMove);
  addEventListener("pointerup", ptrUp);
  addEventListener("wheel", rad, { passive: false });
  addEventListener("keydown", taste, true);
  addEventListener("keyup", taste, true);

  function frame(dt) {
    const schnell = tasten.has("shift") ? 5 : 1, v = cam.tempo * schnell * dt;
    let fw = (tasten.has("w") ? 1 : 0) - (tasten.has("s") ? 1 : 0), sd = (tasten.has("d") ? 1 : 0) - (tasten.has("a") ? 1 : 0), hoch = (tasten.has("e") ? 1 : 0) - (tasten.has("q") ? 1 : 0);
    const cp = Math.cos(cam.pitch);
    cam.x += (-Math.sin(cam.yaw) * cp * fw + Math.cos(cam.yaw) * sd) * v;
    cam.z += (-Math.cos(cam.yaw) * cp * fw - Math.sin(cam.yaw) * sd) * v;
    cam.y += (Math.sin(cam.pitch) * fw + hoch) * v;
    cam.y = Math.max(cam.y, schnittstelle.hoehe(cam.x, cam.z) + 1);
    camera.position.set(cam.x, cam.y, cam.z);
    camera.rotation.set(cam.pitch, cam.yaw, 0, "YXZ");
    camera.updateMatrixWorld();
  }

  function oeffne(w) {
    welt = W.bereinigeWelt(w) || W.leereWelt();
    auswahl = null; verschieben = false; geaendert = false; hit = null;
    const start = schnittstelle.start();
    cam.x = start.x; cam.z = start.z; cam.y = start.y + 60; cam.yaw = 0; cam.pitch = -0.6;
    offen = true;
    wurzel.hidden = false;
    document.body.classList.add("welteditor");
    scene.add(hilfen);
    baueAssets();
    waehle("platz");
    meldung(L("Welt-Editor: Klick setzt das gewählte Ding.", "World editor: click places the selected item."));
  }
  function schliesse(zumMenue = false) {
    if (zumMenue && geaendert && !confirm(L("Ungespeicherte Änderungen verwerfen?", "Discard unsaved changes?"))) return;
    offen = false;
    wurzel.hidden = true;
    document.body.classList.remove("welteditor");
    scene.remove(hilfen);
    tasten.clear();
    if (zumMenue) { if (geaendert) location.reload(); else schnittstelle.hauptmenue?.(); }
  }

  return { oeffne, frame, aktiv: () => offen, schliesse: () => schliesse(false) };
}
