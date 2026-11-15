// 2D effect cards of "Kendi Bocor": water droplets on the kendi, the crossed-out fridge, the "!" mark, the 34 °C
// thermometer, heat squiggles, rising vapour, the cool sparkle, the crossed-out ice + plug icons, the magnifier on the
// clay pores, the kendi cross-section (water seeps out, evaporates and carries the heat away), sweat + wind, and the
// kendi's little face. Same ink language as toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};
const WATER = "#9fd8ea", HOT = "#e2453c", COOL = "#4fa8e0";
const drop = (p: Pen, x: number, y: number, r: number, col = WATER, ol = 0.18) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a); // a = 0 at the bottom
    if (c >= 0) pts.push([x + r * s, y + r * c]);
    else { const k = -c; pts.push([x + r * s * (1 - k) ** 0.8, y - 1.8 * r * k]); } // tapering to a point on top
  }
  p.poly(pts, col, r * ol);
  p.ell(x - r * 0.32, y + r * 0.05, r * 0.2, r * 0.3, "rgba(255,255,255,0.95)", 0);
};
const cross = (p: Pen, cx: number, cy: number, r: number) => {
  for (const s of [-1, 1]) { p.stroke([[cx - r, cy - s * r], [cx + r, cy + s * r]], r * 0.34, INK); p.stroke([[cx - r, cy - s * r], [cx + r, cy + s * r]], r * 0.22, HOT); }
};
/** little flame = heat badge */
const flame = (p: Pen, x: number, y: number, r: number) => {
  p.poly([[x, y - 1.5 * r], [x + 0.8 * r, y - 0.2 * r], [x + 0.75 * r, y + 0.55 * r], [x, y + r], [x - 0.75 * r, y + 0.55 * r], [x - 0.8 * r, y - 0.2 * r]], "#f08a2c", r * 0.16);
  p.poly([[x, y - 0.5 * r], [x + 0.38 * r, y + 0.25 * r], [x, y + 0.7 * r], [x - 0.38 * r, y + 0.25 * r]], "#ffd84a", 0);
};

/** droplets beading on the kendi's belly, 600 x 600 canvas; t (seconds) makes one run down and fall now and then */
export const fxDrops = (p: Pen, t: number) => {
  const spots: [number, number, number][] = [[150, 260, 15], [260, 330, 18], [400, 280, 14], [470, 380, 16], [200, 430, 17], [340, 450, 15], [120, 360, 12], [430, 470, 13]];
  spots.forEach(([x, y, r], i) => drop(p, x, y, r * (0.85 + 0.15 * Math.sin(t * 2 + i))));
  const u = (t * 0.7) % 1, fy = 320 + 260 * u * u;
  drop(p, 300, fy, 17);
};
/** fridge icon with a red cross, 420 x 520 canvas */
export const fxNoFridge = (p: Pen) => {
  p.poly(rrect(70, 40, 350, 480, 30), "#eef3f6", 14);
  p.stroke([[70, 200], [350, 200]], 12);
  for (const y of [110, 280]) p.poly(rrect(290, y, 312, y + 70, 8), "#9aa3ad", 6);
  cross(p, 210, 260, 170);
};
/** a big mark ("!" or "?"), 300 x 400 canvas */
export const fxMark = (p: Pen, ch: string, col = "#ffd84a") => text(p, ch, 150, 210, 340, col, 26);
/** thermometer with the reading, 520 x 720 canvas; t 0..1 fills it */
export const fxThermo = (p: Pen, t: number) => {
  p.poly(rrect(60, 40, 200, 560, 70), "#f6f2e8", 14);
  p.ell(130, 600, 92, 92, HOT, 14);
  const top = 520 - 400 * t;
  p.poly(rrect(105, top, 155, 590, 24), HOT, 0);
  for (let k = 0; k < 6; k++) p.stroke([[160, 140 + k * 64], [190, 140 + k * 64]], 8);
  p.poly(rrect(220, 200, 510, 380, 40), "#fffaf0", 12);
  text(p, "34°C", 365, 292, 120, HOT, 0, 270);
};
/** wavy heat lines rising, 360 x 420 canvas, t seconds */
export const fxHeat = (p: Pen, t: number, col = "#f08a2c") => {
  for (let k = 0; k < 3; k++) {
    const pts: P2[] = [], x0 = 80 + k * 100;
    for (let i = 0; i <= 18; i++) { const y = 400 - i * 20; pts.push([x0 + 22 * Math.sin(i * 0.8 - t * 7 + k * 1.7), y]); }
    p.stroke(pts, 16, INK); p.stroke(pts, 9, col);
  }
};
/** soft vapour wisps rising and fading, 400 x 600 canvas, t seconds */
export const fxSteam = (p: Pen, t: number) => {
  for (let k = 0; k < 4; k++) {
    const u = (t * 0.45 + k / 4) % 1, x = 90 + k * 75 + 30 * Math.sin(t * 2 + k), y = 560 - 470 * u, r = 14 + 22 * u;
    p.ell(x, y, r, r * 0.8, `rgba(255,255,255,${(0.4 * Math.sin(Math.PI * u)).toFixed(3)})`, 0);
  }
  for (let k = 0; k < 2; k++) {
    const pts: P2[] = [], x0 = 150 + k * 110;
    for (let i = 0; i <= 14; i++) pts.push([x0 + 18 * Math.sin(i * 0.9 - t * 6 + k * 2), 540 - i * 30]);
    p.stroke(pts, 7, "rgba(255,255,255,0.85)");
  }
};
/** cool sparkles + a snowflake, 420 x 420 canvas, t seconds */
export const fxCool = (p: Pen, t: number) => {
  const pos: [number, number, number][] = [[110, 120, 0], [300, 90, 0.3], [330, 290, 0.6], [100, 310, 0.85]];
  for (const [x, y, o] of pos) {
    const k = Math.sin(((t * 1.2 + o) % 1) * Math.PI), r = 16 + 40 * k;
    if (k < 0.05) continue;
    const pts: P2[] = [];
    for (let i = 0; i < 8; i++) { const a = ((i * 45 - 90) * Math.PI) / 180, rr = i % 2 ? r * 0.28 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
    p.poly(pts, "#dff6ff", 6);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3 + t * 0.6, c = Math.cos(a) * 54, s = Math.sin(a) * 54;
    p.stroke([[210 - c, 210 - s], [210 + c, 210 + s]], 18, INK); p.stroke([[210 - c, 210 - s], [210 + c, 210 + s]], 10, COOL);
  }
  p.ell(210, 210, 12, 12, COOL, 5);
};
/** two crossed-out icons (ice cube, power plug), 800 x 420 canvas; k = how many are shown (0..2) */
export const fxNoIcons = (p: Pen, k: number) => {
  for (let i = 0; i < k; i++) {
    const cx = 200 + i * 400, cy = 210;
    p.poly(rrect(cx - 170, cy - 170, cx + 170, cy + 170, 40), "#fffaf0", 12);
    if (i === 0) {
      p.poly([[cx - 80, cy - 40], [cx + 10, cy - 90], [cx + 90, cy - 50], [cx + 90, cy + 60], [cx, cy + 100], [cx - 80, cy + 60]], "#cdeefa", 10);
      p.stroke([[cx - 80, cy - 40], [cx, cy], [cx + 90, cy - 50]], 10); p.stroke([[cx, cy], [cx, cy + 100]], 10);
    } else {
      p.poly(rrect(cx - 70, cy - 40, cx + 70, cy + 70, 22), "#3a3d44", 10);
      for (const s of [-1, 1]) p.poly(rrect(cx + s * 34 - 12, cy - 110, cx + s * 34 + 12, cy - 40, 6), "#c9ccd2", 8);
      p.stroke([[cx, cy + 70], [cx + 40, cy + 140], [cx + 120, cy + 150]], 14);
    }
    cross(p, cx, cy, 140);
  }
};
/** magnifying glass over the clay wall: tiny pores, water creeping out through them, 760 x 820 canvas, t seconds */
export const fxMagnify = (p: Pen, t: number, k: number) => {
  const g = p.g, cx = 360, cy = 360, R = 300 * (0.6 + 0.4 * k);
  p.band([[cx + R * 0.72, cy + R * 0.72], [cx + R * 1.12, cy + R * 1.12]], "#8a5a36", 64 * k + 6, 12, "round");
  p.ell(cx, cy, R + 22, R + 22, "#c9ccd2", 14);
  g.save(); p.path(Array.from({ length: 64 }, (_, i) => [cx + R * Math.cos((i / 64) * Math.PI * 2), cy + R * Math.sin((i / 64) * Math.PI * 2)] as P2), true); g.clip();
  g.fillStyle = "#c06d42"; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  // clay grains and the pores between them
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
    const x = cx - R + (i + 0.5 + 0.3 * Math.sin(i * 3.1 + j)) * (2 * R / 9), y = cy - R + (j + 0.5 + 0.3 * Math.cos(j * 2.3 + i)) * (2 * R / 9);
    p.ell(x, y, R * 0.085, R * 0.075, "#d48a5c", 4);
  }
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const x = cx - R + (i + 1) * (2 * R / 9), y = cy - R + (j + 1) * (2 * R / 9);
    p.ell(x, y, R * 0.028, R * 0.024, "#3a1f14", 0);
    const u = (t * 0.8 + (i * 7 + j * 3) * 0.13) % 1;
    if ((i + j) % 2 === 0) drop(p, x + 4, y - 6 - 24 * u, R * 0.03 * (0.5 + u));
  }
  g.restore();
  p.ell(cx, cy, R, R, null, 12);
  p.ell(cx - R * 0.45, cy - R * 0.5, R * 0.18, R * 0.08, "rgba(255,255,255,0.6)", 0, 0, 360, -40);
};
/** kendi cross-section: water inside cooling from orange to blue as droplets leave through the wall and float up
 *  carrying little flames, 800 x 940 canvas; t seconds, k 0..1 progress */
export const fxSection = (p: Pen, t: number, k: number) => {
  p.poly(rrect(10, 10, 790, 930, 36), "#fffaf0", 12);
  const cx = 400, cy = 600;
  const wall: P2[] = [];
  for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; wall.push([cx + 230 * Math.cos(a), cy + 200 * Math.sin(a)]); }
  p.poly(wall, "#c06d42", 14);
  const inner: P2[] = wall.map(([x, y]) => [cx + (x - cx) * 0.84, cy + (y - cy) * 0.84]);
  p.poly(inner, "#f59a5a", 8);
  // cool water rising from the bottom as the heat leaves
  const g = p.g;
  g.save(); p.path(inner, true); g.clip();
  g.fillStyle = "#6ec6f0"; g.fillRect(cx - 240, cy + 170 - 340 * k, 480, 340 * k + 10);
  g.restore();
  p.poly(inner, null, 8);
  p.poly(rrect(cx - 50, cy - 290, cx + 50, cy - 180, 14), "#c06d42", 12);
  // thermometer face inside the water: arrow down
  text(p, k < 0.5 ? "PANAS" : "SEJUK", cx, 110, 96, k < 0.5 ? HOT : COOL, 16);
  // droplets leave the wall and rise carrying flames
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, u = (t * 0.5 + i / 6) % 1, a = side > 0 ? -0.5 : Math.PI + 0.5;
    const x0 = cx + 235 * Math.cos(a) * 1.02, y0 = cy + 205 * Math.sin(a);
    const x = x0 + side * 40 * u, y = y0 - 330 * u;
    const op = Math.sin(Math.PI * u);
    if (op < 0.1) continue;
    drop(p, x, y + 28, 16 + 6 * (1 - u));
    flame(p, x + side * 22, y - 8, 20);
  }
};
/** sweat drops flying off, 360 x 360 canvas, t seconds */
export const fxSweat = (p: Pen, t: number) => {
  for (let i = 0; i < 3; i++) { const u = (t * 1.1 + i / 3) % 1; drop(p, 90 + i * 90 + 30 * u * (i - 1), 120 + 160 * u * u, 22); }
};
/** wind streaks blowing right-to-left, 600 x 360 canvas, t seconds */
export const fxWind = (p: Pen, t: number) => {
  for (let k = 0; k < 4; k++) {
    const u = (t * 1.3 + k * 0.27) % 1, x = 560 - 520 * u, y = 60 + k * 80;
    const pts: P2[] = [];
    for (let i = 0; i <= 10; i++) pts.push([x + i * 22, y + 10 * Math.sin(i * 0.9 + k)]);
    p.stroke(pts, 12, INK); p.stroke(pts, 6, "#f6fbff");
    p.arc(x - 10, y - 18, 22, 22, 90, 330, 9);
  }
};
/** the kendi's little face: dot eyes, a content smile, one sweat drop, 340 x 260 canvas, blink 0..1 */
export const fxKendiFace = (p: Pen, blink: number) => {
  for (const x of [120, 220]) {
    if (blink > 0.5) p.stroke([[x - 14, 100], [x + 14, 100]], 9);
    else p.ell(x, 100, 13, 17, INK, 0);
  }
  p.arc(170, 132, 40, 26, 20, 160, 9);
  drop(p, 285, 70, 24);
};
/** a comic spit-take: a spray of water drops from the left edge outward, 520 x 320 canvas, t 0..1 */
export const fxSpit = (p: Pen, t: number) => {
  for (let i = 0; i < 9; i++) {
    const a = -0.5 + (i / 8) * 0.9, d = 40 + 430 * t * (0.7 + 0.3 * Math.sin(i * 2.7)), x = 30 + d * Math.cos(a), y = 160 + d * Math.sin(a) + 120 * t * t;
    if (x > 500 || y > 300) continue;
    drop(p, x, y, (16 - 6 * t) * (0.8 + 0.3 * Math.sin(i)), "#bfe8ff");
  }
  p.ell(60, 160, 40 * (1 - t) + 10, 26 * (1 - t) + 8, "#dff3ff", 6);
};
