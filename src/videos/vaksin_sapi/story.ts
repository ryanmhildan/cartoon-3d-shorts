// Timeline of "Dokter yang Menulari Anak dengan Penyakit Sapi": shots timed to projects/vaksin_sapi/words.json, an
// English village of 1796 (street, Jenner's house + garden, the cow pasture, a hay pile), and the camera grammar of the
// bridge short. Camera az 180 = lens on +z looking -z (screen-right = +x).
export const FPS = 30;
export const TOTAL = 1907;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places ----------------
export const SEA_Y = -3;
export const STREET: V3 = [0, 0, -5];
export const NOTICE: V3 = [3.2, 0, -8.6];
export const PASTURE = { x0: 18, x1: 42, z0: -2, z1: 18 };
export const FENCE_MAID: V3 = [24, 0, -3.4];        // milkmaids stand outside the fence (south side)
export const COWS: V3[] = [[23.5, 0, 0.6], [27.5, 0, 2.5], [31, 0, 5], [25, 0, 8], [35, 0, 9], [21, 0, 12]];
export const GARDEN: V3 = [-19, 0, -4.6];           // in front of Jenner's house
export const JHOUSE = { x: -20, z: -13 };
export const HAY: V3 = [8, 0, 10];
export const KIDS0: V3 = [4.3, 0, 12.8];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 106, light: "day" },
  { id: 2, a: 106, b: 262, light: "day" },
  { id: 3, a: 262, b: 408, light: "day" },
  { id: 4, a: 408, b: 526, light: "day" },
  { id: 5, a: 526, b: 650, light: "day" },
  { id: 6, a: 650, b: 814, light: "day" },
  { id: 7, a: 814, b: 947, light: "day" },
  { id: 8, a: 947, b: 1018, light: "day" },
  { id: 9, a: 1018, b: 1137, light: "day" },
  { id: 10, a: 1137, b: 1234, light: "day" },
  { id: 11, a: 1234, b: 1391, light: "day" },
  { id: 12, a: 1391, b: 1532, light: "day" },
  { id: 13, a: 1532, b: 1665, light: "day" },
  { id: 14, a: 1665, b: 1775, light: "day" },
  { id: 15, a: 1775, b: TOTAL, light: "day" },
];
export const XFADE: Record<number, number> = { 2: 8, 3: 8, 6: 8, 9: 8, 13: 8, 14: 6 };
export const FLASH_AT = 106;
export const SPY = { a: -10, b: -10 };

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const G = GARDEN, M = FENCE_MAID;
const S1a = (f: number) => ms(G, 180, 6.6, pushK(f, 0, 0.003, 0.006, 25), { lookH: 1.1, dx: 0.4, roll: 0.04 });
const S2a = (f: number) => ms(STREET, 180, 10.5, pushK(f, 106, 0.0018), { lookH: 1.7, camH: 2.2, dx: 2.2 });
const S3a = (f: number) => ms(M, 0, 9.0, pushK(f, 262, 0.0018), { lookH: 1.3, camH: 1.8, dx: 1.0 });
const S4a = (f: number) => ms(add(M, [0.6, 0, 0]), 8, 4.4, pushK(f, 408, 0.0025), { lookH: 1.5 });
const S5a = (f: number) => ms(add(M, [1.05, 0, 0.15]), -6, 4.6, pushK(f, 526, 0.003), { lookH: 1.35, fov: 38 });
const S6a = (f: number) => ms(G, 180, 7.4, pushK(f, 650, 0.0022, 0.005, 30), { lookH: 1.2, camH: 1.5, dx: 0.15 });
const S7a = (f: number) => ms(G, 186, 4.4, pushK(f, 814, 0.0028), { lookH: 1.35, roll: -0.075, dx: 0.35 });
const S8a = (f: number) => ms(add(G, [0.2, 0, 0]), 176, 3.4, pushK(f, 947, 0.004, 0.008, 25), { lookH: 1.0, camH: 1.1, fov: 38 });
const S9a = (f: number) => ms(add(NOTICE, [0, 0, 2.6]), 180, 8.6, pushK(f, 1018, 0.002), { lookH: 1.5, camH: 1.8 });
const S10a = (f: number) => ms(add(M, [0.8, 0, 0]), -8, 3.8, pushK(f, 1137, 0.003), { lookH: 1.3, roll: -0.07, dx: -0.5 });
const S11a = (f: number) => ms(STREET, 180, 4.0, pushK(f, 1234, 0.0015), { lookH: 1.9, camH: 1.9 });
const S12a = (f: number) => ms(STREET, 182, 4.0, pushK(f, 1391, 0.0015), { lookH: 1.9, camH: 1.9 });
const S13a = (f: number) => ms(add(HAY, [-1.4, 0, 1.6]), 175, 11, pushK(f, 1532, 0.002), { lookH: 1.0, camH: 1.9 });
const S14a = (f: number) => ms(add(M, [1.3, 0, 0]), 0, 8.0, pushK(f, 1665, 0.0022), { lookH: 1.2, camH: 1.7 });
const S15a = (f: number): Shot => { const s = glide((f - 1830) / 70); const a = ms(add(M, [1.3, 0, 0]), 0, 8.0, 1, { lookH: 1.5, camH: 1.7 }); return { pos: [a.pos[0], a.pos[1] + 6 * s, a.pos[2] - 5 * s], look: [a.look[0], a.look[1] + 1.2 * s, a.look[2]], fov: 42 + 4 * s }; };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 102, s: S2a }], 3: [{ f: 258, s: S3a }], 4: [{ f: 408, s: S4a }], 5: [{ f: 526, s: S5a }],
  6: [{ f: 646, s: S6a }], 7: [{ f: 814, s: S7a }], 8: [{ f: 947, s: S8a }], 9: [{ f: 1014, s: S9a }], 10: [{ f: 1137, s: S10a }],
  11: [{ f: 1234, s: S11a }], 12: [{ f: 1391, s: S12a }], 13: [{ f: 1528, s: S13a }], 14: [{ f: 1662, s: S14a }], 15: [{ f: 1775, s: S15a }],
};

const KICKS: [number, number][] = [[36, 0.5], [872, 0.7], [986, 0.6], [1036, 0.5], [1234, 0.4], [1864, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) {
    const n = Math.floor((t - f0 / FPS) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyesOf = (p: V3, dy = 1.6) => (): V3 => [p[0], p[1] + dy, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 12, focus: eyesOf(add(G, [0.4, 0, 0])) },
  { f: 106, cInf: 6, focus: eyesOf(STREET) },
  { f: 262, cInf: 8, focus: eyesOf(M) },
  { f: 408, cInf: 10, focus: eyesOf(add(M, [0.6, 0, 0])) },
  { f: 526, cInf: 14, focus: eyesOf(add(M, [1.0, 0, 0])) },
  { f: 650, cInf: 10, focus: eyesOf(G, 1.3) },
  { f: 814, cInf: 13, focus: eyesOf(G) },
  { f: 947, cInf: 14, focus: eyesOf(add(G, [0.6, 0, 0]), 1.1) },
  { f: 1018, cInf: 8, focus: eyesOf(add(NOTICE, [0, 0, 2.6])) },
  { f: 1137, cInf: 13, focus: eyesOf(add(M, [1.2, 0, 0])) },
  { f: 1234, cInf: 10, focus: eyesOf(STREET, 1.9) },
  { f: 1532, cInf: 6, focus: eyesOf(HAY, 1.0) },
  { f: 1665, cInf: 8, focus: eyesOf(add(M, [1.4, 0, 0])) },
  { f: 1830, dur: 40, cInf: 3 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus ?? p.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
