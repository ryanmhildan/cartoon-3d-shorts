// Timeline of "Gunung di Sumbawa yang Bikin Eropa Bersalju": shots timed to projects/tambora_salju/words.json.
// Zones on one sea: the summer farm (origin), the same farm under snow (z -1200), a European market town (z +1200),
// Tambora on Sumbawa far east (x +2600) and a cartoon Earth in "space" high above the summer farm (y 1500).
// Camera grammar of the bridge short (slow push-ins, smootherstep glides, cuts on big reframes, 7-frame flip kicks).
export const FPS = 30;
export const TOTAL = 1960;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places ----------------
export const SEA_Y = -0.5;
export const OS: V3 = [0, 0, 0];          // summer farm
export const OW: V3 = [0, 0, -1200];      // the same farm under snow
export const OT: V3 = [0, 0, 1200];       // European town square
export const LAND_R = 420;                // half size of each land box
/** farm layout (local to OS / OW) */
export const HOUSE = { x: -9, z: -12, w: 9, d: 7, h: 5.2 };   // farmhouse, front facade at z = -8.5 facing +z
export const BARN = { x: 10, z: -13, w: 8, d: 10, h: 5 };
export const FIELD = { x0: -6, x1: 7, z0: -5, z1: 2.6 };
export const FENCE_Z = 6.2;
export const DOOR: V3 = [-9, 0, -7.7];
export const TOM_FIELD: V3 = [0.6, 0, 4.0];
export const TOM_PLANT: V3 = [1.2, 0, 3.0];
export const TOM_FENCE: V3 = [-0.6, 0, 5.2];
export const NEIGH: V3 = [-2.0, 0, 7.1];
export const THERMO: V3 = [-6.2, 1.9, -8.45];
/** town layout (local to OT) */
export const STALL: V3 = [0, 0, -7];
export const BAKER: V3 = [-2.1, 0, -6.4];
export const PEASANT: V3 = [-3.5, 0, 1.8];
export const PREACH: V3 = [-9, 0.55, -1.2];
export const SCHOLAR: V3 = [8.5, 0, -0.5];
/** Tambora */
export const K0: V3 = [2600, 0, 0];
export const K_H = 170;                   // crater height
export const CRATER: V3 = [K0[0], K_H, K0[2]];
export const BEACH: V3 = [K0[0] - 930, 0, 40]; // Sumbawa beach (shot 2)
/** the Earth in space */
export const GLOBE: V3 = [0, 1500, 0];
export const GLOBE_R = 30;
export const SPACE_SHOTS = [14, 15];
export const P = (o: V3, l: V3): V3 => add(o, l);

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 141, light: "day", far: 4 },
  { id: 2, a: 141, b: 210, light: "day", far: 5 },
  { id: 3, a: 210, b: 335, light: "day", far: 5 },
  { id: 4, a: 335, b: 466, light: "day" },
  { id: 5, a: 466, b: 580, light: "day" },
  { id: 6, a: 580, b: 690, light: "day" },
  { id: 7, a: 690, b: 761, light: "day" },
  { id: 8, a: 761, b: 808, light: "day" },
  { id: 9, a: 808, b: 955, light: "day" },
  { id: 10, a: 955, b: 1074, light: "day" },
  { id: 11, a: 1074, b: 1186, light: "day" },
  { id: 12, a: 1186, b: 1310, light: "day", far: 5 },
  { id: 13, a: 1310, b: 1431, light: "day", far: 6 },
  { id: 14, a: 1431, b: 1571, light: "day", sunAz: 120, sunEl: 25 },
  { id: 15, a: 1571, b: 1682, light: "day", sunAz: 120, sunEl: 25 },
  { id: 16, a: 1682, b: 1811, light: "day" },
  { id: 17, a: 1811, b: 1878, light: "day" },
  { id: 18, a: 1878, b: TOTAL, light: "day", far: 5 },
];
export const XFADE: Record<number, number> = { 4: 8, 5: 6, 9: 8, 11: 8, 12: 8, 14: 8, 16: 8, 18: 8 };
export const FLASH_AT = 141;
/** shots on the snowy farm (snowfall cards) */
export const SNOWY = [1, 5, 6, 7, 8, 11, 16, 17];

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
const lerpShot = (a: Shot, b: Shot, s: number): Shot => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * s) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * s) as V3,
  fov: (a.fov ?? 40) + ((b.fov ?? 40) - (a.fov ?? 40)) * s, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * s,
});

/** standard framing on someone standing at `at` (feet): lens `dist` m away at azimuth `az` deg (0 = lens on -z looking
 *  +z, 180 = lens on +z looking -z: then screen-right = +x), lens at feet + camH, aimed at feet + lookH. */
const ms = (at: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [at[0] + (o.dx ?? 0), at[1] + (o.lookH ?? 1.0), at[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, at[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const W = (l: V3) => P(OW, l), S = (l: V3) => P(OS, l), TW = (l: V3) => P(OT, l), K = (l: V3) => P(K0, l);

// 1 hook: Tom in summer clothes on the snowy field; cut on "gunung" to quiet Tambora far away
const S1a = (f: number) => ms(W(TOM_FIELD), 192, 4.3, pushK(f, 0, 0.0024, 0.006, 25), { lookH: 1.2, dx: 0.1, camH: 1.55 });
const S1b = (f: number) => dolly(K([-820, 30, -260]), K([0, 140, 0]), pushK(f, 96, 0.003, 0.006, 25), { fov: 38 });
// 2 Sumbawa beach, palms, sign; Tambora behind
const S2a = (f: number) => dolly(add(BEACH, [-7, 1.7, 3]), K([0, 120, 40]), pushK(f, 141, 0.0016), { fov: 44 });
// 3 eruption wide; cut on "suaranya" to the globe CU on Indonesia
const S3a = (f: number) => dolly(K([-760, 40, -380]), K([0, 210, 0]), pushK(f, 210, 0.0014, 0.005, 30), { fov: 44 });
export const GLOBE_LOOK_ID: V3 = [0, 0, 0]; // filled by land.ts (world point of a lon/lat) at runtime
const S3b = (f: number): Shot => {
  const c = globeView(f, 112, -4, 3.0, 0.0018, 267);
  return c;
};
// 4 summer farm: Tom hoeing among young corn, the house + barn behind
const S4a = (f: number) => ms(S(TOM_PLANT), 200, 6.4, pushK(f, 331, 0.0022), { lookH: 1.5, camH: 2.4, dx: -0.6, fov: 42 });
// 5 Tom at the door yawning; cut on "kebunnya" to the wide white field
const S5a = (f: number) => ms(W(DOOR), 166, 3.5, pushK(f, 466, 0.0026), { lookH: 1.25, dx: 0.35 });
const S5b = (f: number) => dolly(W([3, 4.6, 15]), W([-2.5, 0.6, -4]), pushK(f, 518, 0.0018, 0.005, 25), { fov: 46 });
// 6 at the fence: neighbour + Tom (two-shot, lens outside the fence)
const S6a = (f: number) => ms(W([-1.3, 0, 6.2]), 180, 4.6, pushK(f, 580, 0.0022), { lookH: 1.15, camH: 1.45 });
// 7 frosted corn CU, Tom shivering behind
const S7a = (f: number) => dolly(W([2.9, 1.05, 5.4]), W([0.9, 1.0, 1.9]), pushK(f, 690, 0.003), { fov: 40 });
// 8 Tom deadpan CU, snow on his hat, dutch tilt
const S8a = (f: number) => ms(W(TOM_FIELD), 176, 2.25, pushK(f, 761, 0.0035, 0.007, 20), { lookH: 1.55, camH: 1.6, roll: -0.075, fov: 38 });
// 9 Europe: square / bakery stall / hungry crowd
const S9a = (f: number) => dolly(TW([6, 2.2, 13]), TW([-2.5, 1.6, -2]), pushK(f, 804, 0.0022), { fov: 44 });
const S9b = (f: number) => ms(TW(STALL), 180, 5.6, pushK(f, 870, 0.003, 0.006, 25), { lookH: 1.45, camH: 1.6, dx: -1.0, dz: 0.6 });
const S9c = (f: number) => ms(TW([0.2, 0, 2.2]), 180, 5.2, pushK(f, 912, 0.0028), { lookH: 1.25, camH: 1.5 });
// 10 preacher on a crate; cut on the second "ada" to the scholar with his spyglass
const S10a = (f: number) => ms(TW(PREACH), 205, 4.2, pushK(f, 955, 0.0026), { lookH: 1.9, camH: 1.25, dx: 0.4, roll: 0.05 });
const S10b = (f: number) => ms(TW(SCHOLAR), 150, 4.4, pushK(f, 1010, 0.0024), { lookH: 2.0, camH: 1.3, dx: -0.6 });
// 11 Tom shivering, puzzled, dutch tilt
const S11a = (f: number) => ms(W(TOM_FIELD), 196, 3.6, pushK(f, 1070, 0.0026, 0.006, 25), { lookH: 1.35, camH: 1.5, dx: 0.45, roll: 0.07 });
// 12 Tambora blasting sulphur: tilt up along the column
const S12a = (f: number) => { const u = glide((f - 1196) / 100); return { ...dolly(K([-900, 30, -330]), K([0, 220 + 330 * u, 0]), pushK(f, 1182, 0.0008)), fov: 46 }; };
// 13 high above: the yellow veil spreading over the clouds
const S13a = (f: number) => dolly(K([-1100, 470, -420]), K([0, 600, 0]), pushK(f, 1306, 0.0012), { fov: 50 });
// 14-15 the Earth in space
export const globeView = (f: number, lon: number, lat: number, dist: number, rate: number, f0: number, roll = 0): Shot => {
  const d = GLOBE_DIR(lon, lat), k = pushK(f, f0, rate);
  const r = GLOBE_R * (1 + (dist - 1) * k);
  return { pos: [GLOBE[0] + d[0] * r, GLOBE[1] + d[1] * r, GLOBE[2] + d[2] * r], look: GLOBE, fov: 40, roll };
};
/** world direction from the globe centre toward a lon/lat (set by land.ts once the globe is oriented) */
export let GLOBE_DIR = (_lon: number, _lat: number): V3 => [0, 0, 1];
export const setGlobeDir = (fn: (lon: number, lat: number) => V3) => { GLOBE_DIR = fn; };
const S14a = (f: number): Shot => {
  const u = (f - 1431) / 140, lon = 112 - 70 * u, lat = 6 + 8 * u;
  return globeView(f, lon, lat, 3.3, 0.0012, 1431);
};
const S15a = (f: number): Shot => {
  const c = globeView(f, 60, 22, 4.6, 0.001, 1571);
  return { ...c, look: [GLOBE[0], GLOBE[1] + GLOBE_R * 0.32, GLOBE[2]] };
};
// 16 thermometer CU on the farmhouse wall; cut on "tapi" to the wide snowy farm
const S16a = (f: number) => dolly(W(add(THERMO, [0.5, 0.15, 2.3])), W(add(THERMO, [0, 0, 0])), pushK(f, 1678, 0.003), { fov: 38 });
const S16b = (f: number) => dolly(W([-10, 3.4, 15]), W([0, 1.0, 0]), pushK(f, 1732, 0.0018), { fov: 46 });
// 17 Tom searching with his spyglass
const S17a = (f: number) => ms(W(TOM_FIELD), 166, 3.8, pushK(f, 1811, 0.0028), { lookH: 1.45, camH: 1.3, dx: -0.4 });
// 18 Tambora smoking quietly; crane back
const S18a = (f: number): Shot => lerpShot({ pos: K([-640, 25, -300]), look: K([0, 170, 0]), fov: 40 },
  { pos: K([-900, 120, -420]), look: K([0, 230, 0]), fov: 46 }, glide((f - 1878) / 82));

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 96, cut: true, s: S1b }],
  2: [{ f: 141, s: S2a }],
  3: [{ f: 210, s: S3a }, { f: 267, cut: true, s: S3b }],
  4: [{ f: 331, s: S4a }],
  5: [{ f: 466, s: S5a }, { f: 518, cut: true, s: S5b }],
  6: [{ f: 580, s: S6a }],
  7: [{ f: 690, s: S7a }],
  8: [{ f: 761, s: S8a }],
  9: [{ f: 804, s: S9a }, { f: 870, cut: true, s: S9b }, { f: 912, cut: true, s: S9c }],
  10: [{ f: 951, s: S10a }, { f: 1010, cut: true, s: S10b }],
  11: [{ f: 1070, s: S11a }],
  12: [{ f: 1182, s: S12a }],
  13: [{ f: 1306, s: S13a }],
  14: [{ f: 1427, s: S14a }],
  15: [{ f: 1571, s: S15a }],
  16: [{ f: 1678, s: S16a }, { f: 1732, cut: true, s: S16b }],
  17: [{ f: 1811, s: S17a }],
  18: [{ f: 1874, s: S18a }],
};

/** impact kicks (frame, gain) */
const KICKS: [number, number][] = [[246, 1], [532, 0.5], [1190, 0.5], [1621, 0.4]];
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
  { f: 0, cInf: 12, focus: eyesOf(W(TOM_FIELD)) },
  { f: 96, cInf: 0 },
  { f: 141, cInf: 6, focus: () => add(BEACH, [-1.5, 1.3, 1.2]) },
  { f: 210, cInf: 0 },
  { f: 335, cInf: 8, focus: eyesOf(S(TOM_PLANT)) },
  { f: 466, cInf: 12, focus: eyesOf(W(DOOR)) },
  { f: 518, cInf: 0 },
  { f: 580, cInf: 11, focus: eyesOf(W(TOM_FENCE)) },
  { f: 690, cInf: 13, focus: () => W([1.4, 1.0, 3.1]) },
  { f: 761, cInf: 15, focus: eyesOf(W(TOM_FIELD), 1.65) },
  { f: 808, cInf: 6, focus: eyesOf(TW(PEASANT)) },
  { f: 870, cInf: 11, focus: eyesOf(TW(BAKER)) },
  { f: 912, cInf: 11, focus: eyesOf(TW([0.2, 0, 2.2])) },
  { f: 955, cInf: 12, focus: eyesOf(TW(PREACH)) },
  { f: 1010, cInf: 12, focus: eyesOf(TW(SCHOLAR)) },
  { f: 1074, cInf: 13, focus: eyesOf(W(TOM_FIELD)) },
  { f: 1186, cInf: 0 },
  { f: 1682, cInf: 13, focus: () => W(THERMO) },
  { f: 1732, cInf: 0 },
  { f: 1811, cInf: 12, focus: eyesOf(W(TOM_FIELD)) },
  { f: 1878, cInf: 0 },
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
  { a: 141, b: 210, kit: "plant_bushDetailed", pos: add(BEACH, [-4.6, 0, 1.0]), s: 1.0, yaw: 0.4 },
  { a: 808, b: 870, kit: "plant_bushDetailed", pos: TW([4.4, 0, 10.6]), s: 0.9, yaw: 1.2 },
];
void GLOBE_LOOK_ID;
