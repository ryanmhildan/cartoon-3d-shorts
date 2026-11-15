// 2D effect cards of "Vaksin Sapi": the cartoon cow (lit-looking flat card), the 1796 sign and the smallpox notice,
// speech bubble with the rumour, the 6-weeks calendar, stars, our own satire poster (a man with a cow's head), the two
// virus "twins", the body-training panels, a small fire + bucket splash, and VACCA -> VAKSIN. Ink language of toon.ts.
import { Pen, INK, rrect, P2 } from "./toon";

const FONT = (px: number) => `bold ${px}px Fredoka, 'Arial Black', sans-serif`;
const text = (p: Pen, s: string, x: number, y: number, px: number, fill: string, ol = 0, max?: number) => {
  const g = p.g;
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y, max); }
  g.fillStyle = fill; g.fillText(s, x, y, max);
};
const COW = "#fbf8f0", SPOT = "#2a2420", PINK = "#f2a6a6";

/** cartoon cow seen from the side (facing right), on an 800 x 560 canvas. mood: calm | smile | tilt, chew 0..1 */
export const fxCow = (p: Pen, mood: "calm" | "smile" | "tilt" = "calm", chew = 0) => {
  const g = p.g;
  for (const [x, k] of [[230, 0], [300, 1], [520, 0], [590, 1]] as const) { p.poly(rrect(x - 22, 330, x + 22, 500, 14), k ? "#e8e2d4" : COW, 9); p.poly(rrect(x - 24, 480, x + 24, 512, 8), SPOT, 0); }
  p.poly(rrect(150, 170, 650, 380, 100), COW, 11);
  g.save(); p.path(rrect(150, 170, 650, 380, 100), true); g.clip();
  for (const [x, y, rx, ry] of [[260, 220, 60, 40], [430, 300, 70, 50], [560, 210, 40, 30], [330, 350, 40, 25]] as const) p.ell(x, y, rx, ry, SPOT, 0);
  g.restore();
  p.poly(rrect(150, 170, 650, 380, 100), null, 11);
  p.stroke([[160, 220], [110, 300], [120, 330]], 9); p.ell(118, 338, 14, 18, SPOT, 4);
  p.ell(420, 382, 40, 22, PINK, 7);
  // head
  const tilt = mood === "tilt" ? -0.25 : 0;
  g.save(); g.translate(660, 210); g.rotate(tilt);
  p.poly([[-40, -70], [-70, -100], [-30, -80]], "#d8c8a0", 6); p.poly([[40, -70], [70, -100], [30, -80]], "#d8c8a0", 6);
  p.ell(-60, -40, 34, 16, COW, 7); p.ell(60, -40, 34, 16, COW, 7);
  p.poly(rrect(-60, -80, 60, 70, 50), COW, 10);
  p.ell(-30, -45, 22, 16, SPOT, 0);
  p.ell(0, 55, 62, 40 - 6 * chew, PINK, 9);
  p.dot(-18, 55, 7); p.dot(18, 55, 7);
  if (mood === "smile") { p.arc(-24, -10, 12, 9, 200, 340, 6); p.arc(24, -10, 12, 9, 200, 340, 6); p.arc(0, 80, 22, 10, 20, 160, 6); }
  else { p.ell(-24, -10, 9, 12, INK, 0); p.ell(24, -10, 9, 12, INK, 0); p.dot(-21, -14, 3, "#ffffff"); p.dot(27, -14, 3, "#ffffff"); }
  g.restore();
};

/** a wooden notice with red lettering (two lines), on a 640 x 420 canvas */
export const fxNotice = (p: Pen, l1: string, l2: string) => {
  p.poly(rrect(20, 20, 620, 400, 26), "#c98f55", 12);
  p.poly(rrect(44, 42, 596, 378, 16), "#f3e3bd", 6);
  text(p, l1, 320, 150, 92, "#b43a2e", 0, 520);
  text(p, l2, 320, 280, 70, "#3a2a20", 0, 520);
};

/** speech bubble with the rumour as icons: cow -> shield "KEBAL CACAR", on a 760 x 460 canvas */
export const fxRumour = (p: Pen, t: number) => {
  p.poly([[160, 380], [100, 450], [250, 385]], "#ffffff", 12);
  p.poly(rrect(20, 20, 740, 400, 110), "#ffffff", 12);
  p.poly([[170, 375], [120, 430], [235, 380]], "#ffffff", 0);
  // little cow face
  p.poly(rrect(110, 110, 250, 270, 50), COW, 8); p.ell(150, 140, 20, 14, SPOT, 0); p.ell(180, 245, 52, 32, PINK, 7); p.dot(165, 245, 5); p.dot(195, 245, 5);
  p.ell(150, 190, 8, 11, INK, 0); p.ell(210, 190, 8, 11, INK, 0);
  p.stroke([[290, 200], [380, 200]], 16, "#3a2a20"); p.poly([[370, 170], [410, 200], [370, 230]], "#3a2a20", 0);
  if (t > 0.3) {
    p.poly([[540, 90], [640, 120], [630, 230], [540, 300], [450, 230], [440, 120]], "#3fae55", 10);
    p.stroke([[495, 195], [530, 235], [595, 150]], 18, "#ffffff");
    text(p, "KEBAL CACAR", 540, 345, 44, "#2a2420", 0, 300);
  }
};

/** wall calendar "6 MINGGU", pages flipping, on a 500 x 620 canvas */
export const fxWeeks = (p: Pen, t: number) => {
  p.poly(rrect(30, 60, 470, 560, 24), "#fbf6e8", 12);
  p.poly(rrect(30, 60, 470, 170, 24), "#3f6fb5", 0); p.poly(rrect(30, 60, 470, 560, 24), null, 12);
  for (const x of [140, 360]) p.ell(x, 60, 18, 28, "#c9ccd2", 8);
  text(p, ["MEI", "JUNI", "JULI"][Math.min(2, Math.floor(t * 3))], 250, 118, 64, "#ffffff");
  for (let r0 = 0; r0 < 4; r0++) for (let c = 0; c < 5; c++) { const k = r0 * 5 + c; p.poly(rrect(70 + c * 74, 200 + r0 * 70, 120 + c * 74, 250 + r0 * 70, 8), k < Math.round(20 * t) ? "#f2b8b0" : "#efe3c8", 3); }
  p.poly(rrect(70, 470, 430, 540, 26), "#fff3c4", 8);
  text(p, "6 MINGGU", 250, 507, 56, "#b43a2e");
};

/** circling gold stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = (k * 36 - 90) * (Math.PI / 180); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** our own satire poster: a gentleman with a cow's head, "AWAS JADI SAPI!", on a 600 x 800 canvas */
export const fxPoster = (p: Pen) => {
  p.poly([[20, 30], [580, 16], [590, 780], [14, 790]], "#f4ecd6", 12);
  text(p, "AWAS JADI SAPI!", 300, 90, 58, "#b43a2e", 0, 520);
  // body in a coat
  p.poly(rrect(200, 470, 400, 700, 80), "#3f6fb5", 10);
  for (const s of [-1, 1]) p.stroke([[300 + s * 95, 520], [300 + s * 150, 640]], 18);
  p.stroke([[260, 700], [255, 760]], 16); p.stroke([[340, 700], [345, 760]], 16);
  // cow head on top
  p.poly([[230, 230], [200, 190], [245, 215]], "#d8c8a0", 6); p.poly([[370, 230], [400, 190], [355, 215]], "#d8c8a0", 6);
  p.ell(210, 280, 40, 18, COW, 7); p.ell(390, 280, 40, 18, COW, 7);
  p.poly(rrect(225, 220, 375, 450, 60), COW, 10);
  p.ell(260, 270, 24, 18, SPOT, 0);
  p.ell(300, 400, 70, 42, PINK, 9); p.dot(280, 400, 7); p.dot(320, 400, 7);
  p.ell(270, 320, 10, 13, INK, 0); p.ell(330, 320, 10, 13, INK, 0);
  text(p, "Moo?", 470, 380, 44, "#3a2a20");
};

/** two cartoon viruses: cowpox (small, friendly) and smallpox (big, grumpy), "MIRIP!", on an 880 x 640 canvas */
export const fxTwins = (p: Pen, t: number) => {
  const vir = (cx: number, cy: number, r: number, col: string, grumpy: boolean) => {
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; p.stroke([[cx + r * Math.cos(a), cy + r * Math.sin(a)], [cx + (r + 34) * Math.cos(a), cy + (r + 34) * Math.sin(a)]], 10); p.ell(cx + (r + 38) * Math.cos(a), cy + (r + 38) * Math.sin(a), 13, 13, col, 6); }
    p.ell(cx, cy, r, r, col, 11);
    if (grumpy) { p.stroke([[cx - 50, cy - 40], [cx - 15, cy - 25]], 10); p.stroke([[cx + 50, cy - 40], [cx + 15, cy - 25]], 10); p.arc(cx, cy + 50, 30, 14, 200, 340, 9); }
    else { p.arc(cx, cy + 25, 28, 16, 20, 160, 8); }
    p.ell(cx - 28, cy - 5, 10, 13, INK, 0); p.ell(cx + 28, cy - 5, 10, 13, INK, 0);
  };
  vir(230, 330, 90, "#b8e0a8", false);
  vir(640, 310, 130, "#e88a7a", true);
  text(p, "CACAR SAPI", 230, 560, 44, "#2a2420");
  text(p, "CACAR", 640, 560, 52, "#2a2420");
  if (t > 0.35) { p.poly(rrect(300, 30, 580, 120, 40), "#fff3c4", 9); text(p, "MIRIP!", 440, 78, 70, "#b43a2e"); }
};

/** two panels: body guards practise on the weak twin, then the big one bounces off their shield, 860 x 900 canvas */
export const fxTraining = (p: Pen, t: number) => {
  p.poly(rrect(10, 10, 850, 440, 30), "#fff8e8", 10);
  p.poly(rrect(10, 460, 850, 890, 30), "#fff8e8", 10);
  const guard = (x: number, y: number, s = 1) => { p.ell(x, y, 46 * s, 46 * s, "#f6f6fa", 8); p.dot(x - 14 * s, y - 6, 6); p.dot(x + 14 * s, y - 6, 6); p.arc(x, y + 14 * s, 14 * s, 8 * s, 20, 160, 5); };
  const small = (x: number, y: number) => { p.ell(x, y, 50, 50, "#b8e0a8", 8); p.dot(x - 14, y - 4, 6); p.dot(x + 14, y - 4, 6); p.arc(x, y + 22, 12, 8, 200, 340, 5); };
  // panel 1: practice (guards bop the weak twin)
  const k = Math.sin(t * Math.PI * 6);
  guard(220, 230); guard(330, 300); small(560 + 10 * k, 250); p.stroke([[380, 280], [500, 260 + 10 * k]], 10, "#3f6fb5");
  text(p, "LATIHAN", 430, 70, 50, "#3a2a20");
  // panel 2: ready (shield up, the big one bounces off)
  if (t > 0.45) {
    const u = Math.min(1, (t - 0.45) / 0.4), bx = 700 - 120 * Math.sin(u * Math.PI);
    guard(200, 690); guard(300, 640);
    p.poly([[400, 560], [470, 590], [460, 760], [400, 820], [340, 760], [330, 590]], "#3fae55", 9);
    p.ell(bx, 680, 80, 80, "#e88a7a", 9); p.stroke([[bx - 40, 650], [bx - 12, 662]], 8); p.stroke([[bx + 40, 650], [bx + 12, 662]], 8); p.arc(bx, 720, 22, 10, 200, 340, 7);
    text(p, "SIAP!", 430, 520, 50, "#3fae55");
  }
};

/** a small cartoon fire on a 300 x 400 canvas, t flicker, s size 0..1 */
export const fxFire = (p: Pen, t: number, s: number) => {
  if (s <= 0.02) return;
  const w = 6 * Math.sin(t * 20);
  p.poly([[150 - 110 * s, 380], [150 - 70 * s, 380 - 200 * s], [150 - 20 * s + w, 380 - 120 * s], [150 + w, 380 - 300 * s], [150 + 30 * s, 380 - 140 * s], [150 + 80 * s - w, 380 - 230 * s], [150 + 110 * s, 380]], "#f0a03e", 9);
  p.poly([[150 - 55 * s, 380], [150 - 20 * s, 380 - 110 * s], [150 + w, 380 - 170 * s], [150 + 30 * s, 380 - 90 * s], [150 + 55 * s, 380]], "#ffd84a", 0);
};

/** "VACCA" (with a cow) morphing into "VAKSIN", on a 900 x 520 canvas, t 0..1 */
export const fxVacca = (p: Pen, t: number) => {
  p.poly(rrect(14, 14, 886, 506, 50), "#fff8e8", 12);
  const k = Math.min(1, Math.max(0, (t - 0.45) / 0.25));
  if (k < 1) { p.g.globalAlpha = 1 - k; text(p, "VACCA", 450, 170, 130, "#3f6fb5", 0); text(p, "(sapi)", 450, 300, 60, "#3a2a20"); p.g.globalAlpha = 1; }
  if (k > 0) { p.g.globalAlpha = k; text(p, "VAKSIN", 450, 200, 150, "#b43a2e", 0); p.g.globalAlpha = 1; }
  p.stroke([[300, 400], [600, 400]], 10, "#3a2a20"); p.poly([[590, 375], [630, 400], [590, 425]], "#3a2a20", 0);
};
