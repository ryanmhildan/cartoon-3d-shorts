// Our cartoon Bajau village over the sea: the sandy seabed, stilt houses (rumah panggung) standing in the water, open
// decks and a plank walk, canoes, and the coral reef toward +x (branching corals, brain corals, sea fans, tube
// sponges, seaweed, rocks). Painted textures follow the bridge look; everything is twoTone-shaded and inked.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray } from "./build";
import { ctex, rng, planksHD } from "./paint";
import { twoTone } from "./shade";
import { seabedY, FLOOR, HOUSE, DECK, DECK2, DECK3, hh } from "./story";

/** world-space UVs for boxes / meshes: top faces use xz, side faces use (x + z, y), `tile` metres per repeat */
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
const mats = new Map<string, THREE.MeshLambertMaterial>();
const wmat = (key: string, tile: number, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key);
  if (!m) { m = worldUV(twoTone(new THREE.MeshLambertMaterial(make())), tile, key); mats.set(key, m); }
  return m;
};

const TX = {
  sand: () => ctex("seaSandHD", 512, 512, (g, r) => {
    g.fillStyle = "#e2cf9e"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 500; k++) { g.fillStyle = r() < 0.5 ? "rgba(150,120,80,0.2)" : "rgba(255,248,222,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, Math.PI * 2); g.fill(); }
    // soft sand ripples
    for (let y = 20; y < 512; y += 46) { g.strokeStyle = "rgba(160,130,85,0.22)"; g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + 8 * Math.sin(x / 40 + y)); g.stroke(); }
  }),
  thatch: () => ctex("rumbia", 512, 512, (g, r) => {
    g.fillStyle = "#9a7a4a"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 1400; k++) { const x = r() * 512, y = r() * 512; g.strokeStyle = r() < 0.5 ? "rgba(70,45,20,0.35)" : "rgba(225,195,130,0.3)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + 14 + r() * 16); g.stroke(); }
    for (let y = 0; y < 512; y += 64) { g.fillStyle = "rgba(60,40,20,0.35)"; g.fillRect(0, y, 512, 5); }
  }),
  boards: () => ctex("wallBoards", 512, 512, (g, r) => {
    g.fillStyle = "#c8a070"; g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 42) { g.fillStyle = "rgba(60,35,15,0.55)"; g.fillRect(x, 0, 4, 512); g.fillStyle = `rgba(255,235,195,${(0.08 + r() * 0.1).toFixed(2)})`; g.fillRect(x + 6, 0, 30, 512); }
  }),
};

const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));
const tiltM = (x: number, y: number, z: number, yaw: number, tilt: number, s = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0, "YXZ")), V(s, s, s));
/** height-field grid over [x0, x1] x [z0, z1] */
const grid = (x0: number, x1: number, z0: number, z1: number, step: number, h: (x: number, z: number) => number) => {
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute, c: number[] = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, h(x, z)); c.push(1, 1, 1); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
};

/** gable roof (two sloped quads + gable triangles) over a w (along z) x d (along x) box at height y */
const gable = (b: Batch, mat: THREE.Material, end: THREE.Material, cx: number, cz: number, w: number, d: number, y: number, rh: number, o = 0.5) => {
  const pos = (pts: number[][]) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flat(), 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(pts.map((p) => [p[2] / 2, p[1] / 2 + p[0] / 2]).flat(), 2)); g.computeVertexNormals(); return g; };
  const hx = d / 2 + o, hz = w / 2 + o;
  const A = [cx - hx, y - 0.2, cz - hz], B = [cx - hx, y - 0.2, cz + hz], C = [cx, y + rh, cz + hz], D = [cx, y + rh, cz - hz];
  const E = [cx + hx, y - 0.2, cz + hz], F = [cx + hx, y - 0.2, cz - hz];
  b.add(pos([A, C, B, A, D, C]), mat); b.add(pos([E, C, D, E, D, F]), mat);
  b.add(pos([[cx - d / 2, y, cz - w / 2], [cx, y + rh - 0.1, cz - w / 2], [cx + d / 2, y, cz - w / 2]]), end);
  b.add(pos([[cx + d / 2, y, cz + w / 2], [cx, y + rh - 0.1, cz + w / 2], [cx - d / 2, y, cz + w / 2]]), end);
};

const CORAL = ["#e8607a", "#f08a3c", "#9a5ac8", "#f2c84a", "#e2453c", "#5ab0c8"];

export const buildCoast = (root: THREE.Object3D, kit: Kit, rays: Ray[]) => {
  lensRays = rays;
  setSight(rays);
  const b = new Batch(), r = rng(41);
  const M = {
    sand: wmat("seaSand", 3.2, () => ({ map: TX.sand() })),
    deck: wmat("deckS", 2.4, () => ({ map: planksHD(), color: "#e2c7a0" })),
    boards: [wmat("boardsS0", 2.0, () => ({ map: TX.boards() })), wmat("boardsS1", 2.0, () => ({ map: TX.boards(), color: "#a9cfc4" })),
      wmat("boardsS2", 2.0, () => ({ map: TX.boards(), color: "#e8d0a8" })), wmat("boardsS3", 2.0, () => ({ map: TX.boards(), color: "#9fc0e0" }))],
    thatch: lam("rumbiaRoof", () => ({ map: TX.thatch(), side: THREE.DoubleSide })),
    zinc: lam("zincRoof", () => ({ color: "#9aa4ad", side: THREE.DoubleSide })),
    wood: lam("woodPostS", () => ({ color: "#7a4f30" })),
    rock: lam("reefRock", () => ({ color: "#9c8f80" })),
    weed: lam("seaweed", () => ({ color: "#4f9a55" })),
    coral: CORAL.map((c) => lam("coral" + c, () => ({ color: c }))),
  };
  // ---- the seabed ----
  b.add(grid(-160, 200, -160, 160, 2.0, seabedY), M.sand);
  // ---- stilt houses standing in the water, facades to +x ----
  const houseAt = (x: number, z: number, w: number, d: number, h: number, si: number) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) {
      const px = x + sx * (d / 2 - 0.2), pz = z + sz * (w / 2 - 0.2);
      b.add(boxGeo(V(px - 0.12, seabedY(px, pz) - 0.3, pz - 0.12), V(px + 0.12, FLOOR, pz + 0.12)), M.wood);
    }
    b.add(boxGeo(V(x - d / 2, FLOOR - 0.2, z - w / 2), V(x + d / 2, FLOOR, z + w / 2)), M.deck);
    b.add(boxGeo(V(x - d / 2 + 0.1, FLOOR, z - w / 2 + 0.1), V(x + d / 2 - 0.1, FLOOR + h, z + w / 2 - 0.1)), M.boards[si % 4]);
    b.add(boxGeo(V(x + d / 2 - 0.12, FLOOR, z - 0.5), V(x + d / 2 - 0.06, FLOOR + 1.9, z + 0.5)), lam("doorDark", () => ({ color: "#4a3020" })));
    for (const s of [-1, 1]) b.add(boxGeo(V(x + d / 2 - 0.12, FLOOR + 0.9, z + s * (w / 4 + 0.3) - 0.45), V(x + d / 2 - 0.06, FLOOR + 1.7, z + s * (w / 4 + 0.3) + 0.45)), lam(si % 2 ? "winBlue" : "winGreen", () => ({ color: si % 2 ? "#3f6fb5" : "#2f7a55" })));
    gable(b, si % 3 === 2 ? M.zinc : M.thatch, M.boards[si % 4], x, z, w, d, FLOOR + h, 1.5);
  };
  /** open deck over the water with posts and a low rail on the sea side */
  const deck = (D: { x0: number; x1: number; z0: number; z1: number }, rail = true) => {
    b.add(boxGeo(V(D.x0, FLOOR - 0.22, D.z0), V(D.x1, FLOOR, D.z1)), M.deck);
    for (let x = D.x0 + 0.2; x <= D.x1; x += (D.x1 - D.x0 - 0.4) / 2) for (const z of [D.z0 + 0.2, (D.z0 + D.z1) / 2, D.z1 - 0.2])
      b.add(boxGeo(V(x - 0.1, seabedY(x, z) - 0.3, z - 0.1), V(x + 0.1, FLOOR - 0.2, z + 0.1)), M.wood);
    if (rail) for (const z of [D.z0 + 0.08, D.z1 - 0.08]) {
      b.add(boxGeo(V(D.x0, FLOOR + 0.62, z - 0.04), V(D.x1, FLOOR + 0.7, z + 0.04)), M.wood);
      for (let x = D.x0 + 0.5; x < D.x1; x += 1.3) b.add(boxGeo(V(x - 0.04, FLOOR, z - 0.04), V(x + 0.04, FLOOR + 0.7, z + 0.04)), M.wood);
    }
  };
  setSight([]);
  houseAt(HOUSE.x, HOUSE.z, HOUSE.w, HOUSE.d, HOUSE.h, 0);
  houseAt(HOUSE.x, 22, 6.5, 5.6, 2.5, 1);
  houseAt(HOUSE.x, -22, 6.5, 5.6, 2.5, 2);
  deck(DECK); deck(DECK2); deck(DECK3);
  setSight(rays);
  // the plank walk joining the houses (behind the decks)
  const WX = -15.8;
  for (let z = -70; z < 70; z += 2.4) {
    if (inLens(WX - 0.7, WX + 0.7, FLOOR - 0.3, FLOOR + 0.1, z, z + 2.4)) continue;
    b.add(boxGeo(V(WX - 0.6, FLOOR - 0.35, z), V(WX + 0.6, FLOOR - 0.2, z + 2.35)), M.deck);
    for (const s of [-1, 1]) b.add(boxGeo(V(WX + s * 0.5 - 0.07, seabedY(WX, z) - 0.3, z + 1.1), V(WX + s * 0.5 + 0.07, FLOOR - 0.3, z + 1.24)), M.wood);
  }
  // the rest of the village (skipped where a lens looks through)
  const lots: [number, number][] = [];
  for (let i = 0; i < 18; i++) { const z = -72 + i * 8.5 + (hh(i, 1) - 0.5) * 2; if (Math.abs(z) < 8 || Math.abs(Math.abs(z) - 22) < 6) continue; lots.push([-11 - (i % 2) * 1.5 - hh(i, 2) * 2, z]); }
  for (let i = 0; i < 14; i++) lots.push([-23 - hh(i, 3) * 4, -66 + i * 10]);
  for (let i = 0; i < 12; i++) lots.push([-36 - hh(i, 7) * 6, -60 + i * 11]);
  lots.forEach(([x, z], i) => {
    const w = 5.5 + hh(i, 4) * 2, d = 5 + hh(i, 5) * 1.5, h = 2.3 + hh(i, 6) * 0.5;
    const hx = d / 2 + 1, hz = w / 2 + 1;
    if (inLens(x - hx, x + hx, -6, FLOOR + h + 2, z - hz, z + hz)) return;
    houseAt(x, z, w, d, h, i + 3);
  });
  // canoes (lepa) floating by the decks
  for (const [x, z, yaw] of [[-2.2, 4.5, 0.15], [-2.0, -5.5, -0.2], [-1.8, 16.5, 0.1], [-2.5, -16, 0.4], [-1.5, 30, -0.3], [2, -34, 0.6], [-3, 40, 0.2]] as const)
    prop(b, kit, "canoe", x, -0.25, z, 0.75, yaw);
  // ---- the reef ----
  const reefBox = (x: number, z: number, rr: number, hgt: number) => inLens(x - rr, x + rr, seabedY(x, z) - 0.2, seabedY(x, z) + hgt, z - rr, z + rr);
  const branch = (x: number, z: number, s: number, col: THREE.Material) => {
    const y = seabedY(x, z);
    if (reefBox(x, z, 0.9 * s, 1.6 * s)) return;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r(), t = 0.25 + r() * 0.45, len = (0.9 + r() * 0.7) * s;
      b.add(new THREE.CylinderGeometry(0.07 * s, 0.11 * s, len, 7).translate(0, len / 2, 0), col, tiltM(x + Math.cos(a) * 0.12 * s, y, z + Math.sin(a) * 0.12 * s, a, t));
      b.add(new THREE.SphereGeometry(0.1 * s, 8, 6), col, new THREE.Matrix4().setPosition(x + Math.cos(a) * 0.12 * s + Math.sin(a) * Math.sin(t) * len, y + Math.cos(t) * len, z + Math.sin(a) * 0.12 * s + Math.cos(a) * Math.sin(t) * len));
    }
  };
  const brain = (x: number, z: number, s: number) => {
    const y = seabedY(x, z);
    if (reefBox(x, z, 0.8 * s, 0.9 * s)) return;
    b.add(new THREE.SphereGeometry(0.75 * s, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 0.75, 1), lam("brainCoral", () => ({ color: "#c9b54a" })), new THREE.Matrix4().setPosition(x, y - 0.05, z));
  };
  const fan = (x: number, z: number, s: number, col: THREE.Material) => {
    const y = seabedY(x, z);
    if (reefBox(x, z, 0.8 * s, 1.8 * s)) return;
    b.add(new THREE.CircleGeometry(0.8 * s, 20, 0, Math.PI).translate(0, 0.25 * s, 0), col, yawM(x, y, z, r() * 3));
    b.add(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.3 * s, 6).translate(0, 0.15 * s, 0), col, yawM(x, y, z));
  };
  const tubes = (x: number, z: number, s: number, col: THREE.Material) => {
    const y = seabedY(x, z);
    if (reefBox(x, z, 0.7 * s, 1.5 * s)) return;
    for (let k = 0; k < 4; k++) {
      const h = (0.7 + r() * 0.8) * s;
      b.add(new THREE.CylinderGeometry(0.17 * s, 0.13 * s, h, 12, 1, true).translate(0, h / 2, 0), col, tiltM(x + (r() - 0.5) * 0.6 * s, y, z + (r() - 0.5) * 0.6 * s, r() * 6, (r() - 0.5) * 0.4));
    }
  };
  const weed = (x: number, z: number, s: number) => {
    const y = seabedY(x, z);
    if (reefBox(x, z, 0.4 * s, 2.4 * s)) return;
    for (let k = 0; k < 5; k++) { const h = (1.2 + r() * 1.3) * s; b.add(new THREE.ConeGeometry(0.09 * s, h, 5).translate(0, h / 2, 0), M.weed, tiltM(x + (r() - 0.5) * 0.5, y, z + (r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.35)); }
  };
  const rock = (x: number, z: number, s: number) => {
    const y = seabedY(x, z);
    if (reefBox(x, z, 1.1 * s, 1.2 * s)) return;
    b.add(new THREE.DodecahedronGeometry(s, 0).scale(1.3, 0.7, 1), M.rock, yawM(x, y + 0.15 * s, z, r() * 6));
  };
  for (let i = 0; i < 150; i++) {
    const x = 10 + r() * 46, z = -26 + r() * 52, s = 0.7 + r() * 0.8, kind = i % 6, col = M.coral[i % CORAL.length];
    if (kind === 0 || kind === 3) branch(x, z, s, col);
    else if (kind === 1) brain(x, z, s);
    else if (kind === 2) fan(x, z, s, M.coral[(i + 2) % CORAL.length]);
    else if (kind === 4) tubes(x, z, s, M.coral[(i + 1) % 3 === 0 ? 1 : 3]);
    else weed(x, z, s);
  }
  for (let i = 0; i < 40; i++) { const x = 8 + r() * 60, z = -40 + r() * 80; rock(x, z, 0.5 + r() * 0.9); }
  // seaweed and stones under the village too
  for (let i = 0; i < 40; i++) { const x = -10 + r() * 16, z = -60 + r() * 120; weed(x, z, 0.8 + r() * 0.5); }
  b.build(root);
};

// sight test for the lots and reef pieces
let lensRays: Ray[] = [];
const inLens = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
  for (const { o, d, len } of lensRays) {
    let t0 = 0, t1 = len;
    for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
      if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) t0 = Infinity; continue; }
      const ta = (a - oo) / dd, tb = (b - oo) / dd;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t0 <= t1) return true;
  }
  return false;
};
export const setLensRays = (rays: Ray[]) => { lensRays = rays; };
export const _keep = twoTone;
