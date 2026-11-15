// Timeline of "Kendi Bocor yang Bikin Air Tetap Sejuk": shots timed to projects/kendi_keringat/words.json, our cartoon
// Javanese village yard (flat ground, y = 0): Mbah Sumi's limasan house toward -x, her open kitchen shed (dapur) with a
// wooden table at the origin holding the clay kendi (and later Bayu's glass bottle), the yard opening toward +x.
// Camera grammar of the bridge short (slow push-ins, smootherstep glides, cuts on big reframes, kicks).
export const FPS = 30;
export const TOTAL = 1929;
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
export const TOP = 0.78;                                              // table top height
export const TABLE = { x0: -0.45, x1: 0.45, z0: -0.85, z1: 0.85 };    // the kitchen table (top outline)
export const SHED = { x0: -2.3, x1: 2.1, z0: -2.7, z1: 2.7, eave: 2.55, ridge: 3.45 };
export const HOUSE = { x: -7.6, z: -1.5, w: 8, d: 6, h: 2.7 };        // Mbah Sumi's house, facade to +x
export const KENDI: V3 = [0.05, TOP, -0.22];                          // the clay kendi (its base)
export const BOTTLE: V3 = [0.08, TOP, 0.24];                          // Bayu's glass bottle (its base)
export const KENDI_H = 0.4, BOTTLE_H = 0.3;
export const MBAH: V3 = [-0.85, 0, -0.55];                            // behind the table
export const BAYU: V3 = [0.75, 0, 1.05];                                // at the +z end of the table
export const STOVE: V3 = [-1.75, 0, -1.7];                            // the clay stove (tungku)
/** Bayu walking home across the yard in shot 4 (toward -x) */
export const bayuWalk = (f: number): V3 => { const u = clamp01((f - 293) / 100); return [5.6 - 3.5 * u, 0, 3.3 - 1.5 * u]; };
/** when the bottle stands on the table */
export const BOTTLE_ON = 560;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 139, light: "day" },
  { id: 2, a: 139, b: 197, light: "day" },
  { id: 3, a: 197, b: 293, light: "day" },
  { id: 4, a: 293, b: 414, light: "day" },
  { id: 5, a: 414, b: 540, light: "day" },
  { id: 6, a: 540, b: 607, light: "day" },
  { id: 7, a: 607, b: 691, light: "day", sunEl: 70 },
  { id: 8, a: 691, b: 839, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 9, a: 839, b: 955, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 10, a: 955, b: 1044, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 11, a: 1044, b: 1132, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 12, a: 1132, b: 1238, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 13, a: 1238, b: 1382, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 14, a: 1382, b: 1485, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 15, a: 1485, b: 1601, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 16, a: 1601, b: 1702, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 17, a: 1702, b: 1803, light: "golden", sunAz: 150, sunEl: 14 },
  { id: 18, a: 1803, b: TOTAL, light: "golden", sunAz: 150, sunEl: 14 },
];
export const XFADE: Record<number, number> = { 4: 8, 7: 8, 8: 8, 13: 6, 16: 8, 18: 8 };
export const FLASH_AT = 139;
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
/** framing on `p` (feet / base): lens `dist` m away at azimuth `az` (0 = lens on -z looking +z; -90 = lens on +x looking
 *  -x, screen-right = -z), lens at p.y + camH, aimed at p.y + lookH. */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const MID: V3 = [0.0, 0, 0.3];
const S1a = (f: number) => ms(KENDI, -96, 1.55, pushK(f, 0, 0.0024, 0.006, 30), { camH: 0.32, lookH: 0.26, fov: 40 });
const S2a = (f: number) => ms(MBAH, -100, 3.0, pushK(f, 139, 0.0025), { lookH: 1.15, camH: 1.25, dz: -0.15 });
const S3a = (f: number) => dolly([7.5, 2.9, 4.2], [-0.6, 1.2, -0.2], pushK(f, 197, 0.0015), { fov: 42 });
const S3b = (f: number) => ms(KENDI, -100, 2.3, pushK(f, 245, 0.002), { camH: 0.55, lookH: 0.3, fov: 40 });
const S4a = (f: number) => dolly([10.8, 1.2, -0.9], [3.0, 0.7, 2.6], pushK(f, 293, 0.0016), { fov: 44 });
const S5a = (f: number) => ms(MID, -128, 3.6, pushK(f, 414, 0.002, 0.005, 30), { lookH: 1.05, camH: 1.3 });
const S6a = (f: number) => ms([0.06, TOP, 0.01], -92, 2.0, pushK(f, 540, 0.0025), { camH: 0.38, lookH: 0.2, fov: 40 });
const S7a = (f: number) => dolly([14, 2.0, -7.5], [-1.5, 2.6, 0.5], pushK(f, 607, 0.0016), { fov: 46 });
const S8a = (f: number) => ms(BAYU, -112, 2.7, pushK(f, 691, 0.0022, 0.005, 30), { lookH: 0.95, camH: 1.05, dz: 0.12 });
const S9a = (f: number) => ms(BAYU, -78, 2.5, pushK(f, 839, 0.0022, 0.006, 25), { lookH: 0.95, camH: 1.05, dz: 0.08 });
const S10a = (f: number) => ms(BAYU, -96, 2.4, pushK(f, 955, 0.002), { lookH: 1.0, camH: 1.1, dz: -0.2 });
const S11a = (f: number) => ms(BAYU, -112, 2.0, pushK(f, 1044, 0.003), { lookH: 0.92, camH: 1.0, roll: -0.075, fov: 38 });
const S12a = (f: number) => ms(MBAH, -78, 2.9, pushK(f, 1132, 0.0022, 0.005, 30), { lookH: 1.05, camH: 1.2, dz: 0.25 });
const S13a = (f: number) => ms(KENDI, -90, 1.25, pushK(f, 1238, 0.0018), { camH: 0.28, lookH: 0.22, fov: 40 });
const S14a = (f: number) => ms(KENDI, -104, 1.05, pushK(f, 1382, 0.002), { camH: 0.3, lookH: 0.24, fov: 40 });
const S15a = (f: number) => ms(KENDI, -84, 1.7, pushK(f, 1485, 0.0016), { camH: 0.4, lookH: 0.32, fov: 40 });
const S16a = (f: number) => ms(BAYU, -94, 2.3, pushK(f, 1601, 0.0022), { lookH: 1.0, camH: 1.1, dz: 0.1 });
const S17a = (f: number) => ms(BOTTLE, -98, 1.15, pushK(f, 1702, 0.0024, 0.005, 30), { camH: 0.26, lookH: 0.17, fov: 40 });
const S18a = (f: number): Shot => lerpShot(ms(MID, -125, 3.4, 1, { lookH: 1.0, camH: 1.15 }), ms(MID, -125, 4.7, 1, { lookH: 0.95, camH: 2.4, fov: 42 }), glide((f - 1830) / 90));

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 139, s: S2a }], 3: [{ f: 197, s: S3a }, { f: 238, dur: 40, s: S3b }], 4: [{ f: 289, s: S4a }],
  5: [{ f: 414, s: S5a }], 6: [{ f: 540, s: S6a }], 7: [{ f: 603, s: S7a }], 8: [{ f: 687, s: S8a }], 9: [{ f: 839, s: S9a }],
  10: [{ f: 955, s: S10a }], 11: [{ f: 1044, s: S11a }], 12: [{ f: 1132, s: S12a }], 13: [{ f: 1235, s: S13a }], 14: [{ f: 1382, s: S14a }],
  15: [{ f: 1485, s: S15a }], 16: [{ f: 1597, s: S16a }], 17: [{ f: 1702, s: S17a }], 18: [{ f: 1799, s: S18a }],
};

const KICKS: [number, number][] = [[452, 0.6], [753, 0.6], [1044, 0.5], [1132, 0.4]];
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
const kendiMid = () => add(KENDI, [0, 0.2, 0]);
export const DOF: Dof[] = [
  { f: 0, cInf: 14, focus: kendiMid },
  { f: 139, cInf: 11, focus: eyesOf(MBAH) },
  { f: 197, cInf: 0 },
  { f: 245, dur: 30, cInf: 10, focus: kendiMid },
  { f: 293, cInf: 5, focus: (f) => add(bayuWalk(f), [0, 1.1, 0]) },
  { f: 414, cInf: 9, focus: eyesOf(BAYU, 1.1) },
  { f: 540, cInf: 13, focus: () => add(KENDI, [0, 0.15, 0.2]) },
  { f: 607, cInf: 0 },
  { f: 691, cInf: 11, focus: eyesOf(BAYU, 1.1) },
  { f: 839, cInf: 11, focus: eyesOf(BAYU, 1.1) },
  { f: 955, cInf: 12, focus: eyesOf(BAYU, 1.1) },
  { f: 1044, cInf: 14, focus: eyesOf(BAYU, 1.05) },
  { f: 1132, cInf: 11, focus: eyesOf(MBAH) },
  { f: 1238, cInf: 13, focus: kendiMid },
  { f: 1382, cInf: 14, focus: kendiMid },
  { f: 1485, cInf: 3, focus: kendiMid },
  { f: 1601, cInf: 12, focus: eyesOf(BAYU, 1.1) },
  { f: 1702, cInf: 14, focus: () => add(BOTTLE, [0, 0.15, 0]) },
  { f: 1803, cInf: 8, focus: () => add(MID, [0, 1.0, 0]) },
  { f: 1830, dur: 60, cInf: 4 },
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
export const FOREGROUND: Fg[] = [
  { a: 607, b: 691, kit: "plant_bushDetailed", pos: [11.2, 0, -5.3], s: 1.0, yaw: 1.2 },
];
