# Cartoon 3D Shorts (channel 2, Bahasa Indonesia)

Vertical animated story Shorts: 2D cartoon characters in a 3D world (three.js inside Remotion), ElevenLabs narrator, word-by-word captions, music and sound effects. The story comes first; the real science is the twist at the end. Style reference: story-driven "hidden science twist" Shorts (see the skill's STYLE_BIBLE).

## How the user works
1. `/generate-naskah [jumlah] [tema]` → N story options with full scripts → `topics/naskah_latest.md`.
2. `/generate-vidio <nomor atau judul>` → `out/<slug>/<slug>.mp4` + `upload.txt`.
Both skills are in `.claude/skills/`. The full pipeline lives in `generate-vidio/SKILL.md`.

## Map
- `.claude/skills/cartoon-3d-short/`: clone of github.com/mromidev/claude-animated-shorts (MIT): 3D look pipeline, final look values, STYLE_BIBLE, measured reports. Its `references/frames` and `references/sheets` come from someone else's videos: style study only. Never publish them, and never copy their scripts, characters or shots. Two of its user rules were changed for this channel: captions ARE used, and the language is Indonesian.
- `src/videos/bridge/`: the proven example short (all look code). New videos are copies in `src/videos/<slug>/`.
- `src/common/Captions.tsx`: shared word-by-word captions (Fredoka Bold, `public/fonts/`). `src/Root.tsx`: `withCaptions()` + one `<Composition>` per video.
- `projects/<slug>/`: script.txt, facts.md, shots.md, voice.wav, words.json, sound.json, mix.wav, stems, length.json, cache/.
- `tools/voice.py` (ElevenLabs → voice.wav + words.json), `tools/sound.py` (music + SFX + loudness → mix.wav), `tools/finish.py` (render + mux → final mp4), `tools/voices_list.py`, `tools/synth.py` (free offline music/SFX fallback).
- `scripts/stills.mjs <CompId> <outPrefix> <frames> [scale]`: quick look stills.
- `public/bridge/kenney/`: Kenney CC0 models in use; `assets_src/`: full Nature Kit + Fantasy Town Kit.
- `topics/`: naskah options and `used.txt`. `out/`: renders.

## Setup (done 2026-11-13; nothing to install)
- Node 24 + Remotion 4.0.543, three, @react-three/fiber 8, postprocessing, @remotion/fonts.
- Python 3.12 in `.venv/` (made with `tools/uv/uv.exe`): numpy, scipy, pillow, soundfile, requests, kokoro, faster-whisper. Run as `.venv/Scripts/python.exe`.
- ffmpeg/ffprobe in `tools/ffmpeg/bin/` (not on PATH; the tools use the full path).
- Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` renders with `--gl angle`. Remotion temp files go to `D:/remotion_tmp` (large; clear it if the disk fills). Drive D: had ~60 GB free.
- Speed: a still ≈ 8 s; final render ≈ 0.6 s per frame at concurrency 3 (6 crashed the GPU at ~300 frames).

## Voice and sound
- Narrator = **ElevenLabs** (paid plan). Key, voice ID and settings are in `.env`: private, never print, share or upload it. The plan allows `mp3_44100_128` only (not 192). The voice in `.env` is approved for Indonesian.
- ElevenLabs also makes the music (`/v1/music`) and SFX (`/v1/sound-generation`); results are cached per project.
- Free fallbacks: `tools/voice.py ... --kokoro` (English only), `{"local": ...}` music/SFX in sound.json.
- Mix target: -14 LUFS, true peak -1.5 dB, music ≈10 dB under the voice.

## Language: Bahasa Indonesia (Indonesian market only)
- Voice-over, captions, on-screen text, titles, descriptions and hashtags are all in casual, spoken Indonesian ("cuma", "nggak", "bayangin" are fine; no textbook language).
- Write numbers and years as words in the script so the narrator reads them right.
- Pace ≈ 2.0–2.5 words/s with this voice: a 55–65 s short is about 120–150 words.
- Local stories (Nusantara history, everyday Indonesian life) are a plus.
- An English version of this style is planned later as a separate channel 3: copy this setup to its own folder then; keep this folder Indonesian.

## Rules
- Facts first: verify the real science with 2+ reliable sources. A story may be fictional around a real mechanism, but never present invented events, quotes or newspapers as true.
- Give the channel its own look (colours, character design). Don't clone another channel or mention its name.
- Always look at the stills yourself before the final render.
- Keep user-facing messages short, plain and in Indonesian.
