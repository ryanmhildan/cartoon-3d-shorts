// The English village of "Vaksin Sapi" (1796): grass land, a cobbled street of houses, Jenner's house with a vegetable
// garden, the cow pasture with a wooden fence, a hay pile, trees and bushes. twoTone-shaded and inked.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray, house } from "./build";
import { ctex, rng, grassHD, stoneHD } from "./paint";
import { twoTone } from "./shade";
import { PASTURE, JHOUSE, GARDEN, HAY, NOTICE, hh } from "./story";

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
  hay: () => ctex("hayStraw", 512, 512, (g, r) => {
    g.fillStyle = "#e2c070"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 1400; k++) { const x = r() * 512, y = r() * 512; g.strokeStyle = r() < 0.5 ? "rgba(150,110,40,0.4)" : "rgba(255,240,180,0.45)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 10); g.stroke(); }
  }),
};
const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));

export const buildWorld = (root: THREE.Object3D, kit: Kit, rays: Ray[]) => {
  setSight(rays);
  const b = new Batch(), r = rng(91);
  const M = {
    grass: wmat("grassV", 3, () => ({ map: grassHD() })),
    path: wmat("pathV", 3, () => ({ map: TXR.path() })),
    cobble: wmat("cobbleV", 2.5, () => ({ map: stoneHD("cobbleV", ["#b1a898", "#a69d8c", "#bab2a2", "#9b9282"], "#7a7266") })),
    hay: lam("hayV", () => ({ map: TXR.hay() })),
    wood: lam("postV", () => ({ color: "#8a5a36" })),
    board: lam("boardV", () => ({ color: "#a8744a" })),
  };
  b.add(boxGeo(V(-400, -3, -400), V(400, 0, 400)), M.grass);
  // the street (cobbles) in front of the houses, a dirt lane to the pasture
  b.add(boxGeo(V(-60, 0, -9), V(60, 0.02, -2.5)), M.cobble);
  b.add(boxGeo(V(10, 0, -3.2), V(PASTURE.x0 + 2, 0.015, -1.6)), M.path);
  // houses along the street (facades +z), Jenner's house a little set back with its garden
  for (let i = 0; i < 12; i++) {
    const x = -48 + i * 9.5 + hh(i, 1) * 1.5;
    if (Math.abs(x - JHOUSE.x) < 7) continue;
    house(b, x, -15 - hh(i, 2) * 2, 0, 7.5 + hh(i, 3) * 2, 7, 5 + hh(i, 4) * 3, i);
  }
  setSight([]);
  house(b, JHOUSE.x, JHOUSE.z, 0, 9, 7, 6.5, 3);
  setSight(rays);
  for (let i = 0; i < 6; i++) prop(b, kit, "crop_pumpkin", GARDEN[0] - 4.5 + i * 0.9, 0, GARDEN[2] - 3.4, 0.5, i);
  for (let i = 0; i < 5; i++) prop(b, kit, "crops_cornStageD", GARDEN[0] + 3.2 + (i % 2) * 0.6, 0, GARDEN[2] - 4 + i * 0.6, 1.6, i);
  // notice board on the street
  b.add(boxGeo(V(NOTICE[0] - 1.1, 0, NOTICE[2] - 0.08), V(NOTICE[0] + 1.1, 2.6, NOTICE[2] + 0.08)), M.board);
  // the pasture fence (posts + two rails) and a gate on the south side
  const P = PASTURE;
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0), n = Math.max(1, Math.round(len / 2.4));
    for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n; b.add(boxGeo(V(-0.08, 0, -0.08), V(0.08, 1.15, 0.08)), M.wood, yawM(x, 0, z, -a)); }
    for (const y of [0.5, 0.95]) b.add(boxGeo(V(0, y, -0.04), V(len, y + 0.1, 0.04)), M.wood, yawM(x0, 0, z0, -a));
  };
  rail(P.x0, P.z0, P.x1, P.z0); rail(P.x1, P.z0, P.x1, P.z1); rail(P.x1, P.z1, P.x0, P.z1); rail(P.x0, P.z1, P.x0, P.z0);
  // hay pile (for the fire drill), a few bales
  b.add(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.hay, yawM(HAY[0], 0, HAY[2], 0, 1.6, 1.3, 1.4));
  for (let i = 0; i < 3; i++) b.add(boxGeo(V(-0.5, 0, -0.35), V(0.5, 0.55, 0.35)), M.hay, yawM(HAY[0] + 2.2 + i * 0.3, i === 2 ? 0.55 : 0, HAY[2] - 0.6 + (i % 2) * 0.8, 0.3 * i));
  // trees, bushes
  for (let i = 0; i < 70; i++) {
    const x = -90 + r() * 180, z = -24 - r() * 50;
    prop(b, kit, ["tree_oak", "tree_default", "tree_fat"][i % 3], x, 0, z, 6 + r() * 5, r() * 6);
  }
  for (let i = 0; i < 40; i++) { const x = -60 + r() * 120, z = 20 + r() * 40; prop(b, kit, ["tree_oak", "tree_default", "tree_fat"][i % 3], x, 0, z, 6 + r() * 5, r() * 6); }
  for (let i = 0; i < 16; i++) { const x = P.x1 + 4 + r() * 20, z = P.z0 + r() * 22; prop(b, kit, "tree_oak", x, 0, z, 6 + r() * 4, r() * 6); }
  for (let i = 0; i < 30; i++) { const x = -40 + r() * 80, z = -10.5 - r() * 1.5; if (Math.abs(x - JHOUSE.x) < 6) continue; prop(b, kit, "plant_bushDetailed", x, 0, z, 0.8 + r() * 0.5, r() * 6); }
  b.build(root);
};
export const _keep = twoTone;
