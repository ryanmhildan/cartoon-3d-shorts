// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Nenek, her grandson, the villagers, beach tourists, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxCreak, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion, fxBoard } from "./bugs";
import { fxFish, fxWord, fxSepia, fxIcon, fxSand, fxBlanket, fxFoam } from "./fx";
import { FPS, SHOTS, V3, clamp01, smooth, hh as hh0, at, groundY, runX, PATH_Z, NENEK_V, CUCU_V, SIGN, BEACH_KID, FISH0, TOURIST, DRAW, DRAW_NENEK, MAT, SAFE } from "./story";
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
const NENEK: Outfit = { jacket: "#7a5aa8", pants: "#5a3b2a", boots: BARE, hat: "kerudung", cap: "#3f9f6a", dress: "#6a4a98", skin: "#c99067", sash: "#f0c93e" };
const CUCU: Outfit = { jacket: "#d8402f", pants: "#3b3f52", boots: BARE, hat: "hair", hair: "#1f1a18", skin: "#b9805a", build: "kid" };
const SCARF = ["#3f6fb5", "#c25a7a", "#d9a441", "#5a8f6a", "#8c3b4a"];
const SHIRT = ["#6f8f4a", "#b5653f", "#3f6fb5", "#8c3b4a", "#d9a441", "#5d7a6a", "#2f7a8a"];
const SKINS = ["#c99067", "#b9805a", "#a8714a", "#d6a27a"];
/** villager v: women in kerudung + dress, men in peci / caping / bare hair, a few kids */
const villager = (v: number): Outfit => {
  const k = v % 5, skin = SKINS[v % 4], jacket = SHIRT[v % 7];
  if (k === 1 || k === 3) return { jacket, pants: "#4a3a2c", boots: BARE, hat: "kerudung", cap: SCARF[v % 5], dress: SCARF[(v + 2) % 5], skin };
  if (k === 4) return { jacket, pants: "#3b3f52", boots: BARE, hat: "hair", hair: "#1f1a18", skin, build: "kid" };
  return { jacket, pants: "#3b3f52", boots: BARE, hat: k === 0 ? "peci" : "caping", skin, moustache: v % 3 === 0 ? "#2a201a" : undefined };
};
const TOURISTS: Outfit[] = [
  { jacket: "#f08a2c", pants: "#3f6fb5", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", skin: "#f2c8a0", glasses: true },
  { jacket: "#5ab0c8", pants: "#f0e6d0", boots: "#f4f1ea", hat: "hair", hair: "#d9a441", skin: "#f5d0b0" },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#f4f1ea", hat: "cap", cap: "#2f4f7a", skin: "#e0b48a", glasses: true, moustache: "#5a3b2a" },
  { jacket: "#7ab35a", pants: "#f0e6d0", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", skin: "#ecd0b6", build: "kid" },
];

const FRONT = { side: false, mirror: false };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], FRONT, fo, {}, scale));
  blob(out, p[0], p[1], p[2], scale);
};
/** profile view: (dx, dz) = where they look / walk; mode march = running */
const putSide = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, dx: number, dz: number, expr: Expr, run = false) => {
  const v = viewOf(cam, p[0], p[2], dx, dz), phase = run ? q((t * 2.6 + hh(i, 7)) % 1, 12) : 0;
  const so: SideOpts = { mode: run ? "march" : "stand", expr, blink: lidAt(t, i), pose: 0, phase, stride: run ? 1.2 * v.fs : 0 };
  const fo: FrontOpts = { mode: run ? "march" : "stand", expr, blink: lidAt(t, i), facing: v.mirror ? -1 : 1, phase };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1], p[2], v, fo, so));
  blob(out, p[0], p[1], p[2]);
};
const off = (p: V3, dx: number, dy = 0, dz = 0): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];
/** a camera-facing effect card at `p` + screen-right * sr + up * su */
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: p[0] + cam.right.x * sr, y: p[1] + su, z: p[2] + cam.right.z * sr, w, h, soft, rot });
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
/** flopping fish scattered around c */
const fishes = (out: Stage, t: number, c: V3, n: number, spread: number, size: number, seed = 0) => {
  for (let i = 0; i < n; i++) {
    const k = i + seed * 50, x = c[0] + (hh(k, 1) - 0.5) * 2 * spread, z = c[2] + (hh(k, 2) - 0.5) * 2 * spread;
    const ph = t * (5 + 3 * hh(k, 3)) + hh(k, 4) * 6, b = q(Math.sin(ph), 4), hop = Math.max(0, Math.sin(ph * 0.5)) * 0.12 * size * 3;
    out.fx.push({ key: `fish${b}`, cw: 300, ch: 200, draw: (p) => fxFish(p, b), x, y: groundY(x, z) + 0.12 * size * 3 + hop, z, w: size, h: size * 0.67, rot: 0.2 * Math.sin(ph) });
  }
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
      for (let i = 0; i < 6; i++) put(out, cam, t, 60 + i, villager(i), `v${i}`, at(-9 - hh(i, 3) * 4, -14 + i * 5), { expr: "smile" });
      break;
    }
    case 2: {
      card(out, cam, "boardS", 640, 300, (p) => fxBoard(p, "SIMEULUE 2004"), SIGN, 0.55, 2.45, 1.1, 0.52);
      card(out, cam, "boardPost", 60, 400, (p) => p.poly([[18, 0], [42, 0], [42, 400], [18, 400]], "#8a5a36", 6), SIGN, 0.55, 1.1, 0.06, 2.2);
      put(out, cam, t, 1, NENEK, "nenek", NENEK_V, { expr: "smile_closed" });
      put(out, cam, t, 2, CUCU, "cucu", CUCU_V, { expr: "grin", wave: Math.sin(t * 6) * 0.5 + 0.5 });
      put(out, cam, t, 61, villager(0), "v0", at(-6, 3.6), { expr: "smile", facing: 1 });
      break;
    }
    case 3: {
      const c = at(-11.5, -4), shock = f >= 282;
      const sway = (i: number) => (shock ? 5 * Math.sin(t * 22 + i) : 0);
      put(out, cam, t, 2, CUCU, "cucu", c, { expr: shock ? "shock" : "neutral", tilt: sway(1) });
      put(out, cam, t, 62, villager(1), "v1", off(c, -0.6, 0, -1.3), { expr: shock ? "shock" : "smile", tilt: sway(2), facing: 1 });
      put(out, cam, t, 63, villager(0), "v0", off(c, -0.9, 0, 1.4), { expr: shock ? "nervous" : "smile", tilt: sway(3), facing: -1 });
      if (shock) for (const [sr, su] of [[-1.9, 2.6], [2.0, 2.3]] as const) {
        const u = q((t * 3) % 1, 12);
        card(out, cam, `creak${u}`, 300, 300, (p) => fxCreak(p, u), c, sr, su, 0.8, 0.8);
      }
      break;
    }
    case 4: {
      put(out, cam, t, 2, CUCU, "cucu", BEACH_KID, { expr: f < 400 ? "neutral" : "shock", prop: f >= 405 ? "point" : null, facing: 1 });
      if (f >= 420) fishes(out, t, at(16, 2), 10, 7, 0.55, 1);
      break;
    }
    case 5: {
      fishes(out, t, FISH0, 8, 0.9, 0.45, 2);
      break;
    }
    case 6: {
      TOURISTS.forEach((o, i) => put(out, cam, t, 70 + i, o, `tour${i}`, at(TOURIST[0] + [-1.2, 0.6, 2.2, -0.2][i], TOURIST[2] + [-1.6, -0.2, 1.0, 1.9][i]),
        { expr: i % 2 ? "laugh" : "grin", prop: i === 3 ? null : "fish", facing: i % 2 ? 1 : -1 }));
      fishes(out, t, at(TOURIST[0] + 1, TOURIST[2]), 9, 3.2, 0.45, 3);
      break;
    }
    case 7: case 8: {
      const lead = runX(f), n = id === 7 ? 12 : 6;
      for (let i = 0; i < n; i++) {
        const x = lead + i * (id === 7 ? 1.7 : 1.5) + (hh(i, 5) - 0.5) * 0.6, z = PATH_Z + (hh(i, 6) - 0.5) * 1.6;
        if (id === 8 && i === 2) { putSide(out, cam, t, 1, NENEK, "nenek", at(x, PATH_Z + 0.5), -1, 0, "nervous", true); continue; }
        if (id === 8 && i === 3) { putSide(out, cam, t, 2, CUCU, "cucu", at(x - 0.6, PATH_Z - 0.3), -1, 0, "stern", true); continue; }
        putSide(out, cam, t, 80 + i, villager(i + 3), `v${i + 3}`, at(x, z), -1, 0, i % 3 ? "stern" : "nervous", true);
      }
      break;
    }
    case 9: {
      put(out, cam, t, 1, NENEK, "nenek", NENEK_V, { expr: f < 930 ? "smile" : "grin", facing: 1, prop: f >= 925 ? "throw" : null });
      put(out, cam, t, 2, CUCU, "cucu", CUCU_V, { expr: f < 930 ? "neutral" : "shock", facing: -1, look: -1 });
      if (f >= 933) { const k = pop(f, 933, 8); card(out, cam, `word${q(k, 8)}`, 720, 360, (p) => fxWord(p, "SMONG!", k * 0.3 + 0.7), NENEK_V, 0.35, 2.55, 1.55, 0.78); }
      break;
    }
    case 10: {
      put(out, cam, t, 1, NENEK, "nenek", NENEK_V, { expr: "stern", facing: 1 });
      put(out, cam, t, 2, CUCU, "cucu", CUCU_V, { expr: f < 1060 ? "neutral" : "shock", facing: -1 });
      if (f >= 966) { const k = pop(f, 966, 8), u = q(clamp01((f - 1040) / 60), 30); card(out, cam, `sepia${u}`, 760, 600, (p) => fxSepia(p, u), NENEK_V, -0.25, 2.55, 1.5 * k, 1.18 * k); }
      break;
    }
    case 11: {
      put(out, cam, t, 1, NENEK, "nenek", NENEK_V, { expr: "stern", prop: "throw", facing: 1 });
      [1147, 1181, 1207].forEach((f0, i) => { if (f >= f0) { const k = pop(f, f0, 6); card(out, cam, `icon${i}`, 380, 440, (p) => fxIcon(p, i), NENEK_V, -0.12 + i * 0.6, 2.3, 0.56 * k, 0.65 * k); } });
      break;
    }
    case 12: {
      put(out, cam, t, 2, CUCU, "cucu", CUCU_V, { expr: "nervous", prop: "scratch", headTilt: 6 });
      if (f >= 1262) card(out, cam, "question", 300, 400, fxQuestion, CUCU_V, 0.3, 1.75 + 0.03 * Math.sin(t * 5), 0.26, 0.35, false, -0.15);
      break;
    }
    case 13: case 14: {
      put(out, cam, t, 1, NENEK, "nenek", DRAW_NENEK, { expr: id === 13 ? "smile_closed" : "stern", prop: id === 13 ? "stick" : null });
      put(out, cam, t, 2, CUCU, "cucu", at(DRAW[0] - 1.6, DRAW[2] - 1.9), { expr: id === 13 ? "neutral" : "shock", facing: 1 });
      const mode = id === 13 ? 0 : 1, u = id === 13 ? q(clamp01((f - 1342) / 110), 50) : q(clamp01((f - 1500) / 105), 60);
      out.fx.push({ key: `sand${mode}|${u}`, cw: 1400, ch: 640, draw: (p) => fxSand(p, mode, u), x: DRAW[0], y: DRAW[1] + 0.02, z: DRAW[2], w: id === 13 ? 1.7 : 2.0, h: id === 13 ? 0.77 : 0.91, flat: true, rot: Math.PI / 2 });
      break;
    }
    case 15: {
      const u = q(clamp01((f - 1645) / 100), 50);
      out.fx.push({ key: `blanket${u}`, cw: 1000, ch: 760, draw: (p) => fxBlanket(p, u), x: MAT[0], y: MAT[1] + 0.01, z: MAT[2], w: 1.2, h: 0.91, flat: true, rot: Math.PI / 2 });
      break;
    }
    case 16: {
      fishes(out, t, at(22, 6), 14, 9, 0.6, 4);
      const k = smooth((f - 1770) / 70);
      card(out, cam, "foam", 1024, 96, fxFoam, [260, -2.2, 6], 0, 0.5, 300 * (0.4 + 0.6 * k), 8);
      break;
    }
    case 17: {
      for (let i = 0; i < 8; i++) {
        const p = at(SAFE[0] + (hh(i, 1) - 0.5) * 3, SAFE[2] + (i - 3.5) * 1.05);
        if (i === 3) putSide(out, cam, t, 1, NENEK, "nenek", p, 1, 0, "stern");
        else if (i === 4) putSide(out, cam, t, 2, CUCU, "cucu", p, 1, 0, "neutral");
        else putSide(out, cam, t, 90 + i, villager(i + 9), `v${i + 9}`, p, 1, 0, i % 2 ? "stern" : "neutral");
      }
      break;
    }
  }
  return out;
};
