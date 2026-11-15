// 2D effect cards of "Kaleng yang Lahir Tanpa Pembuka Kaleng": notices, the prize poster, stink lines, the years
// calendar, steam + fire, HMM?, confetti, the microbes under a magnifier, boil-and-seal panels, the mosquito room,
// Pasteur's microscope, bottle -> can, the 1810..1858 timeline, the can label and hammer sparks. Ink of toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};
const PAPER = "#f4ecd6";

/** wooden notice, two lines, on a 640 x 420 canvas */
export const fxNotice = (p: Pen, l1: string, l2: string) => {
  p.poly(rrect(20, 20, 620, 400, 26), "#c98f55", 12);
  p.poly(rrect(44, 42, 596, 378, 16), "#f3e3bd", 6);
  text(p, l1, 320, 150, 92, "#b43a2e", 0, 520);
  text(p, l2, 320, 280, 70, "#3a2a20", 0, 520);
};

/** prize poster: "HADIAH 12.000 FRANC" + a coin bag, on a 600 x 800 canvas */
export const fxPrize = (p: Pen) => {
  p.poly([[20, 30], [580, 16], [590, 780], [14, 790]], PAPER, 12);
  text(p, "HADIAH", 300, 110, 96, "#b43a2e", 0, 520);
  text(p, "12.000", 300, 230, 120, "#2a2420", 0, 520);
  text(p, "FRANC", 300, 340, 80, "#2a2420", 0, 520);
  p.poly([[230, 470], [370, 470], [450, 600], [420, 720], [180, 720], [150, 600]], "#c9a25a", 10);
  p.ell(300, 610, 40, 40, "#f0c93e", 7);
  text(p, "untuk bekal awet", 300, 755, 36, "#3a2a20", 0, 520);
};

/** green stink lines rising, on a 300 x 400 canvas, t 0..1 */
export const fxStink = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const pts: P2[] = [];
    for (let i = 0; i <= 12; i++) { const y = 380 - i * 30, x = 80 + k * 70 + 18 * Math.sin(i * 0.9 + t * 12 + k); pts.push([x, y]); }
    p.stroke(pts, 14, INK); p.stroke(pts, 8, "#8fc05a");
  }
};

/** a calendar flipping fast, "BERTAHUN-TAHUN", on a 500 x 620 canvas, t 0..1 */
export const fxYears = (p: Pen, t: number) => {
  p.poly(rrect(30, 60, 470, 560, 24), "#fbf6e8", 12);
  p.poly(rrect(30, 60, 470, 170, 24), "#3f6fb5", 0); p.poly(rrect(30, 60, 470, 560, 24), null, 12);
  for (const x of [140, 360]) p.ell(x, 60, 18, 28, "#c9ccd2", 8);
  text(p, String(1795 + Math.min(14, Math.floor(t * 15))), 250, 118, 70, "#ffffff");
  for (let r0 = 0; r0 < 4; r0++) for (let c = 0; c < 5; c++) p.poly(rrect(70 + c * 74, 200 + r0 * 70, 120 + c * 74, 250 + r0 * 70, 8), "#efe3c8", 3);
  p.poly(rrect(50, 470, 450, 540, 26), "#fff3c4", 8);
  text(p, "BERTAHUN-TAHUN", 250, 507, 48, "#b43a2e", 0, 380);
};

/** steam puffs rising (soft), on a 400 x 500 canvas, t 0..1 */
export const fxSteam = (p: Pen, t: number) => {
  for (let i = 0; i < 6; i++) {
    const u = (t + i / 6) % 1, x = 200 + 60 * Math.sin(i * 2.1 + u * 4), y = 460 - 400 * u, r = 30 + 50 * u;
    p.ell(x, y, r, r * 0.8, `rgba(255,255,255,${(0.75 * (1 - u)).toFixed(3)})`, 0);
  }
};
/** small cartoon fire, on a 300 x 400 canvas */
export const fxFire = (p: Pen, t: number) => {
  const w = 6 * Math.sin(t * 20);
  p.poly([[40, 380], [80, 180], [130 + w, 260], [150 + w, 80], [180, 240], [230 - w, 150], [260, 380]], "#f0a03e", 9);
  p.poly([[95, 380], [130, 270], [150 + w, 210], [180, 290], [205, 380]], "#ffd84a", 0);
};

export const fxHmm = (p: Pen, t: number) => text(p, "HMM?", 220, 100 + 5 * Math.sin(t * 10), 110, "#ffd84a", 18);

/** falling confetti, on a 600 x 600 canvas, t 0..1 */
export const fxConfetti = (p: Pen, t: number) => {
  const C = ["#d8402f", "#f0c93e", "#3f8fc8", "#3fae55", "#c25a7a"];
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % 600, y = ((i * 211) % 600 + t * 600) % 600, a = i + t * 8;
    p.poly([[x - 12 * Math.cos(a), y - 6], [x + 12 * Math.cos(a), y - 6], [x + 12 * Math.cos(a), y + 6], [x - 12 * Math.cos(a), y + 6]], C[i % 5], 3);
  }
};

const microbe = (p: Pen, x: number, y: number, r: number, col: string, mood: "happy" | "x" = "happy") => {
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; p.stroke([[x + r * Math.cos(a), y + r * Math.sin(a)], [x + (r + 16) * Math.cos(a), y + (r + 16) * Math.sin(a)]], 6); }
  p.ell(x, y, r, r * 0.85, col, 7);
  if (mood === "happy") { p.dot(x - r * 0.3, y - r * 0.1, 5); p.dot(x + r * 0.3, y - r * 0.1, 5); p.arc(x, y + r * 0.25, r * 0.3, r * 0.18, 20, 160, 4); }
  else for (const s of [-1, 1]) { const cx = x + s * r * 0.32, cy = y - r * 0.1; p.stroke([[cx - 6, cy - 6], [cx + 6, cy + 6]], 4); p.stroke([[cx + 6, cy - 6], [cx - 6, cy + 6]], 4); }
};
/** magnifier over a bowl of food with cute microbes, on a 900 x 1000 canvas, t 0..1 */
export const fxMicrobes = (p: Pen, t: number) => {
  const g = p.g;
  p.band([[620, 640], [840, 960]], "#5a3b2a", 56, 10, "round");
  p.ell(400, 400, 360, 360, "#f3dfb5", 0);
  g.save(); g.beginPath(); g.arc(400, 400, 360, 0, Math.PI * 2); g.clip();
  for (let i = 0; i < 9; i++) p.ell(120 + (i * 97) % 560, 160 + (i * 173) % 480, 60, 40, "#e8b878", 0);
  const n = Math.round(9 * Math.min(1, t * 1.6)), C = ["#8fc05a", "#c25a7a", "#5ab0c8"];
  for (let i = 0; i < n; i++) { const x = 160 + ((i * 211) % 480), y = 160 + ((i * 137) % 460) + 10 * Math.sin(t * 20 + i); microbe(p, x, y, 34, C[i % 3]); }
  g.restore();
  p.ell(400, 400, 360, 360, null, 30);
  if (t > 0.5) { p.poly(rrect(160, 800, 640, 880, 30), "#fff3c4", 8); text(p, "BIANG BUSUK", 400, 842, 56, "#b43a2e", 0, 440); }
};

/** two panels: microbes knocked out in the boiling pot; a cork stops new ones, on an 860 x 900 canvas */
export const fxBoilSeal = (p: Pen, t: number) => {
  p.poly(rrect(10, 10, 850, 440, 30), "#fff8e8", 10);
  p.poly(rrect(10, 460, 850, 890, 30), "#fff8e8", 10);
  // panel 1: pot with bubbles, dazed microbes
  p.poly([[220, 200], [640, 200], [600, 400], [260, 400]], "#4a4a54", 9);
  p.ell(430, 200, 210, 30, "#9fcfe0", 8);
  for (let i = 0; i < 5; i++) { const u = (t * 2 + i * 0.2) % 1; p.ell(280 + i * 70, 190 - 80 * u, 10 + 6 * u, 10 + 6 * u, null, 4); }
  microbe(p, 330, 140, 28, "#8fc05a", t > 0.15 ? "x" : "happy"); microbe(p, 520, 120, 28, "#c25a7a", t > 0.15 ? "x" : "happy");
  text(p, "DIREBUS", 430, 60, 48, "#b43a2e");
  // panel 2: bottle with cork, a microbe bouncing off
  if (t > 0.35) {
    p.poly([[380, 860], [480, 860], [480, 640], [455, 610], [455, 560], [405, 560], [405, 610], [380, 640]], "#d6ecdf", 9);
    p.poly(rrect(395, 520, 465, 570, 8), "#b8864e", 7);
    const u = Math.min(1, (t - 0.35) / 0.4), bx = 640 - 160 * Math.sin(u * Math.PI);
    microbe(p, bx, 520, 30, "#5ab0c8");
    text(p, "DISUMBAT", 430, 500, 48, "#3fae55");
  }
};

/** a room: mosquitoes shooed out of the window, then the door shut and locked, on an 860 x 820 canvas, t 0..1 */
export const fxMosquito = (p: Pen, t: number) => {
  p.poly(rrect(10, 10, 850, 810, 30), "#f3e3bd", 10);
  p.poly(rrect(560, 180, 800, 420, 10), "#bfe0f0", 9);                       // window
  const shut = t > 0.6;
  p.poly(rrect(70, 250, 300, 780, 10), shut ? "#8a5a36" : "#5a3b2a", 9);   // door
  if (shut) { p.ell(260, 520, 14, 14, "#f0c93e", 5); p.poly(rrect(235, 560, 285, 610, 8), "#f0c93e", 6); p.arc(260, 560, 18, 22, 180, 360, 6); }
  for (let i = 0; i < 5; i++) {
    const u = Math.min(1, t * 1.5), x = 380 + i * 60 + (700 - (380 + i * 60)) * u + 20 * Math.sin(t * 30 + i), y = 520 - i * 50 + (300 - (520 - i * 50)) * u;
    if (x > 850) continue;
    p.ell(x, y, 12, 9, INK, 0); p.ell(x - 8, y - 10, 10, 6, "rgba(255,255,255,0.8)", 2); p.ell(x + 8, y - 10, 10, 6, "rgba(255,255,255,0.8)", 2);
  }
  p.stroke([[420, 650], [520, 600]], 12, "#b43a2e");
  if (shut) { p.poly(rrect(330, 690, 820, 780, 30), "#fff3c4", 8); text(p, "KUNCI PINTUNYA!", 575, 735, 52, "#b43a2e", 0, 460); }
};

/** Pasteur's microscope with a label, on a 700 x 760 canvas */
export const fxScope = (p: Pen) => {
  p.poly(rrect(14, 14, 686, 746, 40), "#fff8e8", 12);
  p.poly(rrect(200, 600, 500, 650, 12), "#3a3a44", 8);
  p.stroke([[350, 600], [380, 420], [320, 260]], 30, "#5a5a66");
  p.poly(rrect(270, 140, 360, 300, 18), "#3a3a44", 8);
  p.poly(rrect(240, 450, 460, 480, 6), "#5a5a66", 6);
  microbe(p, 520, 300, 34, "#8fc05a");
  text(p, "LOUIS PASTEUR", 350, 690, 52, "#2a2420", 0, 560);
  text(p, "± 1860", 540, 120, 48, "#b43a2e");
};

/** glass bottle -> tin can, on an 800 x 560 canvas, t 0..1 */
export const fxBottleCan = (p: Pen, t: number) => {
  p.poly(rrect(14, 14, 786, 546, 40), "#fff8e8", 12);
  p.poly([[110, 470], [250, 470], [250, 240], [215, 200], [215, 130], [145, 130], [145, 200], [110, 240]], "#d6ecdf", 9);
  p.poly(rrect(130, 90, 230, 140, 8), "#b8864e", 7);
  p.stroke([[300, 300], [470, 300]], 18, "#3a2a20"); p.poly([[460, 270], [500, 300], [460, 330]], "#3a2a20", 0);
  if (t > 0.3) { p.poly(rrect(540, 170, 720, 470, 14), "#c9ccd2", 10); p.ell(630, 170, 90, 22, "#e2e4e8", 8); p.band([[540, 320], [720, 320]], "#d8402f", 60, 0); p.poly(rrect(540, 170, 720, 470, 14), null, 10); }
};

/** timeline 1810 ........ 1858 with a can-opener icon, on a 900 x 520 canvas, t 0..1 */
export const fxTimeline = (p: Pen, t: number) => {
  p.poly(rrect(14, 14, 886, 506, 40), "#fff8e8", 12);
  const x1 = 140 + 620 * Math.min(1, t * 1.4);
  p.g.setLineDash([24, 18]); p.stroke([[140, 260], [x1, 260]], 10, "#3a2a20"); p.g.setLineDash([]);
  p.ell(140, 260, 22, 22, "#c9ccd2", 8); text(p, "1810", 140, 340, 60, "#2a2420"); text(p, "kaleng", 140, 190, 40, "#3a2a20");
  if (t > 0.7) {
    p.ell(760, 260, 22, 22, "#f0c93e", 8); text(p, "1858", 760, 340, 60, "#b43a2e"); text(p, "pembuka", 760, 190, 40, "#3a2a20");
    p.stroke([[700, 430], [800, 400]], 14, "#8a5a36"); p.poly([[790, 380], [840, 410], [800, 430]], "#9aa0a8", 6);
  }
  if (t > 0.5) text(p, "± 48 TAHUN", 450, 440, 56, "#b43a2e");
};

/** a tin can with the instruction label, on a 520 x 620 canvas */
export const fxCanLabel = (p: Pen) => {
  p.poly(rrect(80, 80, 440, 580, 22), "#c9ccd2", 12);
  p.ell(260, 80, 180, 40, "#e2e4e8", 10);
  p.poly(rrect(80, 200, 440, 470, 0), "#f3e3bd", 0); p.poly(rrect(80, 80, 440, 580, 22), null, 12);
  text(p, "BUKA:", 260, 260, 64, "#b43a2e");
  text(p, "PAHAT", 260, 340, 70, "#2a2420");
  text(p, "& PALU", 260, 420, 70, "#2a2420");
};

/** hammer-on-metal sparks, on a 400 x 400 canvas, t 0..1 */
export const fxSparks = (p: Pen, t: number) => {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, d = 40 + 150 * t;
    p.stroke([[200 + Math.cos(a) * d * 0.6, 200 + Math.sin(a) * d * 0.6], [200 + Math.cos(a) * d, 200 + Math.sin(a) * d]], 8 * (1 - t) + 2, "#ffd84a");
  }
};
