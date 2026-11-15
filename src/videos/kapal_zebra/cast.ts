// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Pak Dino, the tourists, the city diver, the scientists, Bajau villagers, plus the effect cards (fish,
// bubbles, sun shafts, infographic cards). stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxPuff, INK, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion, fxSparkle } from "./bugs";
import { fxSpeech, fxStamp, fxSign2, fxCheck, fxStopwatch, fxBubble, fxLabel, fxArrowH, fxSpeedo, fxZap, fxBall, fxXmark, fxCross, fxGhost, fxDown } from "./fx";
import { camAt, focusAt, FPS, SHOTS, V3, clamp01, smooth, hh as hh0, quay, shipAt, shipPt, COM, SUB, SUB_DOWN, POV_Y, BALL_A, BALL_B, torpAt, wakeHead, WAKE_Z } from "./story";
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
/** "you": the submarine commander: navy coat, white cap, gold buttons */
const CMDR: Outfit = { jacket: "#24365a", pants: "#2a2f3a", boots: INK, hat: "cap", cap: "#f4f1ea", buttons: "#e8c45a", skin: "#f1c9a2" };
const SAILORS: Outfit[] = [0, 1, 2, 3, 4, 5].map((v) => ({
  jacket: ["#efe4c8", "#5a7aa0", "#b5653f", "#e8dcc0", "#8c3b4a", "#6f8a4a"][v], pants: ["#5a4a3a", "#3b3f52", "#4a3a2c"][v % 3],
  boots: "#3a2a20", hat: "cap", cap: ["#e2453c", "#3f6fb5", "#d9a441", "#2f5f6a"][v % 4], skin: ["#ffe2c2", "#c99067", "#ecd0b6"][v % 3],
  moustache: v % 3 === 1 ? "#5a3b2a" : undefined,
}));
const BOY: Outfit = { jacket: "#3f8f55", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#e2453c", build: "kid", skin: "#ffe2c2" };
const GIRL: Outfit = { jacket: "#f2c84a", pants: "#2f3f6a", boots: "#a8714a", hat: "hair", hair: "#3a2418", build: "kid", skin: "#c99067" };

const FRONT = { side: false, mirror: false };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number; float?: boolean; roll?: number };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  const pl = person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], FRONT, fo, {}, scale);
  if (opt.roll) pl.roll = opt.roll;
  out.places.push(pl);
  if (!opt.float) blob(out, p[0], p[1], p[2], scale);
};
/** profile view: (dx, dz) = where they look / walk */
const putSide = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, dx: number, dz: number, expr: Expr, how: "stand" | "walk" = "stand") => {
  const v = viewOf(cam, p[0], p[2], dx, dz);
  const phase = how === "walk" ? q((t * 2.6 + hh(i, 7)) % 1, 12) : 0;
  const so: SideOpts = { mode: how === "walk" ? "march" : "stand", expr, blink: lidAt(t, i), pose: 0, phase, stride: how === "walk" ? 0.8 * v.fs : 0 };
  const fo: FrontOpts = { mode: how === "walk" ? "march" : "stand", expr, blink: lidAt(t, i), facing: v.mirror ? -1 : 1, phase };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1], p[2], v, fo, so));
  blob(out, p[0], p[1], p[2]);
};
const off = (p: V3, dx: number, dy = 0, dz = 0): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];
/** a camera-facing effect card at `p` + screen-right * sr + up * su */
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: p[0] + cam.right.x * sr, y: p[1] + su, z: p[2] + cam.right.z * sr, w, h, soft, rot });
/** a card lying flat on the water / ground, rot about the vertical */
const flat = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, w: number, h: number, rot = 0, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x: p[0], y: p[1], z: p[2], w, h, flat: true, rot, soft });
/** a card pinned to the frame: (sx, sy) in -1..1 screen units (sy up), wf = width as a share of the frame width */
let HUD_ID = 1, HUD_F = 0;
const hud = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, sx: number, sy: number, wf: number, k = 1) => {
  const c = camAt(HUD_ID, HUD_F), fp = focusAt(HUD_ID, HUD_F), fw = cam.fwd ?? new THREE.Vector3(0, 0, -1);
  const D = Math.min(30, Math.max(1.6, (fp[0] - cam.pos.x) * fw.x + (fp[1] - cam.pos.y) * fw.y + (fp[2] - cam.pos.z) * fw.z) * 0.93);
  const th = Math.tan((c.fov * Math.PI) / 360), H = 2 * D * th, W = H * (9 / 16);
  const up = new THREE.Vector3().crossVectors(cam.right, fw).normalize();
  const w = wf * W * k, h = (w * ch) / cw;
  out.fx.push({ key, cw, ch, draw, x: cam.pos.x + fw.x * D + cam.right.x * sx * W / 2 + up.x * sy * H / 2,
    y: cam.pos.y + fw.y * D + cam.right.y * sx * W / 2 + up.y * sy * H / 2, z: cam.pos.z + fw.z * D + cam.right.z * sx * W / 2 + up.z * sy * H / 2, w, h });
};
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
const popS = (f: number, f0: number) => 0.3 + 0.7 * pop(f, f0, 7);
/** POV hud y of the mask centre */
const PY = 1 - 2 * POV_Y;

// ---------------- helpers of this short ----------------
/** sailors on the quay in front of the moored steamer */
const QSAIL: V3[] = [quay(-2.0, -1.6), quay(-3.1, -0.3), quay(-2.2, 1.0), quay(-3.4, 2.2), quay(-2.5, 3.3), quay(-3.6, -2.8)];
const bubbles = (out: Stage, cam: CamInfo, f: number, p: V3, n: number, seed: number, spread = 1) => {
  for (let i = 0; i < n; i++) {
    const u = (f * 0.02 + hh(i, seed)) % 1, x = p[0] + (hh(i, seed + 1) - 0.5) * spread * 2, z = p[2] + (hh(i, seed + 2) - 0.5) * spread;
    const s = 0.12 + 0.18 * hh(i, seed + 3);
    card(out, cam, "bubble", 120, 120, fxBubble, [x + 0.3 * Math.sin(f * 0.1 + i), p[1] + u * 4, z], 0, 0, s, s);
  }
};

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f), sh = shipAt(id, f);
  LNAME = s.light;
  HUD_ID = id; HUD_F = f;
  findSun(cam, SUN);
  const shipMid = shipPt({ ...sh, roll: 0 }, [0, 0, 0]);
  switch (id) {
    case 1: {
      if (f >= 33) hud(out, cam, "lblRibuan", 640, 220, (p) => fxLabel(p, "RIBUAN KAPAL"), 0, 0.66, 0.66, popS(f, 33));
      break;
    }
    case 2: {
      put(out, cam, t, 1, CMDR, "cmdr", COM, { expr: f < 200 ? "neutral" : "grin", facing: -1, prop: f >= 230 ? "spyglass" : null });
      if (f >= 181) card(out, cam, "lblKamu", 640, 220, (p) => fxLabel(p, "KAMU"), COM, 0, 2.95, 1.2, 0.41);
      if (f >= 181) card(out, cam, "down", 300, 400, fxDown, COM, 0, 2.45 + 0.05 * Math.sin(t * 8), 0.34, 0.45);
      if (f >= 247) hud(out, cam, "sign1918", 640, 340, (p) => fxSign2(p, "TAHUN", "1918"), 0, 0.64, 0.56, popS(f, 247));
      break;
    }
    case 3: {
      bubbles(out, cam, f, [SUB[0], SUB_DOWN + 2, SUB[2]], 10, 3, 6);
      if (f >= 380) hud(out, cam, "watch5", 380, 460, (p) => fxStopwatch(p, q(((f - 380) / 60) % 1, 30), "5 DTK"), 0.55, 0.6, 0.3, popS(f, 380));
      break;
    }
    case 5: {
      if (f >= 620 && f < 643) { const u = q((f - 620) / 23, 12); hud(out, cam, "zap" + u, 500, 500, (p) => fxZap(p, u), 0, 0.42, 0.6); }
      break;
    }
    case 7: {
      if (f >= 714) { const p = shipPt(sh, [0, 22, 0]); card(out, cam, "down", 300, 400, fxDown, p, 0, 8 + 3 * Math.sin(t * 7), 18, 24); }
      break;
    }
    case 8: case 9: {
      const laugh = id === 9 && f >= 894;
      QSAIL.forEach((p, i) => {
        const expr: Expr = id === 8 ? (f < 790 ? "neutral" : i % 2 ? "dazed" : "nervous") : laugh ? (i % 2 || i === 0 ? "laugh" : "grin") : i === 0 ? "grin" : "nervous";
        put(out, cam, t, 300 + i, SAILORS[i], "sail" + i, p, { expr, facing: i % 2 ? 1 : -1, prop: id === 8 && i === 2 ? "scratch" : id === 9 && i === 0 ? "point" : null }, 1, laugh && i % 2 ? 0.05 * Math.abs(Math.sin(t * 14 + i)) : 0);
      });
      if (id === 8 && f >= 806) card(out, cam, "question", 300, 400, fxQuestion, QSAIL[2], 0.5, 2.3 + 0.03 * Math.sin(t * 5), 0.5, 0.66, false, -0.15);
      if (id === 8 && f >= 816) card(out, cam, "question", 300, 400, fxQuestion, QSAIL[1], -0.4, 2.4 + 0.03 * Math.sin(t * 6), 0.42, 0.56, false, 0.15);
      if (id === 9 && f >= 875) hud(out, cam, "speechBadut", 760, 380, (p) => fxSpeech(p, "KOSTUM", "BADUT?"), 0.02, 0.62, 0.86, popS(f, 875));
      break;
    }
    case 11: {
      if (f >= 1019) hud(out, cam, "arrL", 600, 300, (p) => fxArrowH(p, -1), -0.42, PY - 0.26, 0.36, popS(f, 1019));
      if (f >= 1042) hud(out, cam, "arrR", 600, 300, (p) => fxArrowH(p, 1), 0.42, PY - 0.26, 0.36, popS(f, 1042));
      if (f >= 1050) hud(out, cam, "question", 300, 400, fxQuestion, 0, PY - 0.26, 0.16, popS(f, 1050));
      break;
    }
    case 12: {
      hud(out, cam, "lblCepat", 640, 220, (p) => fxLabel(p, "CEPAT?", "#e2453c", "#ffffff"), -0.37, PY - 0.27, 0.34, popS(f, 1067));
      if (f >= 1081) hud(out, cam, "lblLambat", 640, 220, (p) => fxLabel(p, "LAMBAT?", "#7bd36a"), 0.37, PY - 0.27, 0.34, popS(f, 1081));
      break;
    }
    case 13: {
      if (f >= 1109) hud(out, cam, "lblDepan", 640, 220, (p) => fxLabel(p, "DEPAN?"), -0.5, PY + 0.17, 0.34, popS(f, 1109));
      if (f >= 1138) hud(out, cam, "lblDepan", 640, 220, (p) => fxLabel(p, "DEPAN?"), 0.5, PY + 0.17, 0.34, popS(f, 1138));
      break;
    }
    case 14: {
      put(out, cam, t, 1, CMDR, "cmdr", COM, { expr: f < 1185 ? "dazed" : "nervous", facing: 1, prop: "scratch", headTilt: 6 });
      if (f >= 1166) card(out, cam, "question", 300, 400, fxQuestion, COM, 0.5, 1.95 + 0.03 * Math.sin(t * 5), 0.36, 0.48, false, -0.15);
      if (f >= 1188) card(out, cam, "question", 300, 400, fxQuestion, COM, -0.5, 2.0 + 0.03 * Math.sin(t * 6), 0.3, 0.4, false, 0.2);
      break;
    }
    case 15: {
      const tp = torpAt(15, f).pos;
      bubbles(out, cam, f, [tp[0] - 4, tp[1] - 0.2, tp[2]], 12, 15, 2.2);
      if (f >= 1262) hud(out, cam, "lblPelan", 640, 220, (p) => fxLabel(p, "PELAN..."), 0, 0.6, 0.6, popS(f, 1262));
      break;
    }
    case 16: case 17: {
      const ghostZ = shipMid[2] - 40;
      const aim: V3 = id === 16 || f < 1392 ? [shipMid[0], 9.5, shipMid[2]] : [shipMid[0], 9.5 - 9 * smooth((f - 1392) / 20), shipMid[2] - 40 * smooth((f - 1392) / 20)];
      flat(out, "cross", 600, 600, (p) => fxCross(p), aim, 16, 16);
      if (id === 16 && f >= 1331) hud(out, cam, "xmark", 300, 300, fxXmark, 0, 0.0, 0.36, popS(f, 1331));
      if (id === 17 && f >= 1382) flat(out, "ghost", 300, 1200, fxGhost, [shipMid[0], 0.3, ghostZ], 11, 44);
      if (id === 17 && f >= 1413) hud(out, cam, "checkSini", 620, 280, (p) => fxCheck(p, "SINI"), 0, 0.62, 0.5, popS(f, 1413));
      break;
    }
    case 18: {
      const thrown = f >= 1481, land = 1581, u = clamp01((f - 1481) / (land - 1481));
      const run = smooth((f - 1512) / 30), catcher = off(BALL_B, 0, 0, 2.6 * (1 - run));
      put(out, cam, t, 2, BOY, "boy", BALL_A, { expr: thrown ? "grin" : "smile", facing: 1, prop: f >= 1470 && f < 1505 ? "throw" : null }, 1.25);
      if (f >= 1512 && f < 1542) putSide(out, cam, t, 3, GIRL, "girl", catcher, 0, -1, "grin", "walk");
      else put(out, cam, t, 3, GIRL, "girl", catcher, { expr: f >= land ? "laugh" : f >= 1542 ? "grin" : "smile", facing: -1, wave: f >= 1540 ? 1 : undefined }, 1.25);
      if (f >= 1550) flat(out, "xmark", 300, 300, fxXmark, off(BALL_B, 0, 0.03, 0.15), 1.2, 1.2);
      const a = off(BALL_A, 0, 2.0, 0.25), b = off(BALL_B, 0, 2.1, 0);
      const bp: V3 = !thrown ? a : f < land ? [a[0], a[1] + (b[1] - a[1]) * u + 4.6 * u * (1 - u), a[2] + (b[2] - a[2]) * u] : b;
      const spin = q((f * 0.15) % 6.28, 8);
      card(out, cam, "ball" + spin, 200, 200, (p) => fxBall(p, spin), bp, 0, 0, 0.36, 0.36);
      if (f >= land && f < land + 20) { const k = q((f - land) / 20, 10); card(out, cam, "spark" + k, 400, 400, (p) => fxSparkle(p, k), b, 0, 0.1, 1.2, 1.2); }
      break;
    }
    case 19: {
      if (f >= 1663) { const a = Math.sin((f - 1663) * 0.35) > 0 ? 1 : -1; hud(out, cam, a > 0 ? "arrR" : "arrL", 600, 300, (p) => fxArrowH(p, a), 0, PY - 0.27, 0.36, popS(f, 1663)); }
      if (f >= 1682) { const k = q(Math.sin((f - 1682) * 0.4), 10); hud(out, cam, "speedo" + k, 520, 360, (p) => fxSpeedo(p, k), 0.42, PY + 0.25, 0.3, popS(f, 1682)); }
      break;
    }
    case 20: {
      const head = wakeHead(f), z = shipMid[2] + WAKE_Z;
      for (let k = 0; k < 14; k++) {
        const x = shipMid[0] + head - k * 3.2;
        if (head - k * 3.2 < -70) continue;
        const u = q(clamp01(k / 14), 14);
        flat(out, "foam" + u, 300, 300, (p) => fxPuff(p, 0.15 + 0.4 * u), [x, 0.2, z + 0.4 * Math.sin(k)], 5 + k * 0.35, 5 + k * 0.35, k, false);
      }
      if (f >= 1794) hud(out, cam, "stampMeleset", 820, 320, (p) => fxStamp(p, "MELESET!"), 0, 0.6, 0.72, popS(f, 1794));
      break;
    }
    case 22: {
      const p = shipPt(sh, [-3.2, deckYAt(13.5), 13.5]);
      put(out, cam, t, 304, SAILORS[1], "sail1", p, { expr: f >= 1888 ? "grin" : "smile", wave: 0.5 + 0.5 * Math.sin(t * 7), float: true });
      if (f >= 1889) card(out, cam, "arrSign", 600, 300, (p2) => fxArrowH(p2, 1), shipPt(sh, [-6, 15, 11]), 0, 0, 10, 5);
      break;
    }
  }
  return out;
};
import { deckY as deckYAt } from "./zebra";
