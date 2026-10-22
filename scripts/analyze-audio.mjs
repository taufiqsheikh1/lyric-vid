#!/usr/bin/env node
// Precomputes audio-reactivity bands from a song, deterministically.
// Output feeds ctx.energy.sample(t) during rendering (never live WebAudio).
//
//   node scripts/analyze-audio.mjs --input songs/my-song/audio.mp3
//   node scripts/analyze-audio.mjs --input song.wav --rate 30 --out energy.json
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function decodePcm(file, sampleRate) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "ffmpeg",
      ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sampleRate), "-f", "s16le", "-"],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    const chunks = [];
    let err = "";
    p.stdout.on("data", (c) => chunks.push(c));
    p.stderr.on("data", (c) => (err += c));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error("ffmpeg failed: " + err));
      const buf = Buffer.concat(chunks);
      const n = Math.floor(buf.length / 2);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i * 2) / 32768;
      resolve(out);
    });
  });
}

const lowpass = (fs, f0, q = 0.707) => {
  const w = (2 * Math.PI * f0) / fs, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  return { b0: (1 - c) / 2, b1: 1 - c, b2: (1 - c) / 2, a0: 1 + al, a1: -2 * c, a2: 1 - al };
};
const highpass = (fs, f0, q = 0.707) => {
  const w = (2 * Math.PI * f0) / fs, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  return { b0: (1 + c) / 2, b1: -(1 + c), b2: (1 + c) / 2, a0: 1 + al, a1: -2 * c, a2: 1 - al };
};

function biquad(samples, { b0, b1, b2, a0, a1, a2 }) {
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = B0 * x0 + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

function rmsEnvelope(samples, sampleRate, rate) {
  const win = Math.max(1, Math.round(sampleRate / rate));
  const n = Math.floor(samples.length / win);
  const out = new Float32Array(n);
  for (let w = 0; w < n; w++) {
    let sum = 0;
    const start = w * win;
    for (let i = 0; i < win; i++) {
      const v = samples[start + i];
      sum += v * v;
    }
    out[w] = Math.sqrt(sum / win);
  }
  return out;
}

function percentileNorm(arr, p = 0.95) {
  const sorted = Float32Array.from(arr).sort();
  const ref = sorted[Math.floor(sorted.length * p)] || 1;
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = Math.min(1, arr[i] / (ref || 1));
  return out;
}

function detectBeats(env, rate) {
  const beats = [];
  const win = Math.max(1, Math.round(rate * 0.5));
  let sum = 0;
  for (let i = 0; i < env.length; i++) {
    sum += env[i];
    if (i >= win) sum -= env[i - win];
    const avg = sum / Math.min(i + 1, win);
    const prev = env[i - 1] ?? 0;
    const next = env[i + 1] ?? 0;
    if (env[i] >= prev && env[i] >= next && env[i] > 0.35 && env[i] > avg * 1.6) {
      const t = i / rate;
      if (!beats.length || t - beats[beats.length - 1] > 0.18) beats.push(t);
    }
  }
  return beats;
}

const round4 = (arr) => Array.from(arr, (v) => Math.round(v * 10000) / 10000);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error("Pass --input <audio file>");
  const input = path.resolve(ROOT, args.input);
  const rate = Number(args.rate || 30);
  const sampleRate = 16000;
  const out = path.resolve(ROOT, args.out || path.join(path.dirname(args.input), "energy.json"));

  console.log(`▶ analyzing ${args.input} @ ${rate}Hz`);
  const pcm = await decodePcm(input, sampleRate);
  const duration = pcm.length / sampleRate;

  const bassSig = biquad(pcm, lowpass(sampleRate, 150));
  const midSig = biquad(biquad(pcm, highpass(sampleRate, 200)), lowpass(sampleRate, 2000));
  const highSig = biquad(pcm, highpass(sampleRate, 3000));
  const levelSig = pcm;

  const bass = percentileNorm(rmsEnvelope(bassSig, sampleRate, rate));
  const mid = percentileNorm(rmsEnvelope(midSig, sampleRate, rate));
  const high = percentileNorm(rmsEnvelope(highSig, sampleRate, rate));
  const level = percentileNorm(rmsEnvelope(levelSig, sampleRate, rate));
  const beats = detectBeats(percentileNorm(rmsEnvelope(bassSig, sampleRate, rate)), rate);

  const data = {
    rate,
    sampleRate,
    duration: Math.round(duration * 1000) / 1000,
    frames: level.length,
    beats: beats.map((b) => Math.round(b * 1000) / 1000),
    bass: round4(bass),
    mid: round4(mid),
    high: round4(high),
    level: round4(level),
  };

  await fs.writeFile(out, JSON.stringify(data));
  console.log(
    `✓ ${path.relative(ROOT, out)}  frames=${data.frames} duration=${data.duration}s beats=${beats.length}`
  );
}

main().catch((e) => {
  console.error("✗ " + (e && e.message ? e.message : e));
  process.exit(1);
});
