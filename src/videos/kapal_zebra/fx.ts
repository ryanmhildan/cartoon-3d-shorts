// 2D effect cards of "Orang Indonesia yang Hidup di Dasar Laut": swimming fish, bubbles, light shafts, the crossed-out
// air tank, the 5-hour clock, the tourists' speech bubble, the 30-second stopwatch, the ultrasound cart, the lungs /
// belly icons, the spleen comparison, the spleen "spare tank", the squeeze, the power bank and the stamp.
// Same ink language as toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
export const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};
const SPLEEN = "#9b3a5a", SPLEEN_HI = "#c25a7a", RED = "#e2453c";
/** a bean-shaped spleen outline centred at (cx, cy), half-size (a, b), squeezed by sq 0..1 */
const spleenPts = (cx: number, cy: number, a: number, b: number, sq = 0): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2, dent = 0.28 * Math.max(0, Math.sin(t)) ** 3;
    const k = 1 - sq * 0.32;
    pts.push([cx + a * k * Math.cos(t) * (1 - 0.1 * Math.sin(t)), cy + b * (1 - sq * 0.12) * Math.sin(t) * (1 - dent) - b * 0.4 * dent]);
  }
  return pts;
};

/** a side-view fish swimming, on a 300 x 200 canvas; k -1..1 bends the tail */
export const fxFish = (p: Pen, k: number, col = "#f2a33a", stripe = "#ffffff") => {
  const g = p.g;
  g.save(); g.translate(150, 100);
  const pts: P2[] = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, x = -80 + 150 * t, w = 40 * Math.sin(Math.PI * Math.min(1, t * 1.1)); pts.push([x, -w]); }
  for (let i = 16; i >= 0; i--) { const t = i / 16, x = -80 + 150 * t, w = 40 * Math.sin(Math.PI * Math.min(1, t * 1.1)); pts.push([x, w]); }
  p.poly([[-70, 0], [-120, -38 + 14 * k], [-112, 0], [-120, 38 + 14 * k]], col, 8);
  p.poly(pts, col, 8);
  p.clip(pts, () => { p.band([[-10, -60], [-18, 60]], stripe, 16, 0); p.band([[30, -60], [24, 60]], stripe, 12, 0); });
  p.poly(pts, null, 8);
  p.dot(46, -8, 7);
  g.restore();
};

/** one air bubble (ring + glint), on a 64 x 64 canvas */
export const fxBubble = (p: Pen) => {
  p.ell(32, 32, 24, 24, "rgba(220,250,255,0.35)", 0);
  p.arc(32, 32, 24, 24, 0, 360, 5, "rgba(255,255,255,0.95)");
  p.arc(32, 32, 14, 14, 200, 260, 4, "rgba(255,255,255,0.95)");
};

/** a soft shaft of sunlight through the water, on a 128 x 512 canvas (soft card) */
export const fxRay = (p: Pen) => {
  const g = p.g, gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "rgba(255,255,240,0.38)"); gr.addColorStop(1, "rgba(255,255,240,0)");
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(40, 0); g.lineTo(88, 0); g.lineTo(128, 512); g.lineTo(0, 512); g.closePath(); g.fill();
};

/** a yellow scuba tank, crossed out in red, on a 400 x 520 canvas */
export const fxTankX = (p: Pen) => {
  p.poly(rrect(130, 110, 270, 470, 60), "#f2c84a", 12);
  p.poly(rrect(170, 60, 230, 118, 10), "#8d949c", 9);
  p.poly(rrect(150, 34, 250, 66, 12), "#5a6470", 8);
  p.band([[140, 210], [260, 210]], "#3f6fb5", 26, 4);
  text(p, "O2", 200, 330, 70, "#7a5a1a");
  p.ell(200, 270, 175, 175, null, 0);
  p.arc(200, 270, 170, 170, 0, 360, 34, INK); p.arc(200, 270, 170, 170, 0, 360, 22, RED);
  p.stroke([[80, 150], [320, 390]], 34, INK); p.stroke([[80, 150], [320, 390]], 22, RED);
};

/** a wall clock whose hand spins (t = turns) with the label "5 JAM", on a 420 x 520 canvas */
export const fxClock = (p: Pen, t: number) => {
  p.ell(210, 210, 180, 180, "#fff8e8", 14);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.stroke([[210 + 145 * Math.sin(a), 210 - 145 * Math.cos(a)], [210 + 162 * Math.sin(a), 210 - 162 * Math.cos(a)]], 9); }
  const a = t * Math.PI * 2, b = (t / 12) * Math.PI * 2 + 0.9;
  p.stroke([[210, 210], [210 + 90 * Math.sin(b), 210 - 90 * Math.cos(b)]], 16);
  p.stroke([[210, 210], [210 + 130 * Math.sin(a), 210 - 130 * Math.cos(a)]], 10, "#b43a2e");
  p.dot(210, 210, 14);
  p.poly(rrect(70, 410, 350, 500, 30), "#fff3c4", 10);
  text(p, "5 JAM", 210, 457, 70, "#b43a2e");
};

/** speech bubble (two lines) with its tail at the bottom-left, on a 760 x 380 canvas */
export const fxSpeech = (p: Pen, l1: string, l2: string) => {
  p.poly([[150, 270], [90, 370], [250, 280]], "#ffffff", 12);
  p.ell(380, 170, 350, 150, "#ffffff", 12);
  p.poly([[160, 262], [100, 356], [240, 272]], "#ffffff", 0);
  text(p, l1, 380, 125, 66, INK, 0, 620);
  text(p, l2, 380, 210, 74, "#b43a2e", 0, 620);
};

/** a stopwatch showing "0:30", hand at t (turns), on a 380 x 460 canvas */
export const fxStopwatch = (p: Pen, t: number, label = "0:30") => {
  p.poly(rrect(160, 20, 220, 70, 10), "#8d949c", 9);
  p.ell(190, 250, 165, 165, "#e2453c", 14);
  p.ell(190, 250, 130, 130, "#fff8e8", 10);
  const a = t * Math.PI * 2;
  p.stroke([[190, 250], [190 + 105 * Math.sin(a), 250 - 105 * Math.cos(a)]], 10, INK);
  p.dot(190, 250, 12);
  p.poly(rrect(95, 285, 285, 355, 16), "#1f2a44", 6);
  text(p, label, 190, 322, 58, "#9ff0a0", 0, 170);
};

/** the ultrasound cart: wheels, a body with knobs and a monitor; on 0..1 lights the screen; on a 520 x 820 canvas */
export const fxUSG = (p: Pen, on: number, big = false) => {
  for (const x of [130, 390]) p.ell(x, 790, 26, 26, "#3a3d44", 8);
  p.poly(rrect(90, 470, 430, 770, 26), "#e8ecef", 12);
  p.poly(rrect(120, 500, 400, 560, 12), "#c9d1d8", 6);
  for (let i = 0; i < 4; i++) p.ell(160 + i * 66, 620, 16, 16, ["#3f8fc8", "#f2c84a", "#7ab35a", "#e2453c"][i], 6);
  p.band([[260, 470], [260, 420]], "#8d949c", 30, 6);
  p.poly(rrect(40, 60, 480, 430, 30), "#5a6470", 12);
  p.poly(rrect(70, 90, 450, 400, 16), on > 0 ? "#123a4a" : "#1f2430", 6);
  if (on > 0) {
    const g = p.g; g.save(); g.globalAlpha = Math.min(1, on);
    p.ell(260, 250, 190 * 0.9, 130 * 0.9, "rgba(140,220,240,0.18)", 0);
    for (let i = 0; i < 6; i++) p.arc(260, 400, 60 + i * 50, 60 + i * 50, 235, 305, 3, "rgba(160,235,250,0.35)");
    const sp = spleenPts(260, 245, big ? 115 : 70, big ? 62 : 40);
    p.poly(sp, "rgba(120,220,240,0.55)", 0); p.poly(sp, null, 0);
    p.stroke([...sp, sp[0]], 5, "#c9f6ff");
    g.restore();
  }
};

/** pink lungs, crossed out, on a 400 x 400 canvas */
export const fxLungsX = (p: Pen) => {
  p.ell(200, 200, 180, 180, "#fff8e8", 12);
  p.band([[200, 70], [200, 160]], "#e8a0ae", 22, 6);
  for (const s of [-1, 1]) p.poly([[200 + s * 18, 150], [200 + s * 95, 130], [200 + s * 120, 250], [200 + s * 90, 310], [200 + s * 26, 290]], "#f0a8b5", 9);
  p.stroke([[85, 85], [315, 315]], 30, INK); p.stroke([[85, 85], [315, 315]], 18, RED);
  p.stroke([[315, 85], [85, 315]], 30, INK); p.stroke([[315, 85], [85, 315]], 18, RED);
};

/** a fat red arrow pointing down-left (toward the belly), on a 300 x 300 canvas */
export const fxArrow = (p: Pen) => {
  p.poly([[260, 40], [290, 70], [140, 220], [180, 260], [40, 270], [50, 130], [90, 170], [240, 20]], "#e2453c", 12);
};

/** two panels: an ordinary spleen and the bigger Bajau spleen; t 0..1 grows the badge; on a 960 x 640 canvas */
export const fxSpleens = (p: Pen, t: number) => {
  for (const [x0, lab, a, b] of [[20, "BIASA", 80, 46], [490, "BAJAU", 122, 70]] as const) {
    p.poly(rrect(x0, 20, x0 + 450, 520, 36), "#fff8e8", 12);
    const sp = spleenPts(x0 + 225, 270, a, b);
    p.poly(sp, SPLEEN, 10);
    p.clip(sp, () => p.ell(x0 + 225 - a * 0.35, 270 - b * 0.4, a * 0.45, b * 0.3, SPLEEN_HI, 0));
    p.poly(sp, null, 10);
    p.poly(rrect(x0 + 60, 430, x0 + 390, 500, 26), lab === "BAJAU" ? "#ffd84a" : "#e8e0d0", 8);
    text(p, lab, x0 + 225, 466, 54, "#1f2a44");
  }
  if (t > 0) {
    const s = t < 1 ? 0.6 + 0.5 * t : 1;
    p.ell(840, 90, 105 * s, 70 * s, "#e2453c", 12);
    text(p, "+50%", 840, 92, 66 * s, "#ffffff");
  }
};

/** the spleen as a glass spare tank full of red blood cells "O2"; t 0..1 makes the cells bounce, on a 860 x 640 canvas */
export const fxTank = (p: Pen, t: number) => {
  p.poly(rrect(20, 20, 840, 620, 40), "#fff8e8", 12);
  text(p, "TABUNG CADANGAN", 430, 80, 58, "#1f2a44", 0, 760);
  const sp = spleenPts(430, 340, 300, 190);
  p.poly(sp, "rgba(155,58,90,0.18)", 12);
  p.clip(sp, () => {
    let i = 0;
    for (let y = 190; y < 520; y += 62) for (let x = 140; x < 730; x += 72) {
      const j = Math.sin(i * 2.1 + t * 12) * 6 * Math.min(1, t * 3);
      p.ell(x + ((y / 62) % 2) * 36, y + j, 30, 22, RED, 6);
      p.ell(x + ((y / 62) % 2) * 36, y + j, 11, 8, "#b02a2a", 0);
      i++;
    }
  });
  p.poly(sp, null, 12);
  p.ell(300, 220, 60, 22, "rgba(255,255,255,0.6)", 0);
  p.poly(rrect(320, 540, 540, 600, 24), "#ffd84a", 8);
  text(p, "O2", 430, 571, 50, "#b43a2e");
};

/** the spleen squeezing and pumping cells out along the blood stream (t 0..1), on a 720 x 420 canvas */
export const fxSqueeze = (p: Pen, sq: number, flow: number) => {
  // the stream: a curved red tube to the right
  p.band([[300, 210], [470, 170], [700, 190]], "#f3c0c0", 54, 8);
  for (let i = 0; i < 7; i++) {
    const u = ((flow * 1.6 + i / 7) % 1), x = 300 + 400 * u, y = 210 - 40 * Math.sin(u * Math.PI);
    if (flow > 0) p.ell(x, y, 22, 16, RED, 6);
  }
  const sp = spleenPts(200, 210, 150, 100, sq);
  p.poly(sp, SPLEEN, 10);
  p.clip(sp, () => p.ell(160, 170, 60, 30, SPLEEN_HI, 0));
  p.poly(sp, null, 10);
  if (sq > 0.2) for (const s of [-1, 1]) p.stroke([[200 + s * 190, 210 - 70], [200 + s * 150, 210 - 30]], 12, "#1f2a44");
};

/** a phone battery (level 0..1) and, when on, a power bank plugged in with a bolt, on an 800 x 420 canvas */
export const fxBattery = (p: Pen, level: number, on: boolean) => {
  p.poly(rrect(20, 90, 440, 330, 34), "#fff8e8", 14);
  p.poly(rrect(440, 160, 480, 260, 10), "#fff8e8", 10);
  const w = Math.max(0, 380 * level), col = level < 0.25 ? RED : level < 0.6 ? "#f2c84a" : "#5ac46a";
  if (w > 4) p.poly(rrect(50, 120, 50 + w, 300, 18), col, 0);
  p.poly(rrect(20, 90, 440, 330, 34), null, 14);
  if (on) {
    p.band([[480, 210], [560, 210], [600, 260]], "#3a3d44", 14, 4);
    p.poly(rrect(590, 150, 780, 400, 30), "#3f6fb5", 12);
    p.poly([[700, 190], [650, 280], [690, 280], [670, 360], [735, 255], [695, 255], [720, 190]], "#ffd84a", 8);
  }
};

/** a two-line painted board (title + place), on a 640 x 340 canvas */
export const fxSign2 = (p: Pen, l1: string, l2: string) => {
  p.poly(rrect(20, 20, 620, 320, 26), "#c98f55", 12);
  p.poly(rrect(44, 42, 596, 298, 16), "#f3e3bd", 6);
  text(p, l1, 320, 125, 88, "#b43a2e", 0, 520);
  text(p, l2, 320, 230, 62, "#1f2a44", 0, 500);
};

/** a tilted stamp with a word, on a 820 x 320 canvas */
export const fxStamp = (p: Pen, word: string) => {
  const g = p.g;
  g.save(); g.translate(410, 160); g.rotate(-0.08);
  p.poly(rrect(-380, -120, 380, 120, 40), "#ffd84a", 14);
  p.poly(rrect(-350, -92, 350, 92, 28), null, 6);
  text(p, word, 0, 6, 110, "#b43a2e", 0, 660);
  g.restore();
};

// ---------------- Vasa cards ----------------
const GOLD = "#f2c24a";
/** a gold royal crown on a 420 x 320 canvas */
export const fxCrown = (p: Pen) => {
  p.poly([[60, 270], [60, 110], [130, 190], [210, 60], [290, 190], [360, 110], [360, 270]], GOLD, 12);
  p.poly(rrect(50, 250, 370, 300, 14), "#e0a83a", 10);
  for (const [x, y, c] of [[110, 275, "#e2453c"], [210, 275, "#3f6fb5"], [310, 275, "#3f8f55"]] as const) p.ell(x, y, 16, 14, c, 6);
  for (const [x, y] of [[60, 110], [210, 60], [360, 110]] as const) p.ell(x, y, 18, 18, "#fff3c4", 7);
};
/** three swooshing wind lines on a 700 x 240 canvas; k 0..1 animates the curl */
export const fxWind = (p: Pen, k: number) => {
  for (let i = 0; i < 3; i++) {
    const y = 50 + i * 70, pts: P2[] = [];
    for (let j = 0; j <= 24; j++) { const x = 30 + j * 24; pts.push([x, y + 14 * Math.sin(j * 0.45 + k * 6.3 + i)]); }
    const end = pts[pts.length - 1];
    for (let j = 0; j <= 12; j++) { const a = (j / 12) * Math.PI * 1.6 - Math.PI / 2; pts.push([end[0] + 26 * Math.cos(a), end[1] + 26 + 26 * Math.sin(a)]); }
    p.stroke(pts, 18, INK); p.stroke(pts, 9, "#ffffff");
  }
};
/** the centre-of-gravity symbol (quartered disc) and a label, on a 760 x 260 canvas */
export const fxCG = (p: Pen, label = "TITIK BERAT") => {
  const g = p.g, cx = 130, cy = 130, r = 96;
  p.ell(cx, cy, r, r, "#ffffff", 12);
  for (const a of [0, 180]) { g.fillStyle = "#e2453c"; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r - 6, rad(a - 90), rad(a)); g.closePath(); g.fill(); }
  p.ell(cx, cy, r, r, null, 12);
  p.poly(rrect(250, 70, 740, 190, 30), "#ffd84a", 10);
  text(p, label, 495, 132, 76, "#1f2a44", 0, 460);
};
const rad = (d: number) => (d * Math.PI) / 180;
/** green tick label on a 620 x 280 canvas */
export const fxCheck = (p: Pen, word: string) => {
  p.poly(rrect(20, 20, 600, 260, 40), "#7bd36a", 12);
  p.stroke([[80, 140], [140, 200], [250, 70]], 34, INK); p.stroke([[80, 140], [140, 200], [250, 70]], 18, "#ffffff");
  text(p, word, 430, 145, 110, "#1f4a2a", 0, 300);
};
/** a big "=" on a 300 x 300 canvas */
export const fxEquals = (p: Pen) => {
  p.poly(rrect(30, 70, 270, 130, 24), "#ffd84a", 12);
  p.poly(rrect(30, 170, 270, 230, 24), "#ffd84a", 12);
};
/** the Vasa in cross-section: heavy guns high up, a little ballast low down, the CG high; on a 900 x 1000 canvas.
 *  st 0 = ship only, 1 = "BERAT" on the guns, 2 = "SEDIKIT" on the ballast too */
export const fxBallast = (p: Pen, st: number) => {
  p.poly(rrect(10, 10, 890, 990, 40), "#f6ecd2", 12);
  const g = p.g;
  // water
  g.fillStyle = "#7cc6e6"; g.fillRect(40, 640, 820, 320);
  p.stroke([[40, 640], [860, 640]], 8, "#2f7aa8");
  // hull section: tall, narrow, tumblehome
  const hull: P2[] = [[300, 260], [270, 420], [262, 560], [280, 700], [330, 800], [450, 850], [570, 800], [620, 700], [638, 560], [630, 420], [600, 260]];
  p.poly(hull, "#a8743f", 12);
  for (const y of [420, 560]) p.stroke([[272, y], [628, y]], 8, "#5a3a22");
  // masts stub
  p.poly(rrect(438, 90, 462, 262, 8), "#9a6a3e", 8);
  // guns on both decks
  for (const y of [350, 490]) for (const x of [330, 400, 500, 570]) { p.ell(x, y, 30, 26, "#3a3d44", 8); }
  // ballast stones in the bottom
  for (const [x, y] of [[420, 800], [470, 806], [445, 780]] as const) p.ell(x, y, 26, 18, "#8f8a82", 7);
  // CG marker high up
  const cx = 450, cy = 520, r = 34;
  p.ell(cx, cy, r, r, "#ffffff", 9);
  for (const a of [0, 180]) { g.fillStyle = "#e2453c"; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r - 4, rad(a - 90), rad(a)); g.closePath(); g.fill(); }
  p.ell(cx, cy, r, r, null, 9);
  if (st >= 1) {
    p.poly([[140, 300], [200, 300], [200, 400], [235, 400], [170, 470], [105, 400], [140, 400]], "#e2453c", 9);
    p.poly(rrect(40, 150, 300, 250, 24), "#ffd84a", 9);
    text(p, "BERAT", 170, 202, 70, "#b43a2e", 0, 240);
  }
  if (st >= 2) {
    p.poly(rrect(560, 860, 870, 960, 24), "#ffd84a", 9);
    text(p, "SEDIKIT", 715, 912, 66, "#1f2a44", 0, 290);
    p.stroke([[600, 860], [500, 805]], 14, INK); p.stroke([[600, 860], [500, 805]], 6, "#ffd84a");
  }
};

// ---------------- dazzle-ship cards ----------------
/** yellow rounded label on a 640 x 220 canvas */
export const fxLabel = (p: Pen, s: string, bg = "#ffd84a", fg = "#1f2a44") => {
  p.poly(rrect(20, 20, 620, 200, 40), bg, 12);
  text(p, s, 320, 114, 96, fg, 0, 540);
};
/** a fat arrow pointing right (dir 1) or left (-1) on a 600 x 300 canvas */
export const fxArrowH = (p: Pen, dir: number, col = "#ffd84a") => {
  const X = (x: number) => (dir > 0 ? x : 600 - x);
  p.poly([[X(40), 105], [X(360), 105], [X(360), 40], [X(560), 150], [X(360), 260], [X(360), 195], [X(40), 195]], col, 14);
};
/** a speed gauge with the needle at k (-1 slow .. 1 fast), on a 520 x 360 canvas */
export const fxSpeedo = (p: Pen, k: number) => {
  const g = p.g, cx = 260, cy = 300;
  p.ell(cx, cy, 230, 230, "#fff8e8", 14, 180, 360);
  p.stroke([[30, 300], [490, 300]], 14);
  g.lineWidth = 34; g.lineCap = "butt";
  for (const [a0, a1, c] of [[180, 240, "#7bd36a"], [240, 300, "#ffd84a"], [300, 360, "#e2453c"]] as const) {
    g.strokeStyle = c; g.beginPath(); g.arc(cx, cy, 185, (a0 * Math.PI) / 180, (a1 * Math.PI) / 180); g.stroke();
  }
  const a = Math.PI * (1.5 + 0.45 * Math.max(-1, Math.min(1, k)));
  p.stroke([[cx, cy], [cx + 160 * Math.cos(a), cy + 160 * Math.sin(a)]], 16);
  p.dot(cx, cy, 22);
};
/** two yellow lightning bolts, t 0..1 flicker, on a 500 x 500 canvas */
export const fxZap = (p: Pen, t: number) => {
  const bolt = (x: number, y: number, s: number, r: number) => {
    const g = p.g; g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s);
    p.poly([[0, -150], [70, -150], [20, -40], [80, -40], [-40, 150], [0, 10], [-60, 10]], "#ffe84a", 12);
    g.restore();
  };
  bolt(150, 230, 0.9 + 0.15 * Math.sin(t * 20), -0.3);
  bolt(360, 260, 0.75 + 0.15 * Math.cos(t * 23), 0.35);
};
/** a red-and-white ball on a 200 x 200 canvas, spin a */
export const fxBall = (p: Pen, a: number) => {
  const g = p.g;
  p.ell(100, 100, 82, 82, "#f4f1ea", 10);
  g.save(); g.beginPath(); g.arc(100, 100, 78, 0, 7); g.clip();
  g.translate(100, 100); g.rotate(a);
  g.fillStyle = "#e2453c"; g.fillRect(-90, -90, 180, 55); g.fillRect(-90, 35, 180, 55);
  g.restore();
  p.ell(100, 100, 82, 82, null, 10);
};
/** a red X mark (lies flat on the ground) on a 300 x 300 canvas */
export const fxXmark = (p: Pen) => {
  p.stroke([[50, 50], [250, 250]], 64, INK); p.stroke([[250, 50], [50, 250]], 64, INK);
  p.stroke([[50, 50], [250, 250]], 40, "#e2453c"); p.stroke([[250, 50], [50, 250]], 40, "#e2453c");
};
/** a gun-sight ring with cross hairs (flat on the water), on a 600 x 600 canvas */
export const fxCross = (p: Pen, col = "#e2453c") => {
  p.ell(300, 300, 250, 250, null, 34); p.ell(300, 300, 250, 250, null, 20);
  const g = p.g; g.strokeStyle = col; g.lineWidth = 18; g.beginPath(); g.arc(300, 300, 250, 0, 7); g.stroke();
  for (const [a, b] of [[[300, 10], [300, 200]], [[300, 400], [300, 590]], [[10, 300], [200, 300]], [[400, 300], [590, 300]]] as P2[][]) {
    p.stroke([a, b], 34); p.stroke([a, b], 18, col);
  }
  p.dot(300, 300, 22, col);
};
/** a dashed outline of the steamer seen from above (bow up), on a 300 x 1200 canvas */
export const fxGhost = (p: Pen) => {
  const g = p.g, pts: P2[] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, y = 40 + t * 1120, w = t < 0.3 ? 120 * Math.sqrt(1 - ((0.3 - t) / 0.3) ** 2) : 120 * (1 - 0.45 * Math.max(0, (t - 0.8) / 0.2)); pts.push([150 + w, y]); }
  const full = [...pts, ...pts.slice().reverse().map(([x, y]) => [300 - x, y] as P2)];
  g.setLineDash([60, 40]); g.lineJoin = "round";
  g.fillStyle = "rgba(255,255,255,0.22)"; p.path(full, true); g.fill();
  g.lineWidth = 30; g.strokeStyle = INK; p.path(full, true); g.stroke();
  g.lineWidth = 16; g.strokeStyle = "#ffffff"; p.path(full, true); g.stroke();
  g.setLineDash([]);
};
/** a dashed white path line (along the canvas height) on a 120 x 1000 canvas */
export const fxDash = (p: Pen) => {
  const g = p.g; g.setLineDash([70, 50]); g.lineCap = "round";
  g.lineWidth = 40; g.strokeStyle = INK; g.beginPath(); g.moveTo(60, 30); g.lineTo(60, 970); g.stroke();
  g.lineWidth = 22; g.strokeStyle = "#ffffff"; g.beginPath(); g.moveTo(60, 30); g.lineTo(60, 970); g.stroke();
  g.setLineDash([]);
};
/** a yellow arrow pointing down, on a 300 x 400 canvas */
export const fxDown = (p: Pen) => {
  p.poly([[100, 30], [200, 30], [200, 220], [270, 220], [150, 370], [30, 220], [100, 220]], "#ffd84a", 14);
};
