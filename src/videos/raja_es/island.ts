// The three zones of "Raja Es": snowy Boston (quay, pier, houses, pines, the frozen pond with its cut grid, the three
// insulation crates), the tropical harbour (sand, palms, cream houses, pier, melting ice) with an Indonesian market,
// and the sailing ship (its own group, posed per shot, with an instanced ice stack on deck).
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray, house } from "./build";
import { ctex, rng, grassHD, planksHD, stoneHD } from "./paint";
import { twoTone } from "./shade";
import { PIER, SEA_Y, TX, LAKE, LAKE_R, CRATES, MART, MARKET, hh, V3 } from "./story";

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
const speck = (key: string, base: string, a: string, b: string, n = 500) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < n; k++) { g.fillStyle = r() < 0.5 ? a : b; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, Math.PI * 2); g.fill(); }
});
const TXR = {
  snow: () => speck("snowHD", "#eef3f8", "rgba(150,170,200,0.22)", "rgba(255,255,255,0.6)"),
  sand: () => speck("sandHD", "#e6cf98", "rgba(160,120,70,0.22)", "rgba(255,245,215,0.35)"),
  pondIce: () => ctex("pondIce", 512, 512, (g, r) => {
    g.fillStyle = "#cfe6f2"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 40; k++) { g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2; g.beginPath(); const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.lineTo(x + 30 + r() * 60, y + (r() - 0.5) * 30); g.stroke(); }
    g.strokeStyle = "rgba(60,100,130,0.55)"; g.lineWidth = 4; // the cutting grid
    for (let x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(512, x); g.stroke(); }
  }),
  shavings: () => ctex("shavings", 256, 256, (g, r) => {
    g.fillStyle = "#e2c08a"; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 60; k++) { g.strokeStyle = r() < 0.5 ? "#b8915a" : "#f4dcae"; g.lineWidth = 5; g.beginPath(); g.arc(r() * 256, r() * 256, 8 + r() * 10, r() * 6, r() * 6 + 3); g.stroke(); }
  }),
  husk: () => speck("riceHusk", "#d8b45a", "rgba(140,100,40,0.5)", "rgba(250,225,150,0.6)", 900),
  sawdust: () => speck("sawdust", "#c99a62", "rgba(110,75,40,0.45)", "rgba(240,205,150,0.5)", 1600),
};

const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));

export const ICE_MAT = () => lam("iceBlock", () => ({ color: "#bfe4f4" }));

/** pier along +z from the quay at x0 offset */
const pier = (b: Batch, ox: number, M: { deck: THREE.Material; wood: THREE.Material }) => {
  b.add(boxGeo(V(ox + PIER.x0, PIER.y - 0.18, 0), V(ox + PIER.x1, PIER.y, PIER.z1)), M.deck);
  for (let z = 1.5; z <= PIER.z1; z += 3) for (const x of [PIER.x0 + 0.2, PIER.x1 - 0.2]) b.add(new THREE.CylinderGeometry(0.14, 0.16, 3.0, 10).translate(0, -1.3, 0), M.wood, yawM(ox + x, PIER.y, z));
  for (const z of [6, 14, 20]) b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 10).translate(0, 0.35, 0), M.wood, yawM(ox + PIER.x1 - 0.2, PIER.y, z));
};

export const buildWorld = (root: THREE.Object3D, kit: Kit, rays: Ray[]) => {
  setSight(rays);
  const b = new Batch(), r = rng(57);
  const M = {
    snow: wmat("snowW", 4, () => ({ map: TXR.snow() })),
    sand: wmat("sandW", 3, () => ({ map: TXR.sand() })),
    grass: wmat("grassW", 3, () => ({ map: grassHD() })),
    stone: wmat("quayStone", 3, () => ({ map: stoneHD("quayHD", ["#a7a296", "#9d988b", "#b1ac9f", "#958f82"], "#6f6a5f") })),
    pond: wmat("pondW", 12, () => ({ map: TXR.pondIce() })),
    deck: wmat("deckW", 2.4, () => ({ map: planksHD(), color: "#e2c7a0" })),
    wood: lam("woodPostW", () => ({ color: "#7a4f30" })),
    ice: ICE_MAT(),
    crate: lam("crateWood", () => ({ color: "#a8744a" })),
    shav: lam("shavTop", () => ({ map: TXR.shavings() })),
    husk: lam("huskTop", () => ({ map: TXR.husk() })),
    saw: lam("sawTop", () => ({ map: TXR.sawdust() })),
    puddle: lam("puddle", () => ({ color: "#8fc8e0" })),
  };
  // ---- Boston: snowy land south of the quay (z < 0), stone quay face, pier ----
  b.add(boxGeo(V(-320, -0.25, -320), V(320, 0, 0)), M.snow);
  b.add(boxGeo(V(-320, -3, -1.0), V(320, -0.25, 0)), M.stone);
  pier(b, 0, M);
  // frozen pond: ice disc with its cutting grid, a snow rim, a few cut blocks lying by the hole
  b.add(new THREE.CircleGeometry(LAKE_R, 48).rotateX(-Math.PI / 2), M.pond, yawM(LAKE[0], 0.012, LAKE[2]));
  for (let i = 0; i < 6; i++) b.add(boxGeo(V(-0.45, 0, -0.45), V(0.45, 0.7, 0.45)), M.ice, yawM(LAKE[0] + 6 + (i % 3) * 1.1, 0.01, LAKE[2] + 2 + Math.floor(i / 3) * 1.1, 0.1 * i));
  b.add(boxGeo(V(-1.6, -0.3, -0.6), V(1.6, 0.03, 0.6)), lam("pondHole", () => ({ color: "#2f5f7a" })), yawM(LAKE[0] + 3.2, 0, LAKE[2] + 2.2));
  // the street of houses (facades to the harbour), pines behind
  for (let i = 0; i < 14; i++) {
    const x = -70 + i * 10 + hh(i, 1) * 2, z = -16 - hh(i, 2) * 3;
    if (x > -10 && x < 16) { house(b, x, z - 4, 0, 8 + hh(i, 3) * 2, 7, 6 + hh(i, 4) * 3, i); continue; }
    house(b, x, z, 0, 8 + hh(i, 3) * 2, 7, 5 + hh(i, 4) * 4, i);
  }
  for (let i = 0; i < 60; i++) { const x = -150 + r() * 260, z = -34 - r() * 60; if (Math.hypot(x - LAKE[0], z - LAKE[2]) < LAKE_R + 4) continue; prop(b, kit, "tree_cone", x, 0, z, 6 + r() * 5, r() * 6); }
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, rr = LAKE_R + 3 + r() * 8; prop(b, kit, "tree_cone", LAKE[0] + Math.cos(a) * rr, 0, LAKE[2] + Math.sin(a) * rr, 5 + r() * 4, r() * 6); }
  // the three insulation crates on the quay: wood box, ice block peeking, a different packing on top
  CRATES.forEach(([x, y, z], i) => {
    b.add(boxGeo(V(x - 0.6, y, z - 0.6), V(x + 0.6, y + 0.9, z + 0.6)), M.crate);
    b.add(boxGeo(V(x - 0.5, y + 0.9, z - 0.5), V(x + 0.5, y + 1.05, z + 0.5)), [M.shav, M.husk, M.saw][i]);
    b.add(boxGeo(V(x - 0.25, y + 1.0, z - 0.25), V(x + 0.25, y + 1.2, z + 0.25)), M.ice);
  });
  // a heap of ice blocks waiting on the pier
  for (let i = 0; i < 6; i++) b.add(boxGeo(V(-0.4, 0, -0.4), V(0.4, 0.75, 0.4)), M.ice, yawM(PIER.x0 + 0.6 + (i % 2) * 0.9, PIER.y + Math.floor(i / 4) * 0.75, 4 + (i % 4 < 2 ? 0 : 0.9), 0));
  // ---- the tropical harbour (x + TX) ----
  b.add(boxGeo(V(TX - 320, -0.25, -320), V(TX + 320, 0, -8)), M.grass);
  b.add(boxGeo(V(TX - 320, -0.25, -8), V(TX + 320, 0, 0)), M.sand);
  b.add(boxGeo(V(TX - 320, -3, -1.0), V(TX + 320, -0.25, 0)), M.stone);
  pier(b, TX, M);
  for (let i = 0; i < 12; i++) { const x = TX - 60 + i * 11 + hh(i, 5) * 2; if (x > TX - 6 && x < TX + 14) continue; house(b, x, -18 - hh(i, 6) * 2, 0, 8, 7, 5 + hh(i, 7) * 3, i + 3); }
  house(b, TX + 4, -26, 0, 10, 7, 7, 0);
  const palms = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_palmShort"];
  for (let i = 0; i < 40; i++) { const x = TX - 80 + r() * 200, z = -4 - r() * 12; if (x > TX - 4 && x < TX + 10 && z > -12) continue; prop(b, kit, palms[i % 4], x, 0, z, 7 + r() * 5, r() * 6); }
  // melting ice on the tropical pier: small blocks + puddles
  for (let i = 0; i < 5; i++) {
    const x = MART[0] - 0.9 + (i % 3) * 0.8, z = MART[2] + 1.2 + Math.floor(i / 3) * 0.8;
    b.add(boxGeo(V(-0.28, 0, -0.28), V(0.28, 0.35 + 0.1 * hh(i, 8), 0.28)), M.ice, yawM(x, PIER.y, z, 0.3 * i));
    b.add(new THREE.CircleGeometry(0.55 + 0.2 * hh(i, 9), 20).rotateX(-Math.PI / 2), M.puddle, yawM(x + 0.1, PIER.y + 0.006, z + 0.1));
  }
  // ---- the Indonesian market: stalls, the ice seller's cart with blocks under sawdust ----
  for (const [dx, dz, n, yaw] of [[-5, -3, "stall-red", 0.2], [5.5, -4, "stall-green", -0.2], [-9, 2, "stall-green", 0.6], [9, 2, "stall-red", -0.5], [0, -8, "stall-bench", 0]] as const)
    prop(b, kit, n, MARKET[0] + dx, 0, MARKET[2] + dz, 2.8, yaw);
  prop(b, kit, "cart", MARKET[0] + 1.3, 0, MARKET[2] + 0.3, 1.1, Math.PI / 2);
  for (let i = 0; i < 4; i++) b.add(boxGeo(V(-0.32, 0, -0.32), V(0.32, 0.4, 0.32)), M.ice, yawM(MARKET[0] + 0.9 + (i % 2) * 0.7, 0.75, MARKET[2] + 0.0 + Math.floor(i / 2) * 0.7));
  b.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.saw, yawM(MARKET[0] + 1.25, 1.1, MARKET[2] + 0.35, 0, 0.75, 0.22, 0.7));
  b.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.saw, yawM(MARKET[0] - 0.4, 0, MARKET[2] + 0.9, 0, 0.6, 0.35, 0.5));
  b.build(root);
};

/** the brig: hull, deck, two masts with square sails, bowsprit, flag, and an instanced ice stack on deck */
export class Ship {
  group = new THREE.Group();
  private ice: THREE.InstancedMesh;
  private m4 = new THREE.Matrix4();
  constructor(root: THREE.Object3D) {
    const b = new Batch();
    const hull = lam("hullDark", () => ({ color: "#6a4028" })), band = lam("hullBand", () => ({ color: "#e8c45a" })), deck = lam("deckShip", () => ({ map: planksHD(), color: "#e2c7a0" }));
    const sail = lam("sailCloth", () => ({ color: "#f6efdc", side: THREE.DoubleSide })), mast = lam("mastWood", () => ({ color: "#8a5a36" })), flag = lam("flagShip", () => ({ color: "#d8402f", side: THREE.DoubleSide }));
    const prof = new THREE.Shape();
    prof.moveTo(-6.2, 1.9); prof.lineTo(6.6, 2.1); prof.quadraticCurveTo(6.0, 0.2, 4.6, -0.7); prof.lineTo(-5.0, -0.7); prof.quadraticCurveTo(-6.0, 0.4, -6.2, 1.9);
    const hg = new THREE.ExtrudeGeometry(prof, { depth: 3.6, bevelEnabled: false }).translate(0, 0, -1.8);
    b.add(hg, hull);
    b.add(boxGeo(V(-6.1, 1.2, -1.82), V(6.3, 1.45, 1.82)), band);
    b.add(boxGeo(V(-5.9, 1.6, -1.6), V(5.9, 1.7, 1.6)), deck);
    for (const [x, h, w] of [[-2.4, 10, 4.4], [2.2, 11, 4.8]] as const) {
      b.add(new THREE.CylinderGeometry(0.13, 0.17, h, 10).translate(0, h / 2, 0), mast, yawM(x, 1.6, 0));
      for (const [y0, sh, sw] of [[4.0, 3.0, w], [7.2, 2.4, w * 0.8]] as const) {
        const g = new THREE.PlaneGeometry(sw, sh, 8, 4), p = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (sw / 2), v = p.getY(i) / (sh / 2); p.setZ(i, 0.45 * (1 - u * u) * (1 - 0.3 * v * v)); }
        g.computeVertexNormals();
        b.add(g.rotateY(Math.PI / 2), sail, yawM(x + 0.25, 1.6 + y0, 0));
        b.add(new THREE.CylinderGeometry(0.07, 0.07, sw + 0.4, 8).rotateX(Math.PI / 2), mast, yawM(x + 0.2, 1.6 + y0 + sh / 2, 0));
      }
    }
    b.add(new THREE.CylinderGeometry(0.08, 0.1, 4, 8).rotateZ(-Math.PI / 2 + 0.25).translate(7.8, 2.6, 0), mast);
    b.add(boxGeo(V(2.25, 12.2, -0.02), V(3.6, 12.9, 0.02)), flag);
    b.build(this.group);
    this.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.matrixAutoUpdate = false; });
    this.ice = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 0.75, 0.85).translate(0, 0.375, 0), ICE_MAT(), 36);
    this.ice.castShadow = true; this.ice.receiveShadow = true; this.ice.frustumCulled = false;
    this.group.add(this.ice);
    root.add(this.group);
  }
  pose(pos: V3, yaw: number, ice: number, roll = 0) {
    this.group.position.set(...pos); this.group.rotation.set(roll, yaw, 0, "YXZ");
    const XS = [-5.0, -4.1, -3.25, -1.5, -0.6, 0.3, 1.2, 3.1, 4.0];
    let n = 0;
    const want = Math.round(36 * ice);
    for (let k = 0; k < 36 && n < want; k++) {
      const layer = Math.floor(k / 18), i = k % 18;
      this.ice.setMatrixAt(n++, this.m4.makeTranslation(XS[i % 9], 1.7 + layer * 0.75, -0.5 + Math.floor(i / 9) * 1.0));
    }
    this.ice.count = n; this.ice.instanceMatrix.needsUpdate = true;
  }
}
void SEA_Y;
