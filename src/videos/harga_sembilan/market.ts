// Our cartoon Indonesian market for "Seratus Rupiah": a cement market floor, the two sandal stalls side by side (blue tarp
// for Bu Rini, orange tarp for Pak Joko: poles, sloped striped tarp, a pegboard of hanging sandals at the back, a table of
// sandal pairs), their cardboard price signs (own objects; world.ts swaps Joko's 10.000 for 9.900), Bu Rini's woven
// basket (own object, it wobbles while she laughs), more stalls along the aisle and across it, shophouses behind, palms.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, lam, prop, setSight, Ray } from "./build";
import { ctex, rng, grassHD, planksHD, roofHD, facadeHD } from "./paint";
import { twoTone } from "./shade";
import { TOP, STALL_R, STALL_J, BEAM, BACK, SIGN_R, SIGN_J, SIGN_W, SIGN_H, BASKET, hh } from "./story";

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

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const TX = {
  floor: () => ctex("mktFloor", 1024, 1024, (g, r) => {
    g.fillStyle = "#c4b89f"; g.fillRect(0, 0, 1024, 1024);
    for (let k = 0; k < 500; k++) { g.fillStyle = r() < 0.5 ? "rgba(120,105,80,0.16)" : "rgba(245,235,215,0.2)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + r() * 18, 3 + r() * 9, r() * 3, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = "rgba(110,95,75,0.35)"; g.lineWidth = 3;
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 256); g.lineTo(1024, k * 256); g.stroke(); g.beginPath(); g.moveTo(k * 256, 0); g.lineTo(k * 256, 1024); g.stroke(); }
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(90,80,70,0.12)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 40 + r() * 60, 20 + r() * 30, r() * 3, 0, Math.PI * 2); g.fill(); }
  }),
  /** striped tarp: base colour + light stripes */
  tarp: (key: string, a: string, b: string) => ctex("tarp" + key, 512, 512, (g) => {
    g.fillStyle = a; g.fillRect(0, 0, 512, 512);
    g.fillStyle = b; for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 64, 512);
    g.fillStyle = "rgba(0,0,0,0.06)"; for (let y = 0; y < 512; y += 32) g.fillRect(0, y, 512, 2);
  }),
  /** pegboard with hanging sandal pairs */
  rack: () => ctex("sandalRack", 1024, 768, (g, r) => {
    g.fillStyle = "#e9dcc0"; g.fillRect(0, 0, 1024, 768);
    g.fillStyle = "rgba(120,100,70,0.35)"; for (let y = 24; y < 768; y += 48) for (let x = 24; x < 1024; x += 48) g.fillRect(x - 3, y - 3, 6, 6);
    const cols = ["#e2453c", "#3f6fb5", "#f0c93e", "#2f8f6a", "#d0457a", "#f08a2c", "#6a3f8f", "#3a3a44"];
    for (let row = 0; row < 4; row++) for (let i = 0; i < 8; i++) {
      const cx = 64 + i * 128, cy = 95 + row * 190, c = cols[(i + row * 3 + Math.floor(r() * 2)) % cols.length];
      for (const s of [-1, 1]) {
        const x = cx + s * 24;
        g.fillStyle = "#241726"; g.beginPath(); g.ellipse(x, cy + 5, 21, 64, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = c; g.beginPath(); g.ellipse(x, cy, 18, 61, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#241726"; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 15, cy - 8); g.lineTo(x, cy - 40); g.lineTo(x + 15, cy - 8); g.stroke();
        g.strokeStyle = "#fbf6e8"; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 15, cy - 8); g.lineTo(x, cy - 40); g.lineTo(x + 15, cy - 8); g.stroke();
      }
      g.strokeStyle = "#7a6a58"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 80); g.lineTo(cx, cy - 60); g.stroke();
    }
  }),
  /** the cardboard price sign: kraft card, "Rp" + the price in thick black marker */
  sign: (price: string) => ctex("sign" + price, 768, 528, (g, r) => {
    g.fillStyle = "#cf9f68"; g.fillRect(0, 0, 768, 528);
    for (let k = 0; k < 400; k++) { g.fillStyle = r() < 0.5 ? "rgba(140,95,50,0.18)" : "rgba(240,205,160,0.2)"; g.fillRect(r() * 768, r() * 528, 2 + r() * 5, 1 + r() * 2); }
    g.strokeStyle = "rgba(120,80,40,0.35)"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 470); g.lineTo(768, 478); g.stroke(); // a fold
    g.fillStyle = "#1c1420"; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.font = FONT(96);
    g.fillText("Rp", 56, 150);
    g.textAlign = "center"; g.font = FONT(price.length > 5 ? 228 : 250);
    g.fillText(price, 384, 400, 700);
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, 0, 768, 30);
  }),
  basket: () => ctex("basketWeave", 512, 256, (g) => {
    g.fillStyle = "#c8a062"; g.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 24) for (let x = 0; x < 512; x += 32) {
      const o = (y / 24) % 2 ? 16 : 0;
      g.fillStyle = "rgba(255,230,170,0.45)"; g.fillRect(x + o + 2, y + 3, 26, 16);
      g.fillStyle = "rgba(110,70,30,0.45)"; g.fillRect(x + o, y + 19, 32, 5);
    }
  }),
};

const yawM = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));
const flat = (x0: number, x1: number, z0: number, z1: number, y: number, step = 4) =>
  new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.max(1, Math.round((x1 - x0) / step)), Math.max(1, Math.round((z1 - z0) / step)))
    .rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
const lathe = (pts: [number, number][], seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
/** a quad from four corners (uv 0..1) */
const quadG = (a: number[], b: number[], c: number[], d: number[]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  g.computeVertexNormals();
  return g;
};

export type Props = { signR: THREE.Object3D; signJ: THREE.Object3D; signJ9: THREE.Mesh; signJ10: THREE.Mesh; basket: THREE.Object3D };

const SANDAL_COLS = ["#e2453c", "#3f6fb5", "#f0c93e", "#2f8f6a", "#d0457a", "#f08a2c", "#8a5ac9", "#3a3a44", "#5ab0e0"];

type StallOpts = { x0: number; x1: number; z0: number; z1: number; face: 1 | -1; tarp: [string, string]; key: string; goods: "sandal" | "fruit" | "cloth" | "pots"; beam?: number; back?: number };
/** a market stall: 4 poles, a sloped striped tarp (no shadow, so vendors stay lit), a back panel and a table of goods.
 *  face = +1: front toward +z, -1: front toward -z. */
const stall = (b: Batch, bn: Batch, M: Record<string, THREE.Material>, o: StallOpts, r: () => number, test = true) => {
  const { x0, x1, face } = o, zf = face > 0 ? o.z1 : o.z0, zb = face > 0 ? o.z0 : o.z1, beam = o.beam ?? BEAM, back = o.back ?? BACK;
  if (test && inLens(x0, x1, 0, back + 0.4, Math.min(zf, zb), Math.max(zf, zb))) return;
  for (const px of [x0 + 0.04, x1 - 0.04]) {
    b.add(boxGeo(V(px - 0.035, 0, zf - 0.035), V(px + 0.035, beam, zf + 0.035)), M.pole);
    b.add(boxGeo(V(px - 0.035, 0, zb - 0.035), V(px + 0.035, back, zb + 0.035)), M.pole);
  }
  b.add(boxGeo(V(x0, beam - 0.06, zf - 0.03), V(x1, beam, zf + 0.03)), M.pole);
  const tarp = lam("tarp" + o.key, () => ({ map: TX.tarp(o.key, o.tarp[0], o.tarp[1]), side: THREE.DoubleSide }));
  const ov = 0.25 * face;
  bn.add(quadG([x0 - 0.08, beam + 0.02, zf + ov], [x1 + 0.08, beam + 0.02, zf + ov], [x1 + 0.08, back + 0.05, zb - 0.05 * face], [x0 - 0.08, back + 0.05, zb - 0.05 * face]), tarp);
  // a scalloped valance hanging off the front
  for (let x = x0 - 0.08; x < x1 + 0.05; x += 0.3) bn.add(quadG([x, beam - 0.16, zf + ov], [x + 0.3, beam - 0.16, zf + ov], [x + 0.3, beam + 0.02, zf + ov], [x, beam + 0.02, zf + ov]), tarp);
  // back panel
  const tz0 = face > 0 ? o.z0 + 0.6 : o.z1 - 0.6 - 0.8, tz1 = tz0 + 0.8;
  if (o.goods === "sandal") {
    b.add(boxGeo(V(x0 + 0.08, 0.35, Math.min(zb, zb + 0.04 * face) - 0.02), V(x1 - 0.08, back - 0.15, Math.max(zb, zb + 0.04 * face) + 0.02)), M.panel);
    const rack = lam("rackTex", () => ({ map: TX.rack() }));
    const zr = zb + 0.065 * face;
    b.add(face > 0 ? quadG([x0 + 0.1, 0.4, zr], [x1 - 0.1, 0.4, zr], [x1 - 0.1, back - 0.2, zr], [x0 + 0.1, back - 0.2, zr])
      : quadG([x1 - 0.1, 0.4, zr], [x0 + 0.1, 0.4, zr], [x0 + 0.1, back - 0.2, zr], [x1 - 0.1, back - 0.2, zr]), rack);
  } else b.add(boxGeo(V(x0 + 0.08, 0, Math.min(zb, zb + 0.04 * face) - 0.02), V(x1 - 0.08, 1.6, Math.max(zb, zb + 0.04 * face) + 0.02)), M.panel);
  // table
  const tx0 = x0 + 0.1, tx1 = x1 - 0.1, fz0 = face > 0 ? o.z1 - 0.95 : o.z0 + 0.15, fz1 = fz0 + 0.8;
  void tz0; void tz1;
  b.add(boxGeo(V(tx0, TOP - 0.05, fz0), V(tx1, TOP, fz1)), M.table);
  b.add(boxGeo(V(tx0, 0.05, face > 0 ? fz1 - 0.03 : fz0), V(tx1, TOP - 0.05, face > 0 ? fz1 : fz0 + 0.03)), M.skirt);
  for (const lx of [tx0 + 0.05, tx1 - 0.05]) for (const lz of [fz0 + 0.05, fz1 - 0.05]) b.add(boxGeo(V(lx - 0.03, 0, lz - 0.03), V(lx + 0.03, TOP - 0.05, lz + 0.03)), M.pole);
  // goods on the table
  if (o.goods === "sandal") {
    const n = Math.floor((tx1 - tx0 - 0.1) / 0.26);
    for (let row = 0; row < 3; row++) for (let i = 0; i < n; i++) {
      const cx = tx0 + 0.18 + i * 0.26, cz = fz0 + 0.16 + row * 0.25, c = SANDAL_COLS[Math.floor(r() * SANDAL_COLS.length)];
      const m = lam("sandal" + c, () => ({ color: c })), yaw = (r() - 0.5) * 0.3;
      for (const s of [-1, 1]) {
        b.add(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 14).scale(1, 1, 2.4), m, yawM(cx + s * 0.055, TOP + 0.0125, cz, yaw));
        b.add(new THREE.TorusGeometry(0.036, 0.008, 6, 12, Math.PI).scale(1, 0.45, 1).rotateY(Math.PI / 2), M.strap, yawM(cx + s * 0.055, TOP + 0.024, cz - 0.02, yaw));
      }
    }
  } else if (o.goods === "fruit") {
    const cols = ["#f08a2c", "#e2453c", "#8fc24a", "#f0c93e"];
    for (let i = 0; tx0 + 0.25 + i * 0.4 < tx1; i++) {
      const cx = tx0 + 0.25 + i * 0.4, c = cols[i % 4];
      b.add(boxGeo(V(cx - 0.17, TOP, fz0 + 0.15), V(cx + 0.17, TOP + 0.1, fz1 - 0.15)), M.crate);
      const m = lam("fruit" + c, () => ({ color: c }));
      for (let k = 0; k < 6; k++) b.add(new THREE.SphereGeometry(0.06, 10, 8), m, yawM(cx - 0.1 + (k % 3) * 0.1, TOP + 0.14, fz0 + 0.3 + Math.floor(k / 3) * 0.18));
    }
  } else if (o.goods === "cloth") {
    const cols = ["#c0353a", "#3f6fb5", "#d9a441", "#2f8f6a", "#7b5ac9"];
    for (let i = 0; tx0 + 0.2 + i * 0.34 < tx1; i++) {
      const c = cols[(i + Math.floor(r() * 3)) % 5], m = lam("cloth" + c, () => ({ color: c }));
      b.add(boxGeo(V(tx0 + 0.06 + i * 0.34, TOP, fz0 + 0.12), V(tx0 + 0.34 + i * 0.34, TOP + 0.08 + r() * 0.08, fz1 - 0.12)), m);
    }
  } else {
    const cols = ["#b56a40", "#3a3532", "#c9ccd2"];
    for (let i = 0; tx0 + 0.25 + i * 0.36 < tx1; i++) {
      const m = lam("pot" + cols[i % 3], () => ({ color: cols[i % 3] }));
      b.add(new THREE.CylinderGeometry(0.15, 0.12, 0.18, 16), m, yawM(tx0 + 0.25 + i * 0.36, TOP + 0.09, (fz0 + fz1) / 2));
    }
  }
};

/** the hanging price sign: card + two strings; a front plane with the price (two swappable faces for Joko) */
const makeSign = (M: Record<string, THREE.Material>, prices: string[]) => {
  const grp = new THREE.Group(), faces: THREE.Mesh[] = [];
  const card = new THREE.Mesh(new THREE.BoxGeometry(SIGN_W, SIGN_H, 0.012), M.kraft);
  card.castShadow = true; card.receiveShadow = true; grp.add(card);
  for (const p of prices) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_W * 0.985, SIGN_H * 0.985).translate(0, 0, 0.0075), lam("signFace" + p, () => ({ map: TX.sign(p) })));
    f.receiveShadow = true; grp.add(f); faces.push(f);
  }
  for (const s of [-1, 1]) {
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, BEAM - (SIGN_R[1] + SIGN_H / 2), 5).translate(s * SIGN_W * 0.38, SIGN_H / 2 + (BEAM - (SIGN_R[1] + SIGN_H / 2)) / 2, 0), M.string);
    grp.add(str);
  }
  grp.rotation.x = -0.08; // hangs tilted a touch toward the aisle
  return { grp, faces };
};

export const buildMarket = (root: THREE.Object3D, kit: Kit, rays: Ray[]): Props => {
  lensRays = rays;
  setSight(rays);
  const b = new Batch(), bn = new Batch(), r = rng(91);
  const M: Record<string, THREE.Material> = {
    grass: wmat("grassM", 3.0, () => ({ map: grassHD() })),
    floor: wmat("floorM", 4.0, () => ({ map: TX.floor() })),
    pole: lam("poleM", () => ({ color: "#6f5a48" })),
    panel: lam("panelM", () => ({ color: "#d9c9a6" })),
    table: wmat("tableM", 1.2, () => ({ map: planksHD(), color: "#d9b285" })),
    skirt: lam("skirtM", () => ({ color: "#b8544a" })),
    strap: lam("strapM", () => ({ color: "#fbf6e8" })),
    crate: wmat("crateM", 0.8, () => ({ map: planksHD(), color: "#c89a64" })),
    kraft: lam("kraftM", () => ({ color: "#b98a58" })),
    string: lam("stringM", () => ({ color: "#6a5a4a" })),
    gutter: lam("gutterM", () => ({ color: "#8a8f96" })),
  };
  // ---- ground: grass far away, the cement market floor ----
  b.add(flat(-400, 400, -400, 400, 0, 20), M.grass);
  b.add(flat(-40, 40, -14, 18, 0.012, 2), M.floor);

  // ---- our two stalls (always built) ----
  setSight([]);
  stall(b, bn, M, { ...STALL_R, face: 1, tarp: ["#2f6fc0", "#e8f0f8"], key: "rini", goods: "sandal" }, r, false);
  stall(b, bn, M, { ...STALL_J, face: 1, tarp: ["#e8742f", "#ffe0b0"], key: "joko", goods: "sandal" }, r, false);
  setSight(rays);
  // ---- the rest of the row (same side), and the row across the aisle ----
  const TARPS: [string, string][] = [["#3f9a5a", "#e8f4ea"], ["#c0353a", "#f8e8e0"], ["#7b5ac9", "#eee8f8"], ["#d9a441", "#fff4d8"], ["#2f8f9a", "#e0f4f4"], ["#e05a8a", "#fbe4ee"]];
  const GOODS: StallOpts["goods"][] = ["fruit", "cloth", "pots", "sandal", "fruit", "cloth"];
  let k = 0;
  for (const x0 of [-4.9, -7.4, -9.9, -12.4, -14.9, 2.6, 5.1, 7.6, 10.1, 12.6, 15.1]) {
    stall(b, bn, M, { x0, x1: x0 + 2.3, z0: -1.45, z1: 0.55, face: 1, tarp: TARPS[k % 6], key: "row" + (k % 6), goods: GOODS[(k + 2) % 6] }, r);
    k++;
  }
  for (const x0 of [-15, -12.5, -10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10, 12.5]) {
    stall(b, bn, M, { x0, x1: x0 + 2.3, z0: 6.4, z1: 8.4, face: -1, tarp: TARPS[(k + 3) % 6], key: "row" + ((k + 3) % 6), goods: GOODS[k % 6] }, r);
    k++;
  }
  // ---- shophouses (ruko) behind both rows ----
  const WALLS = ["#f2e3c2", "#d9e8d0", "#f0d0b8", "#cfe0ee", "#efe0a8", "#e8cfe0"];
  const ruko = (x: number, zf: number, face: 1 | -1, w: number, i: number) => {
    const d = 6, h = 5.2 + hh(i, 3) * 1.4, zb = zf - face * d;
    if (inLens(x - w / 2, x + w / 2, 0, h + 2, Math.min(zf, zb), Math.max(zf, zb))) return;
    const wall = WALLS[i % 6];
    b.add(boxGeo(V(x - w / 2, 0, Math.min(zf, zb)), V(x + w / 2, h, Math.max(zf, zb))), lam("rukoW" + wall, () => ({ color: wall })));
    const fac = lam("rukoF" + i % 6, () => ({ map: facadeHD("ruko" + (i % 6), w, h, { wall, shutter: ["#3f6fb5", "#3f7a55", "#8c3b4a"][i % 3], door: true }) }));
    const zz = zf + 0.01 * face;
    b.add(face > 0 ? quadG([x - w / 2, 0, zz], [x + w / 2, 0, zz], [x + w / 2, h, zz], [x - w / 2, h, zz]) : quadG([x + w / 2, 0, zz], [x - w / 2, 0, zz], [x - w / 2, h, zz], [x + w / 2, h, zz]), fac);
    // a shop awning at 2.6 m and a flat parapet
    b.add(boxGeo(V(x - w / 2, 2.5, Math.min(zf, zf + 1.1 * face)), V(x + w / 2, 2.62, Math.max(zf, zf + 1.1 * face))), M.gutter);
    b.add(boxGeo(V(x - w / 2 - 0.05, h, Math.min(zf, zb) - 0.05), V(x + w / 2 + 0.05, h + 0.3, Math.max(zf, zb) + 0.05)), lam("rukoTop", () => ({ color: "#b8644f" })));
  };
  let ri = 0;
  for (let x = -30; x <= 30; x += 4.2) { ruko(x, -3.2, 1, 4.1, ri++); ruko(x + 2, 11.5, -1, 4.1, ri++); }
  // ---- palms, trees, banners at the ends ----
  const palms = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_palmShort"];
  for (let i = 0; i < 70; i++) {
    const a = r() * 6.28, d = 34 + r() * 70, x = Math.cos(a) * d, z = Math.sin(a) * d;
    prop(b, kit, i % 3 === 0 ? "tree_fat" : palms[i % 4], x, 0, z, i % 3 === 0 ? 7 + r() * 4 : 9 + r() * 5, r() * 6.28);
  }
  for (const [x, z] of [[-18, 3.2], [18, 3.2], [-24, 2.0], [24, 4.8]] as const) prop(b, kit, "tree_palmTall", x, 0, z, 8 + hh(x, z) * 3, hh(z, x) * 6);
  b.build(root);
  bn.build(root, false);

  // ---- price signs and the basket (own objects) ----
  const R = makeSign(M, ["10.000"]), J = makeSign(M, ["10.000", "9.900"]);
  R.grp.position.set(...SIGN_R); J.grp.position.set(...SIGN_J);
  const basket = new THREE.Group();
  const bm = new THREE.Mesh(lathe([[0, 0], [0.13, 0], [0.17, 0.05], [0.2, 0.17], [0.2, 0.19], [0.185, 0.19], [0.17, 0.06], [0.12, 0.02], [0, 0.02]], 32),
    lam("basketM", () => ({ map: TX.basket(), side: THREE.DoubleSide })));
  bm.castShadow = true; bm.receiveShadow = true; basket.add(bm);
  // a few rolled-up sandals in it
  for (let i = 0; i < 3; i++) {
    const c = SANDAL_COLS[i * 2], m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 12).rotateX(Math.PI / 2 - 0.4).rotateY(i * 1.1), lam("sandal" + c, () => ({ color: c })));
    m.position.set(-0.06 + i * 0.06, 0.16, -0.03 + 0.03 * i); m.castShadow = true; basket.add(m);
  }
  basket.position.set(...BASKET);
  root.add(R.grp, J.grp, basket);
  return { signR: R.grp, signJ: J.grp, signJ10: J.faces[0], signJ9: J.faces[1], basket };
};

// sight test for background pieces (a lens looking through a box)
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
