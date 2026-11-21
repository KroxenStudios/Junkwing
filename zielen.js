import * as BAU from "./bau.js";
import * as PH from "./physik.js";

const WAFFEN = new Set(["geschuetz", "schnellfeuer"]);
const G = 9.81;
const VORHALT_AB = 20;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const laenge = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = laenge(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

function relWinkel(qa, qb, achse) {
  const ax = -qa.x, ay = -qa.y, az = -qa.z, aw = qa.w;
  const x = aw * qb.x + ax * qb.w + ay * qb.z - az * qb.y;
  const y = aw * qb.y - ax * qb.z + ay * qb.w + az * qb.x;
  const z = aw * qb.z + ax * qb.y - ay * qb.x + az * qb.w;
  const w = aw * qb.w - ax * qb.x - ay * qb.y - az * qb.z;
  let ang = 2 * Math.atan2(x * achse[0] + y * achse[1] + z * achse[2], w);
  if (ang > Math.PI) ang -= 2 * Math.PI;
  if (ang < -Math.PI) ang += 2 * Math.PI;
  return ang;
}

function nachgelagert(veh, gel) {
  const menge = new Set([gel.bodyB]);
  let neu = true;
  while (neu) {
    neu = false;
    for (const h of veh.gelenke) {
      if (!h.aktiv || h === gel) continue;
      if (menge.has(h.bodyA) && !menge.has(h.bodyB) && h.bodyB !== gel.bodyA) { menge.add(h.bodyB); neu = true; }
    }
  }
  return menge;
}

export function richtMotoren(veh) {
  const out = [];
  for (const gel of veh.gelenke) {
    if (!gel.aktiv || (gel.art !== "servo" && gel.art !== "mikro")) continue;
    const teil = veh.plan.parts[gel.teil];
    if (teil?.k?.richt !== true || veh.zerstoert.has(gel.teil)) continue;
    const koerper = nachgelagert(veh, gel);
    const waffe = veh.plan.parts.findIndex((p, i) => WAFFEN.has(p.t) && !veh.zerstoert.has(i) && koerper.has(veh.ana.bodyOf[i]));
    if (waffe >= 0) out.push({ gel, teil, waffe });
  }
  return out;
}

function sollRichtung(von, ziel, tempo) {
  const d = sub(ziel, von);
  const hor = Math.hypot(d[0], d[2]);
  if (tempo <= 0 || hor < VORHALT_AB) return norm(d);
  const v2 = tempo * tempo, h = d[1];
  const disc = v2 * v2 - G * (G * hor * hor + 2 * h * v2);
  const tan = disc < 0 ? v2 / (G * hor) : (v2 - Math.sqrt(disc)) / (G * hor);
  const w = Math.atan(tan);
  return [d[0] / hor * Math.cos(w), Math.sin(w), d[2] / hor * Math.cos(w)];
}

export function richtTasten(veh, ziel, dt = 1 / 60) {
  const tasten = new Set();
  for (const m of richtMotoren(veh)) {
    const mund = PH.muendungPos(veh, m.waffe);
    if (!mund) continue;
    const f = norm(mund.dir);
    const d = sollRichtung(mund.pos, ziel, PH.geschossTempo(veh, m.waffe));
    const achse = cross(f, d);
    const winkel = Math.atan2(laenge(achse), dot(f, d));
    if (winkel < 1e-4) continue;
    const l = laenge(achse);
    const r = l > 1e-6 ? [achse[0] / l * winkel, achse[1] / l * winkel, achse[2] / l * winkel] : [0, winkel, 0];

    const k = m.teil.k || {};
    const mikro = m.gel.art === "mikro";
    const tempo = (mikro ? Math.min(BAU.MIKRO_TEMPO, k.tempo ?? BAU.MIKRO_TEMPO) : (k.tempo ?? 90)) * Math.PI / 180;
    const schwelle = Math.max(0.004, 0.5 * tempo * dt);
    const rbA = veh.bodies[m.gel.bodyA]?.rb, rbB = veh.bodies[m.gel.bodyB]?.rb;
    if (!rbA || !rbB) continue;

    const geschwindigkeit = (achseWelt, plus, minus) => {
      const bedarf = dot(r, achseWelt);
      if (bedarf > schwelle && plus) tasten.add(plus);
      else if (bedarf < -schwelle && minus) tasten.add(minus);
    };
    const stellung = (achseWelt, istWinkel, max, plus, minus) => {
      const soll = Math.max(-max, Math.min(max, istWinkel + dot(r, achseWelt)));
      const diff = soll - (m.gel.ziel || 0);
      if (diff > schwelle && plus) tasten.add(plus);
      else if (diff < -schwelle && minus) tasten.add(minus);
    };

    const achseA = norm(PH.quatRot(rbA.rotation(), m.gel.dir));
    if (mikro) {
      geschwindigkeit(achseA, k.plus, k.minus);
      if (m.gel.ring) {
        const quer = BAU.teilAchse(m.teil, [1, 0, 0]);
        stellung(norm(PH.quatRot(m.gel.ring.rotation(), quer)), relWinkel(m.gel.ring.rotation(), rbB.rotation(), quer), BAU.MIKRO_NEIGUNG * Math.PI / 180, k.hoch, k.runter);
      }
    } else if (k.modus === "dauer") {
      geschwindigkeit(achseA, k.plus, k.minus);
    } else {
      const max = (k.winkel ?? 90) * Math.PI / 180;
      stellung(achseA, relWinkel(rbA.rotation(), rbB.rotation(), m.gel.dir), max < Math.PI - 0.01 ? max : Math.PI, k.plus, k.minus);
    }
  }
  return tasten;
}

export function zielFehlerGrad(veh, ziel) {
  const m = richtMotoren(veh)[0];
  const mund = m && PH.muendungPos(veh, m.waffe);
  if (!mund) return null;
  const d = sollRichtung(mund.pos, ziel, PH.geschossTempo(veh, m.waffe));
  return Math.atan2(laenge(cross(norm(mund.dir), d)), dot(norm(mund.dir), d)) * 180 / Math.PI;
}
