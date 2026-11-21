// kampfrunde: zeit, punkte, kill-feed, ergebnis, arena-grenze und kraftpunkte im fight-modus
// der server (bastelkarre-online) fuehrt die runde, dieses modul zeigt sie an und setzt die lokalen regeln um
import * as THREE from "three";
import * as PH from "./physik.js";
import * as FK from "./fightkarten.js";

export const MUTATOR_TEXTE = {
  eile: ["Schnelllader", "Alle Geschütze laden doppelt so schnell nach."],
  glas: ["Glaskanone", "Nur 2 Leben statt 3."]
};
const ARENA_FRIST = 6;
const KRAFT_WIEDER = 15;
const KRAFT_RADIUS = 3.5;

function el(tag, id, klasse = "") {
  const e = document.createElement(tag);
  e.id = id;
  if (klasse) e.className = klasse;
  e.hidden = true;
  return e;
}

export function erzeugeRunde(c) {
  const runde = { n: 0, p: "k", r: 0, mut: "", ki: {}, to: {}, ka: [], aktiv: false, kfN: 0, res: null };
  const hud = el("div", "rundeHud");
  const feed = el("div", "killFeed");
  const erg = el("div", "ergebnis");
  c.game.append(hud, feed, erg);
  let arenaZeit = 0;
  let ergebnisSchluessel = "";
  const kraft = [];
  let kraftSchluessel = "";

  const name = id => (id === c.id() ? c.name() : c.andere().get(id)?.name || c.npcs()?.name?.(id) || "?");

  // mutator der runde auf ein fahrzeug anwenden (eigenes und bots)
  function mutatorAnwenden(v) {
    if (!v) return;
    v.nachladeFaktor = runde.mut === "eile" ? 0.5 : 1;
    v.leben = runde.mut === "glas" ? 2 : PH.AVATAR_LEBEN;
  }
  function mutatorAlle() {
    mutatorAnwenden(c.fahrzeug());
    for (const v of c.npcs()?.fahrzeuge() || []) mutatorAnwenden(v);
  }

  function zeigeKill(killer, opfer) {
    feed.hidden = false;
    const z = document.createElement("div");
    const a = document.createElement("b");
    a.textContent = killer ? name(killer) : c.tr("Unfall");
    a.className = killer === c.id() ? "ich" : "";
    const pfeil = document.createElement("i");
    pfeil.textContent = " ✖ ";
    const b = document.createElement("b");
    b.textContent = name(opfer);
    b.className = opfer === c.id() ? "ich" : "";
    z.append(a, pfeil, b);
    feed.prepend(z);
    while (feed.children.length > 5) feed.lastChild.remove();
    setTimeout(() => { z.remove(); if (!feed.children.length) feed.hidden = true; }, 7000);
    if (killer === c.id()) c.meldung(`+3 · ${name(opfer)}`, 1500);
  }

  function rundeStart() {
    arenaZeit = 0;
    if (c.fightAn()) {
      c.neu();
      c.meldung(`${c.tr("Runde")} ${runde.n}`, 2500);
    }
    mutatorAlle();
  }

  // state-nachricht des servers
  function verarbeite(m) {
    const rd = m.rd;
    if (!rd) { runde.aktiv = false; hud.hidden = true; erg.hidden = true; return; }
    runde.aktiv = true;
    if (rd.n < runde.n) runde.kfN = 0;
    const neu = rd.n !== runde.n;
    runde.p = rd.p;
    runde.r = rd.r;
    runde.mut = rd.mut || "";
    runde.ki = m.ki || {};
    runde.to = m.to || {};
    runde.ka = Array.isArray(m.ka) ? m.ka : [];
    for (const f of m.kf || []) {
      if (Array.isArray(f) && f[0] > runde.kfN) { runde.kfN = f[0]; zeigeKill(f[1], f[2]); }
    }
    if (neu) {
      const erste = runde.n === 0;
      runde.n = rd.n;
      if (erste) mutatorAlle(); else rundeStart();
    }
    runde.res = rd.p === "e" && Array.isArray(m.res) ? m.res : null;
    zeichneErgebnis();
    zeichneHud();
  }

  function zeit(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function rang() {
    const pt = c.punkte();
    const meine = pt[c.id()] || 0;
    let platz = 1, fuehrer = null, best = -1;
    for (const [id, v] of Object.entries(pt)) {
      if (id !== c.id() && v > meine) platz++;
      if (v > best) { best = v; fuehrer = id; }
    }
    return { platz, meine, fuehrer, best };
  }

  function zeichneHud() {
    const an = c.fightAn() && runde.aktiv;
    hud.hidden = !an;
    if (!an) return;
    const modus = FK.KARTEN_MODI[c.karteNr()] || "basen";
    const r = rang();
    const mut = MUTATOR_TEXTE[runde.mut];
    const text = [
      `${c.tr(FK.MODUS_NAMEN[modus])}`,
      runde.p === "k" ? zeit(runde.r) : c.tr("Ergebnis"),
      `${c.tr("Punkte")} ${r.meine}`,
      `${c.tr("Platz")} ${r.platz}`,
      `${runde.ki[c.id()] || 0} ✖ / ${runde.to[c.id()] || 0} ☠`
    ].join(" · ");
    const kopf = r.fuehrer && r.fuehrer !== c.id() ? `\n♛ ${name(r.fuehrer)} ${r.best}` : r.fuehrer ? "\n♛" : "";
    hud.dataset.zeit = runde.r < 15 && runde.p === "k" ? "knapp" : "";
    const gesamt = text + kopf + (mut ? `\n⚡ ${c.tr(mut[0])}` : "");
    if (hud.textContent !== gesamt) hud.textContent = gesamt;
  }

  function zeichneErgebnis() {
    const an = c.fightAn() && runde.res;
    if (!an) { erg.hidden = true; ergebnisSchluessel = ""; return; }
    const sk = `${runde.n}|${runde.r}|${runde.res.length}`;
    if (sk === ergebnisSchluessel) return;
    ergebnisSchluessel = sk;
    erg.hidden = false;
    erg.replaceChildren();
    const h = document.createElement("h2");
    const sieger = runde.res[0];
    h.textContent = sieger ? `${c.tr("Sieger")}: ${sieger.name}` : c.tr("Runde vorbei");
    const tab = document.createElement("table");
    runde.res.slice(0, 8).forEach((z, i) => {
      const tr = document.createElement("tr");
      if (z.id === c.id()) tr.className = "ich";
      for (const t of [`${i + 1}.`, z.name, `${z.pt}`, `${z.k} ✖`, `${z.t} ☠`]) {
        const td = document.createElement("td");
        td.textContent = t;
        tr.append(td);
      }
      tab.append(tr);
    });
    const unten = document.createElement("div");
    unten.className = "ergUnten";
    const info = document.createElement("span");
    info.textContent = `${c.tr("Nächste Runde in")} ${runde.r} s`;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = c.tr("Andere Karte");
    b.onclick = () => c.zufallskarte();
    unten.append(info, b);
    erg.append(h, tab, unten);
  }

  // kraftpunkte: herz (+1 leben) und schutz (5 s unverwundbar), nur fuer den eigenen spieler, kehren nach 15 s zurueck
  function baueKraft() {
    for (const k of kraft) { k.mesh.removeFromParent(); k.mesh.geometry.dispose(); k.mesh.material.dispose(); }
    kraft.length = 0;
    const f = c.fightAn() ? c.karte() : null;
    if (!f || c.karteNr() >= FK.EIGENER_PLATZ) return;
    const b = f.basen, mitte = f.mitte;
    const kandidaten = [[mitte[0], mitte[1]]];
    b.forEach((p, i) => { const q = b[(i + 1) % b.length]; kandidaten.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); });
    let nr = 0;
    for (const [x, z] of kandidaten) {
      if (b.some(p => Math.hypot(p[0] - x, p[1] - z) < 26)) continue;
      const typ = nr++ % 2 === 0 ? "herz" : "schutz";
      const mat = new THREE.MeshBasicMaterial({ color: typ === "herz" ? 0xff4a6a : 0x4ad0ff, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), mat);
      mesh.position.set(x, f.hoehe(x, z) + 1.6, z);
      c.scene.add(mesh);
      kraft.push({ mesh, typ, bis: 0 });
    }
  }

  function pflegeKraft(dt, zeitS) {
    const an = c.fightAn();
    const schluessel = an ? `${c.karteNr()}|${runde.n}` : "";
    if (schluessel !== kraftSchluessel) { kraftSchluessel = schluessel; baueKraft(); }
    if (!an) return;
    const v = c.fahrzeug();
    const t = v && !v.tot ? (PH.sitzKoerper(v) || v.bodies[0])?.rb.translation() : null;
    for (const k of kraft) {
      const da = zeitS >= k.bis;
      k.mesh.visible = da;
      if (!da) continue;
      k.mesh.rotation.y += dt * 2;
      k.mesh.position.y += Math.sin(zeitS * 3 + k.mesh.position.x) * dt * 0.3;
      if (!t) continue;
      const d = Math.hypot(t.x - k.mesh.position.x, t.z - k.mesh.position.z);
      if (d > KRAFT_RADIUS || Math.abs(t.y - k.mesh.position.y) > 5) continue;
      if (k.typ === "herz") {
        if (v.avatarTreffer <= 0) continue;
        v.avatarTreffer--;
        c.meldung(`+1 ${c.tr("Leben")}`, 1500);
      } else {
        v.schutz = Math.max(v.schutz, 5);
        c.meldung(c.tr("Schutz 5 s"), 1500);
      }
      k.bis = zeitS + KRAFT_WIEDER;
    }
  }

  // arena-grenze: wer sich zu weit von der kartenmitte entfernt, hat 6 s zeit zurueckzukehren
  function pflegeArena(dt) {
    const v = c.fahrzeug();
    if (!c.fightAn() || !v || v.tot || c.karteNr() >= FK.EIGENER_PLATZ) { arenaZeit = 0; return; }
    const f = c.karte();
    const t = (PH.sitzKoerper(v) || v.bodies[0])?.rb.translation();
    if (!f || !t) return;
    const d = Math.hypot(t.x - f.mitte[0], t.z - f.mitte[1]);
    if (d <= FK.ARENA_RADIUS) { arenaZeit = 0; return; }
    const alt = Math.ceil(ARENA_FRIST - arenaZeit);
    arenaZeit += dt;
    const neu = Math.ceil(ARENA_FRIST - arenaZeit);
    if (neu !== alt || arenaZeit === dt) c.meldung(`${c.tr("Zurück in die Arena!")} ${Math.max(0, neu)}`, 1100);
    if (arenaZeit >= ARENA_FRIST) v.tot = "arena";
  }

  function aktualisiere(dt, zeitS) {
    pflegeArena(dt);
    pflegeKraft(dt, zeitS);
    if (runde.aktiv) zeichneHud();
  }

  return { runde, verarbeite, aktualisiere, mutatorAnwenden, zeichneHud };
}
