// Timeline of "Kapal Perang yang Kalah oleh Angin": shots timed to projects/kapal_vasa/words.json. Our cartoon
// Stockholm harbour of 1628: the stone quay along x = 0 (land toward -x, ground at QY), the town behind it, the sea
// toward +x, and the warship Vasa (vasa.ts) moored at MOOR with her bow toward -z. Camera grammar of the bridge short
// (slow push-ins, smootherstep glides, cuts, kicks).
export const FPS = 30;
export const TOTAL = 1959;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------- places ----------------
export const SEA = 0;
export const QY = 1.4;                                  // quay ground height
export const groundY = (x: number, _z: number) => (x < 0 ? QY : -6);
export const quay = (x: number, z: number): V3 => [x, QY, z];
export const MOOR: V3 = [9, 0, 0];                      // Vasa at the quay (hull side toward the quay at x ~ 3.8)
export const SINK: V3 = [22, 0, -46];                   // where she goes down, in full view of the quay
export const KID = quay(-2.2, -5);                      // the boy in the green coat and red cap (our witness)
export const KID12 = quay(-1.6, 5);
export const OFFI = quay(-3.2, 13);                     // the two nervous officials
export const CANOE: V3 = [6, 0, 38];                    // the little boat of the analogy (long axis along x)
export const DECKY = 6.3;                               // Vasa's main deck, ship-local

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number; under?: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 147, light: "day" },
  { id: 2, a: 147, b: 269, light: "day", far: 1.6 },
  { id: 3, a: 269, b: 374, light: "day" },
  { id: 4, a: 374, b: 482, light: "day" },
  { id: 5, a: 482, b: 591, light: "day", sunAz: 120 },
  { id: 6, a: 591, b: 707, light: "day" },
  { id: 7, a: 707, b: 799, light: "day" },
  { id: 8, a: 799, b: 930, light: "day" },
  { id: 9, a: 930, b: 1016, light: "day" },
  { id: 10, a: 1016, b: 1078, light: "day" },
  { id: 11, a: 1078, b: 1226, light: "day" },
  { id: 12, a: 1226, b: 1328, light: "day" },
  { id: 13, a: 1328, b: 1407, light: "day" },
  { id: 14, a: 1407, b: 1508, light: "day" },
  { id: 15, a: 1508, b: 1628, light: "day" },
  { id: 16, a: 1628, b: 1716, light: "day" },
  { id: 17, a: 1716, b: 1817, light: "day" },
  { id: 18, a: 1817, b: TOTAL, light: "golden", far: 1.4 },
];
export const XFADE: Record<number, number> = { 2: 8, 9: 8, 13: 8, 14: 8, 16: 8, 17: 8, 18: 8 };
export const FLASH_AT = 147;
export const SPY = { a: -10, b: -10 };

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story physics: the ship ----------------
/** pos = ship-local origin (waterline centre), yaw (0 = bow toward -z), roll (negative = heels over to +x),
 *  sails 0 furled .. 1 set, billow 0..1, guns 0 in .. 1 run out */
export type ShipState = { pos: V3; yaw: number; roll: number; sails: number; billow: number; guns: number };
const DEP = 930, STOP = 1176;
/** departure: from the quay toward SINK */
const sailXZ = (f: number): { x: number; z: number; yaw: number } => {
  const u = clamp01((f - DEP) / (STOP - DEP)), k = u * u * (3 - 2 * u) * 0.6 + u * 0.4;
  return { x: lerp(MOOR[0], SINK[0], k), z: lerp(MOOR[2], SINK[2], k), yaw: -0.32 * k };
};
/** depth of the hull while she goes down (f 1165 .. 1330) */
export const sinkY = (f: number) => -30 * smooth((f - 1165) / 165);
const moored = (guns = 1, roll = 0): ShipState => ({ pos: [...MOOR], yaw: 0, roll, sails: 0, billow: 0, guns });
/** the heel during the gust: 0 .. ~33 degrees, then easing back a little as she settles */
const heelAt = (f: number) => -0.04 - 0.2 * smooth((f - 1036) / 42) - 0.36 * smooth((f - 1082) / 40) + 0.22 * smooth((f - 1200) / 120);
export const shipAt = (id: number, f: number): ShipState => {
  switch (id) {
    case 1: { // the hook: the sinking itself, seen early
      const g = 1110 + f * 0.62, p = sailXZ(g);
      return { pos: [p.x, sinkY(g), p.z], yaw: p.yaw, roll: heelAt(g), sails: 1, billow: 0.6, guns: 1 };
    }
    case 2: case 3: return moored(0);
    case 4: return moored(smooth((f - 456) / 14));
    case 7: {
      const A = 0.2 * smooth((f - 712) / 18) * (1 - smooth((f - 782) / 22));
      return moored(1, -A * Math.sin((f - 707) * 0.3));
    }
    case 9: case 10: case 11: case 12: case 18: {
      const g = id === 18 ? 1330 : f, p = sailXZ(g);
      const billow = id === 9 ? 0.35 : 0.35 + 0.65 * smooth((g - 1030) / 24);
      return { pos: [p.x, sinkY(g), p.z], yaw: p.yaw, roll: id === 9 ? -0.03 : heelAt(g), sails: 1, billow, guns: 1 };
    }
    default: return moored(1);
  }
};
/** ship-local point -> world (same transform as world.ts: translate, yaw about y, roll about the ship's long axis) */
export const shipPt = (s: ShipState, l: V3): V3 => {
  const cr = Math.cos(s.roll), sr = Math.sin(s.roll);
  const x1 = l[0] * cr - l[1] * sr, y1 = l[0] * sr + l[1] * cr, z1 = l[2];
  const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
  return [s.pos[0] + x1 * cy + z1 * sy, s.pos[1] + y1, s.pos[2] - x1 * sy + z1 * cy];
};

// ---------------- story physics: the little boat ----------------
/** roll of the canoe (rad, about its long axis) and whether the man stands / has fallen */
export const canoeRoll = (f: number) => {
  if (f < 1508) return 0.03 * Math.sin(f * 0.12);
  if (f < 1600) { const A = 0.05 + 0.2 * smooth((f - 1545) / 50); return A * Math.sin((f - 1508) * 0.34); }
  return -0.2 - 2.4 * smooth((f - 1598) / 16); // over she goes
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
/** framing on someone at `p` (feet): lens `dist` m away at azimuth `az` (0 = lens on -z looking +z; -90 = lens on +x
 *  looking -x; 90 = lens on -x looking +x), lens at feet + camH, aimed at feet + lookH. */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const shipCam = (id: number, f: number, lp: V3, ll: V3, k: number, fov = 40, roll = 0): Shot => {
  const s = shipAt(id, f), base: ShipState = { ...s, roll: 0, pos: [s.pos[0], 0, s.pos[2]] };
  return dolly(shipPt(base, lp), shipPt(base, ll), k, { fov, roll });
};
const S1a = (f: number) => dolly([70, 5, -104], [22, 11, -46], pushK(f, 0, 0.0011, 0.0025, 30), { fov: 42 });
const S2a = (f: number) => dolly([78, 30, -62], [-4, 7, 6], pushK(f, 147, 0.001), { fov: 42 });
const S3a = (f: number) => ms(KID, 62, 3.4, pushK(f, 269, 0.002), { camH: 0.7, lookH: 1.15, fov: 50 });
const S4a = (f: number) => dolly([32, 2.6, -9], [13.5, 3.4, 1], pushK(f, 374, 0.002, 0.005, 30), { fov: 40 });
const S5a = (f: number) => dolly([16, 4.5, 48], [9, 8.5, 19], pushK(f, 482, 0.0016), { fov: 40 });
const S5b = (f: number) => dolly([14.5, 10, 45], [9, 11, 19], pushK(f, 520, 0.0018), { fov: 40 });
const S6a = (f: number) => dolly([12.5, 16, -33], [9, 6.6, -3], pushK(f, 591, 0.0018), { fov: 40 });
const S7a = (f: number) => dolly([14, 12, -98], [9, 15, 0], pushK(f, 707, 0.0016), { fov: 40 });
const S7b = (f: number) => dolly([14, 12, -26], [8.5, 7.8, -8], pushK(f, 770, 0.002, 0.006, 25), { fov: 40 });
const S8a = (f: number) => ms(OFFI, 70, 5.0, pushK(f, 799, 0.0014, 0.003, 30), { camH: 1.45, lookH: 1.9, fov: 44, dz: -0.55 });
const S9a = (f: number) => dolly([-16, QY + 3.4, 30], [12, 7, -10], pushK(f, 930, 0.0012), { fov: 42 });
const S10a = (f: number) => dolly([42, 5, 46], [16, 14, -24], pushK(f, 1016, 0.0018), { fov: 42 });
const S11a = (f: number) => shipCam(11, f, [15, 10, -9], [5, 1.2, 0], pushK(f, 1078, 0.0022), 42);
const S11b = (f: number) => dolly([-14, QY + 3.8, 22], [-2.3, 4.2, -0.1], pushK(f, 1150, 0.0018, 0.004, 30), { fov: 38 });
const S12a = (f: number) => ms(KID12, 154, 4.6, pushK(f, 1226, 0.0022, 0.005, 30), { lookH: 1.0, camH: 0.95, roll: 0.075, fov: 40, dx: -0.25 });
const S13a = (f: number) => dolly([9, 7, -82], [9, 10, 0], pushK(f, 1328, 0.0018), { fov: 36 });
const S14a = (f: number) => dolly([CANOE[0] + 6.2, 1.5, CANOE[2] + 3.2], [CANOE[0], 1.05, CANOE[2]], pushK(f, 1407, 0.0022), { fov: 40 });
const S15a = (f: number) => dolly([CANOE[0] + 6.6, 1.5, CANOE[2] + 2.6], [CANOE[0], 1.35, CANOE[2]], pushK(f, 1508, 0.0024, 0.006, 25), { fov: 40 });
const S16a = (f: number) => dolly([7.2, 2.0, 45.5], [6.6, 3.4, 28], pushK(f, 1628, 0.0016), { fov: 54 });
const S17a = (f: number) => dolly([84, 9, 40], [9, 13, 0], pushK(f, 1716, 0.0016), { fov: 40 });
const S18a = (f: number) => dolly([-9, QY + 5, 8], [6.3, 4.2, -14.3], pushK(f, 1817, 0.0014), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 143, s: S2a }], 3: [{ f: 269, s: S3a }], 4: [{ f: 374, s: S4a }],
  5: [{ f: 482, s: S5a }, { f: 516, dur: 36, s: S5b }], 6: [{ f: 591, s: S6a }], 7: [{ f: 707, s: S7a }, { f: 768, cut: true, s: S7b }],
  8: [{ f: 799, s: S8a }], 9: [{ f: 926, s: S9a }], 10: [{ f: 1016, s: S10a }],
  11: [{ f: 1078, s: S11a }, { f: 1150, cut: true, s: S11b }], 12: [{ f: 1226, s: S12a }], 13: [{ f: 1324, s: S13a }],
  14: [{ f: 1403, s: S14a }], 15: [{ f: 1508, s: S15a }], 16: [{ f: 1624, s: S16a }], 17: [{ f: 1712, s: S17a }], 18: [{ f: 1813, s: S18a }],
};

const KICKS: [number, number][] = [[121, 0.5], [462, 0.6], [730, 0.8], [777, 0.5], [976, 0.5], [1117, 0.8], [1176, 1], [1606, 0.8]];
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
  { f: 147, cInf: 0 },
  { f: 269, cInf: 7, focus: eyesOf(KID, 1.2) },
  { f: 374, cInf: 6, focus: () => [14, 3.2, -2] },
  { f: 482, cInf: 0 },
  { f: 591, cInf: 3, focus: () => [9, 7.4, -4] },
  { f: 707, cInf: 0 },
  { f: 768, cInf: 7, focus: () => [7.5, 7.8, -9] },
  { f: 799, cInf: 10, focus: eyesOf(OFFI) },
  { f: 930, cInf: 6, focus: () => [-6, QY + 1.5, 2] },
  { f: 1016, cInf: 0 },
  { f: 1078, cInf: 6, focus: (f) => shipPt(shipAt(11, f), [5, 1.6, 0]) },
  { f: 1150, cInf: 5, focus: () => [-4, QY + 1.5, 6] },
  { f: 1226, cInf: 12, focus: eyesOf(KID12, 1.2) },
  { f: 1328, cInf: 0 },
  { f: 1407, cInf: 9, focus: () => [CANOE[0], 1.1, CANOE[2]] },
  { f: 1508, cInf: 9, focus: () => [CANOE[0], 1.6, CANOE[2]] },
  { f: 1628, cInf: 7, focus: () => [CANOE[0], 1.8, CANOE[2]] },
  { f: 1716, cInf: 0 },
  { f: 1817, cInf: 4, focus: () => [-3, QY + 1.4, -3] },
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
