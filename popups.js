import { Konto } from "./accounts.js";

const L = (de, en) => (window.WG ? WG.L(de, en) : de);
const GESEHEN = "jw-nachher-gesehen", AUSFALL = "jw-ausfall";
const TAG = 86400000;

const merk = {
  hol: k => { try { return localStorage.getItem(k); } catch { return null; } },
  leg: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  weg: k => { try { localStorage.removeItem(k); } catch {} }
};

const schlange = [];
let offen = null;

function naechstes() {
  if (offen || !schlange.length) return;
  const p = schlange.shift();
  const karte = document.createElement("div");
  karte.className = "jwPopup";
  karte.setAttribute("role", "dialog");
  karte.setAttribute("aria-label", p.titel);
  const titel = document.createElement("h2");
  titel.textContent = p.titel;
  const text = document.createElement("p");
  text.textContent = p.text;
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.textContent = p.knopf || "OK";
  let uhr = 0;
  const zu = () => {
    clearTimeout(uhr);
    karte.remove();
    offen = null;
    p.beimSchliessen?.();
    knopf.blur();
    naechstes();
  };
  knopf.onclick = zu;
  karte.append(titel, text);
  for (const [name, wert] of p.kopieren || []) {
    const zeile = document.createElement("label");
    const feld = Object.assign(document.createElement("input"), { type: "text", readOnly: true, value: wert });
    const kopie = Object.assign(document.createElement("button"), { type: "button", textContent: WG.L("Kopieren", "Copy") });
    kopie.onclick = async () => {
      try { await navigator.clipboard.writeText(wert); } catch { feld.select(); document.execCommand("copy"); }
      kopie.textContent = WG.L("Kopiert ✓", "Copied ✓");
      kopie.blur();
    };
    zeile.append(name, feld, kopie);
    karte.append(zeile);
  }
  if (p.link) {
    const a = document.createElement("a");
    Object.assign(a, { href: p.link.href, textContent: p.link.text, target: "_blank", rel: "noopener" });
    a.onclick = () => setTimeout(zu, 0);
    karte.append(a);
  }
  if (p.zweit) {
    const z = Object.assign(document.createElement("button"), { type: "button", className: "leise", textContent: p.zweit.text });
    z.onclick = () => { p.zweit.tu(); zu(); };
    karte.append(z);
  }
  karte.append(knopf);
  karte.addEventListener("pointerenter", () => clearTimeout(uhr));
  document.body.append(karte);
  offen = { id: p.id, zu };
  if (p.dauer) uhr = setTimeout(zu, p.dauer);
}

export function zeigePopup(p) {
  if (p.id && (offen?.id === p.id || schlange.some(x => x.id === p.id))) return;
  schlange.push(p);
  naechstes();
}

export function schliessePopup(id) {
  for (let i = schlange.length - 1; i >= 0; i--) if (schlange[i].id === id) schlange.splice(i, 1);
  if (offen?.id === id) offen.zu();
}

export const merkeAusfall = () => merk.leg(AUSFALL, String(Date.now()));

export async function pruefeNachricht(erlebt = false) {
  let stand;
  try { stand = await Konto.anfrage("GET", "/kill"); } catch { return; }
  if (stand.active) return;
  const gemerkt = Date.now() - Number(merk.hol(AUSFALL) || 0) < 3 * TAG;
  merk.weg(AUSFALL);
  const n = stand.nachher;
  const botschaft = n && (window.WG?.lang === "en" ? n.textEn || n.text : n.text || n.textEn);
  if (botschaft && merk.hol(GESEHEN) !== String(n.id) && Date.now() - n.id < 7 * TAG) {
    zeigePopup({ id: "nachher-" + n.id, titel: L("Neues vom Server", "Server news"), text: botschaft, knopf: L("Alles klar", "Got it"), beimSchliessen: () => merk.leg(GESEHEN, String(n.id)) });
    return;
  }
  if (erlebt || gemerkt) {
    zeigePopup({ id: "zurueck", titel: L("Junkwing ist wieder da", "Junkwing is back"), text: L("Der Server läuft wieder. Viel Spaß!", "The server is running again. Have fun!"), dauer: 12000 });
  }
}

export function startPopups() {
  let zuletzt = Date.now();
  pruefeNachricht();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || Date.now() - zuletzt < 10 * 60000) return;
    zuletzt = Date.now();
    pruefeNachricht();
  });
}
