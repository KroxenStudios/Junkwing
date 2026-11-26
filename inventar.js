// inventar: 9 slots für gegenstände, dazu truhen (kisten) mit ebenfalls 9 slots. schlüssel sind gegenstände: ein hausschlüssel trägt
// den code seines hauses, ein autoschlüssel den code des eigenen fahrzeugs. türen und fahrzeuge öffnen sich nur, wenn ein
// passender schlüssel im inventar liegt. geprüft wird über einen hash des codes (der server schickt nur den hash des haus-
// codes an alle, der code selbst nur an den besitzer), so lässt sich ein schlüssel nicht aus dem state ablesen.
// die logik hier hat keinen dom-bezug (testbar); die oberfläche steht unten in erzeugeInventarUi.

export const SLOTS = 9;

// stack: größte stapelgröße. name(d) gibt den anzeigenamen (de, en), kurz: beschriftung auf dem slot
export const GEGENSTAENDE = {
  hausschluessel: { de: d => `Hausschlüssel P${(d?.lot ?? 0) + 1}`, en: d => `House key P${(d?.lot ?? 0) + 1}`, kurz: "Haus", kurzEn: "House", stack: 1, farbe: "#e5b84a", schluessel: true },
  autoschluessel: { de: () => "Autoschlüssel", en: () => "Car key", kurz: "Auto", kurzEn: "Car", stack: 1, farbe: "#4a90e2", schluessel: true },
  muenze: { de: () => "Münze", en: () => "Coin", kurz: "Münze", kurzEn: "Coin", stack: 99, farbe: "#f2d230" },
  kanister: { de: () => "Kanister", en: () => "Jerrycan", kurz: "Kanister", kurzEn: "Can", stack: 3, farbe: "#e5484d" },
  reparaturset: { de: () => "Reparaturset", en: () => "Repair kit", kurz: "Repar.", kurzEn: "Repair", stack: 5, farbe: "#3fae6a" },
  werkzeug: { de: () => "Werkzeug", en: () => "Tool", kurz: "Werkz.", kurzEn: "Tool", stack: 1, farbe: "#8a949e" },
  notiz: { de: () => "Notiz", en: () => "Note", kurz: "Notiz", kurzEn: "Note", stack: 1, farbe: "#e8e4dc" }
};
export const GEGENSTAND_IDS = Object.keys(GEGENSTAENDE);

// hash eines codes (cyrb53, 53 bit): beide seiten (client, server) rechnen gleich. ein test vergleicht sie
export function hash53(text, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
export const neuerCode = () => Array.from({ length: 12 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");

// ein gegenstand: { id, n, d } (d nur bei schlüsseln: { code, lot?, name? }). bereinigt auf bekannte werte, null bei unbrauchbarem
export function bereinigeGegenstand(roh) {
  if (!roh || typeof roh !== "object" || !GEGENSTAENDE[roh.id]) return null;
  const art = GEGENSTAENDE[roh.id];
  const n = Math.floor(Number(roh.n));
  const aus = { id: roh.id, n: Number.isFinite(n) ? Math.min(art.stack, Math.max(1, n)) : 1 };
  if (art.schluessel) {
    const code = typeof roh.d?.code === "string" ? roh.d.code.replace(/[^a-z0-9]/g, "").slice(0, 16) : "";
    if (!code) return null;
    aus.d = { code };
    if (roh.id === "hausschluessel") aus.d.lot = Math.min(19, Math.max(0, Math.floor(Number(roh.d.lot)) || 0));
    if (typeof roh.d.name === "string") aus.d.name = roh.d.name.replace(/[\u0000-\u001f<>]/g, "").slice(0, 20);
  }
  return aus;
}

// behälter mit festen slots (das inventar des spielers und jede truhe)
export class Behaelter {
  constructor(slots = SLOTS) {
    this.slots = Array.from({ length: slots }, () => null);
    this.beiAenderung = null;
  }
  static aus(liste, slots = SLOTS) {
    const b = new Behaelter(slots);
    if (Array.isArray(liste)) liste.slice(0, slots).forEach((e, i) => { b.slots[i] = bereinigeGegenstand(e); });
    return b;
  }
  liste() { return this.slots.map(s => (s ? { id: s.id, n: s.n, ...(s.d ? { d: { ...s.d } } : {}) } : null)); }
  gleich(a, b) { return a && b && a.id === b.id && !a.d && !b.d; }   // nur gegenstände ohne daten stapeln
  frei() { return this.slots.findIndex(s => !s); }
  anzahl(id) { return this.slots.reduce((n, s) => n + (s && s.id === id ? s.n : 0), 0); }
  hat(pruefe) { return this.slots.some(s => s && pruefe(s)); }
  // legt einen gegenstand ab (stapelt zuerst, dann freie slots); rückgabe: was nicht mehr passte (oder null)
  gib(roh) {
    const g = bereinigeGegenstand(roh);
    if (!g) return roh || null;
    const max = GEGENSTAENDE[g.id].stack;
    for (const s of this.slots) {
      if (!g.n) break;
      if (this.gleich(s, g) && s.n < max) { const t = Math.min(max - s.n, g.n); s.n += t; g.n -= t; }
    }
    while (g.n > 0) {
      const i = this.frei();
      if (i < 0) break;
      const t = Math.min(max, g.n);
      this.slots[i] = { ...g, n: t, ...(g.d ? { d: { ...g.d } } : {}) };
      g.n -= t;
    }
    this.beiAenderung?.();
    return g.n > 0 ? g : null;
  }
  // nimmt n stück aus einem slot (standard alles) und gibt sie zurück
  nimm(i, n = Infinity) {
    const s = this.slots[i];
    if (!s) return null;
    const t = Math.min(n, s.n);
    const aus = { ...s, n: t, ...(s.d ? { d: { ...s.d } } : {}) };
    s.n -= t;
    if (s.n <= 0) this.slots[i] = null;
    this.beiAenderung?.();
    return aus;
  }
  // zwei slots tauschen oder zusammenlegen
  tausche(a, b) {
    if (a === b || !(a >= 0 && b >= 0 && a < this.slots.length && b < this.slots.length)) return;
    const x = this.slots[a], y = this.slots[b];
    if (this.gleich(x, y)) {
      const t = Math.min(GEGENSTAENDE[x.id].stack - y.n, x.n);
      y.n += t; x.n -= t;
      if (x.n <= 0) this.slots[a] = null;
    } else {
      this.slots[a] = y; this.slots[b] = x;
    }
    this.beiAenderung?.();
  }
  // schlüssel: liegt einer mit passendem hash des codes im behälter? art = "hausschluessel" | "autoschluessel"
  hatSchluessel(art, codeHash) {
    return !!codeHash && this.hat(s => s.id === art && s.d && hash53(s.d.code) === codeHash);
  }
  // ersetzt alle hausschlüssel eines parkplatzes durch den neuen (ein haus, ein gültiger schlüssel)
  setzeHausschluessel(lot, code) {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s && s.id === "hausschluessel" && s.d.lot === lot) this.slots[i] = null;
    }
    const rest = this.gib({ id: "hausschluessel", n: 1, d: { lot, code } });
    this.beiAenderung?.();
    return !rest;
  }
}

export const darstellung = (g, en = false) => {
  const art = GEGENSTAENDE[g?.id];
  return art ? (en ? art.en(g.d) : art.de(g.d)) : "";
};

// ---------------------------------------------------------------------------
// oberfläche: ein rundes, glasartiges menü (taste i) mit den 9 slots im kreis; standardmäßig ist nichts auf dem bildschirm.
// öffnet man eine truhe, erscheint ihr rad neben dem des inventars
// ---------------------------------------------------------------------------
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

// inv: Behaelter des spielers. aktionen: { nimmAusKiste(kiste, slot), legeInKiste(kiste, slot, gegenstand) -> promise, autoHash(),
// ersatzAuto(), meldung(text), beiZu() }
export function erzeugeInventarUi({ inv, L, en = () => false, aktionen = {} }) {
  const wurzel = el("div", { id: "invRad", hidden: true, role: "dialog", "aria-label": L("Inventar", "Inventory") });
  document.body.append(wurzel);
  let gewaehlt = -1;
  let kiste = null;   // { lot, k, behaelter, titel }
  let tipp = "";      // text in der mitte des rads, solange der zeiger über einem slot steht

  const text = g => darstellung(g, en());
  // ein rad: neun slots im kreis (beginnend oben, im uhrzeigersinn) um eine mitte mit titel und hinweis
  function rad(behaelter, titel, beiKlick, istInventar) {
    const slots = behaelter.slots.map((g, i) => {
      const art = g && GEGENSTAENDE[g.id];
      const b = el("button", {
        type: "button", class: "radSlot" + (g ? " belegt" : "") + (istInventar && gewaehlt === i ? " an" : ""),
        style: `--w:${i * (360 / behaelter.slots.length)}deg;--i:${i};${art ? `--f:${art.farbe}` : ""}`,
        title: g ? text(g) : L("leer", "empty"),
        onclick: () => beiKlick(i),
        onpointerenter: () => { tipp = g ? text(g) : ""; mitte.textContent = tipp || titel; }
      }, el("i", {}), el("b", {}, art ? (globalThis.window?.WG?.lang === "en" ? art.kurzEn : art.kurz) : ""), g && g.n > 1 ? el("span", {}, String(g.n)) : "", el("u", {}, String(i + 1)));
      return b;
    });
    const mitte = el("div", { class: "radMitte" }, titel);
    const r = el("div", { class: "rad" + (istInventar ? "" : " kiste") }, mitte, ...slots);
    r.addEventListener("pointerleave", () => { mitte.textContent = titel; });
    return r;
  }
  function zeichne() {
    if (wurzel.hidden) return;
    const felder = [rad(inv, gewaehlt >= 0 && inv.slots[gewaehlt] ? text(inv.slots[gewaehlt]) : L("Inventar", "Inventory"), beiInvKlick, true)];
    if (kiste) felder.push(rad(kiste.behaelter, kiste.titel, beiKistenKlick, false));
    const hilfe = el("p", { class: "radHilfe" }, kiste
      ? L("Gegenstand wählen, dann einen freien Slot der Truhe anklicken. Ein Gegenstand in der Truhe wird per Klick genommen.", "Pick an item, then click a free chest slot. Click an item in the chest to take it.")
      : L("Klick wählt einen Gegenstand, ein Klick auf einen anderen Slot tauscht oder stapelt. Ziffern 1 bis 9 wählen, Esc schließt.", "Click picks an item, click another slot to swap or stack. Keys 1 to 9 pick, Esc closes."));
    const unten = [hilfe];
    const verloren = !inv.hat(g => g.id === "autoschluessel" && g.d && hash53(g.d.code) === aktionen.autoHash?.());
    if (verloren && aktionen.ersatzAuto) unten.push(el("button", { type: "button", class: "radKnopf", onclick: () => { aktionen.ersatzAuto(); zeichne(); } }, L("Ersatzschlüssel fürs Auto nachmachen", "Make a spare car key")));
    wurzel.replaceChildren(
      el("div", { class: "radHinten", onclick: () => zu() }),
      el("div", { class: "radBuehne" }, el("div", { class: "radFelder" }, ...felder), el("div", { class: "radUnten" }, ...unten)));
  }
  function beiInvKlick(i) {
    if (gewaehlt >= 0 && gewaehlt !== i) { inv.tausche(gewaehlt, i); gewaehlt = -1; }
    else gewaehlt = gewaehlt === i ? -1 : i;
    zeichne();
  }
  async function beiKistenKlick(i) {
    if (!kiste) return;
    const g = kiste.behaelter.slots[i];
    if (gewaehlt >= 0 && !g) {
      const nimmt = inv.slots[gewaehlt];
      if (!nimmt) return;
      const ok = await aktionen.legeInKiste?.(kiste, i, { id: nimmt.id, n: nimmt.n, ...(nimmt.d ? { d: nimmt.d } : {}) });
      if (ok) { inv.nimm(gewaehlt); gewaehlt = -1; }
    } else if (g && gewaehlt < 0) {
      if (inv.frei() < 0 && !inv.slots.some(s => s && s.id === g.id && !s.d && s.n < GEGENSTAENDE[g.id].stack)) return aktionen.meldung?.("Inventar voll");
      const geholt = await aktionen.nimmAusKiste?.(kiste, i);
      if (geholt) { const rest = inv.gib(geholt); if (rest) aktionen.meldung?.("Inventar voll"); }
    }
    zeichne();
  }
  function auf() {
    wurzel.hidden = false;
    wurzel.classList.remove("an");
    zeichne();
    requestAnimationFrame(() => wurzel.classList.add("an"));
  }
  function zu() {
    if (wurzel.hidden) return;
    wurzel.classList.remove("an");
    wurzel.hidden = true;
    kiste = null;
    gewaehlt = -1;
    aktionen.beiZu?.();
  }
  // solange das rad offen ist: ziffern wählen einen slot, esc schließt (die ziffern gehen nicht ans spiel)
  addEventListener("keydown", e => {
    if (wurzel.hidden) return;
    if (e.key === "Escape") { e.stopImmediatePropagation(); zu(); return; }
    if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.stopImmediatePropagation(); beiInvKlick(Number(e.key) - 1); }
  }, true);
  inv.beiAenderung = () => zeichne();
  return {
    zeichne,
    umschalten: () => (wurzel.hidden ? auf() : zu()),
    offen: () => !wurzel.hidden,
    zeigeKiste(lot, k, titel, behaelter) { kiste = { lot, k, titel, behaelter }; if (wurzel.hidden) auf(); else zeichne(); },
    aktualisiereKiste(behaelter) { if (kiste) { kiste.behaelter = behaelter; zeichne(); } },
    kisteOffen: () => kiste,
    schliesse: zu,
    gewaehlt: () => gewaehlt
  };
}
