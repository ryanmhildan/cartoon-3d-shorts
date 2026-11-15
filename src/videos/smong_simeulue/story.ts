// Timeline of "Pulau yang Selamat Berkat Cerita Nenek": shots timed to projects/smong_simeulue/words.json, our cartoon
// Simeulue coast (sea toward +x, a sloping beach the sea can draw back from, the stilt village, the hill to -x), and the
// camera grammar of the bridge short (slow push-ins, smootherstep glides, cuts on big reframes, kicks).
export const FPS = 30;
export const TOTAL = 1930;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- the land ----------------
export const VILLAGE_Y = 0.4;
/** beach / seabed height: flat village edge, then a long even slope into the sea */
export const seabedY = (x: number) => (x < -10 ? VILLAGE_Y : Math.max(-5, VILLAGE_Y - 0.0733 * (x + 10)));
/** the hill behind the village (toward -x) */
export const hillY = (x: number, z: number) => {
  const k = smooth((-30 - x) / 58), w = Math.exp(-((z / 95) ** 2));
  return VILLAGE_Y + 21 * k * (0.35 + 0.65 * w);
};
export const groundY = (x: number, z: number) => (x >= -10 ? seabedY(x) : hillY(x, z));
export const PATH_Z = -6;                         // the footpath up the hill runs along -x at this z
export const OTHER_Z = 320;                       // the "other beach" (umbrellas), far along the coast
/** sea level per shot and frame: calm, drawing back in shot 4, gone back afterwards on the beach shots */
export const LOW = -2.6;
export const seaLevel = (id: number, f: number) =>
  id === 4 ? LOW * smooth((f - 362) / 80) : [5, 6, 7, 8, 16, 17].includes(id) ? LOW : 0;

// ---------------- places ----------------
export const at = (x: number, z: number, dy = 0): V3 => [x, groundY(x, z) + dy, z];
export const HOUSE = { x: -17.5, z: 0, w: 7, d: 6, h: 2.6, floor: 1.5 }; // grandma's stilt house, facade to +x
export const VER = { x0: -14.5, x1: -11.6, z0: -3.4, z1: 3.4, y: 1.5 };   // its veranda deck
export const NENEK_V: V3 = [-12.6, VER.y, -0.55];
export const CUCU_V: V3 = [-12.3, VER.y, 0.45];
export const SIGN: V3 = at(-0.9, -6.6);
export const BEACH_KID: V3 = at(-5.2, -3.5);
export const FISH0: V3 = at(14, 4);
export const DRAW: V3 = at(-7.6, 12);             // grandma's drawing in the sand
export const DRAW_NENEK: V3 = at(-8.75, 11.85);
export const MAT: V3 = [-13.2, VER.y, 2.2];       // the blanket on the veranda floor
export const RUN0 = -30;                          // runners' x at the start of shot 7
export const SAFE: V3 = at(-88, PATH_Z);
export const TOURIST: V3 = at(14, OTHER_Z);

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 152, light: "day", far: 2 },
  { id: 2, a: 152, b: 245, light: "day" },
  { id: 3, a: 245, b: 346, light: "day" },
  { id: 4, a: 346, b: 456, light: "day", far: 1.5 },
  { id: 5, a: 456, b: 524, light: "day" },
  { id: 6, a: 524, b: 629, light: "day" },
  { id: 7, a: 629, b: 724, light: "day", far: 1.5 },
  { id: 8, a: 724, b: 804, light: "day" },
  { id: 9, a: 804, b: 960, light: "day" },
  { id: 10, a: 960, b: 1112, light: "day" },
  { id: 11, a: 1112, b: 1251, light: "day" },
  { id: 12, a: 1251, b: 1337, light: "day" },
  { id: 13, a: 1337, b: 1494, light: "day" },
  { id: 14, a: 1494, b: 1624, light: "day" },
  { id: 15, a: 1624, b: 1761, light: "day" },
  { id: 16, a: 1761, b: 1852, light: "day", far: 1.5 },
  { id: 17, a: 1852, b: TOTAL, light: "day", far: 2 },
];
export const XFADE: Record<number, number> = { 6: 8, 7: 8, 9: 8, 13: 8, 15: 6, 16: 8, 17: 8 };
export const FLASH_AT = 152;
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
/** framing on someone standing at `at` (feet): lens `dist` m away at azimuth `az` (0 = lens on -z looking +z; -90 = lens
 *  on +x looking -x, screen-right = -z), lens at feet + camH, aimed at feet + lookH. Faces at ~30 % of the height. */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
/** runners' lead x along the path in shots 7-8 (they climb toward -x) */
export const runX = (f: number) => RUN0 - 3.2 * ((f - 629) / FPS);
const NV = NENEK_V;
const S1a = (f: number) => dolly([70, 46, -70], [-30, 6, 8], pushK(f, 0, 0.0018), { fov: 44 });
const S2a = (f: number) => dolly([3, 2.0, -10], [-13, 2.4, 1.5], pushK(f, 152, 0.0022), { fov: 42 });
const S3a = (f: number) => ms(at(-11.5, -4), -70, 6.8, pushK(f, 245, 0.002), { lookH: 1.6, camH: 1.7, roll: 0.03 });
const S4a = (f: number) => dolly(add(BEACH_KID, [-4.5, 2.3, -2.6]), add(BEACH_KID, [10, -0.4, 4.5]), pushK(f, 346, 0.0016), { fov: 46 });
const S5a = (f: number) => ms(FISH0, -100, 3.2, pushK(f, 456, 0.0025), { camH: 1.2, lookH: 0.15, fov: 40 });
const S6a = (f: number) => ms(TOURIST, -80, 7.5, pushK(f, 524, 0.0022), { camH: 2.0, lookH: 0.9, dz: 1.0, fov: 42 });
const S7a = (f: number) => dolly([-25, 4.5, 11], [-36, 2.4, PATH_Z], pushK(f, 629, 0.0015), { fov: 42 });
const S8a = (f: number): Shot => { const x = runX(f) + 4; return ms(at(x, PATH_Z), 180, 6.0, 1, { lookH: 1.1, camH: 1.4, dx: -0.6 }); };
const S9a = (f: number) => ms(add(NV, [0, 0, 0.5]), -100, 6.0, pushK(f, 804, 0.0022, 0.005, 30), { lookH: 1.15, dz: 0.0 });
const S10a = (f: number) => ms(add(NV, [0, 0, 0.8]), -78, 5.4, pushK(f, 960, 0.0018), { lookH: 1.6, camH: 1.5, dz: -0.6 });
const S11a = (f: number) => ms(NV, -92, 5.6, pushK(f, 1112, 0.0022), { lookH: 1.5, dz: -0.55 });
const S12a = (f: number) => ms(CUCU_V, -112, 2.6, pushK(f, 1251, 0.003), { lookH: 0.95, camH: 1.1, roll: -0.075, fov: 38 });
const S13a = (f: number) => dolly(add(DRAW, [3.3, 2.5, 0]), add(DRAW, [-0.55, 0.55, 0]), pushK(f, 1337, 0.0018), { fov: 46 });
const S14a = (f: number) => dolly(add(DRAW, [1.5, 3.2, -0.35]), add(DRAW, [-0.12, 0, -0.35]), pushK(f, 1494, 0.0015), { fov: 44 });
const S15a = (f: number) => dolly(add(MAT, [1.7, 2.9, 0.02]), add(MAT, [-0.15, 0, 0]), pushK(f, 1624, 0.0015), { fov: 42 });
const S16a = (f: number) => dolly([-12, 6.5, -18], [40, -2, 6], pushK(f, 1761, 0.0016), { fov: 44 });
const S17a = (f: number): Shot => lerpShot({ pos: add(SAFE, [-5, 3.2, 5.5]), look: add(SAFE, [12, 0.5, -2]), fov: 44 },
  { pos: add(SAFE, [-9, 9, 6]), look: add(SAFE, [60, -14, -4]), fov: 48 }, glide((f - 1866) / 64));

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 152, s: S2a }], 3: [{ f: 245, s: S3a }], 4: [{ f: 346, s: S4a }], 5: [{ f: 456, s: S5a }],
  6: [{ f: 520, s: S6a }], 7: [{ f: 625, s: S7a }], 8: [{ f: 724, s: S8a }], 9: [{ f: 800, s: S9a }], 10: [{ f: 960, s: S10a }],
  11: [{ f: 1112, s: S11a }], 12: [{ f: 1251, s: S12a }], 13: [{ f: 1333, s: S13a }], 14: [{ f: 1494, s: S14a }],
  15: [{ f: 1621, s: S15a }], 16: [{ f: 1757, s: S16a }], 17: [{ f: 1848, s: S17a }],
};

const KICKS: [number, number][] = [[280, 1], [935, 0.5], [1251, 0.5]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) {
    const n = Math.floor((t - f0 / FPS) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  // the long quake: a rolling shake through shot 3
  const f = t * FPS;
  if (f >= 282 && f < 344) a += 0.9 * Math.sin(f * 1.9) * Math.sin(((f - 282) / 62) * Math.PI) * (0.6 + 0.4 * Math.sin(f * 0.7));
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
  { f: 152, cInf: 6, focus: () => add(SIGN, [0, 1.6, 0]) },
  { f: 245, cInf: 8, focus: eyesOf(at(-11.5, -4)) },
  { f: 346, cInf: 5, focus: eyesOf(BEACH_KID, 1.0) },
  { f: 456, cInf: 13, focus: () => add(FISH0, [0, 0.2, 0]) },
  { f: 524, cInf: 8, focus: eyesOf(TOURIST) },
  { f: 629, cInf: 0 },
  { f: 724, cInf: 10, focus: (f) => at(runX(f) + 4, PATH_Z, 1.4) },
  { f: 804, cInf: 12, focus: eyesOf(add(NV, [0, 0, 0.8])) },
  { f: 960, cInf: 9, focus: eyesOf(add(NV, [0, 0, 0.2]), 1.7) },
  { f: 1112, cInf: 11, focus: eyesOf(NV) },
  { f: 1251, cInf: 14, focus: eyesOf(CUCU_V, 1.1) },
  { f: 1337, cInf: 6, focus: () => DRAW },
  { f: 1494, cInf: 6, focus: () => DRAW },
  { f: 1624, cInf: 6, focus: () => MAT },
  { f: 1761, cInf: 0 },
  { f: 1852, cInf: 6, focus: eyesOf(SAFE) },
  { f: 1866, dur: 40, cInf: 0 },
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
