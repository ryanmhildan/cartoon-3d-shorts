// Timeline of "Orang Indonesia yang Hidup di Dasar Laut": shots timed to projects/bajau_limpa/words.json, our cartoon
// Bajau village (stilt houses over the sea, decks and plank walks, toward -x), the open sea and a coral reef toward +x
// (seabed ~-5.5 m), and the camera grammar of the bridge short (slow push-ins, smootherstep glides, cuts, kicks).
export const FPS = 30;
export const TOTAL = 1817;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- the sea ----------------
export const SEA = 0;
export const FLOOR = 1.8;                         // deck / house floor height over the water
/** seabed: gentle bumps, a little deeper over the reef */
export const seabedY = (x: number, z: number) =>
  -5.2 - 0.6 * smooth((x - 6) / 14) + 0.32 * Math.sin(x * 0.55 + z * 0.3) + 0.22 * Math.cos(z * 0.75 - x * 0.2);
export const groundY = seabedY;
export const at = (x: number, z: number, dy = 0): V3 => [x, seabedY(x, z) + dy, z];
export const deckAt = (x: number, z: number): V3 => [x, FLOOR, z];

// ---------------- places ----------------
export const HOUSE = { x: -12, z: 0, w: 7, d: 6, h: 2.6 };           // Pak Dino's stilt house, facade to +x
export const DECK = { x0: -9, x1: -3.6, z0: -3.6, z1: 3.6 };         // its open deck over the water
export const DECK2 = { x0: -9, x1: -3.6, z0: 18.5, z1: 25.5 };       // neighbour deck (tourists, the diver)
export const DECK3 = { x0: -9, x1: -3.8, z0: -25.5, z1: -18.5 };     // neighbour deck (grandma weaving)
export const DINO_D = deckAt(-5.2, 0.4);
export const SIGN = deckAt(-4.3, -2.6);
export const TOUR = deckAt(-4.6, 21.2);
export const DIVE = deckAt(-4.4, 23.6);
export const HEAD: V3 = [-1.2, -1.15, 23.4];       // the city diver bursting up: card feet under water
export const SCI_D = deckAt(-5.6, -1.0);
export const NB = deckAt(-5.6, -22);
export const REEF: V3 = at(27, 0);
export const DINO_R = at(26.5, 1.0);                // standing on the reef floor (hook)

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; under?: boolean; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 144, light: "day", under: true, sunEl: 70 },
  { id: 2, a: 144, b: 254, light: "day" },
  { id: 3, a: 254, b: 350, light: "day", under: true, sunEl: 70 },
  { id: 4, a: 350, b: 475, light: "day" },
  { id: 5, a: 475, b: 552, light: "day" },
  { id: 6, a: 552, b: 659, light: "day" },
  { id: 7, a: 659, b: 763, light: "day", under: true, sunEl: 70 },
  { id: 8, a: 763, b: 885, light: "day" },
  { id: 9, a: 885, b: 1023, light: "day" },
  { id: 10, a: 1023, b: 1158, light: "day" },
  { id: 11, a: 1158, b: 1303, light: "day" },
  { id: 12, a: 1303, b: 1436, light: "day", under: true, sunEl: 70 },
  { id: 13, a: 1436, b: 1558, light: "day", under: true, sunEl: 70 },
  { id: 14, a: 1558, b: 1672, light: "day" },
  { id: 15, a: 1672, b: 1730, light: "golden", far: 2 },
  { id: 16, a: 1730, b: TOTAL, light: "day", under: true, sunEl: 70 },
];
export const XFADE: Record<number, number> = { 3: 8, 4: 8, 7: 8, 8: 8, 12: 8, 14: 8, 15: 8, 16: 8 };
export const FLASH_AT = 144;
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
/** shot 3: Pak Dino swimming across the reef toward -z, at mid-water */
export const swim3 = (f: number): V3 => [27, -3.3 + 0.12 * Math.sin(f * 0.12), 6 - 0.075 * (f - 254)];
/** shot 7: chasing the fish, slower, along +x a little lower */
export const swim7 = (f: number): V3 => [22 + 0.05 * (f - 659), -3.9 + 0.1 * Math.sin(f * 0.1), 4.5];
/** shot 12: diving down at an angle */
export const swim12 = (f: number): V3 => { const u = clamp01((f - 1303) / 133); return [29 + 3.2 * u, -1.6 - 2.4 * u, -4]; };
export const FLOAT13: V3 = [31, -3.4, -2];
export const FLOAT16: V3 = [27.5, -3.6, 0.5];
/** the city diver's jump in shot 5: 0 on the deck .. 1 under water */
export const jumpK = (f: number) => clamp01((f - 523) / 16);

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
/** framing on someone at `p` (feet): lens `dist` m away at azimuth `az` (0 = lens on -z looking +z; -90 = lens on +x
 *  looking -x), lens at feet + camH, aimed at feet + lookH. */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const S1a = (f: number) => ms(DINO_R, -20, 6.2, pushK(f, 0, 0.0022), { camH: 1.0, lookH: 1.25, fov: 42 });
const S2a = (f: number) => ms(DINO_D, -98, 6.4, pushK(f, 144, 0.0022), { lookH: 1.3, camH: 1.5, dz: -0.5 });
const S3a = (f: number): Shot => { const p = swim3(f); return { pos: [p[0] + 6.5, -3.0, p[2] - 0.8], look: [p[0], p[1] + 0.1, p[2] - 0.8], fov: 42 }; };
const S4a = (f: number) => ms(TOUR, -92, 8.2, pushK(f, 350, 0.0022, 0.005, 30), { camH: -0.9, lookH: 1.45, fov: 40 });
const S5a = (f: number) => ms(DIVE, -74, 6.6, pushK(f, 475, 0.002), { camH: 0.1, lookH: 0.55, fov: 42, dz: -0.3 });
const S6a = (f: number) => dolly([HEAD[0] + 5.2, 0.6, HEAD[2] - 0.9], [HEAD[0], 1.0, HEAD[2]], pushK(f, 552, 0.0022, 0.007, 25), { fov: 40 });
const S7a = (f: number): Shot => { const p = swim7(f); return { pos: [p[0] + 1.0, -3.3, p[2] - 4.8], look: [p[0] + 1.0, p[1] + 0.35, p[2]], fov: 42 }; };
const S8a = (f: number) => ms(DINO_D, -112, 9.6, pushK(f, 763, 0.0018), { lookH: 1.3, camH: 1.7, dz: -0.75 });
const S9a = (f: number) => ms(add(DINO_D, [0, 0, 0.48]), -90, 6.2, pushK(f, 885, 0.0025, 0.006, 30), { lookH: 1.05, camH: 1.25, roll: 0.075, fov: 38 });
const S10a = (f: number) => ms(DINO_D, -84, 6.2, pushK(f, 1023, 0.002, 0.004, 30), { lookH: 1.75, camH: 1.5 });
const S11a = (f: number) => ms(DINO_D, -96, 6.0, pushK(f, 1158, 0.0018), { lookH: 1.75, camH: 1.5 });
const S12a = (f: number): Shot => { const p = swim12(f); return { pos: [p[0] - 0.8, -2.4, p[2] - 6.6], look: [p[0] + 0.2, p[1] + 0.2, p[2]], fov: 42 }; };
const S13a = (f: number) => dolly(add(FLOAT13, [1.0, 0.7, -5.6]), add(FLOAT13, [0.2, 1.1, 0]), pushK(f, 1436, 0.002), { fov: 42 });
const S14a = (f: number) => ms(NB, -96, 8.4, pushK(f, 1558, 0.002, 0.004, 30), { lookH: 1.3, camH: 1.4, dz: -0.4 });
const S15a = (f: number) => dolly([38, 26, -46], [-24, 1, 2], pushK(f, 1672, 0.0018), { fov: 44 });
const S16a = (f: number): Shot => lerpShot({ pos: add(FLOAT16, [0, 0.9, -4.6]), look: add(FLOAT16, [0, 1.15, 0]), fov: 40 },
  { pos: add(FLOAT16, [0, 2.4, -6.4]), look: add(FLOAT16, [0, 1.9, 0]), fov: 44 }, glide((f - 1745) / 72));

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 144, s: S2a }], 3: [{ f: 250, s: S3a }], 4: [{ f: 346, s: S4a }], 5: [{ f: 475, s: S5a }],
  6: [{ f: 552, s: S6a }], 7: [{ f: 655, s: S7a }], 8: [{ f: 759, s: S8a }], 9: [{ f: 885, s: S9a }], 10: [{ f: 1023, s: S10a }],
  11: [{ f: 1158, s: S11a }], 12: [{ f: 1299, s: S12a }], 13: [{ f: 1436, s: S13a }], 14: [{ f: 1554, s: S14a }],
  15: [{ f: 1668, s: S15a }], 16: [{ f: 1726, s: S16a }],
};

const KICKS: [number, number][] = [[109, 0.5], [530, 0.8], [611, 1], [885, 0.6], [1134, 0.5], [1648, 0.6]];
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
  { f: 0, cInf: 8, focus: eyesOf(DINO_R) },
  { f: 144, cInf: 9, focus: eyesOf(DINO_D) },
  { f: 254, cInf: 6, focus: (f) => swim3(f) },
  { f: 350, cInf: 9, focus: eyesOf(TOUR) },
  { f: 475, cInf: 9, focus: eyesOf(DIVE) },
  { f: 552, cInf: 13, focus: () => add(HEAD, [0, 1.9, 0]) },
  { f: 659, cInf: 7, focus: (f) => swim7(f) },
  { f: 763, cInf: 7, focus: eyesOf(DINO_D) },
  { f: 885, cInf: 14, focus: eyesOf(add(DINO_D, [0, 0, 0.48]), 1.5) },
  { f: 1023, cInf: 11, focus: eyesOf(DINO_D) },
  { f: 1158, cInf: 11, focus: eyesOf(DINO_D) },
  { f: 1303, cInf: 7, focus: (f) => swim12(f) },
  { f: 1436, cInf: 10, focus: () => add(FLOAT13, [0, 1.2, 0]) },
  { f: 1558, cInf: 10, focus: eyesOf(NB, 1.0) },
  { f: 1672, cInf: 0 },
  { f: 1730, cInf: 9, focus: () => add(FLOAT16, [0, 1.5, 0]) },
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
