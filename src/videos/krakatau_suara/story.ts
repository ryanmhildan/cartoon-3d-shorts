// Timeline of "Suara Paling Keras dalam Sejarah Manusia": shots timed to projects/krakatau_suara/words.json, places
// on our cartoon Rodrigues (east = +x) and on Krakatau far east, and the camera grammar of the bridge short (slow
// push-ins, smootherstep glides, cuts on big reframes, 7-frame flip kicks on the booms).
export const FPS = 30;
export const TOTAL = 1827;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- places ----------------
export const SEA_Y = -0.5;
export const ISLAND_R = 50;                       // grass plateau radius (noisy), beach to ~60
export const STATION = { x: -14, z: -2, w: 11, d: 7, h: 3.4 }; // police post, facade facing +x
export const VER = { x0: -10.5, x1: -7.2, z0: -7.5, z1: 3.5, y: 0.3 }; // veranda deck
export const DESK = { x0: -10.45, x1: -8.45, z0: 0.0, z1: 0.9, top: 1.08 };
export const GLOBE: V3 = [-10.05, DESK.top + 0.12 + 0.2, 0.45];
export const GLOBE_R = 0.2;
export const MAP = { x: -9.05, z: 0.45, w: 0.64, h: 0.44 };
export const W_VER: V3 = [-7.9, VER.y, -3.6];     // Wallis on the veranda edge
export const W_DESK: V3 = [-9.35, VER.y, -0.35];  // Wallis writing (facing +z)
export const PIER = { x0: 44, x1: 72, z: -4, w: 3.4, y: 0.45 };
export const W_PIER: V3 = [70, PIER.y, -4];
export const POND: V3 = [14, 0.03, 16];
export const POND_R = 2.9;
export const KID: V3 = [12.4, 0, 13.3];
export const SPLASH: V3 = [14.6, 0.04, 16.6];
export const FLAG: V3 = [-5.5, 0, 5];
export const SIGN: V3 = [0.47, 0, 6.2];
export const K0: V3 = [2600, 0, 0];               // Krakatau (east, far beyond the fog)
export const K_H = 120;                           // crater height
export const CRATER: V3 = [K0[0], K_H, K0[2]];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 162, light: "day" },
  { id: 2, a: 162, b: 273, light: "day" },
  { id: 3, a: 273, b: 359, light: "day", far: 3 },
  { id: 4, a: 359, b: 502, light: "day" },
  { id: 5, a: 502, b: 559, light: "day" },
  { id: 6, a: 559, b: 643, light: "day" },
  { id: 7, a: 643, b: 711, light: "day" },
  { id: 8, a: 711, b: 835, light: "day", far: 2 },
  { id: 9, a: 835, b: 890, light: "day" },
  { id: 10, a: 890, b: 1020, light: "day", far: 7 },
  { id: 11, a: 1020, b: 1092, light: "day" },
  { id: 12, a: 1092, b: 1208, light: "day" },
  { id: 13, a: 1208, b: 1308, light: "day" },
  { id: 14, a: 1308, b: 1428, light: "day" },
  { id: 15, a: 1428, b: 1497, light: "day", far: 8 },
  { id: 16, a: 1497, b: 1641, light: "day" },
  { id: 17, a: 1641, b: 1686, light: "day" },
  { id: 18, a: 1686, b: TOTAL, light: "day", far: 2 },
];
export const XFADE: Record<number, number> = { 10: 8, 11: 6, 14: 8, 15: 8, 16: 8, 17: 6 };
export const FLASH_AT = 162;
/** spyglass view (Bridge.tsx draws the round mask) */
export const SPY = { a: 776, b: 835 };

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

/** standard framing on someone standing at `at` (feet): lens `dist` m away at azimuth `az` deg (0 = lens on -z looking
 *  +z, 180 = lens on +z looking -z: then screen-right = +x = east), lens at feet + camH, aimed at feet + lookH. Faces land
 *  at ~30 % of the frame height, clear of the captions (~69 %). dx / dz shift the look point. */
const ms = (at: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [at[0] + (o.dx ?? 0), at[1] + (o.lookH ?? 1.0), at[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, at[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const WP = W_PIER, WV = W_VER;
// 1 hook: 3/4 from behind Wallis on the pier, the empty sea ahead; MS of his face on "padahal"
const S1a = (f: number) => dolly(add(WP, [-6.5, 2.4, 3.2]), add(WP, [4, 1.1, -1.6]), pushK(f, 0, 0.0022, 0.006, 25), { fov: 42 });
const S1b = (f: number) => ms(WP, -90, 3.3, pushK(f, 104, 0.003, 0.007, 28), { roll: 0.04, lookH: 1.1, dz: 0.2 });
// 2 establishing: low past the sign to the police post
const S2a = (f: number) => dolly([5.5, 1.5, 9.5], [-11, 2.2, -2.5], pushK(f, 162, 0.0022), { fov: 42 });
// 3 aerial: the island tiny in the ocean (zoom out)
const S3a = (f: number): Shot => { const s = glide((f - 273) / 86); return { pos: [140, 260, 300], look: [0, 0, 0], fov: 20 + 34 * s }; };
// 4 Wallis on the veranda, hand to his ear, east = screen right
const S4a = (f: number) => ms(WV, 168, 4.0, pushK(f, 359, 0.0025, 0.006, 30), { lookH: 1.15, dx: 0.15 });
// 5 CU: two more booms, dutch tilt
const S5a = (f: number) => ms(WV, 192, 2.3, pushK(f, 502, 0.003), { roll: -0.075, lookH: 1.35, camH: 1.5, fov: 38 });
// 6 spyglass + thought bubble (bubble on screen right)
const S6a = (f: number) => ms(WV, 172, 5.2, pushK(f, 559, 0.0022), { lookH: 1.45, dx: 0.55, camH: 1.6 });
// 7 writing at the desk, low from the front
const S7a = (f: number) => ms(W_DESK, 180, 2.7, pushK(f, 643, 0.003), { lookH: 1.1, camH: 1.25, fov: 40 });
// 8 three men at the pier end looking out; cut on "perang" to the spyglass view of the empty horizon
const S8a = (f: number) => dolly(add(WP, [-6.3, 2.1, 5.2]), add(WP, [2.5, 1.0, -1.2]), pushK(f, 711, 0.0022), { fov: 42 });
const S8b = (f: number): Shot => { const s = Math.sin(((f - 776) / 59) * Math.PI); return { pos: add(WP, [0.4, 1.6, 0]), look: add(WP, [120, -5.5, -14 + 26 * s]), fov: 24 }; };
// 9 who fired? scratch, shrugs, dutch tilt
const S9a = (f: number) => ms(WP, -90, 5.6, pushK(f, 835, 0.003), { roll: -0.07, lookH: 1.1, dz: 0.1 });
// 10 Krakatau erupting, Sunda Strait
const S10a = (f: number) => dolly(add(K0, [-620, 25, -470]), add(K0, [0, 175, 40]), pushK(f, 886, 0.0012, 0.004, 30), { fov: 40 });
// 11-12 the map on the desk, top-down-ish (screen up = north)
const mapCam = (cx: number, cz: number, h: number, back: number) => ({ pos: [cx, DESK.top + h, cz + back] as V3, look: [cx, DESK.top, cz + 0.1] as V3 });
const S11a = (f: number) => { const c = mapCam(MAP.x, MAP.z, 1.55, 0.3); return dolly(c.pos, c.look, pushK(f, 1016, 0.0018), { fov: 40 }); };
const S12a = (f: number) => { const c = mapCam(MAP.x + 0.08, MAP.z - 0.04, 1.05, 0.22); return dolly(c.pos, c.look, pushK(f, 1092, 0.0016), { fov: 40, roll: 0.03 }); };
// 13 Wallis with his pocket watch, clock card
const S13a = (f: number) => ms(WV, 186, 4.4, pushK(f, 1208, 0.0022), { lookH: 1.25, dx: -0.35 });
// 14 the pond: kid throws a stone, rings spread
const S14a = (f: number) => dolly([8.3, 2.6, 10.2], [14.6, 0.3, 16.2], pushK(f, 1304, 0.0018, 0.004, 25), { fov: 42 });
// 15 Krakatau: air ripples from the crater
const S15a = (f: number) => dolly(add(K0, [-780, 120, -620]), add(K0, [0, 200, 0]), pushK(f, 1424, 0.0012), { fov: 42 });
// 16 desk globe CU, slow orbit
const S16a = (f: number): Shot => {
  const a = -0.35 + 0.25 * ((f - 1497) / 144), d = 0.95;
  return { pos: [GLOBE[0] + Math.sin(a) * d, GLOBE[1] + 0.22, GLOBE[2] + Math.cos(a) * d], look: [GLOBE[0], GLOBE[1] - 0.03, GLOBE[2]], fov: 34 };
};
// 17 Wallis proud
const S17a = (f: number) => ms(WV, 174, 3.3, pushK(f, 1641, 0.003, 0.006, 25), { lookH: 1.15, dx: 0.2 });
// 18 sheepish on the pier, then crane up over the endless sea to the east
const S18a = (f: number) => ms(WP, -90, 3.3, pushK(f, 1686, 0.0028), { lookH: 1.1, dz: 0.1 });
const S18b = (f: number): Shot => lerpShot({ pos: add(WP, [-6, 2.6, 4.5]), look: add(WP, [10, 1.2, -2]), fov: 42 },
  { pos: add(WP, [-10, 9, 6]), look: add(WP, [30, -1, -6]), fov: 52 }, glide((f - 1756) / 66));

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 104, cut: true, s: S1b }],
  2: [{ f: 162, s: S2a }],
  3: [{ f: 273, s: S3a }],
  4: [{ f: 359, s: S4a }],
  5: [{ f: 502, s: S5a }],
  6: [{ f: 559, s: S6a }],
  7: [{ f: 643, s: S7a }],
  8: [{ f: 711, s: S8a }, { f: 776, cut: true, s: S8b }],
  9: [{ f: 835, s: S9a }],
  10: [{ f: 886, s: S10a }],
  11: [{ f: 1017, s: S11a }],
  12: [{ f: 1092, s: S12a }],
  13: [{ f: 1208, s: S13a }],
  14: [{ f: 1304, s: S14a }],
  15: [{ f: 1424, s: S15a }],
  16: [{ f: 1493, s: S16a }],
  17: [{ f: 1638, s: S17a }],
  18: [{ f: 1686, s: S18a }, { f: 1756, cut: true, s: S18b }],
};

/** boom kicks (frame, gain) */
const KICKS: [number, number][] = [[68, 1], [443, 0.6], [502, 0.9], [531, 0.9], [959, 1], [1101, 0.4], [1352, 0.3]];
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
  { f: 0, cInf: 8, focus: eyesOf(WP) },
  { f: 104, cInf: 13, focus: eyesOf(WP) },
  { f: 162, cInf: 6, focus: () => [SIGN[0], 1.1, SIGN[2]] },
  { f: 273, cInf: 0 },
  { f: 359, cInf: 12, focus: eyesOf(WV) },
  { f: 502, cInf: 15, focus: eyesOf(WV) },
  { f: 559, cInf: 11, focus: eyesOf(WV) },
  { f: 643, cInf: 13, focus: eyesOf(W_DESK, 1.4) },
  { f: 711, cInf: 9, focus: eyesOf(WP) },
  { f: 776, cInf: 0 },
  { f: 835, cInf: 12, focus: eyesOf(WP) },
  { f: 890, cInf: 0 },
  { f: 1020, cInf: 6, focus: () => [MAP.x, DESK.top, MAP.z] },
  { f: 1092, cInf: 6, focus: () => [MAP.x, DESK.top, MAP.z] },
  { f: 1208, cInf: 12, focus: eyesOf(WV) },
  { f: 1308, cInf: 8, focus: () => [SPLASH[0], 0.2, SPLASH[2]] },
  { f: 1428, cInf: 0 },
  { f: 1497, cInf: 14, focus: () => GLOBE },
  { f: 1641, cInf: 13, focus: eyesOf(WV) },
  { f: 1686, cInf: 13, focus: eyesOf(WP) },
  { f: 1756, dur: 30, cInf: 0 },
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

/** near framing objects: visible while a <= f < b (inside their own shot) */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 162, b: 273, kit: "plant_bushDetailed", pos: [4.6, 0, 6.2], s: 1.0, yaw: 0.4 },
];
