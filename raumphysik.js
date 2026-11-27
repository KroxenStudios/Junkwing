import * as PH from "./physik.js";
import * as BAU from "./bau.js";
import * as FK from "./fightkarten.js";
import { WASSER_Y, MEERBODEN, hafenDaten } from "./meerdaten.js";
import { hoeheBei } from "./weltdaten.js";
import { baueGelaendeKollision, baueWeltKollision } from "./weltphysik.js";
import { sitzRechte, filtereEingabe, fremdeEingabe, mischeEingaben } from "./eingabe.js";

export const SCHRITT = PH.PHYSIK_TAKT;
const MAX_SCHRITTE = 6;
const MAX_FAHRZEUGE = 24;
const r3 = v => Math.round(v * 1000) / 1000;
const endlich = (...zahlen) => zahlen.every(Number.isFinite);

function freierStartOk(d, x, y, z) {
  if (!endlich(x, y, z)) return false;
  const hf = hafenDaten(d);
  const imSpawn = Math.abs(x) < 800 && z > -1600 && z < 300;
  const imHafen = Math.abs(x - hf.x) < 200 && z > hf.kaiVon - 50 && z < hf.kante + 100;
  if (!imSpawn && !imHafen) return false;
  const boden = Math.max(hoeheBei(d, x, z), WASSER_Y);
  return y > boden - 1 && y < boden + 40;
}

export class RaumPhysik {
  constructor(R, weltDaten = null) {
    this.R = R;
    this.welt = weltDaten;
    this.world = PH.weiteGrenze(new R.World({ x: 0, y: -9.81, z: 0 }));
    this.fahrzeuge = new Map();
    this.karten = new Map();
    this.akku = 0;
    this.schritte = 0;
    if (weltDaten) baueWeltKollision(R, this.world, weltDaten, MEERBODEN);
  }

  karteBereit(platz) {
    if (this.karten.has(platz)) return this.karten.get(platz);
    const k = FK.KARTEN[platz];
    const f = k ? k.erzeuge() : null;
    if (!f) return null;
    baueGelaendeKollision(this.R, this.world, f.daten);
    this.karten.set(platz, f);
    return f;
  }

  pruefeStart(st, platz) {
    if (!st || !Array.isArray(st.basis) || !Array.isArray(st.dreh)) return null;
    const [x, y, z] = st.basis.map(Number), [qx, qy, qz, qw] = st.dreh.map(Number);
    if (!endlich(x, y, z, qx, qy, qz, qw)) return null;
    const l = Math.hypot(qx, qy, qz, qw);
    if (l < 0.5 || l > 1.5) return null;
    if (platz >= 0) {
      const f = this.karteBereit(platz);
      if (!f) return null;
      if (!f.spawns.some(s => Math.hypot(s.x - x, s.z - z) < 40)) return null;
      const boden = f.hoehe(x, z);
      const hoch = Math.max(boden, this.welt ? WASSER_Y : -1e9);
      if (y < hoch - 1 || y > hoch + 40) return null;
    } else {
      if (!this.welt || !freierStartOk(this.welt, x, y, z)) return null;
    }
    return { basis: [x, y, z], drehung: { x: qx / l, y: qy / l, z: qz / l, w: qw / l } };
  }

  starte(id, plan, start, opts = {}) {
    this.entferne(id);
    if (this.fahrzeuge.size >= MAX_FAHRZEUGE) return false;
    const veh = PH.erzeugeFahrzeug(this.R, this.world, plan, { basis: start.basis, drehung: start.drehung, verbrauch: opts.verbrauch !== false, kampf: !!opts.kampf });
    this.fahrzeuge.set(id, { id, veh, plan, start, eingabe: null, sitze: new Map(), spN: 0, log: [], logN: 0 });
    return true;
  }

  entferne(id) {
    const f = this.fahrzeuge.get(id);
    if (!f) return;
    PH.entferneFahrzeug(this.world, f.veh);
    this.fahrzeuge.delete(id);
  }

  hat(id) { return this.fahrzeuge.has(id); }

  fahrerEingabe(id, roh) {
    const f = this.fahrzeuge.get(id);
    if (!f) return;
    if (!Array.isArray(roh)) { f.eingabe = null; return; }
    const [gas, lenk, bremse, tasten, nick, roll, motor, sitz] = roh;
    const achsen = {};
    if (Number.isFinite(nick) && nick) achsen.nick = Math.max(-1, Math.min(1, nick));
    if (Number.isFinite(roll) && roll) achsen.roll = Math.max(-1, Math.min(1, roll));
    f.eingabe = filtereEingabe({
      gas: Math.max(-1, Math.min(1, Number(gas) || 0)), lenk: Math.max(-1, Math.min(1, Number(lenk) || 0)), bremse: !!bremse, achsen,
      tasten: new Set(Array.isArray(tasten) ? tasten.filter(t => typeof t === "string" && t.length <= 12).slice(0, 24) : [])
    }, f.plan, Number.isInteger(sitz) ? sitz : f.veh.ana.sitz);
    if (typeof motor === "boolean") f.veh.motorAn = motor;
  }

  mitfahrerEingaben(id, liste) {
    const f = this.fahrzeuge.get(id);
    if (!f) return;
    f.sitze = new Map();
    for (const { sitz, ei } of liste) {
      const e = fremdeEingabe(ei, f.plan, sitz);
      if (e) f.sitze.set(sitz, e);
    }
  }

  logSync(f) {
    const reihe = f.veh.sprengReihe;
    while (f.logN + 1 < reihe.length) {
      const laenge = 2 + reihe[f.logN + 1];
      f.log.push(...reihe.slice(f.logN, f.logN + laenge));
      f.logN += laenge;
    }
  }

  schadenAnwenden(id, sp, zs) {
    const f = this.fahrzeuge.get(id);
    if (!f) return;
    if (Array.isArray(sp)) {
      while (f.spN + 1 < sp.length) {
        const i = sp[f.spN], anzahl = sp[f.spN + 1];
        if (!Number.isInteger(i) || !Number.isInteger(anzahl) || anzahl < 0 || anzahl > 4096 || f.spN + 2 + anzahl > sp.length) break;
        const liste = sp.slice(f.spN + 2, f.spN + 2 + anzahl);
        f.spN += 2 + anzahl;
        this.logSync(f);
        let doppelt = false;
        for (let k = 0; k + 1 < f.log.length; k += 2 + f.log[k + 1]) {
          if (f.log[k] === i && f.log[k + 1] === anzahl && liste.every((n, j) => f.log[k + 2 + j] === n)) { doppelt = true; break; }
        }
        if (doppelt || !f.plan.parts[i] || !liste.every(n => Number.isInteger(n) && f.plan.parts[n])) continue;
        PH.sprenge(f.veh, i, liste);
        f.log.push(i, anzahl, ...liste);
      }
    }
    if (Array.isArray(zs)) for (const i of zs.slice(0, 4096)) if (Number.isInteger(i) && f.plan.parts[i]) f.veh.zerstoert.add(i);
  }

  schritt(dtMs) {
    if (!this.fahrzeuge.size) { this.akku = 0; return 0; }
    this.akku += Math.min(dtMs, 250) / 1000;
    let n = 0;
    while (this.akku >= SCHRITT && n < MAX_SCHRITTE) {
      this.einSchritt();
      this.akku -= SCHRITT;
      n++;
    }
    if (n === MAX_SCHRITTE) this.akku = 0;
    return n;
  }

  einSchritt() {
    for (const f of this.fahrzeuge.values()) {
      const veh = f.veh;
      const ein = mischeEingaben([...(f.eingabe ? [f.eingabe] : []), ...f.sitze.values()]);
      PH.schritt(this.world, veh, ein, SCHRITT);
      PH.heliumKraefte(veh, SCHRITT);
      PH.wasserKraefte(veh, WASSER_Y, SCHRITT);
    }
    this.world.step();
    this.schritte++;
    PH.geschosse.length = 0;
    PH.muendungen.length = 0;
    PH.einschlaege.length = 0;
    for (const f of this.fahrzeuge.values()) {
      const b = f.veh.bodies[0];
      const t = b?.rb.translation();
      if (!t || !endlich(t.x, t.y, t.z) || t.y < -2000) this.starte(f.id, f.plan, f.start, { verbrauch: f.veh.verbrauch, kampf: f.veh.kampf });
    }
  }

  zustand(id, dt = 1 / 30) {
    const f = this.fahrzeuge.get(id);
    if (!f) return null;
    const veh = f.veh;
    this.logSync(f);
    const b = veh.bodies.map(k => {
      const t = k.rb.translation(), q = k.rb.rotation();
      return [r3(t.x), r3(t.y), r3(t.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w)];
    });
    const w = [];
    for (const z of PH.radZustand(veh, dt)) w.push(z.teil, r3(z.feder), r3(z.lenk), r3(z.dreh % 1000));
    const fx = [...veh.fx].map(([i, s]) => [i, r3(s * 10)]);
    const g = [];
    veh.gelenke.forEach((j, i) => { if (!j.aktiv) g.push(i); });
    const sb = PH.sitzKoerper(veh);
    return {
      b, w, fx, g,
      sp: f.log, sh: [veh.schussZaehler, ...veh.schussReihe], zs: [...veh.zerstoert],
      v: r3(PH.tempo(veh)), mo: veh.motorAn ? 1 : 0,
      tk: [...veh.tank.menge].map(([i, m]) => [i, r3(m)]),
      mu: [...(veh.munition || [])].map(([i, n]) => [i, n]),
      h: sb ? r3(sb.rb.translation().y) : 0,
      nl: [...veh.nachladen].map(([i, t]) => [i, r3(t)])
    };
  }

  schliesse() {
    for (const id of [...this.fahrzeuge.keys()]) this.entferne(id);
  }
}
