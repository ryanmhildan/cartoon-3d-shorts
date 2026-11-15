// 2D effect cards of "Pasir Hisap": speech bubble, sweat, crossed-out pull arrow, mud splats, the film explorer's
// helmet, the density scale (2x), the floating plastic ball, the packed-sand cross-section, lifting a car, a mud ring,
// and the quicksand hugging Kamu's legs. Same ink language as toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};
const MUD = "#8a6a48", MUD_L = "#b08a5e", SKIN = "#e8b48a";

/** speech bubble with a tail to the lower left, on a 720 x 380 canvas */
export const fxBubble = (p: Pen, s: string) => {
  p.poly([[150, 270], [90, 370], [250, 280]], "#ffffff", 12);
  p.poly(rrect(20, 20, 700, 300, 120), "#ffffff", 12);
  p.poly([[160, 265], [110, 345], [235, 272]], "#ffffff", 0);
  text(p, s, 360, 160, 96, "#d8402f", 0, 620);
};
export const fxBang = (p: Pen) => text(p, "!", 100, 210, 380, "#ffd84a", 26);

/** sweat drops flying off, on a 300 x 300 canvas, t 0..1 */
export const fxSweat = (p: Pen, t: number) => {
  for (let i = 0; i < 3; i++) {
    const u = (t + i / 3) % 1, a = -2.4 + i * 0.5, x = 150 + Math.cos(a) * 120 * u, y = 170 + Math.sin(a) * 120 * u + 60 * u * u;
    p.poly([[x, y - 22], [x + 12, y], [x, y + 12], [x - 12, y]], "#9fd4ff", 5);
  }
};

/** an up arrow crossed out in red, on a 300 x 420 canvas */
export const fxNoPull = (p: Pen) => {
  p.stroke([[150, 380], [150, 110]], 40, INK); p.stroke([[150, 380], [150, 110]], 24, "#ffffff");
  p.poly([[70, 140], [150, 30], [230, 140]], "#ffffff", 10);
  for (const [a, b] of [[[50, 100], [250, 360]], [[250, 100], [50, 360]]] as [P2, P2][]) { p.stroke([a, b], 44, INK); p.stroke([a, b], 28, "#d8402f"); }
};

/** mud splat crown, on a 600 x 400 canvas, t 0..1 */
export const fxSplat = (p: Pen, t: number) => {
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.1 + 0.8 * (i / 8)), d = 60 + 220 * t, x = 300 + Math.cos(a) * d * 1.2, y = 330 - Math.sin(a) * d + 300 * t * t, r = 26 * (1 - 0.6 * t) + 6;
    if (y < 390) p.ell(x, y, r, r * 0.85, i % 2 ? MUD : MUD_L, 6);
  }
};

/** the old-film explorer's pith helmet left on the sand, on a 320 x 200 canvas */
export const fxHelmet = (p: Pen) => {
  p.ell(160, 150, 140, 30, "#e2dac4", 10);
  p.poly([[60, 150], [70, 90], [110, 50], [210, 50], [250, 90], [260, 150]], "#f3efe2", 10);
  p.band([[66, 112], [254, 112]], "#c43c32", 18, 0);
  p.ell(160, 46, 12, 9, "#d8a943", 5);
};

/** balance scale: a bucket of quicksand (heavy, low) vs a person (light, high), "2x", on an 820 x 720 canvas */
export const fxScale = (p: Pen, t: number) => {
  const tilt = 0.22 * Math.min(1, t * 2), c = 410, top = 170;
  p.poly([[c - 60, 690], [c + 60, 690], [c + 20, 230], [c - 20, 230]], "#8a5a36", 10);
  p.ell(c, top + 40, 24, 24, "#d8a943", 8);
  const lx = c - 290 * Math.cos(tilt), ly = top + 40 + 290 * Math.sin(tilt), rx = c + 290 * Math.cos(tilt), ry = top + 40 - 290 * Math.sin(tilt);
  p.stroke([[lx, ly], [rx, ry]], 18, INK); p.stroke([[lx, ly], [rx, ry]], 10, "#d8a943");
  const pan = (x: number, y: number) => { p.stroke([[x, y], [x - 90, y + 150]], 4); p.stroke([[x, y], [x + 90, y + 150]], 4); p.poly([[x - 120, y + 150], [x + 120, y + 150], [x + 90, y + 180], [x - 90, y + 180]], "#d8a943", 8); };
  pan(lx, ly); pan(rx, ry);
  // left: bucket of quicksand
  p.poly([[lx - 70, ly + 60], [lx + 70, ly + 60], [lx + 55, ly + 150], [lx - 55, ly + 150]], "#9aa0a8", 8);
  p.ell(lx, ly + 60, 70, 18, MUD, 7);
  // right: a little person
  p.ell(rx, ry + 60, 26, 28, SKIN, 7); p.poly(rrect(rx - 24, ry + 88, rx + 24, ry + 150, 14), "#f08a2c", 7);
  p.ell(rx, ry + 36, 30, 10, "#f0c93e", 6);
  text(p, "PASIR HISAP", lx, ly + 230, 44, "#2a2420", 0, 260);
  text(p, "KAMU", rx, ry + 230, 44, "#2a2420");
  if (t > 0.4) { p.poly(rrect(c - 90, 20, c + 90, 120, 30), "#fff3c4", 8); text(p, "2×", c, 72, 76, "#b43a2e"); }
};

/** a plastic ball floating half-submerged in a pool, bobbing, on a 620 x 520 canvas, t 0..1 */
export const fxBall = (p: Pen, t: number) => {
  const g = p.g, wy = 300 + 8 * Math.sin(t * Math.PI * 2);
  p.poly(rrect(20, 160, 600, 500, 30), "#e9e3d6", 12);
  p.ell(310, wy, 120, 120, "#d8402f", 10);
  g.save(); g.beginPath(); g.ellipse(310, wy, 120, 120, 0, 0, Math.PI * 2); g.clip();
  p.band([[180, wy - 20], [440, wy - 70]], "#f6efdc", 40, 0); p.band([[180, wy + 50], [440, wy + 10]], "#f0c93e", 40, 0);
  g.restore();
  p.ell(310, wy, 120, 120, null, 10);
  g.globalAlpha = 0.82; p.poly([[34, 300], [586, 300], [586, 486], [34, 486]], "#6fb4d2", 0); g.globalAlpha = 1;
  p.stroke([[40, 300], [586, 300]], 8, "#ffffff");
  p.poly(rrect(20, 160, 600, 500, 30), null, 12);
};

/** cross-section of legs held in packed sand + a cement sack, on an 820 x 820 canvas */
export const fxCement = (p: Pen, t: number) => {
  p.poly(rrect(14, 14, 806, 806, 40), "#c9ab7a", 12);
  p.poly([[14, 140], [806, 140]], null, 8);
  for (let y = 170; y < 800; y += 34) for (let x = 30 + ((y / 34) % 2) * 17; x < 800; x += 34) p.ell(x, y, 15, 13, "#a68456", 3);
  for (const x of [330, 470]) { p.poly(rrect(x - 50, 60, x + 50, 600, 40), "#3f6fb5", 10); p.ell(x, 600, 60, 30, "#5a3b2a", 8); }
  const k = Math.min(1, t * 2);
  for (const s of [-1, 1]) { const x = 400 + s * 260; p.stroke([[x, 300], [x - s * 70 * k, 300]], 22, "#d8402f"); p.poly([[x - s * 70 * k - s * 10, 270], [x - s * 70 * k - s * 50, 300], [x - s * 70 * k - s * 10, 330]], "#d8402f", 0); }
  p.poly([[560, 640], [760, 640], [780, 790], [540, 790]], "#d6d0c2", 8);
  text(p, "SEMEN", 660, 720, 44, "#5a5a5a");
};

/** a tiny strongman lifting a car over his head, on an 820 x 760 canvas, t wobble */
export const fxCar = (p: Pen, t: number) => {
  const w = 5 * Math.sin(t * 30);
  p.poly(rrect(14, 14, 806, 746, 40), "#fff8e8", 12);
  // car
  p.poly(rrect(170 + w, 140, 650 + w, 270, 30), "#3f8fc8", 10);
  p.poly([[270 + w, 140], [330 + w, 70], [500 + w, 70], [560 + w, 140]], "#9fd4ff", 10);
  for (const x of [270, 550]) p.ell(x + w, 275, 50, 50, "#2a2420", 8);
  // strongman
  p.ell(410, 400, 50, 54, SKIN, 9); p.poly(rrect(355, 450, 465, 590, 40), "#f08a2c", 9);
  for (const s of [-1, 1]) p.stroke([[410 + s * 50, 470], [410 + s * 120, 380], [410 + s * 130, 300]], 16);
  for (const s of [-1, 1]) p.stroke([[410 + s * 30, 590], [410 + s * 50, 660]], 16);
  p.ell(410, 360, 56, 18, "#f0c93e", 7);
  p.stroke([[385, 395], [400, 405]], 6); p.stroke([[435, 395], [420, 405]], 6); p.arc(410, 430, 22, 10, 200, 340, 6);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) p.stroke([[410 + s * (150 + k * 22), 420 + k * 18], [410 + s * (175 + k * 22), 410 + k * 18]], 6);
  p.poly(rrect(170, 680, 650, 740, 26), "#fff3c4", 8);
  text(p, "= ANGKAT MOBIL", 410, 711, 50, "#b43a2e", 0, 460);
};

/** dark wet mud ring around someone stuck (flat, soft), on a 300 x 300 canvas */
export const fxMudRing = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(150, 150, 30, 150, 150, 150);
  gr.addColorStop(0, "rgba(70,50,30,0.9)"); gr.addColorStop(0.55, "rgba(90,65,40,0.6)"); gr.addColorStop(1, "rgba(120,90,55,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 300, 300);
};

/** the quicksand as a cute mud blob hugging Kamu's legs, hearts, on an 860 x 460 canvas, t 0..1 */
export const fxHug = (p: Pen, t: number) => {
  const sq = 1 + 0.04 * Math.sin(t * Math.PI * 4);
  p.poly([[60, 440], [120, 250], [300, 200 / sq], [560, 200 / sq], [740, 250], [800, 440]], MUD, 12);
  p.dot(330, 300, 14); p.dot(530, 300, 14);
  p.arc(430, 340, 50, 26, 20, 160, 9);
  p.ell(290, 340, 26, 14, "#c97a6a", 0); p.ell(570, 340, 26, 14, "#c97a6a", 0);
  for (const s of [-1, 1]) p.stroke([[430 + s * 280, 330], [430 + s * 200, 200], [430 + s * 70, 170]], 40, MUD);
  for (const s of [-1, 1]) p.stroke([[430 + s * 280, 330], [430 + s * 200, 200], [430 + s * 70, 170]], 12, MUD_L);
  const hy = 120 - 70 * ((t * 1.5) % 1);
  for (const [x, k] of [[240, 0], [640, 0.5]] as const) {
    const y = hy + 40 * k, s = 26;
    p.poly([[x, y + s], [x - s * 1.2, y - s * 0.2], [x - s * 0.6, y - s], [x, y - s * 0.4], [x + s * 0.6, y - s], [x + s * 1.2, y - s * 0.2]], "#e2453c", 6);
  }
};
