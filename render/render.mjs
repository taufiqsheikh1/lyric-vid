#!/usr/bin/env node
// Deterministic Three.js lyric renderer.
//
// Renders `songs/<name>/scene.js` (or any --scene) frame-by-frame at exact
// timestamps in headless Chromium, captures lossless PNGs, then masters an MP4
// with ffmpeg. Frames are never dropped regardless of scene complexity.
//
//   node render/render.mjs --song my-song --profile draft
//   node render/render.mjs --scene scenes/test/scene.js --profile draft --frames 90
//   node render/render.mjs --song my-song --profile final --out output/my-song.mp4
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./lib/server.mjs";
import { launchBrowser } from "./lib/chrome.mjs";
import { buildPlayerUrl, captureFrames, getDuration } from "./lib/capture.mjs";
import { encodeFrames } from "./lib/ffmpeg.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      a[key] = true;
    } else {
      a[key] = next;
      i++;
    }
  }
  return a;
}

const rel = (p) => (p ? path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join("/") : undefined);
const firstExisting = (...paths) => paths.find((p) => p && existsSync(path.resolve(ROOT, p)));

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const configPath = path.resolve(ROOT, args.config || "render.config.json");
  const globalConfig = JSON.parse(await fs.readFile(configPath, "utf8"));
  const profileName = args.profile || "draft";
  const profile = globalConfig.profiles[profileName] || {};

  // Resolve inputs -----------------------------------------------------------
  let scene, audio, lyrics, energy, songDir;
  if (args.song) {
    songDir = path.join("songs", args.song);
    scene = firstExisting(`${songDir}/scene.js`);
    audio = firstExisting(`${songDir}/audio.mp3`, `${songDir}/audio.wav`);
    lyrics = firstExisting(`${songDir}/lyrics-lines.json`, `${songDir}/lyrics-fixed.json`);
    energy = firstExisting(`${songDir}/energy.json`);
  }
  scene = args.scene || scene;
  audio = args.audio || audio;
  lyrics = args.lyrics || lyrics;
  energy = args.energy || energy;

  if (!scene) {
    throw new Error("No scene found. Pass --song <name> or --scene <path>.");
  }

  // Resolve render settings --------------------------------------------------
  const fps = Number(args.fps ?? profile.fps ?? globalConfig.fps ?? 60);
  const width = Number(args.width ?? profile.width ?? 1920);
  const height = Number(args.height ?? profile.height ?? 1080);
  const supersample = Number(args.supersample ?? profile.supersample ?? 1);
  const workers = Number(args.workers ?? profile.workers ?? 1);
  const gpu = Boolean(args.gpu);

  const framesDir = path.resolve(ROOT, args["frames-dir"] || path.join("frames", path.basename(scene, ".js")));
  const keepFrames = Boolean(args["keep-frames"]);
  const outPath = path.resolve(ROOT, args.out || path.join("output", `${args.song || "test"}_${profileName}.mp4`));

  await fs.rm(framesDir, { recursive: true, force: true });
  await fs.mkdir(framesDir, { recursive: true });
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  console.log(`> scene=${rel(scene)} profile=${profileName} ${width}x${height}@${fps} ss=${supersample} workers=${workers}${gpu ? " gpu" : ""}`);

  const server = await startServer(ROOT);
  const url = buildPlayerUrl(server.origin, {
    scene: rel(scene),
    lyrics: rel(lyrics),
    energy: rel(energy),
    width,
    height,
    fps,
    supersample,
    profile: profileName,
  });

  const browser = await launchBrowser(globalConfig.chrome || {}, { gpu });
  try {
    let duration = args.end ? Number(args.end) : await getDuration(browser, url, width, height);
    if (!Number.isFinite(duration) || duration <= 0) duration = 10;

    const firstFrame = Math.max(0, Math.round((Number(args.start) || 0) * fps));
    let lastFrame = Math.round(duration * fps);
    if (args.frames) lastFrame = Math.min(lastFrame, firstFrame + Number(args.frames));

    const frameIndices = [];
    for (let i = firstFrame; i < lastFrame; i++) frameIndices.push(i);

    console.log(`> frames ${firstFrame}..${lastFrame - 1} (${frameIndices.length}) duration=${duration.toFixed(2)}s`);

    const t0 = Date.now();
    await captureFrames({
      browser,
      url,
      width,
      height,
      fps,
      frameIndices,
      outDir: framesDir,
      workers,
      onProgress: (done, total) => {
        const dt = (Date.now() - t0) / 1000;
        const rate = done / dt;
        const eta = rate > 0 ? (total - done) / rate : 0;
        process.stdout.write(`\r  captured ${done}/${total}  ${rate.toFixed(1)} fps  eta ${eta.toFixed(0)}s   `);
      },
    });
    process.stdout.write("\n");

    const audioPath = audio ? path.resolve(ROOT, audio) : undefined;
    await encodeFrames({
      frameGlob: path.join(framesDir, "%06d.png"),
      startNumber: firstFrame,
      fps,
      audioPath,
      outPath,
      video: profile.video || {},
      audioBitrate: profile.audioBitrate || "320k",
    });

    console.log(`OK rendered ${rel(outPath)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } finally {
    await browser.close();
    await server.close();
  }

  if (!keepFrames) await fs.rm(framesDir, { recursive: true, force: true });
  else console.log(`  frames kept at ${rel(framesDir)}`);
}

main().catch((e) => {
  console.error("\nx " + (e && e.message ? e.message : e));
  process.exit(1);
});
