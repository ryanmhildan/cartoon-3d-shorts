// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Pak Joko, Bu Rini, the buyers of the market, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion } from "./bugs";
import { fxHighlight, fxHaha, fxCoinCandy, fxGlance, fxReadLeft, fxThought, fxPaper, fxCompare, fxCoins, fxMark } from "./fx";
import { FPS, SHOTS, V3, clamp01, hh as hh0, RINI, JOKO, SIGN_R, SIGN_J, BUYER, BAPAK, QUEUE, CROWD, NEW_SIGN, buyerAt } from "./story";
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
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean; flip?: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = (view.side && view.mirror) || !!view.flip, light = light2D(cam, mirror), seed = seedOf(who.i);
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
/** Pak Joko: black peci, teal shirt, moustache, a yellow towel on his shoulder */
const JOKO_O: Outfit = { jacket: "#2f9a86", pants: "#3b3f52", boots: "#5a3b2a", hat: "peci", moustache: "#2a201a", skin: "#c99067", scarf: "#f0c93e", build: "stout" };
/** Bu Rini: pink kerudung, mustard blouse, purple skirt */
const RINI_O: Outfit = { jacket: "#e0a23a", pants: "#4a3a2c", boots: "#8f5f3e", hat: "kerudung", cap: "#e0578a", dress: "#6a3f8f", skin: "#d8a27a" };
/** the buyer (shots 8 + 11): light-blue kerudung, coral blouse, green skirt */
const IBU_O: Outfit = { jacket: "#f07a5a", pants: "#3b3f52", boots: "#5a3b2a", hat: "kerudung", cap: "#5ab0e0", dress: "#3f8f55", skin: "#c99067" };
/** the newspaper reader (shot 12): peci, glasses, white shirt */
const BAPAK_O: Outfit = { jacket: "#f4f1ea", pants: "#5a4a3a", boots: "#3a2a20", hat: "peci", glasses: true, moustache: "#8a8a8a", skin: "#b9805a" };
const SKINS_ID = ["#c99067", "#d8a27a", "#b9805a", "#e0b48c"];
const warga = (v: number): Outfit => {
  const coats = ["#3f6fb5", "#c0353a", "#5d9a3a", "#d9a441", "#2f8f9a", "#7b5ac9", "#f08a2c", "#e05a8a"];
  const o: Outfit = { jacket: coats[v % 8], pants: "#3b3f52", boots: "#4a3426", skin: SKINS_ID[v % 4] };
  switch (v % 4) {
    case 0: return { ...o, hat: "kerudung", cap: ["#3f8f55", "#c25a7a", "#5a8fc2", "#e8d8a0"][(v >> 2) % 4], dress: ["#2f5a8a", "#6a3f8f", "#8a4a2a"][v % 3] };
    case 1: return { ...o, hat: "peci" };
    case 2: return { ...o, hat: "cap", cap: ["#d8402f", "#2f6fc0", "#f0c93e"][(v >> 2) % 3], build: v % 8 === 6 ? "kid" : undefined };
    default: return { ...o, hat: "hair", hair: ["#2a201a", "#3a2a20", "#5a3b2a"][v % 3] };
  }
};

const FRONT = { side: false, mirror: false };
const FLIP = { side: false, mirror: false, flip: true };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number; flip?: boolean };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], opt.flip ? FLIP : FRONT, fo, {}, scale));
  blob(out, p[0], p[1], p[2], scale);
};
/** profile view: (dx, dz) = where they look / walk; walking = march cycle */
const putSide = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, dx: number, dz: number, expr: Expr, walk = false) => {
  const v = viewOf(cam, p[0], p[2], dx, dz), phase = walk ? q((t * 1.9 + hh(i, 7)) % 1, 12) : 0;
  const so: SideOpts = { mode: walk ? "march" : "stand", expr, blink: lidAt(t, i), pose: 0, phase, stride: walk ? 0.9 * v.fs : 0 };
  const fo: FrontOpts = { mode: walk ? "stroll" : "stand", expr, blink: lidAt(t, i), facing: v.mirror ? -1 : 1, phase };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1], p[2], v, fo, so));
  blob(out, p[0], p[1], p[2]);
};
/** a camera-facing effect card at `p` + screen-right * sr + up * su, pulled `near` metres toward the lens */
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0, near = 0) => {
  let x = p[0] + cam.right.x * sr, y = p[1] + su, z = p[2] + cam.right.z * sr;
  if (near) { const dx = cam.pos.x - x, dy = cam.pos.y - y, dz = cam.pos.z - z, L = Math.hypot(dx, dy, dz) || 1; x += (dx / L) * near; y += (dy / L) * near; z += (dz / L) * near; }
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, soft, rot });
};
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
const T2 = (t: number) => q(t, 15); // effect animation time, quantised to 1/15 s (canvas cache)
const QEXPR: Expr[] = ["smile", "grin", "smile_closed", "neutral", "grin", "smile"];
/** the queue at Joko's stall: first n people */
const queue = (out: Stage, cam: CamInfo, t: number, n = QUEUE.length, happy = false) => {
  for (let i = 0; i < Math.min(n, QUEUE.length); i++) {
    const o = warga(i + 3), expr = happy && i % 3 === 0 ? "laugh" : QEXPR[i % 6];
    put(out, cam, t, 10 + i, o, "w" + (i + 3), QUEUE[i], { expr, look: i % 2 ? 0.8 : -0.4, prop: i % 4 === 1 ? "moneybag" : null }, o.build === "kid" ? 0.8 : 1);
  }
};

/** the crowd at Joko's table (hook + ending) */
const crowd = (out: Stage, cam: CamInfo, t: number, happy = false) => {
  CROWD.forEach((p, i) => {
    const o = warga(i + 7), expr = happy && i % 2 === 0 ? "laugh" : QEXPR[(i + 1) % 6];
    put(out, cam, t, 30 + i, o, "w" + (i + 7), p, { expr, look: i % 2 ? 0.6 : -0.6, prop: i % 3 === 0 ? "moneybag" : null, wave: happy && i % 3 === 1 ? Math.sin(t * 7 + i) * 0.5 + 0.5 : undefined }, o.build === "kid" ? 0.8 : 1);
  });
};

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f);
  LNAME = s.light;
  findSun(cam, SUN);
  const joko = (opt: Opt) => put(out, cam, t, 1, JOKO_O, "joko", JOKO, opt);
  const rini = (opt: Opt) => put(out, cam, t, 2, RINI_O, "rini", RINI, opt);
  switch (id) {
    case 1: {
      joko({ expr: "grin", wave: Math.sin(t * 6) * 0.5 + 0.5 });
      rini({ expr: "shock" });
      crowd(out, cam, t);
      break;
    }
    case 2: {
      joko({ expr: "smile_closed" });
      rini({ expr: "smile_closed" });
      const u = (f - 164) / 102;
      putSide(out, cam, t, 20, warga(1), "w1", [-3.5 + 4.2 * u, 0, 3.4], 1, 0, "smile", true);
      putSide(out, cam, t, 21, warga(4), "w4", [4.0 - 3.6 * u, 0, 4.4], -1, 0, "neutral", true);
      break;
    }
    case 3: {
      joko({ expr: "smile", facing: -1 });
      rini({ expr: "smile", facing: 1 });
      break;
    }
    case 4: {
      const writing = f < 452;
      joko({ expr: writing ? "smile_closed" : "grin", prop: writing ? "marker" : "point", headTilt: writing ? 6 : 0, look: -0.6 });
      rini({ expr: "neutral" });
      if (f >= NEW_SIGN && f < NEW_SIGN + 14) { const u = q((f - NEW_SIGN) / 14, 14); card(out, cam, `burst${u}`, 500, 500, (p) => fxBurst(p, u), SIGN_J, 0, 0, 0.95, 0.95, false, 0, 0.05); }
      break;
    }
    case 5: {
      rini({ expr: "laugh", facing: 1, headTilt: -5 * Math.sin(t * 13) });
      joko({ expr: "smile_closed" });
      if (f >= 549) { const u = T2(t); card(out, cam, `haha${u}`, 520, 300, (p) => fxHaha(p, u), RINI, -0.42, 1.92, 0.5, 0.29); }
      break;
    }
    case 6: {
      rini({ expr: f < 640 ? "laugh" : "grin", prop: "point", facing: 1 });
      const k = pop(f, 616, 6), x = q(clamp01((f - 664) / 6), 6);
      if (f >= 616) card(out, cam, `candy${q(k, 6)}|${x}`, 760, 380, (p) => fxCoinCandy(p, x), RINI, 0.0, 2.12, 0.6 * k, 0.3 * k);
      break;
    }
    case 7: {
      joko({ expr: "grin", prop: "moneybag" });
      rini({ expr: "nervous" });
      queue(out, cam, t);
      break;
    }
    case 8: {
      joko({ expr: "smile_closed" });
      rini({ expr: "smile", wave: Math.sin(t * 6) * 0.5 + 0.5 });
      const p = buyerAt(f);
      if (f < 878) {
        const dir = f < 845 ? -1 : 1;
        put(out, cam, t, 3, IBU_O, "ibu", p, { expr: "neutral", look: 1.8 * dir, facing: dir as -1 | 1 });
        if (f > 817) card(out, cam, `hl`, 760, 560, fxHighlight, dir < 0 ? SIGN_R : SIGN_J, 0, 0, 0.8, 0.59, false, 0, 0.05);
      } else putSide(out, cam, t, 3, IBU_O, "ibu", p, 1.3, -0.7, "smile", true);
      break;
    }
    case 9: {
      rini({ expr: "nervous", prop: "scratch", headTilt: 6 });
      if (f >= 925) card(out, cam, "question", 300, 400, fxQuestion, RINI, 0.3, 1.88 + 0.03 * Math.sin(t * 5), 0.26, 0.35, false, -0.15);
      break;
    }
    case 10: {
      const u = q(clamp01((f - 1030) / 120), 30), k = pop(f, 1022, 8);
      card(out, cam, `read${u}|${q(k, 8)}`, 900, 560, (p) => fxReadLeft(p, u), SIGN_J, 0, -0.55, 0.72 * k, 0.448 * k, false, 0, 0.2);
      break;
    }
    case 11: {
      put(out, cam, t, 3, IBU_O, "ibu", BUYER, { expr: f < 1276 ? "smile_closed" : "grin", look: 1.2 });
      const k = q(pop(f, 1210, 8), 8);
      if (f >= 1210) card(out, cam, `thought${k}`, 640, 520, (p) => fxThought(p, k), BUYER, 0.15, 2.25, 0.55, 0.45, false, 0, 0.15);
      break;
    }
    case 12: {
      put(out, cam, t, 4, BAPAK_O, "bapak", BAPAK, { expr: f < 1420 ? "smile_closed" : "grin", prop: "paper" });
      const u = q(clamp01((f - 1380) / 90), 15);
      card(out, cam, `paper${u}`, 600, 760, (p) => fxPaper(p, u), BAPAK, 0, 0.95, 0.55, 0.7, false, 0, 0.3);
      break;
    }
    case 13: {
      joko({ expr: "smile_closed" });
      rini({ expr: "neutral" });
      const k = pop(f, 1515, 8);
      if (f >= 1510) card(out, cam, `cmp${q(k, 8)}`, 820, 380, (p) => fxCompare(p, k), [0, 1.55, 1.0], 0, 0, 0.9, 0.42);
      break;
    }
    case 14: {
      joko({ expr: "grin" });
      rini({ expr: "nervous" });
      queue(out, cam, t);
      break;
    }
    case 15: {
      rini({ expr: "nervous", prop: "coin", headTilt: -5 });
      break;
    }
    case 16: {
      joko({ expr: "laugh", prop: "moneybag" });
      rini({ expr: "pained" });
      crowd(out, cam, t, true);
      { const u = T2(t); card(out, cam, `coins${u}`, 600, 600, (p) => fxCoins(p, u), [1.25, 0, 1.2], 0, 2.0, 1.3, 1.3); }
      break;
    }
  }
  void SIGN_R; void fxMark; void fxGlance; void BUYER; void FLIP;
  return out;
};
