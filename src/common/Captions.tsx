// Word-by-word captions in the reference style: one word (sometimes 2-3 very short ones) at a time,
// white bold rounded sans with a thin black outline, lower-middle of the frame, hard swap on each word
// with a tiny pop-in. Timed from words.json ({word, start, end} in seconds, from tools/voice.py).
import React from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";

export type Word = { word: string; start: number; end: number };
type Group = { text: string; start: number; end: number };

const FAMILY = "CaptionFont";
let fontReady: Promise<void> | null = null;
const useCaptionFont = () => {
  const [handle] = React.useState(() => delayRender("caption font"));
  React.useEffect(() => {
    fontReady ??= loadFont({ family: FAMILY, url: staticFile("fonts/Fredoka-Bold.ttf"), weight: "700" });
    fontReady.then(() => continueRender(handle), () => continueRender(handle));
  }, [handle]);
};

/** Merge words that are spoken too fast to read alone (< minDur s) with the next one, max 3 words / 16 chars. */
export const groupWords = (words: Word[], minDur = 0.22): Group[] => {
  const out: Group[] = [];
  let cur: Group | null = null;
  let n = 0;
  for (const w of words) {
    const t = w.word.replace(/\s+/g, " ").trim();
    if (!t) continue;
    if (cur && n < 3 && cur.end - cur.start < minDur && (cur.text + " " + t).length <= 16) {
      cur.text += " " + t;
      cur.end = w.end;
      n++;
      continue;
    }
    cur = { text: t, start: w.start, end: w.end };
    out.push(cur);
    n = 1;
  }
  return out;
};

export const Captions: React.FC<{ words: Word[]; offset?: number; y?: number; size?: number; hold?: number }> = ({
  words, offset = 0, y = 1330, size = 92, hold = 0.6,
}) => {
  useCaptionFont();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groups = React.useMemo(() => groupWords(words), [words]);
  const t = f / fps - offset;
  let g = -1;
  for (let i = 0; i < groups.length; i++) if (groups[i].start <= t) g = i;
  if (g < 0) return null;
  const cur = groups[g];
  const next = groups[g + 1];
  // stay on screen until the next word starts, but not longer than `hold` s after the word ends (pauses go clean)
  const until = next ? Math.min(next.start, cur.end + hold) : cur.end + hold;
  if (t > until) return null;
  const age = (t - cur.start) * fps; // frames since the swap
  const pop = age < 3 ? [0.86, 1.06, 1.0][Math.max(0, Math.floor(age))] : 1;
  const stroke = Math.round(size * 0.13);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: 60, right: 60, top: y, textAlign: "center",
        transform: `translateY(-50%) scale(${pop})`,
        fontFamily: `${FAMILY}, Arial Black, sans-serif`, fontWeight: 700, fontSize: size, lineHeight: 1.05,
        color: "#FFFFFF", WebkitTextStroke: `${stroke}px #000000`, paintOrder: "stroke fill",
        textShadow: "0 6px 0 rgba(0,0,0,0.35)", letterSpacing: 1,
      }}>
        {cur.text}
      </div>
    </AbsoluteFill>
  );
};
