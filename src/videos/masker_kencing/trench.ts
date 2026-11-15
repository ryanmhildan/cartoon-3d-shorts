// Our cartoon 1915 front line: a straight trench along z (plank-revetted walls, duckboard floor, a fire step on the
// enemy side, sandbag parapet and parados), muddy no-man's land toward +x with craters, wire pickets and bare trees,
// a brazier in the trench, and the town far behind toward -x (gabled houses, a tall cloth-hall tower).
import * as THREE from "three";
import { Batch, V, boxGeo, lam, setSight, Ray, house } from "./build";
import { ctex } from "./paint";
import { twoTone } from "./shade";
import { worldUV } from "./island";
import { FLOOR, TW, BRAZIER, hh } from "./story";

const TX = {
  mud: () => ctex("tMud", 512, 512, (g, r) => {
    g.fillStyle = "#8a7353"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 420; k++) { g.fillStyle = r() < 0.5 ? "rgba(60,42,25,0.25)" : "rgba(190,165,120,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 14, 2 + r() * 7, r() * 3, 0, Math.PI * 2); g.fill(); }
    for (let k = 0; k < 120; k++) { g.fillStyle = "rgba(110,130,70,0.3)"; g.fillRect(r() * 512, r() * 512, 3, 8 + r() * 8); }
  }),
  planks: () => ctex("tPlanks", 512, 512, (g, r) => {
    g.fillStyle = "#8a6440"; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) { g.fillStyle = `rgba(${r() < 0.5 ? "255,220,170" : "40,25,10"},0.12)`; g.fillRect(0, y, 512, 64); g.fillStyle = "rgba(35,22,12,0.7)"; g.fillRect(0, y, 512, 4); }
    for (let x = 0; x < 512; x += 128) { g.fillStyle = "rgba(35,22,12,0.6)"; g.fillRect(x, 0, 10, 512); }
  }),
  bag: () => ctex("tSandbag", 256, 128, (g, r) => {
    g.fillStyle = "#c2a878"; g.fillRect(0, 0, 256, 128);
    for (let y = 0; y < 128; y += 5) { g.fillStyle = "rgba(90,70,40,0.15)"; g.fillRect(0, y, 256, 2); }
    g.fillStyle = "rgba(60,45,25,0.5)"; g.fillRect(0, 0, 256, 5); g.fillRect(0, 123, 256, 5); g.fillRect(0, 0, 5, 128); g.fillRect(251, 0, 5, 128);
    void r;
  }),
  duck: () => ctex("tDuck", 256, 256, (g) => {
    g.fillStyle = "#6a4c30"; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) { g.fillStyle = "#a07a50"; g.fillRect(0, y + 4, 256, 22); }
  }),
};
const wm = (key: string, tile: number, make: () => THREE.MeshLambertMaterialParameters) => worldUV(twoTone(new THREE.MeshLambertMaterial(make())), tile, key);
const flat = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
const cyl = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, seg = 8) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg).translate(0, L / 2, 0);
  return g.applyMatrix4(new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)));
};

export const buildTrench = (root: THREE.Object3D, rays: Ray[]) => {
  const b = new Batch();
  const M = {
    mud: wm("tMudM", 4, () => ({ map: TX.mud() })), planks: wm("tPlankM", 2.4, () => ({ map: TX.planks() })),
    bag: lam("tBagM", () => ({ map: TX.bag() })), duck: wm("tDuckM", 1.2, () => ({ map: TX.duck() })),
    post: lam("tPost", () => ({ color: "#5a4030" })), wire: lam("tWire", () => ({ color: "#3a3430" })),
    crater: lam("tCrater", () => ({ color: "#5a4632" })), tree: lam("tTree", () => ({ color: "#4a3a2c" })),
    iron: lam("tIron", () => ({ color: "#3a3532" })), coal: lam("tCoal", () => ({ color: "#ff8a3a", emissive: "#ff5a1a", emissiveIntensity: 1.2 })),
    tower: lam("tTower", () => ({ color: "#b9ad98" })), roof: lam("tRoofDark", () => ({ color: "#6a5a64" })),
  };
  setSight([]);
  const L = 220;
  // ground on both sides of the cut, the trench floor (duckboards), plank walls
  b.add(flat(-900, -TW, -900, 900, 0), M.mud);
  b.add(flat(TW, 900, -900, 900, 0), M.mud);
  b.add(flat(-TW, TW, -L, L, FLOOR), M.mud);
  b.add(flat(-0.45, 0.45, -L, L, FLOOR + 0.03), M.duck);
  b.add(boxGeo(V(-TW - 0.1, FLOOR, -L), V(-TW, 0, L)), M.planks);
  b.add(boxGeo(V(TW, FLOOR, -L), V(TW + 0.1, 0, L)), M.planks);
  for (let z = -L; z < L; z += 2.4) for (const s of [-1, 1]) b.add(boxGeo(V(s * TW - 0.08, FLOOR, z - 0.08), V(s * TW + 0.08, 0.15, z + 0.08)), M.post);
  // fire step on the enemy side
  b.add(boxGeo(V(TW - 0.55, FLOOR, -L), V(TW, FLOOR + 0.5, L)), M.planks);
  // sandbags: parapet (3 rows, +x) and parados (2 rows, -x)
  const bag = new THREE.BoxGeometry(0.7, 0.24, 0.42);
  for (let z = -L; z < L; z += 0.72) {
    for (let r = 0; r < 3; r++) b.add(bag, M.bag, new THREE.Matrix4().makeRotationY(Math.PI / 2 + (hh(z, r) - 0.5) * 0.15).setPosition(TW + 0.25 + r * 0.05, 0.12 + r * 0.24, z + (r % 2) * 0.36));
    for (let r = 0; r < 2; r++) b.add(bag, M.bag, new THREE.Matrix4().makeRotationY(Math.PI / 2 + (hh(z, r + 5) - 0.5) * 0.15).setPosition(-TW - 0.25, 0.12 + r * 0.24, z + (r % 2) * 0.36));
  }
  // no-man's land: craters, wire pickets with strands, bare trees
  for (let i = 0; i < 60; i++) {
    const x = 8 + hh(i, 1) * 160, z = -150 + hh(i, 2) * 300, r = 1.5 + hh(i, 3) * 3;
    b.add(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2).translate(x, 0.02, z), M.crater);
    b.add(new THREE.TorusGeometry(r, 0.35, 6, 20).rotateX(Math.PI / 2).scale(1, 0.5, 1).translate(x, 0.05, z), M.mud);
  }
  for (let row = 0; row < 2; row++) {
    const x = 9 + row * 5;
    let prev: THREE.Vector3 | null = null;
    for (let z = -120; z <= 120; z += 3) {
      const top = V(x + (hh(z, row) - 0.5) * 0.6, 1.1, z);
      b.add(cyl(V(top.x, 0, z), top, 0.05), M.post);
      if (prev) { b.add(cyl(prev, top, 0.012, 0.012, 4), M.wire); b.add(cyl(prev.clone().setY(0.6), top.clone().setY(0.6), 0.012, 0.012, 4), M.wire); }
      prev = top;
    }
  }
  for (let i = 0; i < 26; i++) {
    const x = 20 + hh(i, 7) * 140, z = -140 + hh(i, 8) * 280, h = 4 + hh(i, 9) * 5;
    b.add(cyl(V(x, 0, z), V(x + 0.4, h, z + 0.2), 0.35, 0.12), M.tree);
    for (let k = 0; k < 3; k++) { const a = hh(i, k + 10) * 6.28, y = h * (0.5 + k * 0.15); b.add(cyl(V(x + 0.2, y, z), V(x + 0.2 + Math.cos(a) * 1.6, y + 1.2, z + Math.sin(a) * 1.6), 0.08, 0.03), M.tree); }
  }
  // the brazier in the trench (a perforated iron bucket on legs, glowing coals)
  const [bx, by, bz] = BRAZIER;
  b.add(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 14, 1, true).translate(bx, by + 0.6, bz), M.iron);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * 6.28; b.add(cyl(V(bx + 0.25 * Math.cos(a), by, bz + 0.25 * Math.sin(a)), V(bx + 0.18 * Math.cos(a), by + 0.4, bz + 0.18 * Math.sin(a)), 0.025), M.iron); }
  b.add(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 14).translate(bx, by + 0.8, bz), M.coal);
  // the town far behind (-x): houses and the tall tower
  setSight(rays);
  for (let i = 0; i < 18; i++) house(b, -95 - (i % 3) * 12, -70 + i * 9, Math.PI / 2, 7 + (i % 2) * 2, 9, 7 + (i % 3) * 1.4, i % 8, 0);
  b.add(boxGeo(V(-128, 0, -6), V(-118, 34, 4)), M.tower);
  b.add(new THREE.ConeGeometry(6.5, 12, 4).rotateY(Math.PI / 4).translate(-123, 40, -1), M.roof);
  b.build(root);
};
