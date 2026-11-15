// Our cartoon Simeulue coast: the beach / seabed slope (dry sand, wet sand), the village flat with stilt houses
// (rumah panggung), grandma's veranda, canoes, palms, the hill with its footpath, and the "other beach" far along the
// coast (umbrellas, loungers). Painted textures follow the bridge look; everything is twoTone-shaded and inked.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray, house } from "./build";
import { ctex, rng, grassHD, planksHD } from "./paint";
import { twoTone } from "./shade";
import { seabedY, hillY, groundY, PATH_Z, OTHER_Z, HOUSE, VER, hh, VILLAGE_Y } from "./story";

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
  sand: () => ctex("sandHD", 512, 512, (g, r) => {
    g.fillStyle = "#e6cf98"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 500; k++) { g.fillStyle = r() < 0.5 ? "rgba(160,120,70,0.22)" : "rgba(255,245,215,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  path: () => ctex("dirtPathS", 512, 512, (g, r) => {
    g.fillStyle = "#c2a06c"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 300; k++) { g.fillStyle = r() < 0.5 ? "rgba(90,60,30,0.25)" : "rgba(235,215,170,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 8, 2 + r() * 5, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  thatch: () => ctex("rumbia", 512, 512, (g, r) => {
    g.fillStyle = "#9a7a4a"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 1400; k++) { const x = r() * 512, y = r() * 512; g.strokeStyle = r() < 0.5 ? "rgba(70,45,20,0.35)" : "rgba(225,195,130,0.3)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + 14 + r() * 16); g.stroke(); }
    for (let y = 0; y < 512; y += 64) { g.fillStyle = "rgba(60,40,20,0.35)"; g.fillRect(0, y, 512, 5); }
  }),
  boards: () => ctex("wallBoards", 512, 512, (g, r) => {
    g.fillStyle = "#b98a58"; g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 42) { g.fillStyle = "rgba(60,35,15,0.55)"; g.fillRect(x, 0, 4, 512); g.fillStyle = `rgba(255,230,180,${(0.08 + r() * 0.1).toFixed(2)})`; g.fillRect(x + 6, 0, 30, 512); }
  }),
};

const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));
/** height-field grid over [x0, x1] x [z0, z1], vertex colour from col(x, y, z) */
const grid = (x0: number, x1: number, z0: number, z1: number, step: number, h: (x: number, z: number) => number, col?: (x: number, y: number) => number) => {
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute, c: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = h(x, z);
    p.setY(i, y);
    const k = col ? col(x, y) : 1; c.push(k, k, k);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
};

/** gable roof (two sloped quads + gable triangles) over a w (along z) x d (along x) box at height y */
const gable = (b: Batch, mat: THREE.Material, end: THREE.Material, cx: number, cz: number, w: number, d: number, y: number, rh: number, o = 0.5) => {
  const pos = (pts: number[][]) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flat(), 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(pts.map((p) => [p[2] / 2, p[1] / 2 + p[0] / 2]).flat(), 2)); g.computeVertexNormals(); return g; };
  const hx = d / 2 + o, hz = w / 2 + o;
  // ridge along z
  const A = [cx - hx, y - 0.2, cz - hz], B = [cx - hx, y - 0.2, cz + hz], C = [cx, y + rh, cz + hz], D = [cx, y + rh, cz - hz];
  const E = [cx + hx, y - 0.2, cz + hz], F = [cx + hx, y - 0.2, cz - hz];
  b.add(pos([A, C, B, A, D, C]), mat); b.add(pos([E, C, D, E, D, F]), mat);
  b.add(pos([[cx - d / 2, y, cz - w / 2], [cx, y + rh - 0.1, cz - w / 2], [cx + d / 2, y, cz - w / 2]]), end);
  b.add(pos([[cx + d / 2, y, cz + w / 2], [cx, y + rh - 0.1, cz + w / 2], [cx - d / 2, y, cz + w / 2]]), end);
};

export const buildCoast = (root: THREE.Object3D, kit: Kit, rays: Ray[]) => {
  lensRays = rays;
  setSight(rays);
  const b = new Batch(), bn = new Batch(), r = rng(41);
  const M = {
    grass: wmat("grassS", 3.0, () => ({ map: grassHD() })),
    sand: wmat("sandS", 3.0, () => ({ map: TX.sand() })),
    wet: wmat("wetS", 3.0, () => ({ map: TX.sand(), color: "#b8a888" })),
    path: wmat("pathS", 3.0, () => ({ map: TX.path() })),
    deck: wmat("deckS", 2.4, () => ({ map: planksHD(), color: "#e2c7a0" })),
    boards: wmat("boardsS", 2.0, () => ({ map: TX.boards() })),
    thatch: lam("rumbiaRoof", () => ({ map: TX.thatch(), side: THREE.DoubleSide })),
    wood: lam("woodPostS", () => ({ color: "#7a4f30" })),
    white: lam("paintWhiteS", () => ({ color: "#efe8d8" })),
    chair: lam("chairBlue", () => ({ color: "#3f8fc8" })),
  };
  // ---- ground: the hill + village flat (grass), the beach + seabed (sand, darker where it is usually under water) ----
  b.add(grid(-200, -10, -160, 460, 2.5, (x, z) => hillY(x, z)), M.grass);
  b.add(grid(-10, -4, -160, 460, 2.0, (x) => seabedY(x)), M.sand);
  b.add(grid(-4, 150, -160, 460, 2.0, (x) => seabedY(x)), M.wet);
  // footpath up the hill
  b.add(grid(-96, -12, PATH_Z - 1.4, PATH_Z + 1.4, 1.0, (x, z) => groundY(x, z) + 0.05), M.path);
  // ---- stilt houses (rumah panggung) along the village flat, facades to +x ----
  const houseAt = (x: number, z: number, w: number, d: number, h: number, si: number, floor = 1.5) => {
    const y = VILLAGE_Y;
    for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) b.add(boxGeo(V(x + sx * (d / 2 - 0.2) - 0.12, y - 0.3, z + sz * (w / 2 - 0.2) - 0.12), V(x + sx * (d / 2 - 0.2) + 0.12, y + floor, z + sz * (w / 2 - 0.2) + 0.12)), M.wood);
    b.add(boxGeo(V(x - d / 2, y + floor - 0.2, z - w / 2), V(x + d / 2, y + floor, z + w / 2)), M.deck);
    b.add(boxGeo(V(x - d / 2 + 0.1, y + floor, z - w / 2 + 0.1), V(x + d / 2 - 0.1, y + floor + h, z + w / 2 - 0.1)), M.boards);
    // door + two windows on the +x facade
    b.add(boxGeo(V(x + d / 2 - 0.12, y + floor, z - 0.5), V(x + d / 2 - 0.06, y + floor + 1.9, z + 0.5)), lam("doorDark", () => ({ color: "#4a3020" })));
    for (const s of [-1, 1]) b.add(boxGeo(V(x + d / 2 - 0.12, y + floor + 0.9, z + s * (w / 4 + 0.3) - 0.45), V(x + d / 2 - 0.06, y + floor + 1.7, z + s * (w / 4 + 0.3) + 0.45)), lam(si % 2 ? "winBlue" : "winGreen", () => ({ color: si % 2 ? "#3f6fb5" : "#2f7a55" })));
    gable(b, M.thatch, M.boards, x, z, w, d, y + floor + h, 1.6);
    // steps up to the door
    for (let k = 0; k < 5; k++) b.add(boxGeo(V(x + d / 2 + 0.2 + k * 0.3, y, z - 0.6), V(x + d / 2 + 0.5 + k * 0.3, y + floor - 0.3 * (k + 1), z + 0.6)), M.deck);
  };
  setSight([]);
  houseAt(HOUSE.x, HOUSE.z, HOUSE.w, HOUSE.d, HOUSE.h, 0, HOUSE.floor);
  setSight(rays);
  // grandma's veranda (deck + rail posts) in front of her house
  b.add(boxGeo(V(VER.x0, VILLAGE_Y, VER.z0), V(VER.x1, VER.y, VER.z1)), M.deck);
  for (const z of [VER.z0 + 0.1, VER.z1 - 0.1]) for (const x of [VER.x1 - 0.12]) b.add(boxGeo(V(x - 0.08, VER.y, z - 0.08), V(x + 0.08, VER.y + 2.4, z + 0.08)), M.wood);
  for (const z of [VER.z0 + 0.1, VER.z1 - 0.1]) b.add(boxGeo(V(VER.x0, VER.y + 0.7, z - 0.04), V(VER.x1, VER.y + 0.8, z + 0.04)), M.wood); // side rails
  // the rest of the village (skipped where a lens looks through)
  const lots: [number, number][] = [];
  for (let i = 0; i < 16; i++) { const z = -64 + i * 8 + (hh(i, 1) - 0.5) * 2; if (Math.abs(z) < 7) continue; lots.push([-18 - (i % 2) * 9 - hh(i, 2) * 3, z]); }
  for (let i = 0; i < 10; i++) lots.push([-34 - hh(i, 3) * 6, -60 + i * 13]);
  lots.forEach(([x, z], i) => {
    const w = 5.5 + hh(i, 4) * 2, d = 5 + hh(i, 5) * 1.5, h = 2.4 + hh(i, 6) * 0.4;
    // own sight test (houseAt bypasses it): skip the lot if any lens looks through it
    const hx = d / 2 + 1, hz = w / 2 + 1;
    if (inLens(x - hx, x + hx, 0, 7, z - hz, z + hz)) return;
    houseAt(x, z, w, d, h, i);
  });
  // canoes on the sand
  for (const [x, z, yaw] of [[-6.5, 2.5, 0.3], [-4.2, -8.5, -0.2], [-7.5, -14, 0.1], [-5, 18, 0.5], [-3.5, 24, -0.4]] as const) prop(b, kit, "canoe", x, seabedY(x), z, 0.7, yaw);
  // ---- palms, trees, bushes ----
  const palms = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_palmShort"];
  const busy = (x: number, z: number) => (x > -20 && x < -9 && Math.abs(z) < 8) || Math.abs(z - PATH_Z) < 3.2;
  for (let i = 0; i < 70; i++) { const x = -12 + r() * 6, z = -150 + r() * 600; if (busy(x, z)) continue; prop(b, kit, palms[i % 4], x, seabedY(x), z, 8 + r() * 5, r() * 6.28); }
  for (let i = 0; i < 140; i++) {
    const x = -40 - r() * 110, z = -120 + r() * 240;
    if (busy(x, z)) continue;
    prop(b, kit, i % 3 ? "tree_fat" : palms[i % 4], x, hillY(x, z), z, 6 + r() * 5, r() * 6.28);
  }
  for (let i = 0; i < 50; i++) { const x = -14 - r() * 30, z = -60 + r() * 120; if (busy(x, z)) continue; prop(b, kit, i % 3 ? "plant_bushDetailed" : "plant_bush", x, hillY(x, z), z, 0.9 + r() * 0.8, r() * 6); }
  // ---- the other beach: umbrellas and loungers ----
  const umb = [lam("umbRed", () => ({ color: "#d8402f", side: THREE.DoubleSide })), lam("umbYellow", () => ({ color: "#f0c93e", side: THREE.DoubleSide })), lam("umbBlue", () => ({ color: "#3f8fc8", side: THREE.DoubleSide }))];
  for (let i = 0; i < 12; i++) {
    const x = -6 + (i % 3) * 3.2, z = OTHER_Z - 18 + Math.floor(i / 3) * 9 + (i % 3) * 1.4, y = seabedY(x);
    if (inLens(x - 1.5, x + 1.5, y, y + 3, z - 1.5, z + 1.5)) continue;
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8).translate(0, 1.2, 0), M.white, yawM(x, y, z));
    b.add(new THREE.ConeGeometry(1.3, 0.55, 16, 1, true).translate(0, 2.4 + 0.27, 0), umb[i % 3], yawM(x, y, z));
    b.add(boxGeo(V(x + 0.6, y + 0.25, z - 0.35), V(x + 2.4, y + 0.35, z + 0.35)), M.chair);
  }
  b.build(root);
  bn.build(root, false);
};

// sight test for the lots (reuse build.ts's culling through a tiny proxy prop)
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

/** a flat card mesh helper (unused placeholder for twoTone import) */
export const _keep = twoTone;
