// Our cartoon warship Vasa (1628), built from code: a lofted oak hull with strong tumblehome, two rows of gun ports
// with open red lids, bronze guns that run out, a tall stern castle with a red-and-gold carved transom (three crowns),
// quarter galleries, beakhead with a gold lion, bowsprit, three masts with tops and yards, furled or set sails, rigging
// and Swedish flags. Ship-local: waterline centre at the origin, bow toward -z, stern transom at z = +19.
// world.ts places the returned group and animates guns / sails / billow per frame.
import * as THREE from "three";
import { Batch, V, lam } from "./build";
import { ctex } from "./paint";

export const BOW = -19, STERN = 19;
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
/** max half-beam at station z */
const beam = (z: number) => {
  if (z < -6) { const t = (z - BOW) / (-6 - BOW); return 5.0 * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)); }
  return 5.0 * (1 - 0.26 * sm((z - 8) / 11));
};
/** keel line and sheer line */
export const keelY = (z: number) => -4.5 + 3.4 * sm((-z - 11) / 8) + 1.2 * sm((z - 14) / 5);
export const topY = (z: number) => 7.2 + 1.9 * sm((-z - 10) / 9) + 6.3 * sm((z - 5) / 12);
/** section shape: 0..1 of the half-beam at height y (tumblehome above the waterline) */
const sect = (y: number, yb: number) => {
  if (y < -0.5) return 0.12 + 0.88 * Math.sin((Math.PI / 2) * Math.max(0, (y - yb) / (-0.5 - yb)));
  if (y < 1.5) return 1;
  return 1 - 0.022 * (y - 1.5);
};
export const halfW = (z: number, y: number) => beam(z) * sect(y, keelY(z));
export const deckY = (z: number) => topY(z) - 0.95;

// gun ports: ship-local (z, y) of each port centre, per row
export const PORTS: { z: number; y: number; s: number }[] = [];
for (let i = 0; i < 12; i++) PORTS.push({ z: -12 + i * 2.1, y: 1.75, s: 0.72 });
for (let i = 0; i < 12; i++) PORTS.push({ z: -11 + i * 2.1, y: 4.35, s: 0.66 });

// ---------------- painted textures ----------------
const U = (z: number) => (z - BOW) / (STERN - BOW);
const VY = (y: number) => (y + 4.5) / 18.5;
const hullTex = () => ctex("vasaHull", 2048, 1024, (g, r) => {
  const W = 2048, H = 1024, px = (z: number) => U(z) * W, py = (y: number) => H - VY(y) * H;
  g.fillStyle = "#9a5c30"; g.fillRect(0, 0, W, H);
  // planks: thin dark seams every ~0.42 m, a little tone drift per strake
  for (let y = -4.5; y < 14; y += 0.42) {
    g.fillStyle = `rgba(${r() < 0.5 ? "255,220,170" : "40,20,10"},${(0.04 + r() * 0.06).toFixed(2)})`; g.fillRect(0, py(y + 0.42), W, py(y) - py(y + 0.42));
    g.fillStyle = "rgba(35,20,12,0.55)"; g.fillRect(0, py(y) - 2, W, 3);
  }
  for (let k = 0; k < 220; k++) { const x = r() * W, y = r() * H; g.fillStyle = "rgba(35,20,12,0.45)"; g.fillRect(x, y, 3, 12 + r() * 10); }
  // below the waterline: darker, tarred
  g.fillStyle = "#3d2a1e"; g.fillRect(0, py(-0.15), W, H - py(-0.15));
  // wales (thick dark belts)
  for (const y of [0.55, 3.1, 5.75]) { g.fillStyle = "#3a2416"; g.fillRect(0, py(y + 0.16), W, py(y - 0.16) - py(y + 0.16)); g.fillStyle = "rgba(255,210,150,0.18)"; g.fillRect(0, py(y + 0.16), W, 4); }
  // red upper works with a gold trim line
  g.fillStyle = "#a3352b"; g.fillRect(0, 0, W, py(6.25));
  g.fillStyle = "#e0b04a"; g.fillRect(0, py(6.25) - 7, W, 7); g.fillRect(0, py(7.9) - 5, W, 5);
  // gold carvings along the high stern (a frieze of little figures in niches)
  for (let z = 7; z < 18.6; z += 0.9) {
    const x = px(z), y0 = py(8.6), y1 = py(12.6);
    g.fillStyle = "#7c241e"; g.fillRect(x + 4, y1, px(z + 0.9) - x - 8, y0 - y1);
    g.fillStyle = "#e3b54e"; g.strokeStyle = "rgba(40,25,10,0.9)"; g.lineWidth = 3;
    const cx = (x + px(z + 0.9)) / 2, h = y0 - y1;
    g.beginPath(); g.ellipse(cx, y1 + h * 0.2, 9, 10, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - 12, y1 + h * 0.34); g.lineTo(cx + 12, y1 + h * 0.34); g.lineTo(cx + 8, y0 - 10); g.lineTo(cx - 8, y0 - 10); g.closePath(); g.fill(); g.stroke();
  }
  // gun ports: dark opening, red inner frame, ink outline
  for (const p of PORTS) {
    const x = px(p.z), y = py(p.y), sx = (p.s / (STERN - BOW)) * W * 0.5, sy = (p.s / 18.5) * H * 0.5;
    g.fillStyle = "#c43c32"; g.fillRect(x - sx - 5, y - sy - 5, 2 * sx + 10, 2 * sy + 10);
    g.fillStyle = "#1c120e"; g.fillRect(x - sx, y - sy, 2 * sx, 2 * sy);
    g.strokeStyle = "rgba(25,15,10,0.95)"; g.lineWidth = 4; g.strokeRect(x - sx - 5, y - sy - 5, 2 * sx + 10, 2 * sy + 10);
  }
});
/** the stern transom: red field, gold frame, rows of gold figures, windows, the three crowns of Sweden */
const sternTex = () => ctex("vasaStern", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#7a4c2e"; g.fillRect(0, 0, S, S);
  const top = 0, red1 = S * 0.62; // red from the top down to ~y 3 m
  g.fillStyle = "#a3352b"; g.fillRect(0, top, S, red1);
  const gold = "#e3b54e", ink = "rgba(40,25,10,0.95)";
  g.lineWidth = 6; g.strokeStyle = ink;
  // gold frame bands
  for (const y of [S * 0.08, S * 0.36, S * 0.6]) { g.fillStyle = gold; g.fillRect(0, y, S, 16); g.strokeRect(-10, y, S + 20, 16); }
  // windows row
  for (let i = 0; i < 5; i++) {
    const x = S * (0.18 + i * 0.16);
    g.fillStyle = gold; g.fillRect(x - 46, S * 0.42, 92, 120); g.strokeRect(x - 46, S * 0.42, 92, 120);
    g.fillStyle = "#3b4a6e"; g.fillRect(x - 32, S * 0.435, 64, 96); g.strokeRect(x - 32, S * 0.435, 64, 96);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x - 26, S * 0.445, 10, 80);
  }
  // the royal shield: blue with three gold crowns, gold lions either side
  const cx = S / 2, cy = S * 0.22;
  g.fillStyle = "#2f5f9e"; g.beginPath(); g.moveTo(cx - 110, cy - 90); g.lineTo(cx + 110, cy - 90); g.lineTo(cx + 110, cy + 30); g.quadraticCurveTo(cx + 100, cy + 110, cx, cy + 135); g.quadraticCurveTo(cx - 100, cy + 110, cx - 110, cy + 30); g.closePath(); g.fill();
  g.strokeStyle = gold; g.lineWidth = 16; g.stroke(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  const crown = (x: number, y: number, s: number) => {
    g.fillStyle = gold; g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x - s, y - s * 0.3); g.lineTo(x - s * 0.5, y + s * 0.1); g.lineTo(x, y - s * 0.6);
    g.lineTo(x + s * 0.5, y + s * 0.1); g.lineTo(x + s, y - s * 0.3); g.lineTo(x + s, y + s * 0.6); g.closePath(); g.fill(); g.strokeStyle = ink; g.lineWidth = 4; g.stroke();
  };
  crown(cx - 50, cy - 35, 30); crown(cx + 50, cy - 35, 30); crown(cx, cy + 50, 30);
  for (const s of [-1, 1]) { // rampant lions as gold blobs with a mane
    const lx = cx + s * 230, ly = cy + 10;
    g.fillStyle = gold; g.strokeStyle = ink; g.lineWidth = 5;
    g.beginPath(); g.ellipse(lx, ly + 40, 48, 80, s * 0.25, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(lx - s * 18, ly - 55, 46, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = "#c08a2c"; g.beginPath(); g.arc(lx - s * 18, ly - 55, 28, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2a1a10"; g.beginPath(); g.arc(lx - s * 30, ly - 62, 5, 0, Math.PI * 2); g.fill();
  }
  // little gold figures in the lower red band
  for (let i = 0; i < 9; i++) {
    const x = S * (0.08 + i * 0.105), y = S * 0.54;
    g.fillStyle = gold; g.strokeStyle = ink; g.lineWidth = 4;
    g.beginPath(); g.arc(x, y - 22, 12, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - 14, y - 8); g.lineTo(x + 14, y - 8); g.lineTo(x + 10, y + 26); g.lineTo(x - 10, y + 26); g.closePath(); g.fill(); g.stroke();
  }
  // planks below
  for (let y = red1 + 16; y < S; y += 30) { g.fillStyle = "rgba(35,20,12,0.5)"; g.fillRect(0, y, S, 3); }
  void r;
});
const galleryTex = () => ctex("vasaGallery", 512, 512, (g) => {
  g.fillStyle = "#a3352b"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(40,25,10,0.95)"; g.lineWidth = 5;
  for (const y of [40, 250, 470]) { g.fillStyle = "#e3b54e"; g.fillRect(0, y, 512, 18); g.strokeRect(-5, y, 522, 18); }
  for (let i = 0; i < 3; i++) { const x = 90 + i * 165; g.fillStyle = "#e3b54e"; g.fillRect(x - 50, 80, 100, 140); g.strokeRect(x - 50, 80, 100, 140); g.fillStyle = "#3b4a6e"; g.fillRect(x - 36, 94, 72, 112); g.strokeRect(x - 36, 94, 72, 112); }
  for (let i = 0; i < 5; i++) { const x = 52 + i * 102; g.fillStyle = "#e3b54e"; g.beginPath(); g.arc(x, 320, 22, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x - 24, 345); g.lineTo(x + 24, 345); g.lineTo(x + 18, 440); g.lineTo(x - 18, 440); g.closePath(); g.fill(); g.stroke(); }
});
const sailTex = () => ctex("vasaSail", 512, 512, (g, r) => {
  g.fillStyle = "#efe4c6"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "rgba(150,120,80,0.28)"; g.fillRect(x, 0, 3, 512); }
  for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(170,140,100,0.08)"; g.fillRect(r() * 512, r() * 512, 60, 20); }
  g.fillStyle = "rgba(120,90,60,0.4)"; g.fillRect(0, 0, 512, 10); g.fillRect(0, 502, 512, 10);
});
/** Swedish flag: blue field, yellow cross (left of centre) */
export const flagSE = () => ctex("flagSE", 320, 200, (g) => {
  g.fillStyle = "#2a64b0"; g.fillRect(0, 0, 320, 200);
  g.fillStyle = "#f4c824"; g.fillRect(0, 80, 320, 40); g.fillRect(100, 0, 40, 200);
});

// ---------------- geometry ----------------
const NZ = 64, NY = 26;
const zAt = (i: number) => BOW + ((STERN - BOW) * i) / NZ;
/** one side of the hull (s = +1 starboard toward +x, -1 port) as an indexed smooth surface */
const hullSide = (s: number) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NZ; i++) {
    const z = zAt(i), yb = keelY(z), yt = topY(z);
    for (let j = 0; j <= NY; j++) {
      const y = yb + ((yt - yb) * j) / NY;
      pos.push(s * halfW(z, y), y, z); uv.push(U(z), VY(y));
    }
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
/** flat stern transom filling the last section */
const transom = () => {
  const z = STERN, yb = keelY(z), yt = topY(z), pts: number[] = [], uv: number[] = [];
  const B = beam(z), ring: [number, number][] = [];
  for (let j = 0; j <= NY; j++) { const y = yb + ((yt - yb) * j) / NY; ring.push([halfW(z, y), y]); }
  const cy = (yb + yt) / 2;
  const P = (x: number, y: number) => { pts.push(x, y, z + 0.01); uv.push(0.5 + x / (2 * B), (y - yb) / (yt - yb)); };
  for (let j = 0; j < NY; j++) {
    const [x0, y0] = ring[j], [x1, y1] = ring[j + 1];
    P(0, cy); P(x0, y0); P(x1, y1);
    P(0, cy); P(-x1, y1); P(-x0, y0);
  }
  P(0, cy); P(ring[NY][0], yt); P(-ring[NY][0], yt);
  P(0, cy); P(-ring[0][0], yb); P(ring[0][0], yb);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};
/** the main deck and the inner face of the bulwarks */
const deckGeo = () => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 1; i <= NZ; i++) {
    const z = zAt(i) - (i === NZ ? 0.05 : 0), yd = deckY(z), w = Math.max(0.05, halfW(z, yd) - 0.3);
    pos.push(-w, yd, z, w, yd, z); uv.push(0, z / 3, w / 3, z / 3);
  }
  for (let i = 0; i < NZ - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const bulwark = (s: number) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 1; i <= NZ; i++) {
    const z = zAt(i), yt = topY(z), yd = deckY(z);
    pos.push(s * (halfW(z, yt) - 0.18), yt, z, s * (halfW(z, yd) - 0.3), yd, z); uv.push(z / 3, 1, z / 3, 0);
  }
  for (let i = 0; i < NZ - 1; i++) { const a = i * 2; if (s > 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  // the rail cap between the outer hull edge and the inner face
  const base = pos.length / 3;
  for (let i = 1; i <= NZ; i++) { const z = zAt(i), yt = topY(z); pos.push(s * halfW(z, yt), yt + 0.02, z, s * (halfW(z, yt) - 0.18), yt + 0.02, z); uv.push(0, 0, 0, 0); }
  for (let i = 0; i < NZ - 1; i++) { const a = base + i * 2; if (s > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const cyl = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, seg = 10) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg).translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  return g.applyMatrix4(new THREE.Matrix4().compose(a, q, V(1, 1, 1)));
};
/** a sail hanging from a yard: top half-width w0 at y0, bottom w1 at y1, bellied toward -z by 1 m (scaled by billow) */
const sailGeo = (w0: number, w1: number, h: number) => {
  const nx = 10, ny = 8, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const t = j / ny, s = i / nx, w = w0 + (w1 - w0) * t, x = (s * 2 - 1) * w, y = -t * h;
    const belly = (1 - (2 * s - 1) ** 2) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.1)));
    pos.push(x, y, -belly); uv.push(s, 1 - t);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** a waving flag plane: hoist at x = 0, fly toward +x (or -x), w x h */
const flagGeo = (w: number, h: number, dir = 1) => {
  const g = new THREE.PlaneGeometry(w, h, 12, 2).translate(w / 2, 0, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.35 * Math.sin(x * 2.2) * (x / w)); p.setX(i, x * dir); }
  if (dir < 0) { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i)); }
  g.computeVertexNormals();
  return g;
};

export type Vasa = {
  root: THREE.Group; guns: THREE.Group[]; setSails: THREE.Group; furled: THREE.Group; sails: THREE.Mesh[];
  flags: THREE.Mesh[];
};
export type MastDef = { z: number; y0: number; top: number; tm: number; yards: { y: number; w: number }[] };
export const MASTS: MastDef[] = [
  { z: -10.5, y0: 6, top: 27, tm: 36, yards: [{ y: 18, w: 8 }, { y: 31.5, w: 5.4 }] },
  { z: 0, y0: 6, top: 30.5, tm: 42, yards: [{ y: 20, w: 9.6 }, { y: 35, w: 6.4 }] },
  { z: 11, y0: 9, top: 23, tm: 30, yards: [] },
];

export const buildVasa = (): Vasa => {
  const root = new THREE.Group();
  const b = new Batch();
  const M = {
    hull: lam("vasaHull", () => ({ map: hullTex() })),
    stern: lam("vasaStern", () => ({ map: sternTex() })),
    gallery: lam("vasaGallery", () => ({ map: galleryTex() })),
    deck: lam("vasaDeck", () => ({ color: "#c79a66" })),
    bulw: lam("vasaBulwark", () => ({ color: "#a3352b", side: THREE.DoubleSide })),
    wood: lam("vasaMast", () => ({ color: "#9a6a3e" })),
    dark: lam("vasaRope", () => ({ color: "#3a2a20" })),
    lid: lam("vasaLid", () => ({ color: "#bb3a2e" })),
    gold: lam("vasaGold", () => ({ color: "#e3b54e" })),
    bronze: lam("vasaBronze", () => ({ color: "#5d5038" })),
    sail: lam("vasaSail", () => ({ map: sailTex(), side: THREE.DoubleSide })),
    lamp: lam("vasaLamp", () => ({ color: "#f7d77a" })),
  };
  b.add(hullSide(1), M.hull); b.add(hullSide(-1), M.hull);
  b.add(transom(), M.stern);
  b.add(deckGeo(), M.deck);
  b.add(bulwark(1), M.bulw); b.add(bulwark(-1), M.bulw);
  // port lids: hinged at the top edge of each port, swung out ~65 degrees
  for (const p of PORTS) for (const s of [-1, 1]) {
    const yTop = p.y + p.s / 2 + 0.05, x = s * (halfW(p.z, yTop) + 0.04);
    const m = new THREE.Matrix4().compose(V(x, yTop, p.z), new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), s * -1.15), V(1, 1, 1));
    b.add(new THREE.BoxGeometry(0.08, p.s + 0.08, p.s + 0.08).translate(0, -(p.s + 0.08) / 2, 0).applyMatrix4(new THREE.Matrix4().makeTranslation(s * 0.04, 0, 0)), M.lid, m);
  }
  // quarter galleries (red + gold boxes on the high stern sides)
  for (const s of [-1, 1]) {
    const z0 = 12.6, z1 = 18.2, y0 = 8.2, y1 = 12.4, x = s * (halfW(15.4, 10) + 0.55);
    b.add(new THREE.BoxGeometry(1.1, y1 - y0, z1 - z0), M.gallery, new THREE.Matrix4().makeTranslation(x, (y0 + y1) / 2, (z0 + z1) / 2));
    b.add(new THREE.ConeGeometry(0.85, 1.4, 8).rotateX(Math.PI), M.gold, new THREE.Matrix4().makeTranslation(x, y0 - 0.65, (z0 + z1) / 2));
    b.add(new THREE.ConeGeometry(0.7, 1.2, 8), M.gold, new THREE.Matrix4().makeTranslation(x, y1 + 0.6, (z0 + z1) / 2));
  }
  // stern lanterns + ensign staff
  for (const x of [-2.2, 0, 2.2]) {
    const y = topY(STERN) + 0.1;
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6).translate(0, 0.3, 0), M.gold, new THREE.Matrix4().makeTranslation(x, y, STERN - 0.4));
    b.add(new THREE.CylinderGeometry(0.42, 0.32, 1.1, 8).translate(0, 1.15, 0), M.lamp, new THREE.Matrix4().makeTranslation(x, y, STERN - 0.4));
    b.add(new THREE.ConeGeometry(0.5, 0.6, 8).translate(0, 2.0, 0), M.gold, new THREE.Matrix4().makeTranslation(x, y, STERN - 0.4));
  }
  b.add(cyl(V(0, topY(STERN) - 1, STERN + 0.4), V(0, topY(STERN) + 6.5, STERN + 1.4), 0.12, 0.09), M.wood);
  // beakhead, gold lion figurehead, bowsprit with spritsail yard
  b.add(new THREE.BoxGeometry(1.4, 1.0, 5.2), M.bulw, new THREE.Matrix4().makeTranslation(0, 6.9, BOW - 2.2));
  b.add(new THREE.SphereGeometry(1, 14, 10).scale(0.5, 0.6, 1.4), M.gold, new THREE.Matrix4().makeTranslation(0, 7.5, BOW - 4.4));
  b.add(new THREE.TorusGeometry(0.42, 0.2, 8, 16), lam("vasaMane", () => ({ color: "#c48a2a" })), new THREE.Matrix4().makeTranslation(0, 8.25, BOW - 5.35));
  b.add(new THREE.SphereGeometry(0.38, 12, 8), M.gold, new THREE.Matrix4().makeTranslation(0, 8.25, BOW - 5.5));
  b.add(cyl(V(0, 7.4, BOW + 3), V(0, 13.5, BOW - 11), 0.42, 0.25), M.wood);
  b.add(cyl(V(-4.5, 11.0, BOW - 7.6), V(4.5, 11.0, BOW - 7.6), 0.16), M.wood);
  // masts, tops, topmasts, yards
  for (const m of MASTS) {
    b.add(cyl(V(0, m.y0, m.z), V(0, m.top + 1.2, m.z), 0.55, 0.4, 12), M.wood);
    b.add(cyl(V(0, m.top, m.z), V(0, m.tm, m.z), 0.3, 0.18, 10), M.wood);
    b.add(new THREE.CylinderGeometry(1.5, 1.3, 0.55, 16), M.wood, new THREE.Matrix4().makeTranslation(0, m.top, m.z));
    b.add(new THREE.SphereGeometry(0.32, 10, 8), M.gold, new THREE.Matrix4().makeTranslation(0, m.tm + 0.2, m.z));
    for (const y of m.yards) b.add(cyl(V(-y.w, y.y, m.z - 0.5), V(y.w, y.y, m.z - 0.5), 0.2, 0.2, 8), M.wood);
    // shrouds: mast top down to the rails, both sides
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const zz = m.z - 1.2 + k * 0.85, yt = topY(zz);
      b.add(cyl(V(s * (halfW(zz, yt) + 0.1), yt, zz), V(s * 0.45, m.top - 0.4, m.z), 0.045, 0.045, 5), M.dark);
    }
  }
  // the lateen yard on the mizzen
  b.add(cyl(V(0, 12.5, 6.5), V(0, 22, 16.5), 0.16, 0.12), M.wood);
  // stays
  b.add(cyl(V(0, 30.2, 0), V(0, topY(-15) , -15.5), 0.06, 0.06, 5), M.dark);
  b.add(cyl(V(0, 26.8, -10.5), V(0, 12.4, BOW - 9), 0.06, 0.06, 5), M.dark);
  b.add(cyl(V(0, 22.8, 11), V(0, 29.5, 0.3), 0.05, 0.05, 5), M.dark);
  b.add(cyl(V(0, 41.5, 0), V(0, 35.5, -10.5), 0.04, 0.04, 5), M.dark);
  b.build(root);
  // guns: one group per side so they run out together
  const guns: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const gb = new Batch(), grp = new THREE.Group();
    for (const p of PORTS) {
      const x = s * (halfW(p.z, p.y) - 0.6);
      gb.add(new THREE.CylinderGeometry(0.15, 0.2, 1.7, 10).rotateZ(Math.PI / 2), M.bronze, new THREE.Matrix4().makeTranslation(x, p.y - 0.04, p.z));
      gb.add(new THREE.TorusGeometry(0.17, 0.05, 6, 12).rotateY(Math.PI / 2), M.bronze, new THREE.Matrix4().makeTranslation(x + s * 0.84, p.y - 0.04, p.z));
    }
    gb.build(grp);
    grp.userData.side = s;
    root.add(grp); guns.push(grp);
  }
  // sails: furled bundles on the yards, or set sails (each its own mesh, scaled in z for the belly)
  const furled = new THREE.Group(), setSails = new THREE.Group(), sails: THREE.Mesh[] = [];
  const fb = new Batch();
  for (const m of MASTS) for (const y of m.yards) fb.add(cyl(V(-y.w * 0.92, y.y + 0.32, m.z - 0.5), V(y.w * 0.92, y.y + 0.32, m.z - 0.5), 0.38, 0.38, 10), M.sail);
  fb.add(cyl(V(0, 13.1, 6.7), V(0, 21.8, 16.2), 0.34, 0.3, 10), M.sail);
  fb.build(furled);
  const sail = (w0: number, w1: number, h: number, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(sailGeo(w0, w1, h), M.sail);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    setSails.add(mesh); sails.push(mesh);
  };
  sail(9.2, 9.8, 9.4, 0, 19.8, -0.8); sail(6.2, 9.0, 13.0, 0, 34.8, -0.8);     // main course + topsail
  sail(7.6, 8.2, 8.4, 0, 17.8, -11.3); sail(5.2, 7.6, 12.0, 0, 31.3, -11.3);   // fore course + topsail
  // mizzen lateen: a triangle under the slanted yard
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 12.6, 6.8, 0, 21.8, 16.2, 0, 10.4, 15.6], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0], 2)); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, M.sail); mesh.castShadow = true; mesh.receiveShadow = true; setSails.add(mesh);
  }
  root.add(furled, setSails);
  // flags
  const fm = lam("flagSE", () => ({ map: flagSE(), side: THREE.DoubleSide }));
  const flags: THREE.Mesh[] = [];
  const flag = (w: number, h: number, x: number, y: number, z: number, yaw: number) => {
    const mesh = new THREE.Mesh(flagGeo(w, h), fm); mesh.position.set(x, y, z); mesh.rotation.y = yaw; root.add(mesh); flags.push(mesh);
  };
  flag(3.2, 2.0, 0, 41.2, 0, Math.PI / 2); flag(2.4, 1.5, 0, 35.4, -10.5, Math.PI / 2); flag(2.0, 1.3, 0, 29.6, 11, Math.PI / 2);
  flag(4.4, 2.8, 0, topY(STERN) + 5.2, STERN + 1.35, -Math.PI / 2);
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { root, guns, setSails, furled, sails, flags };
};
