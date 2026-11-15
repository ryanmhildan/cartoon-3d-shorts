"""Soundtrack for one short: voice + music + sound effects -> <dir>/mix.wav (48 kHz stereo, -14 LUFS, true peak -1.5 dB).

usage: .venv/Scripts/python.exe tools/sound.py projects/<slug>
Needs in <dir>: voice.wav + words.json (from tools/voice.py) and sound.json:
{
  "tail": 0.6,                                   # seconds of video after the last word (optional)
  "music": {"prompt": "playful pizzicato cartoon mystery, light percussion, 110 bpm", "gain_db": -10},
           # or {"local": "playful" | "mystery", "bpm": 110} for the free built-in synth, or null for no music
  "sfx": [
    {"text": "cartoon whoosh", "at_word": "jembatan", "dur": 0.6},          # first time that word is spoken
    {"text": "wooden bridge creaking", "at_word": "jembatan", "nth": 2, "dur": 1.5, "gain_db": -10, "offset": -0.1},
    {"text": "big splash into a river", "at": 31.2, "dur": 1.8},           # absolute seconds
    {"local": "pop", "at": 2.0}                                            # built-in: whoosh pop splash sting ding boing ...
  ]
}
ElevenLabs results are cached in <dir>/cache/ (same text + duration = no new credits).
"""
import hashlib
import json
import os
import re
import subprocess
import sys

import numpy as np
import requests
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from voice import load_env  # noqa: E402

FFMPEG = os.path.join(HERE, "ffmpeg", "bin", "ffmpeg.exe")
SR = 48000
API = "https://api.elevenlabs.io/v1"


def decode(path):
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def resample(x, sr):
    from scipy.signal import resample_poly
    return x if sr == SR else resample_poly(x, SR, sr).astype(np.float32)


def db(x):
    return 10 ** (x / 20)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x.astype(np.float64) ** 2)) + 1e-9)


def eleven(kind, body, cache_dir, ext="mp3"):
    os.makedirs(cache_dir, exist_ok=True)
    key = hashlib.sha1(json.dumps([kind, body], sort_keys=True).encode()).hexdigest()[:12]
    slug = re.sub(r"[^a-z0-9]+", "_", (body.get("text") or body.get("prompt") or "")[:30].lower()).strip("_")
    path = os.path.join(cache_dir, f"{kind}_{slug}_{key}.{ext}")
    if os.path.exists(path):
        return path
    api_key = load_env().get("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is empty in .env")
    url = f"{API}/sound-generation" if kind == "sfx" else f"{API}/music"
    r = requests.post(url, params={"output_format": "mp3_44100_128"}, headers={"xi-api-key": api_key}, json=body, timeout=600)
    if r.status_code != 200:
        raise RuntimeError(f"ElevenLabs {kind} error {r.status_code}: {r.text[:300]}")
    open(path, "wb").write(r.content)
    print(f"  new {kind}: {os.path.basename(path)}")
    return path


def word_time(words, w, nth=1):
    if isinstance(w, int):
        return words[w]["start"]
    norm = lambda s: re.sub(r"[^\w-]", "", s.lower())
    hits = [x["start"] for x in words if norm(x["word"]) == norm(w)]
    if len(hits) < nth:
        raise SystemExit(f"ERROR: at_word '{w}' (nth {nth}) is not in words.json")
    return hits[nth - 1]


def place(buf, t, clip):
    i = int(round(t * SR))
    if i < 0:
        clip, i = clip[-i:], 0
    k = min(len(clip), len(buf) - i)
    if k > 0:
        buf[i:i + k] += clip[:k]


def fade(x, a=0.005, b=0.05):
    x = x.copy()
    na, nb = min(len(x), int(a * SR)), min(len(x), int(b * SR))
    if na:
        x[:na] *= np.linspace(0, 1, na)
    if nb:
        x[-nb:] *= np.linspace(1, 0, nb)
    return x


def main():
    d = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
    cfg = json.load(open(os.path.join(d, "sound.json"), encoding="utf-8"))
    words = json.load(open(os.path.join(d, "words.json"), encoding="utf-8"))
    cache = os.path.join(d, "cache")
    voice = decode(os.path.join(d, "voice.wav"))
    dur = max(len(voice) / SR, words[-1]["end"] if words else 0) + float(cfg.get("tail", 0.6))
    n = int(dur * SR)
    v = np.zeros(n, np.float32)
    place(v, 0, voice)
    v_db = rms_db(voice[np.abs(voice) > 0.01]) if np.any(np.abs(voice) > 0.01) else -20

    # ---- music ----
    m = np.zeros(n, np.float32)
    mc = cfg.get("music")
    if mc:
        try:
            if mc.get("local"):
                raise RuntimeError("local music requested")
            body = {"prompt": mc["prompt"] + ". Instrumental only, no vocals.", "music_length_ms": int(dur * 1000) + 1000,
                    "force_instrumental": True, "model_id": mc.get("model", "music_v1")}
            track = decode(eleven("music", body, cache))
        except Exception as e:  # noqa: BLE001
            if not mc.get("local"):
                print(f"  music: {e} -> using the free built-in synth")
            import synth
            track = resample(synth.music(dur, mc.get("local") or "playful", mc.get("bpm", 105)), synth.SR)
        track = track[:n]
        track = fade(track, 0.02, 0.8)
        m[:len(track)] = track
        m *= db(v_db + float(mc.get("gain_db", -10)) - rms_db(track))
        # duck 4 dB under the narrator (smoothed), so the voice always sits on top
        from scipy.ndimage import uniform_filter1d
        act = uniform_filter1d((np.abs(v) > 0.02).astype(np.float32), int(0.25 * SR))
        m *= 1 - (1 - db(-4)) * np.clip(act * 3, 0, 1)

    # ---- sound effects ----
    fx = np.zeros(n, np.float32)
    for e in cfg.get("sfx", []):
        t = e["at"] if "at" in e else word_time(words, e["at_word"], e.get("nth", 1))
        t += float(e.get("offset", 0))
        if e.get("local"):
            import synth
            clip = resample(synth.sfx(e["local"]), synth.SR)
        else:
            body = {"text": e["text"], "duration_seconds": max(0.5, min(30, float(e.get("dur", 1.0)))),
                    "prompt_influence": float(e.get("influence", 0.4))}
            clip = decode(eleven("sfx", body, cache))
        clip = fade(clip)
        peak = np.abs(clip).max() + 1e-9
        clip *= db(float(e.get("gain_db", -8))) * (np.abs(voice).max() / peak)
        place(fx, t, clip)

    mix = v + m + fx
    st = np.stack([mix, mix], 1)
    pre = os.path.join(d, "mix_pre.wav")
    sf.write(pre, st, SR, subtype="FLOAT")
    for name, x in (("stem_voice", v), ("stem_music", m), ("stem_sfx", fx)):
        sf.write(os.path.join(d, name + ".wav"), x, SR, subtype="PCM_16")
    out = os.path.join(d, "mix.wav")
    # two-pass loudness normalisation to the reference level (-14 LUFS, true peak -1.5)
    meas = subprocess.run([FFMPEG, "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json",
                           "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
          f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run([FFMPEG, "-y", "-v", "error", "-i", pre, "-af", af, "-ar", str(SR), "-c:a", "pcm_s16le", out], check=True)
    os.remove(pre)
    frames = int(np.ceil(dur * 30))
    json.dump({"duration": round(dur, 3), "frames": frames}, open(os.path.join(d, "length.json"), "w"))
    print(f"OK: mix.wav {dur:.2f}s = {frames} frames at 30 fps (input {j['input_i']} LUFS -> -14) -> {d}")


if __name__ == "__main__":
    main()
