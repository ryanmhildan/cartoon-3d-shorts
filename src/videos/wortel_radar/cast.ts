// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Cunningham, the man from the ministry, villagers, kids, today's mum and kid, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst, fxPuff, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion, fxSparkle } from "./bugs";
import { fxNotice, fxName, fxCatTitle, fxPaper, fxWave, fxLabel, fxShout, fxDistance, fxStamp, fxVitA, fxBubble, fxArrow, fxStars } from "./fx";
import { FPS, SHOTS, V3, clamp01, smooth, hh as hh0, STREET, LAMP, GARDEN, HOME, PILOT, OFFI, PARK, NOSE, KIDCAVE, CAVE, CAVE_WALL, SIGN, fighterAt, bombersAt } from "./story";
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
/** John Cunningham: leather flying helmet with ORANGE-lens goggles, brown flying jacket, cream scarf (always) */
const PILOT_O: Outfit = { jacket: "#7a5233", pants: "#5a5148", boots: "#2a2420", hat: "flyhelm", cap: "#8a5530", scarf: "#f3ead6", skin: "#f2c8a0" };
const OFFICIAL: Outfit = { jacket: "#4a4f5c", pants: "#3a3d47", boots: "#1f1d22", hat: "bowler", moustache: "#4a3020", scarf: "#c43a32", skin: "#f2c8a0", build: "stout", buttons: "#d9dde0" };
const MUM: Outfit = { jacket: "#f6efdc", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#7a4a2a", dress: "#5a8fc2", skin: "#f5d0b0" };
const DAD: Outfit = { jacket: "#6a5a3a", pants: "#4a4652", boots: "#2a2420", hat: "cap", cap: "#5f5a52", moustache: "#5a3b2a", skin: "#f2c8a0" };
const KIDS: Outfit[] = [
  { jacket: "#d8402f", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a", skin: "#f5d0b0", build: "kid" },
  { jacket: "#3f8fc8", pants: "#3b3f52", boots: "#5a3b2a", hat: "bonnet", dress: "#f0c93e", skin: "#ecd0b6", build: "kid" },
  { jacket: "#3fae55", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#c9802a", skin: "#f5d0b0", build: "kid" },
  { jacket: "#8a6a3a", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#d8402f", skin: "#f2c8a0", build: "kid" },
];
/** today (shots 14-15): an Indonesian mum in a green headscarf and her son */
const MUM2: Outfit = { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "kerudung", cap: "#3f8f55", dress: "#c25a7a", skin: "#e8b88c" };
const KID2: Outfit = { jacket: "#3f8fc8", pants: "#2f3448", boots: "#f4f1ea", hat: "hair", hair: "#2a2420", skin: "#e8b88c", build: "kid" };

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
const popOut = (f: number, f0: number, f1: number, n = 6) => pop(f, f0, n) * (1 - pop(f, f1 - n, n));
const loop = (t: number, rate: number, n = 24) => q((t * rate) % 1, n);
const bob = (t: number, i: number) => Math.max(0, Math.sin(t * 9 + i * 1.3)) * 0.07;
/** a burst card (bite crunch, camera flash) at p */
const burst = (out: Stage, cam: CamInfo, f: number, f0: number, p: V3, sr: number, su: number, s: number, col = "#fff3b0", n = 10) => {
  if (f < f0 || f >= f0 + n) return;
  const k = q((f - f0) / n, n);
  card(out, cam, `burst${col}${k}`, 500, 500, (pn) => fxBurst(pn, k, col), p, sr, su, s, s);
};

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f), G = GARDEN, P = PILOT;
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      put(out, cam, t, 1, PILOT_O, "pilot", P, { expr: f < 140 ? "smile_closed" : "grin", prop: f >= 138 && f < 168 ? "carrotBite" : "carrot", facing: 1 });
      burst(out, cam, f, 150, P, 0.22, 1.45, 0.6, "#ffb347");
      break;
    }
    case 2: {
      card(out, cam, "notice40", 640, 420, (p) => fxNotice(p, "INGGRIS", "TAHUN 1940"), off(SIGN, 0, 0, 0.12), 0, 1.55, 2.0, 1.31);
      break;
    }
    case 4: {
      const fp = fighterAt(4, f)!.pos;
      const k = popOut(f, 428, 509, 6);
      if (k > 0) card(out, cam, "name", 800, 240, (p) => fxName(p, "JOHN CUNNINGHAM"), off(fp, 16, 0, 1), 0, 8.5, 10 * k, 3 * k);
      const b = bombersAt(4, f)[0];
      if (b.smoke !== undefined) for (let i = 0; i < 9; i++) {
        const g = f - i * 4;
        if (g < 469) continue;
        const bp = bombersAt(4, g)[0].pos, u = q(Math.min(1, (i * 4) / 40), 10);
        card(out, cam, `puff${u}`, 300, 300, (p) => fxPuff(p, u), off(bp, -7 - i * 0.6, 0.4, 0), 0, 0, 5 + i * 0.6, 5 + i * 0.6, true);
      }
      burst(out, cam, f, 469, b.pos, 0, 0, 7, "#ffcf6a", 10);
      break;
    }
    case 5: {
      put(out, cam, t, 1, PILOT_O, "pilot", P, { expr: "grin", facing: 0 });
      const k = pop(f, 534, 6), u = q(clamp01((f - 534) / 18), 12);
      if (f >= 534) card(out, cam, `cat${u}`, 900, 600, (p) => fxCatTitle(p, u), P, 0, 2.0, 0.85 * k, 0.57 * k);
      break;
    }
    case 6: {
      const P6 = off(P, 1.25, 0, 0.5);
      put(out, cam, t, 1, PILOT_O, "pilot", off(P6, -0.7, 0, 0), { expr: f >= 690 ? "grin" : "smile_closed", prop: f >= 688 && f < 712 ? "carrotBite" : "carrotBucket", facing: 1 });
      put(out, cam, t, 2, OFFICIAL, "offi", off(P6, 0.8, 0, 0.3), { expr: f >= 618 ? "grin" : "smile", prop: f >= 612 ? "point" : null, facing: -1 }, 1, f >= 612 && f < 640 ? bob(t, 1) * 0.6 : 0);
      if (f >= 618) { const k = pop(f, 618, 7); card(out, cam, "paper", 700, 860, fxPaper, P6, 0.05, 2.75, 1.0 * k, 1.23 * k, false, 0.12 * (1 - k)); }
      for (const [f0, sr, su] of [[596, -1.7, 2.4], [626, 1.9, 2.0], [657, -1.8, 1.4], [700, 1.7, 2.6]] as const) burst(out, cam, f, f0, P6, sr, su, 1.0, "#ffffff", 7);
      burst(out, cam, f, 693, off(P6, -0.7, 0, 0), 0.3, 1.6, 0.6, "#ffb347");
      break;
    }
    case 7: {
      put(out, cam, t, 5, MUM, "mum", off(G, 1.15, 0, 0.6), { expr: "smile", prop: "carrotStick", facing: -1 });
      for (let i = 0; i < 3; i++) {
        const hop = f >= 844 ? bob(t, i) * 1.3 : 0;
        put(out, cam, t, 40 + i, KIDS[i], `kid${i}`, off(G, -1.2 + i * 0.8, 0, 1.1 - (i % 2) * 0.45), { expr: f >= 840 ? "laugh" : "grin", prop: f >= 751 + i * 12 ? "carrotStick" : null, facing: i === 0 ? 1 : -1 }, 1, hop);
      }
      break;
    }
    case 8: {
      const walkU = clamp01((f - 872) / (958 - 872)), bumped = f >= 960;
      const dx = bumped ? -0.42 - 0.12 * smooth((f - 960) / 8) : -2.7 + 2.3 * walkU;
      put(out, cam, t, 6, DAD, "dad", off(LAMP, dx, 0, 0.18), bumped
        ? { expr: "dazed", prop: "carrot", tilt: -6, headTilt: -8 }
        : { expr: f < 930 ? "smile_closed" : "grin", prop: f % 40 < 14 ? "carrotBite" : "carrot", mode: "stroll", phase: loop(t, 1.6), facing: 1 });
      if (bumped) { card(out, cam, `stars${loop(t, 0.8)}`, 420, 210, (p) => fxStars(p, loop(t, 0.8)), off(LAMP, -0.54, 0, 0.18), 0, 1.98, 0.75, 0.38); burst(out, cam, f, 962, LAMP, -0.2, 1.75, 0.9, "#ffe25a", 8); }
      put(out, cam, t, 41, KIDS[1], "kid1", off(LAMP, -1.75, 0, 0.6), { expr: f >= 983 ? "nervous" : "neutral", prop: "carrot", headTilt: f >= 983 ? 8 : 0, facing: 1 });
      if (f >= 983) card(out, cam, "question", 300, 400, fxQuestion, off(LAMP, -1.75, 0, 0.6), 0.3, 1.75 + 0.03 * Math.sin(t * 5), 0.33, 0.44, false, -0.15);
      break;
    }
    case 9: {
      put(out, cam, t, 1, PILOT_O, "pilot", P, { expr: f >= 1128 ? "grin" : "smile_closed", prop: f >= 1126 && f < 1170 ? "pointEye" : "carrot", facing: 1 });
      if (f >= 1166) { const k = pop(f, 1166, 6); card(out, cam, "arrowNose", 500, 600, (p) => fxArrow(p, "MATA BARU"), NOSE, 0, 1.25, 1.2 * k, 1.44 * k); }
      break;
    }
    case 10: {
      const fp = fighterAt(10, f)!.pos, nose: V3 = [fp[0] + 7.5, fp[1] + 0.2, fp[2]], bx = bombersAt(10, f)[0].pos[0] - 8, span = bx - nose[0];
      if (f >= 1226) { const k = pop(f, 1226, 6); card(out, cam, "labRadar", 520, 200, (p) => fxLabel(p, "RADAR"), off(fp, 6, 0, -6.5), 0, 0, 9 * k, 3.5 * k); }
      for (let i = 0; i < 4; i++) { // out: green rings from the nose to the bomber
        const f0 = 1262 + i * 9, u = (f - f0) / 30;
        if (u < 0 || u > 1) continue;
        const sz = 6 + 8 * u;
        card(out, cam, "waveOut", 400, 600, (p) => fxWave(p, "#7ff0d0"), [nose[0] + span * u, nose[1], nose[2]], 0, 0, sz * 0.67, sz, false, Math.PI / 2);
      }
      for (let i = 0; i < 3; i++) { // back: yellow echoes from the bomber to the nose (card mirrored: opens to the left)
        const f0 = 1305 + i * 9, u = (f - f0) / 30;
        if (u < 0 || u > 1) continue;
        const sz = 13 - 6 * u;
        card(out, cam, "waveBack", 400, 600, (p) => fxWave(p, "#ffe25a"), [bx - span * u, nose[1], nose[2]], 0, 0, sz * 0.67, sz, false, -Math.PI / 2);
      }
      if (f >= 1300 && f < 1316) burst(out, cam, f, 1300, [bx + 4, nose[1], nose[2]], 0, 0, 6, "#ffe25a", 10);
      break;
    }
    case 11: {
      const K = KIDCAVE, wall = CAVE[0] + CAVE_WALL + 0.3, y = 1.6, z = K[2] - 0.6;
      put(out, cam, t, 42, KIDS[2], "kidcave", K, { expr: f >= 1362 && f < 1420 ? "shock" : f >= 1456 ? "grin" : "smile_closed", prop: f >= 1360 && f < 1425 ? "shout" : null, facing: 1 });
      const k1 = popOut(f, 1366, 1430, 5);
      if (k1 > 0) card(out, cam, "shout", 600, 420, (p) => fxShout(p, "HALO!"), K, 0.45, 2.3, 0.95 * k1, 0.66 * k1);
      const span = wall - (K[0] - 0.5);
      for (let i = 0; i < 3; i++) { const f0 = 1368 + i * 8, u = (f - f0) / 40; if (u < 0 || u > 1) continue; const sz = 1.2 + 1.2 * u; card(out, cam, "waveC", 400, 600, (p) => fxWave(p, "#ffffff"), [K[0] - 0.5 + span * u, y, z], 0, 0, sz * 0.67, sz); }
      for (let i = 0; i < 3; i++) { const f0 = 1440 + i * 8, u = (f - f0) / 36; if (u < 0 || u > 1) continue; const sz = 2.4 - 1.0 * u; card(out, cam, "waveE", 400, 600, (p) => fxWave(p, "#ffe25a"), [wall - span * u, y, z], 0, 0, -sz * 0.67, sz); }
      const k2 = popOut(f, 1428, 1491, 6);
      if (k2 > 0) card(out, cam, "dist", 1000, 260, (p) => fxDistance(p, "JARAK"), [(wall + K[0]) / 2, 3.0, z + 0.3], 0, 0, 5.5 * k2, 1.43 * k2);
      const k3 = popOut(f, 1456, 1491, 5);
      if (k3 > 0) card(out, cam, "echo", 600, 420, (p) => fxShout(p, "halo...", true), [wall + 1.5, 2.7, z], 0, 0, 2.6 * k3, 1.82 * k3);
      break;
    }
    case 12: {
      const O12: V3 = [PARK[0] - 2.4, 0, PARK[2] + 6.7], P12: V3 = [PARK[0] - 1.5, 0, PARK[2] + 9.2];
      put(out, cam, t, 2, OFFICIAL, "offi", O12, { expr: f >= 1584 ? "whistle" : "smile", prop: f >= 1520 && f < 1580 ? "point" : null, facing: f >= 1584 ? 0 : 1 });
      put(out, cam, t, 1, PILOT_O, "pilot", P12, { expr: f >= 1600 ? "grin" : "smile_closed", prop: "carrot", facing: -1 });
      if (f >= 1615) { const k = pop(f, 1615, 4); card(out, cam, "stamp", 700, 300, (p) => fxStamp(p, "RAHASIA"), [PARK[0] - 0.9, 1.8, PARK[2] + 7.4], 0, 0.7, 3.2 * (1.6 - 0.6 * k), 1.37 * (1.6 - 0.6 * k), false, -0.18); }
      break;
    }
    case 13: {
      const K = off(G, 0.5, 0, 0);
      put(out, cam, t, 43, KIDS[3], "kid3", K, { expr: f >= 1734 ? "nervous" : f >= 1667 ? "smile" : "neutral", prop: "carrot", facing: 1 });
      if (f >= 1645) { const k = pop(f, 1645, 6), u = f >= 1734 ? 1 : 0.2; card(out, cam, `vita${u}`, 900, 760, (p) => fxVitA(p, u), K, -0.05, 2.25, 1.1 * k, 0.93 * k); }
      break;
    }
    case 14: {
      const k = popOut(f, 1786, 1876, 6);
      if (k > 0) card(out, cam, "notice80", 640, 420, (p) => fxNotice(p, "80 TAHUN", "KEMUDIAN"), HOME, 0.2, 2.65, 1.7 * k, 1.12 * k);
      put(out, cam, t, 7, MUM2, "mum2", off(HOME, 0.75, 0, 0.6), { expr: "smile", prop: "plate", facing: -1 });
      put(out, cam, t, 44, KID2, "kid2", off(HOME, -0.7, 0, 0.3), { expr: f >= 1850 ? "stern" : "neutral", facing: 1 });
      break;
    }
    case 15: {
      put(out, cam, t, 7, MUM2, "mum2", off(HOME, 0.55, 0, 0.6), { expr: "grin", prop: "wag", facing: -1 }, 1, f >= 1890 ? Math.abs(Math.sin(t * 8)) * 0.02 : 0);
      put(out, cam, t, 44, KID2, "kid2", off(HOME, -0.6, 0, 0.5), { expr: f >= 1925 ? "whistle" : "nervous", prop: "carrot", facing: 1, headTilt: -5 });
      if (f >= 1888) { const k = pop(f, 1888, 6); card(out, cam, "bubble", 900, 520, (p) => fxBubble(p, "MAKAN WORTELNYA,", "BIAR MATANYA TAJAM!"), off(HOME, 0.55, 0, 0.6), -0.5, 2.4, 1.35 * k, 0.78 * k); }
      break;
    }
  }
  return out;
};
void fxLabel; void fxSparkle; void bodySide; void PARK; void STREET; void OFFI; void HOME;
export type { SideOpts };
