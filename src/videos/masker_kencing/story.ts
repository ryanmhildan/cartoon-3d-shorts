// Timeline of "Masker Gas Pertama Terbuat dari Air Kencing": shots timed to projects/masker_kencing/words.json.
// World: a straight front-line trench along z at x = 0 (floor at FLOOR, sandbag parapet on the enemy side +x), muddy
// no-man's land toward +x with craters, wire and bare trees, the town (Ypres) far toward -x. The chlorine cloud is a
// field of soft yellow-green cards whose front moves toward the trench (gasFront).
export const FPS = 30;
export const TOTAL = 1933;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

export const groundY = (_x: number, _z: number) => 0;
export const at = (x: number, z: number, dy = 0): V3 => [x, dy, z];
// (kept for the unused village builder)
export const TOP = 0.78;
export const TABLE = { x0: -0.45, x1: 0.45, z0: -0.85, z1: 0.85 };
export const SHED = { x0: -2.3, x1: 2.1, z0: -2.7, z1: 2.7, eave: 2.55, ridge: 3.45 };
export const HOUSE = { x: -7.6, z: -1.5, w: 8, d: 6, h: 2.7 };
export const KENDI: V3 = [0.05, TOP, -0.22];
export const BOTTLE: V3 = [0.08, TOP, 0.24];
export const STOVE: V3 = [-1.75, 0, -1.7];

// ---------------- the trench ----------------
export const FLOOR = -1.8;
export const TW = 1.5;                       // half width of the trench (x from -TW to +TW)
export const fl = (x: number, z: number): V3 => [x, FLOOR, z];
export const HERO = fl(0.15, 0);            // our soldier (red neckerchief)
export const MATES: V3[] = [fl(-0.35, -1.7), fl(0.35, 1.8), fl(-0.25, 3.4), fl(0.3, -3.4), fl(-0.3, 5.2), fl(0.25, -5.3)];
export const OFFICER = fl(-0.2, 8.5);
export const BRAZIER = fl(-0.6, -12);
export const SMOKER = fl(0.2, -10.6);

// ---------------- the gas cloud ----------------
/** x of the cloud front (it comes from +x); density 0..1 */
export const gasAt = (id: number, f: number): { front: number; dens: number } => {
  if (id === 1) return { front: -6, dens: 0.75 };
  if (id === 2) return { front: 160, dens: 0.9 };
  if (id === 3) return { front: 150 - 100 * smooth((f - 309) / 138), dens: 1 };
  if (id === 12) return { front: 10 - 14 * smooth((f - 1156) / 52), dens: 1 };
  if (id >= 4 && id <= 11) return { front: 14, dens: 0.9 };
  if (id === 13) return { front: -8, dens: 0.5 };
  if (id >= 18) return { front: 30, dens: 0.25 };
  return { front: 24, dens: 0.45 };
};

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
const A = [0, 164, 309, 447, 482, 565, 726, 825, 943, 1026, 1111, 1156, 1208, 1294, 1384, 1500, 1644, 1755, 1828, TOTAL];
const GOLD = [18, 19], FAR: Record<number, number> = { 2: 1.6, 3: 1.4 };
export const SHOTS: ShotDef[] = A.slice(0, -1).map((a, i) => ({
  id: i + 1, a, b: A[i + 1], light: GOLD.includes(i + 1) ? "golden" : "day", far: FAR[i + 1],
  ...(GOLD.includes(i + 1) ? { sunAz: 30, sunEl: 10 } : {}),
}));
export const XFADE: Record<number, number> = { 3: 8, 7: 8, 8: 8, 14: 8, 17: 8, 18: 8 };
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
/** a lens in the trench looking along it: from z = p.z + dz (dz < 0: lens toward -z), sideways x, aimed at p + lookH */
const along = (p: V3, dz: number, x: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; lx?: number } = {}): Shot =>
  dolly([x, p[1] + (o.camH ?? 1.45), p[2] + dz], [p[0] + (o.lx ?? 0), p[1] + (o.lookH ?? 1.35), p[2]], k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
const S1a = (f: number) => along(HERO, -5.2, -0.9, pushK(f, 0, 0.0016, 0.004, 30), { lookH: 1.25, lx: 0.1, fov: 42 });
const S2a = (f: number) => dolly([-34, 22, -40], [6, -1, 6], pushK(f, 164, 0.0012), { fov: 44 });
const S3a = (f: number) => dolly([-0.4, 1.1, -1], [60, 4.5, 10], pushK(f, 309, 0.0014), { fov: 48 });
const S4a = (f: number) => along(HERO, -2.1, -0.55, pushK(f, 447, 0.003, 0.007, 25), { lookH: 1.62, camH: 1.6, fov: 38 });
const S5a = (f: number) => dolly([-1.05, FLOOR + 1.5, -8.5], [0.1, FLOOR + 1.2, 1.5], pushK(f, 482, 0.0016), { fov: 44 });
const S6a = (f: number) => along(HERO, 3.4, 0.7, pushK(f, 565, 0.0018), { lookH: 1.45, camH: 1.5, fov: 40 });
const S7a = (f: number) => along(HERO, 2.2, -0.6, pushK(f, 726, 0.002), { lookH: 1.3, camH: 1.4, fov: 40 });
const S8a = (f: number) => along(OFFICER, -3.4, 0.7, pushK(f, 825, 0.0018, 0.005, 30), { lookH: 1.45, camH: 1.45, fov: 40 });
const S9a = (f: number) => along(OFFICER, 4.2, 0.7, pushK(f, 943, 0.0016), { lookH: 1.3, camH: 1.5, fov: 44, lx: 0 });
const S10a = (f: number) => along(HERO, -4.6, -0.9, pushK(f, 1026, 0.0016), { lookH: 1.25, fov: 42 });
const S11a = (f: number) => along(HERO, -2.6, 0.6, pushK(f, 1111, 0.0022, 0.006, 25), { lookH: 1.45, camH: 1.5, fov: 40 });
const S12a = (f: number) => dolly([-1.0, FLOOR + 1.3, -4.2], [0.6, FLOOR + 2.2, 0.8], pushK(f, 1156, 0.0016), { fov: 46 });
const S13a = (f: number) => along(HERO, -2.4, -0.6, pushK(f, 1208, 0.0024, 0.006, 25), { lookH: 1.55, camH: 1.55, fov: 40, roll: 0.075 });
const S14a = (f: number) => along(HERO, -4.0, -0.7, pushK(f, 1294, 0.0012), { lookH: 1.3, fov: 42 });
const S15a = (f: number) => along(HERO, 4.0, 0.7, pushK(f, 1384, 0.0012), { lookH: 1.3, fov: 42 });
const S16a = (f: number) => along(HERO, -4.0, 0.7, pushK(f, 1500, 0.0012), { lookH: 1.3, fov: 42 });
const S17a = (f: number) => along(SMOKER, 2.8, 0.7, pushK(f, 1644, 0.0018), { lookH: 1.25, camH: 1.4, fov: 42, lx: -0.3 });
const S18a = (f: number) => dolly([-1.0, FLOOR + 1.6, -9], [0.1, FLOOR + 1.3, 3], pushK(f, 1755, 0.0014), { fov: 44 });
const S19a = (f: number) => along(HERO, -2.6, -0.6, pushK(f, 1828, 0.0022), { lookH: 1.5, camH: 1.5, fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 164, s: S2a }], 3: [{ f: 305, s: S3a }], 4: [{ f: 447, s: S4a }], 5: [{ f: 482, s: S5a }],
  6: [{ f: 565, s: S6a }], 7: [{ f: 722, s: S7a }], 8: [{ f: 821, s: S8a }], 9: [{ f: 943, s: S9a }], 10: [{ f: 1026, s: S10a }],
  11: [{ f: 1111, s: S11a }], 12: [{ f: 1156, s: S12a }], 13: [{ f: 1208, s: S13a }], 14: [{ f: 1290, s: S14a }], 15: [{ f: 1384, s: S15a }],
  16: [{ f: 1500, s: S16a }], 17: [{ f: 1640, s: S17a }], 18: [{ f: 1751, s: S18a }], 19: [{ f: 1828, s: S19a }],
};

const KICKS: [number, number][] = [[461, 0.5], [886, 0.5], [1026, 0.4], [1111, 0.5]];
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
export const DOF: Dof[] = [
  { f: 0, cInf: 9, focus: eyesOf(HERO) },
  { f: 164, cInf: 0 },
  { f: 447, cInf: 13, focus: eyesOf(HERO, 1.6) },
  { f: 482, cInf: 7, focus: eyesOf(HERO) },
  { f: 565, cInf: 11, focus: eyesOf(HERO) },
  { f: 825, cInf: 11, focus: eyesOf(OFFICER) },
  { f: 943, cInf: 8, focus: eyesOf(OFFICER) },
  { f: 1026, cInf: 9, focus: eyesOf(HERO) },
  { f: 1111, cInf: 12, focus: eyesOf(HERO) },
  { f: 1156, cInf: 6, focus: eyesOf(HERO) },
  { f: 1208, cInf: 13, focus: eyesOf(HERO, 1.6) },
  { f: 1294, cInf: 12, focus: eyesOf(HERO) },
  { f: 1644, cInf: 10, focus: eyesOf(SMOKER) },
  { f: 1755, cInf: 7, focus: eyesOf(HERO) },
  { f: 1828, cInf: 12, focus: eyesOf(HERO, 1.6) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
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
