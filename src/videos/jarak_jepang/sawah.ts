// The sawah east of the village (flat paddy cells with water, grassy dikes, rice canopy blocks), the dirt road along
// x = ROAD, the 1940s truck with its sacks of castor seed, and the wajan with the butter block on the kitchen stove.
// world.ts hides the taken cells' rice, drives the truck and melts / burns the butter per frame.
import * as THREE from "three";
import { Batch, V, boxGeo, lam, prop, Kit } from "./build";
import { ctex } from "./paint";
import { twoTone } from "./shade";
import { worldUV } from "./island";
import { ROAD, SAWAH, TAKEN, WAJAN, TRUCK0 } from "./story";

const tuft = (g: CanvasRenderingContext2D, r: () => number, base: string, dark: string, light: string, n: number, len: number) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512); g.lineCap = "round";
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const x = (col + 0.5) * (512 / n) + (r() - 0.5) * 6, y = (row + 0.5) * (512 / n) + (r() - 0.5) * 6;
    for (let s = 0; s < 5; s++) {
      const a = -Math.PI / 2 + (s - 2) * 0.45 + (r() - 0.5) * 0.3, l = len * (0.6 + r() * 0.5);
      g.strokeStyle = s % 2 ? dark : light; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  }
};
const TX = {
  rice: () => ctex("jRiceTop", 512, 512, (g, r) => tuft(g, r, "#4c7634", "#2f5523", "#86ad55", 12, 18)),
  side: () => ctex("jRiceSide", 512, 512, (g, r) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512); g.lineCap = "round";
    for (let k = 0; k < 260; k++) {
      const x = r() * 512, l = 180 + r() * 330, bend = (r() - 0.5) * 40;
      g.strokeStyle = "rgba(0,0,0,0.22)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, 512); g.quadraticCurveTo(x + bend * 0.3, 512 - l * 0.5, x + bend, 512 - l); g.stroke();
    }
  }),
  water: () => ctex("jPaddyWater", 512, 512, (g, r) => {
    g.fillStyle = "#8fb7c4"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 18; k++) { g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 40 + r() * 70, 10 + r() * 14, 0, 0, Math.PI * 2); g.fill(); }
    for (let k = 0; k < 30; k++) { g.fillStyle = "rgba(110,90,60,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 30, 8 + r() * 10, 0, 0, Math.PI * 2); g.fill(); }
  }),
  dike: () => ctex("jDike", 512, 512, (g, r) => {
    g.fillStyle = "#6f8a42"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 900; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,70,20,0.25)" : "rgba(190,220,120,0.25)"; g.fillRect(r() * 512, r() * 512, 3, 7 + r() * 8); }
  }),
  road: () => ctex("jRoad", 512, 512, (g, r) => {
    g.fillStyle = "#b8976a"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 320; k++) { g.fillStyle = r() < 0.5 ? "rgba(90,60,30,0.25)" : "rgba(235,215,170,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 8, 2 + r() * 5, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  mud: () => ctex("jMud", 512, 512, (g, r) => {
    g.fillStyle = "#7d6040"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 260; k++) { g.fillStyle = r() < 0.5 ? "rgba(50,35,20,0.3)" : "rgba(170,140,100,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 12, 2 + r() * 6, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  sack: () => ctex("jSack", 256, 256, (g, r) => {
    g.fillStyle = "#cdb488"; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 6) { g.fillStyle = "rgba(90,70,40,0.18)"; g.fillRect(0, y, 256, 2); }
    for (let x = 0; x < 256; x += 6) { g.fillStyle = "rgba(90,70,40,0.12)"; g.fillRect(x, 0, 2, 256); }
    void r;
  }),
};
const wm = (key: string, tile: number, make: () => THREE.MeshLambertMaterialParameters) => worldUV(twoTone(new THREE.MeshLambertMaterial(make())), tile, key);
const flat = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);

export type Sawah = { taken: THREE.Group; truck: THREE.Group; butter: THREE.Mesh; puddle: THREE.Mesh };

const buildTruck = () => {
  const root = new THREE.Group(), b = new Batch();
  const M = {
    body: lam("truckBody", () => ({ color: "#5f6b4a" })), dark: lam("truckDark", () => ({ color: "#2a2c2e" })),
    wood: lam("truckWood", () => ({ color: "#8a6440" })), glass: lam("truckGlass", () => ({ color: "#9cc4dc" })),
    sack: lam("truckSack", () => ({ map: TX.sack() })), lamp: lam("truckLamp", () => ({ color: "#f1e6b8" })),
  };
  // truck-local: nose toward -z, ground at y = 0
  b.add(boxGeo(V(-1.0, 0.75, -3.1), V(1.0, 1.75, -1.8)), M.body);                 // hood
  b.add(boxGeo(V(-1.1, 0.75, -1.8), V(1.1, 2.6, -0.3)), M.body);                  // cab
  b.add(boxGeo(V(-0.9, 1.75, -1.82), V(0.9, 2.4, -1.78)), M.glass);              // windscreen
  for (const s of [-1, 1]) b.add(boxGeo(V(s * 1.1 - 0.02, 1.8, -1.5), V(s * 1.1 + 0.02, 2.35, -0.6)), M.glass);
  b.add(boxGeo(V(-1.2, 0.9, -0.2), V(1.2, 1.05, 4.2)), M.wood);                    // bed floor
  for (const s of [-1, 1]) b.add(boxGeo(V(s * 1.2 - 0.06, 1.05, -0.2), V(s * 1.2 + 0.06, 1.75, 4.2)), M.wood);
  b.add(boxGeo(V(-1.2, 1.05, 4.14), V(1.2, 1.75, 4.26)), M.wood);
  for (const s of [-1, 1]) for (const z of [-2.2, 3.0]) b.add(new THREE.CylinderGeometry(0.48, 0.48, 0.32, 18).rotateZ(Math.PI / 2).translate(s * 1.05, 0.48, z), M.dark);
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 14).rotateX(Math.PI / 2).translate(s * 0.7, 1.45, -3.16), M.lamp);
  b.add(boxGeo(V(-1.0, 0.5, -3.2), V(1.0, 0.75, -2.9)), M.dark);                  // bumper
  // sacks: two layers
  for (let i = 0; i < 12; i++) {
    const x = -0.6 + (i % 3) * 0.6, z = 0.4 + Math.floor((i % 6) / 3) * 1.2 + (i >= 6 ? 0.6 : 0) + (i >= 6 ? 1.6 : 0), y = i < 6 ? 1.35 : 1.35;
    b.add(new THREE.SphereGeometry(1, 12, 8).scale(0.3, 0.3, 0.55), M.sack, new THREE.Matrix4().makeTranslation(x, y, z + (i >= 6 ? 0 : 0)));
  }
  for (let i = 0; i < 5; i++) b.add(new THREE.SphereGeometry(1, 12, 8).scale(0.3, 0.28, 0.55), M.sack, new THREE.Matrix4().makeTranslation(-0.45 + (i % 3) * 0.45, 1.85, 0.9 + Math.floor(i / 3) * 1.6));
  b.build(root);
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return root;
};

export const buildSawah = (root: THREE.Object3D, kit: Kit): Sawah => {
  const b = new Batch(), bt = new Batch();
  const M = {
    road: wm("jRoadM", 3, () => ({ map: TX.road() })), water: wm("jWaterM", 6, () => ({ map: TX.water() })),
    dike: wm("jDikeM", 2, () => ({ map: TX.dike() })), mud: wm("jMudM", 3, () => ({ map: TX.mud() })),
    top: wm("jRiceTopM", 2.2, () => ({ map: TX.rice() })), side: wm("jRiceSideM", 1.2, () => ({ map: TX.side(), color: "#3c6229" })),
  };
  b.add(flat(ROAD - 2, ROAD + 2, -400, 400, 0.02), M.road);
  const S = SAWAH, nx = Math.round((S.x1 - S.x0) / S.cw), nz = Math.round((S.z1 - S.z0) / S.cd);
  b.add(flat(S.x0, S.x1, S.z0, S.z1, 0.03), M.water);
  // dikes
  for (let i = 0; i <= nx; i++) { const x = S.x0 + i * S.cw; b.add(boxGeo(V(x - 0.25, 0, S.z0 - 0.25), V(x + 0.25, 0.25, S.z1 + 0.25)), M.dike); }
  for (let j = 0; j <= nz; j++) { const z = S.z0 + j * S.cd; b.add(boxGeo(V(S.x0 - 0.25, 0, z - 0.25), V(S.x1 + 0.25, 0.25, z + 0.25)), M.dike); }
  // rice canopy: one block per cell (taken cells in their own batch)
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x0 = S.x0 + i * S.cw + 0.45, x1 = x0 + S.cw - 0.9, z0 = S.z0 + j * S.cd + 0.45, z1 = z0 + S.cd - 0.9;
    const tb = TAKEN(i, j) ? bt : b;
    tb.add(new THREE.BoxGeometry(x1 - x0, 0.62, z1 - z0).translate((x0 + x1) / 2, 0.31 + 0.03, (z0 + z1) / 2), M.side);
    tb.add(flat(x0, x1, z0, z1, 0.655), M.top);
  }
  // muddy floor of the taken cells (seen once the rice is gone)
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (TAKEN(i, j)) {
    const x0 = S.x0 + i * S.cw + 0.25, z0 = S.z0 + j * S.cd + 0.25;
    b.add(flat(x0, x0 + S.cw - 0.5, z0, z0 + S.cd - 0.5, 0.045), M.mud);
  }
  // palms and trees around the sawah, so the fields end in a tree line instead of bare grass
  for (let i = 0; i < 70; i++) {
    const side = i % 3, t = (i * 0.618) % 1;
    const [x, z] = side === 0 ? [S.x1 + 4 + (i % 4) * 5, S.z0 - 30 + t * (S.z1 - S.z0 + 60)] : side === 1 ? [S.x0 + t * (S.x1 - S.x0 + 20), S.z1 + 5 + (i % 4) * 5] : [S.x0 + t * (S.x1 - S.x0 + 20), S.z0 - 5 - (i % 4) * 5];
    prop(b, kit, i % 4 === 0 ? "tree_fat" : i % 2 ? "tree_palmTall" : "tree_palmBend", x, 0, z, i % 4 === 0 ? 7 + (i % 3) : 9 + (i % 5), i * 1.7);
  }
  b.build(root);
  const taken = new THREE.Group(); bt.build(taken); root.add(taken);
  const truck = buildTruck(); truck.position.set(...TRUCK0); root.add(truck);
  // the wajan (shallow black pan) and the butter block on the stove
  const pan = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.12, 0.005], [0.2, 0.04], [0.24, 0.1], [0.245, 0.11]].map(([r, y]) => new THREE.Vector2(r, y)), 32),
    lam("wajanIron", () => ({ color: "#2f2d2c", side: THREE.DoubleSide })));
  pan.position.set(WAJAN[0], WAJAN[1] - 0.03, WAJAN[2]); pan.castShadow = true; pan.receiveShadow = true; root.add(pan);
  const butter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.1).translate(0, 0.035, 0), lam("butterBlock", () => ({ color: "#f6dc6a" })));
  butter.position.set(WAJAN[0], WAJAN[1] - 0.015, WAJAN[2]); butter.castShadow = true; root.add(butter);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#f2c94a" }));
  puddle.position.set(WAJAN[0], WAJAN[1] - 0.012, WAJAN[2]); root.add(puddle);
  return { taken, truck, butter, puddle };
};
