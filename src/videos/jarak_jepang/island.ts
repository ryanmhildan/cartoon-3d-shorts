// Our cartoon Javanese village yard for "Kendi Bocor": flat grass land with a packed-earth yard, Mbah Sumi's house
// (woven-bamboo walls, terracotta tiles), her open kitchen shed (posts, tiled gable roof, gedek back wall, clay stove,
// shelf, water jar) with the wooden table, the clay KENDI (lathe, unglazed, damp lower belly, spout) and Bayu's glass
// BOTTLE as their own objects (world.ts shows / hides them per shot), neighbour houses, palms, trees and a bamboo fence.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray } from "./build";
import { ctex, rng, grassHD, planksHD, roofHD } from "./paint";
import { twoTone } from "./shade";
import { HOUSE, SHED, TABLE, TOP, STOVE, KENDI, BOTTLE, hh } from "./story";

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
  dirt: () => ctex("yardDirt", 512, 512, (g, r) => {
    g.fillStyle = "#c9a477"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 340; k++) { g.fillStyle = r() < 0.5 ? "rgba(110,75,40,0.22)" : "rgba(240,220,180,0.28)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 9, 2 + r() * 5, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  floor: () => ctex("shedFloor", 512, 512, (g, r) => {
    g.fillStyle = "#a9825a"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 260; k++) { g.fillStyle = r() < 0.6 ? "rgba(80,52,28,0.22)" : "rgba(220,190,150,0.22)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 12, 2 + r() * 6, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  /** gedek: woven split-bamboo wall, diagonal twill */
  gedek: () => ctex("gedek", 512, 512, (g, r) => {
    g.fillStyle = "#d9b77a"; g.fillRect(0, 0, 512, 512);
    const s = 32;
    for (let y = 0; y < 512; y += s) for (let x = 0; x < 512; x += s) {
      const h = ((x / s + y / s) % 4) < 2;
      g.fillStyle = h ? `rgba(255,236,190,${(0.15 + r() * 0.12).toFixed(2)})` : `rgba(120,80,40,${(0.18 + r() * 0.1).toFixed(2)})`;
      g.fillRect(x + 1, y + 1, s - 2, s - 2);
      g.strokeStyle = "rgba(90,58,30,0.5)"; g.lineWidth = 2;
      if (h) { g.beginPath(); g.moveTo(x + 2, y + s / 2); g.lineTo(x + s - 2, y + s / 2); g.stroke(); }
      else { g.beginPath(); g.moveTo(x + s / 2, y + 2); g.lineTo(x + s / 2, y + s - 2); g.stroke(); }
    }
  }),
  /** the kendi: unglazed terracotta, a little lighter and dry at the neck, darker and damp (sweating) on the belly */
  kendi: () => ctex("kendiClay", 1024, 512, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#cf8452"); gr.addColorStop(0.32, "#c6784a"); gr.addColorStop(0.5, "#a95f3b"); gr.addColorStop(1, "#8e4c30");
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    for (let k = 0; k < 900; k++) { g.fillStyle = r() < 0.5 ? "rgba(90,45,25,0.25)" : "rgba(240,180,130,0.22)"; g.fillRect(r() * 1024, r() * 512, 2 + r() * 2, 2 + r() * 2); }
    // a painted ring on the shoulder
    g.fillStyle = "rgba(245,225,190,0.55)"; g.fillRect(0, 150, 1024, 7); g.fillRect(0, 168, 1024, 4);
    // droplets of seeped water on the damp belly (v up: canvas y = 512 (base) .. 0 (lip))
    for (let k = 0; k < 70; k++) {
      const x = r() * 1024, y = 200 + r() * 280, s = 5 + r() * 7;
      g.fillStyle = "rgba(70,35,20,0.35)"; g.beginPath(); g.ellipse(x + 1.5, y + 2, s * 0.8, s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(190,225,235,0.75)"; g.beginPath(); g.ellipse(x, y, s * 0.75, s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.ellipse(x - s * 0.25, y - s * 0.35, s * 0.22, s * 0.3, 0, 0, Math.PI * 2); g.fill();
    }
  }),
  /** the glass bottle: pale aqua glass, water to 3/4, a white highlight stripe and a darker edge stripe */
  glass: () => ctex("bottleGlass", 512, 256, (g) => {
    g.fillStyle = "#cdeefa"; g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#7fcbe8"; g.fillRect(0, 70, 512, 186);
    g.fillStyle = "rgba(255,255,255,0.9)"; for (const x of [40, 296]) g.fillRect(x, 20, 26, 220);
    g.fillStyle = "rgba(255,255,255,0.5)"; for (const x of [80, 336]) g.fillRect(x, 30, 8, 200);
    g.fillStyle = "rgba(60,130,150,0.35)"; for (const x of [180, 436]) g.fillRect(x, 0, 30, 256);
    g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(0, 66, 512, 5);
  }),
};

const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));
const flat = (x0: number, x1: number, z0: number, z1: number, y: number, step = 4) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.max(1, Math.round((x1 - x0) / step)), Math.max(1, Math.round((z1 - z0) / step)))
    .rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return g;
};

/** gable roof (two sloped quads + gable triangles) over a w (along z) x d (along x) box at height y */
const gable = (b: Batch, mat: THREE.Material, end: THREE.Material, cx: number, cz: number, w: number, d: number, y: number, rh: number, o = 0.5) => {
  const pos = (pts: number[][]) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flat(), 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(pts.map((p) => [p[2] / 2, p[1] / 2 + p[0] / 2]).flat(), 2)); g.computeVertexNormals(); return g; };
  const hx = d / 2 + o, hz = w / 2 + o;
  const A = [cx - hx, y - 0.25, cz - hz], B = [cx - hx, y - 0.25, cz + hz], C = [cx, y + rh, cz + hz], D = [cx, y + rh, cz - hz];
  const E = [cx + hx, y - 0.25, cz + hz], F = [cx + hx, y - 0.25, cz - hz];
  b.add(pos([A, C, B, A, D, C]), mat); b.add(pos([E, C, D, E, D, F]), mat);
  b.add(pos([[cx - d / 2, y, cz - w / 2], [cx, y + rh - 0.1, cz - w / 2], [cx + d / 2, y, cz - w / 2]]), end);
  b.add(pos([[cx + d / 2, y, cz + w / 2], [cx, y + rh - 0.1, cz + w / 2], [cx - d / 2, y, cz + w / 2]]), end);
};

/** lathe-turned vessel from (radius, height) pairs, smooth normals */
const lathe = (pts: [number, number][], seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export type Props = { kendi: THREE.Object3D; bottle: THREE.Object3D };

const KENDI_PROFILE: [number, number][] = [[0, 0], [0.07, 0], [0.085, 0.015], [0.125, 0.06], [0.152, 0.13], [0.15, 0.19], [0.13, 0.24],
  [0.09, 0.28], [0.045, 0.305], [0.034, 0.33], [0.036, 0.375], [0.05, 0.395], [0.05, 0.402], [0, 0.402]];
const BOTTLE_PROFILE: [number, number][] = [[0, 0], [0.058, 0], [0.064, 0.012], [0.064, 0.17], [0.052, 0.205], [0.027, 0.245], [0.022, 0.27], [0.024, 0.285], [0, 0.285]];

/** the kendi as its own group, base at its local origin */
const makeKendi = () => {
  const grp = new THREE.Group();
  const clay = lam("kendiClay", () => ({ map: TX.kendi() }));
  const body = new THREE.Mesh(lathe(KENDI_PROFILE, 48), clay);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.036, 24).rotateX(-Math.PI / 2).translate(0, 0.404, 0), lam("kendiMouth", () => ({ color: "#3a1f14" })));
  // the spout (cerat) on the shoulder, toward +z, rising 40 degrees
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.024, 0.15, 16, 1), lam("kendiSpout", () => ({ color: "#c47a4c" })));
  spout.position.set(0, 0.22, 0.165); spout.rotation.x = (50 * Math.PI) / 180;
  for (const m of [body, mouth, spout]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
  return grp;
};
const makeBottle = () => {
  const grp = new THREE.Group();
  // unlit: a lit pale-aqua glass turned green under the warm golden key
  const glass = new THREE.MeshBasicMaterial({ map: TX.glass(), color: new THREE.Color(0.92, 0.95, 0.97) });
  const body = new THREE.Mesh(lathe(BOTTLE_PROFILE, 40), glass);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.035, 20).translate(0, 0.3, 0), lam("bottleCap", () => ({ color: "#2f6fc0" })));
  for (const m of [body, cap]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
  return grp;
};

export const buildVillage = (root: THREE.Object3D, kit: Kit, rays: Ray[]): Props => {
  lensRays = rays;
  setSight(rays);
  const b = new Batch(), bn = new Batch(), r = rng(57);
  const M = {
    grass: wmat("grassK", 3.0, () => ({ map: grassHD() })),
    dirt: wmat("dirtK", 3.0, () => ({ map: TX.dirt() })),
    floor: wmat("floorK", 2.5, () => ({ map: TX.floor() })),
    gedek: wmat("gedekK", 1.6, () => ({ map: TX.gedek() })),
    tiles: lam("tilesK", () => ({ map: roofHD("#b8644f"), side: THREE.DoubleSide })),
    wood: lam("woodPostK", () => ({ color: "#7a4f30" })),
    table: wmat("tableK", 1.2, () => ({ map: planksHD(), color: "#d9b285" })),
    clay: lam("stoveClay", () => ({ color: "#b56a40" })),
    soot: lam("stoveSoot", () => ({ color: "#2e221d" })),
    pot: lam("potBlack", () => ({ color: "#3a3532" })),
    jar: lam("jarClay", () => ({ color: "#a65a36" })),
    door: lam("doorDarkK", () => ({ color: "#5a3a24" })),
    win: lam("winGreenK", () => ({ color: "#3f7a55" })),
    bamboo: lam("bambooK", () => ({ color: "#c9b06a" })),
    plate: lam("plateK", () => ({ color: "#efe8d8" })),
  };
  // ---- ground: grass everywhere, the packed-earth yard, the darker shed floor ----
  b.add(flat(-400, 400, -400, 400, 0, 20), M.grass);
  b.add(flat(-4.5, 14, -7, 9, 0.012, 2), M.dirt);
  b.add(flat(SHED.x0, SHED.x1, SHED.z0, SHED.z1, 0.024, 1), M.floor);

  // ---- the kitchen shed (dapur): no shadows from the roof, so the table and the kendi stay in the sun ----
  const { x0, x1, z0, z1, eave, ridge } = SHED;
  for (const px of [x0 + 0.12, x1 - 0.12]) for (const pz of [z0 + 0.12, 0, z1 - 0.12]) {
    if (px > 0 && pz === 0) continue;
    bn.add(boxGeo(V(px - 0.07, 0, pz - 0.07), V(px + 0.07, eave, pz + 0.07)), M.wood);
  }
  bn.add(boxGeo(V(x0 + 0.05, eave - 0.14, z0), V(x1 - 0.05, eave, z0 + 0.12)), M.wood); // plates
  bn.add(boxGeo(V(x0 + 0.05, eave - 0.14, z1 - 0.12), V(x1 - 0.05, eave, z1)), M.wood);
  gable(bn, M.tiles, M.gedek, (x0 + x1) / 2, (z0 + z1) / 2, z1 - z0, x1 - x0, eave, ridge - eave, 0.55);
  b.add(boxGeo(V(x0, 0, z0), V(x0 + 0.06, eave, z1)), M.gedek);                       // woven back wall
  b.add(boxGeo(V(x0, 0, z0), V(x0 + 1.4, 1.1, z0 + 0.06)), M.gedek);                  // low side screen by the stove
  // clay stove (tungku) with two fire holes, a black pot on one
  const [sx, , sz] = STOVE;
  b.add(boxGeo(V(sx - 0.4, 0, sz - 0.55), V(sx + 0.4, 0.62, sz + 0.55)), M.clay);
  for (const dz of [-0.26, 0.26]) b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20).translate(sx, 0.63, sz + dz), M.soot);
  b.add(new THREE.CylinderGeometry(0.2, 0.16, 0.24, 20).translate(sx, 0.75, sz - 0.26), M.pot);
  b.add(boxGeo(V(sx + 0.38, 0.1, sz - 0.18), V(sx + 0.42, 0.34, sz + 0.18)), M.soot);  // fire mouth
  // shelf with bowls on the back wall, a big water jar (gentong) in the corner
  b.add(boxGeo(V(x0 + 0.06, 1.28, 0.4), V(x0 + 0.4, 1.32, 2.0)), M.wood);
  for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.1, 0.06, 0.08, 16).translate(x0 + 0.23, 1.36, 0.6 + i * 0.4), i % 2 ? M.plate : M.jar);
  b.add(lathe([[0, 0], [0.18, 0], [0.3, 0.2], [0.32, 0.38], [0.24, 0.6], [0.22, 0.64], [0, 0.64]], 32), M.jar, yawM(x0 + 0.45, 0, z1 - 0.5));
  // the table
  b.add(boxGeo(V(TABLE.x0, TOP - 0.06, TABLE.z0), V(TABLE.x1, TOP, TABLE.z1)), M.table);
  for (const lx of [TABLE.x0 + 0.08, TABLE.x1 - 0.08]) for (const lz of [TABLE.z0 + 0.08, TABLE.z1 - 0.08])
    b.add(boxGeo(V(lx - 0.035, 0, lz - 0.035), V(lx + 0.035, TOP - 0.06, lz + 0.035)), M.wood);
  b.add(boxGeo(V(TABLE.x0 + 0.06, 0.18, TABLE.z0 + 0.06), V(TABLE.x1 - 0.06, 0.21, TABLE.z1 - 0.06)), M.wood); // low shelf

  // ---- Mbah Sumi's house (raised floor, woven walls, door + windows on the +x facade) ----
  const houseAt = (x: number, z: number, w: number, d: number, h: number, si: number, test = true) => {
    const hx = d / 2 + 1, hz = w / 2 + 1;
    if (test && inLens(x - hx, x + hx, 0, h + 3, z - hz, z + hz)) return;
    const fl = 0.35;
    b.add(boxGeo(V(x - d / 2 - 0.1, 0, z - w / 2 - 0.1), V(x + d / 2 + 0.1, fl, z + w / 2 + 0.1)), M.clay);
    b.add(boxGeo(V(x - d / 2, fl, z - w / 2), V(x + d / 2, fl + h, z + w / 2)), M.gedek);
    for (const s of [-1, 1]) for (const t of [-1, 1]) b.add(boxGeo(V(x + s * d / 2 - 0.08, fl, z + t * w / 2 - 0.08), V(x + s * d / 2 + 0.08, fl + h, z + t * w / 2 + 0.08)), M.wood);
    b.add(boxGeo(V(x + d / 2, fl, z - 0.5), V(x + d / 2 + 0.06, fl + 1.95, z + 0.5)), M.door);
    for (const s of [-1, 1]) b.add(boxGeo(V(x + d / 2, fl + 0.95, z + s * (w / 4 + 0.35) - 0.45), V(x + d / 2 + 0.06, fl + 1.75, z + s * (w / 4 + 0.35) + 0.45)), si % 2 ? lam("winBlueK", () => ({ color: "#3f6fb5" })) : M.win);
    gable(b, M.tiles, M.gedek, x, z, w, d, fl + h, 1.9, 0.75);
    b.add(boxGeo(V(x + d / 2 + 0.1, 0, z - 0.7), V(x + d / 2 + 0.45, 0.18, z + 0.7)), M.clay); // step
  };
  setSight([]);
  houseAt(HOUSE.x, HOUSE.z, HOUSE.w, HOUSE.d, HOUSE.h, 0, false);
  setSight(rays);
  // neighbours around the yard
  const lots: [number, number, number][] = [[-9, 11, 0.0], [-8, -13, 0.0], [-18, 4, 0.0], [-19, -9, 0], [-17, 17, 0], [4, -16, Math.PI / 2], [13, -15, Math.PI / 2], [6, 18, -Math.PI / 2], [16, 17, -Math.PI / 2], [-30, -2, 0], [-29, 14, 0]];
  lots.forEach(([x, z], i) => houseAt(x, z, 6 + hh(i, 4) * 2, 5 + hh(i, 5) * 1.2, 2.4 + hh(i, 6) * 0.4, i + 1));

  // ---- bamboo fence along the yard edges (left out where a lens looks through) ----
  const fence = (xa: number, za: number, xb: number, zb: number) => {
    const n = Math.round(Math.hypot(xb - xa, zb - za) / 0.18);
    for (let k = 0; k <= n; k++) {
      const x = xa + ((xb - xa) * k) / n, z = za + ((zb - za) * k) / n, h = 1.0 + 0.08 * Math.sin(k * 2.3);
      if (inLens(x - 0.06, x + 0.06, 0, h, z - 0.06, z + 0.06)) continue;
      b.add(new THREE.CylinderGeometry(0.035, 0.04, h, 8).translate(x, h / 2, z), M.bamboo);
    }
  };
  fence(15, -7.5, 15, 9.5); fence(-4, 9.5, 15, 9.5); fence(-4, -7.5, 15, -7.5);

  // ---- palms, trees, bushes ----
  const palms = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_palmShort"];
  const busy = (x: number, z: number) => (x > -11 && x < 15.5 && z > -8 && z < 10) || x > 14;
  for (let i = 0; i < 90; i++) {
    const a = r() * 6.28, d = 16 + r() * 70, x = Math.cos(a) * d - 4, z = Math.sin(a) * d;
    if (busy(x, z)) continue;
    prop(b, kit, i % 3 === 0 ? "tree_fat" : palms[i % 4], x, 0, z, i % 3 === 0 ? 6 + r() * 4 : 8 + r() * 5, r() * 6.28);
  }
  for (const [x, z] of [[-3.2, 5.6], [-3.4, -5.8], [12.5, 7.6], [12.6, -5.8], [4.5, 8.4], [3.6, -6.6]] as const) prop(b, kit, "tree_palmShort", x, 0, z, 3.6 + hh(x, z) * 1.4, hh(z, x) * 6);
  for (let i = 0; i < 40; i++) {
    const x = -4 + r() * 19, z = (r() < 0.5 ? -1 : 1) * (7.5 + r() * 2.5);
    prop(b, kit, i % 3 ? "plant_bushDetailed" : "plant_bush", x, 0, z, 0.7 + r() * 0.6, r() * 6);
  }
  b.build(root);
  bn.build(root, false);

  // ---- the kendi and the bottle (own objects) ----
  const kendi = makeKendi(); kendi.position.set(...KENDI); kendi.rotation.y = 0;
  const bottle = makeBottle(); bottle.position.set(...BOTTLE);
  root.add(kendi, bottle);
  return { kendi, bottle };
};

// sight test for lots and fence posts (a lens looking through a box)
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
