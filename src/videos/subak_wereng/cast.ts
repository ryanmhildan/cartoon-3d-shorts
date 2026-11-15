// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs), plus the hama: small flying bug cards and the hero bug card. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxBug, heroBug, BugOpts, fxQuestion, fxSparkle, fxSpray, fxBoard, fxGrowl } from "./bugs";
import { FPS, SHOTS, V3, clamp01, smooth, hh as hh0, rowY, rowZ0, swarmX, WAYAN1, PLANT, PRIEST, OFFICIAL, TALK, HARVEST, SPRAY, BUG, DIKE_Y, DIKE_Z } from "./story";
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
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

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
const BARE = "#a8714a";
const WAYAN: Outfit = { jacket: "#2f8f8a", pants: "#5a4632", boots: BARE, hat: "caping", band: "#d23c3c", skin: "#c99067" };
const PRIEST_O: Outfit = { jacket: "#f4f0e4", pants: "#f4f0e4", boots: BARE, hat: "udeng", dress: "#ece6d4", skin: "#b9805a", moustache: "#3a2a20", build: "stout" };
const OFF1: Outfit = { jacket: "#c8b27a", pants: "#3b3f52", boots: "#2a2420", hat: "hair", hair: "#22201f", glasses: true, skin: "#e0b48a" };
const OFF2: Outfit = { jacket: "#c8b27a", pants: "#3b3f52", boots: "#2a2420", hat: "cap", cap: "#2f4f7a", moustache: "#2a201a", skin: "#d6a27a", build: "stout" };
const FARM_COATS = ["#6f8f4a", "#b5653f", "#3f6fb5", "#8c3b4a", "#d9a441", "#5d7a6a"];
const FARM_SKIN = ["#c99067", "#b9805a", "#d6a27a"];
const farmer = (v: number): Outfit => v % 3 === 2
  ? { jacket: FARM_COATS[v % 6], pants: "#4a3a2c", boots: BARE, hat: "hair", hair: "#1f1a18", dress: ["#c25a3a", "#3f6f8f", "#7a5a9a"][v % 3], skin: FARM_SKIN[v % 3] }
  : { jacket: FARM_COATS[v % 6], pants: "#4a3a2c", boots: BARE, hat: "caping", skin: FARM_SKIN[v % 3] };

const FRONT = { side: false, mirror: false };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number };
/** one standing character in the front view, with blinks and a contact shadow */
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, at: V3, opt: Opt, scale = 1) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, at[0], at[1], at[2], FRONT, fo, {}, scale));
  blob(out, at[0], at[1], at[2], scale);
};
const off = (p: V3, dx: number, dy = 0, dz = 0): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];

// ---------------- bugs ----------------
type BugMood = "grin" | "dazed" | "sad";
const flapOf = (t: number, i: number) => q(0.5 + 0.5 * Math.sin(t * 38 + i * 1.7), 4);
const bugFx = (out: Stage, t: number, i: number, x: number, y: number, z: number, size: number, mood: BugMood = "grin", mirror = false) => {
  const fl = flapOf(t, i);
  out.fx.push({ key: `bug|${fl}|${mood}|${mirror ? 1 : 0}`, cw: 300, ch: 300, draw: (p) => { if (mirror) { p.g.translate(300, 0); p.g.scale(-1, 1); } fxBug(p, fl, mood); },
    x, y, z, w: size, h: size, rot: 0.15 * Math.sin(t * 3 + i) });
};
/** a swarm: n bugs in a loose cloud around a centre that moves; each bug orbits and hops */
const swarm = (out: Stage, t: number, n: number, c: V3, spread: V3, size: number, mood: BugMood = "grin", seed = 0, dir = 1) => {
  for (let i = 0; i < n; i++) {
    const k = i + seed * 100, a = t * (1.2 + hh(k, 1)) + hh(k, 2) * 6.28;
    const x = c[0] + (hh(k, 3) - 0.5) * 2 * spread[0] + 0.6 * Math.cos(a), z = c[2] + (hh(k, 4) - 0.5) * 2 * spread[2] + 0.6 * Math.sin(a);
    const y = c[1] + hh(k, 5) * spread[1] + 0.35 * Math.abs(Math.sin(t * 2.4 + k));
    bugFx(out, t, k, x, y, z, size * (0.8 + 0.4 * hh(k, 6)), mood, dir < 0);
  }
};
const BUGGY: Record<string, (p: Pen) => void> = {};
/** the hero bug as a lit character card */
const bugPlace = (out: Stage, cam: CamInfo, t: number, at: V3, o: BugOpts, scale = 0.5, mirror = false) => {
  const d = cam.pos.distanceTo(tmp.set(at[0], at[1] + 0.5, at[2])) / scale;
  const [w, h, k] = tier(d);
  const light = light2D(cam, mirror), oo = { ...o, light, blink: lidAt(t, 501) };
  const key = `bug|${fkey(oo)}`;
  BUGGY[key] = (p) => heroBug(p, oo);
  out.places.push({ key, x: at[0], y: at[1], z: at[2], scale, mirror, draw: BUGGY[key], size: [w, h, k] });
  blob(out, at[0], at[1], at[2], scale);
};
const once = (out: Stage, t: number, t0: number, dur: number, key: string, cw: number, ch: number, draw: (p: Pen, u: number) => void, at: V3, w: number, h: number) => {
  if (t < t0 || t >= t0 + dur) return;
  const u = q((t - t0) / dur, 30);
  out.fx.push({ key: `${key}${u}`, cw, ch, draw: (p) => draw(p, u), x: at[0], y: at[1], z: at[2], w, h });
};
const sparkles = (out: Stage, t: number, at: V3, s = 0.9) => { const u = q((t * 0.8) % 1, 30); out.fx.push({ key: `spark${u}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, u), x: at[0], y: at[1], z: at[2], w: s, h: s }); };

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f);
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      put(out, cam, t, 1, WAYAN, "wayan", WAYAN1, { expr: f < 120 ? "nervous" : "shock", prop: "stalk", facing: f < 134 ? 1 : 0 });
      swarm(out, t, 46, [WAYAN1[0] + 4, 0.8, 12], [10, 3, 8], 0.55, "grin", 1);
      if (f >= 134) swarm(out, t, 10, [WAYAN1[0] - 0.2, 1.0, WAYAN1[2] + 1.6], [1.6, 1.4, 0.9], 0.26, "grin", 2);
      break;
    }
    case 2: {
      for (let i = 0; i < 6; i++) put(out, cam, t, 20 + i, farmer(i), `farm${i}`, [-4 + i * 7 + hh(i) * 3, rowY(1 + (i % 3)) + 0.28, rowZ0(1 + (i % 3)) - 0.2], { expr: "smile" });
      break;
    }
    case 3: {
      if (f < 361) {
        const bend = 0.04 * Math.max(0, Math.sin(t * 2 * Math.PI * 0.6));
        for (let i = 0; i < 5; i++) {
          const at: V3 = [PLANT[0] + i * 1.15, PLANT[1] - bend, PLANT[2] + i * 1.25];
          put(out, cam, t, 30 + i, i === 0 ? WAYAN : farmer(i), i === 0 ? "wayan" : `farm${i}`, at, { expr: i === 0 ? "smile_closed" : "smile", prop: "seedling", headTilt: 0, look: 0 });
        }
      } else {
        put(out, cam, t, 2, PRIEST_O, "priest", PRIEST, { expr: "smile", prop: "lontarUp" });
      }
      break;
    }
    case 4: {
      put(out, cam, t, 3, OFF1, "off1", OFFICIAL, { expr: "grin", prop: "sack" });
      sparkles(out, t, off(OFFICIAL, 0.75, 0.75, -0.35), 0.6);
      break;
    }
    case 5: {
      const laugh = f >= 600;
      put(out, cam, t, 3, OFF1, "off1", off(TALK, -0.5), { expr: laugh ? "laugh" : "grin", prop: f >= 545 ? "point" : null, facing: -1 });
      put(out, cam, t, 4, OFF2, "off2", off(TALK, 0.6, 0, 0.6), { expr: laugh ? "laugh" : "grin", facing: -1 });
      put(out, cam, t, 1, WAYAN, "wayan", off(TALK, 1.9, 0, 1.9), { expr: "nervous", facing: -1 });
      put(out, cam, t, 2, PRIEST_O, "priest", off(TALK, 2.9, 0, 2.8), { expr: f < 640 ? "neutral" : "stern", prop: "lontar", facing: -1 });
      break;
    }
    case 7: {
      put(out, cam, t, 1, WAYAN, "wayan", HARVEST, { expr: "grin", prop: "rice" });
      put(out, cam, t, 31, farmer(1), "farm1", off(HARVEST, 2.6, -0.3, 2.6), { expr: "smile", prop: "rice" });
      break;
    }
    case 8: {
      const sx = swarmX(f);
      swarm(out, t, 70, [sx, 1.0, 14], [9, 2.5, 10], 0.75, "grin", 3);
      put(out, cam, t, 1, WAYAN, "wayan", [13, DIKE_Y, DIKE_Z - 0.2], { expr: f < 900 ? "neutral" : "shock", facing: 0 });
      break;
    }
    case 9: {
      put(out, cam, t, 1, WAYAN, "wayan", SPRAY, { expr: "stern", prop: "sprayer", facing: 1 });
      const u = (t * 1.4) % 1;
      out.fx.push({ key: `spray${q(u, 30)}`, cw: 400, ch: 300, draw: (p) => fxSpray(p, q(u, 30)), x: SPRAY[0] + cam.right.x * 1.9, y: SPRAY[1] + 1.3, z: SPRAY[2] + cam.right.z * 1.9 + 0.3, w: 2.2, h: 1.6, soft: true });
      // bugs scatter away from the mist, then drift straight back
      const away = smooth((f - 958) / 25) * (1 - smooth((f - 992) / 30));
      swarm(out, t, 26, [SPRAY[0] + 2.5 + 5 * away, 0.9 + 1.5 * away, SPRAY[2] + 4 + 4 * away], [2.5, 1.5, 2.5], 0.4, away > 0.5 ? "dazed" : "grin", 4);
      break;
    }
    case 10: {
      put(out, cam, t, 1, WAYAN, "wayan", WAYAN1, { expr: "nervous", prop: "scratch", headTilt: 6 });
      if (f >= 1040) out.fx.push({ key: "question", cw: 300, ch: 400, draw: fxQuestion, x: WAYAN1[0] - cam.right.x * 0.5, y: WAYAN1[1] + 1.9 + 0.05 * Math.sin(t * 5), z: WAYAN1[2] - cam.right.z * 0.5, w: 0.36, h: 0.48, rot: -0.15 });
      swarm(out, t, 12, [WAYAN1[0] + 1.5, 0.6, WAYAN1[2] + 3], [3, 0.8, 2], 0.3, "grin", 5);
      break;
    }
    case 11: {
      put(out, cam, t, 2, PRIEST_O, "priest", PRIEST, { expr: f < 1235 ? "smile" : "grin", prop: "lontarUp" });
      once(out, t, 1243 / FPS, 0.25, "burst", 500, 500, (p, u) => fxBurst(p, u), off(PRIEST, 0.85, 2.4, -0.2), 1.0, 1.0);
      break;
    }
    case 12: {
      const munch = Math.sin(t * 9) > 0;
      bugPlace(out, cam, t, BUG, { mood: munch ? "munch" : "happy", plate: "full", spoon: true });
      break;
    }
    case 13: {
      if (f < 1486) {
        const k = smooth((f - 1436) / 30); // flooded: the cloud lifts, scatters and goes dazed
        swarm(out, t, 80, [18, 1.4 + 4 * k, 22], [16 + 8 * k, 2 + 3 * k, 12 + 6 * k], 0.9, k > 0.3 ? "dazed" : "grin", 6);
      } else {
        bugPlace(out, cam, t, BUG, { mood: "sad", plate: "empty", spoon: true });
        const u = q((t * 1.6) % 1, 30);
        out.fx.push({ key: `growl${u}`, cw: 300, ch: 200, draw: (p) => fxGrowl(p, u), x: BUG[0] + cam.right.x * 0.2, y: BUG[1] + 0.28, z: BUG[2] + cam.right.z * 0.2 - 0.2, w: 0.24, h: 0.16 });
        swarm(out, t, 6, [BUG[0] + 1.5, BUG[1] + 0.2, BUG[2] + 2.5], [1.5, 0.3, 1.5], 0.25, "dazed", 7);
      }
      break;
    }
    case 14: {
      if (f < 1635) {
        // bugs hop from green cell to green cell along the row
        for (let i = 0; i < 60; i++) {
          const cyc = (t * 0.7 + hh(i, 1)) % 1, hop = Math.sin(cyc * Math.PI);
          const lane = Math.floor(hh(i, 2) * 4), x0 = 14 + (hh(i, 3) - 0.5) * 30 + (Math.floor(t * 0.7 + hh(i, 1)) % 3) * 9;
          bugFx(out, t, i, x0 + 9 * cyc, rowY(lane) + 0.8 + 2.2 * hop, rowZ0(lane) + 2 + hh(i, 4) * 3.5, 0.8, "grin");
        }
      } else {
        const ph = q(((t - 54.5) * 1.6) % 1, 24), at: V3 = [BUG[0] - 0.2 + 0.3 * (t - 54.5), BUG[1], BUG[2]];
        bugPlace(out, cam, t, at, { mood: "stroll", phase: ph, plate: "full", spoon: true });
        out.fx.push({ key: "board", cw: 640, ch: 300, draw: (p) => fxBoard(p, "BUKA TERUS"), x: BUG[0] + 1.4, y: BUG[1] + 0.95, z: BUG[2] + 0.5, w: 1.0, h: 0.47 });
        out.fx.push({ key: "post", cw: 60, ch: 400, draw: (p) => p.poly([[18, 0], [42, 0], [42, 400], [18, 400]], "#8a5a36", 6), x: BUG[0] + 1.4, y: BUG[1] + 0.35, z: BUG[2] + 0.52, w: 0.07, h: 0.75 });
      }
      break;
    }
    case 15: {
      if (f < 1815) {
        const G = off(PRIEST, 0, 0, -1.0);
        put(out, cam, t, 2, PRIEST_O, "priest", off(G, 0.3, 0, 0.3), { expr: "smile", prop: "lontar" });
        put(out, cam, t, 1, WAYAN, "wayan", off(G, -0.8, 0, -0.5), { expr: "grin", facing: 1, prop: "rice" });
        const spots: V3[] = [[1.3, 0, 0.6], [-1.7, 0, 0.5], [0.8, 0, 1.25], [-0.7, 0, 1.3]];
        spots.forEach((d, i) => put(out, cam, t, 40 + i, farmer(i + 2), `farm${i + 2}`, off(G, d[0], 0, d[2]), { expr: i % 2 ? "grin" : "smile", facing: i % 2 ? 1 : -1 }));
      } else {
        for (let i = 0; i < 6; i++) {
          const c: V3 = [3 + i * 2.6, DIKE_Y, DIKE_Z + (i % 2) * 0.1];
          put(out, cam, t, 50 + i, i === 2 ? WAYAN : farmer(i), i === 2 ? "wayan" : `farm${i}`, c, { expr: i % 2 ? "laugh" : "grin", prop: "rice" });
        }
      }
      break;
    }
    case 16: {
      put(out, cam, t, 2, PRIEST_O, "priest", PRIEST, { expr: f < 1925 ? "smile_closed" : "grin", prop: "lontar" });
      swarm(out, t, 14, [PRIEST[0] + 3 + (t - 62) * 2, 2.2 + (t - 62) * 0.8, PRIEST[2] + 8], [2, 1, 2], 0.45, "dazed", 8);
      break;
    }
  }
  return out;
};
