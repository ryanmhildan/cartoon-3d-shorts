// 2D effect cards of "Suara Paling Keras": sound arcs, the DUAR! burst, the thought bubble with a firing warship,
// the parchment map of the Indian Ocean (distance lines, firecracker, ear), the 4-hour clock, soft air rings and the
// globe texture. Same ink language as toon.ts (plum ink, thick outlines, flat fills).
import { Pen, INK, rrect, P2 } from "./toon";
import { LANDS, LL, KRAKATAU, RODRIGUES, JAKARTA, MUMBAI, MAURITIUS } from "./geo";
import { ctex } from "./paint";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};

/** three sound arcs travelling left ("(((" coming from the right) on a 500 x 500 canvas, t 0..1 */
export const fxSound = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const u = (t + k / 3) % 1, r = 70 + 300 * u, a = 1 - u;
    if (a < 0.05) continue;
    const g = p.g;
    g.beginPath(); g.ellipse(560, 250, r, r * 1.05, 0, Math.PI * 0.82, Math.PI * 1.18);
    g.lineCap = "round"; g.strokeStyle = `rgba(36,23,38,${a.toFixed(3)})`; g.lineWidth = 34 * (1 - 0.5 * u); g.stroke();
    g.strokeStyle = `rgba(255,248,214,${a.toFixed(3)})`; g.lineWidth = 20 * (1 - 0.5 * u); g.stroke();
  }
};

/** comic "DUAR!" burst on a 640 x 420 canvas, t 0..1 (pops in, wobbles) */
export const fxDuar = (p: Pen, t: number, word = "DUAR!") => {
  const s = t < 0.25 ? 0.6 + 1.8 * t : 1.05 - 0.05 * Math.cos(t * 20), cx = 320, cy = 210, pts: P2[] = [];
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, r = (i % 2 ? 120 : 200) * s * (0.92 + 0.12 * Math.sin(i * 2.7)); pts.push([cx + r * Math.cos(a) * 1.45, cy + r * Math.sin(a)]); }
  p.poly(pts, "#ffd84a", 12);
  text(p, word, cx, cy + 6, 120 * s, "#d8402f", 22, 460);
};

/** "!" on a 200 x 400 canvas */
export const fxBang = (p: Pen) => text(p, "!", 100, 210, 380, "#ffd84a", 26);

/** thought bubble with a big sailing warship firing its cannon, on an 800 x 640 canvas, t 0..1 */
export const fxThought = (p: Pen, t: number) => {
  const blobs: [number, number, number][] = [[230, 240, 150], [400, 190, 170], [570, 240, 150], [520, 380, 150], [300, 390, 150], [400, 300, 200]];
  for (const [x, y, r] of blobs) p.ell(x, y, r, r * 0.82, null, 22);
  for (const [x, y, r] of blobs) p.ell(x, y, r, r * 0.82, "#ffffff", 0);
  for (const [x, y, r] of [[150, 560, 34], [95, 612, 20]] as const) p.ell(x, y, r, r, "#ffffff", 10);
  const g = p.g;
  g.save(); g.beginPath(); g.ellipse(400, 300, 300, 200, 0, 0, Math.PI * 2); g.clip();
  // sea
  p.poly([[60, 400], [740, 400], [740, 560], [60, 560]], "#4f9fd0", 0);
  for (let i = 0; i < 6; i++) p.stroke([[120 + i * 100, 430 + (i % 2) * 20], [160 + i * 100, 430 + (i % 2) * 20]], 5, "#d9f1ff");
  // ship: hull, gun ports, masts, sails, flag
  const hull: P2[] = [[220, 360], [560, 360], [530, 420], [250, 420]];
  p.poly(hull, "#7a4a2c", 8);
  p.band([[230, 380], [550, 380]], "#e8c45a", 10, 0);
  for (let i = 0; i < 5; i++) p.poly(rrect(270 + i * 55, 390, 290 + i * 55, 408, 3), INK, 0);
  for (const [x, h] of [[300, 230], [400, 270], [490, 210]] as const) {
    p.stroke([[x, 360], [x, 360 - h]], 9, "#5a3a24");
    for (let k = 0; k < 2; k++) {
      const y0 = 360 - h + 20 + k * (h / 2.2), w = 70 - k * 4;
      p.poly([[x - w, y0], [x + w, y0], [x + w - 6, y0 + h / 2.6], [x - w + 6, y0 + h / 2.6]], "#f6efdc", 6);
    }
  }
  p.poly([[400, 90], [446, 102], [400, 114]], "#d8402f", 5);
  // cannon flash + smoke puffs from the bow gun (t pulses)
  const k = (t * 2) % 1;
  if (k < 0.35) {
    const pts: P2[] = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = (i % 2 ? 22 : 50) * (0.6 + k * 1.8); pts.push([210 + r * Math.cos(a), 398 + r * Math.sin(a)]); }
    p.poly(pts, "#ffd84a", 5);
  }
  for (let i = 0; i < 4; i++) { const u = (k + i * 0.2) % 1, r = 18 + 40 * u; p.ell(190 - 140 * u, 395 - 40 * u, r, r * 0.8, `rgba(240,236,228,${(0.95 * (1 - u)).toFixed(3)})`, 0); }
  g.restore();
  p.ell(400, 300, 300, 200, null, 0);
};

// ---------------- the parchment map ----------------
export const MAPW = 1600, MAPH = 1100;
const LON0 = 35, LON1 = 120, LAT0 = 27.5;
const PX = MAPW / (LON1 - LON0);
export const mapXY = ([lon, lat]: LL): P2 => [(lon - LON0) * PX, (LAT0 - lat) * PX];
export type MapOpts = { line: number; label: boolean; pop: number; line2: number; ear: boolean; label2: boolean };
const dashed = (p: Pen, a: P2, b: P2, u: number, col: string) => {
  if (u <= 0) return;
  const g = p.g, e: P2 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  // slight arc so it reads as a path across the ocean
  const mx = (a[0] + e[0]) / 2, my = (a[1] + e[1]) / 2 - 60 * u;
  g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(mx, my, e[0], e[1]);
  g.setLineDash([34, 22]); g.lineCap = "round";
  g.strokeStyle = INK; g.lineWidth = 20; g.stroke();
  g.strokeStyle = col; g.lineWidth = 11; g.stroke();
  g.setLineDash([]);
  p.dot(e[0], e[1], 13, col);
};
const pin = (p: Pen, at: LL, col: string, name: string, dx: number, dy: number) => {
  const [x, y] = mapXY(at);
  p.ell(x, y, 17, 17, col, 7);
  text(p, name, x + dx, y + dy, 46, "#3a2a20", 0);
};
export const fxMap = (p: Pen, o: MapOpts) => {
  const g = p.g;
  // parchment sheet
  p.poly(rrect(8, 8, MAPW - 8, MAPH - 8, 30), "#e9d6a8", 16);
  g.save(); p.path(rrect(30, 30, MAPW - 30, MAPH - 30, 20), true); g.clip();
  g.fillStyle = "#9ccbd6"; g.fillRect(0, 0, MAPW, MAPH);
  g.strokeStyle = "rgba(60,110,130,0.25)"; g.lineWidth = 3;
  for (let lon = 40; lon < LON1; lon += 10) { const [x] = mapXY([lon, 0]); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, MAPH); g.stroke(); }
  for (let lat = -30; lat < 30; lat += 10) { const [, y] = mapXY([0, lat]); g.beginPath(); g.moveTo(0, y); g.lineTo(MAPW, y); g.stroke(); }
  for (const L of LANDS) {
    const pts = L.map(mapXY);
    if (!pts.some(([x, y]) => x > -400 && x < MAPW + 400 && y > -400 && y < MAPH + 400)) continue;
    p.poly(pts, "#cdb77c", 7);
  }
  text(p, "SAMUDRA HINDIA", 640, 640, 58, "rgba(40,80,100,0.55)");
  g.restore();
  p.poly(rrect(30, 30, MAPW - 30, MAPH - 30, 20), null, 8);
  // places
  pin(p, RODRIGUES, "#d8402f", "Rodrigues", 0, 52);
  pin(p, MAURITIUS, "#f3efe2", "", 0, 0);
  const [kx, ky] = mapXY(KRAKATAU);
  p.poly([[kx - 28, ky + 18], [kx, ky - 26], [kx + 28, ky + 18]], "#7a5a48", 6);
  p.ell(kx, ky - 40, 22, 16, "#9a9aa0", 5);
  text(p, "Krakatau", kx - 30, ky + 62, 46, "#3a2a20");
  dashed(p, mapXY(KRAKATAU), mapXY(RODRIGUES), o.line, "#ffffff");
  if (o.label) {
    const [ax, ay] = mapXY(KRAKATAU), [bx, by] = mapXY(RODRIGUES), mx = (ax + bx) / 2, my = (ay + by) / 2 - 90;
    p.poly(rrect(mx - 230, my - 52, mx + 230, my + 52, 26), "#fff3c4", 8);
    text(p, "± 4.800 km", mx, my + 4, 76, "#b43a2e", 0, 420);
  }
  if (o.pop > 0 || o.line2 > 0) {
    const [jx, jy] = mapXY(JAKARTA);
    text(p, "Jakarta", jx - 10, jy - 58, 46, "#3a2a20");
    if (o.pop > 0 && o.pop < 1) { // firecracker pop
      const s = 0.5 + o.pop, pts: P2[] = [];
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = (i % 2 ? 26 : 62) * s; pts.push([jx + r * Math.cos(a), jy + r * Math.sin(a)]); }
      p.poly(pts, "#ffd84a", 7);
    }
    p.poly(rrect(jx - 10, jy - 30, jx + 10, jy + 18, 4), "#d8402f", 5);
    dashed(p, mapXY(JAKARTA), mapXY(MUMBAI), o.line2, "#ffe36a");
    const [mx2, my2] = mapXY(MUMBAI);
    p.ell(mx2, my2, 15, 15, "#ffe36a", 6);
    text(p, "Mumbai", mx2 - 120, my2 + 6, 46, "#3a2a20");
    if (o.ear) { // a little listener with a hand to his ear
      const hx = mx2 + 70, hy = my2 - 70;
      p.ell(hx, hy, 38, 42, "#c99067", 7);
      p.dot(hx - 12, hy - 4, 6); p.dot(hx + 12, hy - 4, 6);
      p.arc(hx, hy + 14, 14, 9, 200, 340, 5);
      p.ell(hx + 44, hy, 16, 22, "#c99067", 6);
      for (let k = 0; k < 2; k++) p.arc(hx + 70 + k * 22, hy, 20 + k * 16, 30 + k * 16, 140, 220, 6);
    }
    if (o.label2) {
      const [ax, ay] = mapXY(JAKARTA), [bx, by] = mapXY(MUMBAI), mx = (ax + bx) / 2 + 60, my = (ay + by) / 2 - 40;
      p.poly(rrect(mx - 170, my - 46, mx + 170, my + 46, 24), "#fff3c4", 8);
      text(p, "± 4.700 km", mx, my + 4, 64, "#b43a2e", 0, 310);
    }
  }
};

/** pocket clock face, hands sweeping 4 hours over t 0..1, "4 JAM" under it, on a 500 x 620 canvas */
export const fxClock = (p: Pen, t: number) => {
  p.ell(250, 250, 220, 220, "#d8a943", 16);
  p.ell(250, 250, 186, 186, "#fbf6e8", 8);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.stroke([[250 + 150 * Math.sin(a), 250 - 150 * Math.cos(a)], [250 + 170 * Math.sin(a), 250 - 170 * Math.cos(a)]], i % 3 ? 7 : 13); }
  const ha = ((8 + 4 * t) / 12) * Math.PI * 2, ma = 4 * t * Math.PI * 2;
  p.stroke([[250, 250], [250 + 95 * Math.sin(ha), 250 - 95 * Math.cos(ha)]], 18);
  p.stroke([[250, 250], [250 + 150 * Math.sin(ma), 250 - 150 * Math.cos(ma)]], 11, "#b43a2e");
  p.dot(250, 250, 18);
  p.poly(rrect(110, 500, 390, 600, 30), "#fff3c4", 8);
  text(p, "4 JAM", 250, 553, 74, "#b43a2e");
};

/** soft air ring (camera-facing) on a 512 x 512 canvas, alpha a */
export const fxAirRing = (p: Pen, a: number) => {
  const g = p.g;
  g.beginPath(); g.ellipse(256, 256, 230, 230, 0, 0, Math.PI * 2);
  g.strokeStyle = `rgba(255,255,255,${(0.75 * a).toFixed(3)})`; g.lineWidth = 26; g.stroke();
  g.strokeStyle = `rgba(255,255,255,${(0.35 * a).toFixed(3)})`; g.lineWidth = 60; g.stroke();
};

/** equirectangular painted globe texture (u = 0 at lon -180): ocean blue, sand-green land with ink coasts */
export const globeTex = () => ctex("globeHD", 2048, 1024, (g) => {
  g.fillStyle = "#4f96c8"; g.fillRect(0, 0, 2048, 1024);
  const xy = ([lon, lat]: LL): P2 => [((lon + 180) / 360) * 2048, ((90 - lat) / 180) * 1024];
  g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 2;
  for (let lon = -180; lon < 180; lon += 30) { const [x] = xy([lon, 0]); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { const [, y] = xy([0, lat]); g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }
  for (const L of LANDS) {
    g.beginPath(); L.forEach((q, i) => { const [x, y] = xy(q); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath();
    g.fillStyle = L[0][1] < -60 ? "#eef2f4" : "#a9c46c"; g.fill();
    g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = "round"; g.stroke();
  }
  const [kx, ky] = xy(KRAKATAU);
  g.fillStyle = "#d8402f"; g.beginPath(); g.arc(kx, ky, 9, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
});
