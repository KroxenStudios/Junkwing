import * as THREE from "three";

export const SENSOR_TYPEN = ["lidar", "radar", "gyro", "hoehe", "kraft"];
const ZWEI_PI = Math.PI * 2;
const klemme = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const zust = { veh: null, vel: null, g: 1 };
const q = new THREE.Quaternion(), vF = new THREE.Vector3(), vU = new THREE.Vector3(), vR = new THREE.Vector3();

function strahl(ctx, von, richtung, maxLaenge) {
  const { RAPIER, world, veh } = ctx;
  const hit = world.castRay(
    new RAPIER.Ray({ x: von.x, y: von.y, z: von.z }, { x: richtung.x, y: richtung.y, z: richtung.z }),
    maxLaenge, true, undefined, undefined, undefined, undefined, col => !veh.colliderSet.has(col.handle)
  );
  return hit ? (hit.timeOfImpact ?? hit.toi ?? null) : null;
}

function teilWelt(grafik, i) {
  const e = grafik.emit.get(i);
  if (!e) return null;
  e.obj.updateWorldMatrix(true, false);
  return { pos: e.obj.localToWorld(e.punkt.clone()), dir: new THREE.Vector3(0, 1, 0).transformDirection(e.obj.matrixWorld) };
}

export function messeSensoren(ctx) {
  const { veh, grafik, koerper, dt } = ctx;
  const erste = new Map();
  for (const [i, s] of grafik.sensoren) if (!erste.has(s.typ)) erste.set(s.typ, i);
  if (!erste.size || !koerper) return null;

  const t = koerper.translation(), r = koerper.rotation();
  q.set(r.x, r.y, r.z, r.w);
  vF.set(0, 0, -1).applyQuaternion(q);
  vU.set(0, 1, 0).applyQuaternion(q);
  vR.set(1, 0, 0).applyQuaternion(q);
  const ein = typ => grafik.plan.parts[erste.get(typ)]?.k || {};
  const w = { typen: erste, norm: {}, alarm: {}, farbe: {} };
  for (const typ of erste.keys()) w.farbe[typ] = ein(typ).farbe;

  if (erste.has("lidar")) {
    const o = teilWelt(grafik, erste.get("lidar"));
    const max = ein("lidar").messweite ?? 120, schwelle = ein("lidar").alarm ?? 0;
    const d = o ? strahl(ctx, o.pos.clone().addScaledVector(o.dir, 0.3), o.dir, max) : null;
    w.lidar = d === null ? null : d + 0.3;
    w.lidarMax = max;
    w.norm.lidar = w.lidar === null ? 0 : klemme(1 - w.lidar / (max * 0.5));
    w.alarm.lidar = schwelle > 0 && w.lidar !== null && w.lidar < schwelle;
  }
  if (erste.has("hoehe")) {
    const o = teilWelt(grafik, erste.get("hoehe"));
    let h = null;
    if (o) {
      const d = strahl(ctx, o.pos, { x: 0, y: -1, z: 0 }, ein("hoehe").messweite ?? 400);
      h = d !== null ? d : Math.max(0, o.pos.y - ctx.bodenHoehe(o.pos.x, o.pos.z));
    }
    w.hoehe = h;
    w.norm.hoehe = h === null ? 0 : klemme(1 - h / 80);
    w.alarm.hoehe = (ein("hoehe").alarm ?? 0) > 0 && h !== null && h < ein("hoehe").alarm;
  }
  if (erste.has("radar")) {
    const hx = vF.x, hz = vF.z, hl = Math.hypot(hx, hz) || 1;
    const fx = hx / hl, fz = hz / hl, rx = -fz, rz = fx;
    const blips = [];
    for (const a of ctx.andere.values()) {
      if (a.m !== "fahr" || !a.grafik) continue;
      if (a.fx && a.plan && [...a.fx].some(([i, s]) => s > 0 && a.plan.parts[i]?.t === "stoersender")) continue;
      const p = a.grafik.groups[0].position;
      const dx = p.x - t.x, dz = p.z - t.z, dy = p.y - t.y;
      const dist = Math.hypot(dx, dz);
      blips.push({ x: dx * rx + dz * rz, y: dx * fx + dz * fz, dy, dist, name: a.name || "" });
    }
    const reichweite = ein("radar").messweite ?? 250;
    const imBereich = blips.filter(b => b.dist <= reichweite);
    w.radar = { blips: imBereich, reichweite, naechster: imBereich.length ? Math.min(...imBereich.map(b => b.dist)) : null };
    w.norm.radar = w.radar.naechster === null ? 0 : klemme(1 - w.radar.naechster / reichweite);
  }
  if (erste.has("gyro")) {
    const av = koerper.angvel();
    w.gyro = {
      pitch: Math.asin(klemme(vF.y, -1, 1)),
      roll: Math.atan2(-vR.y, vU.y),
      kurs: (Math.atan2(-vF.x, -vF.z) + ZWEI_PI) % ZWEI_PI,
      rate: Math.hypot(av.x, av.y, av.z)
    };
    w.norm.gyro = klemme(w.gyro.rate / 3);
  }
  if (erste.has("kraft")) {
    const v = koerper.linvel();
    if (zust.veh !== veh || !zust.vel) { zust.veh = veh; zust.g = 1; }
    else if (dt > 0.0005) {
      const ax = (v.x - zust.vel.x) / dt, ay = (v.y - zust.vel.y) / dt + 9.81, az = (v.z - zust.vel.z) / dt;
      const ziel = klemme(Math.hypot(ax, ay, az) / 9.81, 0, 12);
      zust.g += (ziel - zust.g) * Math.min(1, dt * 8);
    }
    zust.vel = { x: v.x, y: v.y, z: v.z };
    w.kraft = zust.g;
    w.norm.kraft = klemme((zust.g - 1) / 5);
    w.alarm.kraft = (ein("kraft").alarm ?? 0) > 0 && zust.g > ein("kraft").alarm;
  }
  return w;
}

export function animiereSensoren(grafik, zeit, norm) {
  if (!grafik?.sensoren?.size) return;
  for (const s of grafik.sensoren.values()) s.anim(zeit, norm ? (norm[s.typ] ?? 0) : 0.15);
}


const KACHELN = [
  { typ: "lidar", name: "LIDAR", farbe: "#2fe6ff" },
  { typ: "radar", name: "RADAR", farbe: "#ff9a2b", rund: true },
  { typ: "gyro", name: "GYRO", farbe: "#a78bff", rund: true },
  { typ: "hoehe", name: "ALT", farbe: "#4dffb4" },
  { typ: "kraft", name: "G", farbe: "#35f0a0" }
];
const CANVAS = 112;

export function erzeugeSensorHud(eltern) {
  const el = document.createElement("div");
  el.id = "sensorHud";
  el.hidden = true;
  const k = {};
  for (const def of KACHELN) {
    const box = document.createElement("div");
    box.className = "sKachel" + (def.rund ? " sRund" : "");
    box.style.setProperty("--basis", def.farbe);
    box.hidden = true;
    const kopf = document.createElement("span");
    kopf.className = "sName";
    kopf.textContent = def.name;
    const wert = document.createElement("b");
    wert.className = "sWert";
    box.append(kopf);
    let cv = null, balken = null;
    if (def.rund) {
      cv = document.createElement("canvas");
      cv.width = cv.height = CANVAS;
      box.append(cv);
    } else {
      const bahn = document.createElement("i");
      bahn.className = "sBalken";
      balken = document.createElement("u");
      bahn.append(balken);
      box.append(wert, bahn);
    }
    if (def.rund) box.append(wert);
    box.addEventListener("animationend", () => box.classList.remove("start"));
    el.append(box);
    k[def.typ] = { box, wert, cv, balken, g: cv ? cv.getContext("2d") : null };
  }
  eltern.append(el);

  const zeigeKachel = (kachel, an) => {
    if (kachel.box.hidden !== !an) {
      kachel.box.hidden = !an;
      if (an) { kachel.box.classList.remove("start"); void kachel.box.offsetWidth; kachel.box.classList.add("start"); }
    }
  };
  const m = n => (n < 10 ? n.toFixed(1) : Math.round(n)) + " m";

  return {
    el,
    aus() { el.hidden = true; },
    zeige(w, zeit) {
      if (!w) { el.hidden = true; return; }
      el.hidden = false;
      for (const def of KACHELN) {
        zeigeKachel(k[def.typ], w.typen.has(def.typ));
        if (w.typen.has(def.typ)) {
          const c = k[def.typ];
          c.box.style.setProperty("--basis", w.farbe[def.typ] || def.farbe);
          c.box.classList.toggle("warn", !!w.alarm[def.typ]);
        }
      }

      if (w.typen.has("lidar")) {
        const c = k.lidar;
        c.wert.textContent = w.lidar === null ? `> ${w.lidarMax} m` : m(w.lidar);
        c.balken.style.width = `${(w.norm.lidar * 100).toFixed(0)}%`;
      }
      if (w.typen.has("hoehe")) {
        const c = k.hoehe;
        c.wert.textContent = w.hoehe === null ? "—" : m(w.hoehe);
        c.balken.style.width = `${(w.norm.hoehe * 100).toFixed(0)}%`;
      }
      if (w.typen.has("kraft")) {
        const c = k.kraft;
        c.wert.textContent = `${w.kraft.toFixed(1)} g`;
        c.balken.style.width = `${(w.norm.kraft * 100).toFixed(0)}%`;
      }
      if (w.typen.has("radar")) {
        const c = k.radar;
        zeichneRadar(c.g, w.radar, zeit);
        c.wert.textContent = w.radar.naechster === null ? "—" : m(w.radar.naechster);
      }
      if (w.typen.has("gyro")) {
        const c = k.gyro;
        zeichneGyro(c.g, w.gyro);
        const grad = rad => Math.round(rad * 180 / Math.PI);
        c.wert.textContent = `${String(grad(w.gyro.kurs)).padStart(3, "0")}°  ${grad(w.gyro.pitch) >= 0 ? "+" : ""}${grad(w.gyro.pitch)}°`;
      }
    }
  };
}

function zeichneRadar(g, radar, zeit) {
  const S = CANVAS, c = S / 2, R = c - 3;
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath();
  g.arc(c, c, R, 0, ZWEI_PI);
  g.clip();
  g.fillStyle = "rgba(10, 22, 16, 0.88)";
  g.fillRect(0, 0, S, S);
  const a = (zeit * 1.8) % ZWEI_PI;
  if (g.createConicGradient) {
    const kg = g.createConicGradient(a - 1.1, c, c);
    kg.addColorStop(0, "rgba(255,154,43,0)");
    kg.addColorStop(0.175, "rgba(255,154,43,0.55)");
    kg.addColorStop(0.1755, "rgba(255,154,43,0)");
    kg.addColorStop(1, "rgba(255,154,43,0)");
    g.fillStyle = kg;
    g.fillRect(0, 0, S, S);
  }
  g.strokeStyle = "rgba(255,154,43,0.28)";
  g.lineWidth = 1;
  for (const f of [1 / 3, 2 / 3, 1]) { g.beginPath(); g.arc(c, c, R * f, 0, ZWEI_PI); g.stroke(); }
  g.beginPath();
  g.moveTo(c, c - R); g.lineTo(c, c + R);
  g.moveTo(c - R, c); g.lineTo(c + R, c);
  g.stroke();
  g.strokeStyle = "rgba(255,200,120,0.9)";
  g.beginPath();
  g.moveTo(c, c); g.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R);
  g.stroke();
  for (const b of radar.blips) {
    const f = Math.min(1, b.dist / radar.reichweite);
    const l = Math.hypot(b.x, b.y) || 1;
    const px = c + (b.x / l) * f * R, py = c - (b.y / l) * f * R;
    const ang = (Math.atan2(py - c, px - c) + ZWEI_PI) % ZWEI_PI;
    const alt = 1 - 0.75 * ((((a - ang) % ZWEI_PI) + ZWEI_PI) % ZWEI_PI) / ZWEI_PI;
    g.fillStyle = `rgba(255,230,160,${alt})`;
    g.beginPath();
    g.arc(px, py, 3.2, 0, ZWEI_PI);
    g.fill();
    if (Math.abs(b.dy) > 15) {
      g.strokeStyle = g.fillStyle;
      g.beginPath();
      g.moveTo(px, py); g.lineTo(px, py + (b.dy > 0 ? -7 : 7));
      g.stroke();
    }
  }
  g.fillStyle = "#ffd27a";
  g.beginPath();
  g.moveTo(c, c - 5); g.lineTo(c + 4, c + 4); g.lineTo(c - 4, c + 4);
  g.closePath();
  g.fill();
  g.restore();
  g.strokeStyle = "rgba(255,154,43,0.75)";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, R, 0, ZWEI_PI);
  g.stroke();
}

function zeichneGyro(g, w) {
  const S = CANVAS, c = S / 2, R = c - 3;
  const PX = 52;
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath();
  g.arc(c, c, R, 0, ZWEI_PI);
  g.clip();
  g.translate(c, c);
  g.rotate(-w.roll);
  const off = w.pitch * PX;
  const himmel = g.createLinearGradient(0, off - S, 0, off);
  himmel.addColorStop(0, "#1b4f93");
  himmel.addColorStop(1, "#6db8f2");
  g.fillStyle = himmel;
  g.fillRect(-S, off - S * 2, S * 2, S * 2);
  const boden = g.createLinearGradient(0, off, 0, off + S);
  boden.addColorStop(0, "#8a6a40");
  boden.addColorStop(1, "#3d2c18");
  g.fillStyle = boden;
  g.fillRect(-S, off, S * 2, S * 2);
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-S, off); g.lineTo(S, off);
  g.stroke();
  g.font = "8px system-ui, sans-serif";
  g.textAlign = "center";
  g.lineWidth = 1;
  for (const grad of [-30, -20, -10, 10, 20, 30]) {
    const y = off - grad * (PX * Math.PI / 180);
    const halb = Math.abs(grad) % 20 === 0 ? 16 : 9;
    g.beginPath();
    g.moveTo(-halb, y); g.lineTo(halb, y);
    g.stroke();
    if (Math.abs(grad) % 20 === 0) g.fillText(String(Math.abs(grad)), halb + 9, y + 3);
  }
  g.restore();
  g.strokeStyle = "#ffb547";
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(c - 32, c); g.lineTo(c - 12, c); g.lineTo(c - 12, c + 5);
  g.moveTo(c + 32, c); g.lineTo(c + 12, c); g.lineTo(c + 12, c + 5);
  g.stroke();
  g.fillStyle = "#ffb547";
  g.beginPath();
  g.arc(c, c, 2.5, 0, ZWEI_PI);
  g.fill();
  g.strokeStyle = "rgba(167,139,255,0.8)";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, R, 0, ZWEI_PI);
  g.stroke();
}
