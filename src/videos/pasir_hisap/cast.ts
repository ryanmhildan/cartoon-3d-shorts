// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Kamu (sinking into the quicksand), the friend, the old-film explorer, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxRing, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion } from "./bugs";
import { fxBubble, fxBang, fxSweat, fxNoPull, fxSplat, fxHelmet, fxScale, fxBall, fxCement, fxCar, fxMudRing, fxHug } from "./fx";
import { FPS, SHOTS, V3, clamp01, hh as hh0, at, QS, FRIEND, EXPLORER, FREE, sinkAt, explorerSink, kamuAt } from "./story";
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
const KAMU: Outfit = { jacket: "#f08a2c", pants: "#3f6fb5", boots: "#f4f1ea", hat: "cap", cap: "#f0c93e", skin: "#c99067" };
const TEMAN: Outfit = { jacket: "#3fae55", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hair: "#1f1a18", skin: "#b9805a" };
const EXPL: Outfit = { jacket: "#d9c8a0", pants: "#7a6a4a", boots: "#4a3426", hat: "pith", band: "#c43c32", moustache: "#5a3b2a", skin: "#f2c8a0", build: "stout" };

const FRONT = { side: false, mirror: false };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0, blobOn = true) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], FRONT, fo, {}, scale));
  if (blobOn) blob(out, p[0], p[1], p[2], scale);
};
const putSide = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, dx: number, dz: number, expr: Expr, walk = false) => {
  const v = viewOf(cam, p[0], p[2], dx, dz), phase = walk ? q((t * 1.7 + hh(i, 7)) % 1, 12) : 0;
  const so: SideOpts = { mode: walk ? "march" : "stand", expr, blink: lidAt(t, i), pose: 0, phase, stride: walk ? 0.8 * v.fs : 0 };
  const fo: FrontOpts = { mode: walk ? "stroll" : "stand", expr, blink: lidAt(t, i), facing: v.mirror ? -1 : 1, phase };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1], p[2], v, fo, so));
  blob(out, p[0], p[1], p[2]);
};
const off = (p: V3, dx: number, dy = 0, dz = 0): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: p[0] + cam.right.x * sr, y: p[1] + su, z: p[2] + cam.right.z * sr, w, h, soft, rot });
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
const loop = (t: number, rate: number, n = 24) => q((t * rate) % 1, n);
const mudRing = (out: Stage, p: V3, s = 1.3) => out.fx.push({ key: "mudring", cw: 300, ch: 300, draw: fxMudRing, x: p[0], y: p[1] + 0.03, z: p[2], w: s, h: s, flat: true, soft: true });
/** Kamu stuck in the patch: card sunk below the surface + a wet ring around */
const stuck = (out: Stage, cam: CamInfo, t: number, id: number, f: number, opt: Opt) => {
  put(out, cam, t, 1, KAMU, "kamu", QS, opt, 1, -sinkAt(id, f), false);
  mudRing(out, QS);
};

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f);
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      const k = Math.sin(t * 7);
      stuck(out, cam, t, id, f, { expr: "shock", prop: k > 0 ? "throw" : "shrug", tilt: 6 * k });
      const u = loop(t, 1.6, 16);
      out.fx.push({ key: `splat${u}`, cw: 600, ch: 400, draw: (p) => fxSplat(p, u), x: QS[0] + cam.right.x * 0.1, y: QS[1] + 0.22, z: QS[2] + cam.right.z * 0.1 + 0.4, w: 1.4, h: 0.93 });
      break;
    }
    case 2: {
      const k = kamuAt(2, f);
      putSide(out, cam, t, 1, KAMU, "kamu", k, 1, 0, "smile", true);
      putSide(out, cam, t, 2, TEMAN, "teman", at(k[0] - 1.4, -0.9), 1, 0, "grin", true);
      break;
    }
    case 3: {
      stuck(out, cam, t, id, f, { expr: f < 318 ? "smile" : "shock", tilt: f < 318 ? 0 : 4 * Math.sin(t * 9) });
      if (f >= 322 && f < 342) { const u = q((f - 322) / 20, 20); out.fx.push({ key: `splat${u}`, cw: 600, ch: 400, draw: (p) => fxSplat(p, u), x: QS[0], y: QS[1] + 0.2, z: QS[2] + 0.4, w: 1.6, h: 1.07 }); }
      break;
    }
    case 4: {
      const d = explorerSink(f);
      if (d < 2.15) put(out, cam, t, 5, EXPL, "expl", EXPLORER, { expr: d < 0.3 ? "neutral" : "nervous", wave: 0.5 + 0.5 * Math.sin(t * 8), tilt: 3 * Math.sin(t * 5) }, 1, -d, false);
      out.fx.push({ key: "mudring", cw: 300, ch: 300, draw: fxMudRing, x: EXPLORER[0], y: EXPLORER[1] + 0.03, z: EXPLORER[2], w: 1.4, h: 1.4, flat: true, soft: true });
      if (d > 1.9) card(out, cam, "helmet", 320, 200, fxHelmet, EXPLORER, 0, 0.18, 0.62, 0.39);
      break;
    }
    case 5: {
      put(out, cam, t, 2, TEMAN, "teman", FRIEND, { expr: "shock", prop: "point", facing: 1 });
      stuck(out, cam, t, id, f, { expr: "nervous" });
      if (f >= 530) { const k = pop(f, 530, 6); card(out, cam, "bubble", 720, 380, (p) => fxBubble(p, "JANGAN GERAK!"), FRIEND, 0.25, 2.45, 1.25 * k, 0.66 * k); }
      break;
    }
    case 6: {
      const k = Math.sin(t * 5);
      stuck(out, cam, t, id, f, { expr: "pained", tilt: 7 * k, headTilt: -4 * k });
      card(out, cam, `sweat${loop(t, 1.3, 12)}`, 300, 300, (p) => fxSweat(p, loop(t, 1.3, 12)), off(QS, 0, -sinkAt(id, f)), 0.05, 2.05, 0.6, 0.6);
      if (f >= 678) card(out, cam, "nopull", 300, 420, fxNoPull, QS, 0.36, 1.45, 0.3, 0.42);
      break;
    }
    case 7: {
      stuck(out, cam, t, id, f, { expr: f < 813 ? "shock" : "dazed" });
      if (f >= 813) card(out, cam, "bang", 200, 400, fxBang, QS, 0.5, 1.55 - 0.3 + 0.03 * Math.sin(t * 9), 0.2, 0.4, false, -0.15);
      break;
    }
    case 8: {
      stuck(out, cam, t, id, f, { expr: "nervous", prop: "scratch", headTilt: 6 });
      if (f >= 845) card(out, cam, "question", 300, 400, fxQuestion, QS, 0.3, 1.12 + 0.03 * Math.sin(t * 5), 0.22, 0.29, false, -0.15);
      break;
    }
    case 9: {
      stuck(out, cam, t, id, f, { expr: "neutral", look: 1, facing: 1 });
      if (f >= 905) { const k = pop(f, 905, 6), u = q(clamp01((f - 905) / 50), 25); card(out, cam, `scale${u}`, 820, 720, (p) => fxScale(p, u), QS, 0.55, 1.55, 1.15 * k, 1.01 * k); }
      break;
    }
    case 10: {
      stuck(out, cam, t, id, f, { expr: "grin", facing: 1 });
      if (f >= 1080) { const k = pop(f, 1080, 6), u = loop(t, 0.8, 24); card(out, cam, `ball${u}`, 620, 520, (p) => fxBall(p, u), QS, 0.6, 1.0, 0.95 * k, 0.8 * k); }
      break;
    }
    case 11: {
      stuck(out, cam, t, id, f, { expr: "nervous", facing: -1 });
      if (f >= 1150) { const k = pop(f, 1150, 6), u = q(clamp01((f - 1150) / 40), 20); card(out, cam, `cement${u}`, 820, 820, (p) => fxCement(p, u), QS, -0.6, 1.25, 1.0 * k, 1.0 * k); }
      break;
    }
    case 12: {
      stuck(out, cam, t, id, f, { expr: "pained", tilt: 4 * Math.sin(t * 6) });
      if (f >= 1300) { const k = pop(f, 1300, 6), u = loop(t, 1, 12); card(out, cam, `car${u}`, 820, 760, (p) => fxCar(p, u), QS, 0.6, 1.35, 1.05 * k, 0.97 * k); }
      break;
    }
    case 13: {
      const k = Math.sin(t * 2.4);
      stuck(out, cam, t, id, f, { expr: f < 1480 ? "stern" : "relief_open", tilt: 3 * k });
      put(out, cam, t, 2, TEMAN, "teman", off(QS, -1.45, 0, -1.3), { expr: "grin", wave: 0.5 + 0.5 * Math.sin(t * 5), facing: 1 });
      for (const [d, sz] of [[0, 1.8], [25, 1.5], [50, 1.2]] as const) {
        const u = ((f - 1400 - d) / 75) % 1;
        if (f < 1400 + d || u < 0) continue;
        out.fx.push({ key: `ring${q(u, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(u, 30)), x: QS[0], y: QS[1] + 0.04, z: QS[2], w: sz * 1.6, h: sz * 1.6, flat: true });
      }
      break;
    }
    case 14: {
      stuck(out, cam, t, id, f, { expr: "nervous", facing: 1, look: 1 });
      put(out, cam, t, 2, TEMAN, "teman", off(QS, -1.0, 0, -1.7), { expr: "shock", prop: "point", facing: 1 });
      break;
    }
    case 15: {
      put(out, cam, t, 1, KAMU, "kamu", FREE, { expr: "relief_open", wave: 0.5 + 0.5 * Math.sin(t * 6) });
      put(out, cam, t, 2, TEMAN, "teman", off(FREE, 1.05, 0, -0.6), { expr: "grin", facing: -1 });
      mudRing(out, QS, 1.0);
      break;
    }
    case 16: {
      stuck(out, cam, t, id, f, { expr: f < 1800 ? "nervous" : "laugh" });
      const u = loop(t, 0.7, 24);
      out.fx.push({ key: `hug${u}`, cw: 860, ch: 460, draw: (p) => fxHug(p, u), x: QS[0] + 0, y: QS[1] + 0.35, z: QS[2] + 0.25, w: 1.6, h: 0.86 });
      break;
    }
  }
  return out;
};
