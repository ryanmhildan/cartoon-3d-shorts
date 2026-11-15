// usage: node scripts/stills.mjs <CompositionId> <outPrefix> <frame,frame,...> [scale=0.5]
// Bundles once, renders JPEG stills with the GPU (ANGLE) in the installed Chrome. Temp files go to D:/remotion_tmp.
import fs from "node:fs";
import path from "node:path";
const TMP = process.env.REMOTION_TMP || "D:/remotion_tmp";
fs.mkdirSync(TMP, { recursive: true });
process.env.TEMP = process.env.TMP = TMP;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");

const [id, prefix, frames, scale = "0.5"] = process.argv.slice(2);
if (!id || !prefix || !frames) { console.log("usage: node scripts/stills.mjs <CompositionId> <outPrefix> <f,f,...> [scale]"); process.exit(1); }
fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error") console.log("[error]", l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88,
    scale: Number(scale), browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
