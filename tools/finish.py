"""Final render: Remotion picture (+captions) -> mux with projects/<slug>/mix.wav -> out/<slug>/<slug>.mp4

usage: .venv/Scripts/python.exe tools/finish.py <slug> <CompositionId> [--frames=0-149] [--scale=1]
The composition's length must already match projects/<slug>/length.json (frames). 1080x1920 by default;
--scale=1.3333 gives the 1440x2560 (2K) upload.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FFMPEG = os.path.join(HERE, "ffmpeg", "bin", "ffmpeg.exe")
CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    slug, comp = sys.argv[1], sys.argv[2]
    extra = [a for a in sys.argv[3:] if a.startswith("--")]
    proj = os.path.join(ROOT, "projects", slug)
    out_dir = os.path.join(ROOT, "out", slug)
    os.makedirs(out_dir, exist_ok=True)
    pic = os.path.join(out_dir, "picture.mp4")
    env = {**os.environ, "TEMP": "D:/remotion_tmp", "TMP": "D:/remotion_tmp"}
    os.makedirs("D:/remotion_tmp", exist_ok=True)
    cmd = ["npx.cmd", "remotion", "render", "src/index.ts", comp, pic, "--codec", "h264", "--crf", "16", "--muted",
           "--gl", "angle", *([] if any(a.startswith("--concurrency") for a in extra) else ["--concurrency", "3"]), "--timeout", "240000", "--browser-executable", CHROME, *extra]
    print("render:", " ".join(cmd[1:]))
    subprocess.run(cmd, cwd=ROOT, env=env, check=True)
    final = os.path.join(out_dir, f"{slug}.mp4")
    mix = os.path.join(proj, "mix.wav")
    subprocess.run([FFMPEG, "-y", "-v", "error", "-i", pic, "-i", mix, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    probe = subprocess.run([os.path.join(HERE, "ffmpeg", "bin", "ffprobe.exe"), "-v", "error", "-show_entries",
                            "format=duration", "-of", "csv=p=0", final], capture_output=True, text=True).stdout.strip()
    length = json.load(open(os.path.join(proj, "length.json"))) if os.path.exists(os.path.join(proj, "length.json")) else {}
    print(f"OK: {final}  ({float(probe):.2f}s; soundtrack {length.get('duration', '?')}s)")


if __name__ == "__main__":
    main()
