#!/usr/bin/env node
// Interactive review server. Opens a real-time player in your browser where you
// can play the scene with the song, scrub, and step frame-by-frame.
//
//   node review/serve.mjs --song my-song
//   node review/serve.mjs --scene scenes/test/scene.js
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { startServer } from "../render/lib/server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => (p ? path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join("/") : undefined);
const firstExisting = (...paths) => paths.find((p) => p && existsSync(path.resolve(ROOT, p)));

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2);
    const n = argv[i + 1];
    if (n === undefined || n.startsWith("--")) a[k] = true;
    else (a[k] = n), i++;
  }
  return a;
}

function openBrowser(url) {
  const plat = process.platform;
  try {
    if (plat === "win32") spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    else if (plat === "darwin") spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    else spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* ignore */
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let scene, audio, lyrics, energy;

  if (args.song) {
    const d = path.join("songs", args.song);
    scene = firstExisting(`${d}/scene.js`);
    audio = firstExisting(`${d}/audio.mp3`, `${d}/audio.wav`, `${d}/audio.m4a`);
    lyrics = firstExisting(`${d}/lyrics-lines.json`, `${d}/lyrics-fixed.json`, `${d}/lyrics.json`);
    energy = firstExisting(`${d}/energy.json`);
    if (!energy) console.warn("⚠ no energy.json — run: node scripts/analyze-audio.mjs --input " + d + "/audio.mp3");
  }
  scene = args.scene || scene;
  audio = args.audio || audio;
  lyrics = args.lyrics || lyrics;
  energy = args.energy || energy;

  if (!scene) throw new Error("Pass --song <name> or --scene <path>");

  const width = Number(args.width || 1280);
  const height = Number(args.height || 720);
  const fps = Number(args.fps || 30);
  const port = Number(args.port || 5173);

  const server = await startServer(ROOT, { port: port });
  const q = new URLSearchParams({
    mode: "review",
    scene: rel(scene),
    width: String(width),
    height: String(height),
    fps: String(fps),
    supersample: String(args.supersample || 1),
    profile: "review",
  });
  if (audio) q.set("audio", rel(audio));
  if (lyrics) q.set("lyrics", rel(lyrics));
  if (energy) q.set("energy", rel(energy));

  const url = `${server.origin}/player/index.html?${q.toString()}`;
  console.log("▶ review server running");
  console.log("  " + url);
  console.log("  space=play/pause  ←/→=frame  shift+←/→=1s  h=hide UI  (Ctrl+C to stop)");
  if (!args["no-open"]) openBrowser(url);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("✗ " + (e && e.message ? e.message : e));
  process.exit(1);
});
