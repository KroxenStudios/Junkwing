// hausauswahl: ein glasartiger dialog mit einer karte je hausvariante (name, größe, räume, grundriss von oben). die wahl gilt für das
// eigene haus; der server baut es um (die truhe bleibt). der grundriss entsteht aus den wänden der variante.

const el = (tag, props = {}, ...kinder) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e[k] = v;
  }
  e.append(...kinder);
  return e;
};

// varianten: Array der haus-definitionen (haus.js: VARIANTEN); aktuell(): index der gewählten variante (-1 = keine); waehle(index)
// eigenes(): das dokument des selbstgebauten hauses oder null; eigenIndex: die nummer, mit der waehle() es meldet; editor(): öffnet den haus-editor
// plaetze(): [{ lot, b, t, frei, meins }] (leer = nur die feste reihe, keine wahl); waehleLot(lot): zieht das haus auf ein freies grundstück
// presets(): Promise mit [{ name, doc }] aus dem ordner haeuser/ des spiels; waehlePreset(doc): stellt das preset als eigenes haus ein
export function erzeugeHausWahl({ L, varianten, aktuell, waehle, en = () => false, eigenes = () => null, eigenIndex = 100, editor = null, defAusDoc = null, plaetze = () => [], waehleLot = () => {}, presets = null, waehlePreset = () => {} }) {
  let presetListe = null;
  const wurzel = el("div", { id: "hausWahl", hidden: true, role: "dialog", "aria-label": L("Haus wählen", "Choose house") });
  document.body.append(wurzel);

  // grundriss: wände von oben (nur teile, die bis zum boden reichen und höher als 0,3 m sind, also ohne schwellen und stürze)
  function grundriss(def) {
    const c = el("canvas", { width: 156, height: 120 });
    const g = c.getContext?.("2d");
    if (!g) return c;
    const sk = Math.min(148 / (def.b + 0.4), 112 / (def.t + 0.4));
    const ox = 78, oz = 60;
    g.fillStyle = "rgba(255,255,255,0.10)";
    g.fillRect(ox - (def.b / 2) * sk, oz - (def.t / 2) * sk, def.b * sk, def.t * sk);
    g.fillStyle = "rgba(255,255,255,0.85)";
    for (const [mx, my, mz, sx, sy, sz] of def.boxen) {
      if (sy < 0.3 || my - sy / 2 > 0.1 || my > def.h) continue;
      g.fillRect(ox + (mx - sx / 2) * sk, oz + (mz - sz / 2) * sk, Math.max(1.5, sx * sk), Math.max(1.5, sz * sk));
    }
    g.fillStyle = "#ffd24a";   // die haustür unten
    const tuer = def.bloecke.find(b => b[0] === "tuer");
    if (tuer) g.fillRect(ox + (tuer[1] - 0.5) * sk, oz + (def.t / 2) * sk - 1.5, sk, 3);
    return c;
  }

  function zeichne() {
    const jetzt = aktuell();
    wurzel.replaceChildren(
      el("div", { class: "hwHinten", onclick: () => zu() }),
      el("div", { class: "hwKasten" },
        el("h2", {}, L("Dein Haus", "Your house")),
        el("p", {}, L("Wähle ein Haus für dein Grundstück. Der Inhalt deiner Truhe bleibt erhalten.", "Choose a house for your plot. The contents of your chest stay.")),
        el("div", { class: "hwGrid" }, ...varianten.map((def, i) => el("button", { type: "button", class: "hwKarte" + (i === jetzt ? " an" : ""), onclick: () => { waehle(i); zu(); } },
          grundriss(def),
          el("b", {}, en() ? def.name.en : def.name.de),
          el("span", {}, `${def.b} × ${def.t} m · ${def.raeume} ${L("Räume", "rooms")}`))),
          ...(eigenes() && defAusDoc ? [(() => {
            const def = defAusDoc(eigenes());
            return el("button", { type: "button", class: "hwKarte" + (jetzt === eigenIndex ? " an" : ""), onclick: () => { waehle(eigenIndex); zu(); } },
              grundriss(def), el("b", {}, def.name.de), el("span", {}, `${def.b} × ${def.t} m · ${L("selbstgebaut", "self-built")}`));
          })()] : [])),
        ...(presetListe?.length && defAusDoc ? [el("h3", {}, L("Haus-Presets", "House presets")), el("div", { class: "hwGrid" }, ...presetListe.map(p => {
          const def = defAusDoc(p.doc);
          return el("button", { type: "button", class: "hwKarte", onclick: () => { waehlePreset(p.doc); zu(); } }, grundriss(def), el("b", {}, p.name), el("span", {}, `${def.b} × ${def.t} m · ${L("Preset", "Preset")}`));
        }))] : []),
        ...(plaetze().length ? [el("h3", {}, L("Grundstück wählen", "Choose plot")), el("div", { class: "hwGrid" }, ...plaetze().map(p => el("button", {
          type: "button", class: "hwKarte" + (p.meins ? " an" : ""), disabled: !p.frei && !p.meins, style: !p.frei && !p.meins ? "opacity:.4;cursor:not-allowed" : "",
          onclick: () => { if (p.frei) { waehleLot(p.lot); zu(); } }
        }, el("b", {}, `P${p.lot + 1}`), el("span", {}, `${p.b} × ${p.t} m · ${p.meins ? L("dein Grundstück", "your plot") : p.frei ? L("frei", "free") : L("belegt", "taken")}`))))] : []),
        el("div", { class: "hwFuss" },
          editor ? el("button", { type: "button", class: "hwZu", onclick: () => { zu(); editor(); } }, L("Haus-Editor öffnen", "Open house editor")) : "",
          el("button", { type: "button", class: "hwZu", onclick: () => zu() }, L("Schließen", "Close")))));
  }
  function auf() {
    if (presets && !presetListe) presets().then(l => { presetListe = l || []; if (!wurzel.hidden) zeichne(); }).catch(() => { presetListe = []; });
    wurzel.hidden = false; zeichne(); requestAnimationFrame(() => wurzel.classList.add("an")); }
  function zu() { wurzel.classList.remove("an"); wurzel.hidden = true; }
  return { oeffne: auf, schliesse: zu, offen: () => !wurzel.hidden, zeichne, waehle };
}
