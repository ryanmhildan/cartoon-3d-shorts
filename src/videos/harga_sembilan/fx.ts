// 2D effect cards of "Seratus Rupiah": the "HAHA" laugh, the 100-coin that cannot buy a candy, glance marks, the
// left-to-right reading of 9.900 (the 9 grows and sticks), the "9 ribuan" thought bubble, the newspaper (big headline,
// tiny body text), the two first digits compared, the "!" mark and flying coins. Same ink language as toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number, align: CanvasTextAlign = "center") => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = align; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};
const RED = "#e2453c", GOLD = "#ffd84a", PAPER = "#fbf6e8";
const cross = (p: Pen, cx: number, cy: number, r: number) => {
  for (const s of [-1, 1]) { p.stroke([[cx - r, cy - s * r], [cx + r, cy + s * r]], r * 0.34, INK); p.stroke([[cx - r, cy - s * r], [cx + r, cy + s * r]], r * 0.22, RED); }
};
const coin = (p: Pen, x: number, y: number, r: number, label = "100") => {
  p.ell(x, y, r, r, "#d9dde2", r * 0.12);
  p.ell(x, y, r * 0.74, r * 0.74, null, r * 0.06);
  p.ell(x - r * 0.35, y - r * 0.4, r * 0.18, r * 0.12, "rgba(255,255,255,0.9)", 0, 0, 360, -30);
  text(p, label, x, y + r * 0.04, r * 0.62, INK);
};
const arrow = (p: Pen, a: P2, b: P2, w: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, h = w * 2.6;
  p.stroke([a, [b[0] - ux * h * 0.6, b[1] - uy * h * 0.6]], w + 6, INK); p.stroke([a, [b[0] - ux * h * 0.6, b[1] - uy * h * 0.6]], w, col);
  p.poly([b, [b[0] - ux * h - uy * h * 0.7, b[1] - uy * h + ux * h * 0.7], [b[0] - ux * h + uy * h * 0.7, b[1] - uy * h - ux * h * 0.7]], col, 5);
};

/** "HA HA" bouncing letters, 520 x 300 */
export const fxHaha = (p: Pen, t: number) => {
  text(p, "HA", 150, 170 + 14 * Math.sin(t * 14), 150, GOLD, 22);
  text(p, "HA!", 370, 140 + 14 * Math.sin(t * 14 + 1.6), 150, GOLD, 22);
};

/** a 100-rupiah coin = a candy, crossed out; k = 0 (coin only) .. 1 (crossed), 760 x 380 */
export const fxCoinCandy = (p: Pen, k: number) => {
  p.poly(rrect(14, 14, 746, 366, 50), PAPER, 14);
  coin(p, 160, 190, 110);
  text(p, "=", 380, 190, 150, INK);
  // candy: wrapped sweet
  const cx = 590, cy = 190;
  p.poly([[cx - 70, cy], [cx - 140, cy - 60], [cx - 130, cy + 60]], "#f08a2c", 8);
  p.poly([[cx + 70, cy], [cx + 140, cy - 60], [cx + 130, cy + 60]], "#f08a2c", 8);
  p.ell(cx, cy, 80, 62, "#e05a8a", 10);
  for (const d of [-30, 0, 30]) p.stroke([[cx + d - 14, cy - 50], [cx + d + 14, cy + 50]], 10, "#ffffff");
  if (k > 0) cross(p, cx, cy, 120 * Math.min(1, k));
};

/** two little glance marks beside an eye: dir = -1 (looking left) / +1 (right), 300 x 200 */
export const fxGlance = (p: Pen, dir: number) => {
  for (const [y, l] of [[70, 80], [130, 110]] as const) {
    const x0 = dir > 0 ? 40 : 260, x1 = x0 + dir * l;
    p.stroke([[x0, y], [x1, y]], 18, INK); p.stroke([[x0, y], [x1, y]], 9, "#ffffff");
  }
};

/** reading "9.900" from the left: an eye sweeps left -> right, the 9 grows gold and sticks while the rest fades.
 *  u = 0..1 progress, 900 x 560 */
export const fxReadLeft = (p: Pen, u: number) => {
  p.poly(rrect(14, 14, 886, 546, 56), PAPER, 14);
  const digits = ["9", ".", "9", "0", "0"], xs = [190, 300, 410, 560, 710];
  const sweep = Math.min(1, u * 1.6), ex = 150 + sweep * 640;
  digits.forEach((d, i) => {
    const first = i === 0, grow = first ? 1 + 0.45 * Math.min(1, u * 2.2) : 1;
    const fade = first ? 0 : Math.max(0, Math.min(1, (u - 0.35) * 2.2));
    const col = first ? GOLD : `rgba(36,23,38,${(1 - 0.7 * fade).toFixed(2)})`;
    text(p, d, xs[i], 330 - (first ? 24 * (grow - 1) : 0), 250 * grow, first ? col : PAPER, first ? 22 : 0);
    if (!first) text(p, d, xs[i], 330, 250, col);
  });
  // the eye riding along the top with its reading arrow
  arrow(p, [120, 110], [Math.max(170, ex), 110], 16, "#4fa8e0");
  p.ell(90, 110, 52, 34, "#ffffff", 9); p.dot(100, 112, 17);
  // "nempel": a red pin on the 9 once it has grown
  if (u > 0.55) { p.ell(190, 140, 24, 24, RED, 7); p.stroke([[190, 164], [190, 200]], 9, INK); }
};

/** thought bubble "9 ribuan", 640 x 520; k = pop 0..1 */
export const fxThought = (p: Pen, k: number) => {
  for (const [x, y, r] of [[120, 470, 20], [170, 420, 30]] as const) p.ell(x, y, r * k, r * k, PAPER, 9);
  const pts: P2[] = [];
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2, w = 1 + 0.07 * Math.sin(a * 9); pts.push([360 + 250 * w * Math.cos(a) * k, 210 + 170 * w * Math.sin(a) * k]); }
  p.poly(pts, PAPER, 12);
  if (k < 0.95) return;
  text(p, "9", 205, 205, 230, GOLD, 22);
  text(p, "ribuan", 445, 220, 100, INK);
};

/** the newspaper held in both hands: huge headline, tiny body text nobody reads, 600 x 760 */
export const fxPaper = (p: Pen, u: number) => {
  p.poly([[20, 30], [580, 14], [588, 740], [14, 748]], "#f1ece0", 12);
  p.stroke([[300, 30], [300, 740]], 4, "rgba(36,23,38,0.25)");
  text(p, "KORAN PASAR", 300, 80, 46, "#5a5a62");
  p.stroke([[50, 110], [550, 106]], 6, INK);
  text(p, "SANDAL", 300, 190, 120, RED, 0, 520);
  text(p, "MURAH!", 300, 310, 120, RED, 0, 520);
  // photo box + tiny lines, fading as the eye skips them
  p.poly(rrect(52, 380, 280, 560, 10), "#cfd8e0", 6);
  p.ell(166, 470, 50, 40, "#9fb0c0", 0);
  const a = 0.75 - 0.5 * Math.min(1, u);
  for (let col = 0; col < 2; col++) for (let k = 0; k < (col ? 13 : 6); k++) {
    const x0 = col ? 320 : 52, y = col ? 395 + k * 26 : 590 + k * 26;
    p.stroke([[x0, y], [x0 + 230 - (k % 3) * 30, y]], 9, `rgba(90,90,98,${a.toFixed(2)})`);
  }
};

/** the two first digits side by side: "1" (big, grey) vs "9" (gold), 820 x 380 */
export const fxCompare = (p: Pen, k: number) => {
  p.poly(rrect(14, 14, 806, 366, 50), PAPER, 14);
  text(p, "1", 170, 190, 250 * (1 + 0.2 * k), "#8a8f96", 20);
  text(p, "VS", 410, 190, 100, INK);
  text(p, "9", 650, 190, 250 * (1 + 0.2 * k), GOLD, 20);
  text(p, "0.000", 255, 300, 54, "rgba(36,23,38,0.45)", 0, undefined, "left");
  text(p, ".900", 735, 300, 54, "rgba(36,23,38,0.45)", 0, undefined, "left");
};

/** flying coins, 600 x 600, t seconds */
export const fxCoins = (p: Pen, t: number) => {
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.3, ph = (t * 0.9 + i * 0.37) % 1, r = 60 + 220 * ph;
    const x = 300 + Math.cos(a) * r, y = 300 - Math.sin(a) * r * 0.8 + 140 * ph * ph;
    if (ph < 0.85) coin(p, x, y, 36 * (1 - 0.3 * ph), "100");
  }
};

/** a big "!" mark, 300 x 400 */
export const fxMark = (p: Pen, ch: string, col = GOLD) => text(p, ch, 150, 210, 340, col, 26);

/** a glowing yellow frame around the sign someone is looking at, 760 x 560 (sign fills the inner 80 %) */
export const fxHighlight = (p: Pen) => {
  const R = rrect(30, 30, 730, 530, 40);
  p.poly(R, null, 56);
  const g = p.g; g.save(); p.path(R, true); g.lineWidth = 36; g.strokeStyle = "#ffd84a"; g.lineJoin = "round"; g.stroke(); g.restore();
};
