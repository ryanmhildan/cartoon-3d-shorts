// Timeline of "Seratus Rupiah yang Merebut Satu Pasar": shots timed to projects/harga_sembilan/words.json, our cartoon
// Indonesian market (flat cement floor, y = 0). Two sandal stalls side by side, fronts toward +z: Bu Rini's (blue tarp)
// at x < 0 = screen-left of a frontal lens, Pak Joko's (orange tarp) at x > 0. Their cardboard price signs hang from the
// front beams at the inner ends, close together. The aisle runs along x in front of them (z > 0.6).
// Camera grammar of the bridge short (slow push-ins, smootherstep glides, cuts on big reframes, kicks).
export const FPS = 30;
export const TOTAL = 1830;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- the land ----------------
export const groundY = (_x: number, _z: number) => 0;
export const at = (x: number, z: number, dy = 0): V3 => [x, dy, z];

// ---------------- places ----------------
export const TOP = 0.8;                                                  // table top height
/** stall footprints (poles); the table sits inside, the tarp roof slopes from the front beam up to the back */
export const STALL_R = { x0: -2.4, x1: -0.06, z0: -1.45, z1: 0.55 };
export const STALL_J = { x0: 0.06, x1: 2.4, z0: -1.45, z1: 0.55 };
export const BEAM = 2.45, BACK = 2.75;
export const RINI: V3 = [-1.25, 0, -0.85];
export const JOKO: V3 = [1.25, 0, -0.85];
/** price signs (centre), hung from the front beams */
export const SIGN_R: V3 = [-0.48, 2.08, 0.52];
export const SIGN_J: V3 = [0.48, 2.08, 0.52];
export const SIGN_W = 0.64, SIGN_H = 0.44;
export const BASKET: V3 = [-1.95, TOP, -0.05];
export const BUYER: V3 = [0.0, 0, 2.7];
export const BAPAK: V3 = [-4.6, 0, 2.6];
/** Joko's sign reads 9.900 from here on */
export const NEW_SIGN = 472;
/** the queue snaking from Joko's table out along the aisle */
export const QUEUE: V3[] = Array.from({ length: 12 }, (_, i) => [1.15 + 0.75 * Math.sin(i * 0.75) + 0.12 * i, 0, 1.15 + i * 0.6] as V3);
/** the crowd at Joko's table in the hook and the ending */
export const CROWD: V3[] = [[0.45, 0, 1.0], [1.25, 0, 1.05], [2.05, 0, 1.0], [0.85, 0, 1.65], [1.7, 0, 1.7], [0.3, 0, 2.3], [1.3, 0, 2.35], [2.25, 0, 2.3]];
/** the buyer of shot 8: looks left, right, then walks off to the right (toward Joko) */
export const buyerAt = (f: number): V3 => { const u = clamp01((f - 878) / 36); return [BUYER[0] + 1.3 * u, 0, BUYER[2] - 0.7 * u]; };

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
const G = { light: "golden" as Light, sunAz: 150, sunEl: 14 };
const NOON = { light: "day" as Light, sunAz: 140, sunEl: 70 };
const DAY = { light: "day" as Light, sunAz: 140 };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 164, ...DAY },
  { id: 2, a: 164, b: 266, ...DAY },
  { id: 3, a: 266, b: 383, ...DAY },
  { id: 4, a: 383, b: 537, ...DAY },
  { id: 5, a: 537, b: 611, ...DAY },
  { id: 6, a: 611, b: 695, ...DAY },
  { id: 7, a: 695, b: 811, ...NOON },
  { id: 8, a: 811, b: 914, ...NOON },
  { id: 9, a: 914, b: 1017, ...NOON },
  { id: 10, a: 1017, b: 1180, ...G },
  { id: 11, a: 1180, b: 1346, ...G },
  { id: 12, a: 1346, b: 1496, ...G },
  { id: 13, a: 1496, b: 1600, ...G },
  { id: 14, a: 1600, b: 1665, ...NOON },
  { id: 15, a: 1665, b: 1777, ...NOON },
  { id: 16, a: 1777, b: TOTAL, ...NOON },
];
export const XFADE: Record<number, number> = { 7: 8, 10: 8, 13: 6, 14: 8 };
export const FLASH_AT = 164;
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
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerpShot = (a: Shot, b: Shot, s: number): Shot => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * s) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * s) as V3,
  fov: (a.fov ?? 40) + ((b.fov ?? 40) - (a.fov ?? 40)) * s, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * s,
});
/** framing on `p` (feet / base): lens `dist` m away at azimuth `az` (180 = lens on +z looking -z, screen-right = +x),
 *  lens at p.y + camH, aimed at p.y + lookH. */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const SJ: V3 = [SIGN_J[0], 0, SIGN_J[2]];
const S1a = (f: number) => ms(JOKO, 176, 7.0, pushK(f, 0, 0.0024, 0.006, 30), { camH: 4.6, lookH: 1.1, dx: -0.3, fov: 42 });
const S2a = (f: number) => dolly([7.8, 3.5, 10.8], [-0.4, 1.4, 0], pushK(f, 164, 0.0015), { fov: 42 });
const S3a = (f: number) => ms([0, 0, -0.85], 180, 8.6, pushK(f, 266, 0.002), { camH: 1.8, lookH: 1.45, fov: 44 });
const S4a = (f: number) => ms(JOKO, 196, 2.9, pushK(f, 383, 0.0022), { camH: 1.6, lookH: 1.35, dx: 0.18 });
const S4b = (f: number) => ms(SJ, 182, 1.6, pushK(f, 452, 0.002), { camH: 2.0, lookH: SIGN_J[1] });
const S5a = (f: number) => ms(RINI, 172, 3.1, pushK(f, 537, 0.002, 0.005, 30), { camH: 1.45, lookH: 1.2, dx: -0.25 });
const S6a = (f: number) => ms(RINI, 186, 2.3, pushK(f, 611, 0.0025), { camH: 1.65, lookH: 1.6, dx: 0.05 });
const S7a = (f: number) => dolly([-4.8, 6.8, 10.5], [1.3, 0.5, 3.2], pushK(f, 695, 0.0015), { fov: 46 });
const S8a = (f: number) => ms(BUYER, 180, 3.9, pushK(f, 811, 0.0018), { camH: 1.3, lookH: 1.5 });
const S9a = (f: number) => ms(RINI, 160, 2.4, pushK(f, 914, 0.003), { camH: 1.5, lookH: 1.5, roll: -0.075 });
const S10a = (f: number) => ms(SJ, 178, 3.0, pushK(f, 1017, 0.0018), { camH: 1.7, lookH: 1.6 });
const S11a = (f: number) => ms(BUYER, 196, 3.2, pushK(f, 1180, 0.0022), { camH: 1.6, lookH: 1.55, dx: 0.1 });
const S12a = (f: number) => ms(BAPAK, 185, 2.6, pushK(f, 1346, 0.002), { camH: 1.25, lookH: 1.05 });
const S13a = (f: number) => ms([0, 0, SIGN_J[2]], 180, 4.8, pushK(f, 1496, 0.0018), { camH: 1.35, lookH: 1.75 });
const S14a = (f: number) => dolly([3.4, 2.7, 9.5], [0, 1.2, 0.6], pushK(f, 1600, 0.002), { fov: 42 });
const S15a = (f: number) => ms(RINI, 184, 3.0, pushK(f, 1665, 0.002), { camH: 1.45, lookH: 1.3, dx: 0.25 });
const S16a = (f: number): Shot => lerpShot(ms(JOKO, 176, 6.0, 1, { camH: 3.5, lookH: 1.2 }), ms(JOKO, 172, 8.5, 1, { camH: 5.0, lookH: 0.9, fov: 42 }), glide((f - 1790) / 60));

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 164, s: S2a }], 3: [{ f: 266, s: S3a }], 4: [{ f: 383, s: S4a }, { f: 452, dur: 26, s: S4b }],
  5: [{ f: 537, s: S5a }], 6: [{ f: 611, s: S6a }], 7: [{ f: 691, s: S7a }], 8: [{ f: 811, s: S8a }], 9: [{ f: 914, s: S9a }],
  10: [{ f: 1013, s: S10a }], 11: [{ f: 1180, s: S11a }], 12: [{ f: 1346, s: S12a }], 13: [{ f: 1493, s: S13a }], 14: [{ f: 1596, s: S14a }],
  15: [{ f: 1665, s: S15a }], 16: [{ f: 1777, s: S16a }],
};

const KICKS: [number, number][] = [[549, 0.6], [587, 0.45], [914, 0.5], [1777, 0.4]];
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
const eyesOf = (p: V3, dy = 1.5) => (): V3 => [p[0], p[1] + dy, p[2]];
const signJ = () => SIGN_J;
export const DOF: Dof[] = [
  { f: 0, cInf: 9, focus: eyesOf(JOKO) },
  { f: 164, cInf: 0 },
  { f: 266, cInf: 6, focus: () => [0, 1.6, -0.85] },
  { f: 383, cInf: 11, focus: eyesOf(JOKO) },
  { f: 452, dur: 26, cInf: 13, focus: signJ },
  { f: 537, cInf: 10, focus: eyesOf(RINI) },
  { f: 611, cInf: 12, focus: eyesOf(RINI) },
  { f: 695, cInf: 0 },
  { f: 811, cInf: 7, focus: (f) => add(buyerAt(f), [0, 1.5, 0]) },
  { f: 914, cInf: 12, focus: eyesOf(RINI) },
  { f: 1017, cInf: 13, focus: signJ },
  { f: 1180, cInf: 12, focus: eyesOf(BUYER) },
  { f: 1346, cInf: 11, focus: eyesOf(BAPAK, 1.3) },
  { f: 1496, cInf: 8, focus: () => [0, SIGN_J[1], SIGN_J[2]] },
  { f: 1600, cInf: 3, focus: () => [0, 1.4, 0.4] },
  { f: 1665, cInf: 11, focus: eyesOf(RINI) },
  { f: 1777, cInf: 9, focus: eyesOf(JOKO) },
  { f: 1790, dur: 60, cInf: 4 },
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
