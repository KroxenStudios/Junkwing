import { Konto } from "./accounts.js";
import { zeigePopup } from "./popups.js";

const L = (de, en) => (window.WG ? WG.L(de, en) : de);
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

const BILD_MAX = 700000;
const NACHFRAGE = 5 * 60000;

const WECHSEL = {
  ok: [["Willkommen im Entwicklerprogramm", "Welcome to the developer program"], ["Deine Bewerbung wurde angenommen. Unten links findest du jetzt den Knopf „RAI“, um Fehler zu melden.", "Your application was accepted. At the bottom left you now find the “RAI” button to report issues."]],
  nein: [["Bewerbung abgelehnt", "Application declined"], ["Diesmal hat es nicht geklappt. In einer Woche kannst du dich erneut bewerben.", "It did not work out this time. You can apply again in a week."]],
  entzogen: [["Entwicklerzugang beendet", "Developer access ended"], ["Dein Zugang zum Entwicklerprogramm ist nicht mehr aktiv.", "Your developer program access is no longer active."]]
};

function meldeWechsel(name, neu) {
  const k = "jw-dev-status:" + name.toLowerCase();
  let alt = null;
  try { alt = localStorage.getItem(k); localStorage.setItem(k, neu); } catch { return; }
  if (alt === neu) return;
  const art = neu === "ok" ? "ok" : neu !== "nein" ? null : alt === "ok" ? "entzogen" : alt === "offen" ? "nein" : null;
  if (!art) return;
  const [t, x] = WECHSEL[art];
  zeigePopup({ id: "dev-" + art, titel: L(...t), text: L(...x) });
}

function schrumpfen(quelle) {
  const f = Math.min(1, 1280 / quelle.width);
  const c = el("canvas", { width: Math.max(1, Math.round(quelle.width * f)), height: Math.max(1, Math.round(quelle.height * f)) });
  c.getContext("2d").drawImage(quelle, 0, 0, c.width, c.height);
  for (let q = 0.8; q > 0.25; q -= 0.11) {
    const d = c.toDataURL("image/jpeg", q);
    if (d.length < BILD_MAX) return d;
  }
  return "";
}

function dialogOeffnen(titel, ...inhalt) {
  const dlg = el("dialog", { class: "meldeDialog" }, el("div", { class: "kontoInhalt" }, el("h2", { textContent: titel }), ...inhalt));
  dlg.addEventListener("close", () => dlg.remove());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

function fertig(dlg, text) {
  const form = dlg.querySelector("form");
  form.replaceChildren(
    el("p", { class: "kontoMeldung ok", textContent: text }),
    el("button", { type: "button", textContent: L("Schließen", "Close"), onclick: () => dlg.close() }));
}

export function startEntwickler({ hud, bild, kontext }) {
  let status = "unbekannt";
  let fuer = null;
  let gesehen = null;
  let gefragt = Date.now();

  const programmBtn = el("button", { type: "button", id: "devBtn", hidden: true });
  const raiBtn = el("button", { type: "button", id: "raiBtn", hidden: true, textContent: "RAI",
    title: L("Fehler melden (Report an Issue)", "Report an issue"), "aria-label": L("Fehler melden", "Report an issue") });
  hud.insertBefore(programmBtn, document.getElementById("langBtn") || null);
  document.body.append(raiBtn);

  function zeichne() {
    const an = Konto.angemeldet();
    raiBtn.hidden = !(an && status === "ok");
    programmBtn.hidden = !(an ? ["keiner", "nein", "offen"].includes(status) : status !== "ok");
    programmBtn.disabled = status === "offen";
    programmBtn.textContent = status === "offen" ? L("Bewerbung wird geprüft", "Application pending") : L("Entwicklerprogramm beitreten", "Join developer program");
  }

  function setze(neu) {
    status = neu;
    if (fuer) meldeWechsel(fuer, neu);
    zeichne();
  }

  function adminHinweis() {
    const n = Konto.istAdmin() ? Konto.stand.devOffen : 0;
    let alt = 0;
    try { alt = Number(sessionStorage.getItem("jw-dev-offen") || 0); sessionStorage.setItem("jw-dev-offen", n); } catch {}
    if (n > alt) zeigePopup({ id: "dev-offen", titel: L("Entwicklerprogramm", "Developer program"), text: L(`${n} offene Bewerbung${n > 1 ? "en" : ""}.`, `${n} open application${n > 1 ? "s" : ""}.`), link: { href: Konto.basis + "/moderation/", text: L("Moderation öffnen →", "Open moderation →") } });
  }

  function lade() {
    const name = Konto.angemeldet() ? Konto.benutzer() : null;
    if (name !== fuer) { fuer = name; status = "unbekannt"; gesehen = null; }
    if (!name) { status = "keiner"; return zeichne(); }
    const vomServer = Konto.stand.dev;
    if (!vomServer || vomServer === gesehen) return zeichne();
    gesehen = vomServer;
    setze(vomServer);
    adminHinweis();
  }

  async function nachfragen() {
    if (status !== "offen" || document.visibilityState !== "visible" || Date.now() - gefragt < NACHFRAGE) return;
    gefragt = Date.now();
    try { setze((await Konto.anfrage("GET", "/dev/status")).status); } catch {}
  }

  function bewerbung() {
    if (!Konto.angemeldet()) { Konto.oeffneKonto(); return; }
    const text = el("textarea", { maxLength: 600, rows: 6, required: true, minLength: 10,
      placeholder: L("Kurz: wer du bist, warum du testen möchtest, was du mitbringst …", "Briefly: who you are, why you want to test, what you bring …") });
    const meldung = el("p", { class: "kontoMeldung fehler", hidden: true });
    const senden = el("button", { type: "submit", class: "primaer", textContent: L("Bewerbung senden", "Send application") });
    let dlg;
    const form = el("form", { class: "kontoForm", onsubmit: async e => {
      e.preventDefault();
      senden.disabled = true;
      try {
        await Konto.anfrage("POST", "/dev/apply", { text: text.value });
        setze("offen");
        fertig(dlg, L("Danke, die Bewerbung ist bei KroxenStudios angekommen. Sobald sie angenommen ist, erscheint im Spiel unten links ein kleiner „RAI“-Knopf.", "Thanks, your application reached KroxenStudios. Once accepted, a small “RAI” button appears in the game at the bottom left."));
      } catch (err) {
        senden.disabled = false;
        meldung.hidden = false;
        meldung.textContent = err.message === "text_kurz" ? L("Bitte etwas mehr schreiben (mindestens 10 Zeichen).", "Please write a bit more (at least 10 characters).") : Konto.fehlerText(err.message);
      }
    } }, text, meldung, el("div", { class: "kontoLinks" }, el("button", { type: "button", textContent: L("Abbrechen", "Cancel"), onclick: () => dlg.close() }), senden));
    dlg = dialogOeffnen(L("Entwicklerprogramm", "Developer program"),
      el("p", { class: "kontoInfo", textContent: L("Mit einer kurzen Bewerbung kannst du Fehler direkt an KroxenStudios schicken, mit Screenshot und Beschreibung.", "With a short application you can send bugs straight to KroxenStudios, with screenshot and description.") }),
      form);
    text.focus();
  }

  function meldenOeffnen() {
    let shot = "";
    try { shot = schrumpfen(bild()); } catch {}
    const text = el("textarea", { maxLength: 3000, rows: 7, required: true, minLength: 5,
      placeholder: L("Was ist passiert? Wie lässt es sich wiederholen? (oder etwas Allgemeines)", "What happened? How can it be reproduced? (or something general)") });
    const haken = el("input", { type: "checkbox", checked: !!shot, disabled: !shot });
    const vorschau = shot ? el("img", { src: shot, alt: "", class: "raiVorschau" }) : "";
    const meldung = el("p", { class: "kontoMeldung fehler", hidden: true });
    const senden = el("button", { type: "submit", class: "primaer", textContent: L("Senden", "Send") });
    let dlg;
    const form = el("form", { class: "kontoForm", onsubmit: async e => {
      e.preventDefault();
      senden.disabled = true;
      try {
        await Konto.anfrage("POST", "/dev/report", { text: text.value, bild: haken.checked ? shot : "", kontext: kontext?.() || "" });
        fertig(dlg, L("Gesendet, danke dir.", "Sent, thank you."));
      } catch (err) {
        senden.disabled = false;
        meldung.hidden = false;
        const eigene = {
          kein_entwickler: L("Dein Entwicklerzugang ist nicht (mehr) aktiv.", "Your developer access is not active (any more)."),
          bild_ungueltig: L("Der Screenshot ist ungültig oder zu gross.", "The screenshot is invalid or too large.")
        };
        meldung.textContent = eigene[err.message] || Konto.fehlerText(err.message);
        if (err.message === "kein_entwickler") { status = "keiner"; zeichne(); }
      }
    } }, text, vorschau,
      el("label", { class: "raiHaken" }, haken, " ", L("Screenshot anhängen", "Attach screenshot")),
      meldung, el("div", { class: "kontoLinks" }, el("button", { type: "button", textContent: L("Abbrechen", "Cancel"), onclick: () => dlg.close() }), senden));
    dlg = dialogOeffnen(L("Fehler melden", "Report an issue"), form);
    text.focus();
  }

  programmBtn.onclick = bewerbung;
  raiBtn.onclick = meldenOeffnen;
  window.addEventListener("krox-stand", lade);
  document.addEventListener("visibilitychange", nachfragen);
  setInterval(nachfragen, NACHFRAGE);
  lade();
  return { status: () => status };
}
