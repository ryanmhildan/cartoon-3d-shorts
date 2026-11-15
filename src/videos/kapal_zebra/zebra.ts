// Our cartoon dazzle-painted cargo steamer (1918), the submarine and the torpedo, all built from code.
// Ship-local: waterline centre at the origin, bow toward -z (BOW = -28), stern at +28. The hull, bridge house and
// funnel carry bold zig-zag "dazzle" paint (black, white, blue), a red bottom below the waterline.
import * as THREE from "three";
import { Batch, V, lam } from "./build";
import { ctex } from "./paint";

export const BOW = -28, STERN = 28;
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const beam = (z: number) => {
  if (z < -12) { const t = (z - BOW) / (-12 - BOW); return Math.max(0.12, 4.6 * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2))); }
  return 4.6 * (1 - 0.5 * sm((z - 16) / 12));
};
export const keelY = (z: number) => -3.6 + 2.2 * sm((-z - 20) / 8) + 1.6 * sm((z - 20) / 8);
export const topY = (z: number) => 4.0 + 1.8 * sm((-z - 16) / 12) + 0.7 * sm((z - 18) / 10);
const sect = (y: number, yb: number) => (y < -1 ? 0.15 + 0.85 * Math.sin((Math.PI / 2) * Math.max(0, (y - yb) / (-1 - yb))) : 1);
export const halfW = (z: number, y: number) => beam(z) * sect(y, keelY(z));
export const deckY = (z: number) => topY(z) - 0.9;

// ---------------- dazzle paint ----------------
const DZ = ["#f3f1ea", "#1d1f26", "#2f6fb8", "#f3f1ea", "#1d1f26", "#8fb8e2", "#1d1f26", "#f3f1ea", "#2f6fb8", "#1d1f26"];
/** bold slanted zig-zag bands (chevrons) over a W x H canvas plus a few big contrasting wedges; variant shifts it */
const dazzle = (g: CanvasRenderingContext2D, W: number, H: number, v: number, x0 = 0, y0 = 0) => {
  g.fillStyle = "#1d1f26"; g.fillRect(x0, y0, W, H);
  const n = 13, step = W / n;
  for (let k = -3; k < n + 3; k++) {
    const x = x0 + k * step, s = (k + v) % 2 ? 1 : -1, sl = 0.7 * step * s, c = DZ[(k + 30 + v * 3) % DZ.length];
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(x, y0); g.lineTo(x + step, y0);
    g.lineTo(x + step + sl, y0 + H * 0.5); g.lineTo(x + step, y0 + H); g.lineTo(x, y0 + H); g.lineTo(x + sl, y0 + H * 0.5);
    g.closePath(); g.fill();
  }
  for (let k = 0; k < 4; k++) { // big wedges cutting across the bands
    const x = x0 + ((k * 0.27 + v * 0.13) % 1) * W, w = step * (1.6 + (k % 2));
    g.fillStyle = k % 2 ? "#f3f1ea" : "#1d1f26";
    g.beginPath();
    if (k % 2) { g.moveTo(x, y0 + H); g.lineTo(x + w, y0 + H); g.lineTo(x + w * 0.5, y0 + H * 0.15); }
    else { g.moveTo(x, y0); g.lineTo(x + w, y0); g.lineTo(x + w * 0.35, y0 + H * 0.85); }
    g.closePath(); g.fill();
  }
};
const U = (z: number) => (z - BOW) / (STERN - BOW);
const VY = (y: number) => (y + 3.6) / 10;
const hullTex = (v: number) => ctex("zebraHull" + v, 2048, 512, (g) => {
  const W = 2048, H = 512, py = (y: number) => H - VY(y) * H;
  dazzle(g, W, py(-0.1), v);
  g.fillStyle = "#9a3a30"; g.fillRect(0, py(-0.1), W, H - py(-0.1));          // red bottom
  g.fillStyle = "#1d1f26"; g.fillRect(0, py(-0.1) - 6, W, 10);                // boot-top line
  for (let k = 0; k < 18; k++) { g.fillStyle = "rgba(20,20,30,0.35)"; g.fillRect((k + 0.5) * (W / 18), 0, 3, py(-0.1)); } // plate seams
  for (let k = 0; k < 26; k++) { const x = 300 + k * 52; g.fillStyle = "#1d1f26"; g.beginPath(); g.arc(x, py(3.0), 7, 0, 7); g.fill(); } // portholes
});
const superTex = (v: number) => ctex("zebraSuper" + v, 1024, 512, (g) => {
  dazzle(g, 1024, 512, v + 2);
  for (let i = 0; i < 9; i++) { // windows row
    const x = 60 + i * 108;
    g.fillStyle = "#f3f1ea"; g.fillRect(x - 6, 96, 64, 66);
    g.fillStyle = "#2b3a50"; g.fillRect(x, 102, 52, 54);
    g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(x + 6, 106, 8, 44);
  }
});
const funnelTex = (v: number) => ctex("zebraFunnel" + v, 512, 512, (g) => {
  dazzle(g, 512, 512, v + 5);
  g.fillStyle = "#1d1f26"; g.fillRect(0, 0, 512, 70);
});

// ---------------- hull geometry (as the Vasa: lofted sides, deck, bulwarks) ----------------
const NZ = 64, NY = 20;
const zAt = (i: number) => BOW + ((STERN - BOW) * i) / NZ;
const hullSide = (s: number) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NZ; i++) {
    const z = zAt(i), yb = keelY(z), yt = topY(z);
    for (let j = 0; j <= NY; j++) { const y = yb + ((yt - yb) * j) / NY; pos.push(s * halfW(z, y), y, z); uv.push(s > 0 ? U(z) : 1 - U(z), VY(y)); }
  }
  for (let i = 0; i < NZ; i++) for (let j = 0; j < NY; j++) {
    const a = i * (NY + 1) + j, b = a + NY + 1;
    if (s > 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const transom = () => {
  const z = STERN, yb = keelY(z), yt = topY(z), pts: number[] = [], ring: [number, number][] = [];
  for (let j = 0; j <= NY; j++) { const y = yb + ((yt - yb) * j) / NY; ring.push([halfW(z, y), y]); }
  const cy = (yb + yt) / 2;
  for (let j = 0; j < NY; j++) { const [x0, y0] = ring[j], [x1, y1] = ring[j + 1]; pts.push(0, cy, z, x0, y0, z, x1, y1, z, 0, cy, z, -x1, y1, z, -x0, y0, z); }
  pts.push(0, cy, z, ring[NY][0], yt, z, -ring[NY][0], yt, z);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.computeVertexNormals();
  return g;
};
const deckGeo = () => {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 1; i <= NZ; i++) { const z = zAt(i) - (i === NZ ? 0.05 : 0), yd = deckY(z), w = Math.max(0.05, halfW(z, yd) - 0.25); pos.push(-w, yd, z, w, yd, z); }
  for (let i = 0; i < NZ - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const bulwark = (s: number) => {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 1; i <= NZ; i++) { const z = zAt(i), yt = topY(z), yd = deckY(z); pos.push(s * (halfW(z, yt) - 0.15), yt, z, s * (halfW(z, yd) - 0.25), yd, z); }
  for (let i = 0; i < NZ - 1; i++) { const a = i * 2; if (s > 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const base = pos.length / 3;
  for (let i = 1; i <= NZ; i++) { const z = zAt(i), yt = topY(z); pos.push(s * halfW(z, yt), yt + 0.02, z, s * (halfW(z, yt) - 0.15), yt + 0.02, z); }
  for (let i = 0; i < NZ - 1; i++) { const a = base + i * 2; if (s > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
export const cyl = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, seg = 10) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg).translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  return g.applyMatrix4(new THREE.Matrix4().compose(a, q, V(1, 1, 1)));
};
const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);

/** the bridge house: z range and top */
export const HOUSE = { z0: -8, z1: 2, w: 3.6, y1: 9.2 };
export const FUNNEL = { z: 6, r: 1.5, y0: 6, y1: 15.5 };

export const buildZebra = (v: number) => {
  const root = new THREE.Group(), b = new Batch();
  const M = {
    hull: lam("zebraHull" + v, () => ({ map: hullTex(v) })),
    sup: lam("zebraSuper" + v, () => ({ map: superTex(v) })),
    fun: lam("zebraFunnel" + v, () => ({ map: funnelTex(v) })),
    deck: lam("zebraDeck", () => ({ color: "#b8956a" })),
    bulw: lam("zebraBulw", () => ({ color: "#e9e6dc", side: THREE.DoubleSide })),
    dark: lam("zebraDark", () => ({ color: "#2a2c33" })),
    mast: lam("zebraMast", () => ({ color: "#d8d2c2" })),
    hatch: lam("zebraHatch", () => ({ color: "#5d6a5a" })),
    boat: lam("zebraBoat", () => ({ color: "#f0ece0" })),
  };
  b.add(hullSide(1), M.hull); b.add(hullSide(-1), M.hull); b.add(transom(), M.dark);
  b.add(deckGeo(), M.deck); b.add(bulwark(1), M.bulw); b.add(bulwark(-1), M.bulw);
  // bridge house: two tiers + wheelhouse
  const H = HOUSE, yd = deckY(-3);
  b.add(new THREE.BoxGeometry(2 * H.w, 2.6, H.z1 - H.z0), M.sup, T(0, yd + 1.3, (H.z0 + H.z1) / 2));
  b.add(new THREE.BoxGeometry(2 * H.w + 1.2, 0.25, H.z1 - H.z0 + 0.8), M.bulw, T(0, yd + 2.7, (H.z0 + H.z1) / 2));
  b.add(new THREE.BoxGeometry(2 * H.w - 1.2, 2.4, H.z1 - H.z0 - 3), M.sup, T(0, yd + 4.0, (H.z0 + H.z1) / 2 - 0.6));
  b.add(new THREE.BoxGeometry(2 * H.w - 0.8, 0.25, H.z1 - H.z0 - 2.4), M.bulw, T(0, yd + 5.3, (H.z0 + H.z1) / 2 - 0.6));
  // funnel + steam pipe
  const F = FUNNEL;
  b.add(new THREE.CylinderGeometry(F.r, F.r * 1.05, F.y1 - F.y0, 20).scale(1, 1, 1.25).translate(0, (F.y0 + F.y1) / 2, F.z), M.fun);
  b.add(cyl(V(0, F.y0, F.z + 2.2), V(0, F.y1 - 1, F.z + 2.0), 0.18), M.dark);
  // masts with cargo booms, hatches between
  for (const [z, top] of [[-18, 19], [17, 17]] as const) {
    const y0 = deckY(z);
    b.add(cyl(V(0, y0, z), V(0, top, z), 0.32, 0.2), M.mast);
    b.add(cyl(V(0, y0 + 2, z), V(0, y0 + 7.5, z + (z < 0 ? 6 : -6)), 0.14), M.mast);
    b.add(new THREE.BoxGeometry(1.6, 0.6, 1.6), M.mast, T(0, y0 + 1.0, z));
    for (const s of [-1, 1]) b.add(cyl(V(s * (halfW(z, topY(z)) - 0.2), topY(z), z + 1.5), V(0, top - 1.5, z), 0.04), M.dark);
    b.add(new THREE.BoxGeometry(4.4, 0.9, 5), M.hatch, T(0, y0 + 0.45, z + (z < 0 ? 6.5 : -6.5)));
  }
  b.add(cyl(V(0, 19, -18), V(0, 17, 17), 0.04), M.dark);
  b.add(cyl(V(0, 19, -18), V(0, topY(BOW + 1), BOW + 1), 0.04), M.dark);
  b.build(root);
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return root;
};

// ---------------- the submarine ----------------
/** sub-local: hull axis along z (bow -z), axis at y = 0; tower top (the commander's platform) at y = TOWER */
export const TOWER = 4.6;
export type Sub = { root: THREE.Group; scope: THREE.Group };
export const buildSub = (): Sub => {
  const root = new THREE.Group(), b = new Batch();
  const M = {
    hull: lam("subHull", () => ({ color: "#6d7c76" })),
    low: lam("subLow", () => ({ color: "#3e4744" })),
    deck: lam("subDeck", () => ({ color: "#7f8a80" })),
    dark: lam("subDark", () => ({ color: "#2a2e2c" })),
  };
  b.add(new THREE.CapsuleGeometry(2.2, 30, 8, 24).rotateX(Math.PI / 2).scale(1, 0.9, 1), M.hull);
  b.add(new THREE.CapsuleGeometry(2.0, 26, 8, 24).rotateX(Math.PI / 2).scale(1.02, 0.6, 1).translate(0, -0.9, 0), M.low);
  b.add(new THREE.BoxGeometry(1.8, 0.5, 28), M.deck, T(0, 2.05, 0));
  // conning tower
  b.add(new THREE.CylinderGeometry(1, 1.1, 2.8, 20).scale(1.3, 1, 2.4).translate(0, 3.2, -2), M.hull);
  b.add(new THREE.TorusGeometry(1, 0.08, 6, 24).rotateX(Math.PI / 2).scale(1.35, 1, 2.45).translate(0, TOWER + 0.9, -2), M.dark);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.add(cyl(V(1.33 * Math.cos(a), TOWER, -2 + 2.43 * Math.sin(a)), V(1.35 * Math.cos(a), TOWER + 0.9, -2 + 2.45 * Math.sin(a)), 0.05), M.dark); }
  // deck gun, net cutter, rails
  b.add(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 12), M.dark, T(0, 2.7, -9));
  b.add(cyl(V(0, 3.0, -9), V(0, 3.3, -12), 0.12), M.dark);
  b.add(cyl(V(0, 1.5, -17), V(0, 4.6, -3.5), 0.06), M.dark);
  b.add(cyl(V(0, 4.6, -0.5), V(0, 1.5, 15), 0.06), M.dark);
  b.build(root);
  const scope = new THREE.Group(), sb = new Batch();
  sb.add(new THREE.CylinderGeometry(0.13, 0.13, 6, 10).translate(0, 3, 0), M.dark);
  sb.add(new THREE.BoxGeometry(0.34, 0.5, 0.5), M.dark, T(0, 6.1, 0.1));
  sb.build(scope); scope.position.set(0, TOWER - 2.6, -1.2);
  root.add(scope);
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { root, scope };
};

// ---------------- the torpedo ----------------
export const buildTorpedo = () => {
  const root = new THREE.Group(), b = new Batch();
  const m = lam("torpBody", () => ({ color: "#a9b2b5" })), d = lam("torpDark", () => ({ color: "#3a3f42" }));
  b.add(new THREE.CylinderGeometry(0.32, 0.32, 5, 16).rotateX(Math.PI / 2), m);
  b.add(new THREE.SphereGeometry(0.32, 16, 10).scale(1, 1, 1.6), d, T(0, 0, -2.5));
  b.add(new THREE.ConeGeometry(0.32, 1.0, 16).rotateX(-Math.PI / 2), m, T(0, 0, 3.0));
  b.add(new THREE.BoxGeometry(1.2, 0.06, 0.4), d, T(0, 0, 3.3)); b.add(new THREE.BoxGeometry(0.06, 1.2, 0.4), d, T(0, 0, 3.3));
  b.add(new THREE.TorusGeometry(0.3, 0.06, 6, 16), d, T(0, 0, 3.6));
  b.build(root);
  return root;
};
