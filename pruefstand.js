import { STANDARD_MOTOR_PS, radRadius } from "./bau.js";
import { LEERLAUF, ROTBEREICH, GAENGE, ACHSE, anbauten, ladeZiel, traegeNach, messwerte } from "./motorwerk.js";

const L = (de, en) => (window.WG ? WG.L(de, en) : de);
const HOCH = 8, HALTEN = 1.6, AUS = 2.2;
const UNTEN = LEERLAUF / ROTBEREICH;
const FARBE = { ps: "#ffb347", nm: "#4aa3ff" };

function knoten(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function startPruefstand({ wurzel, plan, melde }) {
  let tafel = null, lauf = null, gang = 3, mitNox = false;
  const anzeigen = {};
  let blatt, startKnopf, noxKnopf, spitzenZeile;
  let kurve = [];

  function motorLeistung() {
    const motoren = plan().parts.filter(p => p.t === "motor");
    return motoren.reduce((s, p) => s + (p.k?.ps ?? STANDARD_MOTOR_PS), 0);
  }

  function baue() {
    tafel = knoten("section", "pruefstand");
    tafel.setAttribute("aria-label", L("Prüfstand", "Test bench"));
    const zu = knoten("button", "pruefZu", "✕");
    zu.type = "button";
    zu.ariaLabel = L("Schließen", "Close");
    zu.onclick = schliesse;
    const kopf = knoten("header");
    kopf.append(knoten("strong", "", L("Prüfstand", "Test bench")), zu);

    const werte = knoten("div", "pruefWerte");
    for (const [id, name, einheit] of [
      ["drehzahl", L("Drehzahl", "Engine speed"), "U/min"],
      ["ps", L("Motorleistung", "Engine power"), "PS"],
      ["nm", L("Drehmoment", "Torque"), "Nm"],
      ["rad", L("Reifen", "Tyres"), "U/min"],
      ["kmh", L("Tempo am Rad", "Wheel speed"), "km/h"],
      ["bar", L("Ladedruck", "Boost"), "bar"]
    ]) {
      const zelle = knoten("div", "pruefZelle " + id);
      anzeigen[id] = knoten("b", "", "0");
      zelle.append(knoten("small", "", name), anzeigen[id], knoten("i", "", L(einheit, einheit.replace("U/min", "rpm").replace("PS", "hp"))));
      werte.append(zelle);
    }

    blatt = knoten("canvas", "pruefKurve");
    blatt.width = 600;
    blatt.height = 200;

    const leiste = knoten("div", "pruefLeiste");
    startKnopf = knoten("button", "primaer");
    startKnopf.type = "button";
    startKnopf.onclick = () => (lauf ? halte() : zuende());
    const wahl = knoten("select");
    wahl.ariaLabel = L("Gang", "Gear");
    GAENGE.forEach((_, i) => wahl.append(new Option(`${L("Gang", "Gear")} ${i + 1}`, i + 1, false, i + 1 === gang)));
    wahl.onchange = () => { gang = Number(wahl.value); };
    noxKnopf = knoten("button", "pruefNox", "NOx");
    noxKnopf.type = "button";
    noxKnopf.onclick = () => { mitNox = !mitNox; beschrifte(); };
    leiste.append(startKnopf, wahl, noxKnopf);

    spitzenZeile = knoten("p", "pruefSpitze");
    tafel.append(kopf, werte, blatt, leiste, spitzenZeile);
    wurzel.append(tafel);
  }

  function beschrifte() {
    const hatNox = anbauten(plan().parts).nox > 0;
    startKnopf.textContent = lauf ? L("Stopp", "Stop") : L("Motor starten", "Start engine");
    noxKnopf.disabled = !hatNox;
    noxKnopf.classList.toggle("an", mitNox && hatNox);
    noxKnopf.setAttribute("aria-pressed", String(mitNox && hatNox));
  }

  function zuende() {
    if (!motorLeistung()) return melde(L("Für den Prüfstand braucht das Fahrzeug einen Motor-Baustein", "The test bench needs an engine block on the vehicle"));
    lauf = { t: 0, spool: 0, besteP: [0, 0], besteM: [0, 0] };
    kurve = [];
    spitzenZeile.textContent = "";
    beschrifte();
  }

  function halte() {
    lauf = null;
    zeige(null, 0);
    beschrifte();
  }

  function zeige(w, rad, tempo = 0) {
    const zahl = (id, v, stellen = 0) => { anzeigen[id].textContent = v.toFixed(stellen); };
    zahl("drehzahl", w?.drehzahl ?? 0);
    zahl("ps", w?.ps ?? 0);
    zahl("nm", w?.nm ?? 0);
    zahl("rad", rad);
    zahl("kmh", tempo);
    zahl("bar", w?.bar ?? 0, 2);
  }

  function male() {
    const g = blatt.getContext("2d");
    const { width: b, height: h } = blatt;
    g.clearRect(0, 0, b, h);
    g.strokeStyle = "#ffffff18";
    g.lineWidth = 1;
    g.beginPath();
    for (let n = 1; n < 4; n++) { g.moveTo(0, (h * n) / 4); g.lineTo(b, (h * n) / 4); }
    for (let n = 1; n < 7; n++) { const x = (b * n * 1000) / ROTBEREICH; g.moveTo(x, 0); g.lineTo(x, h); }
    g.stroke();
    for (const art of ["nm", "ps"]) {
      const dach = Math.max(1, ...kurve.map(k => k[art])) * 1.12;
      g.strokeStyle = FARBE[art];
      g.lineWidth = 3;
      g.beginPath();
      kurve.forEach((k, n) => g[n ? "lineTo" : "moveTo"]((k.drehzahl / ROTBEREICH) * b, h - (k[art] / dach) * h));
      g.stroke();
    }
  }

  function takt(dt) {
    if (!lauf) return null;
    const nenn = motorLeistung();
    if (!nenn) { halte(); return null; }
    lauf.t += dt;
    const { t } = lauf;
    if (t > HOCH + HALTEN + AUS) { halte(); return null; }
    const steigt = t < HOCH, begrenzt = !steigt && t < HOCH + HALTEN;
    let u = steigt ? UNTEN + (1 - UNTEN) * (t / HOCH) : 1;
    if (begrenzt) u = 0.975 + 0.025 * Math.sign(Math.sin(t * 38));
    if (!steigt && !begrenzt) u = 1 - (1 - UNTEN) * ((t - HOCH - HALTEN) / AUS);
    const gas = steigt || begrenzt;
    lauf.spool = traegeNach(lauf.spool, gas ? ladeZiel(u) : 0, dt);
    const teile = anbauten(plan().parts);
    const w = messwerte(nenn, teile, u, lauf.spool, mitNox && gas);
    const antrieb = plan().parts.find(p => p.t.startsWith("rad_") && p.t !== "rad_bock" && p.k?.antrieb !== false);
    const rad = antrieb ? w.drehzahl / (GAENGE[gang - 1] * ACHSE) : 0;
    const tempo = antrieb ? rad * radRadius(antrieb) * Math.PI * 0.12 : 0;
    zeige(w, rad, tempo);
    if (steigt) {
      kurve.push(w);
      if (w.ps > lauf.besteP[0]) lauf.besteP = [w.ps, w.drehzahl];
      if (w.nm > lauf.besteM[0]) lauf.besteM = [w.nm, w.drehzahl];
      male();
    } else {
      const [p, pu] = lauf.besteP, [m, mu] = lauf.besteM;
      spitzenZeile.textContent = `${L("Spitze", "Peak")}: ${p.toFixed(0)} ${L("PS", "hp")} @ ${pu.toFixed(0)} · ${m.toFixed(0)} Nm @ ${mu.toFixed(0)}`;
    }
    const fx = new Map();
    plan().parts.forEach((p, i) => {
      if (p.t === "auspuff") fx.set(i, 0.25 + 0.75 * (gas ? u : 0));
      else if (gas && w.glut && (p.t === "turbo" || p.t === "lader")) fx.set(i, w.glut);
      else if (w.spritzt && p.t === "nox") fx.set(i, 1);
    });
    return { fx, radTempo: rad * Math.PI / 30 };
  }

  function schliesse() {
    lauf = null;
    tafel?.remove();
    tafel = null;
  }

  return {
    oeffne() {
      if (!tafel) baue();
      beschrifte();
      zeige(null, 0);
      male();
    },
    schliesse,
    offen: () => !!tafel,
    takt
  };
}
