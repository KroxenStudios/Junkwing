import { Konto } from "./accounts.js";
import { einladungsLink } from "./werbung.js";
import { PAKET_TEILE, TEILE } from "./bau.js";

const L = (de, en) => (window.WG ? WG.L(de, en) : de);
const EN = () => !!window.WG && WG.lang === "en";

function el(tag, props = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e[k] = v;
  }
  for (const k of kinder) e.append(k);
  return e;
}

let dialog, inhalt;
let daten = null;
let meldungText = "", meldungArt = "ok";
let adminCodes = [], neueCodes = "";
let killStand = null;

const zahl = n => Number(n).toLocaleString(EN() ? "en-GB" : "de-DE");
const dt = t => new Date(t).toLocaleDateString(EN() ? "en-GB" : "de-DE");

function melde(text, art = "ok") {
  meldungText = text;
  meldungArt = art;
  zeige();
}

async function lade() {
  if (!Konto.angemeldet()) { daten = null; zeige(); return; }
  try {
    daten = await Konto.anfrage("GET", "/shop");
    Konto.standSetzen({ coins: daten.coins, owned: daten.owned, streak: daten.streak.current, streakShow: daten.streak.show });
    if (Konto.istAdmin()) {
      adminCodes = (await Konto.anfrage("GET", "/admin/codes")).codes;
      killStand = await Konto.anfrage("GET", "/admin/kill");
    }
  } catch (e) {
    melde(e.message === "netz" ? L("Der Server ist gerade nicht erreichbar.", "The server is not reachable right now.") : Konto.fehlerText(e.message), "fehler");
    return;
  }
  zeige();
}

async function einloesen(feld, knopf) {
  const code = feld.value.trim();
  if (!code) return;
  knopf.disabled = true;
  try {
    const r = await Konto.anfrage("POST", "/shop/redeem", { code });
    feld.value = "";
    meldungText = L(`+${zahl(r.gained)} Coins eingelöst. Du hast jetzt ${zahl(r.coins)} Coins.`, `+${zahl(r.gained)} coins redeemed. You now have ${zahl(r.coins)} coins.`);
    meldungArt = "ok";
    await lade();
  } catch (e) {
    knopf.disabled = false;
    melde(e.message === "netz" ? L("Der Server ist gerade nicht erreichbar.", "The server is not reachable right now.") : Konto.fehlerText(e.message), "fehler");
  }
}

async function kaufen(p) {
  if (!confirm(L(`„${p.name[0]}“ für ${zahl(p.price)} Coins kaufen?`, `Buy "${p.name[1]}" for ${zahl(p.price)} coins?`))) return;
  try {
    await Konto.anfrage("POST", "/shop/buy", { pack: p.id });
    meldungText = L("Gekauft. Das Paket ist freigeschaltet.", "Purchased. The pack is unlocked.");
    meldungArt = "ok";
    await lade();
  } catch (e) {
    melde(Konto.fehlerText(e.message), "fehler");
  }
}

const TEIL_EN = { lidar: "Lidar dome", radar: "Tracking radar", gyro: "Gyro sphere", hoehe: "Radar altimeter", kraft: "G-force crystal",
  unterboden: "Underglow", strahler: "Floodlight", blinker: "Hazard blinker", blaulicht: "Beacon", laser: "Laser beam",
  funken: "Spark trail", regenbogen: "Rainbow exhaust", staubspur: "Dust plume", plasma: "Plasma trail", konfetti: "Confetti cannon",
  rauchwerfer: "Smoke launcher", fackel: "Flare", stoersender: "Jammer", schild: "Shield generator", feuerloescher: "Fire extinguisher" };

const FX_NAMEN = {
  aurora: ["Polarlicht", "Aurora"], sterne: ["Sternenhimmel", "Starfield"], synth: ["Synthwave", "Synthwave"], lava: ["Lava", "Lava"], matrix: ["Code-Regen", "Code rain"],
  gold: ["Gold", "Gold"], neon: ["Neon", "Neon"], regenbogen: ["Regenbogen", "Rainbow"], feuer: ["Feuer", "Fire"], glitch: ["Glitch", "Glitch"]
};

async function waehleEffekt(art, id) {
  try {
    const r = await Konto.anfrage("POST", "/shop/effekt", { art, id });
    daten.fx = r.fx;
    Konto.standSetzen({ fx: r.fx });
    zeige();
  } catch (e) {
    melde(Konto.fehlerText(e.message), "fehler");
  }
}

function effektWahl(p) {
  const aktiv = daten.fx?.[p.fx.art] || "";
  return el("div", { class: "fxWahl" }, ...p.fx.ids.map(id => el("button", {
    type: "button", class: aktiv === id ? "aktiv" : "", disabled: !p.owned,
    title: p.owned ? "" : L("Erst das Paket kaufen", "Buy the pack first"),
    onclick: () => waehleEffekt(p.fx.art, aktiv === id ? "" : id)
  }, el("span", { class: p.fx.art === "tag" ? "fxTag-" + id : "", textContent: FX_NAMEN[id]?.[EN() ? 1 : 0] || id }))));
}

function pakete() {
  const liste = el("div", { class: "shopPakete" });
  for (const p of daten.packs) {
    const genug = daten.coins >= p.price;
    liste.append(el("div", { class: "shopPaket" + (p.owned ? " besitz" : "") },
      el("div", {}, el("b", { textContent: p.name[EN() ? 1 : 0] }), el("br"), el("small", { textContent: p.descr[EN() ? 1 : 0] }),
        ...(p.fx ? [effektWahl(p)] : []),
        ...(PAKET_TEILE[p.id] ? [
          el("div", { class: "shopTeile" }, ...PAKET_TEILE[p.id].map(t => el("span", { textContent: EN() ? (TEIL_EN[t] || t) : (TEILE[t]?.name || t) }))),
          el("button", { type: "button", class: "shopVorschau", textContent: "👁 " + L("Vorschau im Spiel", "Preview in game"), onclick: () => { dialog.close(); window.dispatchEvent(new CustomEvent("krox-vorschau", { detail: { pack: p.id } })); } })
        ] : [])),
      p.owned
        ? el("span", { class: "preis", textContent: L("✓ freigeschaltet", "✓ unlocked") })
        : el("button", { type: "button", disabled: !genug, title: genug ? "" : L("Nicht genug Coins", "Not enough coins"), textContent: `${zahl(p.price)} ● ${L("Kaufen", "Buy")}`, onclick: () => kaufen(p) })));
  }
  return liste;
}

function einladung() {
  const link = el("input", { type: "text", readOnly: true, value: einladungsLink(daten.ref.code) });
  return el("div", { class: "shopKarte" },
    el("h3", { textContent: L("Freunde einladen", "Invite friends") }),
    el("small", { textContent: L(
      `Für jeden geworbenen Spieler, der ein eigenes Konto anlegt und ${daten.ref.days} Tage in Folge online ist, bekommst du ${daten.ref.reward} Coins (höchstens 20 Einladungen). Dein Einladungscode steckt im Link, das Konto muss darüber erstellt werden. Teile diesen Link:`,
      `For every player you bring in who creates an account and is online ${daten.ref.days} days in a row you get ${daten.ref.reward} coins (up to 20 invitations). Your invite code is part of the link, the account has to be created through it. Share this link:`) }),
    el("div", { class: "shopLink" }, link,
      el("button", { type: "button", textContent: L("Kopieren", "Copy"), onclick: async e => {
        link.select();
        try { await navigator.clipboard.writeText(link.value); e.target.textContent = L("Kopiert", "Copied"); } catch { document.execCommand?.("copy"); }
      } })),
    el("small", { textContent: L(`Geworben: ${daten.ref.invited} · davon belohnt: ${daten.ref.rewarded}`, `Invited: ${daten.ref.invited} · rewarded: ${daten.ref.rewarded}`) }));
}

function killKarte() {
  const an = !!killStand?.active;
  const text = el("input", { type: "text", maxLength: 300, value: killStand?.message || "", placeholder: L("Nachricht für Spieler (optional)", "Message for players (optional)") });
  const textEn = el("input", { type: "text", maxLength: 300, value: killStand?.messageEn || "", placeholder: L("Nachricht für Spieler auf Englisch (optional)", "Message for players in English (optional)") });
  const danachEn = el("textarea", { maxLength: 500, rows: 3, value: killStand?.nachher?.textEn || "", placeholder: L("Popup auf Englisch (leer = deutscher Text)", "Popup in English (empty = German text)") });
  const danach = el("textarea", { maxLength: 500, rows: 3, value: killStand?.nachher?.text || "", placeholder: L("Popup nach dem Ausfall (leer = Standardtext)", "Popup after the outage (empty = default text)") });
  const senden = async (active, neu) => {
    killStand = await Konto.anfrage("POST", "/admin/kill", { active, message: text.value, messageEn: textEn.value, nachher: danach.value, nachherEn: danachEn.value, neu });
  };
  const veroeffentlichen = el("button", { type: "button", textContent: L("Popup veröffentlichen", "Publish popup"), onclick: async () => {
    veroeffentlichen.disabled = true;
    try {
      await senden(an, true);
      meldungText = !killStand.nachher ? L("Popup entfernt.", "Popup removed.") : an ? L("Gespeichert. Das Popup erscheint, sobald der Server wieder läuft.", "Saved. The popup appears once the server is running again.") : L("Popup ist live. Jeder Spieler sieht es einmal, 7 Tage lang.", "Popup is live. Each player sees it once, for 7 days.");
      meldungArt = "ok";
      zeige();
    } catch (e) {
      veroeffentlichen.disabled = false;
      melde(Konto.fehlerText(e.message), "fehler");
    }
  } });
  const knopf = el("button", { type: "button", textContent: an ? L("Server wieder einschalten", "Switch server back on") : L("Server abschalten", "Switch server off"), onclick: async () => {
    const ziel = !an;
    if (ziel && !confirm(L("Server wirklich abschalten? Das Spiel startet dann für alle ausser dir nicht mehr, laufende Verbindungen werden getrennt.", "Really switch the server off? The game will no longer start for anyone but you, and running connections are cut."))) return;
    knopf.disabled = true;
    try {
      await senden(ziel, false);
      meldungText = ziel ? L("Kill-Switch aktiv: Das Spiel startet nicht mehr (ausser für dich). Wirkt nach wenigen Sekunden.", "Kill switch active: the game no longer starts (except for you). Takes effect within seconds.") : L("Kill-Switch aus: Das Spiel läuft wieder.", "Kill switch off: the game is running again.");
      meldungArt = "ok";
      zeige();
    } catch (e) {
      knopf.disabled = false;
      melde(Konto.fehlerText(e.message), "fehler");
    }
  } });
  return el("div", { class: "shopKarte" },
    el("h3", { textContent: "Kill-Switch" }),
    el("small", { textContent: an ? L("AKTIV: Das Spiel ist für alle ausser dir gesperrt.", "ACTIVE: the game is locked for everyone but you.") : L("Aus: Das Spiel läuft normal.", "Off: the game runs normally.") }),
    el("div", { class: "shopForm" }, text, textEn, knopf),
    el("div", { class: "shopForm" }, danach, danachEn, veroeffentlichen));
}

function adminWerkzeug() {
  const coins = el("input", { type: "number", min: 1, max: 1000000, value: 100, placeholder: "Coins" });
  const anzahl = el("input", { type: "number", min: 1, max: 200, value: 1, placeholder: L("Anzahl", "Count") });
  const nutzungen = el("input", { type: "number", min: 1, max: 100000, value: 1, placeholder: L("Nutzungen je Code", "Uses per code") });
  const tage = el("input", { type: "number", min: 0, max: 3650, value: 0, placeholder: L("Gültig (Tage, 0 = ewig)", "Valid (days, 0 = forever)") });
  const notiz = el("input", { type: "text", maxLength: 80, placeholder: L("Notiz (nur für dich)", "Note (for you only)") });
  const knopf = el("button", { type: "submit", textContent: L("Codes erstellen", "Create codes") });
  const form = el("form", { class: "shopForm", onsubmit: async e => {
    e.preventDefault();
    knopf.disabled = true;
    try {
      const r = await Konto.anfrage("POST", "/admin/codes", { coins: Number(coins.value), count: Number(anzahl.value), uses: Number(nutzungen.value), days: Number(tage.value), note: notiz.value });
      neueCodes = r.codes.join("\n");
      meldungText = L("Codes erstellt. Sie werden nur jetzt im Klartext angezeigt, danach gibt es nur noch den Hash.", "Codes created. They are shown in plain text only now, afterwards only the hash exists.");
      meldungArt = "ok";
      await lade();
    } catch (err) {
      knopf.disabled = false;
      melde(Konto.fehlerText(err.message), "fehler");
    }
  } }, ...[coins, anzahl, nutzungen, tage, notiz].map(i => { i.style.textTransform = "none"; i.style.letterSpacing = "0"; return i; }), knopf);
  const tabelle = el("table", { class: "shopCodes" },
    el("tr", {}, ...["ID", "Coins", L("Genutzt", "Used"), L("Bis", "Until"), L("Notiz", "Note"), ""].map(t => el("th", { textContent: t }))),
    ...adminCodes.map(c => el("tr", {},
      el("td", { textContent: c.id }), el("td", { textContent: zahl(c.coins) }),
      el("td", { textContent: `${c.used}/${c.max_uses}` }),
      el("td", { textContent: c.expires ? dt(c.expires) : "∞" }), el("td", { textContent: c.note }),
      el("td", {}, c.revoked ? L("gesperrt", "revoked") : el("button", { type: "button", textContent: L("Sperren", "Revoke"), onclick: async () => {
        try { await Konto.anfrage("DELETE", `/admin/codes/${c.id}`); await lade(); } catch (e) { melde(Konto.fehlerText(e.message), "fehler"); }
      } })))));
  return el("div", { class: "shopKarte" },
    el("h3", { textContent: L("Code-Werkzeug (intern)", "Code tool (internal)") }),
    form,
    neueCodes ? el("textarea", { readOnly: true, rows: Math.min(10, neueCodes.split("\n").length + 1), value: neueCodes, onfocus: e => e.target.select() }) : "",
    adminCodes.length ? tabelle : "");
}

function zeige() {
  if (!inhalt) return;
  inhalt.replaceChildren(el("button", { type: "button", class: "kontoZu", textContent: "✕", ariaLabel: L("Schließen", "Close"), onclick: () => dialog.close() }));
  inhalt.append(el("h2", { textContent: "Shop" }));
  if (meldungText) inhalt.append(el("p", { class: "shopMeldung " + meldungArt, textContent: meldungText }));

  if (!Konto.angemeldet()) {
    inhalt.append(
      el("p", { class: "muted", textContent: L("Für Coins, Codes und Pakete brauchst du ein (kostenloses) Konto.", "You need a (free) account for coins, codes and packs.") }),
      el("button", { type: "button", textContent: L("Anmelden", "Sign in"), onclick: () => { dialog.close(); Konto.oeffneKonto(); } }));
    return;
  }
  if (!daten) { inhalt.append(el("p", { class: "muted", textContent: L("Lade …", "Loading …") })); return; }

  inhalt.append(el("div", { class: "shopKopf" },
    el("span", { class: "shopMuenzen", textContent: `● ${zahl(daten.coins)} Coins` }),
    daten.streak.current > 0 ? el("span", { class: "muted", textContent: `🔥 ${L("Streak", "Streak")}: ${daten.streak.current}` }) : ""));

  const feld = el("input", { type: "text", maxLength: 24, placeholder: "XXXX-XXXX-XXXX-XXXX", autocomplete: "off", spellcheck: false });
  const knopf = el("button", { type: "submit", textContent: L("Einlösen", "Redeem") });
  inhalt.append(
    el("h3", { textContent: L("Pakete", "Packs") }), pakete(),
    el("div", { class: "shopKarte" },
      el("h3", { textContent: L("Geschenkcode einlösen", "Redeem gift code") }),
      el("form", { class: "shopForm", onsubmit: e => { e.preventDefault(); einloesen(feld, knopf); } }, feld, knopf),
      el("small", { textContent: L("Jeder Code gilt nur einmal pro Konto. Zu viele falsche Eingaben sperren das Einlösen kurz.", "Each code works once per account. Too many wrong entries block redeeming for a while.") })),
    einladung());
  if (Konto.istAdmin()) inhalt.append(killKarte(), adminWerkzeug());
}

export function oeffneShop() {
  meldungText = "";
  neueCodes = "";
  zeige();
  dialog.showModal();
  lade();
}

export function startShop() {
  inhalt = el("div", { class: "kontoInhalt" });
  dialog = el("dialog", { id: "shopDialog" }, inhalt);
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  document.body.append(dialog);

  const zahlEl = document.getElementById("coinsZahl");
  const anzeigen = () => { if (zahlEl) zahlEl.textContent = Konto.angemeldet() && Konto.stand.coins !== null ? zahl(Konto.stand.coins) : "–"; };
  window.addEventListener("krox-stand", anzeigen);
  anzeigen();
  document.getElementById("coinsBtn")?.addEventListener("click", oeffneShop);
  document.getElementById("btnShop")?.addEventListener("click", oeffneShop);
}
