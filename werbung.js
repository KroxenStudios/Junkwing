import { Konto } from "./accounts.js";
import { zeigePopup, schliessePopup } from "./popups.js";

const L = (de, en) => (window.WG ? WG.L(de, en) : de);
const TAKT = 5 * 60000;
const PAUSE = "jw-werbung-pause";

export function einladungsLink(code) {
  const u = new URL(location.protocol === "junkwing:" ? "https://kroxenstudios.github.io/Junkwing/" : location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("ref", code);
  return u.toString();
}

const heute = () => new Date().toDateString();
const pausiert = () => { try { return localStorage.getItem(PAUSE) === heute(); } catch { return false; } };
const unterwegs = () => document.body.classList.contains("fahr") || document.getElementById("wartePanel")?.hidden === false;
const imWeg = () => unterwegs() || document.visibilityState !== "visible" || document.body.classList.contains("menue") || !!document.querySelector("dialog[open], .jwPopup");

let aufgeschoben = false;

export async function zeigeWerbung() {
  if (!Konto.angemeldet() || pausiert()) return;
  if (imWeg()) { aufgeschoben ||= unterwegs(); return; }
  aufgeschoben = false;
  let ref = Konto.stand.ref;
  if (!ref) return;
  if (!ref.code) {
    try { ref = { ...ref, code: (await Konto.anfrage("GET", "/ref")).code }; } catch { return; }
    Konto.standSetzen({ ref });
  }
  if (!ref.code || imWeg()) return;
  const coins = ref.reward.toLocaleString(WG?.lang === "en" ? "en-GB" : "de-DE");
  zeigePopup({
    id: "werbung",
    titel: L("Freunde werben, Coins verdienen", "Invite friends, earn coins"),
    text: L(
      `Hilf der Community zu wachsen! In diesem Link steckt dein Einladungscode: Dein Freund muss sich darüber ein Konto erstellen. Ist er dann ${ref.days} Tage in Folge online, bekommst du ${coins} Coins (höchstens ${ref.max} Mal). Damit kaufst du dir Pakete und Effekte im Shop.`,
      `Help the community grow! This link contains your invite code: your friend has to create an account through it. Once they are online ${ref.days} days in a row, you get ${coins} coins (up to ${ref.max} times). Use them for packs and effects in the shop.`),
    kopieren: [["Link", einladungsLink(ref.code)]],
    knopf: L("Schließen", "Close"),
    zweit: { text: L("Heute nicht mehr", "Not again today"), tu: () => { try { localStorage.setItem(PAUSE, heute()); } catch {} } },
    dauer: 30000
  });
}

export function startWerbung() {
  let warUnterwegs = false;
  const wechsel = new MutationObserver(() => {
    const jetzt = unterwegs();
    if (jetzt === warUnterwegs) return;
    warUnterwegs = jetzt;
    if (jetzt) schliessePopup("werbung");
    else if (aufgeschoben) setTimeout(zeigeWerbung, 4000);
  });
  wechsel.observe(document.body, { attributeFilter: ["class"] });
  const warte = document.getElementById("wartePanel");
  if (warte) wechsel.observe(warte, { attributeFilter: ["hidden"] });
  setInterval(zeigeWerbung, TAKT);
}
