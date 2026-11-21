
export function entpackeWeltDaten(d) {
  try {
    if (!d || d.v !== 1 || !d.hoehen) return null;
    const bin = atob(d.hoehen);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const q = new Int16Array(bytes.buffer);
    d.h = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) d.h[i] = q[i] * d.faktor;
    d.schritt = d.groesse / (d.n - 1);
    d.x0 = d.mitte[0] - d.groesse / 2;
    d.z0 = d.mitte[1] - d.groesse / 2;
    return d;
  } catch {
    return null;
  }
}

export async function ladeWeltDaten(url) {
  try {
    const antwort = await fetch(url);
    if (!antwort.ok) return null;
    return entpackeWeltDaten(await antwort.json());
  } catch {
    return null;
  }
}

export function hoeheBei(d, x, z) {
  const n = d.n;
  const gx = Math.min(Math.max((x - d.x0) / d.schritt, 0), n - 1.0001);
  const gz = Math.min(Math.max((z - d.z0) / d.schritt, 0), n - 1.0001);
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const h = d.h;
  const a = h[ix * n + iz] * (1 - fx) + h[(ix + 1) * n + iz] * fx;
  const b = h[ix * n + iz + 1] * (1 - fx) + h[(ix + 1) * n + iz + 1] * fx;
  return a * (1 - fz) + b * fz;
}
