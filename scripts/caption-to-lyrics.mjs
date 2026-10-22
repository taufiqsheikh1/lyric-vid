#!/usr/bin/env node
// Converts a caption file (.srt) or an ElevenLabs word JSON into the pipeline's
// lyrics-fixed.json. SRT is line-level by default; pass --words to also emit
// word-level karaoke entries (timings interpolated across each cue).
//
//   node scripts/caption-to-lyrics.mjs --input songs/my-song/captions.srt
//   node scripts/caption-to-lyrics.mjs --input cap.srt --words --out lyrics-fixed.json
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

const toSec = (s) => {
  const m = s.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000 : 0;
};

function parseSrt(text) {
  const cues = [];
  for (const block of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const tc = lines.findIndex((l) => l.includes("-->"));
    if (tc === -1) continue;
    const [a, b] = lines[tc].split("-->").map((s) => s.trim());
    const body = lines.slice(tc + 1).join(" ").trim();
    if (body) cues.push({ start: toSec(a), end: toSec(b), text: body });
  }
  return cues;
}

function expandWords(cue) {
  const words = cue.text.split(/\s+/).filter(Boolean);
  const total = words.reduce((a, w) => a + w.length, 0) || 1;
  const span = Math.max(0, cue.end - cue.start);
  let t = cue.start;
  return words.map((w) => {
    const d = span * (w.length / total);
    const entry = { text: w, start: +t.toFixed(3), end: +(t + d).toFixed(3), type: "word" };
    t += d;
    return entry;
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error("Pass --input <captions.srt | words.json>");
  const input = path.resolve(ROOT, args.input);
  const raw = await fs.readFile(input, "utf8");

  let out = [];
  const looksJson = input.toLowerCase().endsWith(".json") || raw.trimStart().startsWith("{") || raw.trimStart().startsWith("[");

  if (looksJson) {
    const json = JSON.parse(raw);
    const words = Array.isArray(json) ? json : json.words || [];
    out = words
      .filter((w) => !w.type || w.type === "word")
      .map((w) => ({ text: String(w.text).trim(), start: Number(w.start), end: Number(w.end), type: "word" }))
      .filter((w) => w.text);
  } else {
    const cues = parseSrt(raw);
    if (!cues.length) throw new Error("No SRT cues parsed.");
    out = args.words ? cues.flatMap(expandWords) : cues.map((c) => ({ ...c, type: "line" }));
  }

  const dur = out.reduce((m, e) => Math.max(m, e.end), 0);
  const outPath = path.resolve(
    ROOT,
    args.out || path.join(path.dirname(args.input), "lyrics-fixed.json")
  );
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(
    `✓ ${path.relative(ROOT, outPath)}  entries=${out.length} type=${out[0]?.type || "-"} duration=${dur.toFixed(2)}s`
  );
}

main().catch((e) => {
  console.error("✗ " + (e && e.message ? e.message : e));
  process.exit(1);
});
