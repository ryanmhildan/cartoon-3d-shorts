// The Balinese valley: rice terraces (row bodies, dikes, retaining lips, paddy water), the paddy canopy (one instanced
// block per cell, kind chosen per frame), the pura air (candi bentar gate, walls, meru, bale kulkul, umbrellas), the
// path, palms, hills and Gunung Agung. Painted textures follow the bridge look: muted, warm, near-black seams.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray, inTheWay } from "./build";
import { ctex, rng, stoneHD, brick, grassHD } from "./paint";
import { twoTone } from "./shade";
import { CELLS, Cell, Kind, NROW, PURA, GATE, MERU, rowY, rowZ0, rowZ1, hh } from "./story";

// ---------------- painted textures ----------------
const tuftRows = (g: CanvasRenderingContext2D, r: () => number, base: string, dark: string, light: string, n: number, len: number, holes = 0, hole = "#6b5236") => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < holes; k++) { // bitten bare patches
    g.fillStyle = hole; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 40, 14 + r() * 26, r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.lineCap = "round";
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const x = (col + 0.5) * (512 / n) + (r() - 0.5) * 6, y = (row + 0.5) * (512 / n) + (r() - 0.5) * 6;
    for (let s = 0; s < 5; s++) {
      const a = -Math.PI / 2 + (s - 2) * 0.45 + (r() - 0.5) * 0.3, l = len * (0.6 + r() * 0.5);
      g.strokeStyle = s % 2 ? dark : light; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  }
};
const T: Record<string, () => THREE.Texture> = {
  green: () => ctex("riceGreen", 512, 512, (g, r) => tuftRows(g, r, "#527d3c", "#365f2b", "#7ea25a", 9, 22)),
  gold: () => ctex("riceGold", 512, 512, (g, r) => tuftRows(g, r, "#bf9a4c", "#8f7034", "#dcc077", 9, 22)),
  young: () => ctex("riceYoung", 512, 512, (g, r) => tuftRows(g, r, "#86b9c4", "#3f8a35", "#79c457", 8, 14)),
  eaten: () => ctex("riceEaten", 512, 512, (g, r) => tuftRows(g, r, "#9c8c55", "#6e5f34", "#c2ad6a", 9, 14, 14)),
  stubble: () => ctex("riceStubble", 512, 512, (g, r) => tuftRows(g, r, "#8a6a48", "#6b4f33", "#cfb067", 10, 7)),
  side: () => ctex("riceSide", 512, 512, (g, r) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
    g.lineCap = "round";
    for (let k = 0; k < 260; k++) {
      const x = r() * 512, y0 = 512, l = 180 + r() * 330, bend = (r() - 0.5) * 40;
      g.strokeStyle = r() < 0.5 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.0)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + bend * 0.3, y0 - l * 0.5, x + bend, y0 - l); g.stroke();
    }
  }),
  water: () => ctex("paddyWater", 512, 512, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 512, 512); gr.addColorStop(0, "#9fcbe0"); gr.addColorStop(1, "#8bbdd8");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 18; k++) { // soft cloud reflections + ripple ticks
      g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 40 + r() * 70, 10 + r() * 14, 0, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = "rgba(40,90,130,0.25)"; g.lineWidth = 2;
    for (let k = 0; k < 40; k++) { const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 + r() * 16, y); g.stroke(); }
  }),
  dike: () => ctex("dikeTex", 512, 512, (g, r) => {
    g.fillStyle = "#68803f"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 900; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,70,20,0.25)" : "rgba(190,220,120,0.25)"; g.fillRect(r() * 512, r() * 512, 3, 7 + r() * 8); }
    for (let k = 0; k < 30; k++) { g.fillStyle = "rgba(110,80,50,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 12 + r() * 20, 6 + r() * 8, 0, 0, Math.PI * 2); g.fill(); }
  }),
  earth: () => ctex("terraceWall", 512, 512, (g, r) => {
    g.fillStyle = "#7b8a43"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(120,86,52,0.45)"; g.beginPath(); g.ellipse(r() * 512, 300 + r() * 212, 30 + r() * 50, 10 + r() * 18, 0, 0, Math.PI * 2); g.fill(); }
    for (let k = 0; k < 700; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,70,20,0.3)" : "rgba(180,210,110,0.25)"; g.fillRect(r() * 512, r() * 300, 3, 6 + r() * 10); }
  }),
  path: () => ctex("dirtPath", 512, 512, (g, r) => {
    g.fillStyle = "#b39469"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 300; k++) { g.fillStyle = r() < 0.5 ? "rgba(90,60,30,0.25)" : "rgba(235,215,170,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 8, 2 + r() * 5, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  thatch: () => ctex("ijuk", 512, 512, (g, r) => {
    g.fillStyle = "#3e352d"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 1400; k++) { const x = r() * 512, y = r() * 512; g.strokeStyle = r() < 0.5 ? "rgba(0,0,0,0.35)" : "rgba(150,125,95,0.3)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + 14 + r() * 16); g.stroke(); }
    for (let y = 0; y < 512; y += 64) { g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(0, y, 512, 5); }
  }),
  alang: () => ctex("alang", 512, 512, (g, r) => {
    g.fillStyle = "#b99a5f"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 1400; k++) { const x = r() * 512, y = r() * 512; g.strokeStyle = r() < 0.5 ? "rgba(90,60,30,0.3)" : "rgba(240,215,150,0.35)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + 14 + r() * 16); g.stroke(); }
    for (let y = 0; y < 512; y += 64) { g.fillStyle = "rgba(60,40,20,0.3)"; g.fillRect(0, y, 512, 5); }
  }),
};

/** world-space UVs for boxes (instanced or merged): top faces use xz, side faces use (x + z, y), `tile` metres per repeat.
 *  Chains after the twoTone onBeforeCompile already on the material. */
export const worldUV = <M extends THREE.MeshLambertMaterial>(m: M, tile: number, key: string): M => {
  const prev = m.onBeforeCompile.bind(m), prevKey = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
      {
        vec4 wpU = vec4( position, 1.0 );
        #ifdef USE_INSTANCING
          wpU = instanceMatrix * wpU;
        #endif
        wpU = modelMatrix * wpU;
        vec3 nU = normal;
        #if defined( USE_MAP )
          vMapUv = abs( nU.y ) > 0.5 ? wpU.xz / ${tile.toFixed(2)} : vec2( wpU.x + wpU.z, wpU.y * 2.2 ) / ${tile.toFixed(2)};
        #endif
      }`);
  };
  m.customProgramCacheKey = () => prevKey() + "_wuv_" + key;
  return m;
};
const wmat = (key: string, tile: number, make: () => THREE.MeshLambertMaterialParameters) => worldUV(twoTone(new THREE.MeshLambertMaterial(make())), tile, key);

// ---------------- canopy: one instanced block per cell and kind ----------------
export const CANOPY_H: Record<Kind, number> = { water: 0, young: 0.16, green: 0.7, gold: 0.78, eaten: 0.42, stubble: 0.1 };
const KINDS: Kind[] = ["young", "green", "gold", "eaten", "stubble"];
export class Paddies {
  private inst = new Map<Kind, THREE.InstancedMesh>();
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private p = new THREE.Vector3(); private s = new THREE.Vector3();
  constructor(root: THREE.Object3D) {
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    for (const k of KINDS) {
      const top = wmat("rice_" + k, 2.2, () => ({ map: T[k]() }));
      // sides: a darker shade of the top colour with blade strokes
      const sideCol = { young: "#3f7a35", green: "#3d6a2f", gold: "#9c7c38", eaten: "#8a7a48", stubble: "#7a5d3e" }[k];
      const side = wmat("riceSide_" + k, 1.2, () => ({ map: T.side(), color: sideCol }));
      const im = new THREE.InstancedMesh(geo, [side, side, top, side, side, side], CELLS.length);
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      im.count = 0;
      this.inst.set(k, im); root.add(im);
    }
  }
  /** pose every cell: kinds come from story.cellKind; a cell that changes pops in over 4 frames (from the ground) */
  set(kindOf: (c: Cell) => Kind, growOf?: (c: Cell) => number) {
    const n = new Map<Kind, number>(KINDS.map((k) => [k, 0]));
    for (const c of CELLS) {
      const k = kindOf(c);
      if (k === "water") continue;
      const im = this.inst.get(k)!, i = n.get(k)!;
      const g = growOf ? growOf(c) : 1;
      this.p.set(c.cx, c.y + 0.03, c.cz); this.s.set(c.x1 - c.x0 - 0.3, Math.max(0.02, CANOPY_H[k] * g), c.z1 - c.z0 - 0.3);
      im.setMatrixAt(i, this.m4.compose(this.p, this.q, this.s));
      n.set(k, i + 1);
    }
    for (const [k, im] of this.inst) { im.count = n.get(k)!; im.instanceMatrix.needsUpdate = true; }
  }
}

// ---------------- static valley ----------------
const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));

/** square frustum (meru roof tier), base width wb at y0, top width wt at y1 */
const frustum = (wb: number, wt: number, h: number) => {
  const g = new THREE.CylinderGeometry(wt / Math.SQRT2, wb / Math.SQRT2, h, 4, 1, false).rotateY(Math.PI / 4).translate(0, h / 2, 0);
  return g.toNonIndexed();
};

export const buildValley = (root: THREE.Object3D, kit: Kit, rays: Ray[]) => {
  setSight(rays);
  const b = new Batch(), r = rng(23);
  const M = {
    dike: wmat("dike", 2.5, () => ({ map: T.dike() })),
    earth: wmat("earth", 3, () => ({ map: T.earth() })),
    water: wmat("water", 9, () => ({ map: T.water() })),
    path: wmat("path", 4, () => ({ map: T.path() })),
    grass: wmat("grassV", 2.5, () => ({ map: T.dike(), color: "#d8dccb" })),
    stone: lam("paras", () => ({ map: stoneHD("parasHD", ["#a7a296", "#9d988b", "#b1ac9f", "#958f82"], "#6f6a5f") })),
    brick: wmat("brickV", 1.6, () => ({ map: brick(), color: "#e0a088" })),
    thatch: wmat("ijuk", 1.5, () => ({ map: T.thatch() })),
    alang: wmat("alang", 1.5, () => ({ map: T.alang() })),
    wood: lam("baleWood", () => ({ color: "#8a5a36" })),
    gold: lam("gilt", () => ({ color: "#d8a943" })),
    white: lam("clothWhite", () => ({ color: "#f1ece0" })),
    yellow: lam("clothYellow", () => ({ color: "#f0c93e" })),
    hill: [lam("hillA", () => ({ color: "#5f9e45" })), lam("hillB", () => ({ color: "#6aa84d" })), lam("hillC", () => ({ color: "#4f8f3f" }))],
    agung: new THREE.MeshBasicMaterial({ color: "#8ea6bf", fog: false }),
  };
  // ---- ground in front of the terraces + the path ----
  b.add(boxGeo(V(-400, -2, -400), V(400, 0, rowZ0(0) - 0.45)), M.grass);
  b.add(boxGeo(V(-400, 0, -6.4), V(400, 0.015, -2.6)), M.path);
  // ---- terrace rows: body (earth top under the water), front lip (retaining wall / dike), side dikes, water ----
  for (let r0 = 0; r0 < NROW; r0++) {
    const y = rowY(r0), z0 = rowZ0(r0), z1 = rowZ1(r0), lip0 = z0 - 0.45;
    const segs: [number, number][] = z0 < PURA.z1 ? [[-140, PURA.x0], [PURA.x1, 140]] : [[-140, 140]];
    for (const [x0, x1] of segs) {
      b.add(boxGeo(V(x0, -2, lip0), V(x1, y + 0.3, z0)), M.earth);           // lip: retaining wall face + dike top
      b.add(boxGeo(V(x0, -2, z0), V(x1, y, z1)), M.earth);                   // body under the paddies
    }
  }
  // dikes between neighbouring cells + water surfaces
  CELLS.forEach((c, k) => {
    b.add(boxGeo(V(c.x1, c.y - 0.2, c.z0), V(c.x1 + 0.5, c.y + 0.28, c.z1)), M.dike);
    const prev = CELLS[k - 1];
    if (!prev || prev.r !== c.r || Math.abs(prev.x1 + 0.5 - c.x0) > 0.01) b.add(boxGeo(V(c.x0 - 0.5, c.y - 0.2, c.z0), V(c.x0, c.y + 0.28, c.z1)), M.dike);
    b.add(boxGeo(V(c.x0, c.y - 0.2, c.z0), V(c.x1, c.y + 0.03, c.z1)), M.water);
  });
  // ---- hills framing the valley, back hills, Gunung Agung ----
  const bh = new Batch(); // far scenery: never casts sun shadows (a low sun would put the whole valley in hill shadow)
  const dome = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, k = i >> 1;
    bh.add(dome, M.hill[i % 3], yawM(side * (150 + r() * 40), -2, -30 + k * 30 + r() * 10, 0, 50 + r() * 30, 16 + r() * 14, 34 + r() * 16));
  }
  const zBack = rowZ1(NROW - 1);
  for (let i = 0; i < 9; i++) bh.add(dome, M.hill[i % 3], yawM(-200 + i * 50 + r() * 20, rowY(NROW - 1) - 2, zBack + 30 + r() * 30, 0, 50 + r() * 25, 18 + r() * 14, 30));
  const cone = new THREE.ConeGeometry(1, 1, 40, 1, true).translate(0, 0.5, 0);
  bh.add(cone, M.agung, yawM(140, -10, 960, 0, 300, 195, 300));
  // ---- the pura air ----
  const P = PURA;
  b.add(boxGeo(V(P.x0, -1, P.z0), V(P.x1, P.y, P.z1)), M.stone, undefined);
  // front wall with the candi bentar in the middle; side walls; back wall
  const wallH = 2.1, gx = GATE[0], gap = 1.1;
  const wall = (x0: number, z0: number, x1: number, z1: number) => {
    b.add(boxGeo(V(x0, P.y - 0.6, z0), V(x1, P.y + wallH, z1)), M.brick);
    b.add(boxGeo(V(x0 - 0.08, P.y + wallH, z0 - 0.08), V(x1 + 0.08, P.y + wallH + 0.22, z1 + 0.08)), M.stone);
  };
  const fz0 = P.z0 + 0.1, fz1 = P.z0 + 0.6;
  wall(P.x0 + 0.3, fz0, gx - gap - 1.6, fz1); wall(gx + gap + 1.6, fz0, P.x1 - 0.3, fz1);
  wall(P.x0 + 0.3, fz0, P.x0 + 0.8, P.z1 - 0.5); wall(P.x1 - 0.8, fz0, P.x1 - 0.3, P.z1 - 0.5);
  wall(P.x0 + 0.3, P.z1 - 1.0, P.x1 - 0.3, P.z1 - 0.5);
  // candi bentar: two stepped split towers
  for (const s of [-1, 1]) {
    const cx = gx + s * (gap + 0.8);
    const tiers: [number, number, number][] = [[2.0, 0, 1.5], [1.8, 1.5, 2.6], [1.5, 2.6, 3.6], [1.2, 3.6, 4.5], [0.9, 4.5, 5.3], [0.6, 5.3, 6.0], [0.35, 6.0, 6.6]];
    tiers.forEach(([w, y0, y1], i) => {
      // inner faces are flat (the "split" of the gate): towers keep their inner edge at the gap
      const xin = gx + s * gap, xout = xin + s * w * 1.6;
      b.add(boxGeo(V(Math.min(xin, xout), y0, GATE[2] - w * 0.55 + 0.35), V(Math.max(xin, xout), y1, GATE[2] + w * 0.55 + 0.35)), i % 2 ? M.stone : M.brick);
    });
    void cx;
    // steps down to the path
  }
  for (let k = 0; k < 3; k++) b.add(boxGeo(V(gx - gap, 0, GATE[2] - 0.9 + k * 0.3), V(gx + gap, 0.2 * (k + 1), GATE[2] + 0.4)), M.stone);
  // meru: stone base, wooden shrine, 5 black ijuk roofs, gilded finial
  const [mx, my, mz] = MERU;
  b.add(boxGeo(V(mx - 2.2, my, mz - 2.2), V(mx + 2.2, my + 1.3, mz + 2.2)), M.stone);
  b.add(boxGeo(V(mx - 1.3, my + 1.3, mz - 1.3), V(mx + 1.3, my + 3.0, mz + 1.3)), M.wood);
  const roofs = [[5.4, 3.0], [4.5, 2.1], [3.7, 1.6], [3.0, 1.2], [2.3, 0.6]];
  let ry = my + 3.0;
  roofs.forEach(([wb, h]) => {
    b.add(frustum(wb, wb * 0.45, 0.85), M.thatch, yawM(mx, ry, mz));
    b.add(boxGeo(V(mx - 0.55, ry + 0.85, mz - 0.55), V(mx + 0.55, ry + 0.85 + 0.35, mz + 0.55)), M.wood);
    ry += 1.2; void h;
  });
  b.add(new THREE.ConeGeometry(0.28, 1.1, 10).translate(0, 0.55, 0), M.gold, yawM(mx, ry, mz));
  // second, smaller meru (3 roofs) + bale kulkul + umbrellas (tedung) by the gate
  const meru2 = (x: number, z: number, n: number) => {
    b.add(boxGeo(V(x - 1.4, my, z - 1.4), V(x + 1.4, my + 1.0, z + 1.4)), M.stone);
    b.add(boxGeo(V(x - 0.9, my + 1.0, z - 0.9), V(x + 0.9, my + 2.3, z + 0.9)), M.wood);
    let yy = my + 2.3;
    for (let k = 0; k < n; k++) { const w = 3.6 - k * 0.8; b.add(frustum(w, w * 0.45, 0.7), M.thatch, yawM(x, yy, z)); b.add(boxGeo(V(x - 0.4, yy + 0.7, z - 0.4), V(x + 0.4, yy + 0.95, z + 0.4)), M.wood); yy += 0.95; }
    b.add(new THREE.ConeGeometry(0.2, 0.8, 10).translate(0, 0.4, 0), M.gold, yawM(x, yy, z));
  };
  meru2(-31.5, 15, 3); meru2(-19, 16, 3);
  // bale kulkul (drum tower) at the front-right corner, alang-alang hip roof
  const kx = -18.3, kz = 1.6;
  b.add(boxGeo(V(kx - 1.2, my, kz - 1.2), V(kx + 1.2, my + 3.2, kz + 1.2)), M.brick);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(boxGeo(V(kx + sx * 0.9 - 0.1, my + 3.2, kz + sz * 0.9 - 0.1), V(kx + sx * 0.9 + 0.1, my + 5.0, kz + sz * 0.9 + 0.1)), M.wood);
  b.add(frustum(3.2, 0.3, 1.6), M.alang, yawM(kx, my + 5.0, kz));
  b.add(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 12).translate(0, 0.6, 0), M.wood, yawM(kx, my + 3.4, kz));
  // tedung umbrellas flanking the gate (inside, visible over the wall) + frangipani trees
  for (const s of [-1, 1]) {
    const ux = gx + s * 4.2, uz = P.z0 + 2.0;
    b.add(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8).translate(0, 1.7, 0), M.wood, yawM(ux, my, uz));
    b.add(new THREE.ConeGeometry(0.95, 0.45, 18, 1, true).translate(0, 3.4 + 0.22, 0), s < 0 ? M.yellow : M.white, yawM(ux, my, uz));
  }
  // ---- palms, bamboo, bushes: along the path, on the terrace edges, around the pura ----
  const palms = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_palmShort"];
  for (let i = 0; i < 60; i++) {
    const x = -130 + r() * 260, z = -24 + r() * 14;
    if (Math.abs(z + 4.5) < 2.5) continue;
    prop(b, kit, palms[i % 4], x, 0, z, 7 + r() * 5, r() * 6.28);
  }
  for (let i = 0; i < 70; i++) { // palms scattered on the terrace lips (every few cells)
    const c = CELLS[Math.floor(r() * CELLS.length)];
    if (c.r < 2) continue;
    prop(b, kit, palms[i % 4], c.x0 - 0.25, c.y + 0.28, c.z1 + 0.2, 6 + r() * 5, r() * 6.28);
  }
  for (const [x, z] of [[-34, 22], [-17, 22], [-36.5, 6], [-14, 4], [-37, -1], [-13.5, -1.5]] as const) prop(b, kit, palms[(x * 7) & 3], x, 0, z, 8 + (z % 3), z);
  for (let i = 0; i < 30; i++) prop(b, kit, i % 3 ? "plant_bushDetailed" : "plant_bush", -120 + r() * 240, 0, -8 - r() * 16, 0.8 + r() * 0.8, r() * 6);
  for (let i = 0; i < 12; i++) prop(b, kit, "tree_fat", -140 + r() * 280, rowY(NROW - 1), rowZ1(NROW - 1) + 4 + r() * 10, 9 + r() * 5, r() * 6);
  b.build(root);
  bh.build(root, false);
  void inTheWay; void hh;
};
