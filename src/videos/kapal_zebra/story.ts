// Timeline of "Kapal Perang yang Dicat Kayak Zebra": shots timed to projects/kapal_zebra/words.json.
// World: the harbour quay along x = 0 (land toward -x, ground at QY), open sea toward +x. Our dazzle steamer
// (zebra.ts) sails along the lane x = LANE toward -z; the submarine lies at SUB with its bow toward +x (toward the
// lane). Periscope shots look from the scope head at the steamer through a round mask (Bridge.tsx, POV shots).
export const FPS = 30;
export const TOTAL = 1961;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------- places ----------------
export const SEA = 0;
export const QY = 1.4;
export const groundY = (x: number, _z: number) => (x < 0 ? QY : -6);
export const quay = (x: number, z: number): V3 => [x, QY, z];
export const LANE = 450;
export const shipZ = (f: number) => 60 - 0.1 * f;
export const MOOR: V3 = [5.6, 0, 0];                  // the steamer at the quay (shots 8-9)
export const SUB: V3 = [150, 0, -60];
export const SUB_UP = 0.5, SUB_DOWN = -9;              // hull axis height surfaced / submerged
export const TOWER = 4.6;
/** the commander ("you") on the conning tower platform, facing the lane */
export const COM: V3 = [SUB[0] + 2.4, SUB_UP + TOWER, SUB[2] - 0.4];
/** periscope head (POV lens) */
export const SCOPE: V3 = [SUB[0] + 30, 2.2, SUB[2]];
export const BALL_A = quay(-2.0, 45.2), BALL_B = quay(-4.2, 49.4);   // thrower / catcher's waiting spot

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number; under?: boolean; pov?: boolean };
const A = [0, 166, 309, 416, 491, 643, 705, 754, 830, 935, 990, 1067, 1103, 1163, 1216, 1285, 1355, 1441, 1601, 1731, 1817, 1871, TOTAL];
const POV = [4, 10, 11, 12, 13, 19], UNDER = [3, 15], GOLD = [21, 22], FAR: Record<number, number> = { 1: 1.6, 4: 2.6, 6: 1.6, 7: 3, 10: 2.6, 11: 2.6, 12: 2.6, 13: 2.6, 19: 2.6, 16: 1.6, 17: 1.6, 20: 1.4, 21: 1.6 };
export const SHOTS: ShotDef[] = A.slice(0, -1).map((a, i) => ({
  id: i + 1, a, b: A[i + 1], light: GOLD.includes(i + 1) ? "golden" : "day", under: UNDER.includes(i + 1) || undefined,
  pov: POV.includes(i + 1) || undefined, far: FAR[i + 1],
}));
export const XFADE: Record<number, number> = { 3: 8, 4: 8, 5: 8, 8: 8, 10: 8, 14: 8, 15: 8, 16: 8, 18: 8, 19: 8, 20: 8, 21: 8 };
export const FLASH_AT = 166;
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
/** the steamer: pos = waterline centre, yaw (0 = bow toward -z), roll */
export type ShipState = { pos: V3; yaw: number; roll: number };
export const shipAt = (id: number, f: number): ShipState => {
  if (id === 8 || id === 9) return { pos: [...MOOR], yaw: 0, roll: 0.006 * Math.sin(f * 0.05) };
  return { pos: [LANE, 0, shipZ(f)], yaw: 0, roll: 0.018 * Math.sin(f * 0.06) };
};
/** the two other dazzle ships of the convoy (hook only) */
export const CONVOY: { dx: number; dz: number; v: number }[] = [{ dx: 34, dz: 80, v: 1 }, { dx: -26, dz: 160, v: 2 }];
/** ship-local point -> world */
export const shipPt = (s: ShipState, l: V3): V3 => {
  const cr = Math.cos(s.roll), sr = Math.sin(s.roll);
  const x1 = l[0] * cr - l[1] * sr, y1 = l[0] * sr + l[1] * cr, z1 = l[2];
  const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
  return [s.pos[0] + x1 * cy + z1 * sy, s.pos[1] + y1, s.pos[2] - x1 * sy + z1 * cy];
};
/** submarine hull axis height and periscope raise 0..1 */
export const subAt = (id: number, f: number) => {
  if (id === 3) return { y: SUB_DOWN, scope: smooth((f - 326) / 40) };
  if (id === 15) return { y: SUB_DOWN, scope: 1 };
  return { y: SUB_UP, scope: 1 };
};
/** the torpedo (world position, visible) */
export const torpAt = (id: number, f: number): { pos: V3; on: boolean } => {
  if (id === 15) return { pos: [SUB[0] + 19 + 0.09 * Math.max(0, f - 1222), SUB_DOWN + 0.8, SUB[2]], on: true };
  return { pos: [0, -50, 0], on: false };
};
/** wake of the miss (shot 20): head of the trail moves along z = stern + 14 from -x to +x */
export const WAKE_Z = 28 + 14;
export const wakeHead = (f: number) => -70 + 1.5 * (f - 1735);

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
/** framing on someone at `p` (feet): lens `dist` m away at azimuth `az` (0 = lens on -z looking +z; -90 = lens on +x
 *  looking -x; 90 = lens on -x looking +x), lens at feet + camH, aimed at feet + lookH. */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
/** a lens fixed relative to the moving steamer (ship-local points, roll ignored) */
const shipCam = (id: number, f: number, lp: V3, ll: V3, k: number, fov = 40, roll = 0): Shot => {
  const s = shipAt(id, f), base: ShipState = { ...s, roll: 0, pos: [s.pos[0], 0, s.pos[2]] };
  return dolly(shipPt(base, lp), shipPt(base, ll), k, { fov, roll });
};
/** periscope view: from the scope head at the steamer's local point `at`; the ship sits at the mask centre (36 % from
 *  the top of the frame), so the aim drops below it by 0.28 of the half-height */
export const POV_Y = 0.36;
const pov = (id: number, f: number, fov: number, at: V3 = [0, 3.5, 0], dz = 0): Shot => {
  const p = shipPt({ ...shipAt(id, f), roll: 0 }, at), d = Math.hypot(p[0] - SCOPE[0], p[2] - SCOPE[2]);
  const drop = d * (1 - 2 * POV_Y) * Math.tan((fov * Math.PI) / 360);
  return { pos: [...SCOPE], look: [p[0], p[1] - drop, p[2] + dz], fov, roll: 0 };
};
const sz = (f: number) => shipZ(f);
const S1a = (f: number) => dolly([398, 55, sz(f) - 78], [456, 0, sz(f) + 50], pushK(f, 0, 0.0012, 0.0025, 30), { fov: 44 });
const S2a = (f: number) => ms(COM, -62, 12, pushK(f, 166, 0.0016), { camH: 2.6, lookH: 0.1, fov: 42 });
const S3a = (f: number) => dolly([SUB[0] + 6, SUB_DOWN + 1.5, SUB[2] - 19], [SUB[0], SUB_DOWN + 3.6, SUB[2]], pushK(f, 309, 0.0018), { fov: 46 });
const S5a = (f: number) => shipCam(5, f, [-10, 1.6, 24], [-4.2, 2.6, 8], pushK(f, 491, 0.001), 44);
const S5b = (f: number) => shipCam(5, f, [-10, 1.6, -4], [-4.2, 2.6, -20], 1, 44);
const S6a = (f: number) => shipCam(6, f, [-95, 9, -20], [0, 6, -4], pushK(f, 643, 0.0016), 40);
const S7a = (f: number) => shipCam(7, f, [-360, 5, 90], [0, 4, 0], pushK(f, 705, 0.002, 0.004, 25), 24);
const S8a = (f: number) => dolly([-8.5, QY + 1.2, -0.4], [0, QY + 2.1, 0.6], pushK(f, 754, 0.0018), { fov: 50 });
const S9a = (f: number) => ms(quay(-2.6, 1.6), 72, 4.6, pushK(f, 830, 0.0016, 0.004, 30), { camH: 1.1, lookH: 1.35, fov: 44 });
const S14a = (f: number) => ms(COM, -58, 3.2, pushK(f, 1163, 0.0024, 0.006, 25), { camH: 2.3, lookH: 1.25, fov: 40, roll: 0.075 });
const S15a = (f: number) => { const t = torpAt(15, f).pos; return dolly([t[0] + 5, t[1] + 1.6, t[2] - 15], [t[0] + 0.5, t[1] + 0.4, t[2]], pushK(f, 1216, 0.0016), { fov: 44 }); };
const top = (f: number, ahead: number, k: number): Shot => dolly([LANE - 46, 118, sz(f) + 34 - ahead], [LANE, 0, sz(f) - ahead], k, { fov: 40 });
const S16a = (f: number) => top(f, 6, pushK(f, 1285, 0.0014));
const S17a = (f: number) => top(f, 6, 1);
const S17b = (f: number) => top(f, 24, 1.15);
const S18a = (f: number) => dolly([3.2, QY + 4.6, 38.6], [-3.0, QY + 1.1, 47.8], pushK(f, 1441, 0.0012), { fov: 48 });
const S20a = (f: number) => dolly([LANE - 44, 34, sz(f) + 92], [LANE - 2, 0, sz(f) + 26], pushK(f, 1731, 0.0014), { fov: 42 });
const S21a = (f: number) => dolly([LANE - 40, 7, sz(f) + 70], [LANE, 6, sz(f) - 10], pushK(f, 1817, 0.0014), { fov: 42 });
const S22a = (f: number) => shipCam(22, f, [-44, 9, 26], [0, 8, 6], pushK(f, 1871, 0.0018), 42);

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 162, s: S2a }], 3: [{ f: 305, s: S3a }],
  4: [{ f: 412, s: (f) => pov(4, f, 34) }],
  5: [{ f: 487, s: S5a }, { f: 560, dur: 70, s: S5b }], 6: [{ f: 643, s: S6a }], 7: [{ f: 705, s: S7a }],
  8: [{ f: 750, s: S8a }], 9: [{ f: 830, s: S9a }],
  10: [{ f: 931, s: (f) => pov(10, f, 30) }, { f: 952, dur: 30, s: (f) => pov(10, f, 18) }],
  11: [{ f: 990, s: (f) => pov(11, f, 18) }], 12: [{ f: 1067, s: (f) => pov(12, f, 17) }], 13: [{ f: 1103, s: (f) => pov(13, f, 26) }],
  14: [{ f: 1159, s: S14a }], 15: [{ f: 1212, s: S15a }], 16: [{ f: 1281, s: S16a }],
  17: [{ f: 1355, s: S17a }, { f: 1378, dur: 34, s: S17b }], 18: [{ f: 1437, s: S18a }],
  19: [{ f: 1597, s: (f) => pov(19, f, 18) }], 20: [{ f: 1727, s: S20a }], 21: [{ f: 1813, s: S21a }], 22: [{ f: 1871, s: S22a }],
};

const KICKS: [number, number][] = [[622, 0.7], [914, 0.5], [1333, 0.6], [1581, 0.5], [1796, 0.7]];
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
  { f: 0, cInf: 0 },
  { f: 166, cInf: 7, focus: eyesOf(COM, 1.4) },
  { f: 309, cInf: 0 },
  { f: 491, cInf: 5, focus: (f) => shipPt(shipAt(5, f), [-4.4, 2.6, 2]) },
  { f: 643, cInf: 0 },
  { f: 754, cInf: 9, focus: () => quay(-2.6, 0.5) },
  { f: 830, cInf: 11, focus: () => [-2.6, QY + 1.5, 1.6] },
  { f: 935, cInf: 0 },
  { f: 1163, cInf: 13, focus: eyesOf(COM, 1.35) },
  { f: 1216, cInf: 0 },
  { f: 1441, cInf: 5, focus: () => quay(-3.2, 46.5) },
  { f: 1601, cInf: 0 },
  { f: 1871, cInf: 0 },
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
void lerp;
