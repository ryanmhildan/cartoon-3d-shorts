// Timeline of "Orang yang Jualan Es ke Negeri Tropis": shots timed to projects/raja_es/words.json, three zones on one
// sea (snowy Boston around the origin, the open sea far out, the tropical harbour + an Indonesian market at x = 2000),
// the sailing ship (posed per shot), and the camera grammar of the bridge short.
export const FPS = 30;
export const TOTAL = 1895;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places ----------------
export const SEA_Y = -0.6;
export const TX = 2000;                              // tropical harbour x offset
export const PIER = { x0: 2, x1: 6, z1: 22, y: 0.5 }; // pier (same shape at Boston and the tropics), along +z from the quay (z = 0)
export const SHIP_AT = (x0: number): V3 => [x0 + 10.6, SEA_Y, 13];
export const LAKE: V3 = [-70, 0.02, -45];
export const LAKE_R = 18;
export const T_LAKE: V3 = [-66, 0.02, -42];
export const T_PIER: V3 = [4.2, PIER.y, 9.5];
export const READER: V3 = [-1.5, 0, -6];
export const QUAY: V3 = [1.5, 0, -4.5];
export const CRATES: V3[] = [[-5.85, 0, -3], [-4.5, 0, -3], [-3.15, 0, -3]];
export const MART: V3 = [TX + 4.2, PIER.y, 8.5];
export const CALC: V3 = [TX + 1.5, 0, -4];
export const MARKET: V3 = [TX + 90, 0, -24];
export const SEA0: V3 = [800, SEA_Y, 800];
/** ship pose per shot: position, yaw (0 = bow toward +x), how full its ice stack is */
export const shipPose = (id: number, f: number): { pos: V3; yaw: number; ice: number } => {
  const t = f / FPS;
  if (id === 1 || id === 10) return { pos: [SEA0[0] + 3 * (t - (id === 1 ? 0 : 33)), SEA_Y + 0.12 * Math.sin(t * 1.4), SEA0[2]], yaw: 0, ice: 1 };
  if (id === 6 || id === 7) return { pos: SHIP_AT(TX), yaw: -Math.PI / 2, ice: 0.45 };
  if (id === 11 || id === 12 || id === 15) return { pos: SHIP_AT(TX), yaw: -Math.PI / 2, ice: 0.6 };
  return { pos: SHIP_AT(0), yaw: -Math.PI / 2, ice: id === 3 ? smooth((f - 338) / 60) * 0.9 + 0.1 : 1 };
};
/** Tudor on the deck in shot 1 (ship-local offset, then world) */
export const DECK_TUDOR = (f: number): V3 => { const s = shipPose(1, f).pos; return [s[0] - 2.4, s[1] + 1.7, s[2] - 1.3]; };

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 153, light: "day", far: 2 },
  { id: 2, a: 153, b: 243, light: "day" },
  { id: 3, a: 243, b: 406, light: "day" },
  { id: 4, a: 406, b: 520, light: "day" },
  { id: 5, a: 520, b: 582, light: "day" },
  { id: 6, a: 582, b: 736, light: "day" },
  { id: 7, a: 736, b: 765, light: "day" },
  { id: 8, a: 765, b: 817, light: "day" },
  { id: 9, a: 817, b: 1001, light: "day" },
  { id: 10, a: 1001, b: 1164, light: "day", far: 2 },
  { id: 11, a: 1164, b: 1246, light: "day" },
  { id: 12, a: 1246, b: 1352, light: "day" },
  { id: 13, a: 1352, b: 1461, light: "day" },
  { id: 14, a: 1461, b: 1557, light: "day" },
  { id: 15, a: 1557, b: 1649, light: "day" },
  { id: 16, a: 1649, b: 1766, light: "day" },
  { id: 17, a: 1766, b: TOTAL, light: "day" },
];
export const XFADE: Record<number, number> = { 2: 8, 6: 8, 9: 8, 10: 8, 11: 8, 13: 6, 16: 8, 17: 8 };
export const FLASH_AT = 153;
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
/** framing on someone standing at `p` (feet): lens `dist` m away at azimuth `az` (0 = lens on -z looking +z, 180 = lens on
 *  +z looking -z: then screen-right = +x), lens at feet + camH, aimed at feet + lookH. Faces at ~30 % of the height. */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const ship = (id: number, f: number) => shipPose(id, f).pos;
const S1a = (f: number) => dolly(add(ship(1, f), [-15, 5, -17]), add(ship(1, f), [1, 3.2, 0]), pushK(f, 0, 0.0018), { fov: 42 });
const S1b = (f: number) => ms(DECK_TUDOR(f), 0, 3.4, pushK(f, 91, 0.003, 0.006, 25), { lookH: 1.1, roll: 0.03 });
const S2a = (f: number) => dolly([-13, 3.4, 15], [1, 2.6, -9], pushK(f, 153, 0.0018), { fov: 44 });
const S3a = (f: number) => ms(T_LAKE, 20, 4.4, pushK(f, 243, 0.0022), { lookH: 0.9, camH: 1.6 });
const S3b = (f: number) => dolly(add(T_PIER, [-5.5, 2.6, -5]), add(T_PIER, [3, 1.2, 3]), pushK(f, 338, 0.0022), { fov: 42 });
const S4a = (f: number) => ms(READER, 180, 4.3, pushK(f, 406, 0.0025), { lookH: 1.25 });
const S5a = (f: number) => ms(add(QUAY, [-0.8, 0, 0]), 180, 9.0, pushK(f, 520, 0.003, 0.006, 25), { lookH: 1.1, roll: 0.03 });
const S6a = (f: number) => ms(add(MART, [0, 0, 1.0]), -15, 5.6, pushK(f, 582, 0.002), { lookH: 1.0, camH: 1.7 });
const S7a = (f: number) => ms(add(MART, [0.9, 0, -2.4]), -30, 2.6, pushK(f, 736, 0.004), { lookH: 1.25, roll: -0.05, fov: 38 });
const S8a = (f: number) => ms(QUAY, 172, 3.0, pushK(f, 765, 0.004, 0.008, 25), { lookH: 1.3, roll: 0.06, fov: 38 });
const S9a = (f: number) => ms(CRATES[1], 180, 11, pushK(f, 817, 0.0018), { lookH: 1.0, camH: 2.4, fov: 42 });
const S10a = (f: number) => dolly(add(ship(10, f), [10, 7, -24]), add(ship(10, f), [-2, 3.5, 0]), pushK(f, 1001, 0.0016), { fov: 44 });
const S11a = (f: number) => ms(add(CALC, [1.2, 0, 0]), 160, 7.4, pushK(f, 1164, 0.0022), { lookH: 1.3, camH: 2.2 });
const S12a = (f: number) => ms(CALC, 175, 3.9, pushK(f, 1246, 0.003), { lookH: 1.25, roll: -0.07, fov: 38 });
const S13a = (f: number) => dolly(add(CRATES[2], [0.1, 2.3, 1.4]), add(CRATES[2], [0, 1.2, 0.05]), pushK(f, 1352, 0.0018), { fov: 40 });
const S14a = (f: number) => ms(CRATES[2], 180, 3.6, pushK(f, 1461, 0.0018), { lookH: 1.5, camH: 1.7 });
const S15a = (f: number) => ms(add(MART, [0, 0, -0.8]), -20, 3.4, pushK(f, 1557, 0.0022), { lookH: 1.2, camH: 1.3 });
const S16a = (f: number) => ms(add(QUAY, [-0.6, 0, 0]), 185, 8.4, pushK(f, 1649, 0.0022, 0.005, 30), { lookH: 1.2 });
const S17a = (f: number) => ms(MARKET, 160, 4.4, pushK(f, 1766, -0.0016), { lookH: 0.95, camH: 1.8, dx: 0.4 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 91, cut: true, s: S1b }], 2: [{ f: 149, s: S2a }], 3: [{ f: 243, s: S3a }, { f: 338, cut: true, s: S3b }],
  4: [{ f: 406, s: S4a }], 5: [{ f: 520, s: S5a }], 6: [{ f: 578, s: S6a }], 7: [{ f: 736, s: S7a }], 8: [{ f: 765, s: S8a }],
  9: [{ f: 813, s: S9a }], 10: [{ f: 997, s: S10a }], 11: [{ f: 1160, s: S11a }], 12: [{ f: 1246, s: S12a }], 13: [{ f: 1349, s: S13a }],
  14: [{ f: 1461, s: S14a }], 15: [{ f: 1557, s: S15a }], 16: [{ f: 1645, s: S16a }], 17: [{ f: 1762, s: S17a }],
};

const KICKS: [number, number][] = [[91, 0.6], [562, 0.5], [736, 0.7], [978, 0.5], [1223, 0.6], [1742, 0.8]];
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
  { f: 0, cInf: 0 },
  { f: 91, cInf: 12, focus: (f) => add(DECK_TUDOR(f), [0, 1.6, 0]) },
  { f: 153, cInf: 4, focus: () => [4, 2, 4] },
  { f: 243, cInf: 10, focus: eyesOf(T_LAKE, 1.2) },
  { f: 338, cInf: 7, focus: eyesOf(T_PIER) },
  { f: 406, cInf: 12, focus: eyesOf(READER, 1.4) },
  { f: 520, cInf: 8, focus: eyesOf(add(QUAY, [-1.6, 0, 0])) },
  { f: 582, cInf: 9, focus: eyesOf(MART, 1.1) },
  { f: 736, cInf: 15, focus: eyesOf(add(MART, [0.9, 0, -2.4])) },
  { f: 765, cInf: 15, focus: eyesOf(QUAY) },
  { f: 817, cInf: 8, focus: () => add(CRATES[1], [0, 0.7, 0]) },
  { f: 1001, cInf: 0 },
  { f: 1164, cInf: 7, focus: eyesOf(add(CALC, [1.2, 0, 0])) },
  { f: 1246, cInf: 14, focus: eyesOf(CALC) },
  { f: 1352, cInf: 10, focus: () => add(CRATES[2], [0, 0.7, 0]) },
  { f: 1461, cInf: 9, focus: () => add(CRATES[2], [0, 1.5, 0]) },
  { f: 1557, cInf: 11, focus: () => add(MART, [0, 1.0, 1.5]) },
  { f: 1649, cInf: 9, focus: eyesOf(add(QUAY, [-1.2, 0, 0])) },
  { f: 1766, cInf: 9, focus: eyesOf(MARKET, 1.0) },
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
