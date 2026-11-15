// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Tudor, Boston townsfolk, Martinique and Calcutta crowds, the Indonesian ice seller, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, townsfolk, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion, fxBoard, fxSparkle } from "./bugs";
import { fxPaper, fxHaha, fxDrops, fxCoins, fxMark, fxCalendar, fxGauge, fxSun, fxMagnify, fxHeat, fxIceJacket, fxCrown, fxConfetti } from "./fx";
import { FPS, SHOTS, V3, clamp01, hh as hh0, PIER, T_LAKE, T_PIER, READER, QUAY, CRATES, MART, CALC, MARKET, DECK_TUDOR, shipPose } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
void hh0;
// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3; fwd?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};


// ---------------- the cast of this short ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const TUDOR: Outfit = { jacket: "#2f5f4a", pants: "#3b3f52", boots: "#2a2420", hat: "tophat", scarf: "#d8402f", skin: "#f2c8a0", buttons: "#e8c45a" };
const MARTI = (v: number): Outfit => ({ jacket: ["#f0c93e", "#3fae8a", "#e2453c"][v % 3], pants: "#f0e6d0", boots: "#5a3b2a", hat: v % 2 ? "cap" : "hair", cap: "#f6efdc", hair: "#1f1a18", skin: ["#7a4a2c", "#8f5f3e", "#6a3f24"][v % 3], dress: v === 1 ? "#c25a7a" : undefined });
const CALCU = (v: number): Outfit => ({ jacket: "#f0ece0", pants: "#f0ece0", boots: "#5a3b2a", hat: v % 3 === 2 ? "hair" : "udeng", hair: "#1f1a18", skin: ["#9a6a48", "#8a5a3c", "#a8714a"][v % 3], moustache: v % 2 ? "#2a201a" : undefined, dress: v % 4 === 1 ? ["#d8402f", "#f0a03e", "#3f6fb5"][v % 3] : undefined });
const TUKANG: Outfit = { jacket: "#f0ece0", pants: "#3b3f52", boots: "#5a3b2a", hat: "peci", dress: "#3f6f8f", skin: "#a8714a", moustache: "#2a201a" };
const BUYER: Outfit = { jacket: "#d9a441", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#1f1a18", skin: "#b9805a", build: "kid" };

const FRONT = { side: false, mirror: false };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], FRONT, fo, {}, scale));
  blob(out, p[0], p[1], p[2], scale);
};
const off = (p: V3, dx: number, dy = 0, dz = 0): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];
/** a camera-facing effect card at `p` + screen-right * sr + up * su */
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: p[0] + cam.right.x * sr, y: p[1] + su, z: p[2] + cam.right.z * sr, w, h, soft, rot });
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
const loop = (t: number, rate: number, n = 24) => q((t * rate) % 1, n);
const bob = (t: number, i: number) => Math.max(0, Math.sin(t * 9 + i * 1.3)) * 0.08;

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f);
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      put(out, cam, t, 1, TUDOR, "tudor", DECK_TUDOR(f), { expr: f < 91 ? "smile" : "grin", wave: f >= 100 ? 0.5 + 0.5 * Math.sin(t * 7) : undefined });
      break;
    }
    case 2: {
      card(out, cam, "boardB", 640, 300, (p) => fxBoard(p, "BOSTON 1806"), [-3, 0, -1.5], 0, 2.4, 2.2, 1.03);
      card(out, cam, "boardPost", 60, 400, (p) => p.poly([[18, 0], [42, 0], [42, 400], [18, 400]], "#8a5a36", 6), [-3, 0, -1.5], 0, 1.0, 0.1, 2.0);
      for (let i = 0; i < 4; i++) put(out, cam, t, 20 + i, townsfolk(i), `tf${i}`, [-6 + i * 3.2, 0, -7 - (i % 2) * 1.5], { expr: "smile", facing: i % 2 ? 1 : -1 });
      break;
    }
    case 3: {
      if (f < 338) {
        const k = Math.sin(t * 9);
        put(out, cam, t, 1, TUDOR, "tudor", T_LAKE, { expr: "grin", prop: "saw", tilt: 3 * k, facing: 1 });
        out.fx.push({ key: `chips${q((t * 2) % 1, 12)}`, cw: 300, ch: 300, draw: (p) => fxSparkle(p, q((t * 2) % 1, 12)), x: T_LAKE[0] + 0.9, y: 0.3, z: T_LAKE[2] + 0.3, w: 0.5, h: 0.5 });
      } else {
        put(out, cam, t, 1, TUDOR, "tudor", T_PIER, { expr: "grin", prop: "iceblock" });
        put(out, cam, t, 21, townsfolk(2), "tf2", off(T_PIER, -0.8, 0, -2.4), { expr: "stern", prop: "iceblock" });
      }
      break;
    }
    case 4: {
      put(out, cam, t, 22, townsfolk(3), "tf3r", READER, { expr: f < 470 ? "neutral" : "shock", prop: "lontar" });
      card(out, cam, "paper", 700, 900, fxPaper, off(READER, 0, 0, 0.35), 0.0, 0.8, 0.82, 1.05, false, -0.04);
      break;
    }
    case 5: {
      put(out, cam, t, 1, TUDOR, "tudor", QUAY, { expr: "smile_closed", prop: "iceblock" });
      for (let i = 0; i < 4; i++) {
        const p0 = off(QUAY, -1.1 - i * 0.65, 0, -0.6 - (i % 2) * 0.9);
        put(out, cam, t, 23 + i, townsfolk(i + 1), `tf${i + 1}`, p0, { expr: "laugh", prop: i % 2 ? "point" : null, facing: 1 }, 1, bob(t, i));
        if (i % 2 === 0) card(out, cam, `haha${loop(t, 1.5, 12)}`, 400, 200, (p) => fxHaha(p, loop(t, 1.5, 12)), p0, 0.1, 2.45, 0.7, 0.35);
      }
      break;
    }
    case 6: {
      for (let i = 0; i < 3; i++) put(out, cam, t, 30 + i, MARTI(i), `m${i}`, off(MART, -1.3 + i * 0.95, 0, 0.6 + (i % 2) * 0.5), { expr: i === 1 ? "nervous" : "neutral", prop: i === 1 ? "iceblock" : null, headTilt: i * 3 });
      if (f >= 694) card(out, cam, "question", 300, 400, fxQuestion, off(MART, -0.35, 0, 1.1), 0, 2.4, 0.3, 0.4, false, -0.12);
      card(out, cam, `drops${loop(t, 1.4, 12)}`, 200, 300, (p) => fxDrops(p, loop(t, 1.4, 12)), off(MART, -0.1, 0, 1.6), 0, 0.5, 0.35, 0.5);
      break;
    }
    case 7: {
      const P = off(MART, 0.9, 0, -2.4);
      put(out, cam, t, 1, TUDOR, "tudor", P, { expr: "pained", headTilt: -5 });
      const u = q(clamp01((f - 740) / 25), 25);
      card(out, cam, `coins${u}`, 500, 500, (p) => fxCoins(p, u), P, 0.4, 1.6, 0.5, 0.5);
      break;
    }
    case 8: {
      put(out, cam, t, 1, TUDOR, "tudor", QUAY, { expr: "stern", prop: f >= 775 ? "fist" : null });
      if (f >= 778) card(out, cam, `spark${loop(t, 1.2)}`, 400, 400, (p) => fxSparkle(p, loop(t, 1.2)), QUAY, 0.75, 2.0, 0.6, 0.6);
      break;
    }
    case 9: {
      put(out, cam, t, 1, TUDOR, "tudor", off(CRATES[1], 0.68, 0, -1.7), { expr: f < 978 ? "neutral" : "grin", look: f < 900 ? -1 : f < 960 ? 0 : 1 });
      [[904, false], [943, false], [978, true]].forEach(([f0, ok], i) => {
        if (f >= (f0 as number)) { const k = pop(f, f0 as number, 5); card(out, cam, `mark${ok ? 1 : 0}`, 300, 300, (p) => fxMark(p, ok as boolean), CRATES[i], 0, 1.4, 0.5 * k, 0.5 * k); }
      });
      break;
    }
    case 10: {
      const sp = shipPose(10, f).pos, u = q(clamp01((f - 1100) / 60), 30);
      if (f >= 1100) card(out, cam, `cal${u}`, 500, 620, (p) => fxCalendar(p, u), [sp[0] + 5, sp[1], sp[2] - 11], 0.6, 6.4, 2.2, 2.73);
      break;
    }
    case 11: {
      put(out, cam, t, 1, TUDOR, "tudor", off(CALC, 1.3, 0, 0.6), { expr: "grin", wave: 0.5 + 0.5 * Math.sin(t * 6) });
      for (let i = 0; i < 7; i++) put(out, cam, t, 40 + i, CALCU(i), `c${i}`, off(CALC, -2.4 + i * 0.85, 0, -1.4 - (i % 2) * 0.9), { expr: i % 2 ? "laugh" : "grin", wave: i % 3 === 0 ? 0.5 + 0.5 * Math.sin(t * 7 + i) : undefined }, 1, bob(t, i));
      if (f >= 1210) { const k = pop(f, 1210, 8); card(out, cam, `gauge${q(clamp01((f - 1210) / 18), 18)}`, 760, 340, (p) => fxGauge(p, clamp01((f - 1210) / 18)), off(CALC, 1.2, 0, 0), 0, 3.1, 2.2 * k, 0.98 * k); }
      break;
    }
    case 12: {
      put(out, cam, t, 41, CALCU(1), "c1", CALC, { expr: "nervous", prop: "scratch", headTilt: 6 });
      if (f >= 1262) card(out, cam, "question", 300, 400, fxQuestion, CALC, 0.35, 2.3 + 0.03 * Math.sin(t * 5), 0.3, 0.4, false, -0.15);
      card(out, cam, `sun${loop(t, 0.5)}`, 420, 420, (p) => fxSun(p, loop(t, 0.5)), CALC, -0.35, 2.45, 0.5, 0.5);
      break;
    }
    case 13: {
      const u = q(clamp01((f - 1360) / 70), 35);
      card(out, cam, `mag${u}`, 900, 1000, (p) => fxMagnify(p, u), CRATES[2], 0.05, 1.45, 0.6, 0.67);
      break;
    }
    case 14: {
      const u = loop(t, 0.6, 30);
      card(out, cam, `heat${u}`, 900, 760, (p) => fxHeat(p, u), CRATES[2], 0, 1.85, 1.45, 1.22);
      break;
    }
    case 15: {
      const P = off(MART, 0, 0, -0.8), u = loop(t, 0.4, 24);
      card(out, cam, `icej${u}`, 600, 760, (p) => fxIceJacket(p, u), P, 0, 0.75, 1.1, 1.39);
      card(out, cam, `sun${loop(t, 0.5)}`, 420, 420, (p) => fxSun(p, loop(t, 0.5)), P, 0.55, 2.2, 0.55, 0.55);
      break;
    }
    case 16: {
      put(out, cam, t, 1, TUDOR, "tudor", QUAY, { expr: "grin", wave: 0.5 + 0.5 * Math.sin(t * 6) });
      if (f >= 1738) { const k = pop(f, 1738, 6); card(out, cam, "crown", 320, 240, fxCrown, QUAY, 0.02, 2.55 + 0.03 * Math.sin(t * 4), 0.55 * k, 0.41 * k); }
      for (let i = 0; i < 5; i++) put(out, cam, t, 23 + i, townsfolk(i + 1), `tf${i + 1}`, off(QUAY, -1.0 - i * 0.65, 0, -0.5 - (i % 2) * 0.9), { expr: i % 2 ? "laugh" : "grin", prop: "clap" }, 1, bob(t, i));
      if (f >= 1740) card(out, cam, `conf${loop(t, 0.7, 30)}`, 600, 600, (p) => fxConfetti(p, loop(t, 0.7, 30)), QUAY, -1.6, 2.2, 3.4, 3.4);
      break;
    }
    case 17: {
      put(out, cam, t, 50, TUKANG, "tukang", off(MARKET, -0.25, 0, 0.7), { expr: "smile_closed", prop: "shovel", facing: 1 });
      put(out, cam, t, 51, BUYER, "buyer", off(MARKET, 2.9, 0, 1.2), { expr: "grin", facing: -1 });
      break;
    }
  }
  return out;
};
