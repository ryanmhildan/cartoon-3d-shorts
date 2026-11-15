// Our cartoon Rodrigues (grass plateau, beach, hills, the police post with its veranda, desk, map, globe, pier, pond,
// flag, palms) and Krakatau far to the east (cone island, neighbour islets, the Sumatra / Java skyline, the ash column).
// Painted textures follow the bridge look: muted, warm, near-black seams; everything is twoTone-shaded and inked.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray, house } from "./build";
import { ctex, rng, grassHD, planksHD } from "./paint";
import { twoTone } from "./shade";
import { globeTex } from "./fx";
import { sphereDir, KRAKATAU } from "./geo";
import {
  ISLAND_R, STATION, VER, DESK, GLOBE, GLOBE_R, PIER, POND, POND_R, FLAG, K0, K_H, SEA_Y, hh, V3,
} from "./story";

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
  rock: () => ctex("volcRock", 512, 512, (g, r) => {
    g.fillStyle = "#7d6c66"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 120; k++) { g.fillStyle = r() < 0.5 ? "rgba(70,50,45,0.35)" : "rgba(190,170,150,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 30, 4 + r() * 10, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  paper: () => ctex("reportPaper", 256, 340, (g) => {
    g.fillStyle = "#f6efdc"; g.fillRect(0, 0, 256, 340);
    g.strokeStyle = "#241726"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 334);
    g.font = "bold 34px Fredoka, 'Arial Black', sans-serif"; g.textAlign = "center"; g.fillStyle = "#b43a2e"; g.fillText("LAPORAN", 128, 50);
  }),
};

const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));
/** island outline radius at angle a (gentle lobes) */
export const shoreR = (a: number) => ISLAND_R * (1 + 0.08 * Math.sin(3 * a + 0.7) + 0.05 * Math.sin(5 * a + 2.1) + 0.03 * Math.sin(9 * a));
/** a ring/disc with radius per angle: top at y0 (radius r0(a)), bottom at y1 (radius r1(a)) */
const shoreRing = (r0: (a: number) => number, r1: (a: number) => number, y0: number, y1: number, n = 160) => {
  const pos: number[] = [], uv: number[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const p = (a: number, r: number, y: number) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const A = p(a0, r0(a0), y0), B = p(a1, r0(a1), y0), C = p(a1, r1(a1), y1), D = p(a0, r1(a0), y1);
    pos.push(...A, ...B, ...C, ...A, ...C, ...D);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};
const disc = (r: (a: number) => number, y: number, n = 160) => shoreRing(() => 0.001, r, y, y, n).rotateY(0);

export const buildIsland = (root: THREE.Object3D, kit: Kit, rays: Ray[]) => {
  setSight(rays);
  const b = new Batch(), bn = new Batch(), r = rng(31);
  const M = {
    grass: wmat("grassI", 3.0, () => ({ map: grassHD() })),
    sand: wmat("sandI", 3.0, () => ({ map: TX.sand() })),
    hill: [lam("hillA", () => ({ color: "#5f9e45" })), lam("hillB", () => ({ color: "#6aa84d" })), lam("hillC", () => ({ color: "#4f8f3f" }))],
    deck: wmat("deckI", 2.4, () => ({ map: planksHD(), color: "#e2c7a0" })),
    wood: lam("woodPost", () => ({ color: "#8a5a36" })),
    dark: lam("woodDark", () => ({ color: "#5c3c26" })),
    roof: lam("verRoof", () => ({ color: "#b8644f", side: THREE.DoubleSide })),
    white: lam("paintWhite", () => ({ color: "#efe8d8" })),
    brass: lam("brass", () => ({ color: "#d8a943" })),
    water: lam("pondWater", () => ({ color: "#6fb4d2" })),
    flag: lam("flagBlue", () => ({ color: "#2f5f9a", side: THREE.DoubleSide })),
    paper: lam("paperI", () => ({ map: TX.paper() })),
    rock: lam("shoreRock", () => ({ color: "#9a948a" })),
  };
  // ---- ground: grass plateau, sandy beach sloping into the sea, sea floor under it ----
  b.add(disc(shoreR, 0), M.grass);
  b.add(shoreRing(shoreR, (a) => shoreR(a) + 0.6, 0, -0.05), M.grass);
  b.add(shoreRing((a) => shoreR(a) + 0.6, (a) => shoreR(a) + 16, -0.05, -3.2), M.sand);
  // ---- hills on the west half (Rodrigues is hilly) ----
  const dome = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [x, z, rx, h, rz] of [[-34, 20, 20, 11, 16], [-36, -18, 18, 9, 15], [-24, 34, 16, 7, 12], [-44, 2, 14, 13, 14]] as const)
    b.add(dome, M.hill[(x * 7) & 1 ? 0 : 2], yawM(x, -0.5, z, x * 0.1, rx, h, rz));
  // ---- the police post: building + veranda (deck, posts, roof) ----
  setSight([]);
  house(b, STATION.x, STATION.z, Math.PI / 2, STATION.w, STATION.d, STATION.h, 0);
  setSight(rays);
  b.add(boxGeo(V(VER.x0, 0, VER.z0), V(VER.x1, VER.y, VER.z1)), M.deck);
  for (let k = 0; k < 2; k++) b.add(boxGeo(V(VER.x1 + 0.05 + k * 0.38, 0, -1.2 + 0), V(VER.x1 + 0.45 + k * 0.38, VER.y - 0.1 - k * 0.1, 0.2)), M.deck); // steps
  for (const z of [VER.z0 + 0.2, VER.z1 - 0.2]) b.add(boxGeo(V(VER.x1 - 0.32, VER.y, z - 0.1), V(VER.x1 - 0.12, 3.45, z + 0.1)), M.white);
  bn.add(boxGeo(V(VER.x0, 3.4, VER.z0 - 0.3), V(VER.x1 + 0.35, 3.58, VER.z1 + 0.3)), M.roof);
  b.add(boxGeo(V(VER.x1 - 0.34, 3.22, VER.z0), V(VER.x1 - 0.1, 3.4, VER.z1)), M.white); // beam
  for (let z = VER.z0 + 0.3; z < VER.z1; z += 0.5) if (z < -1.7 || z > 1.5) b.add(boxGeo(V(VER.x1 - 0.27, VER.y, z - 0.03), V(VER.x1 - 0.17, VER.y + 0.85, z + 0.03)), M.white); // balusters
  for (const [z0, z1] of [[VER.z0 + 0.2, -1.6], [1.4, VER.z1 - 0.2]] as const) b.add(boxGeo(V(VER.x1 - 0.3, VER.y + 0.85, z0), V(VER.x1 - 0.14, VER.y + 0.95, z1)), M.white);
  // desk + paper + inkwell; globe stand
  const D = DESK;
  b.add(boxGeo(V(D.x0, D.top - 0.06, D.z0), V(D.x1, D.top, D.z1)), M.dark);
  for (const x of [D.x0 + 0.06, D.x1 - 0.12]) for (const z of [D.z0 + 0.06, D.z1 - 0.12]) b.add(boxGeo(V(x, VER.y, z), V(x + 0.06, D.top - 0.06, z + 0.06)), M.dark);
  b.add(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 12).translate(0, 0.035, 0), lam("inkwell", () => ({ color: "#2a2a3a" })), yawM(D.x1 - 0.2, D.top, D.z0 + 0.18));
  b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 20).translate(0, 0.015, 0), M.brass, yawM(GLOBE[0], D.top, GLOBE[2]));
  b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8).translate(0, 0.07, 0), M.brass, yawM(GLOBE[0], D.top, GLOBE[2]));
  b.add(new THREE.TorusGeometry(GLOBE_R + 0.025, 0.012, 8, 48, Math.PI * 1.2).rotateZ(-Math.PI * 0.1), M.brass, yawM(GLOBE[0], GLOBE[1], GLOBE[2], Math.PI / 2 + 0.6));
  // chair behind the desk
  b.add(boxGeo(V(-9.6, VER.y + 0.45, -0.95), V(-9.1, VER.y + 0.5, -0.5)), M.dark);
  // ---- flag pole ----
  b.add(new THREE.CylinderGeometry(0.06, 0.08, 7.5, 10).translate(0, 3.75, 0), M.white, yawM(FLAG[0], 0, FLAG[2]));
  b.add(boxGeo(V(FLAG[0] + 0.08, 6.0, FLAG[2] - 0.02), V(FLAG[0] + 1.9, 7.2, FLAG[2] + 0.02)), M.flag);
  // ---- pier: deck along +x from the beach, posts into the sea ----
  const P = PIER;
  b.add(boxGeo(V(P.x0, P.y - 0.16, P.z - P.w / 2), V(P.x1, P.y, P.z + P.w / 2)), M.deck);
  for (let x = P.x0 + 1; x <= P.x1; x += 3) for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.13, 0.15, 2.6, 10).translate(0, -1.0, 0), M.wood, yawM(x, P.y, P.z + s * (P.w / 2 - 0.1)));
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 10).translate(0, 0.55, 0), M.wood, yawM(P.x1 - 0.2, P.y, P.z + s * (P.w / 2 - 0.1)));
  // ---- pond (sunk water disc + sand rim + stones) ----
  b.add(disc((a) => POND_R * (1 + 0.06 * Math.sin(3 * a)), POND[1]).translate(POND[0], 0, POND[2]), M.water);
  b.add(shoreRing((a) => POND_R * (1 + 0.06 * Math.sin(3 * a)) - 0.05, (a) => POND_R * (1 + 0.06 * Math.sin(3 * a)) + 0.5, POND[1] + 0.004, 0.012).translate(POND[0], 0, POND[2]), M.sand);
  for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, rr = POND_R + 0.5; b.add(new THREE.DodecahedronGeometry(0.18 + 0.1 * hh(i, 2)), M.rock, yawM(POND[0] + Math.cos(a) * rr, 0.05, POND[2] + Math.sin(a) * rr, a, 1, 0.6, 1)); }
  // ---- shore rocks ----
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, rr = shoreR(a) + 4 + r() * 8; if (Math.abs(Math.sin(a) * rr - PIER.z) < 4 && Math.cos(a) > 0) continue; b.add(new THREE.DodecahedronGeometry(0.6 + r() * 0.9), M.rock, yawM(Math.cos(a) * rr, -1.2 - r() * 0.4, Math.sin(a) * rr, r() * 6, 1, 0.7, 1)); }
  // ---- palms, bushes, trees ----
  const palms = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_palmShort"];
  const clear = (x: number, z: number) => {
    if (x > -21 && x < -5 && z > -10 && z < 6) return false;                  // post + veranda
    if (Math.hypot(x - POND[0], z - POND[2]) < POND_R + 2.5) return false;    // pond
    if (Math.abs(z - PIER.z) < 4 && x > 30) return false;                     // pier approach
    return true;
  };
  for (let i = 0; i < 90; i++) { // palms ring the beach
    const a = r() * Math.PI * 2, rr = shoreR(a) - 1 - r() * 6, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!clear(x, z)) continue;
    prop(b, kit, palms[i % 4], x, 0, z, 7 + r() * 5, r() * 6.28);
  }
  for (let i = 0; i < 60; i++) { // inland palms + trees
    const x = -40 + r() * 75, z = -40 + r() * 80;
    if (Math.hypot(x, z) > ISLAND_R - 6 || !clear(x, z)) continue;
    prop(b, kit, i % 3 ? palms[i % 4] : "tree_fat", x, 0, z, i % 3 ? 7 + r() * 5 : 5 + r() * 3, r() * 6.28);
  }
  for (let i = 0; i < 50; i++) {
    const x = -40 + r() * 80, z = -40 + r() * 80;
    if (Math.hypot(x, z) > ISLAND_R - 2 || !clear(x, z)) continue;
    prop(b, kit, i % 3 ? "plant_bushDetailed" : "plant_bush", x, 0, z, 0.8 + r() * 0.9, r() * 6);
  }
  for (const [x, z] of [[-6.5, -8.5], [-6, 7.5], [-19, 7], [-19, -11], [11, 11.5], [18.5, 19.5], [9.5, 19]] as const) prop(b, kit, palms[(x * 3) & 3], x, 0, z, 8 + (z % 3), z);
  for (const [x, z] of [[-6.8, -5.8], [-6.6, 3.2], [16.8, 12.6], [10.6, 16.5]] as const) prop(b, kit, "plant_bushDetailed", x, 0, z, 0.9, x);
  b.build(root);
  bn.build(root, false);
};

/** Krakatau: steep cone island with a crater lip, two islets, the Sumatra / Java skyline */
export const buildKrakatau = (root: THREE.Object3D) => {
  const b = new Batch(), bh = new Batch();
  const rock = wmat("volcRock", 70, () => ({ map: TX.rock(), side: THREE.DoubleSide }));
  const green = lam("volcGreen", () => ({ color: "#6a9c4a", side: THREE.DoubleSide }));
  const sand = wmat("sandK", 6, () => ({ map: TX.sand() }));
  const prof: [number, number][] = [[200, -4], [175, 0], [150, 8], [110, 30], [70, 70], [38, 106], [26, K_H], [20, K_H - 4], [10, K_H - 14]];
  const pts = prof.map(([rr, y]) => new THREE.Vector2(rr, y));
  const cone = new THREE.LatheGeometry(pts, 64);
  b.add(cone, rock, yawM(K0[0], 0, K0[2]));
  // green lower slopes (a slightly larger lathe band)
  const band = new THREE.LatheGeometry([[178, 0.3], [152, 8.5], [118, 26]].map(([rr, y]) => new THREE.Vector2(rr + 0.6, y + 0.3)), 64);
  b.add(band, green, yawM(K0[0], 0, K0[2]));
  b.add(shoreRing((a) => 176 + 6 * Math.sin(5 * a), (a) => 205 + 6 * Math.sin(5 * a), 0.2, -4, 96), sand, yawM(K0[0], 0, K0[2]));
  const dome = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  b.add(dome, green, yawM(K0[0] - 420, -3, K0[2] - 260, 0.4, 120, 34, 70));
  b.add(dome, green, yawM(K0[0] + 380, -3, K0[2] - 160, 1.2, 100, 28, 60));
  // far coasts (Sumatra left, Java right) as long low hills, no shadows
  const far = [lam("farA", () => ({ color: "#7aa58e" })), lam("farB", () => ({ color: "#86ad9a" }))];
  for (let i = 0; i < 14; i++) bh.add(dome, far[i % 2], yawM(K0[0] - 1600 + i * 260 + hh(i, 1) * 80, -10, K0[2] + 1500 + hh(i, 2) * 300, 0, 260 + hh(i, 3) * 120, 90 + hh(i, 4) * 80, 160));
  b.build(root);
  bh.build(root, false);
};

/** the ash column: instanced cauliflower puffs rising and mushrooming from the crater */
export class Ash {
  mesh: THREE.InstancedMesh;
  private n = 140; private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private p = new THREE.Vector3(); private s = new THREE.Vector3();
  constructor(root: THREE.Object3D) {
    const mat = twoTone(new THREE.MeshLambertMaterial({ color: "#8f8890" }));
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), mat, this.n);
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    root.add(this.mesh);
  }
  /** t = seconds since the column started (0 = nothing) */
  pose(t: number, on: boolean) {
    this.mesh.visible = on;
    if (!on) return;
    for (let i = 0; i < this.n; i++) {
      const u = (hh(i, 1) + t * 0.09) % 1, a = hh(i, 2) * Math.PI * 2;
      const hgt = K_H + 10 + u * 360, spread = 20 + 26 * u + 150 * Math.max(0, u - 0.72) ** 1.2 * 3; // mushroom top
      const rr = spread * Math.sqrt(hh(i, 3));
      this.p.set(K0[0] + Math.cos(a) * rr, hgt - Math.max(0, u - 0.8) * 80 * hh(i, 4), K0[2] + Math.sin(a) * rr);
      const sz = (16 + 22 * u + 18 * hh(i, 5)) * Math.min(1, t * 1.5 + 0.2);
      this.s.set(sz, sz * 0.85, sz);
      this.mesh.setMatrixAt(i, this.m4.compose(this.p, this.q, this.s));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** the desk globe: painted equirectangular map, Krakatau facing the room, a bright pressure ring travelling over it */
export class Globe {
  mesh: THREE.Mesh;
  uRing = { value: new THREE.Vector2(-1, -1) };
  constructor(root: THREE.Object3D) {
    const t = globeTex(); t.anisotropy = 8;
    const mat = twoTone(new THREE.MeshLambertMaterial({ map: t }));
    const k = sphereDir(KRAKATAU);
    const prev = mat.onBeforeCompile.bind(mat);
    mat.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      sh.uniforms.uRing = this.uRing;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vON;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvON = normalize(position);");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vON;\nuniform vec2 uRing;")
        .replace("#include <map_fragment>", `#include <map_fragment>
          {
            float d = acos(clamp(dot(normalize(vON), vec3(${k.map((v) => v.toFixed(4)).join(",")})), -1.0, 1.0));
            for (int i = 0; i < 2; i++) {
              float th = i == 0 ? uRing.x : uRing.y;
              if (th < 0.0) continue;
              float w = 0.05;
              float band = 1.0 - smoothstep(0.0, w, abs(d - th));
              float trail = (1.0 - smoothstep(0.0, 0.18, abs(d - th + 0.1))) * 0.35;
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.93, 0.55), clamp(band + trail, 0.0, 1.0));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.14, 0.09, 0.15), (1.0 - smoothstep(0.0, 0.012, abs(d - th - w))) * 0.8);
            }
          }`);
    };
    mat.customProgramCacheKey = () => "globeRing1";
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 96, 48), mat);
    this.mesh.position.set(...GLOBE);
    // turn so the Indian Ocean (lon ~85) faces +z (toward the S16 lens)
    const dir = sphereDir([85, -10]);
    this.mesh.quaternion.setFromUnitVectors(V(...dir).normalize(), V(Math.sin(-0.22), 0.12, Math.cos(-0.22)).normalize());
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    root.add(this.mesh);
  }
}

/** the "LAPORAN" sheet on the desk (shown in shot 7) */
export const reportSheet = (root: THREE.Object3D) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), lam("paperI", () => ({ map: TX.paper() })));
  m.rotation.set(-Math.PI / 2, 0, 0.15);
  m.position.set(DESK.x0 + 1.05, DESK.top + 0.004, (DESK.z0 + DESK.z1) / 2 - 0.05);
  m.receiveShadow = true;
  root.add(m);
  return m;
};
void SEA_Y; void (null as unknown as V3);
