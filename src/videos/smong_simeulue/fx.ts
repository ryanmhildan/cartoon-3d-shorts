// 2D effect cards of "Pulau yang Selamat Berkat Cerita Nenek": flopping fish, the SMONG! word, the sepia 1907 picture
// (a wave and an empty village, no people), the three rule icons, grandma's sand drawing of a tsunami (trough first),
// the blanket analogy and a far foam line. Same ink language as toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};

/** a small fish flopping on the sand, on a 300 x 200 canvas; k -1..1 bends it */
export const fxFish = (p: Pen, k: number, col = "#8fb3c8") => {
  const g = p.g;
  g.save(); g.translate(150, 110); g.rotate(0.35 * k);
  const b = 26 * k, pts: P2[] = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, x = -90 + 150 * t, w = 34 * Math.sin(Math.PI * Math.min(1, t * 1.15)); pts.push([x, b * (t - 0.5) ** 2 * 4 - w]); }
  for (let i = 16; i >= 0; i--) { const t = i / 16, x = -90 + 150 * t, w = 34 * Math.sin(Math.PI * Math.min(1, t * 1.15)); pts.push([x, b * (t - 0.5) ** 2 * 4 + w]); }
  p.poly([[60, 0], [100, -34 + b], [100, 34 + b]], col, 8);
  p.poly(pts, col, 8);
  p.dot(-62, -6, 7);
  p.stroke([[-30, -20], [-26, 18]], 4, "rgba(36,23,38,0.5)");
  g.restore();
};

/** a calm cloud bubble with a word, on a 720 x 360 canvas, t 0..1 pops it in */
export const fxWord = (p: Pen, word: string, t: number, col = "#ffd84a") => {
  const s = t < 0.3 ? 0.7 + t : 1, cx = 360, cy = 180;
  const blobs: [number, number, number][] = [[200, 190, 110], [300, 140, 120], [430, 140, 120], [530, 190, 110], [360, 220, 150]];
  for (const [x, y, r] of blobs) p.ell(cx + (x - cx) * s, cy + (y - cy) * s, r * s, r * 0.72 * s, null, 20);
  for (const [x, y, r] of blobs) p.ell(cx + (x - cx) * s, cy + (y - cy) * s, r * s, r * 0.72 * s, "#fffaf0", 0);
  text(p, word, cx, cy + 8, 130 * s, col, 22, 560);
};

/** the sepia storybook picture of 1907: a huge wave rising over an EMPTY stilt village, on a 760 x 600 canvas */
export const fxSepia = (p: Pen, t: number) => {
  const g = p.g, S = ["#f1e2c2", "#d9c19a", "#b8996c", "#8a6a44", "#5a4128"];
  p.poly(rrect(10, 10, 750, 590, 18), "#7a5634", 14);
  p.poly(rrect(40, 40, 720, 520, 8), S[0], 6);
  g.save(); p.path(rrect(40, 40, 720, 520, 8), true); g.clip();
  g.fillStyle = "#e9d6b0"; g.fillRect(40, 40, 680, 300);
  // hill + empty stilt houses on the left
  p.poly([[40, 420], [40, 300], [140, 260], [260, 330], [300, 420]], S[2], 6);
  for (const [x, y] of [[90, 360], [190, 375]] as const) {
    p.poly([[x - 40, y], [x + 40, y], [x + 40, y - 46], [x - 40, y - 46]], S[1], 6);
    p.poly([[x - 52, y - 46], [x, y - 84], [x + 52, y - 46]], S[3], 6);
    for (const dx of [-30, 30]) p.stroke([[x + dx, y], [x + dx, y + 34]], 6, S[4]);
  }
  // sea + the rising wave from the right
  p.poly([[40, 430], [720, 430], [720, 520], [40, 520]], S[2], 0);
  const h = 60 + 190 * t, x0 = 720 - 330 * t;
  const wave: P2[] = [[x0 - 80, 430]];
  for (let i = 0; i <= 20; i++) { const u = i / 20; wave.push([x0 - 80 + 420 * u, 430 - h * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.62) * (1 - 0.25 * u)]); }
  wave.push([760, 430]);
  p.poly(wave, S[3], 8);
  for (let i = 0; i < 5; i++) { const u = 0.15 + i * 0.08; p.ell(x0 - 80 + 420 * u + 30, 430 - h * 0.9 - 6 * i, 22, 12, S[0], 4); }
  g.restore();
  p.poly(rrect(40, 40, 720, 520, 8), null, 8);
  p.poly(rrect(270, 530, 490, 584, 14), S[0], 6);
  text(p, "1907", 380, 559, 46, S[4]);
};

/** one of the three rule icons (0 quake, 1 sea draws back, 2 run uphill) with its label, on a 380 x 440 canvas */
export const fxIcon = (p: Pen, kind: number) => {
  p.poly(rrect(14, 14, 366, 366, 40), "#fff8e8", 12);
  const g = p.g;
  if (kind === 0) {
    p.poly([[120, 280], [260, 280], [260, 180], [190, 120], [120, 180]], "#e2b07a", 9);
    p.poly(rrect(170, 220, 210, 280, 6), "#7a4f30", 6);
    for (const s of [-1, 1]) p.line([[190 + s * 110, 120], [190 + s * 135, 150], [190 + s * 110, 180], [190 + s * 135, 210], [190 + s * 110, 240]], INK, 9);
  } else if (kind === 1) {
    p.poly([[40, 300], [340, 300], [340, 250], [40, 200]], "#e6cf98", 8);
    p.poly([[40, 200], [40, 120], [180, 120], [180, 228]], "#6fb4d2", 0);
    g.globalAlpha = 0.25; p.poly([[180, 120], [340, 120], [340, 250], [180, 228]], "#6fb4d2", 0); g.globalAlpha = 1;
    p.stroke([[300, 165], [210, 165]], 16, "#d8402f"); p.poly([[200, 140], [170, 165], [200, 190]], "#d8402f", 0);
    p.ell(260, 262, 26, 10, "#8fb3c8", 5);
  } else {
    p.poly([[40, 320], [330, 320], [330, 110], [250, 120], [140, 230], [40, 300]], "#7ab35a", 9);
    p.stroke([[150, 280], [270, 160]], 16, "#d8402f"); p.poly([[245, 150], [285, 140], [275, 182]], "#d8402f", 0);
  }
  const L = ["GEMPA", "LAUT SURUT", "LARI KE ATAS"][kind];
  p.poly(rrect(20, 372, 360, 432, 24), "#fff3c4", 8);
  text(p, L, 190, 404, 44, "#b43a2e", 0, 320);
};

/** grandma's drawing scratched in the sand, on a 1400 x 640 canvas, transparent background (cut-out card).
 *  mode 0: the long wave being drawn (t = progress) + "ratusan km"; mode 1: the wave runs to the shore on the right,
 *  its trough (LEMBAH) arriving first and pulling the shore water down, the crest (PUNCAK) behind. */
export const fxSand = (p: Pen, mode: number, t: number) => {
  const g = p.g, groove = "#8a6a44", lip = "#f6e7c0";
  const line = (pts: P2[], w = 16) => { p.stroke(pts.map(([x, y]) => [x + 3, y + 4] as P2), w + 4, lip); p.stroke(pts, w, groove); };
  const base = 360;
  if (mode === 0) {
    const n = Math.max(2, Math.round(60 * t)), pts: P2[] = [];
    for (let i = 0; i <= n; i++) { const x = 60 + (1280 * i) / 60; pts.push([x, base - 120 * Math.sin(((x - 60) / 1280) * Math.PI * 1.0) * Math.sin(((x - 60) / 1280) * Math.PI * 3)]); }
    line(pts);
    if (t > 0.7) {
      const a = Math.min(1, (t - 0.7) / 0.2);
      line([[120, 560], [120 + 1160 * a, 560]], 12);
      if (a >= 1) { line([[150, 535], [118, 560], [150, 585]], 12); line([[1250, 535], [1282, 560], [1250, 585]], 12); }
      if (t > 0.9) text(p, "RATUSAN KM", 700, 500, 70, groove);
    }
    return;
  }
  // shore doodle on the right: beach slope + a stilt house
  const shoreX = 1130;
  line([[shoreX - 60, base + 20], [1360, base - 90]], 14);
  line([[1260, base - 70], [1260, base - 150], [1340, base - 150], [1340, base - 104]], 10);
  line([[1240, base - 150], [1300, base - 200], [1360, base - 150]], 10);
  // the wave: leading trough (right), crest behind (left); c moves toward the shore
  const c = 300 + 760 * t, w = 150;
  const y = (x: number) => base + 70 * Math.exp(-(((x - c) / w) ** 2)) - 130 * Math.exp(-(((x - c + 1.7 * w) / w) ** 2));
  const pts: P2[] = [];
  for (let x = 40; x <= shoreX; x += 20) pts.push([x, y(x)]);
  line(pts);
  // still-water level (dashed) + the shore water mark that dips when the trough arrives
  g.setLineDash([24, 20]); p.stroke([[40, base], [shoreX, base]], 6, "rgba(138,106,68,0.6)"); g.setLineDash([]);
  if (t > 0.15) {
    text(p, "LEMBAH", c, y(c) + 70, 52, groove);
    text(p, "PUNCAK", c - 1.7 * w, y(c - 1.7 * w) - 60, 52, groove);
  }
  const dip = y(shoreX) - base;
  if (dip > 12) { line([[shoreX - 20, base + dip], [shoreX + 40, base + dip - 20]], 10); line([[shoreX + 70, base - 40], [shoreX - 10, base + dip - 6]], 8); }
};

/** the blanket analogy seen from above, on a 1000 x 760 canvas: a hand pulls the left edge; first the far (right) edge
 *  slides back, then a fold travels across toward it. t 0..1 */
export const fxBlanket = (p: Pen, t: number) => {
  const g = p.g;
  p.poly(rrect(10, 10, 990, 750, 30), "#d9b67a", 10); // the mat (tikar)
  g.save(); p.path(rrect(10, 10, 990, 750, 30), true); g.clip();
  for (let x = 30; x < 1000; x += 46) p.stroke([[x, 10], [x, 750]], 3, "rgba(120,80,30,0.25)");
  g.restore();
  const pull = 150 * Math.min(1, t / 0.35), x0 = 110 - pull * 0.6, x1 = 900 - pull;
  const fold = t < 0.35 ? -1 : 0.35 + ((t - 0.35) / 0.65) * 0.75; // fold position along the blanket (0..1)
  const top = 140, bot = 620;
  p.poly([[x0, top], [x1, top], [x1, bot], [x0, bot]], "#c84a52", 10);
  g.save(); p.path([[x0, top], [x1, top], [x1, bot], [x0, bot]], true); g.clip();
  for (let y = top + 40; y < bot; y += 90) p.band([[x0, y], [x1, y]], "#f0c93e", 18, 0);
  if (fold > 0) { // the travelling fold: a lit ridge + shaded trough across the blanket
    const fx = x0 + (x1 - x0) * fold;
    g.fillStyle = "rgba(255,240,220,0.55)"; g.fillRect(fx - 46, top, 40, bot - top);
    g.fillStyle = "rgba(60,20,30,0.45)"; g.fillRect(fx - 6, top, 46, bot - top);
  }
  g.restore();
  if (fold > 0) { const fx = x0 + (x1 - x0) * fold; p.stroke([[fx - 6, top - 4], [fx - 6, bot + 4]], 8); }
  // the pulling hand + arrow
  p.ell(x0 - 30, (top + bot) / 2, 44, 52, "#c99067", 9);
  p.stroke([[x0 - 70, (top + bot) / 2 + 150], [x0 - 200, (top + bot) / 2 + 150]], 14, "#b43a2e");
  p.poly([[x0 - 210, (top + bot) / 2 + 125], [x0 - 250, (top + bot) / 2 + 150], [x0 - 210, (top + bot) / 2 + 175]], "#b43a2e", 0);
  if (t < 0.4) { p.stroke([[x1 + 60, (top + bot) / 2], [x1 + 10, (top + bot) / 2]], 12, "#3f6fb5"); p.poly([[x1 + 12, (top + bot) / 2 - 20], [x1 - 14, (top + bot) / 2], [x1 + 12, (top + bot) / 2 + 20]], "#3f6fb5", 0); }
};

/** a far white foam line (the coming swell) on a 1024 x 96 canvas */
export const fxFoam = (p: Pen) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 64; i++) pts.push([i * 16, 48 + 10 * Math.sin(i * 0.9) + 6 * Math.sin(i * 2.3)]);
  p.stroke(pts, 26, "rgba(255,255,255,0.95)");
  p.stroke(pts.map(([x, y]) => [x, y + 18] as P2), 10, "rgba(200,235,250,0.8)");
};
