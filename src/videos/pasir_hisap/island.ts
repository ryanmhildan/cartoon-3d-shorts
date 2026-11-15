// The estuary of "Pasir Hisap": a wet mudflat sloping into the sea, the river channel, grass and trees inland, reeds and
// rocks, and the quicksand patch (a darker, glossy disc whose sheen slowly drifts). twoTone-shaded and inked.
import * as THREE from "three";
import { Batch, Kit, V, lam, prop, setSight, Ray } from "./build";
import { ctex, rng, grassHD } from "./paint";
import { twoTone } from "./shade";
import { groundY, QS, QS_R, EXPLORER, hh } from "./story";

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
  mud: () => ctex("mudflat", 512, 512, (g, r) => {
    g.fillStyle = "#c9ab7a"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 500; k++) { g.fillStyle = r() < 0.5 ? "rgba(120,90,55,0.25)" : "rgba(245,225,185,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 6, 1.5 + r() * 3, r() * 3, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = "rgba(110,85,55,0.25)"; g.lineWidth = 3; // ripple marks
    for (let k = 0; k < 18; k++) { const y = r() * 512; g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + 6 * Math.sin(x * 0.05 + k)); g.stroke(); }
  }),
  quick: () => ctex("quickMud", 512, 512, (g, r) => {
    const gr = g.createRadialGradient(256, 256, 30, 256, 256, 256); gr.addColorStop(0, "#8a6a48"); gr.addColorStop(0.8, "#9c7a52"); gr.addColorStop(1, "rgba(180,145,100,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 10; k++) { g.fillStyle = "rgba(255,240,210,0.12)"; g.beginPath(); g.ellipse(150 + r() * 210, 150 + r() * 210, 10 + r() * 16, 3 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill(); }
    for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(70,50,30,0.3)"; g.beginPath(); g.arc(100 + r() * 310, 100 + r() * 310, 2 + r() * 4, 0, Math.PI * 2); g.fill(); }
  }),
};
const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));
const grid = (x0: number, x1: number, z0: number, z1: number, step: number, h: (x: number, z: number) => number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.round((x1 - x0) / step), Math.round((z1 - z0) / step)).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
};

export const buildWorld = (root: THREE.Object3D, kit: Kit, rays: Ray[]) => {
  setSight(rays);
  const b = new Batch(), r = rng(73);
  const M = { mud: wmat("mudW", 3, () => ({ map: TXR.mud() })), grass: wmat("grassP", 3, () => ({ map: grassHD() })) };
  b.add(grid(-24, 160, -200, 220, 1.5, groundY), M.mud);
  b.add(grid(-220, -22, -200, 220, 3, (x, z) => groundY(x, z) + 0.02), M.grass);
  const palms = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_palmShort"];
  for (let i = 0; i < 90; i++) { const x = -26 - r() * 90, z = -120 + r() * 240; if (Math.abs(z - 26) < 9) continue; prop(b, kit, i % 3 ? "tree_fat" : palms[i % 4], x, groundY(x, z), z, 6 + r() * 5, r() * 6); }
  for (let i = 0; i < 26; i++) { const x = -6 + r() * 34, z = 17 + r() * 4; prop(b, kit, "grass_large", x, groundY(x, z), z, 0.8 + r() * 0.5, r() * 6); }
  for (let i = 0; i < 26; i++) { const x = -6 + r() * 34, z = 31 + r() * 5; prop(b, kit, "grass_large", x, groundY(x, z), z, 0.8 + r() * 0.5, r() * 6); }
  for (let i = 0; i < 18; i++) { const x = -20 + r() * 50, z = -30 + r() * 40; if (Math.hypot(x - QS[0], z - QS[2]) < 6 || Math.hypot(x - EXPLORER[0], z - EXPLORER[2]) < 5) continue; prop(b, kit, i % 2 ? "stone_smallA" : "rock_largeA", x, groundY(x, z) - 0.1, z, 0.25 + r() * 0.5, r() * 6); }
  for (let i = 0; i < 8; i++) { const x = -18 + hh(i, 1) * 6, z = -8 + i * 3; prop(b, kit, "plant_bushDetailed", x, groundY(x, z), z, 0.9, i); }
  b.build(root);
};

/** the quicksand patches (main + the film spot): glossy darker discs, sheen drifting */
export class Quick {
  private tex: THREE.Texture;
  constructor(root: THREE.Object3D) {
    this.tex = TXR.quick(); this.tex.wrapS = this.tex.wrapT = THREE.ClampToEdgeWrapping;
    const mat = twoTone(new THREE.MeshLambertMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    for (const [p, r] of [[QS, QS_R], [EXPLORER, 2.6]] as const) {
      const g = new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2);
      const pa = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) pa.setY(i, groundY(p[0] + pa.getX(i), p[2] + pa.getZ(i)) - p[1] + 0.015);
      const m = new THREE.Mesh(g, mat); m.position.set(...p); m.receiveShadow = true; m.renderOrder = 0.4;
      root.add(m);
    }
  }
  pose(t: number) { this.tex.center.set(0.5, 0.5); this.tex.rotation = 0.05 * Math.sin(t * 0.7); }
}
