// The whole world as one three.js scene: sky (day or our NIGHT override: moonlit blue, moon disc, dark clouds), sun,
// the village / airfield / cave (island.ts), lit or blacked-out windows, the night fighter and the bombers (planes.ts),
// the giant carrot mask, and the cast / effect cards (cast.ts).
// update(id, f, camera) is a pure function of id + f.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { V, Kit, Ray, kitClone, lam } from "./build";
import { LFB } from "./shade";
import { waterNear, waterFar } from "./paint";
import { ctex, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { buildWorld } from "./island";
import { FPS, SHOTS, camAt, FOREGROUND, ShotDef, SEA_Y, windowOn, fighterAt, bombersAt, carrotMask, NOSE, Pose } from "./story";
import { buildFighter, buildBomber, Plane, GEAR } from "./planes";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default", "tree_fat", "plant_bushLarge", "plant_bushDetailed", "plant_bush"];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`bridge/kenney/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

/** our night: a moonlit variant of the day preset (lights.ts stays untouched); ON-SCREEN colours like LOOK */
const NIGHT = {
  sky: { c: ["#41558e", "#384b84", "#2c3d74", "#22305f", "#172246"], e: [0, 4, 10, 22, 45] },
  fog: "#3c4f88", fogNear: 25, fogFar: 260,
  lit: [0.62, 0.7, 1.02] as [number, number, number], shade: [0.18, 0.21, 0.4] as [number, number, number], lift: [0.05, 0.06, 0.14] as [number, number, number],
  charTint: [0.8, 0.86, 1.08] as [number, number, number], sideTint: [0.85, 0.88, 1.0] as [number, number, number],
  sunCol: "#c9d8ff", hemiSky: "#6f82c0", hemiGround: "#2a2c40", sat: 0.72,
  cloud: { lit: "#7182b4", mid: "#4f5f93", shade: "#34406e" },
};
const poseTo = (o: THREE.Object3D, p: Pose, parked: boolean) => {
  o.position.set(p.pos[0], p.pos[1] + (parked ? GEAR : 0), p.pos[2]);
  o.rotation.set(-p.pitch, p.yaw, p.roll, "YXZ");
};
/** every lens position of the film looking at its subject (scenery in the way is left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    if (s.id === 3 || s.id === 4 || s.id === 10) break; // sky shots: nothing on the ground is in their way
    const c = camAt(s.id, Math.max(0, Math.min(f, s.b - 1))), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private wins: { m: THREE.Mesh; i: number }[] = [];
  private winOn = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.1, 0.75) });
  private winOff = new THREE.MeshBasicMaterial({ color: new THREE.Color("#1a1f33") });
  private fighter!: Plane; private bombers: Plane[] = []; private carrot = new THREE.Group(); private cave!: THREE.Object3D;
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private clouds: THREE.Mesh[] = [];
  private sea!: THREE.Mesh;
  private WU: Record<string, THREE.IUniform>;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)), night: [0, 1, 2, 3].map((k) => cloudHD(k, NIGHT.cloud)) };
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 110 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    const built = buildWorld(R, kit, sightLines());
    this.cave = built.cave;
    const wg = new THREE.PlaneGeometry(1, 1);
    built.wins.forEach((w, i) => {
      const m = new THREE.Mesh(wg, this.winOff);
      m.position.set(w.x, w.y, w.z); m.scale.set(w.w, w.h, 1); m.layers.set(NOINK);
      this.wins.push({ m, i }); R.add(m);
    });
    this.fighter = buildFighter(); R.add(this.fighter.root);
    for (let i = 0; i < 3; i++) { const b = buildBomber(); this.bombers.push(b); R.add(b.root); }
    // the giant carrot that hides the radar nose (shot 12): cone along +z, leaves at the back
    const cm = lam("bigCarrot", () => ({ color: "#f0832a" })), lm = lam("bigCarrotLeaf", () => ({ color: "#4fa83c" }));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.0, 20).rotateX(Math.PI / 2).translate(0, 0, 1.2), cm);
    cone.castShadow = true; this.carrot.add(cone);
    for (let k = 0; k < 5; k++) {
      const l = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.4, 6).translate(0, 0.7, 0), lm);
      l.position.set(0, 0, -0.25); l.rotation.set(-1.9 + 0.25 * Math.cos(k * 1.3), 0, 0.5 * Math.sin(k * 1.9)); l.castShadow = true; this.carrot.add(l);
    }
    this.carrot.visible = false; R.add(this.carrot);
    // the sea: the bridge river shader (depression-angle gradient + sparse marks) on one 8 km quad
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "sea1";
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2).translate(2000, 0, 0), waterM);
    this.sea = sea;
    sea.receiveShadow = true;
    sea.visible = false; R.add(sea);
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 6000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L), N = s.night ? NIGHT : null;
    this.hemi.color.set(N ? N.hemiSky : L.sky); this.hemi.groundColor.set(N ? N.hemiGround : L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(N ? N.sunCol : L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    TONE.uLitCol.value.set(...(N ? N.lit : L.lit)); TONE.uShadeCol.value.set(...(N ? N.shade : L.shade)); TONE.uShadeLift.value.set(...(N ? N.lift : L.lift));
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = N ? N.sat : LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...(N ? N.charTint : L.charTint)); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...(N ? N.sideTint : L.sideTint));
    const su = this.skyMat.uniforms, SK = N ? N.sky : K.sky;
    SK.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = SK.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(N ? N.fog : L.fog, this.fog.color); this.fog.near = N ? N.fogNear : L.fogNear * (s.far ?? 1); this.fog.far = N ? N.fogFar : L.fogFar * (s.far ?? 1) * (s.far ? 1.6 : 1);
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden" || !!N;
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(N ? 2.4 : 1.7)));
      (this.sunDisc.material as THREE.SpriteMaterial).color.setRGB(...((N ? [3.2, 3.3, 3.6] : [6.0, 4.4, 2.4]) as [number, number, number]));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(N ? 12 : 24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(N ? "#5a6fa8" : L.sunDisc).multiplyScalar(N ? 0.6 : 1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      m.position.set(cam.position.x + Math.cos(a) * d, 110 + (i % 4) * 38, cam.position.z + Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[N ? "night" : s.light][i % 4];
    }
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    // ---- sea colours, ash column, globe ring, report sheet ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    this.sea.position.y = SEA_Y;
    // ---- windows, planes, carrot mask ----
    for (const w of this.wins) w.m.material = windowOn(id, f, w.i) ? this.winOn : this.winOff;
    const fp = fighterAt(id, f);
    this.fighter.root.visible = !!fp;
    if (fp) {
      const parked = fp.pos[1] < 5;
      poseTo(this.fighter.root, fp, parked);
      this.fighter.gear.visible = parked;
      for (const pr of this.fighter.props) pr.rotation.z = parked ? 0.4 : fp.spin * 0.9;
    }
    const bs = bombersAt(id, f);
    this.bombers.forEach((b, i) => {
      const p = bs[i];
      b.root.visible = !!p;
      if (!p) return;
      poseTo(b.root, p, false);
      for (const pr of b.props) pr.rotation.z = p.spin * 0.8 + i;
    });
    const ck = carrotMask(id, f);
    this.carrot.visible = ck > 0.01;
    if (this.carrot.visible) {
      this.carrot.position.set(NOSE[0], NOSE[1] + 3.5 * (1 - ck), NOSE[2] - 0.3);
      this.carrot.rotation.set(-0.08, 0, 0.15 * (1 - ck));
      this.carrot.scale.setScalar(0.4 + 0.6 * ck);
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const fwd = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 2).negate();
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir, fwd });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.12 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
