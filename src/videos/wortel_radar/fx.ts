// 2D effect cards of "Pilot yang Katanya Melihat dalam Gelap": wooden notices, the pilot's name banner, the
// "SI MATA KUCING" title with cat ears, the newspaper, radio-wave rings, labels, shout / echo bubbles, the distance
// arrow, the RAHASIA stamp, the vitamin-A card, a speech bubble, an arrow, stars. Ink language of toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
export const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};
const ORANGE = "#f08a2c", LEAF = "#3f8f3c", CREAM = "#f3e3bd";
const carrot = (p: Pen, x: number, y: number, a: number, L: number, lw = 8) => {
  const dx = Math.sin(a), dy = Math.cos(a), nx = dy, ny = -dx, w = 0.26 * L;
  for (const k of [-1, 0, 1]) p.stroke([[x, y], [x - dx * 0.35 * L + nx * k * 0.2 * L, y - dy * 0.35 * L + ny * k * 0.2 * L]], lw * 1.3, LEAF);
  p.poly([[x + nx * w / 2, y + ny * w / 2], [x + dx * L, y + dy * L], [x - nx * w / 2, y - ny * w / 2]], ORANGE, lw);
  for (const t of [0.3, 0.5]) p.stroke([[x + dx * t * L + nx * w * 0.32 * (1 - t), y + dy * t * L + ny * w * 0.32 * (1 - t)], [x + dx * t * L, y + dy * t * L]], lw * 0.5, "rgba(150,70,20,0.7)");
};

/** a wooden notice with two lines, on a 640 x 420 canvas */
export const fxNotice = (p: Pen, l1: string, l2: string) => {
  p.poly(rrect(20, 20, 620, 400, 26), "#c98f55", 12);
  p.poly(rrect(44, 42, 596, 378, 16), CREAM, 6);
  text(p, l1, 320, 150, 92, "#b43a2e", 0, 520);
  text(p, l2, 320, 280, 70, "#3a2a20", 0, 520);
};
/** name banner, on an 800 x 240 canvas */
export const fxName = (p: Pen, name: string) => {
  p.poly([[40, 40], [760, 40], [720, 120], [760, 200], [40, 200], [80, 120]], "#2c4f9a", 10);
  text(p, name, 400, 122, 78, "#ffffff", 0, 600);
};
/** "SI MATA KUCING" with cat ears and glowing cat eyes, on a 900 x 600 canvas; t 0..1 pops the eyes */
export const fxCatTitle = (p: Pen, t: number) => {
  p.poly([[180, 250], [240, 60], [360, 190]], "#3a3340", 12); p.poly([[210, 230], [245, 110], [310, 190]], "#f2a6a6", 0);
  p.poly([[720, 250], [660, 60], [540, 190]], "#3a3340", 12); p.poly([[690, 230], [655, 110], [590, 190]], "#f2a6a6", 0);
  p.poly(rrect(80, 190, 820, 540, 120), "#3a3340", 12);
  for (const s of [-1, 1]) {
    const cx = 450 + s * 150, k = Math.min(1, t * 1.5);
    p.ell(cx, 300, 80, 56 * k + 4, "#ffe25a", 8);
    p.ell(cx, 300, 14, 50 * k + 2, INK, 0);
    p.ell(cx - 22, 284, 10, 8, "#ffffff", 0);
  }
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) p.stroke([[450 + s * 70, 395 + k * 18], [450 + s * 330, 380 + k * 40]], 6, "#f3efe6");
  p.poly([[430, 380], [470, 380], [450, 405]], "#f2a6a6", 6);
  text(p, "SI MATA KUCING", 450, 478, 84, "#ffe25a", 14, 700);
};
/** the newspaper: headline + carrot drawing, on a 700 x 860 canvas; t 0..1 spins it in */
export const fxPaper = (p: Pen) => {
  p.poly(rrect(30, 30, 670, 830, 10), "#f4efe2", 10);
  text(p, "THE DAILY NEWS", 350, 96, 58, "#2a2630", 0, 560);
  p.stroke([[60, 140], [640, 140]], 6, INK);
  text(p, "RAHASIANYA:", 350, 210, 74, "#2a2630", 0, 580);
  text(p, "WORTEL!", 350, 300, 112, "#c43a32", 0, 580);
  p.poly(rrect(70, 370, 400, 790, 12), "#dcd6c6", 6);
  carrot(p, 235, 420, 0.25, 330, 9);
  for (let k = 0; k < 9; k++) p.stroke([[430, 390 + k * 44], [630, 390 + k * 44]], 10, "rgba(60,55,70,0.35)");
};
/** a radio-wave ring segment opening to the right, on a 400 x 600 canvas; a = brightness 0..1 */
export const fxWave = (p: Pen, col = "#7ff0d0") => {
  const g = p.g;
  g.lineCap = "round";
  for (const [w, c] of [[30, INK], [16, col]] as const) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.ellipse(80, 300, 220, 250, 0, -0.95, 0.95); g.stroke(); }
};
/** small rounded label, on a 520 x 200 canvas */
export const fxLabel = (p: Pen, s: string, bg = "#ffe25a", fg = "#2a2630") => {
  p.poly(rrect(20, 20, 500, 180, 60), bg, 10);
  text(p, s, 260, 104, 92, fg, 0, 440);
};
/** jagged shout bubble ("HALO!"), on a 600 x 420 canvas; echo = soft dashed small version */
export const fxShout = (p: Pen, s: string, echo = false) => {
  const pts: P2[] = [];
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, r = i % 2 ? 1 : 0.84; pts.push([300 + 270 * r * Math.cos(a), 200 + 170 * r * Math.sin(a)]); }
  if (echo) {
    p.g.setLineDash([22, 16]);
    p.poly(rrect(60, 70, 540, 330, 120), "rgba(255,255,255,0.8)", 8);
    p.g.setLineDash([]);
    text(p, s, 300, 204, 92, "#3a5aa0", 0, 440);
  } else {
    p.poly(pts, "#ffffff", 10);
    text(p, s, 300, 206, 120, "#c43a32", 0, 440);
  }
};
/** double-headed distance arrow with a word, on a 1000 x 260 canvas */
export const fxDistance = (p: Pen, s: string) => {
  p.band([[80, 170], [920, 170]], "#ffe25a", 16, 6, "butt");
  p.poly([[40, 170], [120, 120], [120, 220]], "#ffe25a", 6);
  p.poly([[960, 170], [880, 120], [880, 220]], "#ffe25a", 6);
  text(p, s, 500, 80, 88, "#ffe25a", 12, 700);
};
/** red rubber stamp, on a 700 x 300 canvas */
export const fxStamp = (p: Pen, s: string) => {
  const g = p.g;
  g.strokeStyle = "#c8302c"; g.lineWidth = 18; g.strokeRect(30, 30, 640, 240);
  g.lineWidth = 6; g.strokeRect(54, 54, 592, 192);
  text(p, s, 350, 154, 140, "#c8302c", 0, 560);
};
/** the vitamin-A card: eye + carrot = check, then "CUMA KALAU KURANG"; t 0..1, on a 900 x 760 canvas */
export const fxVitA = (p: Pen, t: number) => {
  p.poly(rrect(20, 20, 880, 740, 70), "#ffffff", 12);
  // eye
  p.g.save(); p.path([[90, 250], [250, 140], [410, 250], [250, 360]], true); p.g.clip();
  p.ell(250, 250, 180, 120, "#ffffff", 0); p.ell(250, 250, 70, 70, "#4c8ad8", 0); p.ell(250, 250, 30, 30, INK, 0); p.ell(232, 230, 12, 12, "#ffffff", 0);
  p.g.restore();
  p.poly([[90, 250], [250, 140], [410, 250], [250, 360]], null, 10);
  text(p, "+", 470, 250, 120, "#2a2630");
  carrot(p, 640, 140, 0.35, 220, 9);
  text(p, "VITAMIN A", 450, 450, 100, ORANGE, 12, 780);
  if (t > 0.5) {
    p.poly(rrect(70, 540, 830, 690, 50), "#ffe25a", 8);
    text(p, "CUMA KALAU KURANG", 450, 618, 70, "#2a2630", 0, 720);
  }
};
/** speech bubble, tail toward the lower left, on a 900 x 520 canvas */
export const fxBubble = (p: Pen, l1: string, l2: string) => {
  p.poly([[230, 400], [150, 500], [330, 410]], "#ffffff", 12);
  p.poly(rrect(20, 20, 880, 420, 120), "#ffffff", 12);
  p.poly([[240, 395], [175, 470], [320, 400]], "#ffffff", 0);
  text(p, l1, 450, 160, 86, "#2a2630", 0, 780);
  text(p, l2, 450, 290, 86, "#c43a32", 0, 780);
};
/** fat arrow pointing down with a word above, on a 500 x 600 canvas */
export const fxArrow = (p: Pen, s: string) => {
  p.poly([[170, 220], [330, 220], [330, 400], [430, 400], [250, 580], [70, 400], [170, 400]], "#ffe25a", 12);
  text(p, s, 250, 110, 92, "#ffe25a", 14, 480);
};
/** little stars circling after a bump, on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 105 + 50 * Math.sin(a), r = 30;
    const pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const b = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; pts.push([x + rr * Math.cos(b), y + rr * Math.sin(b)]); }
    p.poly(pts, "#ffe25a", 6);
  }
};
