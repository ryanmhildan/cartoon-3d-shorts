// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Pak Dino, the tourists, the city diver, the scientists, Bajau villagers, plus the effect cards (fish,
// bubbles, sun shafts, infographic cards). stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxSplash, fxPuff, townsfolk, INK, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion, fxBoard, fxSparkle } from "./bugs";
import { fxSpeech, fxStamp, fxSign2, fxCrown, fxWind, fxCG, fxCheck, fxEquals, fxBallast } from "./fx";
import { camAt, focusAt, FPS, SHOTS, V3, clamp01, smooth, hh as hh0, quay, QY, KID, KID12, OFFI, CANOE, DECKY, shipAt, shipPt, canoeRoll, ShipState } from "./story";
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
/** our witness: a boy in a green coat and red cap */
const BOY: Outfit = { jacket: "#3f8f55", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#e2453c", build: "kid", skin: "#ffe2c2" };
const SAILORS: Outfit[] = [0, 1, 2, 3, 4, 5].map((v) => ({
  jacket: ["#efe4c8", "#5a7aa0", "#b5653f", "#e8dcc0", "#8c3b4a", "#6f8a4a"][v], pants: ["#5a4a3a", "#3b3f52", "#4a3a2c"][v % 3],
  boots: "#3a2a20", hat: "cap", cap: ["#e2453c", "#3f6fb5", "#d9a441", "#2f5f6a"][v % 4], skin: ["#ffe2c2", "#f5c9a0", "#ecd0b6"][v % 3],
  moustache: v % 3 === 1 ? "#5a3b2a" : undefined,
}));
const ADMIRAL: Outfit = { jacket: "#1f2a44", pants: "#2a2a30", boots: INK, hat: "tophat", buttons: "#e8c45a", sash: "#d9a441", moustache: "#e8e0d0", build: "stout", skin: "#f5c9a0" };
const OFF1: Outfit = { jacket: "#2a2a30", pants: "#2a2a30", boots: INK, hat: "tophat", buttons: "#d9dde0", moustache: "#4a3020", skin: "#ffe2c2" };
const OFF2: Outfit = { jacket: "#5a3b5a", pants: "#2a2a30", boots: INK, hat: "tophat", buttons: "#e8c45a", build: "stout", skin: "#ecd0b6" };
/** the man in the little boat (the viewer's stand-in): yellow tee, navy shorts, black hair */
const BOATMAN: Outfit = { jacket: "#f2c84a", pants: "#2f3f6a", boots: "#a8714a", hat: "hair", hair: "#1f1a18", skin: "#c99067" };

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
const putSide = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, dx: number, dz: number, expr: Expr, how: "stand" | "walk" = "stand", roll = 0) => {
  const v = viewOf(cam, p[0], p[2], dx, dz);
  const phase = how === "walk" ? q((t * 2.6 + hh(i, 7)) % 1, 12) : 0;
  const so: SideOpts = { mode: how === "walk" ? "march" : "stand", expr, blink: lidAt(t, i), pose: 0, phase, stride: how === "walk" ? 0.8 * v.fs : 0 };
  const fo: FrontOpts = { mode: how === "walk" ? "march" : "stand", expr, blink: lidAt(t, i), facing: v.mirror ? -1 : 1, phase };
  const pl = person(cam, { i, o, okey }, p[0], p[1], p[2], v, fo, so);
  if (roll) pl.roll = roll;
  out.places.push(pl);
  if (!roll) blob(out, p[0], p[1], p[2]);
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
  const D = Math.min(HUD_ID === 6 || HUD_ID === 7 ? 9 : 30, Math.max(1.6, (fp[0] - cam.pos.x) * fw.x + (fp[1] - cam.pos.y) * fw.y + (fp[2] - cam.pos.z) * fw.z) * 0.93);
  const th = Math.tan((c.fov * Math.PI) / 360), H = 2 * D * th, W = H * (9 / 16);
  const up = new THREE.Vector3().crossVectors(cam.right, fw).normalize();
  const w = wf * W * k, h = (w * ch) / cw;
  out.fx.push({ key, cw, ch, draw, x: cam.pos.x + fw.x * D + cam.right.x * sx * W / 2 + up.x * sy * H / 2,
    y: cam.pos.y + fw.y * D + cam.right.y * sx * W / 2 + up.y * sy * H / 2, z: cam.pos.z + fw.z * D + cam.right.z * sx * W / 2 + up.z * sy * H / 2, w, h });
};
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
/** a popping card: scales in over 6 f with a small overshoot */
const popS = (f: number, f0: number) => 0.3 + 0.7 * pop(f, f0, 7);

// ---------------- helpers of this short ----------------
/** people on the quay: n spots in loose rows from z0 along +z (x from the quay edge inland) */
const crowdAt = (n: number, z0: number, cols = 4, dz = 1.25, x0 = -2.0): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) out.push(quay(x0 - (i % cols) * 1.35 - hh(i, 1) * 0.5, z0 + Math.floor(i / cols) * dz + hh(i, 2) * 0.45 + (i % cols) * 0.3));
  return out;
};
const folk = (i: number) => townsfolk(i);
const crowd = (out: Stage, cam: CamInfo, t: number, pts: V3[], mood: "calm" | "cheer" | "shock" | "puzzled", base = 200) => {
  pts.forEach((p, i) => {
    const expr: Expr = mood === "cheer" ? (i % 3 ? "grin" : "laugh") : mood === "shock" ? "shock" : mood === "puzzled" ? (i % 2 ? "nervous" : "dazed") : (i % 2 ? "smile" : "neutral");
    const wave = mood === "cheer" && i % 2 === 0 ? 0.5 + 0.5 * Math.sin(t * 7 + i) : undefined;
    put(out, cam, t, base + i, folk(i), "folk" + i, p, { expr, wave, facing: i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0 });
  });
};
/** wind swooshes crossing the frame right to left, starting at the given frames */
const winds = (out: Stage, cam: CamInfo, f: number, starts: number[], sy0 = 0.2) => {
  starts.forEach((s, i) => {
    const u = (f - s) / 34;
    if (u < 0 || u > 1) return;
    const k = q(u, 17);
    hud(out, cam, "wind|" + k, 700, 240, (p) => fxWind(p, k), 1.5 - 3.0 * u, sy0 + 0.32 * ((i * 0.37) % 1) - 0.12, 0.7);
  });
};
/** sailors running back and forth across the main deck during the stability test */
const ROWS = [-8, -6.2, -4.4, -2.6, 2.0, 3.8];
const sailorsTest = (out: Stage, cam: CamInfo, f: number, sh: ShipState, mood: "ready" | "run" | "shock") => {
  const t = T(f);
  for (let i = 0; i < 30; i++) {
    const r = Math.floor(i / 5), c = i % 5, z = ROWS[r] + (c - 2) * 0.3, lane = (c - 2) * 0.55;
    const ph = (f - 657) * 0.085 + r * 0.25, run = mood !== "ready";
    const x = run && f >= 657 ? 2.6 * Math.cos(ph) + lane * 0.3 : 2.6 + lane * 0.3, dir = run && f >= 657 ? -Math.sin(ph) : 0;
    const p = shipPt(sh, [x, deckYAt(z), z]);
    const expr: Expr = mood === "shock" ? (i % 2 ? "shock" : "nervous") : mood === "run" ? (i % 3 ? "stern" : "grin") : "neutral";
    const roll = -sh.roll;
    if (Math.abs(dir) > 0.15 && mood === "run") putSide(out, cam, t, 300 + i, SAILORS[i % 6], "sail" + (i % 6), p, dir, 0, expr, "walk", roll || 1e-6);
    else put(out, cam, t, 300 + i, SAILORS[i % 6], "sail" + (i % 6), p, { expr, roll: roll || undefined, float: true });
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
  switch (id) {
    case 1: {
      crowd(out, cam, t, crowdAt(20, -24, 4, 2.2), "shock");
      for (let k = 0; k < 5; k++) { // foam where the heeled hull meets the water
        const z = -12 + k * 6, p = shipPt(sh, [halfW(z, 1) + 0.5, 0, z]), u = q(((f + k * 7) % 26) / 26, 13);
        card(out, cam, "splash" + u, 800, 800, (pp) => fxSplash(pp, u), [p[0], 0, p[2]], 0, 1.4, 4.2, 4.2);
      }
      if (f >= 121) hud(out, cam, "board1km", 640, 270, (p) => fxBoard(p, "± 1 KM"), 0, 0.62, 0.56, popS(f, 121));
      break;
    }
    case 2: {
      crowd(out, cam, t, crowdAt(10, -14, 3, 3), "calm");
      if (f >= 160) hud(out, cam, "signSthlm", 640, 340, (p) => fxSign2(p, "STOCKHOLM", "1628"), 0, 0.62, 0.66, popS(f, 160));
      break;
    }
    case 3: {
      put(out, cam, t, 1, BOY, "boy", KID, { expr: f < 300 ? "shock" : "grin", headTilt: -8 });
      put(out, cam, t, 201, folk(1), "folk1", off(KID, -1.4, 0, -1.9), { expr: "smile", facing: 1 });
      put(out, cam, t, 202, folk(2), "folk2", off(KID, -2.6, 0, 1.7), { expr: "neutral", facing: 1 });
      if (f >= 287) hud(out, cam, "signVasa", 640, 340, (p) => fxSign2(p, "VASA", "KAPAL RAJA"), 0, 0.6, 0.66, popS(f, 287));
      if (f >= 338) hud(out, cam, "crown", 420, 320, fxCrown, 0.0, 0.86, 0.3, popS(f, 338));
      break;
    }
    case 4: {
      if (f >= 438) hud(out, cam, "board2dek", 640, 270, (p) => fxBoard(p, "2 DEK MERIAM"), 0, 0.62, 0.66, popS(f, 438));
      if (f >= 462 && f < 486) {
        const u = q((f - 462) / 24, 12);
        PORTS.forEach((pt, i) => {
          if (i % 2) return;
          const p = shipPt(sh, [halfW(pt.z, pt.y) + 1.4, pt.y, pt.z]);
          card(out, cam, "puff" + u, 300, 300, (pp) => fxPuff(pp, u), p, 0, 0, 1.4, 1.4, true);
        });
      }
      break;
    }
    case 5: {
      if (f >= 522) {
        const u = q(((f - 522) / 30) % 1, 15);
        card(out, cam, "spark" + u, 400, 400, (p) => fxSparkle(p, u), [9, 10.5, 19.8], -1.8, 0, 2.4, 2.4);
        const u2 = q((u + 0.5) % 1, 15);
        if (f >= 570) card(out, cam, "spark" + u2, 400, 400, (p) => fxSparkle(p, u2), [9, 8.2, 19.8], 1.6, 0, 2.6, 2.6);
      }
      break;
    }
    case 6: {
      sailorsTest(out, cam, f, sh, f < 657 ? "ready" : "run");
      if (f >= 619) hud(out, cam, "board30", 640, 270, (p) => fxBoard(p, "30 PELAUT"), 0, 0.64, 0.56, popS(f, 619));
      break;
    }
    case 7: {
      sailorsTest(out, cam, f, sh, f < 745 ? "run" : "shock");
      if (f >= 777) hud(out, cam, "stampStop", 820, 320, (p) => fxStamp(p, "STOP!"), 0, 0.62, 0.72, popS(f, 777));
      break;
    }
    case 8: {
      const shake = f >= 911 && f < 940, fc = (i: number): -1 | 0 | 1 => (shake ? ((Math.floor((f - 911) / 4) + i) % 2 ? 1 : -1) : i ? -1 : 1);
      put(out, cam, t, 211, OFF1, "off1", OFFI, { expr: f < 860 ? "neutral" : "nervous", facing: fc(0), prop: f >= 840 && f < 905 ? "point" : null });
      put(out, cam, t, 212, OFF2, "off2", off(OFFI, 0.3, 0, -1.15), { expr: f < 905 ? "nervous" : "shock", facing: fc(1) });
      if (f >= 862) hud(out, cam, "speechJelek", 760, 380, (p) => fxSpeech(p, "KAPAL RAJA", "JELEK?"), 0.02, 0.62, 0.86, popS(f, 862));
      break;
    }
    case 9: {
      crowd(out, cam, t, crowdAt(24, 4, 4, 1.3), f < 970 ? "calm" : "cheer");
      put(out, cam, t, 1, BOY, "boy", quay(-1.6, 14.5), { expr: f < 970 ? "smile" : "laugh", wave: f >= 970 ? 0.5 + 0.5 * Math.sin(t * 8) : undefined });
      if (f >= 934) hud(out, cam, "board10ags", 640, 270, (p) => fxBoard(p, "10 AGUSTUS"), 0, 0.64, 0.6, popS(f, 934));
      if (f >= 976 && f < 1012) {
        PORTS.forEach((pt, i) => {
          if (pt.y < 3 || i % 3) return;
          const u = q(clamp01((f - 976 - i) / 26), 13), p = shipPt(sh, [-(halfW(pt.z, pt.y) + 1.6), pt.y, pt.z]);
          if (u > 0 && u < 1) card(out, cam, "puff" + u, 300, 300, (pp) => fxPuff(pp, u), p, 0, 0, 3.2, 3.2, true);
        });
      }
      break;
    }
    case 10: {
      winds(out, cam, f, [1028, 1036, 1046, 1054, 1062]);
      break;
    }
    case 11: {
      if (f < 1150) {
        PORTS.forEach((pt, i) => {
          if (pt.y > 2) return;
          const p = shipPt(sh, [halfW(pt.z, pt.y), pt.y, pt.z]);
          if (p[1] > 0.5) return;
          const yw = Math.min(6, 5 * Math.tan(Math.abs(sh.roll))), w = shipPt(sh, [halfW(pt.z, yw) + 0.15, yw, pt.z]);
          const u = q(((f + i * 5) % 22) / 22, 11);
          card(out, cam, "splash" + u, 800, 800, (pp) => fxSplash(pp, u), [w[0], 0, w[2]], 0, 0.7, 1.8, 1.8);
        });
      } else {
        crowd(out, cam, t, crowdAt(20, -4, 4, 1.4), "shock");
        put(out, cam, t, 1, BOY, "boy", quay(-1.9, 5.5), { expr: "shock" });
        for (let k = 0; k < 4; k++) {
          const z = -14 + k * 9, p = shipPt(sh, [halfW(z, 1) + 0.4, 0, z]), u = q(((f + k * 6) % 24) / 24, 12);
          card(out, cam, "splash" + u, 800, 800, (pp) => fxSplash(pp, u), [p[0], 0, p[2]], 0, 1.8, 5.2, 5.2);
        }
      }
      break;
    }
    case 12: {
      put(out, cam, t, 1, BOY, "boy", KID12, { expr: f < 1280 ? "dazed" : "nervous", headTilt: 6 });
      put(out, cam, t, 221, folk(4), "folk4", off(KID12, -0.4, 0, -1.25), { expr: "nervous", prop: "scratch" });
      if (f >= 1232) card(out, cam, "question", 300, 400, fxQuestion, KID12, 0.15, 1.85 + 0.03 * Math.sin(t * 5), 0.4, 0.53, false, -0.15);
      break;
    }
    case 13: {
      if (f >= 1378) { const k = popS(f, 1378); card(out, cam, "cg", 760, 260, (p) => fxCG(p), [9, 6.2, -28], 2.6 * k, 0, 8 * k, 2.74 * k); }
      break;
    }
    case 14: case 15: case 16: {
      const r = canoeRoll(id === 16 ? 1530 + (f % 60) : f), feet: V3 = [CANOE[0], 0.12, CANOE[2]];
      if (id === 14) {
        put(out, cam, t, 2, BOATMAN, "boatman", feet, { expr: "smile", mode: "sit", roll: r, float: true });
        if (f >= 1485) hud(out, cam, "checkAman", 620, 280, (p) => fxCheck(p, "AMAN"), 0, 0.62, 0.56, popS(f, 1485));
      } else if (id === 15) {
        if (f < 1606) {
          const stand = f >= 1516, galon = f >= 1541;
          const expr: Expr = f < 1530 ? "smile" : f < 1560 ? "grin" : f < 1588 ? "nervous" : "shock";
          put(out, cam, t, 2, BOATMAN, "boatman", feet, { expr, mode: stand ? "stand" : "sit", prop: galon ? "galon" : null, roll: r, float: true });
        }
        if (f >= 1604) { const u = q(clamp01((f - 1604) / 22), 22); card(out, cam, "splash" + u, 800, 800, (p) => fxSplash(p, u), [CANOE[0], 0, CANOE[2]], 0.6, 1.2, 2.8, 2.8); }
      } else {
        put(out, cam, t, 2, BOATMAN, "boatman", feet, { expr: "nervous", prop: "galon", roll: r, float: true });
        if (f >= 1645) hud(out, cam, "equals", 300, 300, fxEquals, 0.08, 0.02, 0.22, popS(f, 1645));
      }
      break;
    }
    case 17: {
      const st = f < 1736 ? 0 : f < 1753 ? 1 : 2;
      hud(out, cam, "ballast" + st, 900, 1000, (p) => fxBallast(p, st), 0, 0.28, 0.82, popS(f, 1718));
      break;
    }
    case 18: {
      crowd(out, cam, t, [[-1.6, -1.2], [-2.6, -0.2], [-1.8, 0.8], [-3.2, 1.2], [-2.2, -2.4], [-3.4, -1.6]].map(([x, z]) => quay(x, z)), "puzzled");
      put(out, cam, t, 1, BOY, "boy", quay(-1.3, -3.4), { expr: "dazed" });
      winds(out, cam, f, [1880, 1890, 1900, 1912], 0.35);
      break;
    }
  }
  return out;
};
import { deckY as deckYAt, halfW, PORTS } from "./vasa";
