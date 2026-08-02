#!/usr/bin/env node
// generate.mjs
//
// One-command pipeline for the rendering step of a lyric video:
//   1. analyze-audio.mjs  -> assets/energy.json (ffmpeg band energies)
//   2. build-composition.mjs -> index.html + compositions/lyrics.html + assets/
//
// Usage:
//   node scripts/generate.mjs songs/<name>
//
// After this, run (on a machine with a working headless Chrome):
//   npx hyperframes lint
//   npx hyperframes render --output output/<name>.mp4

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(script, args) {
  const node = process.execPath;
  execFileSync(node, [path.join(ROOT, "scripts", script), ...args], {
    stdio: "inherit",
    cwd: ROOT,
  });
}

const song = process.argv[2];
if (!song || !song.startsWith("songs/")) {
  console.error("Usage: node scripts/generate.mjs songs/<name>");
  process.exit(1);
}

const songAbs = path.resolve(ROOT, song);
const songId = path.basename(songAbs);
const energyOut = path.join(ROOT, "assets", "energy.json");

try {
  run("analyze-audio.mjs", ["--input", path.join(songAbs, "audio.mp3"), "--output", energyOut]);
  run("build-composition.mjs", ["--song", song]);
  console.log("\nNext: npx hyperframes lint && npx hyperframes render --output output/" + songId + ".mp4");
} catch (err) {
  console.error("generate failed:", err.message);
  process.exit(1);
}
