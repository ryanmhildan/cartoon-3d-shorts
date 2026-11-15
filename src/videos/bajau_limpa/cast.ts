// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Pak Dino, the tourists, the city diver, the scientists, Bajau villagers, plus the effect cards (fish,
// bubbles, sun shafts, infographic cards). stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxSplash, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion, fxBoard } from "./bugs";
import { fxFish, fxBubble, fxRay, fxTankX, fxClock, fxSpeech, fxStopwatch, fxUSG, fxLungsX, fxArrow, fxSpleens, fxTank, fxSqueeze, fxBattery, fxStamp, fxSign2 } from "./fx";
import { camAt, focusAt, FPS, SHOTS, V3, clamp01, smooth, easeOut, hh as hh0, at, deckAt, FLOOR, DINO_D, DINO_R, SIGN, TOUR, DIVE, HEAD, NB, FLOAT13, FLOAT16, swim3, swim7, swim12, jumpK } from "./story";
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
const BARE = "#8f5f3e";
/** Pak Dino: teal shirt, navy shorts, orange headband, wooden goggles (up on land, on under water) */
const DINO_UP: Outfit = { jacket: "#2fa39a", pants: "#2f3f6a", boots: BARE, hat: "hair", hair: "#1f1a18", skin: "#a8714a", headband: "#f08a2c", goggles: "up" };
const DINO_ON: Outfit = { ...DINO_UP, goggles: "on" };
const DIVER: Outfit = { jacket: "#ff4fa0", pants: "#1f2430", boots: "#f6d23a", hat: "hair", hair: "#5a3b2a", skin: "#ecd0b6", goggles: "up" };
const SCI1: Outfit = { jacket: "#f4f4f0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#1f1a18", skin: "#c99067" };
const SCI2: Outfit = { jacket: "#f4f4f0", pants: "#3b3f52", boots: "#4a3426", hat: "kerudung", cap: "#3f6fb5", dress: "#e8ecef", skin: "#d6a27a" };
const NENEK: Outfit = { jacket: "#c25a7a", pants: "#5a3b2a", boots: BARE, hat: "kerudung", cap: "#d9a441", dress: "#8c3b4a", skin: "#a8714a" };
const KID: Outfit = { jacket: "#f2c84a", pants: "#3b3f52", boots: BARE, hat: "hair", hair: "#1f1a18", skin: "#b9805a", build: "kid" };
const VILL: Outfit[] = [
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: BARE, hat: "peci", skin: "#a8714a" },
  { jacket: "#d9a441", pants: "#4a3a2c", boots: BARE, hat: "kerudung", cap: "#5a8f6a", dress: "#2f7a8a", skin: "#b9805a" },
  { jacket: "#b5653f", pants: "#3b3f52", boots: BARE, hat: "caping", skin: "#c99067" },
  { jacket: "#7ab35a", pants: "#3b3f52", boots: BARE, hat: "hair", hair: "#1f1a18", skin: "#a8714a", build: "kid" },
];
const TOURISTS: Outfit[] = [
  { jacket: "#f08a2c", pants: "#3f6fb5", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", skin: "#f2c8a0" },
  { jacket: "#5ab0c8", pants: "#f0e6d0", boots: "#f4f1ea", hat: "hair", hair: "#d9a441", skin: "#f5d0b0" },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#f4f1ea", hat: "cap", cap: "#2f4f7a", skin: "#e0b48a", moustache: "#5a3b2a" },
];

const FRONT = { side: false, mirror: false };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number; float?: boolean };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], FRONT, fo, {}, scale));
  if (!opt.float) blob(out, p[0], p[1], p[2], scale);
};
/** profile view: (dx, dz) = where they look / walk; walk = stepping, swim = horizontal swimmer (card rolled) */
const putSide = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, dx: number, dz: number, expr: Expr, how: "stand" | "walk" | "swim" = "stand", dive = 0) => {
  const v = viewOf(cam, p[0], p[2], dx, dz);
  const phase = how === "walk" ? q((t * 1.8 + hh(i, 7)) % 1, 12) : how === "swim" ? q((t * 1.4 + hh(i, 7)) % 1, 16) : 0;
  const mode = how === "walk" ? "march" : how === "swim" ? "swim" : "stand";
  const so: SideOpts = { mode, expr, blink: lidAt(t, i), pose: 0, phase, stride: how === "walk" ? 0.8 * v.fs : 0 };
  const fo: FrontOpts = { mode: how === "walk" ? "march" : "stand", expr, blink: lidAt(t, i), facing: v.mirror ? -1 : 1, phase };
  const pl = person(cam, { i, o, okey }, p[0], p[1], p[2], v, fo, so);
  if (how === "swim") pl.roll = (v.mirror ? 1 : -1) * (Math.PI / 2 - 0.12 + dive);
  out.places.push(pl);
  if (how !== "swim") blob(out, p[0], p[1], p[2]);
};
const off = (p: V3, dx: number, dy = 0, dz = 0): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];
/** a camera-facing effect card at `p` + screen-right * sr + up * su */
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: p[0] + cam.right.x * sr, y: p[1] + su, z: p[2] + cam.right.z * sr, w, h, soft, rot });
/** a card pinned to the frame: (sx, sy) in -1..1 screen units (sy up), wf = width as a share of the frame width,
 *  placed just in front of the focus distance so the lens keeps it sharp */
let HUD_ID = 1, HUD_F = 0;
const hud = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, sx: number, sy: number, wf: number, k = 1) => {
  const c = camAt(HUD_ID, HUD_F), fp = focusAt(HUD_ID, HUD_F), fw = cam.fwd ?? new THREE.Vector3(0, 0, -1);
  const D = Math.max(1.6, (fp[0] - cam.pos.x) * fw.x + (fp[1] - cam.pos.y) * fw.y + (fp[2] - cam.pos.z) * fw.z) * 0.93;
  const th = Math.tan((c.fov * Math.PI) / 360), H = 2 * D * th, W = H * (9 / 16);
  const up = new THREE.Vector3().crossVectors(cam.right, fw).normalize();
  const w = wf * W * k, h = (w * ch) / cw;
  out.fx.push({ key, cw, ch, draw, x: cam.pos.x + fw.x * D + cam.right.x * sx * W / 2 + up.x * sy * H / 2,
    y: cam.pos.y + fw.y * D + cam.right.y * sx * W / 2 + up.y * sy * H / 2, z: cam.pos.z + fw.z * D + cam.right.z * sx * W / 2 + up.z * sy * H / 2, w, h });
};
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
/** a popping card: scales in over 6 f with a small overshoot */
const popS = (f: number, f0: number) => 0.3 + 0.7 * pop(f, f0, 7);

// ---------------- underwater life ----------------
/** bubbles rising from `p` (a column), seed-varied */
const bubbles = (out: Stage, t: number, p: V3, n: number, spread = 0.25, seed = 0, size = 0.12) => {
  for (let i = 0; i < n; i++) {
    const k = i + seed * 40, rate = 0.55 + 0.4 * hh(k, 1), u = (t * rate + hh(k, 2)) % 1, s = size * (0.6 + 0.8 * hh(k, 3));
    const y = p[1] + u * 3.2;
    if (y > -0.15) continue;
    out.fx.push({ key: "bubble", cw: 64, ch: 64, draw: fxBubble, x: p[0] + (hh(k, 4) - 0.5) * spread * 2 + 0.08 * Math.sin(t * 3 + k), y, z: p[2] + (hh(k, 5) - 0.5) * spread * 2, w: s, h: s, soft: true });
  }
};
/** soft sun shafts slanting down through the water around c */
const rays = (out: Stage, cam: CamInfo, c0: V3, n = 5) => {
  const fw = cam.fwd ?? new THREE.Vector3(), c: V3 = [c0[0] + fw.x * 4, c0[1], c0[2] + fw.z * 4]; // behind the subject
  for (let i = 0; i < n; i++) {
    const sr = (i - (n - 1) / 2) * 2.2 + (hh(i, 1) - 0.5), w = 1.2 + hh(i, 2) * 1.2;
    card(out, cam, "ray", 128, 512, fxRay, [c[0], -0.1 - 4.2, c[2]], sr, 0, w, 8.4, true, 0.22);
  }
};
const FISHC: [string, string][] = [["#f2a33a", "#ffffff"], ["#5ab0c8", "#f2c84a"], ["#f2c84a", "#3f6fb5"], ["#e8607a", "#fff3c4"]];
/** a fish swimming from a to b over [f0, f1] (or looping), flipped to face where it goes on screen */
const fish = (out: Stage, cam: CamInfo, f: number, i: number, a: V3, b: V3, f0: number, f1: number, size = 0.42) => {
  const u = (((f - f0) / (f1 - f0)) % 1 + 1) % 1, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u + 0.08 * Math.sin(f * 0.2 + i), z = a[2] + (b[2] - a[2]) * u;
  const dir = (b[0] - a[0]) * cam.right.x + (b[2] - a[2]) * cam.right.z, k = q(Math.sin(f * 0.6 + i * 2), 4), [c1, c2] = FISHC[i % 4];
  out.fx.push({ key: `fish${i % 4}|${k}`, cw: 300, ch: 200, draw: (p) => fxFish(p, k, c1, c2), x, y, z, w: (dir < 0 ? -1 : 1) * size, h: size * 0.67 });
};
/** a little school: n fish around a moving centre */
const school = (out: Stage, cam: CamInfo, f: number, a: V3, b: V3, f0: number, f1: number, n: number, seed = 0, size = 0.36) => {
  for (let i = 0; i < n; i++) {
    const k = i + seed * 20, d: V3 = [(hh(k, 1) - 0.5) * 2.2, (hh(k, 2) - 0.5) * 1.4, (hh(k, 3) - 0.5) * 2.2];
    fish(out, cam, f + hh(k, 4) * 12, k, add(a, d), add(b, d), f0, f1, size * (0.8 + 0.4 * hh(k, 5)));
  }
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f);
  LNAME = s.light;
  HUD_ID = id; HUD_F = f;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      put(out, cam, t, 1, DINO_ON, "dinoOn", DINO_R, { expr: "smile", prop: "spear" });
      bubbles(out, t, off(DINO_R, 0.05, 1.95, 0), 7, 0.12, 1);
      rays(out, cam, off(DINO_R, 0, 0, 2));
      school(out, cam, f, at(31, 6, 2.2), at(20, 4, 2.6), 0, 300, 6, 1);
      fish(out, cam, f, 7, at(21, -1, 1.2), at(33, 0, 1.6), -40, 200, 0.5);
      if (f >= 109) hud(out, cam, "tankX", 400, 520, fxTankX, 0.5, 0.42, 0.36, popS(f, 109));
      break;
    }
    case 2: {
      if (f >= 196) hud(out, cam, "boardBajau", 640, 340, (p) => fxSign2(p, "SUKU BAJAU", "SULAWESI"), 0, 0.64, 0.66, popS(f, 196));
      put(out, cam, t, 1, DINO_UP, "dinoUp", DINO_D, { expr: "grin", prop: "spear", wave: Math.sin(t * 6) * 0.5 + 0.5 });
      put(out, cam, t, 61, VILL[3], "vk", off(DINO_D, -2.4, 0, 1.6), { expr: "smile", facing: -1 });
      break;
    }
    case 3: {
      const p = swim3(f);
      putSide(out, cam, t, 1, DINO_ON, "dinoOn", p, 0, -1, "smile", "swim");
      bubbles(out, t, off(p, 0, 0.3, -1.6), 4, 0.15, 2, 0.1);
      rays(out, cam, off(p, -1, 0, 0));
      school(out, cam, f, at(25, 0, 3.0), at(25, -12, 2.7), 220, 420, 5, 2);
      if (f >= 303) hud(out, cam, "clock" + q((f - 303) / 10, 4), 420, 520, (pp) => fxClock(pp, (f - 303) / 10), -0.45, 0.55, 0.36, popS(f, 303));
      break;
    }
    case 4: {
      const shake = f >= 383 && f < 406, fc = (i: number): -1 | 0 | 1 => (shake ? ((Math.floor((f - 383) / 4) + i) % 2 ? 1 : -1) : 0);
      TOURISTS.forEach((o, i) => put(out, cam, t, 70 + i, o, `tour${i}`, off(TOUR, (i % 2) * -0.4, 0, (i - 1) * 0.78), { expr: f < 380 ? "neutral" : i === 1 ? "shock" : "nervous", facing: fc(i), prop: i === 0 && f >= 408 ? "point" : null }));
      if (f >= 408) hud(out, cam, "speech", 760, 380, (p) => fxSpeech(p, "ITU ORANG", "ATAU IKAN?"), 0.05, 0.62, 0.86, popS(f, 408));
      break;
    }
    case 5: {
      const k = jumpK(f);
      if (k < 0.85) {
        const p: V3 = [DIVE[0] + 1.3 * k, FLOOR + 1.1 * Math.sin(Math.PI * Math.min(1, k * 1.4)) - 4.5 * k * k, DIVE[2]];
        put(out, cam, t, 75, DIVER, "diver", p, { expr: f < 500 ? "grin" : f < 521 ? "smile_closed" : "shock", prop: f >= 503 && k === 0 ? "fins" : null, tilt: -40 * k, float: k > 0 });
      }
      if (f >= 534) { const u = q(clamp01((f - 534) / 18), 18); card(out, cam, `splash${u}`, 800, 800, (p) => fxSplash(p, u), [DIVE[0] + 1.0, 0, DIVE[2]], 0, 1.3, 2.6, 2.6); }
      break;
    }
    case 6: {
      const up = f >= 604 ? easeOut((f - 604) / 9) : 0;
      if (up > 0) put(out, cam, t, 75, DIVER, "diver", [HEAD[0], HEAD[1] - 1.4 * (1 - up) + 0.04 * Math.sin(t * 9), HEAD[2]], { expr: Math.floor(f / 5) % 2 ? "shock" : "pained", float: true, wave: 1 });
      if (f >= 606) { const u = q(clamp01((f - 606) / 18), 18); card(out, cam, `splash${u}`, 800, 800, (p) => fxSplash(p, u), [HEAD[0], 0, HEAD[2]], 0, 0.62, 1.6, 1.6); }
      if (f >= 558) hud(out, cam, "stopwatch" + q(Math.min(0.5, (f - 558) / 60), 16), 380, 460, (p) => fxStopwatch(p, Math.min(0.5, (f - 558) / 60)), -0.5, 0.55, 0.36, popS(f, 558));
      break;
    }
    case 7: {
      const p = swim7(f);
      putSide(out, cam, t, 1, DINO_ON, "dinoOn", p, 1, 0, "grin", "swim");
      school(out, cam, f, add(p, [2.4, 0.4, 0.2]), add(p, [2.6, 0.4, 0.2]), 0, 100000, 5, 3, 0.4);
      bubbles(out, t, add(p, [-1.2, 0.3, 0]), 4, 0.15, 4, 0.1);
      rays(out, cam, add(p, [1, 0, 0]));
      break;
    }
    case 8: {
      if (f >= 772) hud(out, cam, "board2018", 640, 270, (p) => fxBoard(p, "2018"), 0, 0.68, 0.5, popS(f, 772));
      const k = smooth((f - 768) / 70), z0 = -3.4 + 1.8 * k, walking = f < 836;
      putSide(out, cam, t, 81, SCI1, "sci1", deckAt(-5.9, z0), 0, 1, "smile", walking ? "walk" : "stand");
      putSide(out, cam, t, 82, SCI2, "sci2", deckAt(-4.7, z0 - 1.0), 0, 1, "smile", walking ? "walk" : "stand");
      out.fx.push({ key: `usg${f >= 861 ? 1 : 0}`, cw: 520, ch: 820, draw: (p) => fxUSG(p, f >= 861 ? 1 : 0), x: -5.2, y: FLOOR + 0.62, z: z0 + 0.9, w: 0.75, h: 1.18 });
      put(out, cam, t, 1, DINO_UP, "dinoUp", off(DINO_D, 0, 0, 0.6), { expr: f < 840 ? "neutral" : "smile", facing: -1 });
      break;
    }
    case 9: {
      const sci = off(DINO_D, 0.1, 0, 0.95);
      put(out, cam, t, 81, SCI1, "sci1", sci, { expr: "stern", prop: "probe", facing: 1 });
      put(out, cam, t, 1, DINO_UP, "dinoUp", DINO_D, { expr: f < 990 ? "nervous" : "shock", facing: -1, look: -1 });
      if (f >= 888 && f < 960) card(out, cam, "question", 300, 400, fxQuestion, DINO_D, 0.05, 2.45 + 0.03 * Math.sin(t * 5), 0.32, 0.43, false, -0.15);
      if (f >= 962) hud(out, cam, "lungsX", 400, 400, fxLungsX, 0.42, 0.6, 0.34, popS(f, 962));
      if (f >= 999) { const k = popS(f, 999); card(out, cam, "arrow", 300, 300, fxArrow, DINO_D, 0.55, 1.35, 0.42 * k, 0.42 * k); }
      break;
    }
    case 10: {
      put(out, cam, t, 1, DINO_UP, "dinoUp", DINO_D, { expr: f < 1100 ? "smile" : "grin", facing: 0 });
      hud(out, cam, "spleens" + q(clamp01((f - 1101) / 8), 8), 960, 640, (p) => fxSpleens(p, clamp01((f - 1101) / 8)), 0, 0.6, 0.92, popS(f, 1030));
      break;
    }
    case 11: {
      put(out, cam, t, 1, DINO_UP, "dinoUp", DINO_D, { expr: "smile", facing: 0, prop: f >= 1180 ? "point" : null });
      const u = f >= 1237 ? q((f - 1237) / 30, 15) : 0;
      hud(out, cam, "tank" + u, 860, 640, (p) => fxTank(p, u), 0, 0.6, 0.9, popS(f, 1165));
      break;
    }
    case 12: {
      const p = swim12(f);
      putSide(out, cam, t, 1, DINO_ON, "dinoOn", p, 1, 0, "stern", "swim", 0.45);
      const sq = f < 1346 ? 0 : 0.5 + 0.5 * Math.sin((f - 1346) * 0.35), flow = f < 1379 ? 0 : (f - 1379) / 40;
      if (f >= 1318) hud(out, cam, `squeeze${q(sq, 10)}|${q(flow % 1, 12)}`, 720, 420, (pp) => fxSqueeze(pp, sq, flow), 0.1, 0.6, 0.8, popS(f, 1318));
      bubbles(out, t, add(p, [-0.6, 0.6, 0]), 5, 0.2, 5, 0.1);
      rays(out, cam, add(p, [0, 0, 1]));
      break;
    }
    case 13: {
      const p = add(FLOAT13, [0, 0.06 * Math.sin(t * 2), 0]);
      put(out, cam, t, 1, DINO_ON, "dinoOn", p, { expr: f < 1503 ? "neutral" : "grin", float: true, wave: f >= 1505 ? 1 : undefined });
      const on = f >= 1503, lvl = on ? 0.12 + 0.88 * smooth((f - 1503) / 40) : 0.8 - 0.68 * smooth((f - 1440) / 60);
      hud(out, cam, `batt${on ? 1 : 0}|${q(lvl, 30)}`, 800, 420, (pp) => fxBattery(pp, lvl, on), 0, 0.62, 0.8);
      bubbles(out, t, add(p, [0.05, 1.95, 0]), 5, 0.12, 6);
      rays(out, cam, add(p, [0, 0, 2]));
      school(out, cam, f, add(FLOAT13, [4, 0.6, 2]), add(FLOAT13, [-5, 0.8, 2]), 1400, 1650, 5, 5);
      break;
    }
    case 14: {
      put(out, cam, t, 91, NENEK, "nenek", off(NB, 0.3, 0, 0.25), { expr: "smile_closed", prop: "lontar" });
      put(out, cam, t, 92, KID, "kid", off(NB, 0.6, 0, -0.5), { expr: f < 1640 ? "smile" : "grin" });
      put(out, cam, t, 81, SCI1, "sci1", off(NB, -0.6, 0, -1.6), { expr: "grin", facing: 1 });
      out.fx.push({ key: "usgBig", cw: 520, ch: 820, draw: (p) => fxUSG(p, 1, true), x: NB[0] - 0.3, y: FLOOR + 0.62, z: NB[2] - 2.5, w: 0.75, h: 1.18 });
      if (f >= 1646) hud(out, cam, "stamp", 820, 320, (p) => fxStamp(p, "LIMPA BESAR!"), 0, 0.66, 0.9, popS(f, 1646));
      break;
    }
    case 15: {
      put(out, cam, t, 1, DINO_UP, "dinoUp", DINO_D, { expr: "grin", wave: 1, prop: "spear" });
      put(out, cam, t, 91, NENEK, "nenek", off(NB, 0, 0, 0), { expr: "smile" });
      put(out, cam, t, 92, KID, "kid", off(NB, 0.5, 0, 1.2), { expr: "grin", wave: 1 });
      VILL.forEach((o, i) => put(out, cam, t, 95 + i, o, `vill${i}`, deckAt(-5 - i * 0.7, 20 + i * 1.3), { expr: "smile" }));
      break;
    }
    case 16: {
      const p = add(FLOAT16, [0, 0.06 * Math.sin(t * 2), 0]);
      put(out, cam, t, 1, DINO_ON, "dinoOn", p, { expr: "grin", float: true, wave: Math.sin(t * 6) * 0.5 + 0.5, prop: "spear" });
      bubbles(out, t, add(p, [0.05, 1.95, 0]), 6, 0.12, 7);
      rays(out, cam, add(p, [0, 0, 2.5]));
      school(out, cam, f, add(FLOAT16, [-5, 1.0, 2.2]), add(FLOAT16, [5, 1.4, 2.2]), 1700, 1900, 7, 6);
      fish(out, cam, f, 3, add(FLOAT16, [3, 2.6, 1]), add(FLOAT16, [-3, 2.4, 1]), 1720, 1830, 0.5);
      break;
    }
  }
  return out;
};
