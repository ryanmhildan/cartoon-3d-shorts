"""Render a composition in fresh-browser chunks, concat, mux the soundtrack.
usage: python chunks.py <slug> <CompId> <total_frames> [chunk=400] [concurrency=2]"""
import os, subprocess, sys
ROOT = "D:/IT-Project/cartoon-3d-shorts"
FF = ROOT + "/tools/ffmpeg/bin/ffmpeg.exe"
CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
slug, comp, total = sys.argv[1], sys.argv[2], int(sys.argv[3])
chunk = int(sys.argv[4]) if len(sys.argv) > 4 else 400
conc = sys.argv[5] if len(sys.argv) > 5 else "2"
out = f"{ROOT}/out/{slug}"
env = {**os.environ, "TEMP": "D:/remotion_tmp", "TMP": "D:/remotion_tmp"}
parts = []
for a in range(0, total, chunk):
    b = min(total, a + chunk) - 1
    p = f"{out}/part_{a:04d}.mp4"
    parts.append(p)
    if os.path.exists(p):
        continue
    for attempt in range(3):
        cmd = ["npx.cmd", "remotion", "render", "src/index.ts", comp, p + ".tmp.mp4", "--codec", "h264", "--crf", "16", "--muted",
               "--gl", "angle", "--concurrency", conc, "--timeout", "240000", "--browser-executable", CHROME, f"--frames={a}-{b}"]
        with open(f"{out}/part_{a:04d}.log", "w") as log:
            r = subprocess.run(cmd, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
        if r.returncode == 0:
            os.replace(p + ".tmp.mp4", p)
            print("ok", a, b, flush=True)
            break
        print("retry", a, b, flush=True)
    else:
        sys.exit(f"FAIL {a}-{b}")
with open(f"{out}/parts.txt", "w") as f:
    for p in parts:
        f.write(f"file '{os.path.basename(p)}'\n")
pic = f"{out}/picture.mp4"
subprocess.run([FF, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{out}/parts.txt", "-c", "copy", pic], check=True)
subprocess.run([FF, "-y", "-v", "error", "-i", pic, "-i", f"{ROOT}/projects/{slug}/mix.wav", "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", f"{out}/{slug}.mp4"], check=True)
print("DONE", f"{out}/{slug}.mp4")
