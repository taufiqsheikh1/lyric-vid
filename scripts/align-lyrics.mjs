#!/usr/bin/env node
// ElevenLabs FORCED ALIGNMENT: give it the audio + the CORRECT (user-supplied)
// lyrics text, get back exact per-word timings. This is the only automated
// timing step; never generate lyrics with STT and force-fit them.
//
// The user provides songs/<name>/info.txt (lyrics + vibe notes). The agent
// extracts clean lyric lines into songs/<name>/lyrics.txt BEFORE running this.
//
//   # key from .env (ELEVENLABS_API_KEY) or env, or pass --key
//   node scripts/align-lyrics.mjs --song my-song
//   node scripts/align-lyrics.mjs --audio songs/m/audio.mp3 --text songs/m/lyrics.txt
//   node scripts/align-lyrics.mjs --song my-song --min-loss 0.35
//
// Inputs (defaults derived from --song <name>):
//   songs/<name>/audio.mp3     (or --audio)
//   songs/<name>/lyrics.txt    (or --text)
//
// Outputs (written next to the audio):
//   lyrics-fixed.json   flat array [{text,start,end,type:"word"}]
//   lyrics-lines.json   array [{text,start,end,type:"line",words:[...]}]  (karaoke lines)
//   lyrics-align-raw.json  raw API response (debug)
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/env.mjs";

loadEnv();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io/v1/forced-alignment";
const round3 = (n) => Math.round(Number(n) * 1000) / 1000;

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

// Drop blank lines and section tags like "[Chorus]" — they are not sung.
function lyricLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\[[^\]]*\]$/.test(l) && !/^\([^)]*\)$/.test(l));
}

function toWord(w) {
  return { text: String(w.text).trim(), start: round3(w.start), end: round3(w.end), type: "word" };
}

// Group aligned words into the provided lyric lines (order + count preserved).
function groupByLines(lines, words) {
  let i = 0;
  return lines.map((line) => {
    const toks = line.split(/\s+/).filter(Boolean);
    const slice = words.slice(i, i + toks.length);
    i += toks.length;
    if (!slice.length) return null;
    return {
      text: toks.join(" "),
      start: slice[0].start,
      end: slice[slice.length - 1].end,
      type: "line",
      words: slice,
    };
  });
}

// Fallback when token counts differ: split into lines at silence gaps.
function groupByPauses(words, gap = 0.7) {
  const out = [];
  let cur = [];
  for (const w of words) {
    if (cur.length && w.start - cur[cur.length - 1].end > gap) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out.map((ws) => ({
    text: ws.map((w) => w.text).join(" "),
    start: ws[0].start,
    end: ws[ws.length - 1].end,
    type: "line",
    words: ws,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const song = args.song;

  const audioArg = args.audio || (song ? path.join("songs", song, "audio.mp3") : null);
  const textArg = args.text || args.lyrics || (song ? path.join("songs", song, "lyrics.txt") : null);
  if (!audioArg) throw new Error("Pass --song <name> or --audio <file>");
  if (!textArg) throw new Error("Pass --song <name> or --text <lyrics.txt>");

  const audioPath = path.resolve(ROOT, audioArg);
  const textPath = path.resolve(ROOT, textArg);
  const key =
    args.key ||
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVENLABS_KEY ||
    process.env.XI_API_KEY;
  if (!key) {
    throw new Error(
      "No ElevenLabs API key. Set ELEVENLABS_API_KEY (e.g. in .env at the repo root) or pass --key."
    );
  }

  if (!existsSync(textPath)) {
    const info = song ? path.join("songs", song, "info.txt") : null;
    throw new Error(
      `Missing clean lyrics: ${textArg}\n` +
        (info ? `Provide ${info} (lyrics + vibe) and extract the lyric lines into lyrics.txt first. ` : "") +
        `Never generate lyrics automatically; the user's own lyrics are required.`
    );
  }
  const rawText = await fs.readFile(textPath, "utf8");
  const lines = lyricLines(rawText);
  if (!lines.length) throw new Error(`No lyric lines found in ${textArg}`);
  const alignText = lines.join("\n");
  const expected = alignText.split(/\s+/).filter(Boolean);

  const buf = await fs.readFile(audioPath);
  const form = new FormData();
  form.append("file", new Blob([buf]), path.basename(audioPath));
  form.append("text", alignText);

  console.log(
    `▶ forced-aligning ${path.relative(ROOT, audioPath)} (${(buf.length / 1e6).toFixed(1)}MB)` +
      ` against ${expected.length} words in ${lines.length} lines`
  );

  const res = await fetch(API, { method: "POST", headers: { "xi-api-key": key }, body: form });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status} ${res.statusText}\n${body.slice(0, 800)}`);
  }
  const data = await res.json();
  const words = (data.words || []).map(toWord).filter((w) => w.text);
  if (!words.length) throw new Error("Forced alignment returned no words.");

  const groupable = expected.length === words.length;
  const grouped = (groupable ? groupByLines(lines, words) : groupByPauses(words)).filter(Boolean);
  if (!groupable) {
    console.warn(
      `⚠ token count mismatch (sent ${expected.length}, aligned ${words.length}); ` +
        `grouped by pauses instead of lyric lines. Check for extra/missing lyrics.`
    );
  }

  const maxLoss = Math.max(...words.map((_, i) => Number(data.words[i]?.loss ?? 0)));
  const minLoss = args["min-loss"] !== undefined ? Number(args["min-loss"]) : null;
  const worst = data.words
    .map((w, i) => ({ text: words[i]?.text ?? w.text, loss: Number(w.loss ?? 0) }))
    .sort((a, b) => b.loss - a.loss)
    .slice(0, 5);

  const dir = path.dirname(audioPath);
  const outWords = args.out ? path.resolve(ROOT, args.out) : path.join(dir, "lyrics-fixed.json");
  const outLines = path.join(dir, "lyrics-lines.json");
  const outRaw = path.join(dir, "lyrics-align-raw.json");

  await fs.writeFile(outWords, JSON.stringify(words, null, 2));
  await fs.writeFile(outLines, JSON.stringify(grouped, null, 2));
  await fs.writeFile(outRaw, JSON.stringify(data, null, 2));

  const dur = words[words.length - 1].end;
  console.log(
    `✓ ${path.relative(ROOT, outWords)}  words=${words.length}  lines=${grouped.length}  ` +
      `duration=${dur.toFixed(2)}s  loss=${(data.loss ?? 0).toFixed(3)} (max word ${maxLoss.toFixed(3)})`
  );
  console.log(
    "  highest-loss words: " + worst.map((w) => `"${w.text}"(${w.loss.toFixed(2)})`).join("  ")
  );
  if (minLoss !== null && maxLoss > minLoss) {
    console.warn(
      `⚠ some words exceed --min-loss ${minLoss}: the supplied lyrics may not match this audio.`
    );
  }
}

main().catch((e) => {
  console.error("✗ " + (e && e.message ? e.message : e));
  process.exit(1);
});
