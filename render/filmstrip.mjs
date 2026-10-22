#!/usr/bin/env node
// Vision-loop helper: renders N evenly-spaced frames of a scene into a single
// contact-sheet PNG so an agent can "see" the motion arc and critique it.
//
//   node render/filmstrip.mjs --song my-song --count 16
//   node render/filmstrip.mjs --scene scenes/test/scene.js --count 12 --out strip.png
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./lib/server.mjs";
import { launchBrowser } from "./lib/chrome.mjs";
import { buildPlayerUrl } from "./lib/capture.mjs";
import { tileFrames } from "./lib/ffmpeg.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => (p ? path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join("/") : undefined);
const firstExisting = (...paths) => paths.find((p) => p && existsSync(path.resolve(ROOT, p)));

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) a[key] = true;
    else (a[key] = next), i++;
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const globalConfig = JSON.parse(await fs.readFile(path.resolve(ROOT, "render.config.json"), "utf8"));

  let scene, energy, lyrics, songDir;
  if (args.song) {
    songDir = path.join("songs", args.song);
    scene = firstExisting(`${songDir}/scene.js`);
    energy = firstExisting(`${songDir}/energy.json`);
    lyrics = firstExisting(`${songDir}/lyrics-lines.json`, `${songDir}/lyrics-fixed.json`);
  }
  scene = args.scene || scene;
  if (!scene) throw new Error("Pass --song <name> or --scene <path>");

  const count = Number(args.count || 16);
  const width = Number(args.width || 480);
  const height = Math.round((width * 9) / 16);
  const fps = Number(args.fps || 30);
  const start = Number(args.start || 0);
  const cols = Number(args.cols || Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const outPath = path.resolve(ROOT, args.out || `filmstrip_${args.song || "scene"}.png`);
  const framesDir = path.resolve(ROOT, "tmp", `filmstrip_${Date.now()}`);

  await fs.mkdir(framesDir, { recursive: true });

  const server = await startServer(ROOT);
  const url = buildPlayerUrl(server.origin, {
    scene: rel(scene),
    energy: rel(energy),
    lyrics: rel(lyrics),
    width,
    height,
    fps,
    supersample: 1,
    profile: "draft",
  });

  const browser = await launchBrowser(globalConfig.chrome || {}, { gpu: Boolean(args.gpu) });
  try {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(
      () => (window.__player && window.__player.ready) || window.__playerError,
      null,
      { timeout: 120000 }
    );
    const err = await page.evaluate(() => window.__playerError || null);
    if (err) throw new Error("Player failed to init:\n" + err);

    const duration = Number(args.end ? Number(args.end) - start : await page.evaluate(() => window.__player.duration));
    const times = [];
    for (let i = 0; i < count; i++) times.push(start + (duration * i) / (count - 1 || 1));

    const canvas = page.locator("canvas#gl");
    for (let i = 0; i < times.length; i++) {
      await page.evaluate((t) => window.__player.renderFrame(t), times[i]);
      await canvas.screenshot({ path: path.join(framesDir, `${String(i + 1).padStart(6, "0")}.png`) });
      process.stdout.write(`\r  frame ${i + 1}/${times.length}  t=${times[i].toFixed(2)}s   `);
    }
    process.stdout.write("\n");
    await context.close();

    await tileFrames({
      inputGlob: path.join(framesDir, "%06d.png"),
      outPath,
      grid: `${cols}x${rows}`,
      tileWidth: width,
    });
    console.log(`OK filmstrip ${rel(outPath)}  (${cols}x${rows})`);
    console.log("  timestamps: " + times.map((t) => t.toFixed(2)).join(", "));
  } finally {
    await browser.close();
    await server.close();
    await fs.rm(framesDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error("\nx " + (e && e.message ? e.message : e));
  process.exit(1);
});
