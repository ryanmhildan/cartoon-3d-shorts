// Timeline of "Kenapa Jepang Menyuruh Rakyat Jawa Tanam Jarak": shots timed to projects/jarak_jepang/words.json.
// World (flat ground, y = 0): Pak Karto's Javanese village yard (house toward -x, open kitchen shed at the origin, yard
// toward +x, bamboo fence at x = 15), a dirt road along x = ROAD, the sawah east of it (cells of 8 x 6 m with dikes),
// and a grass airfield far toward -z with the parked plane. Castor (jarak) plants are lit 2D cards that pop in by set.
export const FPS = 30;
export const TOTAL = 1932;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- the land ----------------
export const groundY = (_x: number, _z: number) => 0;
export const at = (x: number, z: number, dy = 0): V3 => [x, dy, z];

// ---------------- places (kitchen pieces kept from the village builder) ----------------
export const TOP = 0.78;
export const TABLE = { x0: -0.45, x1: 0.45, z0: -0.85, z1: 0.85 };
export const SHED = { x0: -2.3, x1: 2.1, z0: -2.7, z1: 2.7, eave: 2.55, ridge: 3.45 };
export const HOUSE = { x: -7.6, z: -1.5, w: 8, d: 6, h: 2.7 };
export const KENDI: V3 = [0.05, TOP, -0.22];
export const BOTTLE: V3 = [0.08, TOP, 0.24];
export const STOVE: V3 = [-1.75, 0, -1.7];
/** the wajan on the stove's second fire hole (its rim centre) */
export const WAJAN: V3 = [STOVE[0], 0.66, STOVE[2] + 0.26];

export const ROAD = 21;                      // road centre line (x), 4 m wide
export const SAWAH = { x0: 24, x1: 80, z0: -48, z1: 48, cw: 8, cd: 6 };
/** cells whose rice is replaced by jarak (shot 10) */
export const TAKEN = (ix: number, iz: number) => ix < 2 && iz >= 6 && iz < 10;
export const RICE_GONE = 700;                // the taken cells' rice sinks from here (20 f)
export const KARTO: V3 = [6.2, 0, 2.4];      // planting in the yard
export const SOLDIER: V3 = [7.5, 0, 1.0];
export const KARTO2: V3 = [9.6, 0, 4.6];     // by the fence (whisper)
export const NEIGH: V3 = [10.4, 0, 3.3];
export const KARTO_RD: V3 = [ROAD + 1.0, 0, -1.0];      // at the road / sawah edge
export const TRUCK0: V3 = [ROAD + 0.6, 0, 9];          // the truck parked, nose toward -z
export const truckZ = (f: number) => TRUCK0[2] - 40 * smooth((f - 1040) / 80) * (f > 1040 ? 1 : 0);
export const PLANE: V3 = [-40, 0, -150];      // parked plane (wheels on the ground), nose toward +x
export const FAMILY: V3 = [3.4, 0, 1.0];

// ---------------- jarak plants (sets pop in at their frame and stay) ----------------
export type Jarak = { p: V3; f: number; s: number };
const J: Jarak[] = [];
// Karto's first few in the yard (already there in the hook)
for (const [x, z] of [[5.0, 0.2], [4.6, 4.2], [7.9, 3.9]] as const) J.push({ p: [x, 0, z], f: -1, s: 1 });
// the yard (shot 7)
for (let i = 0; i < 9; i++) J.push({ p: [1 + i * 1.5, 0, 8.4 - 0.2 * (i % 2)], f: 562 + i * 2, s: 0.9 + 0.2 * hh(i, 1) });
for (let i = 0; i < 8; i++) J.push({ p: [2.5 + i * 1.5, 0, -6.4], f: 566 + i * 2, s: 0.9 + 0.2 * hh(i, 2) });
// the road side (shot 8)
for (let i = 0; i < 22; i++) J.push({ p: [ROAD - 2.6, 0, -30 + i * 3], f: 600 + Math.abs(i - 11), s: 0.95 + 0.2 * hh(i, 3) });
for (let i = 0; i < 22; i++) J.push({ p: [ROAD + 2.6, 0, -28.5 + i * 3], f: 602 + Math.abs(i - 11), s: 0.95 + 0.2 * hh(i, 4) });
// the dikes (shot 9): along the z = const dikes of the first 4 columns
for (let r = 3; r <= 12; r += 3) for (let i = 0; i < 16; i++) J.push({ p: [SAWAH.x0 + 1 + i * 2, 0.25, SAWAH.z0 + r * SAWAH.cd], f: 634 + i + r, s: 0.9 + 0.2 * hh(i * 7 + r, 5) });
// inside the taken cells (shot 10)
for (let ix = 0; ix < 2; ix++) for (let iz = 6; iz < 10; iz++) for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++)
  J.push({ p: [SAWAH.x0 + ix * SAWAH.cw + 1.2 + a * 1.9, 0, SAWAH.z0 + iz * SAWAH.cd + 1.1 + b * 1.9], f: 706 + a * 3 + b * 2 + ix * 4, s: 0.85 + 0.25 * hh(ix * 31 + iz * 7 + a * 3 + b, 6) });
export const JARAK = J;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
const A = [0, 175, 225, 349, 405, 464, 560, 596, 630, 667, 757, 882, 935, 1026, 1124, 1223, 1317, 1387, 1456, 1530, 1651, 1790, 1846, TOTAL];
const GOLD = [22, 23], FAR: Record<number, number> = { 7: 1.4, 9: 1.6, 16: 1.6, 23: 1.6 };
export const SHOTS: ShotDef[] = A.slice(0, -1).map((a, i) => ({
  id: i + 1, a, b: A[i + 1], light: GOLD.includes(i + 1) ? "golden" : "day", far: FAR[i + 1],
  ...(GOLD.includes(i + 1) ? { sunAz: 150, sunEl: 12 } : {}),
}));
export const XFADE: Record<number, number> = { 7: 8, 8: 8, 9: 8, 10: 8, 11: 8, 12: 8, 15: 8, 16: 8, 17: 8, 19: 8, 22: 8 };
export const FLASH_AT = 175;
export const SPY = { a: -10, b: -10 };

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story physics ----------------
/** butter on the wajan: 0 solid block .. 1 melted puddle; burnt 0..1 */
export const butterAt = (id: number, f: number) => {
  if (id === 17) return { melt: 0, burnt: 0 };
  if (id === 18) return { melt: smooth((f - 1392) / 26), burnt: smooth((f - 1426) / 14) };
  return { melt: 1, burnt: 1 };
};
/** the plane: parked (16, 19-21) or flying over the sawah (23); prop spin angle */
export const planeAt = (id: number, f: number): { pos: V3; yaw: number; bank: number; spin: number; flying: boolean; on: boolean } => {
  const spin = f * 1.3;
  if (id === 23) { const u = (f - 1846) / 86, k = 46 - 92 * u; return { pos: [64 + 0.6 * k, 26, -22 + 0.78 * k], yaw: Math.atan2(-0.6, -0.78), bank: 0.08, spin, flying: true, on: true }; }
  if (id === 16 || id === 19 || id === 20 || id === 21) return { pos: PLANE, yaw: Math.PI / 2, bank: 0, spin, flying: false, on: true };
  return { pos: [0, -60, 0], yaw: 0, bank: 0, spin: 0, flying: false, on: false };
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
/** framing on `p` (feet / base): lens `dist` m away at azimuth `az` (0 = lens on -z looking +z; -90 = lens on +x looking
 *  -x, screen-right = -z), lens at p.y + camH, aimed at p.y + lookH. */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
const S1a = (f: number) => ms(mid(KARTO, SOLDIER), -112, 8.2, pushK(f, 0, 0.0016, 0.004, 30), { camH: 1.6, lookH: 1.05, fov: 42 });
const S2a = (f: number) => ms([5.0, 0, 0.2], -70, 2.6, pushK(f, 175, 0.0026), { camH: 1.1, lookH: 1.0, fov: 40 });
const S3a = (f: number) => ms(KARTO, -96, 4.4, pushK(f, 225, 0.0016, 0.005, 30), { camH: 1.45, lookH: 1.45, fov: 40 });
const S4a = (f: number) => ms(KARTO, -128, 2.9, pushK(f, 349, 0.0022), { camH: 1.3, lookH: 1.25, fov: 40 });
const S5a = (f: number) => ms(KARTO, -64, 2.9, pushK(f, 405, 0.0022), { camH: 1.3, lookH: 1.25, fov: 40 });
const S6a = (f: number) => ms(SOLDIER, -80, 4.2, pushK(f, 464, 0.0018, 0.004, 30), { camH: 0.9, lookH: 1.35, fov: 42 });
const S7a = (f: number) => dolly([17, 6.5, 13], [3, 0.8, 0], pushK(f, 560, 0.0016), { fov: 46 });
const S8a = (f: number) => dolly([ROAD + 0.5, 1.6, 26], [ROAD, 0.8, -6], pushK(f, 596, 0.0018), { fov: 44 });
const S9a = (f: number) => dolly([ROAD - 4, 14, -6], [SAWAH.x0 + 18, 0, 22], pushK(f, 630, 0.0016), { fov: 46 });
const S10a = (f: number) => dolly([ROAD - 4.5, 2.4, -6], [SAWAH.x0 + 7, 0.5, 4], pushK(f, 667, 0.0014), { fov: 44 });
const S11a = (f: number) => ms(mid(KARTO2, NEIGH), -128, 5.4, pushK(f, 757, 0.0016, 0.004, 30), { camH: 1.3, lookH: 1.2, fov: 40 });
const S12a = (f: number) => ms([ROAD - 1.4, 0, 7.0], 104, 5.6, pushK(f, 882, 0.0018), { camH: 1.5, lookH: 1.3, fov: 42 });
const S13a = (f: number) => ms([ROAD - 1.4, 0, 7.4], 100, 3.4, pushK(f, 935, 0.0022, 0.005, 25), { camH: 1.45, lookH: 1.45, fov: 40 });
const S14a = (f: number) => dolly([ROAD - 0.6, 1.9, 15], [ROAD + 0.4, 1.0, -10], pushK(f, 1026, 0.0012), { fov: 44 });
const S15a = (f: number) => ms(KARTO, -96, 4.0, pushK(f, 1124, 0.002), { camH: 1.5, lookH: 1.75, fov: 40 });
const S16a = (f: number) => dolly([PLANE[0] + 16, 3.2, PLANE[2] + 11], [PLANE[0] + 1, 2.4, PLANE[2] + 1], pushK(f, 1223, 0.0016), { fov: 44 });
const S17a = (f: number) => dolly([WAJAN[0] + 1.25, 1.35, WAJAN[2] + 0.55], [WAJAN[0], 0.66, WAJAN[2]], pushK(f, 1317, 0.002), { fov: 40 });
const S18a = (f: number) => dolly([WAJAN[0] + 1.0, 1.15, WAJAN[2] + 0.3], [WAJAN[0], 0.66, WAJAN[2]], pushK(f, 1387, 0.002, 0.005, 25), { fov: 40 });
const S19a = (f: number) => dolly([PLANE[0] + 9, 2.4, PLANE[2] + 5.5], [PLANE[0] + 3.4, 1.9, PLANE[2] + 2.9], pushK(f, 1456, 0.0016), { fov: 44 });
const S20a = (f: number) => dolly([PLANE[0] + 9, 2.4, PLANE[2] - 0.5], [PLANE[0] + 3.4, 1.9, PLANE[2] - 2.9], pushK(f, 1530, 0.0014), { fov: 44 });
const S21a = (f: number) => dolly([PLANE[0] + 13, 1.6, PLANE[2] + 9], [PLANE[0] + 2, 2.2, PLANE[2]], pushK(f, 1651, 0.0014), { fov: 44 });
const S22a = (f: number) => ms(FAMILY, -100, 6.4, pushK(f, 1790, 0.0018), { camH: 1.3, lookH: 1.1, fov: 40 });
const S23a = (f: number) => dolly([ROAD - 4, 1.4, 14], [ROAD + 30, 9, -12], pushK(f, 1846, 0.0012), { fov: 50 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 175, s: S2a }], 3: [{ f: 225, s: S3a }], 4: [{ f: 349, s: S4a }], 5: [{ f: 405, s: S5a }],
  6: [{ f: 464, s: S6a }], 7: [{ f: 556, s: S7a }], 8: [{ f: 592, s: S8a }], 9: [{ f: 626, s: S9a }], 10: [{ f: 663, s: S10a }],
  11: [{ f: 753, s: S11a }], 12: [{ f: 878, s: S12a }], 13: [{ f: 935, s: S13a }], 14: [{ f: 1026, s: S14a }], 15: [{ f: 1120, s: S15a }],
  16: [{ f: 1219, s: S16a }], 17: [{ f: 1313, s: S17a }], 18: [{ f: 1387, s: S18a }], 19: [{ f: 1452, s: S19a }], 20: [{ f: 1530, s: S20a }],
  21: [{ f: 1651, s: S21a }], 22: [{ f: 1786, s: S22a }], 23: [{ f: 1846, s: S23a }],
};

const KICKS: [number, number][] = [[149, 0.5], [329, 0.5], [851, 0.4], [1429, 0.6]];
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
  { f: 0, cInf: 6, focus: eyesOf(KARTO, 1.3) },
  { f: 175, cInf: 12, focus: () => [7.2, 1.1, 1.0] },
  { f: 225, cInf: 11, focus: eyesOf(KARTO) },
  { f: 464, cInf: 11, focus: eyesOf(SOLDIER) },
  { f: 560, cInf: 0 },
  { f: 667, cInf: 4, focus: () => [SAWAH.x0 + 7, 0.6, 4] },
  { f: 757, cInf: 11, focus: eyesOf(KARTO2) },
  { f: 882, cInf: 8, focus: () => [ROAD - 1.4, 1.3, 7.4] },
  { f: 935, cInf: 12, focus: () => [ROAD - 1.4, 1.5, 7.4] },
  { f: 1026, cInf: 4, focus: () => [ROAD - 1.3, 1.4, 6] },
  { f: 1124, cInf: 13, focus: eyesOf(KARTO) },
  { f: 1223, cInf: 5, focus: () => [PLANE[0] + 3, 2, PLANE[2] + 1] },
  { f: 1317, cInf: 14, focus: () => WAJAN },
  { f: 1456, cInf: 10, focus: () => [PLANE[0] + 3.4, 1.9, PLANE[2] + 2.9] },
  { f: 1530, cInf: 10, focus: () => [PLANE[0] + 3.4, 1.9, PLANE[2] - 2.9] },
  { f: 1651, cInf: 6, focus: () => [PLANE[0] + 3.4, 2, PLANE[2] + 2.9] },
  { f: 1790, cInf: 10, focus: eyesOf(FAMILY) },
  { f: 1846, cInf: 0 },
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
