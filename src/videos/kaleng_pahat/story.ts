// Timeline of "Kaleng yang Lahir Tanpa Pembuka Kaleng": shots timed to projects/kaleng_pahat/words.json, a European
// town (street, notice board, houses) and Appert's yard kitchen (awning, bottle table, the boiling pot), and the camera
// grammar of the bridge short. Camera az 180 = lens on +z looking -z (screen-right = +x).
export const FPS = 30;
export const TOTAL = 2001;
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
export const YARD: V3 = [-19, 0, -4.6];               // Appert stands here (yard kitchen in front of his house)
export const JHOUSE = { x: -20, z: -13 };
export const TABLE = { x0: -22.2, x1: -19.8, z0: -6.9, z1: -5.9, top: 0.9 };
export const POT: V3 = [-17.2, 0, -6.4];
export const POT_R = 0.75, POT_H = 0.9;
export const ENG: V3 = [24, 0, -5];                    // the English workshop corner (same street, far end)
// unused here but kept for the shared island builder
export const PASTURE = { x0: 60, x1: 70, z0: 30, z1: 40 };
export const GARDEN = YARD;
export const HAY: V3 = [80, 0, 40];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 154, light: "day" },
  { id: 2, a: 154, b: 248, light: "day" },
  { id: 3, a: 248, b: 397, light: "day" },
  { id: 4, a: 397, b: 530, light: "day" },
  { id: 5, a: 530, b: 699, light: "day" },
  { id: 6, a: 699, b: 843, light: "day" },
  { id: 7, a: 843, b: 973, light: "day" },
  { id: 8, a: 973, b: 1074, light: "day" },
  { id: 9, a: 1074, b: 1225, light: "day" },
  { id: 10, a: 1225, b: 1349, light: "day" },
  { id: 11, a: 1349, b: 1469, light: "day" },
  { id: 12, a: 1469, b: 1600, light: "day" },
  { id: 13, a: 1600, b: 1743, light: "day" },
  { id: 14, a: 1743, b: 1884, light: "day" },
  { id: 15, a: 1884, b: TOTAL, light: "day" },
];
export const XFADE: Record<number, number> = { 2: 8, 4: 8, 6: 8, 9: 6, 12: 6, 13: 8 };
export const FLASH_AT = 154;
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
const Y = YARD;
const S1a = (f: number) => ms(Y, 180, 3.8, pushK(f, 0, 0.003, 0.006, 25), { lookH: 1.2, roll: 0.04 });
const S2a = (f: number) => ms(STREET, 180, 10.5, pushK(f, 154, 0.0018), { lookH: 1.8, camH: 2.2, dx: 2.0 });
const S3a = (f: number) => ms(STREET, 180, 7.6, pushK(f, 248, 0.002), { lookH: 1.3, camH: 1.7, dx: 1.4 });
const S4a = (f: number) => ms(Y, 176, 6.2, pushK(f, 397, 0.002), { lookH: 1.4, camH: 1.8, dx: -0.45 });
const S5a = (f: number) => ms(Y, 178, 3.6, pushK(f, 530, 0.003), { lookH: 1.3, fov: 38 });
const S5b = (f: number) => ms(POT, 196, 5.6, pushK(f, 640, 0.0025), { lookH: 0.9, camH: 2.6, dx: -0.7 });
const S6a = (f: number) => ms(STREET, 180, 6.2, pushK(f, 699, 0.002), { lookH: 1.3, camH: 1.6 });
const S7a = (f: number) => ms(Y, 182, 6.0, pushK(f, 843, 0.0025, 0.006, 30), { lookH: 1.4, camH: 1.7, dx: 0.6 });
const S8a = (f: number) => ms(Y, 188, 3.4, pushK(f, 973, 0.003), { lookH: 1.35, roll: -0.075, fov: 38 });
const S9a = (f: number) => ms(add(TABLE_C(), [0, 0, 0]), 180, 3.6, pushK(f, 1074, 0.0018), { lookH: 1.5, camH: 1.7 });
const S10a = (f: number) => ms(POT, 176, 4.4, pushK(f, 1225, 0.0018), { lookH: 1.8, camH: 1.9 });
const S11a = (f: number) => ms(STREET, 180, 4.0, pushK(f, 1349, 0.0015), { lookH: 1.9, camH: 1.9 });
const S12a = (f: number) => ms(add(STREET, [-2.5, 0, 0]), 176, 5.2, pushK(f, 1469, 0.0022), { lookH: 1.4 });
const S13a = (f: number) => ms(ENG, 180, 6.0, pushK(f, 1600, 0.002), { lookH: 1.5, camH: 1.8, dx: 0.4 });
const S14a = (f: number) => ms(ENG, 186, 5.6, pushK(f, 1743, 0.0018), { lookH: 1.8, camH: 1.9 });
const S15a = (f: number) => ms(add(ENG, [0.2, 0, 0]), 176, 6.0, pushK(f, 1884, 0.0028, 0.006, 25), { lookH: 1.1, camH: 1.5 });
export function TABLE_C(): V3 { return [(TABLE.x0 + TABLE.x1) / 2, 0, (TABLE.z0 + TABLE.z1) / 2]; }

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 150, s: S2a }], 3: [{ f: 248, s: S3a }], 4: [{ f: 393, s: S4a }], 5: [{ f: 530, s: S5a }, { f: 640, cut: true, s: S5b }],
  6: [{ f: 695, s: S6a }], 7: [{ f: 843, s: S7a }], 8: [{ f: 973, s: S8a }], 9: [{ f: 1071, s: S9a }], 10: [{ f: 1225, s: S10a }],
  11: [{ f: 1349, s: S11a }], 12: [{ f: 1466, s: S12a }], 13: [{ f: 1596, s: S13a }], 14: [{ f: 1743, s: S14a }], 15: [{ f: 1884, s: S15a }],
};

const KICKS: [number, number][] = [[45, 0.5], [618, 0.5], [940, 0.6], [1101, 0.4], [1435, 0.6], [1945, 0.8], [1961, 0.8]];
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
  { f: 0, cInf: 13, focus: eyesOf(Y) },
  { f: 154, cInf: 5, focus: eyesOf(add(STREET, [2, 0, 0])) },
  { f: 248, cInf: 8, focus: eyesOf(add(STREET, [1.4, 0, 0])) },
  { f: 397, cInf: 9, focus: eyesOf(Y) },
  { f: 530, cInf: 13, focus: eyesOf(Y) },
  { f: 640, cInf: 9, focus: eyesOf(POT, 0.9) },
  { f: 699, cInf: 9, focus: eyesOf(STREET) },
  { f: 843, cInf: 9, focus: eyesOf(add(Y, [0.6, 0, 0])) },
  { f: 973, cInf: 14, focus: eyesOf(Y) },
  { f: 1074, cInf: 10, focus: () => add(TABLE_C(), [0, 1.5, 0]) },
  { f: 1225, cInf: 9, focus: eyesOf(POT, 1.8) },
  { f: 1349, cInf: 10, focus: eyesOf(STREET, 1.9) },
  { f: 1469, cInf: 12, focus: eyesOf(add(STREET, [-2.5, 0, 0])) },
  { f: 1600, cInf: 9, focus: eyesOf(add(ENG, [0.4, 0, 0])) },
  { f: 1743, cInf: 9, focus: eyesOf(ENG, 1.8) },
  { f: 1884, cInf: 13, focus: eyesOf(add(ENG, [0.4, 0, 0]), 1.2) },
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
