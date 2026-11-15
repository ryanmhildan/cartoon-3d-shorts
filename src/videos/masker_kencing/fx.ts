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

// ---------------- jarak (castor) short ----------------
const GOLD = "#f2b632";
/** a palmate castor leaf (7 pointed lobes) centred at (x, y), radius r, rotation a */
const leaf = (p: Pen, x: number, y: number, r: number, a: number, col: string) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 70; i++) {
    const t = (i / 70) * Math.PI * 2, lobe = Math.pow(Math.abs(Math.cos(t * 3.5)), 2.5), rr = r * (0.42 + 0.58 * lobe);
    pts.push([x + rr * Math.cos(t + a), y + rr * Math.sin(t + a) * 0.82]);
  }
  p.poly(pts, col, 7);
  for (let k = 0; k < 7; k++) { const t = a + (k / 7) * Math.PI * 2; p.stroke([[x, y], [x + r * 0.85 * Math.cos(t), y + r * 0.85 * Math.sin(t) * 0.82]], 4, "#9a3a3a"); }
  p.dot(x, y, 8, "#9a3a3a");
};
/** spiky castor seed cluster (red capsules) at (x, y) */
const pods = (p: Pen, x: number, y: number, s: number) => {
  for (let i = 0; i < 6; i++) {
    const px = x + (i % 2 ? 1 : -1) * 16 * s, py = y + i * 22 * s, r = 16 * s;
    const pts: P2[] = [];
    for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2, rr = k % 2 ? r : r * 1.35; pts.push([px + rr * Math.cos(t), py + rr * Math.sin(t)]); }
    p.poly(pts, "#c8433a", 4);
  }
};
/** a whole castor plant on the 600 x 1000 character canvas (soles at y 975), variant v */
export const fxJarak = (p: Pen, v: number) => {
  const h = (k: number) => { const s = Math.sin(v * 91.7 + k * 37.3) * 43758.5; return s - Math.floor(s); };
  p.line([[300, 975], [296, 600], [304, 260], [300, 140]], "#8a3a4a", 22);
  p.line([[298, 560], [180, 430]], "#8a3a4a", 12); p.line([[302, 470], [430, 340]], "#8a3a4a", 12); p.line([[300, 700], [420, 610]], "#8a3a4a", 12);
  const L: [number, number, number][] = [[175, 420, 118], [440, 330, 122], [430, 600, 104], [170, 680, 96], [300, 250, 100], [210, 820, 78], [400, 800, 80]];
  L.forEach(([x, y, r], i) => leaf(p, x + (h(i) - 0.5) * 30, y + (h(i + 9) - 0.5) * 30, r, h(i + 3) * 1.2, i % 2 ? "#3f7a3a" : "#4d8a42"));
  pods(p, 300, 70, 1.1);
};
/** yellow rounded label on a 640 x 220 canvas */
export const fxLabel = (p: Pen, s: string, bg = "#ffd84a", fg = "#1f2a44") => {
  p.poly(rrect(20, 20, 620, 200, 40), bg, 12);
  text(p, s, 320, 114, 92, fg, 0, 540);
};
/** a two-line painted board on a 640 x 340 canvas */
export const fxSign2 = (p: Pen, l1: string, l2: string) => {
  p.poly(rrect(20, 20, 620, 320, 26), "#c98f55", 12);
  p.poly(rrect(44, 42, 596, 298, 16), "#f3e3bd", 6);
  text(p, l1, 320, 125, 80, "#b43a2e", 0, 520);
  text(p, l2, 320, 230, 70, "#1f2a44", 0, 500);
};
/** speech bubble with two lines on a 760 x 380 canvas */
export const fxSpeech = (p: Pen, l1: string, l2: string) => {
  p.poly([[150, 270], [90, 370], [250, 280]], "#ffffff", 12);
  p.ell(380, 170, 350, 150, "#ffffff", 12);
  p.poly([[160, 262], [100, 356], [240, 272]], "#ffffff", 0);
  text(p, l1, 380, 125, 62, INK, 0, 620);
  text(p, l2, 380, 210, 64, "#b43a2e", 0, 620);
};
/** a castor seed pod with a red "BERACUN" tag, on a 500 x 420 canvas */
export const fxPoison = (p: Pen) => {
  pods(p, 140, 60, 2.2);
  for (const [x, y] of [[300, 120], [360, 170], [320, 220]] as const) { p.ell(x, y, 34, 24, "#8a6a4a", 7); p.stroke([[x - 20, y - 4], [x + 18, y + 6]], 5, "#d8c8a8"); }
  p.poly(rrect(60, 300, 440, 400, 30), HOT, 10);
  text(p, "BERACUN", 250, 352, 70, "#ffffff", 0, 360);
};
/** an item (pod / leaf) with a crossed-out bowl or coins, on a 600 x 300 canvas */
export const fxNo = (p: Pen, what: "eat" | "sell") => {
  if (what === "eat") { p.ell(150, 170, 110, 60, "#f4f1ea", 10, 0, 180); p.stroke([[60, 110], [240, 110]], 10); p.stroke([[250, 40], [210, 120]], 14, "#c9a46a"); }
  else for (let i = 0; i < 3; i++) { p.ell(110 + i * 45, 200 - i * 26, 60, 22, "#f2c24a", 9); text(p, "Rp", 110 + i * 45, 200 - i * 26, 30, "#8a5a1a"); }
  cross(p, 150, 150, 90);
  if (what === "eat") pods(p, 430, 70, 1.6); else leaf(p, 440, 150, 110, 0.3, "#4d8a42");
};
/** cracked castor seed with a golden oil drop and sparkles, on a 600 x 600 canvas, t sparkle time */
export const fxSeedOil = (p: Pen, t: number) => {
  p.ell(230, 330, 150, 105, "#8a6a4a", 12); p.ell(230, 330, 150, 105, null, 12);
  for (let k = 0; k < 6; k++) p.stroke([[120 + k * 40, 280 + (k % 2) * 30], [150 + k * 40, 320 + (k % 2) * 20]], 8, "#d8c8a8");
  p.stroke([[250, 230], [270, 300], [240, 360], [270, 430]], 10);
  drop(p, 420, 300, 70, GOLD, 0.16);
  for (let i = 0; i < 4; i++) {
    const a = t * 3 + i * 1.7, x = 420 + 130 * Math.cos(a), y = 280 + 110 * Math.sin(a), r = 16 + 10 * Math.sin(t * 6 + i);
    const pts: P2[] = []; for (let k = 0; k < 8; k++) { const q = (k * Math.PI) / 4, rr = k % 2 ? r * 0.3 : r; pts.push([x + rr * Math.cos(q), y + rr * Math.sin(q)]); }
    p.poly(pts, "#fff3b0", 5);
  }
};
/** an engine cylinder cut-away: piston moving (t), oil film thin + smoking (mode 0) or golden + smooth (mode 1),
 *  on a 700 x 900 canvas */
export const fxEngine = (p: Pen, mode: 0 | 1, t: number) => {
  p.poly(rrect(120, 120, 580, 760, 30), "#9aa3ab", 14);
  p.poly(rrect(200, 160, 500, 720, 14), mode ? "#3a2a1a" : "#3a2d2d", 8);
  const py = 360 + 150 * Math.sin(t * 9);
  // oil film on the walls
  const oil = mode ? GOLD : "#c9b27a";
  p.poly(rrect(200, 160, 224 + (mode ? 12 : 0), 720, 6), oil, 0); p.poly(rrect(476 - (mode ? 12 : 0), 160, 500, 720, 6), oil, 0);
  p.poly(rrect(214, py - 70, 486, py + 70, 12), "#c9ccd2", 8);
  for (const y of [py - 40, py - 15]) p.stroke([[214, y], [486, y]], 5);
  p.line([[350, py + 60], [350, 860]], "#8d949c", 26);
  if (mode === 0) {
    for (let k = 0; k < 3; k++) { const u = (t * 1.3 + k / 3) % 1; p.ell(350 + (k - 1) * 120, 120 - u * 100, 50 + 40 * u, 40 + 30 * u, `rgba(70,64,64,${(0.85 * (1 - u)).toFixed(2)})`, 0); }
    flame(p, 590, 220, 46); flame(p, 110, 300, 38);
    p.poly(rrect(150, 780, 560, 880, 30), HOT, 10); text(p, "MINYAK BIASA", 355, 832, 54, "#ffffff", 0, 380);
  } else {
    for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; p.ell(350 + 200 * Math.cos(a), 440 + 260 * Math.sin(a), 14, 14, "#fff3b0", 5); }
    p.poly(rrect(150, 780, 560, 880, 30), "#7bd36a", 10); text(p, "MINYAK JARAK", 355, 832, 54, "#1f4a2a", 0, 380);
  }
};
/** an oil can tipping a golden stream, on a 500 x 500 canvas */
export const fxOilCan = (p: Pen, t: number) => {
  const g = p.g; g.save(); g.translate(170, 170); g.rotate(0.5);
  p.poly(rrect(-90, -60, 90, 80, 16), "#c43c32", 10); p.poly([[60, -40], [190, -90], [196, -76], [80, -10]], "#c9ccd2", 8);
  p.ell(0, -70, 40, 14, "#c9ccd2", 7);
  g.restore();
  const wob = 6 * Math.sin(t * 10);
  p.line([[345, 160], [360 + wob, 300], [350, 470]], GOLD, 18);
};
/** an empty rice bowl on a 400 x 260 canvas */
export const fxBowl = (p: Pen) => {
  p.ell(200, 110, 170, 50, "#f4f1ea", 10);
  p.ell(200, 110, 140, 34, "#d8d2c4", 0);
  p.poly([[30, 110], [370, 110], [300, 220], [100, 220]], "#f4f1ea", 10);
  p.stroke([[60, 150], [340, 150]], 8, "#3f6fb5");
};
/** "PANAS!" flame badge on a 500 x 300 canvas */
export const fxHot = (p: Pen, s = "PANAS!") => {
  p.poly(rrect(20, 60, 480, 240, 40), HOT, 12);
  flame(p, 80, 150, 50);
  text(p, s, 290, 152, 90, "#ffffff", 0, 330);
};
/** dark smoke puff, t 0..1, on a 300 x 300 canvas */
export const fxSmoke = (p: Pen, t: number) => {
  for (let k = 0; k < 4; k++) { const u = clamp((t + k * 0.25) % 1); p.ell(150 + 40 * Math.sin(k * 2 + u * 3), 260 - u * 220, 40 + 60 * u, 34 + 50 * u, `rgba(55,48,48,${(0.85 * (1 - u)).toFixed(2)})`, 0); }
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));

// ---------------- gas-mask short ----------------
const GAS = "rgba(196,214,92,";
/** a soft yellow-green cloud puff on a 512 x 256 canvas (soft card), variant v */
export const fxGas = (p: Pen, v: number) => {
  const g = p.g;
  for (let k = 0; k < 7; k++) {
    const h = (i: number) => { const s = Math.sin(v * 77.7 + k * 13.1 + i * 3.3) * 43758.5; return s - Math.floor(s); };
    const x = 70 + h(1) * 372, y = 120 + (h(2) - 0.5) * 60, r = 60 + h(3) * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, GAS + "0.5)"); gr.addColorStop(0.6, GAS + "0.28)"); gr.addColorStop(1, GAS + "0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); g.fill();
  }
};
/** a white handkerchief (a little damp-yellow in the middle) on a 300 x 220 canvas */
export const fxCloth = (p: Pen) => {
  p.poly([[20, 40], [280, 20], [270, 190], [30, 200]], "#f4f1ea", 10);
  p.ell(150, 110, 70, 45, "rgba(230,214,140,0.7)", 0);
  for (const y of [70, 150]) p.stroke([[40, y], [260, y - 12]], 3, "rgba(150,140,120,0.6)");
};
/** stinging tears + squiggles on a 400 x 300 canvas */
export const fxTears = (p: Pen, t: number) => {
  for (const s of [-1, 1]) {
    const y = 120 + ((t * 2) % 1) * 140;
    drop(p, 200 + s * 110, y, 18, WATER, 0.2);
    p.stroke([[200 + s * 150, 60], [200 + s * 175, 40], [200 + s * 150, 20]], 7, HOT);
  }
};
/** a gas-mask icon crossed out, on a 400 x 400 canvas */
export const fxNoMask = (p: Pen) => {
  p.ell(200, 180, 120, 140, "#7f8a6a", 12);
  p.ell(150, 150, 38, 38, "#cfe6ee", 9); p.ell(250, 150, 38, 38, "#cfe6ee", 9);
  p.poly(rrect(170, 240, 230, 330, 14), "#4a5040", 9); p.ell(200, 340, 44, 30, "#4a5040", 9);
  cross(p, 200, 200, 150);
};
/** a metal canteen with a water drop and a "Cl" bubble (show 1), on a 600 x 500 canvas */
export const fxCanteen = (p: Pen, show: number) => {
  p.ell(200, 290, 140, 170, "#7c8a6a", 12); p.poly(rrect(170, 90, 230, 140, 10), "#c9ccd2", 9);
  p.ell(200, 290, 105, 130, null, 6);
  drop(p, 200, 300, 50, WATER, 0.18);
  if (show) { p.ell(460, 150, 110, 100, "#f2ef9a", 12); text(p, "Cl", 460, 150, 110, "#5a7a1a", 0); p.poly([[380, 200], [330, 260], [410, 220]], "#f2ef9a", 10); }
};
/** stink lines (wavy, green) on a 300 x 300 canvas */
export const fxStink = (p: Pen, t: number) => {
  for (let i = 0; i < 3; i++) {
    const pts: P2[] = [];
    for (let k = 0; k <= 12; k++) pts.push([70 + i * 80 + 18 * Math.sin(k * 0.9 + t * 8 + i), 280 - k * 20]);
    p.stroke(pts, 16, INK); p.stroke(pts, 8, "#9ac43a");
  }
};
/** gas dots dissolving into a glass of water, t seconds, on a 600 x 700 canvas */
export const fxDissolve = (p: Pen, t: number) => {
  p.poly(rrect(8, 8, 592, 692, 40), "#fff8e8", 12);
  p.poly([[150, 200], [450, 200], [420, 650], [180, 650]], "#e8f6fb", 12);
  p.poly([[160, 330], [440, 330], [420, 640], [180, 640]], "#9fd8ea", 0);
  p.poly([[150, 200], [450, 200], [420, 650], [180, 650]], null, 12);
  for (let i = 0; i < 9; i++) {
    const u = (t * 0.5 + i / 9) % 1, x = 200 + (i * 37) % 200, y = 60 + u * 420, inW = y > 330, r = inW ? 22 * (1 - (y - 330) / 160) : 22;
    if (r > 2) p.ell(x, y, r, r, inW ? "rgba(150,190,80,0.6)" : "#b6cc4a", inW ? 0 : 6);
  }
  p.poly(rrect(110, 20, 490, 110, 30), "#ffd84a", 10); text(p, "LARUT!", 300, 66, 64, "#1f2a44", 0, 340);
};
/** wet cloth fibres catching gas dots before the lungs, t seconds, on a 700 x 700 canvas */
export const fxCatch = (p: Pen, t: number) => {
  p.poly(rrect(8, 8, 692, 692, 40), "#fff8e8", 12);
  // lungs on the right
  p.ell(520, 360, 62, 120, "#f0a0a8", 10); p.ell(596, 360, 56, 112, "#f0a0a8", 10); p.stroke([[558, 190], [558, 260]], 14);
  // the cloth: a blue-wet woven band
  p.poly(rrect(300, 120, 380, 600, 20), "#cfe2ee", 10);
  for (let y = 140; y < 600; y += 30) p.stroke([[305, y], [375, y + 10]], 4, "#8fb8d0");
  for (let i = 0; i < 10; i++) {
    const u = (t * 0.6 + i / 10) % 1, y = 160 + ((i * 47) % 420), x = 40 + u * 300;
    const stuck = x > 300, pass = i % 4 === 0;
    const xx = stuck && !pass ? 300 + (i % 3) * 18 : pass ? 40 + u * 520 : x;
    p.ell(xx, y, 16, 16, "#b6cc4a", 6);
  }
};
/** NH3 meets Cl: the green dot turns grey and small, t seconds, on a 700 x 600 canvas */
export const fxReact = (p: Pen, t: number) => {
  p.poly(rrect(8, 8, 692, 592, 40), "#fff8e8", 12);
  const u = (t * 0.5) % 1, meet = Math.min(1, u * 2);
  p.ell(120 + 160 * meet, 250, 70, 70, "#b6cc4a", 10); text(p, "Cl", 120 + 160 * meet, 250, 64, "#3a4a10");
  p.ell(580 - 160 * meet, 250, 70, 70, "#9fd8ea", 10); text(p, "NH3", 580 - 160 * meet, 250, 52, "#1f2a44");
  if (u > 0.5) { const k = (u - 0.5) * 2; p.ell(350, 250, 60 - 20 * k, 60 - 20 * k, "#b8b8b0", 10); for (let i = 0; i < 8; i++) { const a = i * 0.785; p.stroke([[350 + 80 * Math.cos(a), 250 + 80 * Math.sin(a)], [350 + (100 + 30 * k) * Math.cos(a), 250 + (100 + 30 * k) * Math.sin(a)]], 8, "#ffd84a"); } }
  p.poly(rrect(110, 440, 590, 560, 34), "#7bd36a", 10); text(p, "AMONIA", 350, 500, 72, "#1f4a2a", 0, 440);
};
/** small fire + flames on a 300 x 300 canvas */
export const fxFire = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) flame(p, 100 + k * 50, 200 - 20 * Math.abs(Math.sin(t * 9 + k)), 50 - k * 6);
};
