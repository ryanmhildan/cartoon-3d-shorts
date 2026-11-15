// Timeline of "Pasir Hisap Nggak Bisa Menenggelamkanmu": shots timed to projects/pasir_hisap/words.json, the estuary
// mudflat (gentle slope to the sea at +x, a river channel at +z, the quicksand patch), how deep "Kamu" is sunk per
// frame, the tide, and the camera grammar of the bridge short.
export const FPS = 30;
export const TOTAL = 1849;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- the land ----------------
/** mudflat: rises gently inland (-x), runs into the sea (+x); a river channel along z = 26 */
export const groundY = (x: number, z: number) => {
  const flat = x < -22 ? 0.66 + 0.04 * (-22 - x) : 0.4 - 0.012 * x;
  const ch = x > -70 ? 1.6 * Math.exp(-(((z - 26) / 6) ** 2)) : 0;
  return Math.min(flat, 3.5) - ch;
};
export const at = (x: number, z: number, dy = 0): V3 => [x, groundY(x, z) + dy, z];
export const SEA0 = 0;
export const seaLevel = (id: number, f: number) => (id === 14 ? 0.27 * smooth((f - 1540) / 130) : SEA0);

export const QS: V3 = at(6, 0);           // the quicksand patch (centre)
export const QS_R = 2.4;
export const FRIEND: V3 = at(3.3, -2.0);
export const EXPLORER: V3 = at(-12, 16);  // the old-film spoof spot
export const FREE: V3 = at(3.4, 0.9);     // where Kamu stands after getting out
/** how deep Kamu is sunk (m below the surface) */
export const sinkAt = (id: number, f: number) => {
  switch (id) {
    case 1: return 0.86 + 0.05 * Math.sin(f * 0.5);
    case 2: return 0;
    case 3: return 0.45 * easeOut((f - 310) / 35);
    case 5: case 6: return 0.45;
    case 7: return 0.45 + 0.5 * smooth((f - 740) / 70);
    case 13: return 0.95 - 0.35 * smooth((f - 1440) / 70);
    case 14: return 0.6;
    case 16: return 0.5;
    default: return 0.95;
  }
};
/** the film explorer sinks all the way (shot 4) */
export const explorerSink = (f: number) => (f < 475 ? 1.6 * smooth((f - 385) / 90) : 1.6 + 0.8 * smooth((f - 475) / 10));
/** Kamu's spot: walking in along the flat in shot 2, then in the patch */
export const kamuAt = (id: number, f: number): V3 => {
  if (id === 2) { const x = -6 + 3.4 * ((f - 157) / FPS) * 0.55; return at(Math.min(x, QS[0] - 1.2), 0.3); }
  if (id === 15) return FREE;
  return QS;
};

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; far?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 157, light: "day" },
  { id: 2, a: 157, b: 281, light: "day", far: 1.5 },
  { id: 3, a: 281, b: 375, light: "day" },
  { id: 4, a: 375, b: 506, light: "day" },
  { id: 5, a: 506, b: 611, light: "day" },
  { id: 6, a: 611, b: 729, light: "day" },
  { id: 7, a: 729, b: 833, light: "day" },
  { id: 8, a: 833, b: 893, light: "day" },
  { id: 9, a: 893, b: 1022, light: "day" },
  { id: 10, a: 1022, b: 1126, light: "day" },
  { id: 11, a: 1126, b: 1248, light: "day" },
  { id: 12, a: 1248, b: 1365, light: "day" },
  { id: 13, a: 1365, b: 1517, light: "day" },
  { id: 14, a: 1517, b: 1680, light: "day", far: 1.5 },
  { id: 15, a: 1680, b: 1755, light: "day" },
  { id: 16, a: 1755, b: TOTAL, light: "day" },
];
export const XFADE: Record<number, number> = { 2: 8, 4: 6, 5: 6, 9: 6, 14: 8, 15: 8 };
export const FLASH_AT = 157;
export const FILM = { a: 375, b: 506 };

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
/** framing on a spot `p` (feet / surface): az 180 = lens on +z looking -z (screen-right = +x = the sea side) */
const ms = (p: V3, az: number, dist: number, k: number, o: { camH?: number; lookH?: number; fov?: number; roll?: number; dx?: number; dz?: number } = {}): Shot => {
  const a = (az * Math.PI) / 180, look: V3 = [p[0] + (o.dx ?? 0), p[1] + (o.lookH ?? 1.0), p[2] + (o.dz ?? 0)];
  const pos: V3 = [look[0] - Math.sin(a) * dist, p[1] + (o.camH ?? 1.35), look[2] - Math.cos(a) * dist];
  return dolly(pos, look, k, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
};
const Q = QS;
const S1a = (f: number) => ms(Q, 170, 3.4, pushK(f, 0, 0.0025, 0.006, 30), { lookH: 0.55, camH: 1.0, roll: 0.05 });
const S2a = (f: number): Shot => { const k = kamuAt(2, f); return { pos: add(k, [-4.2, 2.2, 8.5]), look: add(k, [0.4, 1.0, -0.6]), fov: 42 }; };
const S3a = (f: number) => ms(Q, 195, 3.4, pushK(f, 281, 0.003, 0.007, 25), { lookH: 0.65, camH: 1.25, roll: -0.04 });
const S4a = (f: number) => ms(EXPLORER, 180, 3.4, pushK(f, 375, 0.0016), { lookH: 0.6, camH: 1.25 });
const S5a = (f: number) => dolly([4.9, FRIEND[1] + 2.1, 10.2], [4.9, FRIEND[1] + 1.2, -1.2], pushK(f, 506, 0.003, 0.006, 25), { fov: 42 });
const S6a = (f: number) => ms(Q, 182, 3.3, pushK(f, 611, 0.0025), { lookH: 0.8, camH: 1.1 });
const S7a = (f: number) => ms(Q, 168, 3.6, pushK(f, 729, 0.0025), { lookH: 0.55, camH: 0.9 });
const S8a = (f: number) => ms(Q, 186, 2.3, pushK(f, 833, 0.003), { lookH: 0.65, camH: 0.75, roll: -0.075, fov: 38 });
const S9a = (f: number) => ms(Q, 175, 4.8, pushK(f, 893, 0.0018), { lookH: 1.1, camH: 1.3, dx: 0.35 });
const S10a = (f: number) => ms(Q, 185, 4.4, pushK(f, 1022, 0.0018), { lookH: 0.9, camH: 1.1, dx: 0.35 });
const S11a = (f: number) => ms(Q, 172, 4.2, pushK(f, 1126, 0.0018), { lookH: 0.9, camH: 1.2, dx: -0.3 });
const S12a = (f: number) => ms(Q, 190, 4.4, pushK(f, 1248, 0.0018), { lookH: 1.0, camH: 1.2, dx: 0.35 });
const S13a = (f: number) => ms(add(Q, [-0.7, 0, -0.6]), 178, 6.6, pushK(f, 1365, 0.0018), { lookH: 0.8, camH: 1.3 });
const S14a = (f: number) => dolly(add(Q, [-3.8, 2.0, 1.4]), add(Q, [6, -0.6, -2.4]), pushK(f, 1517, 0.0004), { fov: 46 });
const S15a = (f: number) => ms(FREE, 180, 4.4, pushK(f, 1680, 0.0025), { lookH: 1.0, dx: 0.45 });
const S16a = (f: number) => ms(Q, 178, 3.2, pushK(f, 1755, 0.0022), { lookH: 0.75, camH: 1.0 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 153, s: S2a }], 3: [{ f: 281, s: S3a }], 4: [{ f: 372, s: S4a }], 5: [{ f: 503, s: S5a }],
  6: [{ f: 611, s: S6a }], 7: [{ f: 729, s: S7a }], 8: [{ f: 833, s: S8a }], 9: [{ f: 890, s: S9a }], 10: [{ f: 1022, s: S10a }],
  11: [{ f: 1126, s: S11a }], 12: [{ f: 1248, s: S12a }], 13: [{ f: 1365, s: S13a }], 14: [{ f: 1513, s: S14a }],
  15: [{ f: 1676, s: S15a }], 16: [{ f: 1755, s: S16a }],
};

const KICKS: [number, number][] = [[23, 0.6], [323, 0.9], [535, 0.5], [813, 0.8], [1343, 0.5]];
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
const near = (p: V3, dy: number) => (): V3 => [p[0], p[1] + dy, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 12, focus: near(Q, 0.8) },
  { f: 157, cInf: 4, focus: (f) => add(kamuAt(2, f), [0, 1.5, 0]) },
  { f: 281, cInf: 12, focus: near(Q, 1.1) },
  { f: 375, cInf: 8, focus: near(EXPLORER, 0.6) },
  { f: 506, cInf: 12, focus: near(FRIEND, 1.6) },
  { f: 611, cInf: 12, focus: near(Q, 1.1) },
  { f: 833, cInf: 15, focus: near(Q, 0.7) },
  { f: 893, cInf: 10, focus: near(Q, 1.0) },
  { f: 1365, cInf: 9, focus: near(Q, 0.9) },
  { f: 1517, cInf: 0 },
  { f: 1680, cInf: 12, focus: near(FREE, 1.5) },
  { f: 1755, cInf: 12, focus: near(Q, 0.9) },
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
