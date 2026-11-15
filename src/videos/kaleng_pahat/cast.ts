// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Appert, the official, French soldiers, Pasteur, an English tinsmith, townsfolk, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, townsfolk, soldier, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion } from "./bugs";
import { fxNotice, fxPrize, fxStink, fxYears, fxSteam, fxFire, fxHmm, fxConfetti, fxMicrobes, fxBoilSeal, fxMosquito, fxScope, fxBottleCan, fxTimeline, fxCanLabel, fxSparks } from "./fx";
import { FPS, SHOTS, V3, clamp01, hh as hh0, STREET, NOTICE, YARD, POT, ENG, TABLE_C } from "./story";
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
const APPERT: Outfit = { jacket: "#f6efdc", pants: "#3b3f52", boots: "#2a2420", hat: "toque", scarf: "#d8402f", moustache: "#5a3b2a", skin: "#f2c8a0", buttons: "#c9ccd2" };
const OFFICIAL: Outfit = { jacket: "#2f4f9a", pants: "#e8dcc0", boots: "#2a2420", hat: "tricorn", sash: "#d8402f", scarf: "#f6efdc", skin: "#ecd0b6", moustache: "#3a2a20", build: "stout", buttons: "#e8c45a" };
const PASTEUR: Outfit = { jacket: "#2a2a32", pants: "#2a2a32", boots: "#1a1a20", hat: "hair", hair: "#6a5a4a", moustache: "#7a6a5a", skin: "#f2c8a0", scarf: "#f6efdc" };
const WORKER: Outfit = { jacket: "#8a6a3a", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#5a5a66", skin: "#f5d0b0", moustache: "#7a4a2a" };
const frenchSoldier = (v: number): Outfit => soldier(v, { jacket: "#2f4f9a", rifle: false, belt: "#f1efe6" });

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
const potFx = (out: Stage, cam: CamInfo, t: number) => {
  card(out, cam, `fire${loop(t, 2, 12)}`, 300, 400, (p) => fxFire(p, loop(t, 2, 12)), off(POT, 0, 0, 0.75), 0, 0.3, 0.75, 1.0);
  card(out, cam, `steam${loop(t, 0.7)}`, 400, 500, (p) => fxSteam(p, loop(t, 0.7)), POT, 0, 2.0, 1.2, 1.5, true);
};

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f), Y = YARD;
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      put(out, cam, t, 1, APPERT, "appert", Y, { expr: f < 120 ? "grin" : "nervous", prop: "moneybag" }, 1, f >= 45 && f < 57 ? 0.1 * Math.sin(((f - 45) / 12) * Math.PI) : 0);
      if (f >= 110) card(out, cam, "question", 300, 400, fxQuestion, Y, 0.35, 2.55 + 0.03 * Math.sin(t * 5), 0.28, 0.37, false, -0.15);
      break;
    }
    case 2: {
      card(out, cam, "notice", 640, 420, (p) => fxNotice(p, "PRANCIS", "± 1795"), off(NOTICE, 0, 0, 0.12), 0, 1.55, 2.0, 1.31);
      for (let i = 0; i < 4; i++) put(out, cam, t, 20 + i, townsfolk(i), `tf${i}`, off(STREET, -2.2 + i * 1.3, 0, (i % 2) * 1.0 - 0.3), { expr: "smile", facing: i % 2 ? 1 : -1 });
      break;
    }
    case 3: {
      for (let i = 0; i < 3; i++) {
        const p0 = off(STREET, -0.6 + i * 0.9, 0, 0.4 - (i % 2) * 0.6);
        put(out, cam, t, 30 + i, frenchSoldier(i), `sol${i}`, p0, { expr: i === 1 ? "pained" : "stern", prop: "bread", facing: 1 });
        card(out, cam, `stink${loop(t, 1, 12)}`, 300, 400, (p) => fxStink(p, loop(t, 1, 12)), p0, 0.35, 1.75, 0.3, 0.4, true);
      }
      put(out, cam, t, 2, OFFICIAL, "official", off(STREET, 2.6, 0, -0.2), { expr: "stern", prop: "point", facing: -1 });
      if (f >= 330) card(out, cam, "prize", 600, 800, fxPrize, off(NOTICE, 0, 0, 0.12), 0, 1.45, 1.2, 1.6);
      break;
    }
    case 4: {
      put(out, cam, t, 1, APPERT, "appert", Y, { expr: "stern", prop: "bottle", facing: -1 });
      if (f >= 420) { const k = pop(f, 420, 6), u = q(clamp01((f - 420) / 90), 45); card(out, cam, `years${u}`, 500, 620, (p) => fxYears(p, u), Y, -1.0, 2.25, 0.8 * k, 0.99 * k); }
      potFx(out, cam, t);
      break;
    }
    case 5: {
      if (f < 640) put(out, cam, t, 1, APPERT, "appert", Y, { expr: f < 615 ? "smile_closed" : "grin", prop: "bottle", facing: 1 });
      else put(out, cam, t, 1, APPERT, "appert", off(POT, -1.5, 0, 0.3), { expr: "smile_closed", facing: 1 });
      potFx(out, cam, t);
      break;
    }
    case 6: {
      for (let i = 0; i < 4; i++) put(out, cam, t, 20 + i, townsfolk(i + 1), `tf${i + 1}`, off(STREET, -2.0 + i * 1.3, 0, (i % 2) * 0.8 - 0.2), { expr: i % 2 ? "nervous" : "stern", prop: i === 1 ? "bottle" : null, headTilt: (i - 1.5) * 4, facing: i < 2 ? 1 : -1 });
      card(out, cam, `hmm${loop(t, 1.2, 12)}`, 440, 200, (p) => fxHmm(p, loop(t, 1.2, 12)), off(STREET, -0.7, 0, 0), 0, 2.55, 0.8, 0.36);
      break;
    }
    case 7: {
      put(out, cam, t, 1, APPERT, "appert", Y, { expr: f < 940 ? "smile" : "laugh", prop: f >= 935 ? "moneybag" : null, facing: 1 });
      put(out, cam, t, 2, OFFICIAL, "official", off(Y, 1.4, 0, 0.3), { expr: "grin", prop: f < 935 ? "moneybag" : null, facing: -1 });
      card(out, cam, "y1810", 640, 420, (p) => fxNotice(p, "1810", "HADIAH!"), off(Y, 0.7, 0, -1.2), 0, 2.75, 1.1, 0.72);
      if (f >= 940) card(out, cam, `conf${loop(t, 0.7, 30)}`, 600, 600, (p) => fxConfetti(p, loop(t, 0.7, 30)), off(Y, 0.7, 0, 0.4), 0, 2.0, 3.0, 3.0);
      break;
    }
    case 8: {
      put(out, cam, t, 1, APPERT, "appert", Y, { expr: "nervous", prop: "shrug" });
      for (let i = 0; i < 3; i++) if (f >= 990 + i * 12) card(out, cam, "question", 300, 400, fxQuestion, Y, -0.35 + i * 0.35, 1.98 + 0.06 * (i % 2) + 0.03 * Math.sin(t * 5 + i), 0.24, 0.32, false, -0.2 + i * 0.2);
      break;
    }
    case 9: {
      const u = q(clamp01((f - 1090) / 80), 40);
      card(out, cam, `mic${u}`, 900, 1000, (p) => fxMicrobes(p, u), TABLE_C(), 0, 1.55, 1.1, 1.22);
      break;
    }
    case 10: {
      potFx(out, cam, t);
      const u = q(clamp01((f - 1230) / 110), 55);
      card(out, cam, `boil${u}`, 860, 900, (p) => fxBoilSeal(p, u), off(POT, 0, 0, 0.9), 0, 1.85, 1.35, 1.41);
      break;
    }
    case 11: {
      const u = q(clamp01((f - 1355) / 95), 48);
      card(out, cam, `mos${u}`, 860, 820, (p) => fxMosquito(p, u), STREET, 0, 1.9, 1.55, 1.48);
      break;
    }
    case 12: {
      put(out, cam, t, 6, PASTEUR, "pasteur", off(STREET, -3.0, 0, 0), { expr: "smile_closed", prop: "point", facing: 1 });
      if (f >= 1490) { const k = pop(f, 1490, 6); card(out, cam, "scope", 700, 760, fxScope, off(STREET, -1.95, 0, 0.2), 0, 1.4, 1.0 * k, 1.09 * k); }
      break;
    }
    case 13: {
      card(out, cam, "eng", 640, 420, (p) => fxNotice(p, "INGGRIS", "1810"), off(ENG, -1.6, 0, -1.8), 0, 2.4, 1.3, 0.85);
      put(out, cam, t, 7, WORKER, "worker", ENG, { expr: "grin", prop: "can", facing: 1 });
      if (f >= 1640) { const k = pop(f, 1640, 6), u = q(clamp01((f - 1640) / 40), 20); card(out, cam, `b2c${u}`, 800, 560, (p) => fxBottleCan(p, u), ENG, 0.75, 2.05, 1.0 * k, 0.7 * k); }
      break;
    }
    case 14: {
      const u = q(clamp01((f - 1760) / 90), 45);
      card(out, cam, `tl${u}`, 900, 520, (p) => fxTimeline(p, u), ENG, 0, 2.55, 1.9, 1.1);
      put(out, cam, t, 7, WORKER, "worker", off(ENG, -0.8, 0, 0.3), { expr: "dazed", prop: "can", facing: 1 });
      put(out, cam, t, 30, frenchSoldier(0), "sol0", off(ENG, 0.8, 0, 0.2), { expr: "nervous", prop: "can", facing: -1, headTilt: 5 });
      break;
    }
    case 15: {
      const hit = Math.max(0, Math.sin(((f - 1884) / 16) * Math.PI));
      put(out, cam, t, 30, frenchSoldier(0), "sol0", off(ENG, -0.35, 0, 0.3), { expr: "pained", prop: ["hammer", q(hit, 6)] });
      card(out, cam, "canlabel", 520, 620, fxCanLabel, off(ENG, 0.75, 0, 0.35), 0, 1.15, 0.6, 0.72);
      for (const f0 of [1945, 1961, 1980]) if (f >= f0 && f < f0 + 8) { const k = q((f - f0) / 8, 8); card(out, cam, `spark${k}`, 400, 400, (p) => fxSparks(p, k), off(ENG, 0.6, 0, 0.4), 0, 1.6, 0.7, 0.7); }
      break;
    }
  }
  return out;
};
