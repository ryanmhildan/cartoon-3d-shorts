// The hama (a cartoon planthopper, our own design) and the small effect drawings of this short.
import { Pen, INK, mix, mul, thickAngle, ellPts, rotPts, curve, rrect, rad, DEF_LIGHT, SH_CLOTH, SH_SKIN, MOUTH, P2 } from "./toon";

const BUG_BODY = "#8c6a2e", BUG_HEAD = "#a8c25a", BUG_WING = "#e6f2cf";

/** small flying bug, side view facing right, on a 300 x 300 canvas. flap 0..1 (wing angle) */
export const fxBug = (p: Pen, flap: number, mood: "grin" | "dazed" | "sad" = "grin") => {
  const wa = rad(-60 + 70 * flap);
  p.poly(rotPts([[150, 140], [60, 120], [40, 140], [140, 156]], wa * 0.8, 150, 140), mix(BUG_WING, "#9ab27a", 0.3), 6);
  for (const [x0, x1] of [[120, 104], [150, 140], [176, 170]]) p.stroke([[x0, 180], [x1, 240]], 7);
  p.ell(140, 165, 70, 34, BUG_BODY, 9, 0, 360, -8);
  for (const x of [105, 128, 151]) p.arc(x, 165, 10, 30, -70, 70, 4, "rgba(40,25,10,0.55)");
  p.ell(214, 148, 42, 40, BUG_HEAD, 9);
  p.stroke([[226, 112], [240, 66], [262, 58]], 6); p.stroke([[212, 112], [208, 64], [190, 52]], 6);
  p.ell(228, 140, 20, 22, "#ffffff", 6);
  if (mood === "dazed") p.arc(228, 140, 9, 9, 0, 600, 4);
  else p.ell(234, 142, 9, 11, INK, 0);
  const mx = 238, my = 170;
  if (mood === "grin") p.arc(mx, my - 6, 14, 10, 20, 160, 5);
  else p.arc(mx, my + 6, 12, 7, 200, 340, 5);
  p.poly(rotPts([[150, 138], [52, 104], [30, 124], [138, 154]], wa, 150, 140), BUG_WING, 7);
  p.stroke(rotPts([[146, 142], [60, 118]], wa, 150, 140), 3, "rgba(90,120,60,0.6)");
};

export type BugOpts = { mood: "happy" | "munch" | "sad" | "stroll"; phase?: number; plate?: "full" | "empty" | null; spoon?: boolean; napkin?: boolean; light?: number; blink?: number };
/** the hero bug standing upright on a 600 x 1000 character canvas (soles at 975) */
export const heroBug = (p: Pen, o: BugOpts) => {
  const { mood, phase = 0, plate = null, spoon = false, napkin = true, light = DEF_LIGHT, blink = 0 } = o;
  const two = Math.PI * 2, sole = 975, thick = thickAngle(light);
  const walk = mood === "stroll", bob = walk ? 10 * Math.cos(2 * two * phase) : 0;
  const hip = 790 + bob, limb = mix(BUG_BODY, INK, 0.35);
  for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
    const up = walk ? Math.max(0, Math.sin(two * (phase + ph))) * 40 : 0;
    const fx = 300 + side * 48 + (walk ? 30 * Math.sin(two * (phase + ph)) : 0), fy = sole - 10 - up;
    p.stroke(curve([300 + side * 30, hip], [300 + side * 54, (hip + fy) / 2 - 6], [fx, fy]), 13, limb);
    p.ell(fx + side * 14, fy + 4, 26, 12, mix(BUG_BODY, INK, 0.2), 7);
  }
  for (const s of [-1, 1]) {
    const w: P2[] = [[300 + s * 40, 520], [300 + s * 170, 640], [300 + s * 150, 860], [300 + s * 60, 800]];
    p.poly(w, BUG_WING, 9);
    p.stroke([[300 + s * 50, 540], [300 + s * 140, 780]], 4, "rgba(90,120,60,0.6)");
  }
  const ab = ellPts(300, 690 + bob * 0.5, 112, 150);
  p.shadedFill(ab, BUG_BODY, mul(BUG_BODY, SH_CLOTH), light, 112);
  p.clip(ab, () => { for (let k = 0; k < 4; k++) p.arc(300, 600 + k * 52 + bob * 0.5, 120, 26, 20, 160, 6, "rgba(40,25,10,0.45)"); });
  p.inkRing(ab, 11, thick);
  if (napkin) {
    p.poly([[220, 560 + bob], [380, 560 + bob], [300, 700 + bob]], "#fbfaf4", 8);
    p.stroke([[232, 572 + bob], [368, 572 + bob]], 7, "#d23c3c");
  }
  const sy = 590 + bob;
  const lh: P2 = plate ? [170, 650 + bob] : [190, 760 + bob], rh: P2 = spoon ? [430, mood === "munch" ? 470 + bob : 560 + bob] : [410, 760 + bob];
  p.stroke(curve([220, sy], [176, sy + 40], lh), 13, limb);
  p.stroke(curve([380, sy], [436, sy + 30], rh), 13, limb);
  if (plate) {
    p.ell(lh[0] - 10, lh[1] - 8, 92, 24, "#ffffff", 8);
    p.ell(lh[0] - 10, lh[1] - 10, 66, 14, "#e9eef2", 0);
    if (plate === "full") {
      p.ell(lh[0] - 10, lh[1] - 22, 54, 26, "#fbf6e6", 7, 180, 360);
      for (let k = 0; k < 9; k++) p.ell(lh[0] - 50 + k * 10, lh[1] - 26 - (k % 3) * 7, 5, 3, "#efe4c2", 2);
    } else for (let k = 0; k < 3; k++) p.ell(lh[0] - 30 + k * 22, lh[1] - 12, 4, 3, "#efe4c2", 2);
  }
  p.dot(lh[0], lh[1], 13, INK);
  if (spoon) {
    p.band([[rh[0], rh[1]], [rh[0] + 16, rh[1] - 70]], "#c9ccd2", 8, 3, "round");
    p.ell(rh[0] + 20, rh[1] - 92, 18, 24, "#dfe2e8", 6);
    if (mood === "munch" || mood === "happy") for (let k = 0; k < 4; k++) p.ell(rh[0] + 12 + k * 6, rh[1] - 100 + (k % 2) * 6, 4, 3, "#fbf6e6", 2);
  }
  p.dot(rh[0], rh[1], 13, INK);
  const hy = 420 + bob, hp = ellPts(300, hy, 150, 128), sad = mood === "sad";
  for (const s of [-1, 1]) {
    p.stroke(curve([300 + s * 50, hy - 110], [300 + s * 90, hy - (sad ? 150 : 220)], [300 + s * (sad ? 170 : 140), hy - (sad ? 120 : 250)]), 9);
    p.ell(300 + s * (sad ? 170 : 140), hy - (sad ? 120 : 250), 16, 16, BUG_HEAD, 6);
  }
  p.shadedFill(hp, BUG_HEAD, mul(BUG_HEAD, SH_SKIN), light, 150);
  p.inkRing(hp, 11, thick);
  for (const s of [-1, 1]) {
    const ex = 300 + s * 62, ey = hy - 20;
    if (blink >= 1 || mood === "munch") { p.arc(ex, ey + 6, 34, 18, 200, 340, 9); continue; }
    p.ell(ex, ey, 46, 52, "#ffffff", 9);
    p.ell(ex - s * 4, sad ? ey + 14 : ey + 4, 18, 22, INK, 0);
    if (sad) p.stroke([[ex - s * 40, ey - 70], [ex + s * 30, ey - 54]], 9);
  }
  const my = hy + 62;
  if (sad) { p.arc(300, my + 20, 40, 18, 200, 340, 9); p.ell(420, hy - 70, 9, 15, "#9fd4ff", 4); }
  else if (mood === "munch") { p.ell(300, my, 46, 30, MOUTH, 8); p.ell(260, my - 6, 24, 22, BUG_HEAD, 0); p.ell(340, my - 6, 24, 22, BUG_HEAD, 0); p.arc(300, my - 14, 50, 14, 20, 160, 8); }
  else p.arc(300, my - 8, 52, 30, 20, 160, 9);
};

/** big yellow "?" on a 300 x 400 canvas */
export const fxQuestion = (p: Pen) => {
  const g = p.g;
  g.font = "bold 360px Fredoka, 'Arial Black', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 26; g.strokeStyle = INK; g.lineJoin = "round"; g.strokeText("?", 150, 210);
  g.fillStyle = "#ffd84a"; g.fillText("?", 150, 210);
};
/** four twinkling sparkles on a 400 x 400 canvas, t 0..1 */
export const fxSparkle = (p: Pen, t: number) => {
  const pos: [number, number, number][] = [[110, 120, 0], [290, 90, 0.3], [320, 280, 0.6], [100, 300, 0.85]];
  for (const [x, y, o] of pos) {
    const k = Math.sin(((t + o) % 1) * Math.PI), r = 18 + 52 * k;
    if (k < 0.05) continue;
    const pts: P2[] = [];
    for (let i = 0; i < 8; i++) { const a = rad(i * 45 - 90), rr = i % 2 ? r * 0.28 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
    p.poly(pts, "#fff3b0", 6);
  }
};
/** pesticide mist on a 400 x 300 canvas, t 0..1 (puffs drifting right) */
export const fxSpray = (p: Pen, t: number) => {
  for (let i = 0; i < 7; i++) {
    const u = (t + i / 7) % 1, x = 40 + 300 * u, y = 150 + 40 * Math.sin(i * 2.1) * u, r = 18 + 60 * u;
    p.ell(x, y, r, r * 0.75, `rgba(214,236,200,${(0.85 * (1 - u)).toFixed(3)})`, 0);
  }
};
/** wooden sign with a short text on a 640 x 300 canvas */
export const fxBoard = (p: Pen, text: string) => {
  p.poly(rrect(20, 20, 620, 250, 26), "#c98f55", 12);
  p.poly(rrect(44, 42, 596, 228, 16), "#f3e3bd", 6);
  const g = p.g;
  g.font = "bold 96px Fredoka, 'Arial Black', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#b43a2e"; g.fillText(text, 320, 140, 520);
};
/** tummy-rumble squiggles on a 300 x 200 canvas, t 0..1 */
export const fxGrowl = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const pts: P2[] = [];
    for (let i = 0; i <= 16; i++) pts.push([40 + i * 14, 50 + k * 50 + 12 * Math.sin(i * 1.4 + t * 18 + k)]);
    p.stroke(pts, 8);
  }
};
