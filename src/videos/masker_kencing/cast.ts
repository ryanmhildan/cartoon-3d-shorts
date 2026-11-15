// Our cast as lit flat sprites in the 3D world (pool of canvases, yaw-only billboards shaded by cardShade, contact
// blobs): Mbah Sumi, her grandson Bayu, plus the effect cards. stage(id, f, cam) lists everything per frame.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { fxQuestion } from "./bugs";
import { FPS, SHOTS, V3, clamp01, hh as hh0 } from "./story";
const hh2 = hh0;
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
/** soldiers of 1915: khaki tunic and trousers, soft khaki caps (no steel helmets yet), puttees */
const SOLD = (v: number): Outfit => ({ jacket: ["#8a7a52", "#857650", "#8f7f58"][v % 3], pants: "#7a6c48", boots: "#4a3a28", hat: "cap", cap: "#76683f", buttons: "#c9b27a",
  skin: ["#f1c9a2", "#e0b48a", "#c99067", "#f5d2b0"][v % 4], moustache: v % 3 === 1 ? "#5a3b2a" : undefined });
/** our soldier: the same uniform plus a RED neckerchief */
const HERO_O: Outfit = { ...SOLD(0), scarf: "#d8402f", moustache: undefined, skin: "#f1c9a2" };
/** the officer who knows chemistry: darker tunic, glasses, moustache, Sam Browne belt */
const OFF_O: Outfit = { jacket: "#6f6444", pants: "#5f5a48", boots: "#3a2a1c", hat: "cap", cap: "#5f5236", buttons: "#e8c45a", glasses: true, moustache: "#6a4a30", sash: "#5a3a24", build: "stout", skin: "#f1c9a2" };

const FRONT = { side: false, mirror: false };
const FLIP = { side: false, mirror: false, flip: true };
type Opt = { expr: Expr; prop?: Prop; look?: number; facing?: -1 | 0 | 1; wave?: number; headTilt?: number; tilt?: number; mode?: FrontOpts["mode"]; phase?: number; flip?: boolean };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, p: V3, opt: Opt, scale = 1, hop = 0) => {
  const fo: FrontOpts = { mode: opt.mode ?? "stand", expr: opt.expr, prop: opt.prop ?? null, look: opt.look ?? 0, facing: opt.facing ?? 0, wave: opt.wave,
    headTilt: opt.headTilt ?? 0, tilt: opt.tilt ?? 0, phase: opt.phase ?? 0, blink: opt.expr === "laugh" ? 0 : lidAt(t, i) };
  out.places.push(person(cam, { i, o, okey }, p[0], p[1] + hop, p[2], opt.flip ? FLIP : FRONT, fo, {}, scale));
  blob(out, p[0], p[1], p[2], scale);
};
/** a camera-facing effect card at `p` + screen-right * sr + up * su, pulled `near` m toward the lens */
const card = (out: Stage, cam: CamInfo, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, sr: number, su: number, w: number, h: number, soft = false, rot = 0, near = 0) => {
  let x = p[0] + cam.right.x * sr, y = p[1] + su, z = p[2] + cam.right.z * sr;
  if (near) { const dx = cam.pos.x - x, dy = cam.pos.y - y, dz = cam.pos.z - z, L = Math.hypot(dx, dy, dz) || 1; x += (dx / L) * near; y += (dy / L) * near; z += (dz / L) * near; }
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, soft, rot });
};
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
const T2 = (t: number) => q(t, 15);

/** the chlorine cloud: soft cards behind its front (toward +x), in the trench too once it has arrived */
const gas = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const g = gasAt(id, f), drift = f * 0.01;
  const cz = Math.round(cam.pos.z / 8) * 8;
  for (let xi = 0; xi < 10; xi++) for (let zi = -6; zi <= 6; zi++) {
    const x = Math.max(g.front, TW + 1) + xi * 7 + hh(xi, zi) * 3, z = cz + zi * 8 + hh(zi, xi) * 4;
    if (hh(xi * 13 + zi, 5) > g.dens) continue;
    const d = Math.hypot(x - cam.pos.x, z - cam.pos.z);
    if (d > 130 || d < 3) continue;
    const v = (xi * 7 + zi + 50) % 4;
    card(out, cam, "gas" + v, 512, 256, (p) => fxGas(p, v), [x - drift, (2.2 + hh(xi, zi + 9) * 2.2) * (id === 3 ? 1.6 : 1), z], 0, 0, 16 * (id === 3 ? 1.7 : 1), 9 * (id === 3 ? 1.7 : 1), true);
  }
  if (g.front < TW) for (let k = -8; k <= 8; k++) {
    const z = Math.round(cam.pos.z) + k * 2.2;
    if (hh(k + 40, 6) > g.dens + 0.2) continue;
    const v = (k + 20) % 4;
    if (Math.hypot(cam.pos.z - z, cam.pos.x) < 4) continue;
    card(out, cam, "gas" + v, 512, 256, (p) => fxGas(p, v), [(hh(k, 2) - 0.5) * 1.6, FLOOR + 0.4 + hh(k, 3) * 0.9, z + Math.sin(f * 0.02 + k)], 0, 0, 2.6, 1.3, true);
  }
};
/** the handkerchief over a soldier's nose and mouth */
const cloth = (out: Stage, cam: CamInfo, p: V3, dy = 1.36, s = 1) => card(out, cam, "cloth", 300, 220, fxCloth, p, 0, dy, 0.32 * s, 0.2 * s, false, 0, 0.12);

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = T(f);
  LNAME = s.light;
  HUD_ID = id; HUD_F = f;
  findSun(cam, SUN);
  const hero = (opt: Opt) => put(out, cam, t, 1, HERO_O, "hero", HERO, opt);
  const mates = (expr: (i: number) => Expr, masked = false, flip = false) => MATES.forEach((p, i) => {
    put(out, cam, t, 10 + i, SOLD(i + 1), "sold" + ((i + 1) % 6), p, { expr: expr(i), facing: i % 2 ? 1 : -1, flip });
    if (masked && !flip) cloth(out, cam, p);
  });
  gas(out, cam, id, f);
  switch (id) {
    case 1: {
      hero({ expr: "pained" }); cloth(out, cam, HERO);
      mates(() => "pained", true);
      break;
    }
    case 2: {
      hero({ expr: "neutral" }); mates(() => "neutral");
      if (f >= 176) hud(out, cam, "signYpres", 640, 340, (p) => fxSign2(p, "YPRES, BELGIA", "1915"), 0, 0.64, 0.6, popS(f, 176));
      break;
    }
    case 3: break;
    case 4: {
      hero({ expr: "pained" });
      if (f >= 455) { const u = T2(t); card(out, cam, "tears" + u, 400, 300, (p) => fxTears(p, u), HERO, 0, 1.62, 0.6, 0.45, false, 0, 0.2); }
      break;
    }
    case 5: {
      hero({ expr: "nervous" }); mates((i) => (i % 2 ? "pained" : "nervous"));
      if (f >= 532) hud(out, cam, "noMask", 400, 400, fxNoMask, 0, 0.6, 0.4, popS(f, 532));
      break;
    }
    case 6: {
      hero({ expr: f < 650 ? "nervous" : "dazed", prop: f >= 670 ? "bottle" : null, headTilt: f < 620 ? -6 : 4 });
      if (f >= 598 && f < 640) hud(out, cam, "sniff", 640, 220, (p) => fxLabel(p, "SNIFF... SNIFF..."), 0, 0.66, 0.6, popS(f, 598));
      if (f >= 668) card(out, cam, "question", 300, 400, fxQuestion, HERO, 0.5, 2.0 + 0.03 * Math.sin(t * 5), 0.4, 0.53, false, -0.15);
      break;
    }
    case 7: {
      hero({ expr: "dazed", prop: "bottle" });
      hud(out, cam, "canteen" + (f >= 798 ? 1 : 0), 600, 500, (p) => fxCanteen(p, f >= 798 ? 1 : 0), 0.45, 0.74, 0.42, popS(f, 728));
      if (f >= 800) hud(out, cam, "lblKlorin", 640, 220, (p) => fxLabel(p, "KLORIN"), -0.45, 0.78, 0.42, popS(f, 800));
      break;
    }
    case 8: {
      put(out, cam, t, 2, OFF_O, "officer", OFFICER, { expr: f < 884 ? "dazed" : "shock", headTilt: f < 884 ? 6 : 0 });
      if (f >= 884 && f < 900) { const u = q((f - 884) / 16, 8); card(out, cam, "burst" + u, 600, 600, (p) => fxBurst(p, u), OFFICER, 0, 2.1, 1.6, 1.6, false, 0, 0.3); }
      if (f >= 914) hud(out, cam, "lblGas", 640, 220, (p) => fxLabel(p, "GAS KLORIN!", "#e2453c", "#ffffff"), 0, 0.66, 0.66, popS(f, 914));
      break;
    }
    case 9: {
      put(out, cam, t, 2, OFF_O, "officer", OFFICER, { expr: "stern", prop: "point" });
      hero({ expr: "nervous", facing: 1 }); mates(() => "nervous");
      if (f >= 956) hud(out, cam, "spPerintah", 760, 380, (p) => fxSpeech(p, "PERINTAH", "BARU!"), 0.05, 0.62, 0.8, popS(f, 956));
      break;
    }
    case 10: {
      const turned = f < 1072;
      hero({ expr: f < 1050 ? "shock" : "pained", flip: turned });
      if (!turned) cloth(out, cam, HERO);
      mates((i) => (i % 2 ? "shock" : "pained"), !turned, turned);
      if (f >= 1028) hud(out, cam, "spKencingi", 760, 380, (p) => fxSpeech(p, "KENCINGI", "SAPU TANGANMU!"), 0.05, 0.64, 0.86, popS(f, 1028));
      break;
    }
    case 11: {
      hero({ expr: "pained", prop: "hand", headTilt: -8 });
      card(out, cam, "cloth", 300, 220, fxCloth, HERO, 0.62, 1.15, 0.34, 0.25, false, 0, 0.2);
      { const u = T2(t); card(out, cam, "stink" + u, 300, 300, (p) => fxStink(p, u), HERO, 0.62, 1.55, 0.5, 0.5, false, 0, 0.2); }
      hud(out, cam, "lblJijik", 640, 220, (p) => fxLabel(p, "JIJIK?"), -0.3, 0.7, 0.44, popS(f, 1111));
      if (f >= 1135) hud(out, cam, "lblJelas", 640, 220, (p) => fxLabel(p, "JELAS.", "#e2453c", "#ffffff"), 0.32, 0.56, 0.44, popS(f, 1135));
      break;
    }
    case 12: {
      hero({ expr: f < 1180 ? "nervous" : "stern", prop: f < 1180 ? "shrug" : null });
      if (f >= 1180) cloth(out, cam, HERO);
      mates(() => "stern", f >= 1185);
      break;
    }
    case 13: {
      hero({ expr: "dazed" }); cloth(out, cam, HERO);
      if (f >= 1212) card(out, cam, "question", 300, 400, fxQuestion, HERO, 0.5, 2.1 + 0.03 * Math.sin(t * 5), 0.4, 0.53, false, -0.15);
      if (f >= 1240) card(out, cam, "question", 300, 400, fxQuestion, HERO, -0.5, 2.2 + 0.03 * Math.sin(t * 6), 0.32, 0.42, false, 0.2);
      break;
    }
    case 14: case 15: case 16: {
      MATES.slice(2).forEach((p, i) => { put(out, cam, t, 12 + i, SOLD(i + 3), "sold" + ((i + 3) % 6), p, { expr: "neutral" }); cloth(out, cam, p); });
      const u = T2(t);
      if (id === 14) hud(out, cam, "dis" + u, 600, 700, (p) => fxDissolve(p, u), 0, 0.3, 0.66, popS(f, 1300));
      if (id === 15) hud(out, cam, "catch" + u, 700, 700, (p) => fxCatch(p, u), 0, 0.3, 0.74, popS(f, 1386));
      if (id === 16) hud(out, cam, "react" + u, 700, 600, (p) => fxReact(p, u), 0, 0.32, 0.74, popS(f, 1538));
      break;
    }
    case 17: {
      put(out, cam, t, 3, SOLD(4), "smoker", SMOKER, { expr: f < 1700 ? "pained" : "grin" });
      if (f >= 1664) cloth(out, cam, SMOKER);
      const u = T2(t);
      card(out, cam, "fire" + u, 300, 300, (p) => fxFire(p, u), BRAZIER, 0, 1.0, 0.7, 0.7);
      for (let k = 0; k < 3; k++) { const v = q(((f - 1644) / 40 + k / 3) % 1, 15); card(out, cam, "smoke" + v, 300, 300, (p) => fxSmoke(p, v), BRAZIER, 0.2 * k, 1.5 + k * 0.4, 1.4, 1.4, true); }
      if (f >= 1715) { const k = T2(t); hud(out, cam, "spark" + k, 400, 400, (p) => fxSparkle(p, k), 0.3, 0.6, 0.4); hud(out, cam, "lblKimia", 640, 220, (p) => fxLabel(p, "+ KIMIA"), 0, 0.72, 0.5, popS(f, 1715)); }
      break;
    }
    case 18: {
      hero({ expr: "grin" }); cloth(out, cam, HERO); mates(() => "grin", true);
      break;
    }
    case 19: {
      hero({ expr: "grin", prop: "point" }); cloth(out, cam, HERO);
      if (f >= 1826) hud(out, cam, "lblGratis", 640, 220, (p) => fxLabel(p, "GRATIS!", "#7bd36a", "#1f4a2a"), 0, 0.68, 0.56, popS(f, 1826));
      break;
    }
  }
  return out;
};
import { HERO, MATES, OFFICER, SMOKER, BRAZIER, FLOOR, TW, gasAt, camAt, focusAt } from "./story";
import { fxLabel, fxSign2, fxSpeech, fxSmoke, fxGas, fxCloth, fxTears, fxNoMask, fxCanteen, fxStink, fxDissolve, fxCatch, fxReact, fxFire } from "./fx";
import { fxSparkle } from "./bugs";
import { fxBurst } from "./toon";
