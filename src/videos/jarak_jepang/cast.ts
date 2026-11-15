// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Mbah Sumi, her grandson Bayu, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion } from "./bugs";
import { FPS, SHOTS, V3, clamp01, hh as hh0 } from "./story";
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
/** Pak Karto: caping with an ochre band, green shirt, dark trousers, bare feet, moustache, RED towel on the shoulder */
const KARTO_O: Outfit = { jacket: "#5e7d4a", pants: "#34343e", boots: BARE, hat: "caping", band: "#d9a441", moustache: "#2a201a", skin: "#c99067", scarf: "#d8402f" };
/** the soldier: khaki uniform and field cap (no weapon) */
const SOLD_O: Outfit = { jacket: "#a8996a", pants: "#a8996a", boots: "#3a2e24", hat: "cap", cap: "#8f8556", buttons: "#d9c27a", skin: "#e0b48a" };
const NEIGH_O: Outfit = { jacket: "#e0a23a", pants: "#4a3a2c", boots: BARE, hat: "kerudung", cap: "#e0578a", dress: "#6a3f8f", skin: "#d8a27a" };
const WIFE_O: Outfit = { jacket: "#c9733a", pants: "#4a3a2c", boots: BARE, hat: "kerudung", cap: "#3f8f55", dress: "#2f5a46", skin: "#c99067" };
const KID_O: Outfit = { jacket: "#f4f1ea", pants: "#8a3a3a", boots: BARE, hat: "peci", skin: "#b9805a", build: "kid" };

const FRONT = { side: false, mirror: false };
const FLIP = { side: false, mirror: false, flip: true };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number; flip?: boolean };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], opt.flip ? FLIP : FRONT, fo, {}, scale));
  blob(out, p[0], p[1], p[2], scale);
};
/** a camera-facing effect card at `p` + screen-right * sr + up * su */
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: p[0] + cam.right.x * sr, y: p[1] + su, z: p[2] + cam.right.z * sr, w, h, soft, rot });
/** a card pinned to the frame: (sx, sy) in -1..1 screen units (sy up), wf = width as a share of the frame width */
let HUD_ID = 1, HUD_F = 0;
const hud = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, sx: number, sy: number, wf: number, k = 1) => {
  const c = camAt(HUD_ID, HUD_F), fp = focusAt(HUD_ID, HUD_F), fw = cam.fwd ?? new THREE.Vector3(0, 0, -1);
  const D = Math.min(30, Math.max(0.6, (fp[0] - cam.pos.x) * fw.x + (fp[1] - cam.pos.y) * fw.y + (fp[2] - cam.pos.z) * fw.z) * 0.93);
  const th = Math.tan((c.fov * Math.PI) / 360), H = 2 * D * th, W = H * (9 / 16);
  const up = new THREE.Vector3().crossVectors(cam.right, fw).normalize();
  const w = wf * W * k, h = (w * ch) / cw;
  out.fx.push({ key, cw, ch, draw, x: cam.pos.x + fw.x * D + cam.right.x * sx * W / 2 + up.x * sy * H / 2,
    y: cam.pos.y + fw.y * D + cam.right.y * sx * W / 2 + up.y * sy * H / 2, z: cam.pos.z + fw.z * D + cam.right.z * sx * W / 2 + up.z * sy * H / 2, w, h });
};
const pop = (f: number, f0: number, n = 6) => Math.min(1, Math.max(0, (f - f0) / n));
const popS = (f: number, f0: number) => 0.3 + 0.7 * pop(f, f0, 7);
/** pop-in with a small overshoot (0 before f0) */
const grow = (f: number, f0: number) => { if (f < f0) return 0; const u = Math.min(1, (f - f0) / 8); return u < 1 ? u * (1.15 - 0.15 * u) + 0.12 * Math.sin(u * Math.PI) : 1; };
const T2 = (t: number) => q(t, 15);

/** every castor plant that has popped in by frame f */
const plants = (out: Stage, cam: CamInfo, f: number) => {
  JARAK.forEach((j, i) => {
    const g = grow(f, j.f);
    if (g <= 0) return;
    const d = cam.pos.distanceTo(tmp.set(j.p[0], j.p[1] + 1, j.p[2]));
    if (d > 140 || d < 2.4) return;
    const [w, h, k] = tier(d / (j.s * 1.2)), v = i % 5, sc = j.s * g;
    out.places.push({ key: `jarak${v}`, draw: (p) => fxJarak(p, v), x: j.p[0], y: j.p[1], z: j.p[2], scale: sc, size: [w, h, k], mirror: i % 2 === 1 });
    if (d < 30) blob(out, j.p[0], j.p[1], j.p[2], sc * 1.2);
  });
};

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f);
  LNAME = s.light;
  HUD_ID = id; HUD_F = f;
  findSun(cam, SUN);
  const karto = (opt: Opt, p: V3 = KARTO) => put(out, cam, t, 1, KARTO_O, "karto", p, opt);
  const soldier = (opt: Opt, p: V3 = SOLDIER) => put(out, cam, t, 2, SOLD_O, "sold", p, opt);
  if (id <= 15 || id >= 22) plants(out, cam, f);
  switch (id) {
    case 1: {
      karto({ expr: f < 120 ? "neutral" : "nervous", prop: "seedling", facing: 1 });
      soldier({ expr: "stern", prop: "point", facing: -1 });
      if (f >= 21) hud(out, cam, "sign1943", 640, 340, (p) => fxSign2(p, "TAHUN", "1943"), 0, 0.64, 0.56, popS(f, 21));
      if (f >= 147) hud(out, cam, "poison", 500, 420, fxPoison, 0, 0.26, 0.36, popS(f, 147));
      break;
    }
    case 2: {
      karto({ expr: "dazed", facing: -1 });
      if (f >= 194) hud(out, cam, "lblJarak", 640, 220, (p) => fxLabel(p, "POHON JARAK"), 0, 0.66, 0.66, popS(f, 194));
      break;
    }
    case 3: {
      karto({ expr: f < 325 ? "neutral" : "dazed", headTilt: f >= 325 ? 6 : 0 });
      soldier({ expr: "stern", facing: -1 });
      if (f >= 283) hud(out, cam, "signBjn", 640, 340, (p) => fxSign2(p, "BOJONEGORO", "JAWA TIMUR"), 0, 0.74, 0.5, popS(f, 283));
      break;
    }
    case 4: case 5: {
      karto({ expr: id === 4 ? "nervous" : "dazed", prop: "shrug" });
      const what = id === 4 ? "eat" : "sell", f0 = id === 4 ? 378 : 438;
      if (f >= f0) hud(out, cam, "no" + what, 600, 300, (p) => fxNo(p, what), 0, 0.62, 0.7, popS(f, f0));
      break;
    }
    case 6: {
      soldier({ expr: "stern", prop: "point", facing: 1 });
      karto({ expr: "nervous", facing: -1 });
      break;
    }
    case 7: case 8: case 9: break;
    case 10: {
      karto({ expr: f < 700 ? "dazed" : "shock" }, KARTO_RD);
      break;
    }
    case 11: {
      karto({ expr: f < 851 ? "dazed" : "grin", facing: 1 }, KARTO2);
      put(out, cam, t, 3, NEIGH_O, "neigh", NEIGH, { expr: f < 851 ? "nervous" : "laugh", facing: -1, prop: f < 840 ? "ear" : null });
      if (f >= 790 && f < 829) hud(out, cam, "spBuat", 760, 380, (p) => fxSpeech(p, "BUAT APA,", "SIH?"), 0.05, 0.62, 0.8, popS(f, 790));
      if (f >= 827) hud(out, cam, "spJamu", 760, 380, (p) => fxSpeech(p, "MAU DIBIKIN", "JAMU SEKAMPUNG?"), 0.05, 0.62, 0.86, popS(f, 827));
      break;
    }
    case 12: {
      karto({ expr: "nervous", prop: "sack" }, [ROAD - 1.4, 0, 7.4]);
      soldier({ expr: "stern", prop: "point", facing: -1 }, [ROAD - 2.0, 0, 8.8]);
      break;
    }
    case 13: {
      karto({ expr: f < 990 ? "dazed" : "nervous", prop: "can" }, [ROAD - 1.4, 0, 7.4]);
      if (f >= 995) hud(out, cam, "lblMitan", 640, 220, (p) => fxLabel(p, "MINYAK TANAH"), 0, 0.8, 0.56, popS(f, 995));
      break;
    }
    case 14: {
      karto({ expr: f < 1090 ? "neutral" : "dazed", facing: 1 }, [ROAD - 1.3, 0, 6]);
      if (f >= 1092) card(out, cam, "question", 300, 400, fxQuestion, [ROAD - 1.3, 0, 6], 0.45, 2.2 + 0.03 * Math.sin(t * 5), 0.4, 0.53, false, -0.15);
      break;
    }
    case 15: {
      karto({ expr: f < 1150 ? "neutral" : "grin" });
      if (f >= 1148) { const u = T2(t); hud(out, cam, "seedOil" + u, 600, 600, (p) => fxSeedOil(p, u), 0, 0.68, 0.5, popS(f, 1148)); }
      break;
    }
    case 16: {
      for (let k = 0; k < 3; k++) { const u = T2(t + k * 0.3); card(out, cam, "heat" + u, 400, 400, (p) => fxHeat(p, u), [PLANE[0] + 3.4, 2.6, PLANE[2] + (k - 1) * 2.9], 0, 0.6, 1.6, 1.6, false); }
      if (f >= 1265) hud(out, cam, "hot", 500, 300, (p) => fxHot(p, "PANAS!"), 0, 0.62, 0.56, popS(f, 1265));
      break;
    }
    case 17: case 18: {
      const bu = id === 17 ? 0 : clamp01((f - 1426) / 14);
      if (bu > 0) for (let k = 0; k < 2; k++) { const u = q(((f - 1426) / 30 + k * 0.5) % 1, 15); card(out, cam, "smoke" + u, 300, 300, (p) => fxSmoke(p, u), WAJAN, (k - 0.5) * 0.12, 0.22, 0.5, 0.5, true); }
      if (id === 17 && f >= 1336) hud(out, cam, "lblMentega", 640, 220, (p) => fxLabel(p, "MENTEGA"), 0, 0.62, 0.5, popS(f, 1336));
      break;
    }
    case 19: case 20: {
      const u = T2(t), mode = id === 19 ? 0 : 1;
      hud(out, cam, "engine" + mode + u, 700, 900, (p) => fxEngine(p, mode as 0 | 1, u), 0, 0.3, 0.74, popS(f, id === 19 ? 1458 : 1532));
      if (id === 20 && f >= 1598) { const k = T2(t); hud(out, cam, "spark" + k, 400, 400, (p) => fxSparkle(p, k), 0.5, 0.75, 0.3); }
      break;
    }
    case 21: {
      const u = T2(t);
      hud(out, cam, "oilcan" + u, 500, 500, (p) => fxOilCan(p, u), -0.3, 0.45, 0.5, popS(f, 1665));
      if (f >= 1712) hud(out, cam, "lblMesin", 640, 220, (p) => fxLabel(p, "MESIN & SENJATA"), 0, 0.82, 0.7, popS(f, 1712));
      break;
    }
    case 22: {
      karto({ expr: "pained", prop: "shrug" }, FAMILY);
      put(out, cam, t, 4, WIFE_O, "wife", [FAMILY[0] - 0.5, 0, FAMILY[2] + 1.1], { expr: "nervous", facing: 1 });
      put(out, cam, t, 5, KID_O, "kid", [FAMILY[0] + 0.4, 0, FAMILY[2] - 0.9], { expr: "pained", facing: -1 });
      if (f >= 1820) hud(out, cam, "bowl", 400, 260, fxBowl, 0.42, 0.05, 0.3, popS(f, 1820));
      break;
    }
    case 23: {
      karto({ expr: f < 1880 ? "dazed" : "pained", headTilt: -10 }, [ROAD - 1.6, 0, 9.5]);
      break;
    }
  }
  return out;
};
import { JARAK, KARTO, SOLDIER, KARTO2, NEIGH, KARTO_RD, ROAD, PLANE, WAJAN, FAMILY, camAt, focusAt } from "./story";
import { fxJarak, fxLabel, fxSign2, fxSpeech, fxPoison, fxNo, fxSeedOil, fxEngine, fxOilCan, fxBowl, fxHot, fxSmoke, fxHeat } from "./fx";
import { fxSparkle } from "./bugs";
