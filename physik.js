
import { anbauten, traegeNach, ladeFaktor, glut } from "./motorwerk.js";
import {
  TEILE, ORIENT, ZELLE, RAD_TIEFE, analysiere, zellMitte, teilAchse, radRadius, matVec, sprengZiele,
  STANDARD_MOTOR_PS, munitionKapazitaet, teilMasse, MIKRO_TEMPO, MIKRO_NEIGUNG
} from "./bau.js";

export const PHYSIK_TAKT = 1 / 60;
export const ignoriere = new Set();

export const LUFT0 = 1.2;
export const dichte = h => LUFT0 * Math.exp(-Math.max(0, h) / 1500);
const glatt = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const gravFaktor = h => 1 - glatt(3000, 7000, h);

const MOTOR_LEISTUNG = 55000;
const MOTOR_KRAFT = 5200;
const SCHUB_BASIS = 34;
const FEDER_WEG = 0.2;
const BREMSE = 60;

export function matQuat(m) {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m;
  const tr = m00 + m11 + m22;
  let x, y, z, w;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s;
  }
  return { x, y, z, w };
}

export function quatRot(q, v) {
  const { x, y, z, w } = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x
  ];
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vec = a => ({ x: a[0], y: a[1], z: a[2] });
const arr = v => [v.x, v.y, v.z];

const H = ZELLE / 2 - 0.004;
const KEIL_PUNKTE = [
  [-H, -H, -H], [H, -H, -H], [-H, -H, H], [H, -H, H],
  [-H, H, H], [H, H, H]
];
const ECKE_PUNKTE = [
  [-H, -H, -H], [H, -H, -H], [-H, -H, H], [H, -H, H],
  [H, H, H]
];

function colliderFuer(R, part, lokal) {
  const m = ORIENT[part.o];
  const q = matQuat(m);
  const masse = teilMasse(part);
  let desc;

  switch (part.t) {
    case "block":
    case "panzer":
    case "glas":
    case "helium":
    case "sitz":
    case "tank":
    case "munition":
    case "verschluss":
      desc = R.ColliderDesc.cuboid(H, H, H);
      break;
    case "halb": {
      desc = R.ColliderDesc.cuboid(H, H / 2, H);
      lokal = add(lokal, matVec(m, [0, -ZELLE / 4, 0]));
      break;
    }
    case "keil":
    case "ecke": {
      const pts = (part.t === "keil" ? KEIL_PUNKTE : ECKE_PUNKTE).flatMap(p => matVec(m, p));
      desc = R.ColliderDesc.convexHull(new Float32Array(pts));
      return desc.setTranslation(...lokal).setMass(masse).setFriction(0.7);
    }
    case "leiter":
      desc = R.ColliderDesc.cuboid(0.2, H, 0.05);
      break;
    case "fluegel":
    case "steuerflaeche":
      desc = R.ColliderDesc.cuboid(H, 0.04, H);
      break;
    case "servo":
    case "mikro":
    case "bruch":
      desc = R.ColliderDesc.cuboid(0.2, H, 0.2);
      break;
    case "wand":
      desc = R.ColliderDesc.cuboid(H, 0.04, H);
      lokal = add(lokal, matVec(m, [0, -ZELLE / 2 + 0.04, 0]));
      break;
    case "auspuff":
      desc = R.ColliderDesc.cuboid(0.07, 0.2, 0.07);
      break;
    default:
      desc = R.ColliderDesc.cuboid(0.18, 0.22, 0.18);
  }
  return desc.setTranslation(...lokal).setRotation(q).setMass(masse).setFriction(0.7);
}

const VERSCHMELZ_AB = 60;
const VERSCHMELZ_TYPEN = new Set(["block", "panzer", "glas"]);

function verschmelzeWuerfel(R, world, rb, parts, b, veh) {
  const abgedeckt = new Set();
  const kandidaten = b.parts.filter(i => VERSCHMELZ_TYPEN.has(parts[i].t));
  if (kandidaten.length < VERSCHMELZ_AB) return abgedeckt;
  const zelle = new Map();
  for (const i of kandidaten) zelle.set(`${parts[i].x},${parts[i].y},${parts[i].z}`, { i, m: teilMasse(parts[i]), benutzt: false });
  const frei = (x, y, z, m) => { const c = zelle.get(`${x},${y},${z}`); return c && !c.benutzt && c.m === m ? c : null; };
  const reihenfolge = [...kandidaten].sort((a, c) => parts[a].y - parts[c].y || parts[a].z - parts[c].z || parts[a].x - parts[c].x);
  veh.verschmolzen ||= new Map();
  b.quader ||= [];
  for (const i of reihenfolge) {
    const p = parts[i];
    const start = zelle.get(`${p.x},${p.y},${p.z}`);
    if (start.benutzt) continue;
    const m = start.m;
    let nx = 1, nz = 1, ny = 1;
    while (frei(p.x + nx, p.y, p.z, m)) nx++;
    const zeileFrei = (z, y) => { for (let k = 0; k < nx; k++) if (!frei(p.x + k, y, z, m)) return false; return true; };
    while (zeileFrei(p.z + nz, p.y)) nz++;
    const schichtFrei = y => { for (let q = 0; q < nz; q++) if (!zeileFrei(p.z + q, y)) return false; return true; };
    while (schichtFrei(p.y + ny)) ny++;
    const teile = [];
    let masse = 0;
    for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      const c = zelle.get(`${p.x + x},${p.y + y},${p.z + z}`);
      c.benutzt = true;
      teile.push(c.i);
      masse += c.m;
    }
    const mitte = sub([(p.x + nx / 2) * ZELLE, (p.y + ny / 2) * ZELLE, (p.z + nz / 2) * ZELLE], b.ursprung);
    const desc = R.ColliderDesc.cuboid(nx * ZELLE / 2 - 0.004, ny * ZELLE / 2 - 0.004, nz * ZELLE / 2 - 0.004)
      .setTranslation(...mitte).setMass(masse).setFriction(0.7);
    const col = world.createCollider(desc, rb);
    veh.colliderSet.add(col.handle);
    const rec = { col, teile, body: b };
    b.quader.push(rec);
    veh.verschmolzen.set(col.handle, rec);
    for (const t of teile) { abgedeckt.add(t); veh.verschmolzen.set("t" + t, rec); }
  }
  return abgedeckt;
}

function entmischeKoerper(veh, b) {
  if (!b.quader?.length) return;
  const { R, world } = veh;
  for (const rec of b.quader) {
    veh.colliderSet.delete(rec.col.handle);
    veh.verschmolzen.delete(rec.col.handle);
    world.removeCollider(rec.col, true);
    for (const i of rec.teile) {
      veh.verschmolzen.delete("t" + i);
      const p = veh.plan.parts[i];
      const lokal = sub(zellMitte(p), b.ursprung);
      const col = world.createCollider(colliderFuer(R, p, lokal), b.rb);
      veh.colliderSet.add(col.handle);
      veh.colliderVon.set(i, col);
    }
  }
  b.quader = [];
}

function teilAnPunkt(veh, b, punkt, dir) {
  const rot = b.rb.rotation();
  const inv = { x: -rot.x, y: -rot.y, z: -rot.z, w: rot.w };
  const karte = zellenKarte(veh);
  const innen = add(punkt, scale(dir, 0.04));
  const l = add(quatRot(inv, sub(innen, arr(b.rb.translation()))), b.ursprung);
  return karte.get(`${Math.floor(l[0] / ZELLE)},${Math.floor(l[1] / ZELLE)},${Math.floor(l[2] / ZELLE)}`) ?? -1;
}

export function erzeugeFahrzeug(R, world, bauplan, opts = {}) {
  const basis = opts.basis || [0, 0, 0];
  const dreh = opts.drehung || { x: 0, y: 0, z: 0, w: 1 };
  const kin = !!opts.kinematisch;
  const ana = analysiere(bauplan);
  const parts = bauplan.parts;

  const sitz = ana.sitz >= 0 ? parts[ana.sitz] : null;
  const vorwaerts = sitz ? teilAchse(sitz, [0, 0, -1]) : [0, 0, -1];

  let gm = 0, gs = [0, 0, 0];
  for (const b of ana.bodies) { gm += b.masse; gs = add(gs, scale(b.ursprung, b.masse)); }
  const schwerpunkt = gm > 0 ? scale(gs, 1 / gm) : [0, 0, 0];

  const veh = {
    plan: bauplan, ana, kin, vorwaerts, bodies: [], gelenke: [],
    colliderSet: new Set(), motorAn: true, lenkung: 0,
    fx: new Map(), nebelAn: new Map(), raketen: new Map(), schirme: new Map(), ruder: new Map(), servoZiel: new Map(),
    tasteVorher: new Set(), angetrieben: new Set(),
    licht: new Map(), hebel: new Map(), gruppe: [], sprengung: new Map(), gadget: new Map(), schildE: new Map(),
    sprengPos: new Map(), R, world, colliderVon: new Map(), neuGetrennt: [], sprengReihe: [], abgeloest: new Set(),
    tank: { menge: new Map(), aktiv: false }, verbrauch: opts.verbrauch !== false,
    kampf: !!opts.kampf, zerstoert: new Set(), nachladen: new Map(), geschossArt: new Map(), schussReihe: [], schussZaehler: 0,
    tot: null, avatarTreffer: 0, schutz: 0, spielerId: opts.spielerId ?? null, letzterTaeter: null, taeterZeit: 0,
    leben: AVATAR_LEBEN, nachladeFaktor: 1
  };

  for (let bi = 0; bi < ana.bodies.length; bi++) {
    const b = ana.bodies[bi];
    const pos = add(basis, quatRot(dreh, b.ursprung));
    const desc = kin ? R.RigidBodyDesc.kinematicPositionBased() : R.RigidBodyDesc.dynamic();
    desc.setTranslation(...pos).setRotation(dreh).setCanSleep(false);
    if (!kin) desc.setLinearDamping(0.05).setAngularDamping(0.3).setCcdEnabled(true);
    const rb = world.createRigidBody(desc);

    const nurRaeder = b.parts.every(i => TEILE[parts[i].t].rad);
    const body = { rb, index: bi, ursprung: b.ursprung, parts: b.parts, vc: null, raeder: [], loseRaeder: nurRaeder };

    const verschmolzen = !kin && !nurRaeder ? verschmelzeWuerfel(R, world, rb, parts, body, veh) : new Set();

    for (const i of b.parts) {
      if (verschmolzen.has(i)) continue;
      const p = parts[i];
      const lokal = sub(zellMitte(p), b.ursprung);
      const def = TEILE[p.t];

      if (def.rad && !nurRaeder) {
        const md = R.ColliderDesc.ball(0.1).setTranslation(...lokal).setMass(teilMasse(p))
          .setCollisionGroups(0).setSolverGroups(0);
        veh.colliderSet.add(world.createCollider(md, rb).handle);
        continue;
      }

      let cd;
      if (def.rad) {
        cd = R.ColliderDesc.cylinder(0.11, radRadius(p)).setTranslation(...lokal)
          .setRotation(matQuat(ORIENT[p.o])).setMass(teilMasse(p)).setFriction(1.0);
      } else {
        cd = colliderFuer(R, p, lokal);
      }
      const col = world.createCollider(cd, rb);
      veh.colliderSet.add(col.handle);
      veh.colliderVon.set(i, col);
    }

    const radTeile = nurRaeder ? [] : b.parts.filter(i => TEILE[parts[i].t].rad);
    if (radTeile.length && !kin) {
      const vc = world.createVehicleController(rb);
      body.vc = vc;
      for (const i of radTeile) {
        const p = parts[i];
        const r = radRadius(p);
        const mitte = sub(zellMitte(p), b.ursprung);
        let achse = teilAchse(p);
        achse = [achse[0], 0, achse[2]];
        if (!achse[0] && !achse[2]) achse = cross(vorwaerts, [0, 1, 0]);
        if (dot(cross([0, 1, 0], achse), vorwaerts) < 0) achse = scale(achse, -1);

        vc.addWheel(vec(add(mitte, [0, FEDER_WEG - RAD_TIEFE, 0])), { x: 0, y: -1, z: 0 }, vec(achse), FEDER_WEG, r);
        const w = vc.numWheels() - 1;
        const hart = p.t === "rad_bock" ? 3 : 1;
        vc.setWheelSuspensionStiffness(w, (hart * 9.81) / (RAD_TIEFE * radTeile.length));
        vc.setWheelSuspensionCompression(w, 2.6 * Math.sqrt(hart));
        vc.setWheelSuspensionRelaxation(w, 3.4 * Math.sqrt(hart));
        vc.setWheelMaxSuspensionTravel(w, p.t === "rad_bock" ? 0.08 : 0.18);
        vc.setWheelMaxSuspensionForce(w, 200000);
        vc.setWheelFrictionSlip(w, p.t === "rad_bock" ? 0.6 : 2.2);
        vc.setWheelSideFrictionStiffness(w, p.t === "rad_bock" ? 0 : 1.1);

        let lenkFaktor = 0;
        if (p.t === "rad_lenk") {
          const hinten = dot(sub(zellMitte(p), schwerpunkt), vorwaerts) < 0;
          const umkehr = p.k.umkehr === "ja" || (p.k.umkehr !== "nein" && hinten);
          lenkFaktor = (umkehr ? -1 : 1) * (p.k.winkel ?? 35) * Math.PI / 180;
        }
        body.raeder.push({
          teil: i, w, r, lenkFaktor,
          antrieb: p.t !== "rad_bock" && p.k.antrieb !== false,
          bock: p.t === "rad_bock",
          mitte, drehung: 0, schwenk: 0,
          achsVz: dot(achse, teilAchse(p)) < 0 ? -1 : 1
        });
      }
    }
    veh.bodies.push(body);
  }

  if (!kin) wasserVorbereiten(veh);

  if (!kin) {
    for (const g of ana.gelenke) {
      const A = veh.bodies[g.bodyA], B = veh.bodies[g.bodyB];
      const teil = parts[g.teil];
      const anker = add(zellMitte(teil), scale(g.dir, ZELLE / 2));
      const a1 = vec(sub(anker, A.ursprung));
      const a2 = vec(sub(anker, B.ursprung));
      if (g.art === "mikro") {
        const rbA = A.rb;
        const ringPos = add(arr(rbA.translation()), quatRot(rbA.rotation(), sub(anker, A.ursprung)));
        const ringDesc = R.RigidBodyDesc.dynamic().setTranslation(...ringPos).setRotation(rbA.rotation()).setCanSleep(false)
          .setLinearDamping(0.05).setAngularDamping(0.3)
          .setAdditionalMassProperties(40, { x: 0, y: 0, z: 0 }, { x: 25, y: 25, z: 25 }, { x: 0, y: 0, z: 0, w: 1 });
        const ring = world.createRigidBody(ringDesc);
        world.createCollider(R.ColliderDesc.ball(0.05).setMass(0.001).setCollisionGroups(0).setSolverGroups(0), ring);
        const nullPunkt = { x: 0, y: 0, z: 0 };
        const quer = matVec(ORIENT[teil.o], [1, 0, 0]);
        const jGier = world.createImpulseJoint(R.JointData.revolute(a1, nullPunkt, vec(g.dir)), A.rb, ring, true);
        jGier.setContactsEnabled(false);
        const jNick = world.createImpulseJoint(R.JointData.revolute(nullPunkt, a2, vec(quer)), ring, B.rb, true);
        jNick.setContactsEnabled(false);
        const frei = world.createImpulseJoint(R.JointData.generic(a1, a2, { x: 0, y: 1, z: 0 }, 0), A.rb, B.rb, true);
        frei.setContactsEnabled(false);
        const grenze = MIKRO_NEIGUNG * Math.PI / 180;
        jNick.setLimits(-grenze, grenze);
        jNick.configureMotorPosition(0, 30000, 3000);
        jNick.setMotorMaxForce((teil.k.haltekraft ?? 100) * 1000);
        jGier.configureMotorVelocity(0, 40);
        jGier.setMotorMaxForce((teil.k.haltekraft ?? 100) * 1000);
        veh.gelenke.push({ ...g, j: jGier, jNick, ring, aktiv: true, ziel: 0 });
        continue;
      }
      let data;
      if (g.art === "servo") data = R.JointData.revolute(a1, a2, vec(g.dir));
      else data = R.JointData.fixed(a1, { x: 0, y: 0, z: 0, w: 1 }, a2, { x: 0, y: 0, z: 0, w: 1 });
      const j = world.createImpulseJoint(data, A.rb, B.rb, true);
      j.setContactsEnabled(false);

      const gel = { ...g, j, aktiv: true, ziel: 0 };
      if (g.art === "servo") {
        const w = (teil.k.winkel ?? 90) * Math.PI / 180;
        if (teil.k.modus !== "dauer" && w < Math.PI - 0.01) j.setLimits(-w, w);
        j.configureMotorPosition(0, 600, 60);
        j.setMotorMaxForce((teil.k.haltekraft ?? 100) * 1000);
      }
      veh.gelenke.push(gel);
    }
  }

  let gesamtMasse = 0;
  for (const b of veh.bodies) gesamtMasse += b.rb.mass();
  veh.motorFaktor = Math.max(1, Math.min(3, Math.sqrt(gesamtMasse / 450)));

  for (let i = 0; i < parts.length; i++) {
    if (parts[i].t === "tank") veh.tank.menge.set(i, parts[i].k.kapazitaet ?? 60);
  }
  veh.tank.aktiv = veh.tank.menge.size > 0;
  veh.munition = new Map();
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].t === "munition") veh.munition.set(i, munitionKapazitaet(parts[i].k.kaliber));
  }
  berechneGruppen(veh);
  veh.verbundenStart = verbundeneTeile(veh);

  aktualisiereAntrieb(veh);
  return veh;
}

function beruhige(koerper, sitz, v, dt) {
  const bleibt = Math.exp(-dt * Math.min(18, (v - 90) / 15));
  const schief = cross(quatRot(sitz.rb.rotation(), [0, 1, 0]), [0, 1, 0]);
  const zurueck = Math.min(9, (v - 90) / 25) * dt;
  for (const b of koerper) {
    const w = b.rb.angvel();
    b.rb.setAngvel({ x: w.x * bleibt + schief[0] * zurueck, y: w.y, z: w.z * bleibt + schief[2] * zurueck }, true);
  }
}

function nachschieben(veh, v, ml, gas, radKraft, dt) {
  const angetrieben = veh.bodies.filter(b => !veh.angetrieben.size || veh.angetrieben.has(b.index));
  const amBoden = angetrieben.some(b => b.vc && b.raeder.some(r => r.antrieb && b.vc.wheelIsInContact(r.w)));
  const sitz = sitzKoerper(veh);
  veh.haftung = amBoden ? 0.8 : Math.max(0, (veh.haftung || 0) - dt);
  if (!sitz || !veh.haftung) return;
  if (v > 90) beruhige(angetrieben, sitz, v, dt);
  if (!amBoden) return;
  const masse = fahrzeugMasse(veh);
  const ende = SCHUB_BASIS * ml ** 0.86;
  const rest = Math.max(0, 1 - v / ende);
  const soll = ml > 1 && rest > 0 ? masse * (0.05 * v + Math.min(30, 2 + ml) * rest) * gas : 0;
  const dreh = sitz.rb.rotation();
  const vor = quatRot(dreh, veh.vorwaerts);
  const zusatz = Math.max(0, soll - radKraft);
  for (const b of angetrieben) {
    const teil = (b.rb.mass() / masse) * dt;
    b.rb.applyImpulse(vec(scale(vor, zusatz * teil)), true);
  }
}

export function weiteGrenze(world, einheit = 5) {
  const p = world.integrationParameters;
  p.lengthUnit = einheit;
  p.normalizedAllowedLinearError /= einheit;
  p.normalizedPredictionDistance /= einheit;
  return world;
}

export function motorFaktor(veh) {
  let hat = false, summe = 0;
  veh.plan.parts.forEach((p, i) => {
    if (p.t !== "motor") return;
    hat = true;
    const bi = veh.ana.bodyOf[i];
    if (veh.zerstoert.has(i) || (veh.angetrieben.size && !veh.angetrieben.has(bi))) return;
    summe += p.k?.ps ?? STANDARD_MOTOR_PS;
  });
  return (hat ? summe : STANDARD_MOTOR_PS) / STANDARD_MOTOR_PS;
}

export function motorPS(veh) {
  return Math.round(veh.psJetzt ?? motorFaktor(veh) * STANDARD_MOTOR_PS);
}

function aufladen(veh, eingabe, grund, dt) {
  const teile = veh.plan.parts;
  const heil = i => !veh.zerstoert.has(i) && !(veh.angetrieben.size && !veh.angetrieben.has(veh.ana.bodyOf[i]));
  const hatMotor = grund > 0 && teile.some((p, i) => p.t === "motor" && heil(i));
  const last = veh.motorAn && hatMotor ? Math.abs(eingabe.gas) : 0;
  veh.spool = traegeNach(veh.spool || 0, last, dt);
  veh.noxRest ||= new Map();
  const a = anbauten(teile, i => hatMotor && teile[i].t !== "nox" && heil(i));
  let schuss = 0;
  const spritzt = [];
  teile.forEach((p, i) => {
    if (p.t !== "nox" || !last || eingabe.gas <= 0 || !heil(i) || !eingabe.tasten?.has(p.k?.taste)) return;
    const rest = veh.noxRest.get(i) ?? p.k?.dauer ?? 12;
    if (rest <= 0) return;
    veh.noxRest.set(i, rest - dt);
    schuss += p.k?.ps ?? 100;
    spritzt.push(i);
  });
  const druck = last ? ladeFaktor(a, veh.spool) : 1;
  const gesamt = grund * druck + schuss / STANDARD_MOTOR_PS;
  veh.psJetzt = gesamt * STANDARD_MOTOR_PS;
  for (const i of spritzt) veh.fx.set(i, 1);
  const feuer = last > 0.5 ? glut(druck) : 0;
  if (feuer) teile.forEach((p, i) => { if ((p.t === "turbo" || p.t === "lader") && heil(i)) veh.fx.set(i, feuer); });
  return gesamt;
}

export function fahrzeugMasse(veh) {
  let m = 0;
  for (const b of veh.bodies) if (!veh.angetrieben.size || veh.angetrieben.has(b.index)) m += b.rb.mass();
  return m;
}

function berechneGruppen(veh) {
  const n = veh.bodies.length;
  veh.gruppe = new Array(n).fill(-1);
  let id = 0;
  for (let s = 0; s < n; s++) {
    if (veh.gruppe[s] >= 0) continue;
    veh.gruppe[s] = id;
    const stack = [s];
    while (stack.length) {
      const b = stack.pop();
      for (const g of veh.gelenke) {
        if (!g.aktiv) continue;
        const o = g.bodyA === b ? g.bodyB : g.bodyB === b ? g.bodyA : -1;
        if (o >= 0 && veh.gruppe[o] < 0) {
          veh.gruppe[o] = id;
          stack.push(o);
        }
      }
    }
    id++;
  }
}

export function entnimm(veh, koerper, menge) {
  const t = veh.tank;
  if (!t.aktiv || !veh.verbrauch) return 1;
  const gid = veh.gruppe[koerper];
  let summe = 0;
  const liste = [];
  for (const [i, m] of t.menge) {
    if (m > 0 && veh.gruppe[veh.ana.bodyOf[i]] === gid) {
      liste.push(i);
      summe += m;
    }
  }
  if (summe <= 0) return 0;
  if (menge <= 0) return 1;
  const nimm = Math.min(menge, summe);
  for (const i of liste) t.menge.set(i, t.menge.get(i) - nimm * (t.menge.get(i) / summe));
  return nimm / menge;
}

export function tankStand(veh, koerper) {
  let menge = 0, kap = 0;
  for (const [i, m] of veh.tank.menge) {
    if (veh.gruppe[veh.ana.bodyOf[i]] === veh.gruppe[koerper]) {
      menge += m;
      kap += veh.plan.parts[i].k.kapazitaet ?? 60;
    }
  }
  return { menge, kap, aktiv: veh.tank.aktiv && veh.verbrauch };
}

function aktualisiereAntrieb(veh) {
  veh.angetrieben.clear();
  const start = veh.ana.sitzBody;
  if (start < 0) return;
  const stack = [start];
  veh.angetrieben.add(start);
  while (stack.length) {
    const b = stack.pop();
    for (const g of veh.gelenke) {
      if (!g.aktiv) continue;
      const other = g.bodyA === b ? g.bodyB : g.bodyB === b ? g.bodyA : -1;
      if (other >= 0 && !veh.angetrieben.has(other)) {
        veh.angetrieben.add(other);
        stack.push(other);
      }
    }
  }
}

export function entferneFahrzeug(world, veh) {
  for (const g of veh.gelenke) if (g.ring) world.removeRigidBody(g.ring);
  for (const b of veh.bodies) {
    if (b.vc) world.removeVehicleController(b.vc);
    world.removeRigidBody(b.rb);
  }
  veh.bodies = [];
}

export function punktGeschw(rb, p) {
  const v = rb.linvel(), w = rb.angvel(), c = rb.translation();
  const r = [p[0] - c.x, p[1] - c.y, p[2] - c.z];
  return add(arr(v), cross(arr(w), r));
}

export function sitzKoerper(veh) {
  return veh.ana.sitzBody >= 0 ? veh.bodies[veh.ana.sitzBody] : veh.bodies[0];
}

export function tempo(veh) {
  if (veh.serverTempo !== undefined) return veh.serverTempo;
  const b = sitzKoerper(veh);
  if (!b) return 0;
  const f = quatRot(b.rb.rotation(), veh.vorwaerts);
  return dot(arr(b.rb.linvel()), f);
}

const ZUEND_DAUER = { konfetti: 3, rauchwerfer: 6, fackel: 12, feuerloescher: 3 };
const ZUEND_LADEZEIT = 8;
const SCHILD_LAUFZEIT = 45;
const SCHILD_LADEZEIT = 30;
const SCHILD_MIN = 0.3;

export function steuere(world, veh, eingabe, dt) {
  const parts = veh.plan.parts;
  const tasten = eingabe.tasten || new Set();
  const neu = new Set([...tasten].filter(t => !veh.tasteVorher.has(t)));
  veh.tasteVorher = new Set(tasten);
  veh.fx.clear();

  for (const b of veh.bodies) {
    const h = b.rb.translation().y;
    const luft = dichte(h) / LUFT0;
    b.rb.setGravityScale(gravFaktor(h), false);
    if (!veh.kin) {
      b.rb.setLinearDamping(0.05 * luft);
      b.rb.setAngularDamping(0.02 + 0.28 * luft);
    }
  }

  const v = tempo(veh);
  const ml = aufladen(veh, eingabe, motorFaktor(veh), dt);
  let gas = veh.motorAn && ml > 0 ? eingabe.gas : 0;
  if (gas !== 0) gas *= entnimm(veh, Math.max(0, veh.ana.sitzBody), 0.15 * ml * Math.abs(gas) * dt);

  const mf = veh.motorFaktor || 1;
  let kraft = 0, bremsen = eingabe.bremse ? BREMSE * mf : 0;
  if (gas > 0) {
    if (v < -0.8) bremsen = Math.max(bremsen, BREMSE * mf * gas);
    else {
      kraft = Math.min(MOTOR_KRAFT * mf * ml, (MOTOR_LEISTUNG * mf * ml) / Math.max(Math.abs(v), 1), fahrzeugMasse(veh) * 14) * gas;
      nachschieben(veh, v, ml, gas, kraft, dt);
    }
  } else if (gas < 0) {
    if (v > 0.8) bremsen = Math.max(bremsen, BREMSE * mf * -gas);
    else if (v > -9) kraft = MOTOR_KRAFT * mf * ml * 0.45 * gas;
  } else if (!eingabe.bremse) {
    bremsen = 1.2 * mf;
  }

  veh.lenkung += (eingabe.lenk - veh.lenkung) * Math.min(1, dt * 9);
  const lenkTempo = 1 / (1 + Math.abs(v) / 18);

  let anzahlAntrieb = 0;
  for (const b of veh.bodies) {
    if (!b.vc || !veh.angetrieben.has(b.index)) continue;
    for (const r of b.raeder) if (r.antrieb) anzahlAntrieb++;
  }

  for (const b of veh.bodies) {
    if (!b.vc) continue;
    const verbunden = veh.angetrieben.has(b.index);
    for (const r of b.raeder) {
      const f = verbunden && r.antrieb && anzahlAntrieb ? kraft / anzahlAntrieb : 0;
      b.vc.setWheelEngineForce(r.w, f);
      b.vc.setWheelBrake(r.w, r.bock ? 0.02 : verbunden ? bremsen : 0.8);
      b.vc.setWheelSteering(r.w, verbunden ? -veh.lenkung * r.lenkFaktor * lenkTempo : 0);
    }
  }

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const k = p.k || {};
    switch (p.t) {
      case "auspuff":
        if (veh.motorAn) veh.fx.set(i, 0.25 + 0.75 * Math.abs(eingabe.gas));
        break;
      case "nebel": {
        if (neu.has(k.taste)) veh.nebelAn.set(i, !veh.nebelAn.get(i));
        if (veh.nebelAn.get(i)) veh.fx.set(i, 1);
        break;
      }
      case "duese":
        if (tasten.has(k.taste)) {
          const f = entnimm(veh, veh.ana.bodyOf[i], 0.6 * (k.schub ?? 4) * dt);
          if (f > 0) {
            schub(veh, i, (k.schub ?? 4) * 1000 * f, dt);
            veh.fx.set(i, 1);
          }
        }
        break;
      case "propeller": {
        const richtung = (tasten.has(k.plus) ? 1 : 0) - (tasten.has(k.minus) ? 1 : 0);
        const h = Math.max(0, Math.min(1, (veh.hebel.get(i) ?? 0) + richtung * 0.7 * dt));
        veh.hebel.set(i, h);
        if (h > 0.01) {
          const bi = veh.ana.bodyOf[i];
          const b = veh.bodies[bi];
          const f = entnimm(veh, bi, 0.3 * (k.schub ?? 4) * h * dt);
          if (f > 0) {
            const rot = b.rb.rotation();
            const dir = quatRot(rot, scale(teilAchse(p), -1));
            const punkt = add(arr(b.rb.translation()), quatRot(rot, sub(zellMitte(p), b.ursprung)));
            const luft = dichte(punkt[1]) / LUFT0;
            const n = (k.schub ?? 4) * 1000 * h * f * luft;
            b.rb.applyImpulseAtPoint(vec(scale(dir, n * dt)), vec(punkt), true);
            veh.fx.set(i, Math.max(0.05, h * f));
          }
        }
        break;
      }
      case "scheinwerfer":
      case "unterboden":
      case "strahler":
      case "blinker":
      case "blaulicht":
      case "laser":
      case "stoersender":
        if (neu.has(k.taste)) veh.licht.set(i, !veh.licht.get(i));
        if (veh.licht.get(i)) veh.fx.set(i, 1);
        break;
      case "funken":
      case "regenbogen":
      case "staubspur":
      case "plasma": {
        const s = Math.min(1, (Math.abs(v) - 2) / 14);
        if (s > 0.02) veh.fx.set(i, Math.max(0.1, s));
        break;
      }
      case "konfetti":
      case "rauchwerfer":
      case "fackel":
      case "feuerloescher": {
        const dauer = ZUEND_DAUER[p.t];
        let z = veh.gadget.get(i);
        if (z === undefined && neu.has(k.taste)) z = 0;
        else if (z !== undefined) { z += dt; if (z > dauer + ZUEND_LADEZEIT) z = undefined; }
        if (z === undefined) veh.gadget.delete(i);
        else {
          veh.gadget.set(i, z);
          if (z < dauer) veh.fx.set(i, Math.max(0.1, 1 - z / dauer));
        }
        break;
      }
      case "schild": {
        let e = veh.schildE.get(i) ?? 1;
        if (neu.has(k.taste) && (veh.licht.get(i) || e >= SCHILD_MIN)) veh.licht.set(i, !veh.licht.get(i));
        if (veh.licht.get(i)) {
          e -= dt / SCHILD_LAUFZEIT;
          if (e <= 0) { e = 0; veh.licht.set(i, false); }
        } else e = Math.min(1, e + dt / SCHILD_LADEZEIT);
        veh.schildE.set(i, e);
        if (veh.licht.get(i)) veh.fx.set(i, Math.max(0.1, e));
        break;
      }
      case "verschluss": {
        if (veh.zerstoert.has(i)) break;
        const rest = Math.max(0, (veh.nachladen.get(i) ?? 0) - dt);
        veh.nachladen.set(i, rest);
        if (k.wechsel && neu.has(k.wechsel)) veh.geschossArt.set(i, (artVon(veh, i) + 1) % ARTEN.length);
        if (rest <= 0 && tasten.has(k.taste)) {
          const faktor = schiesse(veh, i);
          if (faktor) veh.nachladen.set(i, (0.4 + ((k.durchmesser ?? 75) / 155) * 1.6) * faktor * veh.nachladeFaktor);
        }
        break;
      }
      case "schnellfeuer": {
        if (veh.zerstoert.has(i)) break;
        const rest = Math.max(0, (veh.nachladen.get(i) ?? 0) - dt);
        veh.nachladen.set(i, rest);
        if (rest <= 0 && tasten.has(k.taste) && schnellSchuss(veh, i)) veh.nachladen.set(i, SCHNELL_TAKT * veh.nachladeFaktor);
        break;
      }
      case "explosive": {
        let st = veh.sprengung.get(i);
        if (!st && neu.has(k.taste)) {
          st = { zeit: 0 };
          veh.sprengung.set(i, st);
          sprenge(veh, i);
          if (veh.kampf) schadenAn(veh, veh.sprengPos.get(i), k.reichweite ?? 3, -1);
        } else if (st) {
          st.zeit += dt;
        }
        if (st && st.zeit < BLITZ_DAUER) veh.fx.set(i, 1 - st.zeit / BLITZ_DAUER);
        break;
      }
      case "tank":
        veh.fx.set(i, Math.min(1, (veh.tank.menge.get(i) ?? 0) / Math.max(1, k.kapazitaet ?? 60)));
        break;
      case "rakete": {
        const dauer = k.dauer ?? 3;
        const st = veh.raketen.get(i) || { treibstoff: dauer, leer: false };
        if (tasten.has(k.taste) && !st.leer && st.treibstoff > 0) {
          st.treibstoff -= dt;
          schub(veh, i, (k.schub ?? 14) * 1000, dt);
          veh.fx.set(i, 1);
          if (st.treibstoff <= 0) st.leer = true;
        } else {
          st.treibstoff = Math.min(dauer, st.treibstoff + dt * dauer / 6);
          if (st.leer && st.treibstoff >= dauer) st.leer = false;
        }
        veh.raketen.set(i, st);
        break;
      }
      case "fluegel":
        aero(veh, i, k.flaeche ?? 4, 0, dt);
        break;
      case "steuerflaeche": {
        const max = Math.max(0.01, ((k.winkel ?? 25) * Math.PI) / 180);
        const analog = eingabe.achsen?.[k.kanal] ?? 0;
        const richtung = Math.max(-1, Math.min(1, (tasten.has(k.plus) ? 1 : 0) - (tasten.has(k.minus) ? 1 : 0) + analog)) * (k.gegenlauf ? -1 : 1);
        let d = veh.ruder.get(i) ?? 0;
        const schritt = 3 * dt;
        d += Math.max(-schritt, Math.min(schritt, richtung * max - d));
        veh.ruder.set(i, d);
        aero(veh, i, k.flaeche ?? 1.5, d, dt);
        veh.fx.set(i, 0.5 + (0.5 * d) / max);
        break;
      }
      case "fallschirm": {
        const st = veh.schirme.get(i) || { an: false, offen: 0 };
        if (neu.has(k.taste)) st.an = !st.an;
        st.offen = st.an ? Math.min(1, st.offen + dt * 2) : Math.max(0, st.offen - dt * 4);
        if (st.offen > 0) {
          luftwiderstand(veh, i, (k.flaeche ?? 12) * st.offen, dt);
          veh.fx.set(i, st.offen);
        }
        veh.schirme.set(i, st);
        break;
      }
    }
  }

  let getrennt = false;
  for (const g of veh.gelenke) {
    if (!g.aktiv) continue;
    const k = parts[g.teil].k || {};
    if (g.art === "bruch") {
      if (neu.has(k.taste)) {
        trenne(world, veh, g);
        getrennt = true;
      }
      continue;
    }
    const richtung = (tasten.has(k.plus) ? 1 : 0) - (tasten.has(k.minus) ? 1 : 0);
    if (g.art === "mikro") {
      const tempoMikro = Math.min(MIKRO_TEMPO, k.tempo ?? MIKRO_TEMPO) * Math.PI / 180;
      const kraft = (richtung !== 0 ? (k.drehkraft ?? 100) : (k.haltekraft ?? 100)) * 1000;
      g.j.setMotorMaxForce(kraft);
      g.j.configureMotorVelocity(richtung * tempoMikro, 40);
      const nick = (tasten.has(k.hoch) ? 1 : 0) - (tasten.has(k.runter) ? 1 : 0);
      const maxNick = MIKRO_NEIGUNG * Math.PI / 180;
      g.ziel = Math.max(-maxNick, Math.min(maxNick, g.ziel + nick * tempoMikro * dt));
      g.jNick.setMotorMaxForce((nick !== 0 ? (k.drehkraft ?? 100) : (k.haltekraft ?? 100)) * 1000);
      g.jNick.configureMotorPosition(g.ziel, 30000, 3000);
      continue;
    }
    const tempoRad = (k.tempo ?? 90) * Math.PI / 180;
    g.j.setMotorMaxForce((richtung !== 0 ? (k.drehkraft ?? 100) : (k.haltekraft ?? 100)) * 1000);
    if (k.modus === "dauer") {
      g.j.configureMotorVelocity(richtung * tempoRad, 40);
    } else {
      const max = (k.winkel ?? 90) * Math.PI / 180;
      g.ziel += richtung * tempoRad * dt;
      if (max < Math.PI - 0.01) g.ziel = Math.max(-max, Math.min(max, g.ziel));
      g.j.configureMotorPosition(g.ziel, 600, 60);
    }
  }
  if (getrennt) aktualisiereAntrieb(veh);
}

const STALL = 0.3;
function aero(veh, i, flaeche, delta, dt) {
  const b = veh.bodies[veh.ana.bodyOf[i]];
  if (!b) return;
  const p = veh.plan.parts[i];
  const rot = b.rb.rotation();
  const n = quatRot(rot, matVec(ORIENT[p.o], [0, Math.cos(delta), -Math.sin(delta)]));
  const punkt = add(arr(b.rb.translation()), quatRot(rot, sub(zellMitte(p), b.ursprung)));
  const v = punktGeschw(b.rb, punkt);
  const tempo = Math.hypot(...v);
  if (tempo < 1) return;
  const vh = scale(v, 1 / tempo);
  const vn = dot(vh, n);
  const alpha = Math.asin(Math.min(1, Math.abs(vn)));
  const cl = alpha < STALL ? 4.5 * alpha : Math.sin(2 * alpha);
  const cd = 0.05 + 1.2 * vn * vn;
  const q = 0.5 * dichte(punkt[1]) * tempo * tempo * flaeche;
  const quer = sub(n, scale(vh, vn));
  const ql = Math.hypot(...quer);
  let kraft = scale(vh, -q * cd);
  if (ql > 1e-4) kraft = add(kraft, scale(quer, (-Math.sign(vn) * q * cl) / ql));
  let impuls = scale(kraft, dt);
  const grenze = b.rb.mass() * tempo * 0.4;
  const betrag = Math.hypot(...impuls);
  if (betrag > grenze) impuls = scale(impuls, grenze / betrag);
  b.rb.applyImpulseAtPoint(vec(impuls), vec(punkt), true);
}

const CW = 1.3;
function luftwiderstand(veh, i, flaeche, dt) {
  const b = veh.bodies[veh.ana.bodyOf[i]];
  if (!b) return;
  const p = veh.plan.parts[i];
  const rot = b.rb.rotation();
  const punkt = add(arr(b.rb.translation()), quatRot(rot, sub(zellMitte(p), b.ursprung)));
  const v = punktGeschw(b.rb, punkt);
  const tempo = Math.hypot(...v);
  if (tempo < 0.05) return;
  let impuls = 0.5 * dichte(punkt[1]) * CW * flaeche * tempo * tempo * dt;
  impuls = Math.min(impuls, b.rb.mass() * tempo * 0.5);
  b.rb.applyImpulseAtPoint(vec(scale(v, -impuls / tempo)), vec(punkt), true);
}

function schub(veh, i, newton, dt) {
  const b = veh.bodies[veh.ana.bodyOf[i]];
  if (!b) return;
  const p = veh.plan.parts[i];
  const rot = b.rb.rotation();
  const dir = quatRot(rot, scale(teilAchse(p), -1));
  const punkt = add(arr(b.rb.translation()), quatRot(rot, sub(zellMitte(p), b.ursprung)));
  b.rb.applyImpulseAtPoint(vec(scale(dir, newton * dt)), vec(punkt), true);
}

export function trenne(world, veh, g) {
  if (!g.aktiv) return;
  g.aktiv = false;
  berechneGruppen(veh);
  world.removeImpulseJoint(g.j, true);
  const A = veh.bodies[g.bodyA], B = veh.bodies[g.bodyB];
  const dir = quatRot(A.rb.rotation(), g.dir);
  const m = Math.min(A.rb.mass(), B.rb.mass());
  const stoss = scale(dir, m * 1.2);
  B.rb.applyImpulse(vec(stoss), true);
  A.rb.applyImpulse(vec(scale(stoss, -1)), true);
}

const BLITZ_DAUER = 10;
const STOSS_DAUER = 0.02;

function loeseTeil(veh, n) {
  const { R, world } = veh;
  const part = veh.plan.parts[n];
  if (TEILE[part.t].rad) return loeseRad(veh, n);
  const bi = veh.ana.bodyOf[n];
  const alt = veh.bodies[bi];
  if (alt && veh.verschmolzen?.has("t" + n)) entmischeKoerper(veh, alt);
  const col = veh.colliderVon.get(n);
  if (!alt || !col || veh.abgeloest.has(n) || alt.parts.length < 2) return bi;

  const rot = alt.rb.rotation();
  const mitte = zellMitte(part);
  const pos = add(arr(alt.rb.translation()), quatRot(rot, sub(mitte, alt.ursprung)));
  const v = punktGeschw(alt.rb, pos), w = alt.rb.angvel();

  veh.colliderSet.delete(col.handle);
  world.removeCollider(col, true);

  const desc = veh.kin ? R.RigidBodyDesc.kinematicPositionBased() : R.RigidBodyDesc.dynamic();
  desc.setTranslation(...pos).setRotation(rot).setCanSleep(false);
  if (!veh.kin) desc.setLinearDamping(0.05).setAngularDamping(0.3).setCcdEnabled(true);
  const rb = world.createRigidBody(desc);
  const neu = world.createCollider(colliderFuer(R, part, [0, 0, 0]), rb);
  veh.colliderSet.add(neu.handle);
  veh.colliderVon.set(n, neu);
  if (!veh.kin) {
    rb.setLinvel(vec(v), true);
    rb.setAngvel(w, true);
  }

  const body = { rb, index: veh.bodies.length, ursprung: mitte, parts: [n], vc: null, raeder: [], loseRaeder: false };
  veh.bodies.push(body);
  alt.parts.splice(alt.parts.indexOf(n), 1);
  veh.ana.bodyOf[n] = body.index;
  veh.ana.bodies.push({ parts: [n], masse: teilMasse(part), ursprung: mitte });
  veh.abgeloest.add(n);
  veh.neuGetrennt.push({ teil: n, index: body.index, von: bi });
  return body.index;
}

function loeseRad(veh, n) {
  const { R, world } = veh;
  const part = veh.plan.parts[n];
  const bi = veh.ana.bodyOf[n];
  const alt = veh.bodies[bi];
  if (!alt || veh.abgeloest.has(n) || alt.parts.length < 2) return bi;
  const rot = alt.rb.rotation();
  const mitte = zellMitte(part);
  const pos = add(arr(alt.rb.translation()), quatRot(rot, sub(mitte, alt.ursprung)));
  const v = punktGeschw(alt.rb, pos), w = alt.rb.angvel();

  const rec = alt.raeder.find(r => r.teil === n);
  if (rec && alt.vc) {
    alt.vc.setWheelEngineForce(rec.w, 0);
    alt.vc.setWheelBrake(rec.w, 0);
    alt.vc.setWheelSuspensionStiffness(rec.w, 0);
    alt.vc.setWheelMaxSuspensionForce(rec.w, 0);
    alt.vc.setWheelFrictionSlip(rec.w, 0);
    alt.vc.setWheelSideFrictionStiffness(rec.w, 0);
  }
  if (rec) alt.raeder.splice(alt.raeder.indexOf(rec), 1);

  const desc = veh.kin ? R.RigidBodyDesc.kinematicPositionBased() : R.RigidBodyDesc.dynamic();
  desc.setTranslation(...pos).setRotation(rot).setCanSleep(false);
  if (!veh.kin) desc.setLinearDamping(0.05).setAngularDamping(0.3).setCcdEnabled(true);
  const rb = world.createRigidBody(desc);
  const neu = world.createCollider(
    R.ColliderDesc.cylinder(0.11, radRadius(part)).setRotation(matQuat(ORIENT[part.o])).setMass(teilMasse(part)).setFriction(1.0), rb);
  veh.colliderSet.add(neu.handle);
  veh.colliderVon.set(n, neu);
  if (!veh.kin) {
    rb.setLinvel(vec(v), true);
    rb.setAngvel(w, true);
  }
  const body = { rb, index: veh.bodies.length, ursprung: mitte, parts: [n], vc: null, raeder: [], loseRaeder: true };
  veh.bodies.push(body);
  alt.parts.splice(alt.parts.indexOf(n), 1);
  veh.ana.bodyOf[n] = body.index;
  veh.ana.bodies.push({ parts: [n], masse: teilMasse(part), ursprung: mitte });
  veh.abgeloest.add(n);
  veh.neuGetrennt.push({ teil: n, index: body.index, von: bi });
  return body.index;
}

const PANZER_HP = 120;
export const wandFaktor = p => Math.max(20, Math.min(300, p?.k?.staerke ?? 100)) / 100;
function panzerAbnutzung(veh, n, schaden) {
  veh.panzerSchaden ||= new Map();
  const summe = (veh.panzerSchaden.get(n) ?? 0) + schaden;
  veh.panzerSchaden.set(n, summe);
  return summe >= PANZER_HP * wandFaktor(veh.plan.parts[n]);
}

function teilWeltPos(veh, n) {
  const b = veh.bodies[veh.ana.bodyOf[n]];
  return add(arr(b.rb.translation()), quatRot(b.rb.rotation(), sub(zellMitte(veh.plan.parts[n]), b.ursprung)));
}

export function sprenge(veh, i, vorgabe = null, opts = null) {
  const parts = veh.plan.parts;
  const p = parts[i];
  const k = p.k || {};
  if (!veh.bodies[veh.ana.bodyOf[i]]) return;
  const ursprung = teilWeltPos(veh, i);
  veh.sprengPos.set(i, ursprung);
  const reichweite = opts?.reichweite ?? k.reichweite ?? 3;
  const impuls = (opts?.kraft ?? k.kraft ?? 25) * 1000 * STOSS_DAUER;

  const ziele = vorgabe || sprengZiele(veh.plan, veh.ana, i, n => teilWeltPos(veh, n), reichweite);
  if (!vorgabe && !veh.kin) {
    parts.forEach((q, n) => {
      if (!TEILE[q.t].sprengfest || veh.abgeloest.has(n) || !veh.bodies[veh.ana.bodyOf[n]]) return;
      const c = teilWeltPos(veh, n);
      const d = Math.hypot(c[0] - ursprung[0], c[1] - ursprung[1], c[2] - ursprung[2]);
      if (d > reichweite) return;
      if (panzerAbnutzung(veh, n, (opts?.kraft ?? k.kraft ?? 25) * (1 - d / Math.max(reichweite, 0.01)))) ziele.push(n);
    });
  }
  if (!vorgabe) veh.sprengReihe.push(i, ziele.length, ...ziele);
  for (const n of ziele) loeseTeil(veh, n);
  berechneGruppen(veh);
  aktualisiereAntrieb(veh);
  starteDruckwelle(veh, ursprung, opts?.kraft ?? k.kraft ?? 25, reichweite);
  pruefeTod(veh);
  if (veh.kin) return;

  for (let n = 0; n < parts.length; n++) {
    const q = parts[n];
    const b = veh.bodies[veh.ana.bodyOf[n]];
    if (!b || n === i) continue;
    if (b.parts.some(j => TEILE[parts[j].t].sprengfest)) continue;
    const rot = b.rb.rotation();
    const punkt = add(arr(b.rb.translation()), quatRot(rot, sub(zellMitte(q), b.ursprung)));
    const d = sub(punkt, ursprung);
    const abstand = Math.hypot(...d);
    if (abstand > reichweite) continue;
    const richtung = abstand > 0.05 ? scale(d, 1 / abstand) : [0, 1, 0];
    const faktor = 1 - 0.7 * (abstand / Math.max(reichweite, 0.01));
    b.rb.applyImpulseAtPoint(vec(scale(richtung, impuls * faktor)), vec(punkt), true);
    if (b.parts.length === 1) {
      const dreh = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
      b.rb.applyTorqueImpulse(vec(scale(dreh, impuls * faktor * 0.04)), true);
    }
  }
}

export const TREFFER_AUTORITAET = "opfer";
export const geschosse = [];
export const einschlaege = [];

const GESCHOSS_TEMPO = 800;
const GESCHOSS_LEBEN = 4;
const GESCHOSS_MASSE_155 = 43;
const RUECKSTOSS_ANTEIL = 0.06;
export const ARTEN = ["he", "ap", "heat"];
export const ART_KURZ = ["HE", "AP", "HEAT", "MK"];
const ART_WERTE = [
  { tempo: 1, direkt: 1, radius: 1, impuls: 1 },
  { tempo: 1.2, direkt: 2.2, radius: 0.45, impuls: 1.7 },
  { tempo: 0.85, direkt: 1.3, radius: 0.5, impuls: 0.5 },
  { tempo: 1.2, direkt: 0.35, radius: 0.3, impuls: 0.25 }
];
export function artVon(veh, n) {
  return veh.geschossArt.get(n) ?? Math.max(0, ARTEN.indexOf(veh.plan.parts[n].k.geschoss));
}
const KAMPF_TEILE = new Set(["motor", "turbo", "lader", "nox", "geschuetz", "verschluss", "tank", "munition", "schnellfeuer"]);
const NAHLAGER_FAKTOR = 0.5;

function angrenzend(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z) === 1;
}

function munitionQuelle(veh, iv, dm, art = 0) {
  const parts = veh.plan.parts;
  const gid = veh.gruppe[veh.ana.bodyOf[iv]];
  let beste = -1;
  for (const [n, rest] of veh.munition) {
    if (rest <= 0 || veh.zerstoert.has(n) || veh.gruppe[veh.ana.bodyOf[n]] !== gid) continue;
    if (Math.round(parts[n].k.kaliber ?? 75) !== Math.round(dm)) continue;
    if (Math.max(0, ARTEN.indexOf(parts[n].k.geschoss)) !== art) continue;
    if (angrenzend(parts[n], parts[iv])) return n;
    if (beste < 0) beste = n;
  }
  return beste;
}

export function munitionStand(veh) {
  const out = new Map();
  for (const [n, rest] of veh.munition) {
    if (veh.zerstoert.has(n)) continue;
    const k = veh.plan.parts[n].k;
    const name = `${Math.round(k.kaliber ?? 75)} mm ${ART_KURZ[Math.max(0, ARTEN.indexOf(k.geschoss))]}`;
    out.set(name, (out.get(name) || 0) + rest);
  }
  return out;
}
const TANK_MIN = 0.02;

// tod-regeln: 3 treffer auf den avatar oder fahrzeug zerrissen
export const AVATAR_LEBEN = 3;
const ZUSAMMENHANG_MIN = 0.6;
export const SCHUTZ_ZEIT = 2;

// zaehlt teile, die ueber zellnachbarn noch mit dem sitz verbunden sind
function verbundeneTeile(veh) {
  const parts = veh.plan.parts;
  const start = parts.findIndex((p, i) => p.t === "sitz" && !veh.abgeloest.has(i));
  if (start < 0) return 0;
  const map = zellenKarte(veh);
  const gesehen = new Set([start]);
  const stapel = [start];
  while (stapel.length) {
    const c = parts[stapel.pop()];
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const j = map.get(`${c.x + d[0]},${c.y + d[1]},${c.z + d[2]}`);
      if (j === undefined || gesehen.has(j) || veh.abgeloest.has(j)) continue;
      gesehen.add(j);
      stapel.push(j);
    }
  }
  return gesehen.size;
}

function toete(veh, grund) {
  if (veh.tot) return;
  veh.tot = grund;
}

export function pruefeTod(veh) {
  if (!veh.kampf || veh.kin || veh.tot || veh.schutz > 0) return;
  if (!veh.plan.parts.some(p => p.t === "sitz")) return;
  const start = veh.verbundenStart || 0;
  if (!start) return;
  if (verbundeneTeile(veh) < start * ZUSAMMENHANG_MIN) toete(veh, "zerrissen");
}

export function avatarGetroffen(veh) {
  if (!veh.kampf || veh.tot || veh.schutz > 0) return false;
  veh.avatarTreffer++;
  if (veh.avatarTreffer >= veh.leben) toete(veh, "treffer");
  return true;
}

// druckwellen: breiten sich mit schallgeschwindigkeit aus, bis der druck verpufft
export const druckwellen = [];
const WELLEN_TEMPO = 340;
const WELLEN_MIN = 1.5;
const WELLEN_MAX = 12;

function druckBei(w, d) {
  const ref = Math.max(1, w.ref);
  return w.kraft * Math.pow(ref / Math.max(d, ref), 2);
}

export function starteDruckwelle(quelle, punkt, kraft, reichweite) {
  if (kraft <= WELLEN_MIN) return;
  druckwellen.push({ quelle, p: [...punkt], kraft, ref: reichweite, r: reichweite, schon: new Set() });
  while (druckwellen.length > WELLEN_MAX) druckwellen.shift();
}

function wirkeAuf(veh, w, alt, neu) {
  const parts = veh.plan.parts;
  const geprueft = new Set();
  parts.forEach((p, n) => {
    const b = veh.bodies[veh.ana.bodyOf[n]];
    if (!b) return;
    const c = teilWeltPos(veh, n);
    const d = Math.hypot(c[0] - w.p[0], c[1] - w.p[1], c[2] - w.p[2]);
    if (d <= alt || d > neu) return;
    const druck = druckBei(w, d);
    if (druck < WELLEN_MIN) return;
    if (schildFaengt(veh, c, 0.5, druck, 0)) return;
    if (w.quelle?.spielerId) { veh.letzterTaeter = w.quelle.spielerId; veh.taeterZeit = Date.now(); }
    if (!geprueft.has(b.index)) {
      geprueft.add(b.index);
      const dir = d > 0.05 ? [(c[0] - w.p[0]) / d, (c[1] - w.p[1]) / d, (c[2] - w.p[2]) / d] : [0, 1, 0];
      const dv = Math.min(30, druck * 0.25);
      b.rb.applyImpulse(vec(scale(dir, dv * b.rb.mass())), true);
    }
    if (TEILE[p.t].sprengfest && !veh.abgeloest.has(n)) {
      if (druck >= 8 && panzerAbnutzung(veh, n, druck)) { loeseTeil(veh, n); veh.sprengReihe.push(n, 1, n); }
    } else if (KAMPF_TEILE.has(p.t) && druck >= 40) zerstoere(veh, n);
  });
  if (veh.abgeloest.size) { berechneGruppen(veh); pruefeTod(veh); }
}

function aktualisiereWellen(dt, fahrzeuge) {
  for (let i = druckwellen.length - 1; i >= 0; i--) {
    const w = druckwellen[i];
    const neu = w.r + WELLEN_TEMPO * dt;
    for (const v of fahrzeuge) {
      if (!v || v === w.quelle || !v.kampf || v.kin || v.tot) continue;
      wirkeAuf(v, w, w.r, neu);
    }
    w.r = neu;
    if (druckBei(w, w.r) < WELLEN_MIN) druckwellen.splice(i, 1);
  }
}

function rohreAn(veh, iv) {
  const v = veh.plan.parts[iv];
  const out = [];
  veh.plan.parts.forEach((p, n) => {
    if (p.t !== "geschuetz") return;
    const d = teilAchse(p).map(Math.round);
    if (p.x - d[0] === v.x && p.y - d[1] === v.y && p.z - d[2] === v.z) out.push(n);
  });
  return out;
}

export function sprengReichweite(p) {
  if (p.t === "tank") return 10;
  if (p.t === "munition") return 14;
  return p.k?.reichweite ?? 3;
}

function fuellstand(veh, n) {
  const kap = Math.max(1, veh.plan.parts[n].k?.kapazitaet ?? 60);
  return Math.min(1, (veh.tank.menge.get(n) ?? 0) / kap);
}

function zerstoere(veh, n) {
  if (veh.zerstoert.has(n) || !KAMPF_TEILE.has(veh.plan.parts[n].t)) return;
  veh.zerstoert.add(n);
  const typ = veh.plan.parts[n].t;
  if (typ !== "tank" && typ !== "munition") return;
  let fuell, reichweite, kraft;
  if (typ === "tank") {
    fuell = fuellstand(veh, n);
    veh.tank.menge.set(n, 0);
    reichweite = 3 + 7 * fuell;
    kraft = 30 + 120 * fuell;
  } else {
    const kap = munitionKapazitaet(veh.plan.parts[n].k.kaliber);
    fuell = Math.min(1, (veh.munition.get(n) ?? 0) / kap);
    veh.munition.set(n, 0);
    reichweite = 4 + 10 * fuell;
    kraft = 45 + 180 * fuell;
  }
  if (fuell < TANK_MIN) return;
  veh.sprengung.set(n, { zeit: 0 });
  sprenge(veh, n, null, { reichweite, kraft });
  schadenAn(veh, veh.sprengPos.get(n), reichweite, n, kraft);
}

function schildFaengt(veh, punkt, radius, kraft, direkt) {
  for (let n = 0; n < veh.plan.parts.length; n++) {
    const p = veh.plan.parts[n];
    if (p.t !== "schild" || !veh.licht.get(n) || !veh.bodies[veh.ana.bodyOf[n]]) continue;
    const c = teilWeltPos(veh, n);
    const r = p.k?.reichweite ?? 3;
    if (Math.hypot(c[0] - punkt[0], c[1] - punkt[1], c[2] - punkt[2]) > r + radius) continue;
    const e = veh.schildE.get(n) ?? 1;
    const kosten = 0.12 + radius * 0.12 + kraft / 200 + direkt / 400;
    if (e >= kosten) { veh.schildE.set(n, e - kosten); return true; }
    veh.schildE.set(n, 0);
    veh.licht.set(n, false);
  }
  return false;
}

export function schadenAn(veh, punkt, radius, treffer, kraft = 0, direkt = 0) {
  if (!veh.kampf) return;
  if (schildFaengt(veh, punkt, radius, kraft, direkt)) return;
  veh.plan.parts.forEach((p, n) => {
    if (veh.zerstoert.has(n) || !KAMPF_TEILE.has(p.t) || !veh.bodies[veh.ana.bodyOf[n]]) return;
    const c = teilWeltPos(veh, n);
    if (n === treffer || Math.hypot(c[0] - punkt[0], c[1] - punkt[1], c[2] - punkt[2]) <= radius) zerstoere(veh, n);
  });
  if (!veh.kin && (kraft || direkt)) {
    const bruch = [];
    veh.plan.parts.forEach((p, n) => {
      if (!TEILE[p.t].sprengfest || veh.abgeloest.has(n) || !veh.bodies[veh.ana.bodyOf[n]]) return;
      const c = teilWeltPos(veh, n);
      const d = Math.hypot(c[0] - punkt[0], c[1] - punkt[1], c[2] - punkt[2]);
      const schaden = (n === treffer ? direkt : 0) + (kraft && d <= radius ? kraft * (1 - d / Math.max(radius, 0.01)) : 0);
      if (schaden > 0 && panzerAbnutzung(veh, n, schaden)) bruch.push(n);
    });
    for (const n of bruch) {
      loeseTeil(veh, n);
      veh.sprengReihe.push(n, 1, n);
    }
    if (bruch.length) berechneGruppen(veh);
  }
  aktualisiereAntrieb(veh);
  pruefeTod(veh);
}

export function trefferWirkung(veh, punkt, dir, kal, teil, art = 0) {
  if (!veh.kampf) return;
  const k = Math.max(0.15, kal / 155);
  const A = ART_WERTE[art] || ART_WERTE[0];
  const radius = (0.3 + 1.7 * k) * A.radius;
  if (schildFaengt(veh, punkt, radius, 0, 100 * k * k * A.direkt)) return;
  schadenAn(veh, punkt, radius, teil, 0, 100 * k * k * A.direkt);
  if (teil >= 0 && veh.plan.parts[teil]?.t === "sitz") avatarGetroffen(veh);
  if (veh.kin) return;
  const parts = veh.plan.parts;
  const gebunden = new Set();
  for (const g of veh.ana.gelenke) { gebunden.add(g.teil); gebunden.add(g.other); }
  const ziele = [];
  parts.forEach((p, n) => {
    const def = TEILE[p.t];
    if (veh.abgeloest.has(n) || def.sprengfest || def.gelenk || p.t === "sitz" || gebunden.has(n)) return;
    if (!veh.bodies[veh.ana.bodyOf[n]]) return;
    const c = teilWeltPos(veh, n);
    if (Math.hypot(c[0] - punkt[0], c[1] - punkt[1], c[2] - punkt[2]) > radius * 0.7 && n !== teil) return;
    const cell = parts[n];
    const map = zellenKarte(veh);
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const j = map.get(`${cell.x + d[0]},${cell.y + d[1]},${cell.z + d[2]}`);
      if (j !== undefined && TEILE[parts[j].t].sprengfest) return;
    }
    ziele.push(n);
  });
  for (const n of ziele) loeseTeil(veh, n);
  if (ziele.length) {
    if (teil >= 0) veh.sprengReihe.push(teil, ziele.length, ...ziele);
    berechneGruppen(veh);
    aktualisiereAntrieb(veh);
    pruefeTod(veh);
  }
  const impuls = GESCHOSS_MASSE_155 * Math.pow(k, 3) * GESCHOSS_TEMPO * 0.08 * A.impuls;
  for (const n of ziele) {
    const b = veh.bodies[veh.ana.bodyOf[n]];
    b.rb.applyImpulse(vec(scale(dir, Math.min(impuls * 0.5, b.rb.mass() * 12))), true);
    b.rb.applyTorqueImpulse(vec([(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2].map(x => x * b.rb.mass() * 0.6)), true);
  }
  if (teil >= 0) {
    const b = veh.bodies[veh.ana.bodyOf[teil]];
    if (b) b.rb.applyImpulseAtPoint(vec(scale(dir, Math.min(impuls, b.rb.mass() * 8))), vec(punkt), true);
  }
}

function zellenKarte(veh) {
  if (!veh.zellenMap) {
    veh.zellenMap = new Map();
    veh.plan.parts.forEach((p, i) => veh.zellenMap.set(`${p.x},${p.y},${p.z}`, i));
  }
  return veh.zellenMap;
}

export function explosionSchaden(veh, punkt, reichweite) {
  schadenAn(veh, punkt, reichweite, -1, 8 * reichweite);
}

export const muendungen = [];

export function geschossTempo(veh, n) {
  const parts = veh.plan.parts;
  if (parts[n]?.t === "schnellfeuer") return SCHNELL_TEMPO;
  if (parts[n]?.t !== "geschuetz") return 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].t !== "verschluss" || veh.zerstoert.has(i) || !rohreAn(veh, i).includes(n)) continue;
    const dm = parts[i].k.durchmesser ?? 75, kal = parts[n].k.kaliber ?? 75;
    return GESCHOSS_TEMPO * (0.4 + 0.6 * Math.min(1, dm / kal)) * ART_WERTE[artVon(veh, i)].tempo * (veh.zerstoert.has(n) ? 0.5 : 1);
  }
  return 0;
}

export function muendungPos(veh, n) {
  const b = veh.bodies[veh.ana.bodyOf[n]];
  if (!b) return null;
  const dir = quatRot(b.rb.rotation(), teilAchse(veh.plan.parts[n]));
  return { pos: add(teilWeltPos(veh, n), scale(dir, ZELLE * 0.6)), dir };
}

export function feuere(von, p, v, kal, art = 0) {
  geschosse.push({ p: [...p], v: [...v], kal, art, durch: art === 2 ? 2 + Math.floor(kal / 40) : 0, t: 0, von });
  const l = Math.hypot(...v) || 1;
  muendungen.push({ p: [...p], dir: [v[0] / l, v[1] / l, v[2] / l], kal, von });
}

function schiesse(veh, iv) {
  const parts = veh.plan.parts;
  const dm = parts[iv].k.durchmesser ?? 75;
  const rohre = rohreAn(veh, iv);
  if (!rohre.length) return 0;
  const art = artVon(veh, iv);
  const lager = munitionQuelle(veh, iv, dm, art);
  if (lager < 0) return 0;
  veh.munition.set(lager, veh.munition.get(lager) - 1);
  const faktor = angrenzend(parts[lager], parts[iv]) ? NAHLAGER_FAKTOR : 1;
  const lebend = rohre.filter(n => !veh.zerstoert.has(n));
  const rohr = lebend.length ? lebend[0] : rohre[0];
  const kal = parts[rohr].k.kaliber ?? 75;

  if (dm > kal) {
    veh.zerstoert.add(iv);
    veh.zerstoert.add(rohr);
    veh.sprengung.set(iv, { zeit: 0 });
    sprenge(veh, iv, null, { reichweite: 1 + (dm / 155) * 1.5, kraft: 8 + (dm / 155) * 25 });
    schadenAn(veh, veh.sprengPos.get(iv), 1 + (dm / 155) * 1.5, -1);
    return faktor;
  }

  const r = dm / kal;
  let tempo = GESCHOSS_TEMPO * (0.4 + 0.6 * r) * ART_WERTE[art].tempo;
  let streu = 0.004 + 0.08 * (1 - r);
  if (!lebend.length) { tempo *= 0.5; streu += 0.06; }

  const b = veh.bodies[veh.ana.bodyOf[rohr]];
  const dir = quatRot(b.rb.rotation(), teilAchse(parts[rohr]));
  const mund = add(teilWeltPos(veh, rohr), scale(dir, ZELLE * 0.6));
  const zufall = () => (Math.random() * 2 - 1) * streu;
  const roh = [dir[0] + zufall(), dir[1] + zufall(), dir[2] + zufall()];
  const len = Math.hypot(...roh) || 1;
  const vel = add(scale(roh, tempo / len), punktGeschw(b.rb, mund));

  feuere(veh, mund, vel, dm, art);
  veh.schussZaehler++;
  const gm = GESCHOSS_MASSE_155 * Math.pow(dm / 155, 3);
  const rueck = Math.min(gm * tempo * RUECKSTOSS_ANTEIL, b.rb.mass() * 6);
  b.rb.applyImpulseAtPoint(vec(scale(dir, -rueck)), vec(teilWeltPos(veh, rohr)), true);
  veh.schussReihe.push(mund[0], mund[1], mund[2], vel[0], vel[1], vel[2], dm + 1000 * art);
  if (veh.schussReihe.length > 56) veh.schussReihe.splice(0, veh.schussReihe.length - 56);
  return faktor;
}

const SCHNELL_TAKT = 0.11;
const SCHNELL_TEMPO = 950;
function schnellSchuss(veh, n) {
  const parts = veh.plan.parts;
  const kal = Math.max(25, Math.min(40, parts[n].k.kaliber ?? 30));
  const gid = veh.gruppe[veh.ana.bodyOf[n]];
  let lager = -1;
  for (const [m, rest] of veh.munition) {
    if (rest <= 0 || veh.zerstoert.has(m) || veh.gruppe[veh.ana.bodyOf[m]] !== gid) continue;
    if (Math.round(parts[m].k.kaliber ?? 75) !== Math.round(kal)) continue;
    lager = m;
    break;
  }
  if (lager < 0) return false;
  veh.munition.set(lager, veh.munition.get(lager) - 1);
  const b = veh.bodies[veh.ana.bodyOf[n]];
  if (!b) return false;
  const dir = quatRot(b.rb.rotation(), teilAchse(parts[n]));
  const mund = add(teilWeltPos(veh, n), scale(dir, ZELLE * 0.6));
  const streu = 0.012;
  const roh = dir.map(v => v + (Math.random() * 2 - 1) * streu);
  const len = Math.hypot(...roh) || 1;
  const vel = add(scale(roh, SCHNELL_TEMPO / len), punktGeschw(b.rb, mund));
  feuere(veh, mund, vel, kal, 3);
  veh.schussZaehler++;
  const gm = GESCHOSS_MASSE_155 * Math.pow(kal / 155, 3);
  b.rb.applyImpulseAtPoint(vec(scale(dir, -Math.min(gm * SCHNELL_TEMPO * RUECKSTOSS_ANTEIL, b.rb.mass() * 2))), vec(teilWeltPos(veh, n)), true);
  veh.schussReihe.push(mund[0], mund[1], mund[2], vel[0], vel[1], vel[2], kal + 3000);
  if (veh.schussReihe.length > 56) veh.schussReihe.splice(0, veh.schussReihe.length - 56);
  return true;
}

export function vorhersage(world, veh, maxZeit = 4) {
  const parts = veh.plan.parts;
  let start = null, tempo = 0;
  for (let i = 0; i < parts.length && !start; i++) {
    if (veh.zerstoert.has(i)) continue;
    if (parts[i].t === "verschluss") {
      const rohre = rohreAn(veh, i);
      if (!rohre.length) continue;
      const lebend = rohre.filter(n => !veh.zerstoert.has(n));
      const rohr = lebend[0] ?? rohre[0];
      const mp = muendungPos(veh, rohr);
      if (!mp) continue;
      const dm = parts[i].k.durchmesser ?? 75, kal = parts[rohr].k.kaliber ?? 75;
      tempo = GESCHOSS_TEMPO * (0.4 + 0.6 * Math.min(1, dm / kal)) * ART_WERTE[artVon(veh, i)].tempo * (lebend.length ? 1 : 0.5);
      start = mp;
    } else if (parts[i].t === "schnellfeuer") {
      const b = veh.bodies[veh.ana.bodyOf[i]];
      if (!b) continue;
      const dir = quatRot(b.rb.rotation(), teilAchse(parts[i]));
      start = { pos: add(teilWeltPos(veh, i), scale(dir, ZELLE * 0.6)), dir };
      tempo = SCHNELL_TEMPO;
    }
  }
  if (!start || !veh.R) return null;
  let p = [...start.pos], v = scale(start.dir, tempo);
  const punkte = [[...p]];
  const dt = 1 / 30;
  for (let t = 0; t < maxZeit; t += dt) {
    v = [v[0], v[1] - 9.81 * dt, v[2]];
    const weg = scale(v, dt), len = Math.hypot(...weg);
    const d = scale(weg, 1 / len);
    const hit = world.castRay(new veh.R.Ray(vec(p), vec(d)), len, true, undefined, undefined, undefined, undefined, col => !veh.colliderSet.has(col.handle));
    if (hit) {
      const ende = add(p, scale(d, hit.timeOfImpact ?? hit.toi ?? 0));
      punkte.push(ende);
      return { punkte, ende, treffer: true, zeit: t };
    }
    p = add(p, weg);
    punkte.push([...p]);
  }
  return { punkte, ende: p, treffer: false, zeit: maxZeit };
}

// avatar zu fuss: spiel.js haengt hier den collider und den treffer-rueckruf ein
export const avatarZiel = { handle: null, bei: null };

export function bewegeGeschosse(world, dt, eigene, boden = null) {
  const liste = (Array.isArray(eigene) ? eigene : [eigene]).filter(Boolean);
  for (const v of liste) if (v.schutz > 0) v.schutz = Math.max(0, v.schutz - dt);
  if (druckwellen.length) aktualisiereWellen(dt, liste);
  for (let g = geschosse.length - 1; g >= 0; g--) {
    const s = geschosse[g];
    s.v[1] -= 9.81 * dt;
    s.t += dt;
    const weg = scale(s.v, dt);
    const len = Math.hypot(...weg);
    let treffer = null, hitPos = null;
    if (len > 1e-6) {
      const R = (liste[0] || s.von)?.R;
      if (R) {
        const dirN = scale(weg, 1 / len);
        const hit = world.castRay(
          new R.Ray(vec(s.p), vec(dirN)), len, true, undefined, undefined, undefined, undefined,
          col => !(s.t < 0.25 && s.von && s.von.colliderSet.has(col.handle))
        );
        if (hit) {
          treffer = hit.collider;
          hitPos = add(s.p, scale(dirN, hit.timeOfImpact ?? hit.toi ?? 0));
        }
      }
    }
    const neuP = add(s.p, weg);
    if (!hitPos && boden && neuP[1] < boden(neuP[0], neuP[2])) hitPos = neuP;
    if (hitPos || s.t > GESCHOSS_LEBEN) {
      if (hitPos) {
        let teil = -1;
        const eigenes = treffer ? liste.find(v => v.colliderSet.has(treffer.handle)) : null;
        if (treffer && avatarZiel.handle === treffer.handle && s.t > 0.05) avatarZiel.bei?.(s);
        if (eigenes) {
          if (s.von?.spielerId && s.von !== eigenes) { eigenes.letzterTaeter = s.von.spielerId; eigenes.taeterZeit = Date.now(); }
          const quader = eigenes.verschmolzen?.get(treffer.handle);
          if (quader) {
            teil = teilAnPunkt(eigenes, quader.body, hitPos, scale(s.v, 1 / (Math.hypot(...s.v) || 1)));
            entmischeKoerper(eigenes, quader.body);
          } else {
            for (const [n, col] of eigenes.colliderVon) if (col.handle === treffer.handle) { teil = n; break; }
          }
          const dirT = scale(s.v, 1 / (Math.hypot(...s.v) || 1));
          const hart = teil >= 0 && TEILE[eigenes.plan.parts[teil].t].sprengfest ? 2 * wandFaktor(eigenes.plan.parts[teil]) : 0;
          trefferWirkung(eigenes, hitPos, dirT, s.kal, teil, s.art);
          if (s.art === 2 && s.durch > 0) {
            s.durch -= hart || 1;
            einschlaege.push({ p: hitPos, kal: s.kal, treffer: true, dir: dirT, art: 2 });
            s.p = add(hitPos, scale(dirT, ZELLE * 1.05));
            s.v = scale(s.v, 0.92);
            continue;
          }
        }
        einschlaege.push({ p: hitPos, kal: s.kal, art: s.art, treffer: teil >= 0, dir: scale(s.v, 1 / (Math.hypot(...s.v) || 1)) });
      }
      geschosse.splice(g, 1);
      continue;
    }
    s.p = neuP;
  }
}

export function aktualisiereRaeder(veh, dt, filter) {
  for (const b of veh.bodies) {
    if (!b.vc) continue;
    b.vc.updateVehicle(dt, undefined, undefined, filter);
  }
}

export function radZustand(veh, dt) {
  const out = [];
  for (const b of veh.bodies) {
    if (!b.vc) continue;
    const rot = b.rb.rotation();
    const inv = { x: -rot.x, y: -rot.y, z: -rot.z, w: rot.w };
    for (const r of b.raeder) {
      const feder = (b.vc.wheelSuspensionLength(r.w) ?? FEDER_WEG) - RAD_TIEFE;
      if (r.bock) {
        const welt = add(arr(b.rb.translation()), quatRot(rot, r.mitte));
        const vw = punktGeschw(b.rb, welt);
        const vl = quatRot(inv, vw);
        const p = veh.plan.parts[r.teil];
        const vt = matVec(transpose(ORIENT[p.o]), vl);
        const sp = Math.hypot(vt[0], vt[2]);
        if (sp > 0.15) {
          const ziel = Math.atan2(vt[0], vt[2]);
          let d = ziel - r.schwenk;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          r.schwenk += d * Math.min(1, dt * 10);
        }
        r.drehung += (sp / r.r) * dt * Math.sign(Math.cos(Math.atan2(vt[0], vt[2]) - r.schwenk) || 1);
        out.push({ teil: r.teil, feder: feder - FEDER_WEG, lenk: r.schwenk, dreh: r.drehung });
      } else {
        out.push({
          teil: r.teil,
          feder: feder - FEDER_WEG,
          lenk: b.vc.wheelSteering(r.w) || 0,
          dreh: (b.vc.wheelRotation(r.w) || 0) * r.achsVz,
          spur: spurVon(b, r, rot)
        });
      }
    }
  }
  return out;
}

function spurVon(b, r, rot) {
  const vc = b.vc;
  if (!vc.wheelIsInContact(r.w)) return null;
  const cp = vc.wheelContactPoint(r.w), nw = vc.wheelContactNormal(r.w), ax = vc.wheelAxleCs(r.w);
  if (!cp || !nw || !ax) return null;
  const v = punktGeschw(b.rb, [cp.x, cp.y, cp.z]);
  const a = quatRot(rot, [ax.x, ax.y, ax.z]);
  const seit = Math.abs(dot(v, a));
  const tempo = Math.hypot(v[0], v[1], v[2]);
  const stark = Math.min(1, Math.max(0, (seit - 1.0) / 4));
  if (stark <= 0 || tempo < 1.5) return null;
  return { p: [cp.x, cp.y, cp.z], n: [nw.x, nw.y, nw.z], t: stark };
}

function transpose(m) {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

const WASSER_DICHTE = 1000;
const AUFTRIEB_ZELLE = WASSER_DICHTE * 9.81 * ZELLE ** 3 * 1.8;
const AUFTRIEB_BLOCK = AUFTRIEB_ZELLE * 0.2;

function berechneLuft(parts, ana) {
  const solide = new Map();
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const key = (x, y, z) => x + "," + y + "," + z;
  parts.forEach((p, i) => {
    solide.set(key(p.x, p.y, p.z), i);
    for (const [a, v] of [[0, p.x], [1, p.y], [2, p.z]]) { mn[a] = Math.min(mn[a], v); mx[a] = Math.max(mx[a], v); }
  });
  const aus = ana.bodies.map(() => []);
  if (!parts.length) return aus;
  let anzahl = 0;
  for (let x = mn[0]; x <= mx[0]; x++) {
    for (let z = mn[2]; z <= mx[2]; z++) {
      for (let y = mn[1] + 1; y <= mx[1] + 40; y++) {
        if (solide.has(key(x, y, z))) continue;
        let boden = -1;
        for (let yy = y - 1; yy >= mn[1]; yy--) {
          const s = solide.get(key(x, yy, z));
          if (s !== undefined) { boden = s; break; }
        }
        if (boden < 0) continue;
        let zu = true;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let gefunden = false;
          for (let t = 1; t <= 64; t++) {
            const cx = x + dx * t, cz = z + dz * t;
            if (cx < mn[0] || cx > mx[0] || cz < mn[2] || cz > mx[2]) break;
            if (solide.has(key(cx, y, cz))) { gefunden = true; break; }
          }
          if (!gefunden) { zu = false; break; }
        }
        if (!zu) continue;
        const bi = ana.bodyOf[boden];
        aus[bi].push(sub(zellMitte({ x, y, z }), ana.bodies[bi].ursprung));
        if (++anzahl > 6000) return aus;
      }
    }
  }
  return aus;
}

function wasserVorbereiten(veh) {
  const luft = berechneLuft(veh.plan.parts, veh.ana);
  for (const b of veh.bodies) {
    b.luft = luft[b.index] || [];
    const alle = b.parts.map(i => sub(zellMitte(veh.plan.parts[i]), b.ursprung));
    b.teileGewicht = Math.max(1, Math.ceil(alle.length / 500));
    b.teile = b.teileGewicht > 1 ? alle.filter((_, k) => k % b.teileGewicht === 0) : alle;
    b.umfang = 0.6;
    for (const l of [...b.luft, ...b.teile]) b.umfang = Math.max(b.umfang, Math.hypot(l[0], l[1], l[2]) + 0.4);
    b.nass = 0;
  }
}

export function wasserKraefte(veh, wasserY, dt) {
  if (veh.kin) return;
  for (const b of veh.bodies) {
    if (!b.teile) continue;
    const rb = b.rb;
    const pos = rb.translation();
    if (pos.y - b.umfang > wasserY) {
      if (b.nass) { rb.setLinearDamping(0.05); rb.setAngularDamping(0.3); b.nass = 0; }
      continue;
    }
    const rot = rb.rotation();
    let unter = 0;
    for (const l of b.teile) {
      const w = quatRot(rot, l);
      const y = pos.y + w[1];
      if (y < wasserY) {
        unter++;
        rb.applyImpulseAtPoint({ x: 0, y: AUFTRIEB_BLOCK * b.teileGewicht * dt, z: 0 }, { x: pos.x + w[0], y, z: pos.z + w[2] }, true);
      }
    }
    for (const l of b.luft) {
      const w = quatRot(rot, l);
      const y = pos.y + w[1];
      const s = Math.max(0, Math.min(1, (wasserY - (y - ZELLE / 2)) / ZELLE));
      if (s > 0) rb.applyImpulseAtPoint({ x: 0, y: AUFTRIEB_ZELLE * s * dt, z: 0 }, { x: pos.x + w[0], y, z: pos.z + w[2] }, true);
    }
    const anteil = b.teile.length ? unter / b.teile.length : 0;
    b.nass = anteil;
    rb.setLinearDamping(0.05 + 1.6 * anteil);
    rb.setAngularDamping(0.3 + 3 * anteil);
  }
}

const HELIUM_STANDARD_KG = 45;

export function heliumKraefte(veh, dt) {
  if (veh.kin) return;
  for (const b of veh.bodies) {
    if (b.heliumStand !== b.parts.length) {
      b.heliumStand = b.parts.length;
      b.helium = b.parts.filter(i => veh.plan.parts[i].t === "helium" && !veh.abgeloest?.has(i))
        .map(i => ({ l: sub(zellMitte(veh.plan.parts[i]), b.ursprung), f: (veh.plan.parts[i].k?.auftrieb ?? HELIUM_STANDARD_KG) * 9.81 }));
    }
    if (!b.helium.length) continue;
    const rb = b.rb;
    const pos = rb.translation();
    const dichte = Math.max(0, 1 - Math.max(0, pos.y) / 4000);
    if (dichte <= 0) continue;
    const rot = rb.rotation();
    for (const { l, f } of b.helium) {
      const w = quatRot(rot, l);
      if (f <= 0) continue;
      rb.applyImpulseAtPoint({ x: 0, y: f * dichte * dt, z: 0 }, { x: pos.x + w[0], y: pos.y + w[1], z: pos.z + w[2] }, true);
    }
  }
}

export function schritt(world, veh, eingabe, dt) {
  steuere(world, veh, eingabe, dt);
  const filter = c => !veh.colliderSet.has(c.handle) && !c.isSensor() && !ignoriere.has(c.handle);
  aktualisiereRaeder(veh, dt, filter);
}
