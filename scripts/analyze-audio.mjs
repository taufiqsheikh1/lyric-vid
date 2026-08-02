#!/usr/bin/env node
// analyze-audio.mjs
//
// Precomputes a seek-safe "energy track" from an audio file so Hyperframes
// compositions can react to the music without live WebAudio (the framework
// owns media playback during capture).
//
// Uses ffmpeg to split the audio into three bands (bass/mid/high), measures
// RMS loudness in 0.1s windows, and writes a normalized {bass, mid, high}
// array into energy.json.
//
// Usage:
//   node scripts/analyze-audio.mjs --input songs/<name>/audio.mp3 [--output assets/energy.json]

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

const WINDOW_SEC = 0.1;
const TARGET_RATE = 10;
const BANDS = [
  { id: "bass", filter: "lowpass=f=250" },
  { id: "mid", filter: "bandpass=f=800:w=1600" },
  { id: "high", filter: "highpass=f=2500" },
];

function parseArgs(argv) {
  const args = { input: null, output: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "-i") args.input = argv[++i];
    else if (a === "--output" || a === "-o") args.output = argv[++i];
  }
  return args;
}

async function getAudioDuration(file) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const dur = parseFloat(stdout.trim());
  if (!Number.isFinite(dur) || dur <= 0) throw new Error("Could not determine audio duration");
  return dur;
}

async function analyze(file) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "lyric-vid-analyze-"));
  const outFiles = {};
  const filterParts = [];
  const maps = [];
  let i = 0;

  try {
    for (const band of BANDS) {
      const label = `[b${i}]`;
      const outFile = path.join(tmpDir, `${band.id}.txt`);
      outFiles[band.id] = outFile;
      filterParts.push(
        `[0:a]aresample=22050,${band.filter},astats=metadata=1:reset=${WINDOW_SEC},` +
          `ametadata=print:key=lavfi.astats.Overall.RMS_level:file=${outFile}${label}`,
      );
      maps.push("-map", label);
      i++;
    }

    const filter = filterParts.join(";");
    await execFileAsync("ffmpeg", [
      "-v", "error",
      "-i", file,
      "-filter_complex", filter,
      ...maps,
      "-f", "null", "-",
    ]);

    const energies = {};
    for (const band of BANDS) {
      const raw = await fs.readFile(outFiles[band.id], "utf8");
      const samples = [];
      for (const line of raw.split("\n")) {
        const m = line.match(/lavfi\.astats\.Overall\.RMS_level=(-?[\d.]+|-inf)/);
        if (!m) continue;
        const db = m[1] === "-inf" ? -120 : parseFloat(m[1]);
        samples.push(Math.pow(10, db / 20));
      }
      energies[band.id] = samples;
    }

    return energies;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function normalize(arr) {
  const max = Math.max(...arr, 1e-6);
  return arr.map((v) => Math.pow(v / max, 0.75));
}

// ffmpeg's astats emits one sample per audio frame (~38/s), repeating the
// same reset-window value a few times. Resample to a clean fixed rate by
// averaging bucket windows so the timeline size stays predictable.
function resample(arr, duration) {
  const targetCount = Math.max(1, Math.round(duration * TARGET_RATE));
  const out = [];
  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor((i / targetCount) * arr.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / targetCount) * arr.length));
    let sum = 0;
    for (let j = start; j < end; j++) sum += arr[j];
    out.push(sum / (end - start));
  }
  return out;
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));
  if (!input) {
    console.error("Usage: node scripts/analyze-audio.mjs --input <audio.mp3> [--output assets/energy.json]");
    process.exit(1);
  }

  const outPath = output ?? "assets/energy.json";
  const [energies, duration] = await Promise.all([
    analyze(input),
    getAudioDuration(input),
  ]);

  const result = {
    sampleRate: TARGET_RATE,
    windowSec: WINDOW_SEC,
    duration,
    bass: normalize(resample(energies.bass, duration)),
    mid: normalize(resample(energies.mid, duration)),
    high: normalize(resample(energies.high, duration)),
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(result));
  console.log(
    `✓ ${path.basename(input)} -> ${outPath} ` +
      `(${result.bass.length} samples @ ${result.sampleRate}Hz, ${duration.toFixed(2)}s)`,
  );
}

main().catch((err) => {
  console.error("analyze-audio failed:", err.message);
  process.exit(1);
});
