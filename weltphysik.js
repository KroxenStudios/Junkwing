import { hoeheBei } from "./weltdaten.js";
import { DEKO } from "./dekodaten.js";

const quatY = winkel => ({ x: 0, y: Math.sin(winkel / 2), z: 0, w: Math.cos(winkel / 2) });

export function baueGelaendeKollision(R, world, d) {
  const n = d.n;
  world.createCollider(
    R.ColliderDesc.heightfield(n - 1, n - 1, d.h, { x: d.groesse, y: 1, z: d.groesse })
      .setTranslation(d.mitte[0], 0, d.mitte[1]).setFriction(0.95)
  );
  for (const [x, z, bw, bd, bh, rot] of d.gebaeude || []) {
    const y0 = hoeheBei(d, x, z);
    world.createCollider(R.ColliderDesc.cuboid(bw / 2, bh / 2 + 0.3, bd / 2)
      .setTranslation(x, y0 + bh / 2 - 0.3, z).setRotation(quatY(-rot)).setFriction(0.9));
  }
  if (d.felsenKollision) {
    const anzahl = (d.felsen?.length || 0) / 3;
    for (let k = 0; k < anzahl; k++) {
      const x = d.felsen[k * 3], z = d.felsen[k * 3 + 1], sc = d.felsen[k * 3 + 2];
      world.createCollider(R.ColliderDesc.ball(sc * 0.7).setTranslation(x, hoeheBei(d, x, z) + sc * 0.25, z).setFriction(0.9));
    }
  }
  for (const [x, z, typ, sc, rot] of d.deko || []) {
    const fest = DEKO[typ]?.solide;
    if (!fest) continue;
    const y0 = hoeheBei(d, x, z);
    const q = quatY(-rot);
    const c = Math.cos(-rot), s = Math.sin(-rot);
    for (const [mx, my, mz, hx, hy, hz] of fest) {
      const vx = mx * sc * c + mz * sc * s, vz = -mx * sc * s + mz * sc * c;
      world.createCollider(R.ColliderDesc.cuboid(hx * sc, hy * sc, hz * sc)
        .setTranslation(x + vx, y0 + my * sc, z + vz).setRotation(q).setFriction(0.8));
    }
  }
}

export function baueWeltKollision(R, world, d, meerboden) {
  baueGelaendeKollision(R, world, { ...d, gebaeude: d.gebaeude, felsenKollision: false, deko: [] });
  world.createCollider(R.ColliderDesc.cuboid(30000, 1, 30000).setTranslation(0, meerboden - 1, 0).setFriction(0.95));
}
