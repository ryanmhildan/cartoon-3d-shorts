"""Narrator voice -> <out_dir>/voice.wav (48 kHz mono) + <out_dir>/words.json.

usage: .venv/Scripts/python.exe tools/voice.py <script.txt> <out_dir>            (ElevenLabs, settings from .env)
       .venv/Scripts/python.exe tools/voice.py <script.txt> <out_dir> --kokoro [voice] [speed]   (free local fallback)

ElevenLabs returns exact per-character timings, so words.json keeps the script's own words ("Seventy-four").
Kokoro has no timings, so it uses Whisper for them (Whisper writes numbers as digits).
words.json = [{"word": "Seventy-four", "start": 0.12, "end": 0.61}, ...]  (seconds)
"""
import base64
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FFMPEG = os.path.join(HERE, "ffmpeg", "bin", "ffmpeg.exe")


def load_env(path=os.path.join(ROOT, ".env")):
    env = {}
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return {**env, **{k: v for k, v in os.environ.items() if k.startswith("ELEVENLABS_")}}


# ---------- ElevenLabs ----------

def elevenlabs(text, out_dir):
    import requests
    env = load_env()
    key, voice = env.get("ELEVENLABS_API_KEY", ""), env.get("ELEVENLABS_VOICE_ID", "")
    if not key:
        sys.exit("ERROR: ELEVENLABS_API_KEY is empty. Put your API key in .env")
    if not voice:
        sys.exit("ERROR: ELEVENLABS_VOICE_ID is empty. Pick a voice and put its Voice ID in .env (list: tools/voices_list.py)")
    body = {
        "text": text,
        "model_id": env.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2",
        "voice_settings": {
            "stability": float(env.get("ELEVENLABS_STABILITY") or 0.45),
            "similarity_boost": float(env.get("ELEVENLABS_SIMILARITY") or 0.8),
            "style": float(env.get("ELEVENLABS_STYLE") or 0.2),
            "speed": float(env.get("ELEVENLABS_SPEED") or 1.0),
            "use_speaker_boost": True,
        },
    }
    r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps",
                      params={"output_format": "mp3_44100_128"},
                      headers={"xi-api-key": key, "Content-Type": "application/json"}, json=body, timeout=300)
    if r.status_code != 200:
        sys.exit(f"ERROR: ElevenLabs error {r.status_code}: {r.text[:400]}")
    data = r.json()
    mp3 = os.path.join(out_dir, "voice_raw.mp3")
    open(mp3, "wb").write(base64.b64decode(data["audio_base64"]))
    wav = os.path.join(out_dir, "voice.wav")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "48000", wav], check=True)
    al = data.get("normalized_alignment") if not data.get("alignment") else data["alignment"]
    return wav, chars_to_words(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"])


def chars_to_words(chars, starts, ends):
    words, cur = [], None
    for ch, s, e in zip(chars, starts, ends):
        if ch.isspace():
            cur = None
            continue
        if cur is None:
            cur = {"word": "", "start": s, "end": e}
            words.append(cur)
        cur["word"] += ch
        cur["end"] = e
    out = []
    for w in words:
        clean = w["word"].strip(".,!?;:\"'()…—")
        if clean:
            out.append({"word": clean, "start": round(w["start"], 3), "end": round(w["end"], 3)})
    return out


# ---------- Kokoro (free, local fallback) ----------

def tts(text, voice, speed):
    from kokoro import KPipeline
    pipe = KPipeline(lang_code=voice[0])  # 'a' = US English, 'b' = UK English
    parts = [audio.numpy() if hasattr(audio, "numpy") else audio for _, _, audio in pipe(text, voice=voice, speed=speed, split_pattern=r"\n+")]
    gap = np.zeros(int(24000 * 0.18), dtype=np.float32)
    out = []
    for p in parts:
        out += [p, gap]
    return np.concatenate(out[:-1]) if out else np.zeros(1, dtype=np.float32)


def align(wav_path):
    from faster_whisper import WhisperModel
    from scipy.signal import resample_poly
    audio, sr = sf.read(wav_path, dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio = resample_poly(audio, 16000, sr).astype(np.float32)  # array input skips PyAV (version clash)
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(audio, word_timestamps=True, language="en")
    return [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in s.words]


def kokoro(text, out_dir, voice, speed):
    os.environ.setdefault("HF_HOME", os.path.join(HERE, "hf"))
    wav = os.path.join(out_dir, "voice.wav")
    sf.write(wav, tts(text, voice, speed), 24000)
    return wav, align(wav)


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        sys.exit(__doc__)
    src, out_dir = args[0], args[1]
    text = open(src, encoding="utf-8").read().strip()
    os.makedirs(out_dir, exist_ok=True)
    if "--kokoro" in args:
        rest = args[args.index("--kokoro") + 1:]
        wav, words = kokoro(text, out_dir, rest[0] if rest else "am_michael", float(rest[1]) if len(rest) > 1 else 1.0)
    else:
        wav, words = elevenlabs(text, out_dir)
    json.dump(words, open(os.path.join(out_dir, "words.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    dur = sf.info(wav).duration
    print(f"OK: voice.wav {dur:.1f}s, {len(words)} words, {len(words) / dur:.2f} words/s -> {out_dir}")


if __name__ == "__main__":
    main()
