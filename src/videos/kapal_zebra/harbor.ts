// Our cartoon Stockholm harbour, 1628: a stone quay along x = 0 (cobbled ground toward -x at QY), bollards, barrels and
// crates, rows of gabled town houses facing the water, a church tower and a castle tower on the skyline, and low green
// shores with small houses and trees across the water (north, south and east of the harbour basin).
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray, house } from "./build";
import { ctex, cobbleHD, stoneHD, grassHD, roofHD } from "./paint";
import { twoTone } from "./shade";
import { QY, hh } from "./story";

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
const barrelTex = () => ctex("barrel", 256, 256, (g, r) => {
  g.fillStyle = "#a8743f"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 22) { g.fillStyle = `rgba(60,35,15,${(0.35 + r() * 0.2).toFixed(2)})`; g.fillRect(x, 0, 3, 256); }
  for (const y of [30, 210]) { g.fillStyle = "#4a3a30"; g.fillRect(0, y, 256, 18); }
});

/** height of the far shores around the basin (sea level 0; the basin is x 0..190, |z| < 240) */
const farH = (x: number, z: number) => {
  const d = Math.max(x - 190, Math.abs(z) - 240);
  if (d < 0) return -8;
  const n = Math.sin(x * 0.021 + z * 0.013) * 0.5 + Math.sin(x * 0.047 - z * 0.031) * 0.35;
  return -6 + 8.5 * Math.min(1, d / 14) + (10 + 9 * n) * Math.max(0, Math.min(1, (d - 30) / 140));
};
const grid = (x0: number, x1: number, z0: number, z1: number, step: number, h: (x: number, z: number) => number) => {
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
};

export const buildHarbor = (root: THREE.Object3D, kit: Kit, rays: Ray[]) => {
  lensRays = rays;
  setSight(rays);
  const b = new Batch();
  const M = {
    cobble: wmat("harbourCobble", 3.0, () => ({ map: cobbleHD() })),
    quay: wmat("quayStone", 3.6, () => ({ map: stoneHD("quayHD", ["#c9bca8", "#bfb29e", "#d3c6b2", "#b6a993"], "#8f8270") })),
    grass: wmat("farGrass", 14, () => ({ map: grassHD() })),
    rock: lam("shoreRock", () => ({ color: "#a49a8a" })),
    dark: lam("bollard", () => ({ color: "#6a625a" })),
    barrel: lam("barrelWood", () => ({ map: barrelTex() })),
    crate: lam("crateWood", () => ({ color: "#b98a56" })),
    tower: wmat("towerStone", 4, () => ({ map: stoneHD("towerHD", ["#d9cdb8", "#cfc2ad", "#e2d6c2", "#c6b9a3"], "#9c8e7c") })),
    spire: lam("spireCopper", () => ({ color: "#5f9a86" })),
    roofR: lam("castleRoof", () => ({ map: roofHD("#b8644f"), side: THREE.DoubleSide })),
    rope: lam("ropeMoor", () => ({ color: "#8a6a44" })),
  };
  // ---- the quay: stone edge + cobbled ground ----
  setSight([]);
  b.add(boxGeo(V(-1.4, -4, -320), V(0, QY, 320)), M.quay);
  b.add(boxGeo(V(-220, -4, -320), V(-1.4, QY - 0.02, 320)), M.cobble);
  setSight(rays);
  // bollards and a mooring rope or two
  for (let z = -90; z <= 90; z += 9) {
    if (inLens(-1.2, -0.2, QY, QY + 0.9, z - 0.5, z + 0.5)) continue;
    b.add(new THREE.CylinderGeometry(0.26, 0.32, 0.8, 12).translate(0, 0.4, 0), M.dark, new THREE.Matrix4().makeTranslation(-0.7, QY, z));
    b.add(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.dark, new THREE.Matrix4().makeTranslation(-0.7, QY + 0.8, z));
  }
  // barrels and crates along the back of the quay
  for (let i = 0; i < 40; i++) {
    const x = -9 - hh(i, 1) * 3.5, z = -100 + i * 5.2 + hh(i, 2) * 2;
    if (Math.abs(z - 13) < 4 || Math.abs(z + 5) < 4 || Math.abs(z - 5) < 3) continue;
    if (inLens(x - 1, x + 1, QY, QY + 2, z - 1, z + 1)) continue;
    if (i % 3) {
      for (let k = 0; k < 1 + (i % 2); k++) b.add(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 14).translate(0, 0.5, 0), M.barrel, new THREE.Matrix4().makeTranslation(x + k * 0.9, QY, z + k * 0.3));
    } else {
      b.add(new THREE.BoxGeometry(1.1, 0.9, 1.1).translate(0, 0.45, 0), M.crate, new THREE.Matrix4().makeRotationY(hh(i, 3)).setPosition(x, QY, z));
      b.add(new THREE.BoxGeometry(0.8, 0.7, 0.8).translate(0, 0.35, 0), M.crate, new THREE.Matrix4().makeRotationY(hh(i, 4)).setPosition(x + 0.2, QY + 0.9, z));
    }
  }
  // ---- the town: rows of gabled houses facing the water (+x) ----
  const row = (xf: number, z0: number, z1: number, seed: number, hs: number[]) => {
    let z = z0;
    let i = 0;
    while (z < z1) {
      const w = hh(i, seed) < 0.5 ? 7 : 9, d = 9, h = hs[Math.floor(hh(i, seed + 1) * hs.length) % hs.length];
      house(b, xf - d / 2, z + w / 2, Math.PI / 2, w, d, h, (i * 3 + seed) % 8, QY);
      z += w + 0.2; i++;
    }
  };
  row(-13, -150, 150, 1, [7, 8.4, 9.8]);
  row(-28, -150, 150, 5, [8.4, 9.8, 11.2]);
  row(-43, -150, 150, 9, [9.8, 11.2]);
  // church tower (with a copper spire) and the castle tower on the skyline
  const tower = (x: number, z: number, w: number, h: number, spireH: number) => {
    if (inLens(x - w, x + w, QY, QY + h + spireH, z - w, z + w)) return;
    b.add(boxGeo(V(x - w / 2, QY, z - w / 2), V(x + w / 2, QY + h, z + w / 2)), M.tower);
    b.add(new THREE.ConeGeometry(w * 0.72, spireH, 4).rotateY(Math.PI / 4).translate(0, spireH / 2, 0), M.spire, new THREE.Matrix4().makeTranslation(x, QY + h, z));
  };
  tower(-62, 18, 8, 34, 22);
  tower(-70, -46, 10, 26, 12);
  b.add(boxGeo(V(-90, QY, -70), V(-60, QY + 16, -30)), M.tower);
  b.add(new THREE.ConeGeometry(23, 8, 4).rotateY(Math.PI / 4).scale(0.75, 1, 1.25).translate(-75, QY + 20, -50), M.roofR);
  void grid; void farH; void prop; void grassHD;
  b.build(root);
};

// sight test for small pieces
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
export const _keep = twoTone;
