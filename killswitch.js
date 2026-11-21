import { Konto } from "./accounts.js";

const WORKER_HOST = "bastelkarre-online.kroxenstudios.workers.dev";
const EN = !!window.WG && window.WG.lang === "en";

function serverBasis() {
  const p = new URLSearchParams(location.search);
  if (p.get("server")) return p.get("server").replace(/^ws/, "http").replace(/\/ws.*$/, "");
  const eigener = location.host === WORKER_HOST || location.port === "8787";
  return eigener ? `${location.protocol}//${location.host}` : `https://${WORKER_HOST}`;
}

async function status(ticket) {
  const q = ticket ? `?ticket=${encodeURIComponent(ticket)}` : "";
  const r = await fetch(`${serverBasis()}/status${q}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (r.status !== 503) return null;
  const j = await r.json().catch(() => ({}));
  return j && j.killed ? String(j.message || "") : null;
}

async function pruefe() {
  try {
    const sperre = await status();
    if (sperre === null || !Konto.angemeldet()) return sperre;
    const ticket = await Konto.ticket();
    return ticket ? await status(ticket) : sperre;
  } catch {
    return null;
  }
}

function zeigeSperre(text) {
  document.getElementById("splash")?.remove();
  const box = document.createElement("div");
  box.id = "killSperre";
  box.setAttribute("role", "alert");
  box.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;background:#0b0f16;color:#eef4ff;font:16px/1.5 system-ui,sans-serif";
  const titel = document.createElement("h1");
  titel.textContent = EN ? "Junkwing is paused" : "Junkwing pausiert";
  titel.style.cssText = "margin:0;font-size:26px;color:#ffc933";
  const info = document.createElement("p");
  info.textContent = text || (EN ? "The game is temporarily unavailable. Please try again later." : "Das Spiel ist vorübergehend nicht verfügbar. Bitte versuche es später noch einmal.");
  info.style.cssText = "margin:0;max-width:34em;color:#a9bad0";
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.textContent = EN ? "Try again" : "Erneut versuchen";
  knopf.style.cssText = "margin-top:8px;padding:8px 18px;border-radius:8px;border:1px solid #ffc93366;background:#3a2a00;color:#ffc933;font:inherit;cursor:pointer";
  knopf.onclick = () => location.reload();
  box.append(titel, info, knopf);
  document.body.append(box);
}

const sperre = await pruefe();
if (sperre !== null) {
  zeigeSperre(sperre);
  await new Promise(() => {});
}
