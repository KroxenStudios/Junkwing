import { Konto } from "./accounts.js";
import { zeigePopup } from "./popups.js";

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
const imWeg = () => document.visibilityState !== "visible" || document.body.classList.contains("menue") || !!document.querySelector("dialog[open], .jwPopup");

export async function zeigeWerbung() {
  if (!Konto.angemeldet() || pausiert() || imWeg()) return;
  let ref = Konto.stand.ref;
  if (!ref) return;
  if (!ref.code) {
    try { ref = { ...ref, code: (await Konto.anfrage("GET", "/ref")).code }; } catch { return; }
    Konto.standSetzen({ ref });
  }
  if (!ref.code) return;
  const coins = ref.reward.toLocaleString(WG?.lang === "en" ? "en-GB" : "de-DE");
  zeigePopup({
    id: "werbung",
    titel: L("Freunde werben, Coins verdienen", "Invite friends, earn coins"),
    text: L(
      `Hilf der Community zu wachsen! Legt jemand über deinen Link oder mit deinem Code ein Konto an und ist ${ref.days} Tage in Folge online, bekommst du ${coins} Coins (höchstens ${ref.max} Mal). Damit kaufst du dir Pakete und Effekte im Shop.`,
      `Help the community grow! If someone creates an account with your link or code and is online ${ref.days} days in a row, you get ${coins} coins (up to ${ref.max} times). Use them for packs and effects in the shop.`),
    kopieren: [[L("Code", "Code"), ref.code], [L("Link", "Link"), einladungsLink(ref.code)]],
    knopf: L("Schließen", "Close"),
    zweit: { text: L("Heute nicht mehr", "Not again today"), tu: () => { try { localStorage.setItem(PAUSE, heute()); } catch {} } },
    dauer: 30000
  });
}

export const startWerbung = () => setInterval(zeigeWerbung, TAKT);
