// Our cartoon aircraft, built from code (two-tone shaded + inked like the world): the night fighter (twin engines,
// green-grey body, orange nose, roundels, the arrow-shaped radar aerials on the nose and wings, landing gear) and the
// bomber silhouette (bigger, near-black, no markings). Plane-local: nose toward +z, centre of the fuselage at the
// origin, wheels touch y = -GEAR when parked. world.ts places the groups and spins the propellers per frame.
import * as THREE from "three";
import { lam } from "./build";

export const GEAR = 1.95; // fuselage centre height above the ground when parked
export type Plane = { root: THREE.Group; props: THREE.Object3D[]; gear: THREE.Object3D; aerials: THREE.Object3D };

const zCyl = (r0: number, r1: number, z0: number, z1: number, seg = 20) =>
  new THREE.CylinderGeometry(r1, r0, z1 - z0, seg, 1).rotateX(Math.PI / 2).translate(0, 0, (z0 + z1) / 2);
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, cast = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o;
};
/** tapered wing panel: root chord c0 at x0, tip chord c1 at x1, thickness t, centred at z (leading edge forward) */
const wingGeo = (x0: number, x1: number, c0: number, c1: number, t: number, z: number, sweep = 0.2) => {
  const s = new THREE.Shape();
  s.moveTo(x0, z + c0 / 2); s.lineTo(x1, z + c1 / 2 - sweep); s.lineTo(x1, z - c1 / 2 - sweep); s.lineTo(x0, z - c0 / 2); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: t * 0.35, bevelSize: Math.min(0.12, t * 0.6), bevelSegments: 2 });
  g.rotateX(Math.PI / 2); // shape y -> z, extrusion depth -> -y
  g.translate(0, t / 2, 0);
  return g;
};
const roundel = (parent: THREE.Object3D, r: number, pos: THREE.Vector3, rot: THREE.Euler) => {
  const cols = ["#e8c24a", "#2c4f9a", "#f2efe6", "#c43a32"], radii = [1, 0.84, 0.6, 0.36];
  cols.forEach((c, i) => {
    const m = lam("roundel" + c, () => ({ color: c, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 - i, polygonOffsetUnits: -1 - i }));
    const o = mesh(new THREE.CircleGeometry(r * radii[i], 28), m, parent, false);
    o.position.copy(pos).addScaledVector(new THREE.Vector3(0, 0, 1).applyEuler(rot), 0.004 * (i + 1)); o.rotation.copy(rot);
  });
};
const propeller = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, blade: THREE.Material, hub: THREE.Material) => {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  mesh(new THREE.ConeGeometry(0.32, 0.7, 16).rotateX(Math.PI / 2).translate(0, 0, 0.35), hub, g);
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.BoxGeometry(0.2, r, 0.06).translate(0, r / 2, 0), blade, g);
    b.rotation.z = (i * Math.PI * 2) / 3;
  }
  return g;
};

export const buildFighter = (): Plane => {
  const root = new THREE.Group();
  const body = lam("ftBody", () => ({ color: "#55705a" })), belly = lam("ftBelly", () => ({ color: "#3f5545" }));
  const nose = lam("ftNose", () => ({ color: "#ef7d2e" })), glass = lam("ftGlass", () => ({ color: "#a9d0ef" }));
  const dark = lam("ftDark", () => ({ color: "#2b2f35" })), metal = lam("ftMetal", () => ({ color: "#b9bec6" }));
  const aer = lam("ftAerial", () => ({ color: "#f4ead0" }));
  // fuselage: nose cone, body, tail cone
  mesh(zCyl(0.82, 0.62, 3.4, 5.1), body, root);
  mesh(zCyl(0.62, 0.42, 5.1, 6.2), nose, root);
  mesh(new THREE.SphereGeometry(0.42, 16, 10).scale(1, 1, 0.7).translate(0, 0, 6.2), nose, root);
  mesh(zCyl(0.86, 0.82, -1.8, 3.4), body, root);
  mesh(zCyl(0.28, 0.86, -6.6, -1.8), body, root);
  // canopy
  mesh(new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.9, 0.75, 1.8).translate(0, 0.62, 2.6), glass, root);
  mesh(new THREE.TorusGeometry(0.56, 0.06, 6, 16, Math.PI).rotateY(Math.PI / 2).translate(0, 0.62, 2.6), dark, root);
  // wings (both halves), tailplane, fin
  mesh(wingGeo(0.5, 8.8, 3.1, 1.6, 0.26, 0.6), body, root);
  mesh(wingGeo(-0.5, -8.8, 3.1, 1.6, 0.26, 0.6), body, root);
  mesh(wingGeo(0.2, 3.3, 1.5, 0.9, 0.16, -5.6, 0.1).translate(0, 0.35, 0), body, root);
  mesh(wingGeo(-0.2, -3.3, 1.5, 0.9, 0.16, -5.6, 0.1).translate(0, 0.35, 0), body, root);
  const fin = new THREE.Shape(); fin.moveTo(-6.6, 0.3); fin.lineTo(-4.6, 0.5); fin.lineTo(-5.6, 2.5); fin.lineTo(-6.5, 2.6); fin.closePath();
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.16, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(0.08, 0, 0);
  mesh(fg, body, root);
  // engines + propellers
  const props: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    mesh(zCyl(0.5, 0.66, -1.6, 3.4), belly, root).position.set(2.9 * s, -0.05, 0);
    mesh(new THREE.TorusGeometry(0.62, 0.08, 8, 20).translate(0, 0, 3.4), dark, root).position.set(2.9 * s, -0.05, 0);
    props.push(propeller(root, 2.9 * s, -0.05, 3.5, 1.55, dark, nose));
  }
  // roundels on the fuselage sides and on the upper wings
  void roundel; // no national markings on our plane
  // radar aerials: an arrow on the nose, dipoles on the wings
  const aerials = new THREE.Group(); aerials.visible = false; root.add(aerials);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6).rotateX(Math.PI / 2).translate(0, 0, 7.0), aer, aerials);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6).rotateZ(Math.PI / 2).rotateY(s * 0.6).translate(0.2 * s, 0, 7.45), aer, aerials);
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6).translate(0, 0.55, 0), aer, aerials).position.set(5.5 * s, 0.25, 1.9);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6).rotateX(Math.PI / 2), aer, aerials).position.set(5.5 * s, 1.0, 2.2);
  }
  // landing gear
  const gear = new THREE.Group(); root.add(gear);
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.35, 8).translate(0, -0.7, 0), metal, gear).position.set(2.9 * s, -0.35, 0.9);
    mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.32, 18).rotateZ(Math.PI / 2), dark, gear).position.set(2.9 * s, -GEAR + 0.55, 0.9);
  }
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12).rotateZ(Math.PI / 2), dark, gear).position.set(0, -0.62, -6.1);
  return { root, props, gear, aerials };
};

export const buildBomber = (): Plane => {
  const root = new THREE.Group();
  const body = lam("bmBody", () => ({ color: "#2c2c36" })), glass = lam("bmGlass", () => ({ color: "#454a5e" }));
  const dark = lam("bmDark", () => ({ color: "#1c1c22" }));
  mesh(zCyl(1.05, 0.7, 4.0, 7.6), body, root);
  mesh(new THREE.SphereGeometry(0.72, 16, 10).scale(1, 1, 0.9).translate(0, 0, 7.6), glass, root);
  mesh(zCyl(1.1, 1.05, -2.5, 4.0), body, root);
  mesh(zCyl(0.35, 1.1, -8.4, -2.5), body, root);
  mesh(wingGeo(0.6, 11.2, 3.8, 1.9, 0.32, 1.0), body, root);
  mesh(wingGeo(-0.6, -11.2, 3.8, 1.9, 0.32, 1.0), body, root);
  mesh(wingGeo(0.2, 4.2, 1.8, 1.1, 0.18, -7.4, 0.1).translate(0, 0.4, 0), body, root);
  mesh(wingGeo(-0.2, -4.2, 1.8, 1.1, 0.18, -7.4, 0.1).translate(0, 0.4, 0), body, root);
  for (const s of [-1, 1]) {
    const fin = new THREE.Shape(); fin.moveTo(-8.4, 0.2); fin.lineTo(-6.8, 0.2); fin.lineTo(-7.3, 2.2); fin.lineTo(-8.3, 2.3); fin.closePath();
    mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.16, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(4.2 * s + 0.08, 0.4, 0), body, root);
  }
  const props: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    mesh(zCyl(0.6, 0.78, -1.6, 4.4), body, root).position.set(3.6 * s, -0.1, 0);
    props.push(propeller(root, 3.6 * s, -0.1, 4.5, 1.7, dark, dark));
  }
  const gear = new THREE.Group(), aerials = new THREE.Group();
  root.add(gear, aerials);
  return { root, props, gear, aerials };
};
