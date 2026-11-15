// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Jenner, Sarah, James, the gardener, villagers, kids, cartoon cows, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxSplash, townsfolk, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion, fxSparkle } from "./bugs";
import { fxCow, fxNotice, fxRumour, fxWeeks, fxStars, fxPoster, fxTwins, fxTraining, fxFire, fxVacca } from "./fx";
import { FPS, SHOTS, V3, clamp01, smooth, hh as hh0, STREET, NOTICE, FENCE_MAID, COWS, GARDEN, HAY, KIDS0 } from "./story";
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
const JENNER: Outfit = { jacket: "#2f5f9a", pants: "#e8dcc0", boots: "#2a2420", hat: "tricorn", scarf: "#f6efdc", skin: "#f2c8a0", buttons: "#e8c45a" };
const SARAH: Outfit = { jacket: "#f6efdc", pants: "#3b3f52", boots: "#5a3b2a", hat: "bonnet", dress: "#d0708a", skin: "#f5d0b0" };
const MAID2: Outfit = { jacket: "#f6efdc", pants: "#3b3f52", boots: "#5a3b2a", hat: "bonnet", dress: "#6a8fc2", skin: "#ecd0b6" };
const JAMES: Outfit = { jacket: "#8a6a3a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#c9802a", skin: "#f5d0b0", build: "kid" };
const GARDENER: Outfit = { jacket: "#5d7a3a", pants: "#5a4632", boots: "#4a3426", hat: "cap", cap: "#6a5a3a", moustache: "#7a4a2a", skin: "#f2c8a0" };
const KIDS: Outfit[] = [
  { jacket: "#d8402f", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a", skin: "#f5d0b0", build: "kid" },
  { jacket: "#3f8fc8", pants: "#3b3f52", boots: "#5a3b2a", hat: "bonnet", dress: "#f0c93e", skin: "#ecd0b6", build: "kid" },
  { jacket: "#3fae55", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#c9802a", skin: "#f5d0b0", build: "kid" },
  { jacket: "#8a6a3a", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#d8402f", skin: "#f2c8a0", build: "kid" },
];

const FRONT = { side: false, mirror: false };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], FRONT, fo, {}, scale));
  blob(out, p[0], p[1], p[2], scale);
};
const off = (p: V3, dx: number, dy = 0, dz = 0): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: p[0] + cam.right.x * sr, y: p[1] + su, z: p[2] + cam.right.z * sr, w, h, soft, rot });
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
const loop = (t: number, rate: number, n = 24) => q((t * rate) % 1, n);
const bob = (t: number, i: number) => Math.max(0, Math.sin(t * 9 + i * 1.3)) * 0.07;
/** a cartoon cow card standing at p, facing screen-right (dir 1) or left (-1) */
const cow = (out: Stage, cam: CamInfo, t: number, p: V3, i: number, dir: 1 | -1 = 1, mood: "calm" | "smile" | "tilt" = "calm", s = 1) => {
  const chew = q(0.5 + 0.5 * Math.sin(t * 4 + i), 4);
  out.fx.push({ key: `cow|${mood}|${chew}`, cw: 800, ch: 560, draw: (pn) => fxCow(pn, mood, chew), x: p[0], y: p[1] + 0.64 * s, z: p[2], w: 2.2 * s * dir, h: 1.54 * s });
  blob(out, p[0], p[1], p[2], 1.5 * s);
};

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f), G = GARDEN, M = FENCE_MAID;
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      put(out, cam, t, 1, JENNER, "jenner", off(G, 1.0, 0, 0), { expr: "smile_closed", prop: "vial", facing: -1 });
      put(out, cam, t, 3, JAMES, "james", off(G, -0.35, 0, 0.3), { expr: f < 60 ? "neutral" : "nervous", facing: 1 });
      cow(out, cam, t, off(G, 2.7, 0, -2.4), 1, -1, "tilt", 0.9);
      break;
    }
    case 2: {
      card(out, cam, "notice", 640, 420, (p) => fxNotice(p, "AWAS CACAR!", "INGGRIS, 1796"), off(NOTICE, 0, 0, 0.12), 0, 1.55, 2.0, 1.31);
      for (let i = 0; i < 5; i++) put(out, cam, t, 20 + i, townsfolk(i), `tf${i}`, off(STREET, -3.4 + i * 1.3, 0, (i % 2) * 1.2 - 0.4), { expr: i % 2 ? "nervous" : "stern", facing: i % 2 ? 1 : -1, headTilt: (i - 2) * 2 });
      break;
    }
    case 3: {
      put(out, cam, t, 2, SARAH, "sarah", off(M, 0.6, 0, 0), { expr: f < 330 ? "grin" : "laugh", prop: "bucket", facing: -1 });
      put(out, cam, t, 4, MAID2, "maid2", off(M, -0.6, 0, 0.3), { expr: "grin", prop: "bucket", facing: 1 });
      put(out, cam, t, 1, JENNER, "jenner", off(M, 2.5, 0, 0.7), { expr: "neutral", prop: "ear", facing: -1, look: -1 });
      COWS.slice(0, 4).forEach((c, i) => cow(out, cam, t, c, i, i % 2 ? -1 : 1));
      break;
    }
    case 4: {
      put(out, cam, t, 2, SARAH, "sarah", off(M, 0.6, 0, 0), { expr: "grin", prop: "bucket" });
      COWS.slice(0, 3).forEach((c, i) => cow(out, cam, t, c, i, i % 2 ? -1 : 1));
      if (f >= 415) { const k = pop(f, 415, 6), u = q(clamp01((f - 415) / 40), 20); card(out, cam, `rumour${u}`, 760, 460, (p) => fxRumour(p, u), off(M, 0.6, 0, 0), 0.05, 2.4, 1.4 * k, 0.85 * k); }
      break;
    }
    case 5: {
      put(out, cam, t, 2, SARAH, "sarah", off(M, 0.55, 0, 0), { expr: "smile", prop: "hand", facing: 1 });
      put(out, cam, t, 1, JENNER, "jenner", off(M, 1.6, 0, 0.3), { expr: "stern", prop: "vial", facing: -1 });
      if (f >= 556) card(out, cam, `spark${loop(t, 1.2)}`, 400, 400, (p) => fxSparkle(p, loop(t, 1.2)), off(M, 1.6, 0, 0.3), 0.3, 1.75, 0.4, 0.4);
      break;
    }
    case 6: {
      put(out, cam, t, 3, JAMES, "james", G, { expr: f < 690 ? "stern" : "smile_closed", prop: "hand", facing: 1 });
      put(out, cam, t, 1, JENNER, "jenner", off(G, 0.95, 0, 0.15), { expr: "smile_closed", prop: "vial", facing: -1 });
      put(out, cam, t, 5, GARDENER, "gardener", off(G, -1.3, 0, -0.9), { expr: "nervous", prop: "rake", facing: 1 });
      if (f >= 662 && f < 720) card(out, cam, `spark${loop(t, 2)}`, 400, 400, (p) => fxSparkle(p, loop(t, 2)), G, 0.45, 1.05, 0.3, 0.3);
      break;
    }
    case 7: {
      put(out, cam, t, 3, JAMES, "james", G, { expr: "nervous", facing: 1 });
      put(out, cam, t, 1, JENNER, "jenner", off(G, 0.9, 0, 0.15), { expr: "stern", prop: f >= 860 ? "vialRed" : null, facing: -1 });
      if (f < 870) { const k = pop(f, 818, 5), u = q(clamp01((f - 818) / 45), 20); card(out, cam, `weeks${u}`, 500, 620, (p) => fxWeeks(p, u), G, -0.75, 2.1, 0.75 * k, 0.93 * k); }
      break;
    }
    case 8: {
      put(out, cam, t, 3, JAMES, "james", off(G, 0.2, 0, 0), { expr: "grin", prop: "fist" }, 1, f >= 986 ? Math.max(0, Math.sin((f - 986) / 6)) * 0.12 : 0);
      if (f >= 960) card(out, cam, `stars${loop(t, 0.8)}`, 420, 210, (p) => fxStars(p, loop(t, 0.8)), off(G, 0.2, 0, 0), 0, 1.75, 0.8, 0.4);
      break;
    }
    case 9: {
      card(out, cam, "poster", 600, 800, fxPoster, off(NOTICE, 0, 0, 0.12), 0, 1.45, 1.2, 1.6);
      for (let i = 0; i < 5; i++) put(out, cam, t, 20 + i, townsfolk(i), `tf${i}`, off(NOTICE, -2.7 + i * 1.35 + (i > 1 ? 0.9 : 0), 0, 2.0 + (i % 2) * 0.8), { expr: "laugh", prop: i % 2 ? "point" : null, facing: i < 2 ? 1 : -1 }, 1, bob(t, i));
      break;
    }
    case 10: {
      put(out, cam, t, 4, MAID2, "maid2", off(M, 0.8, 0, 0), { expr: "nervous", prop: "scratch", headTilt: 6 });
      cow(out, cam, t, COWS[0], 0, -1, "tilt");
      if (f >= 1146) card(out, cam, "question", 300, 400, fxQuestion, off(M, 0.8, 0, 0), 0.32, 2.25 + 0.03 * Math.sin(t * 5), 0.28, 0.37, false, -0.15);
      break;
    }
    case 11: {
      const k = pop(f, 1240, 6), u = q(clamp01((f - 1240) / 60), 20);
      card(out, cam, `twins${u}`, 880, 640, (p) => fxTwins(p, u), STREET, 0, 1.9, 1.95 * k, 1.42 * k);
      break;
    }
    case 12: {
      const u = q(clamp01((f - 1395) / 120), 60);
      card(out, cam, `train${u}`, 860, 900, (p) => fxTraining(p, u), STREET, 0, 1.9, 1.5, 1.57);
      break;
    }
    case 13: {
      const fs = 1 - smooth((f - 1605) / 30), u = loop(t, 2, 12);
      card(out, cam, `fire${u}|${q(fs, 20)}`, 300, 400, (p) => fxFire(p, u, q(fs, 20)), off(HAY, 0, 0, 1.75), 0, 0.85, 0.9, 1.2);
      for (let i = 0; i < 4; i++) {
        const p0 = off(KIDS0, i * 0.85, 0, -i * 0.2);
        put(out, cam, t, 40 + i, KIDS[i], `kid${i}`, p0, { expr: i === 0 && f >= 1600 ? "grin" : "stern", prop: "bucket", facing: 1 }, 1, bob(t * 0.6, i) * 0.5);
      }
      if (f >= 1600 && f < 1622) { const k = q((f - 1600) / 22, 22); out.fx.push({ key: `splash${k}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, k), x: HAY[0], y: 1.1, z: HAY[2] + 1.0, w: 1.6, h: 1.6 }); }
      break;
    }
    case 14: {
      put(out, cam, t, 1, JENNER, "jenner", off(M, 2.4, 0, 0.4), { expr: "smile_closed", facing: -1 });
      put(out, cam, t, 3, JAMES, "james", off(M, 1.3, 0, 0.7), { expr: "grin", wave: 0.5 + 0.5 * Math.sin(t * 6) });
      put(out, cam, t, 2, SARAH, "sarah", off(M, 0.2, 0, 0.3), { expr: "smile", prop: "bucket", facing: 1 });
      cow(out, cam, t, COWS[0], 0, -1, "smile");
      cow(out, cam, t, COWS[1], 1, 1, "smile");
      if (f >= 1700) card(out, cam, `spark${loop(t, 1)}`, 400, 400, (p) => fxSparkle(p, loop(t, 1)), COWS[0], 0, 1.6, 0.8, 0.8);
      break;
    }
    case 15: {
      put(out, cam, t, 1, JENNER, "jenner", off(M, 2.4, 0, 0.4), { expr: "smile_closed", facing: -1 });
      put(out, cam, t, 3, JAMES, "james", off(M, 1.3, 0, 0.7), { expr: "laugh" });
      put(out, cam, t, 2, SARAH, "sarah", off(M, 0.2, 0, 0.3), { expr: "laugh", prop: "bucket", facing: 1 });
      cow(out, cam, t, COWS[0], 0, -1, "smile");
      cow(out, cam, t, COWS[1], 1, 1, "smile");
      const k = pop(f, 1790, 6), u = q(clamp01((f - 1790) / 110), 55);
      card(out, cam, `vacca${u}`, 900, 520, (p) => fxVacca(p, u), off(M, 1.4, 0, 0.4), 0, 2.85, 2.1 * k, 1.21 * k);
      break;
    }
  }
  return out;
};
