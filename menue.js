// hauptmenü: beim start links über der szene vor dem eigenen haus. die kamera schwingt leicht hin und her, ein halbdurchsichtiger
// verlauf hebt das menü ab und verschwindet beim start in etwa 0,7 s. nicht angemeldete spieler werden zuerst in einem eigenen
// dialog gefragt, ob sie sich anmelden, ein konto erstellen oder als gast spielen wollen (einmal pro sitzung); erst danach
// erscheint das menü.

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

const GAST_KEY = "bastelkarre-gast-sitzung";
export const TINT_MS = 700;

// konto: { angemeldet(), benutzer() }; aktionen: spielen, hilfe, einstellungen, shop, hangar, konto (alle ohne argumente)
export function startMenue({ L, konto, aktionen, bereit = true }) {
  const reduziert = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let offen = false;
  let ersteZeit = null;

  const tint = el("div", { id: "menueTint" });
  const wurzel = el("nav", { id: "hauptmenue", "aria-label": L("Hauptmenü", "Main menu") });
  const titel = el("h1", {}, "Junkwing");
  const frage = el("div", { id: "anmeldeFrage", role: "dialog", "aria-modal": "true", "aria-label": L("Anmelden?", "Sign in?") });
  const liste = el("div", { class: "menueListe" });
  wurzel.append(titel, liste);

  const knopf = (text, onclick, klasse = "") => el("button", { type: "button", class: klasse, onclick }, text);

  const gefragt = () => { try { return sessionStorage.getItem(GAST_KEY) === "1"; } catch { return false; } };

  // die frage steht vor dem menü: solange sie offen ist, bleibt das menü unsichtbar
  function beendeFrage(nachher) {
    try { sessionStorage.setItem(GAST_KEY, "1"); } catch {}
    frage.classList.remove("an");
    setTimeout(() => frage.remove(), 300);
    wurzel.classList.remove("versteckt");
    nachher?.();
  }
  function zeigeFrage() {
    frage.replaceChildren(
      el("h2", {}, L("Willkommen bei Junkwing", "Welcome to Junkwing")),
      el("p", {}, L("Du bist nicht angemeldet. Mit einem Konto bleibt dein Haus nach dem Verlassen 10 Minuten stehen, und deine Fahrzeuge und Coins bleiben erhalten.", "You are not signed in. With an account your house stays for 10 minutes after you leave, and your vehicles and coins are kept.")),
      el("div", { class: "menueZeile" },
        knopf(L("Anmelden", "Sign in"), () => beendeFrage(() => aktionen.konto()), "primaer gross"),
        knopf(L("Konto erstellen", "Create account"), () => beendeFrage(() => aktionen.konto())),
        knopf(L("Als Gast spielen", "Play as guest"), () => beendeFrage())));
    document.body.append(frage);
    wurzel.classList.add("versteckt");
    requestAnimationFrame(() => frage.classList.add("an"));
    frage.querySelector("button")?.focus();
  }
  function baueLogin() {
    // nach einer anmeldung während die frage offen ist: sie schließt sich von selbst
    if (konto.angemeldet() && frage.isConnected) beendeFrage();
  }

  const eintraege = [
    [L("Spielen", "Play"), () => schliesse(true), "primaer gross"],
    [L("Einstellungen", "Settings"), () => aktionen.einstellungen(), ""],
    [L("Shop", "Shop"), () => aktionen.shop(), ""],
    [L("Hangar", "Hangar"), () => aktionen.hangar(), ""],
    [L("Haus wählen", "Choose house"), () => aktionen.haus(), ""],
    [L("Haus bauen (Editor)", "Build a house (editor)"), () => aktionen.hausBauen(), ""],
    [L("Konto", "Account"), () => aktionen.konto(), ""],
    [L("Hilfe", "Help"), () => aktionen.hilfe(), ""]
  ];
  for (const [t, f, k] of eintraege) liste.append(knopf(t, f, k));

  function oeffne() {
    if (offen) return;
    offen = true;
    ersteZeit = null;
    document.body.append(tint, wurzel);
    document.body.classList.add("menue");
    // einblenden: erst im nächsten bild, damit die übergänge laufen
    requestAnimationFrame(() => { tint.classList.add("an"); wurzel.classList.add("an"); });
    aktionen.beimOeffnen?.();
    if (!konto.angemeldet() && !gefragt()) zeigeFrage();
  }

  // zum spielen: tint und menü in TINT_MS ausblenden, dann entfernen. spielen = false schließt nur (z. b. für das konto)
  function schliesse(spielen = false) {
    if (!offen) return;
    offen = false;
    tint.classList.remove("an");
    wurzel.classList.remove("an");
    document.body.classList.remove("menue");
    aktionen.beimSchliessen?.();
    frage.remove();
    setTimeout(() => { tint.remove(); wurzel.remove(); }, TINT_MS + 50);
    if (spielen) aktionen.spielen();
  }

  // sanftes schwingen der kamera (yaw in rad), nur solange das menü offen ist
  function schwank(zeitSek) {
    if (!offen || reduziert) return 0;
    if (ersteZeit === null) ersteZeit = zeitSek;
    return Math.sin((zeitSek - ersteZeit) * 0.35) * 0.07;
  }

  if (bereit) oeffne();
  return { oeffne, schliesse, schwank, offen: () => offen, aktualisiereLogin: baueLogin, tint, wurzel };
}
