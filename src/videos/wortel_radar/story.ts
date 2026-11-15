// Timeline of "Pilot yang Katanya Melihat dalam Gelap": shots timed to projects/wortel_radar/words.json. An English
// village of 1940 (street of houses with blackout windows, a carrot garden), a grass airfield east of the village (hangar,
// windsock, our night fighter with radar aerials on its nose), the night sky above (bombers as dark silhouettes), a rock
// cave far to the west, and the camera grammar of the bridge short. Camera az 180 = lens on +z looking -z.
export const FPS = 30;
export const TOTAL = 1975;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------- places ----------------
export const SEA_Y = -3;
export const STREET: V3 = [0, 0, -5];
export const LAMP: V3 = [4.6, 0, -3.0];             // street lamp the dad walks into (shot 8)
export const SIGN: V3 = [5.6, 0, -8.3];             // wooden notice on the street (shot 2)
export const GARDEN: V3 = [-19, 0, -4.6];           // carrot garden in front of a house
export const JHOUSE = { x: -20, z: -13 };
export const HOME: V3 = [-38, 0, -5.2];             // "today": a house front with a little table (shots 14-15)
export const PARK: V3 = [100, 0, 4];                // the night fighter parked on the airfield, nose toward +z
export const PILOT: V3 = [97.4, 0, 12.4];           // Cunningham in front of the left wing, by the nose
export const OFFI: V3 = [99.6, 0, 13.4];            // the man from the ministry
export const HANGAR: V3 = [114, 0, -16];
export const CAVE: V3 = [-170, 0, 70];              // tunnel along x: end wall at CAVE.x - 9, mouth at CAVE.x + 9
export const CAVE_WALL = -9;
export const KIDCAVE: V3 = [-170 + 3.2, 0, 70 - 0.55];
export const FLY_Y = 95;                            // cruise height of the night air shots

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; night?: boolean; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 174, light: "day", night: true, sunAz: 150, sunEl: 32 },
  { id: 2, a: 174, b: 295, light: "day", night: true, sunAz: 140, sunEl: 35 },
  { id: 3, a: 295, b: 392, light: "day", night: true, sunAz: 12, sunEl: 34, far: 1.6 },
  { id: 4, a: 392, b: 509, light: "day", night: true, sunAz: 20, sunEl: 20, far: 1.6 },
  { id: 5, a: 509, b: 584, light: "day", night: true, sunAz: 150, sunEl: 32 },
  { id: 6, a: 584, b: 716, light: "day" },
  { id: 7, a: 716, b: 870, light: "day" },
  { id: 8, a: 870, b: 1060, light: "day", night: true, sunAz: 140, sunEl: 35 },
  { id: 9, a: 1060, b: 1198, light: "day" },
  { id: 10, a: 1198, b: 1351, light: "day", night: true, sunAz: 25, sunEl: 22, far: 1.6 },
  { id: 11, a: 1351, b: 1491, light: "day", sunAz: 160, sunEl: 14 },
  { id: 12, a: 1491, b: 1635, light: "day" },
  { id: 13, a: 1635, b: 1782, light: "day" },
  { id: 14, a: 1782, b: 1876, light: "golden", sunAz: 150, sunEl: 12 },
  { id: 15, a: 1876, b: TOTAL, light: "golden", sunAz: 150, sunEl: 12 },
];
export const XFADE: Record<number, number> = { 2: 8, 6: 8, 7: 8, 8: 8, 9: 8, 11: 8, 12: 8, 13: 8, 14: 8 };
export const FLASH_AT = 174;
export const SPY = { a: -10, b: -10 };

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story physics: windows, planes ----------------
/** shot 2: windows go dark one after another from "dipadamkan" (253); before that every window glows */
export const windowOn = (id: number, f: number, i: number) => {
  if (id !== 2) return false;
  return f < 250 + Math.floor(hh(i, 4) * 26);
};
/** pose of a plane: pos (centre), yaw (0 = nose toward +z), pitch (+ = nose up), roll (+ = right wing down), prop spin */
export type Pose = { pos: V3; yaw: number; pitch: number; roll: number; spin: number; smoke?: number };
const SPEED = 26; // m/s along +x in the air shots (the camera travels with the fighter)
export const fighterAt = (id: number, f: number): Pose | null => {
  if (id === 4) return { pos: [SPEED * (f - 392) / FPS, FLY_Y + 1.2 * Math.sin(f * 0.05), 40], yaw: Math.PI / 2, pitch: 0.02, roll: 0.06 * Math.sin(f * 0.04), spin: f };
  if (id === 10) return { pos: [SPEED * (f - 1198) / FPS, FLY_Y, 40], yaw: Math.PI / 2, pitch: 0.0, roll: 0.03 * Math.sin(f * 0.05), spin: f };
  if ([1, 5, 6, 9, 12].includes(id)) return { pos: [...PARK], yaw: 0, pitch: 0.1, roll: 0, spin: 0 };
  return null;
};
/** the bombers: three over the village (shot 3), one ahead of the fighter (4, 10) */
export const bombersAt = (id: number, f: number): Pose[] => {
  if (id === 3) {
    const out: Pose[] = [];
    for (let i = 0; i < 3; i++) {
      const x = -16 + 12 * (f - 295) / FPS + [0, -10, -19][i], y = [44, 50, 40][i], z = [-52, -64, -72][i];
      out.push({ pos: [x, y, z], yaw: Math.PI / 2, pitch: 0, roll: 0, spin: f + i * 7 });
    }
    return out;
  }
  if (id === 4) {
    const fx = SPEED * (f - 392) / FPS, d = smooth((f - 470) / 40);
    return [{ pos: [fx + 30 + 6 * d, FLY_Y + 3 - 26 * d * d, 42 - 3 * d], yaw: Math.PI / 2, pitch: -0.5 * d, roll: 0.5 * d, spin: f, smoke: f >= 469 ? (f - 469) / 30 : undefined }];
  }
  if (id === 10) {
    const fx = SPEED * (f - 1198) / FPS;
    return [{ pos: [fx + 46, FLY_Y + 2, 41], yaw: Math.PI / 2, pitch: 0, roll: 0, spin: f }];
  }
  return [];
};
/** shot 12: the giant carrot that hides the radar nose (0 = not there, 1 = in place) */
export const carrotMask = (id: number, f: number) => (id === 12 ? smooth((f - 1570) / 16) : 0);
/** the nose of the parked fighter (aerials) in world space */
export const NOSE: V3 = [PARK[0], 2.55, PARK[2] + 6.35];

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
/** camera riding with the fighter: offsets relative to its position */
const ride = (id: number, f: number, po: V3, lo: V3, k: number, fov = 42, roll = 0): Shot => {
  const p = fighterAt(id, f)!.pos;
  const P: V3 = [p[0], FLY_Y, p[2]];
  return dolly(add(P, po), add(P, lo), k, { fov, roll });
};
const P = PILOT, G = GARDEN;
const S1a = (f: number) => ms(P, 148, 6.2, pushK(f, 0, 0.0022, 0.005, 25), { lookH: 1.5, camH: 1.3, dx: 0.45, fov: 42 });
const S2a = (f: number) => ms(STREET, 180, 11, pushK(f, 174, 0.0018), { lookH: 2.4, camH: 2.0, dx: 2.0, fov: 44 });
const S3a = (f: number) => dolly([1.5, 1.4, 1.5], [-2, 24, -40], pushK(f, 295, 0.0012), { fov: 52 });
const S4a = (f: number) => ride(4, f, [-30, 10, 10], [16, 1.5, 1], pushK(f, 392, 0.0015, 0.004, 30), 40);
const S5a = (f: number) => ms(P, 172, 2.5, pushK(f, 509, 0.003, 0.007, 25), { lookH: 1.62, camH: 1.55, fov: 38 });
const S6a = (f: number) => ms(add(P, [1.25, 0, 0.5]), 172, 7.6, pushK(f, 584, 0.0018), { lookH: 1.5, camH: 1.45, fov: 42 });
const S7a = (f: number) => ms(G, 180, 8.2, pushK(f, 716, 0.0018), { lookH: 1.25, camH: 1.3, dx: 0.1, dz: 0.5, fov: 42 });
const S8a = (f: number) => ms(LAMP, 180, 7.2, pushK(f, 870, 0.0016), { lookH: 1.5, camH: 1.4, dx: -1.2, dz: -0.2, roll: 0.075, fov: 42 });
const S8b = (f: number) => ms(LAMP, 184, 4.6, pushK(f, 985, 0.003, 0.006, 25), { lookH: 1.5, camH: 1.4, dx: -0.5, roll: -0.07, fov: 40 });
const S9a = (f: number) => ms(P, 168, 3.2, pushK(f, 1060, 0.0022), { lookH: 1.55, camH: 1.5, fov: 40 });
const S9b = (f: number) => dolly([PARK[0] + 3.6, 2.4, PARK[2] + 10.8], [NOSE[0] + 0.1, NOSE[1] + 0.1, NOSE[2]], pushK(f, 1160, 0.0025), { fov: 40 });
const S10a = (f: number) => ride(10, f, [-16, 52, 0.5], [25, 0, 0], pushK(f, 1198, 0.0012), 50);
const S11a = (f: number) => dolly(add(CAVE, [8.4, 1.55, -1.7]), add(CAVE, [-5, 1.6, 0.6]), pushK(f, 1351, 0.0007, 0.002, 25), { fov: 50 });
const S12a = (f: number) => dolly([PARK[0] - 11.2, 2.0, PARK[2] + 13.6], [PARK[0] - 0.9, 1.8, PARK[2] + 7.4], pushK(f, 1491, 0.0014, 0.003, 30), { fov: 44 });
const S13a = (f: number) => ms(add(G, [0.5, 0, 0]), 182, 4.2, pushK(f, 1635, 0.0022), { lookH: 1.25, camH: 1.25, fov: 42 });
const S14a = (f: number) => ms(HOME, 176, 7.4, pushK(f, 1782, 0.0018), { lookH: 1.4, camH: 1.5, fov: 42 });
const S15a = (f: number) => ms(add(HOME, [-0.05, 0, 0.3]), 182, 6.3, pushK(f, 1876, 0.0025, 0.005, 25), { lookH: 1.45, camH: 1.35, fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 170, s: S2a }], 3: [{ f: 295, s: S3a }], 4: [{ f: 392, s: S4a }], 5: [{ f: 509, s: S5a }],
  6: [{ f: 580, s: S6a }], 7: [{ f: 712, s: S7a }], 8: [{ f: 866, s: S8a }, { f: 985, cut: true, s: S8b }],
  9: [{ f: 1056, s: S9a }, { f: 1152, dur: 30, s: S9b }], 10: [{ f: 1198, s: S10a }], 11: [{ f: 1347, s: S11a }],
  12: [{ f: 1487, s: S12a }], 13: [{ f: 1631, s: S13a }], 14: [{ f: 1778, s: S14a }], 15: [{ f: 1876, s: S15a }],
};

const KICKS: [number, number][] = [[150, 0.5], [469, 0.6], [693, 0.5], [962, 0.9], [1615, 0.7]];
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
  { f: 0, cInf: 10, focus: eyesOf(P) },
  { f: 174, cInf: 0 },
  { f: 295, cInf: 0 },
  { f: 509, cInf: 13, focus: eyesOf(P) },
  { f: 584, cInf: 8, focus: eyesOf(add(P, [1.25, 0, 0.5])) },
  { f: 716, cInf: 8, focus: eyesOf(G, 1.2) },
  { f: 870, cInf: 7, focus: eyesOf(LAMP, 1.5) },
  { f: 1060, cInf: 12, focus: eyesOf(P) },
  { f: 1160, cInf: 9, focus: () => NOSE },
  { f: 1198, cInf: 0 },
  { f: 1351, cInf: 6, focus: eyesOf(KIDCAVE, 1.3) },
  { f: 1491, cInf: 7, focus: () => [NOSE[0] - 2, 1.5, NOSE[2] + 1.5] },
  { f: 1635, cInf: 12, focus: eyesOf(add(G, [0.5, 0, 0]), 1.2) },
  { f: 1782, cInf: 8, focus: eyesOf(HOME, 1.3) },
  { f: 1876, cInf: 11, focus: eyesOf(add(HOME, [0, 0, 0.3]), 1.3) },
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
void lerp;

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
