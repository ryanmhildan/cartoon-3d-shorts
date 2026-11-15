// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Mbah Sumi, her grandson Bayu, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion } from "./bugs";
import { fxDrops, fxNoFridge, fxMark, fxThermo, fxHeat, fxSteam, fxCool, fxNoIcons, fxMagnify, fxSection, fxSweat, fxWind, fxKendiFace, fxSpit } from "./fx";
import { FPS, SHOTS, V3, clamp01, hh as hh0, KENDI, BOTTLE, MBAH, BAYU, bayuWalk, BOTTLE_ON } from "./story";
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
const BARE = "#8f5f3e";
/** Mbah Sumi: grey hair in a konde, brown-orange kebaya, dark green batik cloth, yellow selendang */
const MBAH_O: Outfit = { jacket: "#c9733a", pants: "#4a3a2c", boots: BARE, hat: "konde", hair: "#c4bfb6", dress: "#2f5a46", skin: "#c99067", scarf: "#f0c93e" };
/** Bayu from the city: sky-blue tee, red cap, cream shorts, white sneakers */
const BAYU_O: Outfit = { jacket: "#5ab0e0", pants: "#e8d6a8", boots: "#f4f1ea", hat: "cap", cap: "#d8402f", skin: "#b9805a", build: "kid" };

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
/** droplets on the kendi belly */
const drops = (out: Stage, cam: CamInfo, t: number, s = 1) => {
  const u = T2(t);
  card(out, cam, `drops${u}`, 600, 600, (p) => fxDrops(p, u), KENDI, 0, 0.17, 0.3 * s, 0.3 * s, false, 0, 0.17);
};

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f);
  LNAME = s.light;
  findSun(cam, SUN);
  const mbah = (opt: Opt) => put(out, cam, t, 1, MBAH_O, "mbah", MBAH, opt);
  const bayu = (opt: Opt, p: V3 = BAYU) => put(out, cam, t, 2, BAYU_O, "bayu", p, opt);
  switch (id) {
    case 1: {
      mbah({ expr: "smile_closed" });
      drops(out, cam, t);
      break;
    }
    case 2: {
      mbah({ expr: f < 165 ? "smile" : "grin", facing: 1 });
      if (f >= 160) { const k = pop(f, 160, 7); card(out, cam, `nofridge${q(k, 7)}`, 420, 520, fxNoFridge, MBAH, 0.4, 1.86, 0.36 * k, 0.45 * k); }
      break;
    }
    case 3: {
      mbah({ expr: "smile_closed", facing: 1 });
      if (f >= 240) drops(out, cam, t);
      break;
    }
    case 4: {
      mbah({ expr: "smile", wave: f > 330 ? Math.sin(t * 7) * 0.5 + 0.5 : undefined });
      const p = bayuWalk(f);
      if (f < 393) putSide(out, cam, t, 2, BAYU_O, "bayu", p, -3.5, -1.5, "grin", true);
      else bayu({ expr: "grin", prop: "glassbottle" }, p);
      break;
    }
    case 5: {
      mbah({ expr: "smile_closed", facing: 1 });
      const shock = f >= 448;
      bayu({ expr: shock ? "shock" : "neutral", prop: shock ? "point" : "glassbottle", facing: -1 });
      if (f >= 452) { const k = pop(f, 452, 5); card(out, cam, "bang", 300, 400, (p) => fxMark(p, "!", "#ff7a4a"), BAYU, 0.05, 1.62 + 0.03 * Math.sin(t * 9), 0.24 * k, 0.32 * k, false, -0.12); }
      drops(out, cam, t, 1.1);
      break;
    }
    case 6: {
      mbah({ expr: "smile_closed" });
      bayu({ expr: "neutral", prop: f < BOTTLE_ON ? "glassbottle" : "hand", facing: -1 });
      drops(out, cam, t);
      break;
    }
    case 7: {
      mbah({ expr: "nervous" });
      bayu({ expr: "pained" });
      if (f >= 628) { const k = pop(f, 628, 7), u = q(clamp01((f - 628) / 30), 15); card(out, cam, `thermo${q(k, 7)}|${u}`, 520, 720, (p) => fxThermo(p, u), [1.5, 0, -1.6], 0, 5.0, 1.75 * k, 2.4 * k); }
      for (const [x, z] of [[7.5, -1.2], [5.2, -3.6]] as const) { const u = T2(t); card(out, cam, `heat${u}`, 360, 420, (p) => fxHeat(p, u, "#ffb04a"), [x, 0, z], 0, 0.8, 1.0, 1.2); }
      break;
    }
    case 8: {
      const drink = f < 760, spit = f >= 760 && f < 790;
      bayu({ expr: drink ? "neutral" : "pained", prop: drink ? "bottleDrink" : "glassbottle", headTilt: drink ? -6 : 0, facing: -1 });
      if (spit) { const u = q((f - 760) / 30, 15); card(out, cam, `spit${u}`, 520, 320, (p) => fxSpit(p, u), BAYU, 0.32, 1.08, 0.5, 0.31, false, 0, 0.25); }
      if (f >= 765) { const u = T2(t); card(out, cam, `heatB${u}`, 360, 420, (p) => fxHeat(p, u), BAYU, 0.35, 1.3, 0.3, 0.36); }
      break;
    }
    case 9: {
      const drink = f >= 850;
      bayu({ expr: f >= 925 ? "shock" : drink ? "neutral" : "smile", prop: drink && f < 925 ? "kendiDrink" : "kendiHold", headTilt: drink && f < 925 ? -6 : 0, facing: -1 });
      break;
    }
    case 10: {
      bayu({ expr: "relief", prop: "kendiHold" });
      { const u = T2(t); card(out, cam, `cool${u}`, 420, 420, (p) => fxCool(p, u), BAYU, 0.3, 1.42, 0.42, 0.42); }
      const k = f >= 1008 ? 2 : f >= 981 ? 1 : 0;
      if (k) card(out, cam, `noicons${k}`, 800, 420, (p) => fxNoIcons(p, k), BAYU, 0.1, 1.52, 0.6, 0.32);
      break;
    }
    case 11: {
      bayu({ expr: "nervous", prop: "scratch", headTilt: 6 });
      if (f >= 1050) card(out, cam, "question", 300, 400, fxQuestion, BAYU, 0.2, 1.3 + 0.02 * Math.sin(t * 5), 0.19, 0.25, false, -0.15);
      break;
    }
    case 12: {
      mbah({ expr: f < 1160 ? "smile" : "grin", prop: "point", flip: true });
      bayu({ expr: "neutral" });
      drops(out, cam, t);
      break;
    }
    case 13: {
      mbah({ expr: "smile_closed" });
      drops(out, cam, t);
      if (f >= 1244) { const k = q(pop(f, 1244, 10), 10), u = T2(t); card(out, cam, `magnify${k}|${u}`, 760, 820, (p) => fxMagnify(p, u, k), KENDI, 0.02, 0.2, 0.42, 0.45, false, 0, 0.32); }
      break;
    }
    case 14: {
      mbah({ expr: "smile_closed" });
      drops(out, cam, t);
      if (f >= 1440) { const u = T2(t); card(out, cam, `steam${u}`, 400, 600, (p) => fxSteam(p, u), KENDI, 0.02, 0.5, 0.3, 0.45, true, 0, 0.12); }
      break;
    }
    case 15: {
      drops(out, cam, t);
      const k = q(clamp01((f - 1500) / 90), 30), u = T2(t), g = pop(f, 1490, 8);
      if (f >= 1490) card(out, cam, `section${k}|${u}|${q(g, 8)}`, 800, 940, (p) => fxSection(p, u, k), KENDI, 0.06, 0.42, 0.36 * g, 0.42 * g, false, 0, 0.3);
      break;
    }
    case 16: {
      bayu({ expr: f < 1640 ? "pained" : "relief" });
      { const u = T2(t); card(out, cam, `sweat${u}`, 360, 360, (p) => fxSweat(p, u), BAYU, 0.05, 1.3, 0.42, 0.42); }
      if (f >= 1655) { const u = T2(t); card(out, cam, `wind${u}`, 600, 360, (p) => fxWind(p, u), BAYU, -0.3, 1.2, 0.5, 0.3, false, 0, 0.35); }
      break;
    }
    case 17: {
      bayu({ expr: f < 1760 ? "stern" : "pained" });
      drops(out, cam, t);
      { const u = T2(t); card(out, cam, `heatC${u}`, 360, 420, (p) => fxHeat(p, u), BOTTLE, 0, 0.42, 0.24, 0.28, false, 0, 0.1); }
      break;
    }
    case 18: {
      mbah({ expr: f < 1860 ? "grin" : "laugh" });
      bayu({ expr: f < 1840 ? "shock" : "laugh", facing: -1 });
      drops(out, cam, t);
      const b = (f % 70) < 4 ? 1 : 0;
      card(out, cam, `kface${b}`, 340, 260, (p) => fxKendiFace(p, b), KENDI, 0, 0.21, 0.24, 0.18, false, 0, 0.19);
      break;
    }
  }
  return out;
};
