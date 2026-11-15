// 2D effect cards of "Raja Es": the newspaper, HAHA marks, drips, flying coins, check / cross marks, the 4-month
// calendar, the "more than half" gauge, a hot sun, the magnifier over sawdust (air pockets), the heat cross-section,
// the ice block in a puffy jacket, a crown and confetti. Same ink language as toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};
const PAPER = "#f4ecd6";

/** the newspaper page, on a 700 x 900 canvas */
export const fxPaper = (p: Pen) => {
  p.poly([[20, 30], [680, 14], [690, 880], [14, 890]], PAPER, 12);
  text(p, "BOSTON GAZETTE", 350, 90, 64, "#2a2420", 0, 600);
  p.stroke([[50, 140], [650, 132]], 6); p.stroke([[50, 152], [650, 144]], 3);
  text(p, "INI BUKAN", 350, 245, 104, "#b43a2e", 0, 600);
  text(p, "LELUCON.", 350, 355, 104, "#b43a2e", 0, 600);
  // little woodcut of a ship with ice blocks
  p.poly(rrect(70, 430, 330, 640, 10), "#e6dcc0", 5);
  p.poly([[100, 580], [300, 580], [280, 615], [120, 615]], "#6a4028", 4);
  p.stroke([[200, 580], [200, 470]], 5); p.poly([[150, 480], [250, 480], [245, 560], [155, 560]], "#fbf6e8", 4);
  for (let i = 0; i < 3; i++) p.poly(rrect(120 + i * 28, 556, 144 + i * 28, 578, 3), "#bfe4f4", 3);
  for (let r0 = 0; r0 < 9; r0++) for (const [x0, x1] of [[360, 640], [70, 640]] as const) {
    const y = r0 < 7 ? 450 + r0 * 30 : 700 + (r0 - 7) * 30;
    if (r0 >= 7 || x0 === 360) p.stroke([[x0, y], [x1 - (r0 % 3) * 30, y]], 5, "rgba(42,36,32,0.55)");
  }
  for (let r0 = 0; r0 < 5; r0++) p.stroke([[70, 760 + r0 * 26], [640 - (r0 % 2) * 60, 760 + r0 * 26]], 5, "rgba(42,36,32,0.55)");
};

export const fxHaha = (p: Pen, t: number) => text(p, "HAHA", 200, 100 + 6 * Math.sin(t * 12), 120, "#ffd84a", 18);

/** water drops falling, on a 200 x 300 canvas, t 0..1 */
export const fxDrops = (p: Pen, t: number) => {
  for (let i = 0; i < 3; i++) {
    const u = (t + i / 3) % 1, x = 50 + i * 50, y = 30 + 240 * u;
    p.poly([[x, y - 26], [x + 14, y], [x, y + 14], [x - 14, y]], "#9fd4ff", 5);
  }
};

/** coins flying out of an empty purse, on a 500 x 500 canvas, t 0..1 */
export const fxCoins = (p: Pen, t: number) => {
  p.poly([[170, 330], [330, 330], [350, 450], [150, 450]], "#8a5a36", 9);
  p.stroke([[190, 330], [250, 300], [310, 330]], 7);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.35, d = 60 + 280 * ((t + i * 0.13) % 1), x = 250 + Math.cos(a) * d, y = 320 + Math.sin(a) * d * 0.9;
    p.ell(x, y, 26, 26, "#f0c93e", 6); p.ell(x, y, 12, 12, null, 3);
  }
};

/** ✓ (green) or ✗ (red) in a white disc, on a 300 x 300 canvas */
export const fxMark = (p: Pen, ok: boolean) => {
  p.ell(150, 150, 120, 120, "#ffffff", 12);
  if (ok) { p.stroke([[85, 155], [130, 205], [220, 95]], 46, INK); p.stroke([[85, 155], [130, 205], [220, 95]], 30, "#3fae55"); }
  else for (const [a, b] of [[[90, 90], [210, 210]], [[210, 90], [90, 210]]] as [P2, P2][]) { p.stroke([a, b], 46, INK); p.stroke([a, b], 30, "#d8402f"); }
};

/** a wall calendar flipping through four months, on a 500 x 620 canvas, t 0..1 */
export const fxCalendar = (p: Pen, t: number) => {
  p.poly(rrect(30, 60, 470, 560, 24), "#fbf6e8", 12);
  p.poly(rrect(30, 60, 470, 170, 24), "#d8402f", 0); p.poly(rrect(30, 60, 470, 560, 24), null, 12);
  for (const x of [140, 360]) p.ell(x, 60, 18, 28, "#c9ccd2", 8);
  const months = ["MEI", "JUNI", "JULI", "AGUS", "SEPT"], k = Math.min(4, Math.floor(t * 5));
  text(p, months[k], 250, 118, 64, "#ffffff");
  for (let r0 = 0; r0 < 4; r0++) for (let c = 0; c < 5; c++) p.poly(rrect(70 + c * 74, 200 + r0 * 70, 120 + c * 74, 250 + r0 * 70, 8), "#efe3c8", 3);
  p.poly(rrect(70, 470, 430, 540, 26), "#fff3c4", 8);
  text(p, "4 BULAN", 250, 507, 58, "#b43a2e");
};

/** "more than half survived" gauge, on a 760 x 340 canvas */
export const fxGauge = (p: Pen, t: number) => {
  p.poly(rrect(14, 14, 746, 326, 36), "#fff8e8", 12);
  p.poly(rrect(60, 70, 700, 170, 26), "#e9e3d6", 8);
  const w = 640 * 0.56 * Math.min(1, t);
  if (w > 30) p.poly(rrect(60, 70, 60 + w, 170, 26), "#9fd4ff", 8);
  p.stroke([[380, 50], [380, 190]], 8, "#b43a2e");
  text(p, "½", 380, 34, 40, "#b43a2e");
  text(p, "LEBIH DARI SEPARUH UTUH", 380, 255, 56, "#2a2420", 0, 680);
};

/** a hot sun with heat waves, on a 420 x 420 canvas, t 0..1 */
export const fxSun = (p: Pen, t: number) => {
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + t * 0.5, r0 = 120, r1 = 180 + 14 * Math.sin(t * 12 + i); p.stroke([[210 + r0 * Math.cos(a), 210 + r0 * Math.sin(a)], [210 + r1 * Math.cos(a), 210 + r1 * Math.sin(a)]], 18, "#f0a03e"); }
  p.ell(210, 210, 105, 105, "#ffd84a", 12);
  p.arc(170, 200, 16, 10, 200, 340, 6); p.arc(250, 200, 16, 10, 200, 340, 6); p.arc(210, 250, 40, 20, 20, 160, 7);
};

const grain = (p: Pen, x: number, y: number, s: number, k: number) => {
  const pts: P2[] = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + k, r = s * (0.7 + 0.5 * Math.sin(k * 3 + i * 2.1)); pts.push([x + r * Math.cos(a) * 1.5, y + r * Math.sin(a) * 0.8]); }
  p.poly(pts, k % 2 > 1 ? "#c99a62" : "#b0824a", 5);
};
/** magnifying glass over sawdust: grains + many trapped air bubbles, on a 900 x 1000 canvas, t 0..1 (bubbles pop in) */
export const fxMagnify = (p: Pen, t: number) => {
  const g = p.g;
  p.band([[620, 640], [840, 960]], "#5a3b2a", 56, 10, "round");
  p.ell(400, 400, 360, 360, "#e9d2a8", 0);
  g.save(); g.beginPath(); g.arc(400, 400, 360, 0, Math.PI * 2); g.clip();
  let k = 0;
  for (let y = 70; y < 760; y += 70) for (let x = 60; x < 760; x += 90) { k++; grain(p, x + ((y / 70) % 2) * 45 + 10 * Math.sin(k), y, 26, k * 1.7); }
  const nb = Math.round(40 * Math.min(1, t * 1.6));
  for (let i = 0; i < nb; i++) { const x = 70 + ((i * 137) % 660), y = 80 + ((i * 251) % 640), r = 14 + (i % 4) * 6; p.ell(x, y, r, r, "rgba(220,242,255,0.95)", 5); p.ell(x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.25, "#ffffff", 0); }
  g.restore();
  p.ell(400, 400, 360, 360, null, 30);
  p.ell(400, 400, 372, 372, null, 10);
  if (t > 0.5) { p.poly(rrect(170, 800, 630, 880, 30), "#fff3c4", 8); text(p, "KANTONG UDARA", 400, 842, 54, "#b43a2e", 0, 430); }
};

/** cross-section: ice in the middle, a sawdust layer full of air, red heat arrows bouncing off it, on a 900 x 760 canvas */
export const fxHeat = (p: Pen, t: number) => {
  p.poly(rrect(14, 14, 886, 746, 40), "#fff8e8", 12);
  p.poly(rrect(170, 300, 730, 700, 30), "#c99a62", 9);                    // sawdust layer
  for (let i = 0; i < 36; i++) { const x = 200 + ((i * 97) % 500), y = 320 + ((i * 53) % 360); if (x > 300 && x < 600 && y > 390 && y < 620) continue; p.ell(x, y, 12, 12, "rgba(220,242,255,0.95)", 4); }
  p.poly(rrect(300, 390, 600, 620, 18), "#cbeaf7", 9);                    // the ice
  p.stroke([[330, 420], [420, 420]], 7, "#ffffff");
  for (let i = 0; i < 4; i++) { // arrows come down, bounce back up at the layer top
    const x = 230 + i * 150, u = (t * 1.3 + i * 0.25) % 1, down = u < 0.5, y = down ? 70 + 400 * u : 270 - 400 * (u - 0.5);
    p.stroke([[x, y - 70], [x, y]], 18, "#d8402f");
    if (down) p.poly([[x - 26, y - 6], [x, y + 30], [x + 26, y - 6]], "#d8402f", 0);
    else p.poly([[x - 26, y - 64], [x, y - 100], [x + 26, y - 64]], "#d8402f", 0);
  }
  text(p, "PANAS", 450, 60, 54, "#d8402f");
};

/** a smiling ice block wearing a puffy jacket and a red scarf, on a 600 x 760 canvas, t wobble */
export const fxIceJacket = (p: Pen, t: number) => {
  const b = 6 * Math.sin(t * 6);
  p.poly(rrect(150, 120 + b, 450, 420 + b, 30), "#cbeaf7", 12);
  p.stroke([[190, 170 + b], [280, 170 + b]], 10, "#ffffff");
  p.dot(250, 270 + b, 14); p.dot(350, 270 + b, 14); p.arc(300, 320 + b, 40, 22, 20, 160, 9);
  // puffy jacket: quilted rounded body + sleeves
  p.poly(rrect(110, 380 + b, 490, 720, 70), "#3f6fb5", 12);
  for (let y = 440; y < 700; y += 70) p.stroke([[130, y + b * 0.5], [470, y + b * 0.5]], 6, "rgba(20,30,70,0.5)");
  p.stroke([[300, 400 + b], [300, 710]], 8);
  for (const s of [-1, 1]) p.poly(rrect(300 + s * 190 - 50, 420 + b, 300 + s * 190 + 50, 640, 40), "#3f6fb5", 10);
  p.band([[160, 395 + b], [440, 395 + b]], "#d8402f", 46, 6, "round");
  p.poly([[380, 400 + b], [430, 405 + b], [420, 520 + b], [370, 510 + b]], "#d8402f", 6);
};

/** a gold crown, on a 320 x 240 canvas */
export const fxCrown = (p: Pen) => {
  p.poly([[30, 210], [290, 210], [300, 60], [230, 130], [160, 30], [90, 130], [20, 60]], "#f0c93e", 12);
  for (const [x, y] of [[20, 60], [160, 30], [300, 60]] as const) p.ell(x, y, 18, 18, "#f6efdc", 6);
  p.ell(160, 165, 22, 22, "#d8402f", 6);
};

/** falling confetti, on a 600 x 600 canvas, t 0..1 */
export const fxConfetti = (p: Pen, t: number) => {
  const C = ["#d8402f", "#f0c93e", "#3f8fc8", "#3fae55", "#c25a7a"];
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % 600, y = ((i * 211) % 600 + t * 600) % 600, a = i + t * 8;
    p.poly([[x - 12 * Math.cos(a), y - 6], [x + 12 * Math.cos(a), y - 6], [x + 12 * Math.cos(a), y + 6], [x - 12 * Math.cos(a), y + 6]], C[i % 5], 3);
  }
};
