// The world of "Wortel & Radar" (England, 1940): grass land, a cobbled village street of houses (front windows
// recorded so world.ts can light them at night), a carrot garden, a blacked-out street lamp, the grass airfield east of
// the village (mown strip, round-roofed hangar, windsock, fuel drums), a rock cave far to the west (a tunnel with an end
// wall, seen from inside) and a little table for "today". twoTone-shaded and inked.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray, house, inTheWay } from "./build";
import { ctex, rng, grassHD, stoneHD } from "./paint";
import { twoTone } from "./shade";
import { JHOUSE, GARDEN, LAMP, HOME, PARK, HANGAR, CAVE, CAVE_WALL, SIGN, hh } from "./story";

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
const TXR = {
  path: () => ctex("villagePath", 512, 512, (g, r) => {
    g.fillStyle = "#c2a878"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 300; k++) { g.fillStyle = r() < 0.5 ? "rgba(110,80,45,0.25)" : "rgba(240,220,175,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 8, 2 + r() * 5, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  soil: () => ctex("gardenSoil", 512, 512, (g, r) => {
    g.fillStyle = "#7a5638"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 500; k++) { g.fillStyle = r() < 0.5 ? "rgba(60,38,22,0.35)" : "rgba(170,130,90,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 6, 2 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  mown: () => ctex("mownStripe", 512, 512, (g, r) => {
    g.fillStyle = "#7cbc5a"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? "rgba(255,255,220,0.12)" : "rgba(20,60,20,0.08)"; g.fillRect(0, k * 128, 512, 128); }
    for (let k = 0; k < 900; k++) { const x = r() * 512, y = r() * 512; g.strokeStyle = r() < 0.5 ? "rgba(40,90,30,0.35)" : "rgba(200,240,150,0.3)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 6); g.stroke(); }
  }),
  rock: () => ctex("caveRockT", 1024, 1024, (g, r) => {
    g.fillStyle = "#6e665f"; g.fillRect(0, 0, 1024, 1024);
    for (let k = 0; k < 160; k++) { // irregular rock faces
      const x = r() * 1024, y = r() * 1024, n = 5 + Math.floor(r() * 4), rad = 30 + r() * 90;
      g.fillStyle = r() < 0.5 ? `rgba(40,34,32,${0.15 + r() * 0.2})` : `rgba(170,160,150,${0.12 + r() * 0.18})`;
      g.beginPath();
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = rad * (0.6 + r() * 0.5); g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
      g.closePath(); g.fill();
    }
    g.strokeStyle = "rgba(30,25,25,0.55)"; g.lineWidth = 3;
    for (let k = 0; k < 40; k++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += (r() - 0.5) * 80; y += r() * 50; g.lineTo(x, y); } g.stroke(); }
  }),
  hangar: () => ctex("hangarCorr", 512, 512, (g) => {
    g.fillStyle = "#7d8a74"; g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) { g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(x, 0, 5, 512); g.fillStyle = "rgba(255,255,255,0.1)"; g.fillRect(x + 7, 0, 3, 512); }
    for (let y = 0; y < 512; y += 128) { g.fillStyle = "rgba(40,30,20,0.25)"; g.fillRect(0, y, 512, 3); }
  }),
};
const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));

/** a front window of a village house: centre, width, height (facade plane z) */
export type Win = { x: number; y: number; z: number; w: number; h: number };

export const buildWorld = (root: THREE.Object3D, kit: Kit, rays: Ray[]): { wins: Win[]; cave: THREE.Object3D } => {
  setSight(rays);
  const b = new Batch(), r = rng(91), wins: Win[] = [];
  const M = {
    grass: wmat("grassV", 3, () => ({ map: grassHD() })),
    path: wmat("pathV", 3, () => ({ map: TXR.path() })),
    soil: wmat("soilV", 2, () => ({ map: TXR.soil() })),
    mown: wmat("mownV", 12, () => ({ map: TXR.mown() })),
    cobble: wmat("cobbleV", 2.5, () => ({ map: stoneHD("cobbleV", ["#b1a898", "#a69d8c", "#bab2a2", "#9b9282"], "#7a7266") })),
    wood: lam("postV", () => ({ color: "#8a5a36" })),
    iron: lam("ironLamp", () => ({ color: "#3a3d44" })),
    lampGlass: lam("lampGlass", () => ({ color: "#6c7590" })),
    leaf: lam("carrotLeaf", () => ({ color: "#4fa83c" })),
    carrot: lam("carrotTop", () => ({ color: "#f08a2c" })),
    hangar: lam("hangarM", () => ({ map: TXR.hangar(), side: THREE.DoubleSide })),
    hangarEnd: lam("hangarEnd", () => ({ color: "#6f7a66" })),
    dark: lam("hangarDark", () => ({ color: "#2a2c30" })),
    drum: lam("fuelDrum", () => ({ color: "#a8402f" })),
    sockW: lam("sockW", () => ({ color: "#f2efe6" })), sockO: lam("sockO", () => ({ color: "#ee7a2a" })),
    table: lam("tableTop", () => ({ color: "#c98f55" })), cloth: lam("tableCloth", () => ({ color: "#f3efe4" })),
  };
  b.add(boxGeo(V(-2500, -3, -2500), V(2500, 0, 2500)), M.grass);
  // the street (cobbles) in front of the houses
  b.add(boxGeo(V(-60, 0, -9), V(62, 0.02, -2.5)), M.cobble);
  // houses along the street (facades +z); remember their front windows
  const addHouse = (x: number, z: number, w: number, d: number, h: number, si: number) => {
    const hx = w / 2 + 0.6, hz = d / 2 + 0.6;
    if (inTheWay(x - hx, x + hx, 0, h + d * 0.42 + 1.2, z - hz, z + hz)) return;
    house(b, x, z, 0, w, d, h, si);
    const n = Math.max(1, Math.floor(w / 2.2)), floors = Math.max(1, Math.floor(h / 2.8));
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
      if (fl === 0 && i === Math.floor(n / 2)) continue; // the door
      wins.push({ x: x - w / 2 + ((i + 0.5) * w) / n, y: fl * 2.8 + 0.9 + 0.625, z: z + d / 2 + 0.025, w: 0.85, h: 1.25 });
    }
  };
  for (let i = 0; i < 12; i++) {
    const x = -48 + i * 9.5 + hh(i, 1) * 1.5;
    if (Math.abs(x - JHOUSE.x) < 7) continue;
    addHouse(x, -15 - hh(i, 2) * 2, 7.5 + hh(i, 3) * 2, 7, 5.6 + hh(i, 4) * 3, i);
  }
  setSight([]);
  addHouse(JHOUSE.x, JHOUSE.z, 9, 7, 6.5, 3);
  setSight(rays);
  // the carrot garden: soil beds, rows of leafy carrot tops with a little orange shoulder showing
  const G = GARDEN;
  for (let row = 0; row < 4; row++) {
    const z = G[2] - 3.6 + row * 0.9;
    b.add(boxGeo(V(G[0] - 5.2, 0, z - 0.32), V(G[0] + 5.2, 0.09, z + 0.32)), M.soil);
    for (let k = 0; k < 22; k++) {
      const x = G[0] - 5 + k * 0.47 + (hh(k, row) - 0.5) * 0.12, zz = z + (hh(k, row + 9) - 0.5) * 0.12;
      if (Math.abs(x - G[0]) < 1.2 && row === 3) continue;
      b.add(new THREE.CylinderGeometry(0.05, 0.035, 0.08, 8), M.carrot, yawM(x, 0.12, zz));
      for (let l = 0; l < 3; l++) b.add(new THREE.ConeGeometry(0.035, 0.32 + 0.1 * hh(k, l), 5).translate(0, 0.16, 0), M.leaf,
        new THREE.Matrix4().compose(V(x, 0.14, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35 * Math.cos(l * 2.1), 0, 0.35 * Math.sin(l * 2.1))), V(1, 1, 1)));
    }
  }
  b.add(boxGeo(V(G[0] - 5.6, 0, G[2] - 4.2), V(G[0] + 5.6, 0.015, G[2] + 0.6)), M.path);
  // the wooden notice board on the street (shot 2)
  b.add(boxGeo(V(SIGN[0] - 1.1, 0.6, SIGN[2] - 0.08), V(SIGN[0] + 1.1, 2.6, SIGN[2] + 0.08)), lam("boardV", () => ({ color: "#a8744a" })));
  for (const s of [-1, 1]) b.add(boxGeo(V(SIGN[0] + s * 0.95 - 0.07, 0, SIGN[2] - 0.07), V(SIGN[0] + s * 0.95 + 0.07, 2.7, SIGN[2] + 0.07)), M.wood);
  // blackout street lamp (unlit)
  b.add(new THREE.CylinderGeometry(0.09, 0.13, 3.6, 10).translate(0, 1.8, 0), M.iron, yawM(LAMP[0], 0, LAMP[2]));
  b.add(new THREE.CylinderGeometry(0.2, 0.22, 0.2, 10).translate(0, 0.1, 0), M.iron, yawM(LAMP[0], 0, LAMP[2]));
  b.add(boxGeo(V(-0.24, 3.6, -0.24), V(0.24, 4.15, 0.24)), M.lampGlass, yawM(LAMP[0], 0, LAMP[2]));
  b.add(new THREE.ConeGeometry(0.36, 0.3, 4).rotateY(Math.PI / 4).translate(0, 4.3, 0), M.iron, yawM(LAMP[0], 0, LAMP[2]));
  // "today": a little garden table with a cloth in front of a house
  b.add(boxGeo(V(-0.55, 0.72, -0.42), V(0.55, 0.78, 0.42)), M.cloth, yawM(HOME[0] + 0.05, 0, HOME[2] - 0.8));
  for (const [dx, dz] of [[-0.48, -0.36], [0.48, -0.36], [-0.48, 0.36], [0.48, 0.36]]) b.add(boxGeo(V(-0.04, 0, -0.04), V(0.04, 0.72, 0.04)), M.table, yawM(HOME[0] + 0.05 + dx, 0, HOME[2] - 0.8 + dz));
  // the airfield: mown strip, round-roofed hangar, windsock, fuel drums
  b.add(boxGeo(V(PARK[0] - 30, 0, -40), V(PARK[0] + 30, 0.012, 60)), M.mown);
  const H = HANGAR;
  b.add(new THREE.CylinderGeometry(8, 8, 26, 32, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), M.hangar, yawM(H[0], 0, H[2]));
  const endW = new THREE.CircleGeometry(8, 32, 0, Math.PI);
  b.add(endW, M.hangarEnd, yawM(H[0], 0, H[2] - 13, 0));
  b.add(boxGeo(V(-5, 0, 0), V(5, 6.2, 0.05)), M.dark, yawM(H[0], 0, H[2] + 12.9));
  b.add(new THREE.RingGeometry(7.6, 8, 32, 1, 0, Math.PI), M.hangarEnd, yawM(H[0], 0, H[2] + 13, 0));
  const S: [number, number] = [PARK[0] - 14, PARK[2] - 10];
  b.add(new THREE.CylinderGeometry(0.07, 0.09, 6, 8).translate(0, 3, 0), M.wood, yawM(S[0], 0, S[1]));
  for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.42 - k * 0.07, 0.35 - k * 0.07, 0.6, 12, 1, true).rotateZ(Math.PI / 2 - 0.25).translate(0.35 + k * 0.58, 5.75 - k * 0.15, 0), k % 2 ? M.sockW : M.sockO, yawM(S[0], 0, S[1], 0.6));
  for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 14).translate(0, 0.45, 0), M.drum, yawM(PARK[0] + 9 + (k % 2) * 0.7, 0, PARK[2] - 2 + Math.floor(k / 2) * 0.7));
  // trees, bushes, hedges
  for (let i = 0; i < 70; i++) {
    const x = -90 + r() * 180, z = -24 - r() * 50;
    prop(b, kit, ["tree_oak", "tree_default", "tree_fat"][i % 3], x, 0, z, 6 + r() * 5, r() * 6);
  }
  for (let i = 0; i < 40; i++) { const x = -60 + r() * 120, z = 20 + r() * 40; prop(b, kit, ["tree_oak", "tree_default", "tree_fat"][i % 3], x, 0, z, 6 + r() * 5, r() * 6); }
  for (let i = 0; i < 40; i++) { const x = 60 + r() * 90, z = -60 - r() * 60; prop(b, kit, ["tree_oak", "tree_default", "tree_fat"][i % 3], x, 0, z, 7 + r() * 5, r() * 6); }
  for (let i = 0; i < 30; i++) { const x = 140 + r() * 40, z = -40 + r() * 100; prop(b, kit, ["tree_oak", "tree_default", "tree_fat"][i % 3], x, 0, z, 7 + r() * 5, r() * 6); }
  for (let i = 0; i < 30; i++) { const x = -40 + r() * 80, z = -10.5 - r() * 1.5; if (Math.abs(x - JHOUSE.x) < 6) continue; prop(b, kit, "plant_bushDetailed", x, 0, z, 0.8 + r() * 0.5, r() * 6); }
  // patchwork fields far below the night flights
  for (let i = 0; i < 26; i++) {
    const x = -260 + (i % 13) * 48, z = 120 + Math.floor(i / 13) * 70;
    b.add(boxGeo(V(x, 0, z), V(x + 44, 0.03, z + 64)), lam("field" + (i % 3), () => ({ color: ["#8fbf5a", "#b9b25a", "#6fa24a"][i % 3] })));
  }
  b.build(root);
  // the cave: a tunnel of rock seen from inside (no shadows from it, so the inside is lit through the mouth)
  const cave = new THREE.Group();
  const rock = lam("caveRock", () => ({ map: TXR.rock(), side: THREE.BackSide }));
  const rockF = lam("caveFloor", () => ({ map: stoneHD("caveFloor", ["#a39582", "#978a78", "#ae9f8c", "#8c806f"], "#6c6256") }));
  const cb = new Batch();
  const tube = new THREE.CylinderGeometry(4.4, 4.4, 18, 28, 6, true, 0, Math.PI).rotateZ(Math.PI / 2);
  const pos = tube.attributes.position;
  for (let i = 0; i < pos.count; i++) { // lumpy rock: push vertices in and out a little
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 1 + 0.08 * Math.sin(x * 1.3 + z * 2.1) + 0.06 * Math.sin(y * 3.1 - x * 0.7);
    pos.setXYZ(i, x, y * k, z * k);
  }
  tube.computeVertexNormals();
  cb.add(tube, rock, yawM(CAVE[0], 0, CAVE[2]));
  cb.add(new THREE.CircleGeometry(6.5, 28, 0, Math.PI).rotateY(Math.PI / 2), lam("caveEnd", () => ({ map: TXR.rock() })), yawM(CAVE[0] + CAVE_WALL, 0, CAVE[2]));
  cb.add(boxGeo(V(-9, 0, -4.4), V(9, 0.04, 4.4)), rockF, yawM(CAVE[0], 0, CAVE[2]));
  for (let i = 0; i < 8; i++) cb.add(new THREE.DodecahedronGeometry(0.3 + 0.4 * hh(i, 3), 0), rockF, yawM(CAVE[0] - 7 + i * 2, 0.1, CAVE[2] + (i % 2 ? 3.3 : -3.3), i, 1, 0.7, 1));
  cb.build(cave, false);
  root.add(cave);
  return { wins, cave };
};
export const _keep = twoTone;
