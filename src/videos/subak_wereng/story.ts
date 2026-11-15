// Timeline of "Kenapa Petani Bali Menuruti Jadwal Pura": shots timed to projects/subak_wereng/words.json, the rice
// terraces (paddy cells and their state per shot), and the camera grammar of the bridge short (slow push-ins,
// smootherstep glides 18-40 f, cuts on big reframes, 7-frame flip kicks on impacts).
export const FPS = 30;
export const TOTAL = 2008;
export const D0 = 0; // ground level (build.ts house() default)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- the terraces ----------------
// rows climb away from the lens (+z); row r floor (water line) at Y(r); front dike of row 0 at z ~1.8
export const ROW_D = 7.2, ROW0 = 2.2, STEP = 0.55, NROW = 16;
export const rowZ0 = (r: number) => ROW0 + r * ROW_D;
export const rowZ1 = (r: number) => rowZ0(r) + ROW_D - 0.45;
export const rowY = (r: number) => STEP * r;
/** pura air platform (left, over rows 0-2) */
export const PURA = { x0: -36, x1: -15, z0: -3, z1: 23.35, y: 0.6 };
export const GATE: V3 = [-25.5, 0, -3]; // centre of the candi bentar (split gate) on the front wall
export const MERU: V3 = [-25.5, PURA.y, 11];
export type Cell = { i: number; r: number; x0: number; x1: number; z0: number; z1: number; y: number; cx: number; cz: number };
export const CELLS: Cell[] = (() => {
  const out: Cell[] = [];
  for (let r = 0; r < NROW; r++) {
    let x = -110 + hh(r, 3) * 6;
    while (x < 110) {
      const w = 8 + Math.floor(hh(out.length + r * 31, 1) * 5);
      const x0 = x + 0.25, x1 = x + w - 0.25, z0 = rowZ0(r), z1 = rowZ1(r);
      x += w;
      if (x1 > PURA.x0 - 1 && x0 < PURA.x1 + 1 && z0 < PURA.z1) continue;
      out.push({ i: out.length, r, x0, x1, z0, z1, y: rowY(r), cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 });
    }
  }
  return out;
})();

export type Kind = "water" | "young" | "green" | "gold" | "eaten" | "stubble";
const PATCH: Kind[] = ["water", "young", "green", "gold", "stubble", "green", "young", "gold"];
const patch = (c: Cell): Kind => PATCH[Math.floor(hh(c.i, 5) * PATCH.length)];
/** cells near the hook / confusion shots (front of rows 0-1 between x -4 and 22) */
const nearHero = (c: Cell) => c.r <= 1 && c.cx > -6 && c.cx < 24;
/** where the swarm front is in shot 8 (x, moving left to right) */
export const swarmX = (f: number) => -30 + 85 * clamp01((f - 850) / 100);
export const cellKind = (c: Cell, id: number, f: number): Kind => {
  const h = hh(c.i, 9), p = patch(c);
  const chew = (k: Kind): Kind => (k === "green" || k === "gold" || k === "young" ? "eaten" : k);
  switch (id) {
    case 1: return nearHero(c) ? "eaten" : h < 0.55 ? chew(p) : p;
    case 2: case 4: case 5: case 11: return "green";
    case 3: return "young";
    case 6: return f < 698 + h * 58 ? "green" : p;
    case 7: return c.r === 0 && c.cx > 8 && c.cx < 20 ? "gold" : p;
    case 8: return c.cx < swarmX(f) - 4 && h < 0.75 ? chew(p) : p;
    case 9: return h < 0.6 ? chew(p) : p;
    case 10: return nearHero(c) ? "eaten" : h < 0.7 ? chew(p) : p;
    case 12: return "green";
    case 13: return f < 1393 + h * 6 ? "gold" : f < 1434 + h * 6 ? "stubble" : "water";
    case 14: return p;
    case 15: return f < 1815 ? "green" : "gold";
    case 16: return "gold";
    default: return "green";
  }
};

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 180, light: "day" },
  { id: 2, a: 180, b: 265, light: "day", sunAz: 110 },
  { id: 3, a: 265, b: 414, light: "day" },
  { id: 4, a: 414, b: 528, light: "day" },
  { id: 5, a: 528, b: 682, light: "day" },
  { id: 6, a: 682, b: 780, light: "day", sunAz: 110 },
  { id: 7, a: 780, b: 844, light: "day" },
  { id: 8, a: 844, b: 953, light: "day" },
  { id: 9, a: 953, b: 1028, light: "day" },
  { id: 10, a: 1028, b: 1170, light: "day" },
  { id: 11, a: 1170, b: 1281, light: "day", sunAz: 120, sunEl: 40 },
  { id: 12, a: 1281, b: 1371, light: "day", sunAz: -70 },
  { id: 13, a: 1371, b: 1526, light: "day", sunAz: 110 },
  { id: 14, a: 1526, b: 1721, light: "day", sunAz: -70 },
  { id: 15, a: 1721, b: 1857, light: "day" },
  { id: 16, a: 1857, b: TOTAL, light: "day" },
];
export const XFADE: Record<number, number> = { 11: 8, 12: 6, 15: 8 };
export const FLASH_AT = 180;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- key places (shared with cast.ts) ----------------
export const DIKE_Z = 1.75, DIKE_Y = 0.3; // front dike of row 0
export const WAYAN1: V3 = [5, DIKE_Y, DIKE_Z];       // hook + confusion
export const PLANT: V3 = [14, rowY(0), 3.2];        // first planter (shot 3), the line recedes +x +z
export const PRIEST: V3 = [-25.5, 0, -4.4];          // in front of the gate
export const OFFICIAL: V3 = [9, 0, -4.2];            // shot 4
export const TALK: V3 = [-5, 0, -4.6];              // shot 5 (officials right, Wayan + priest left)
export const HARVEST: V3 = [13.5, DIKE_Y, DIKE_Z];   // shot 7
export const SPRAY: V3 = [24, DIKE_Y, DIKE_Z];       // shot 9
export const BUG: V3 = [30.5, rowY(1) + 0.3, rowZ0(1) - 0.2]; // hero bug on the dike between rows 0 and 1 (shots 12-14)

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
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const W1 = WAYAN1, P = PRIEST, H = HARVEST, B = BUG;
/** standard framing on someone standing at `at` (feet): lens `dist` m away at azimuth `az` deg (0 = from -z looking +z,
 *  + = from screen-left... i.e. lens moved toward -x), lens at feet + camH, aimed at feet + lookH. Faces land at ~30 %
 *  of the frame height, clear of the captions (~69 %). dx shifts the look point sideways (world x). */
const ms = (at: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [at[0] + (o.dx ?? 0), at[1] + (o.lookH ?? 1.0), at[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, at[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
// 1 hook: high 3/4 over the chewed paddies with Wayan small in the middle, then MS of Wayan on "dihabisi"
const S1a = (f: number) => dolly(add(W1, [-0.4, 5.0, -8.5]), add(W1, [-0.2, 0.7, 1.2]), pushK(f, 0, 0.0022), { fov: 44 });
const S1b = (f: number) => ms(W1, 12, 3.6, pushK(f, 134, 0.003, 0.006, 30), { roll: 0.04, lookH: 1.05 });
// 2 aerial establishing (zoom push)
const S2a = (f: number) => zoom([26, 20, -30], [-4, 3, 34], 46, pushK(f, 180, 0.002));
// 3 planters in a diagonal line receding to the right, then the priest at the gate
const S3a = (f: number) => dolly(add(PLANT, [-1.6, 1.6, -4.6]), add(PLANT, [1.4, 0.5, 2.0]), pushK(f, 265, 0.0022), { fov: 42 });
const S3b = (f: number) => ms(P, -18, 4.2, pushK(f, 361, 0.0025), { roll: -0.03, lookH: 1.25 });
// 4 official with the seed sack
const S4a = (f: number) => ms(OFFICIAL, 15, 3.4, pushK(f, 414, 0.0025, 0.006, 30), { lookH: 1.05 });
// 5 officials laughing -> wider with Wayan + priest
const S5a = (f: number) => ms(TALK, 12, 4.8, pushK(f, 528, 0.0025), { roll: 0.035, dx: 0.1, dz: 0.3, lookH: 1.1 });
const S5b = (f: number) => ms(TALK, 30, 7.6, pushK(f, 630, 0.002), { dx: 1.2, dz: 1.0, camH: 1.8, lookH: 0.95, fov: 42 });
// 6 aerial patchwork
const S6a = (f: number) => zoom([12, 24, -16], [6, 0, 30], 44, pushK(f, 682, 0.0018));
// 7 harvest MS
const S7a = (f: number) => ms(H, -12, 3.7, pushK(f, 780, 0.003, 0.006, 25), { lookH: 1.1 });
// 8 low wide across the patchwork, the swarm sweeps left to right
const S8a = (f: number) => dolly([10, 4.2, -9], [12, 1.6, 22], pushK(f, 844, 0.0018), { fov: 46 });
// 9 sprayer: MS from the front-left, the mist crosses to screen right
const S9a = (f: number) => ms(SPRAY, 0, 4.8, pushK(f, 953, 0.0025), { dx: -0.5, lookH: 1.05 });
// 10 confusion: MS in the chewed paddy, dutch tilt, slow push
const S10a = (f: number) => ms(W1, -10, 3.9, pushK(f, 1028, 0.0028), { roll: -0.075, lookH: 1.15 });
// 11 priest at the gate (golden)
const S11a = (f: number) => ms(P, 20, 4.0, pushK(f, 1170, 0.0025, 0.007, 30), { lookH: 1.3 });
// 12 hero bug CU
const S12a = (f: number) => ms(B, 8, 2.1, pushK(f, 1281, 0.0022), { camH: 0.75, lookH: 0.5, fov: 38 });
// 13 aerial sync, then the hungry bug CU
const S13a = (f: number) => zoom([30, 16, -16], [16, 2, 26], 44, pushK(f, 1371, 0.0015));
const S13b = (f: number) => ms(B, -14, 2.0, pushK(f, 1486, 0.0025), { camH: 0.75, lookH: 0.5, fov: 38, roll: 0.05 });
// 14 aerial patchwork hopping, then the buffet stroll
const S14a = (f: number) => zoom([46, 13, -12], [30, 2, 24], 44, pushK(f, 1526, 0.0015));
const S14b = (f: number) => ms(B, 0, 4.6, pushK(f, 1635, 0.0022), { camH: 1.0, lookH: 0.55, dx: 0.75 });
// 15 villagers at the gate, then the golden harvest wide
const S15a = (f: number) => ms(P, 10, 6.2, pushK(f, 1721, 0.0022), { dx: 0.0, dz: -0.6, camH: 1.8, lookH: 1.0, fov: 42 });
const S15b = (f: number) => dolly([9, 3.2, -8], [9.5, 1.0, 6], pushK(f, 1815, 0.002), { fov: 44 });
// 16 priest MS smiling, then crane out over the terraces to the volcano
const S16a = (f: number) => ms(P, 12, 3.6, pushK(f, 1857, 0.0025, 0.006, 30), { roll: 0.03, lookH: 1.15 });
const S16b = (f: number): Shot => { // cut on "terbaik" to a lens over the path, then crane up and back to the volcano
  const s = glide((f - 1946) / 60), a: Shot = { pos: [-6, 5, -14], look: [0, 1.5, 20], fov: 44 }, end: Shot = { pos: [-8, 20, -24], look: [6, 6, 60], fov: 46 };
  return { pos: a.pos.map((v, i) => v + (end.pos[i] - v) * s) as V3, look: a.look.map((v, i) => v + (end.look[i] - v) * s) as V3, fov: 44 + 2 * s, roll: 0 };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 134, cut: true, s: S1b }],
  2: [{ f: 180, s: S2a }],
  3: [{ f: 265, s: S3a }, { f: 361, cut: true, s: S3b }],
  4: [{ f: 414, s: S4a }],
  5: [{ f: 528, s: S5a }, { f: 618, dur: 28, s: S5b }],
  6: [{ f: 682, s: S6a }],
  7: [{ f: 780, s: S7a }],
  8: [{ f: 844, s: S8a }],
  9: [{ f: 953, s: S9a }],
  10: [{ f: 1028, s: S10a }],
  11: [{ f: 1166, s: S11a }],
  12: [{ f: 1281, s: S12a }],
  13: [{ f: 1371, s: S13a }, { f: 1486, cut: true, s: S13b }],
  14: [{ f: 1526, s: S14a }, { f: 1635, cut: true, s: S14b }],
  15: [{ f: 1717, s: S15a }, { f: 1815, cut: true, s: S15b }],
  16: [{ f: 1857, s: S16a }, { f: 1946, cut: true, s: S16b }],
};

const KICKS: [number, number][] = [[136 / FPS, 1], [1243 / FPS, 0.7], [1929 / FPS, 0.6], [1486 / FPS, 0.5]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
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
  { f: 0, cInf: 0 },                                   // hook wide
  { f: 134, cInf: 13, focus: eyesOf(W1) },             // Wayan MS
  { f: 180, cInf: 0 },                                 // aerial
  { f: 265, cInf: 10, focus: eyesOf(PLANT, 1.0) },     // planters
  { f: 361, cInf: 12, focus: eyesOf(P) },              // priest
  { f: 414, cInf: 12, focus: eyesOf(OFFICIAL) },
  { f: 528, cInf: 11, focus: eyesOf(add(TALK, [0.4, 0, 0])) },
  { f: 630, cInf: 7, focus: eyesOf(add(TALK, [-1.6, 0, 0])) },
  { f: 682, cInf: 0 },                                 // aerial patchwork
  { f: 780, cInf: 13, focus: eyesOf(H) },
  { f: 844, cInf: 0 },                                 // swarm wide
  { f: 953, cInf: 10, focus: eyesOf(SPRAY) },
  { f: 1028, cInf: 13, focus: eyesOf(W1) },
  { f: 1170, cInf: 12, focus: eyesOf(P) },
  { f: 1281, cInf: 15, focus: eyesOf(B, 0.5) },
  { f: 1371, cInf: 0 },
  { f: 1486, cInf: 15, focus: eyesOf(B, 0.5) },
  { f: 1526, cInf: 0 },
  { f: 1635, cInf: 13, focus: eyesOf(add(B, [1.2, 0, 0]), 0.6) },
  { f: 1721, cInf: 8, focus: eyesOf(add(P, [1.2, 0, 0])) },
  { f: 1815, cInf: 0 },
  { f: 1857, cInf: 12, focus: eyesOf(P) },
  { f: 1946, dur: 30, cInf: 0 },
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
  { a: 414, b: 528, kit: "plant_bushDetailed", pos: [OFFICIAL[0] + 1.6, 0, OFFICIAL[2] - 1.6], s: 0.9, yaw: 0.4 },
  { a: 1721, b: 1815, kit: "plant_bushDetailed", pos: [PRIEST[0] + 4.3, 0, PRIEST[2] - 4.0], s: 1.1, yaw: 0.2 },
];
