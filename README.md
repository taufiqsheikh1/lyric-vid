# agentic-threejs

A generalized, agentic lyric-video designer. Every song gets an **original
visual concept invented for it** - there are no templates, palettes, genre
presets or design schemas. Frames are rendered at exact timestamps in headless
Chromium and mastered losslessly - **never screen-recorded** - so there are no
dropped frames and sync is exact. Draft renders run on a laptop; finals run on
rented GPU/CPU boxes (vast.ai).

## Why this exists

Screen-recording a live animation drops frames under load and drifts out of
sync. Here, each output frame is drawn at `t = frame / fps` and captured, then
ffmpeg masters the sequence with the same high-fidelity encode
(`libx264 -crf 0 -profile:v high444 -pix_fmt yuv444p`) at any resolution. Same
code, identical output, every run (verified: byte-identical PNGs across runs).

## Inputs

`songs/<name>/`:

- `audio.mp3` - the song.
- `info.txt` - one unstructured file with the lyrics **and** the genre / mood /
  theme / vibe notes. Section tags like `[verse]` / `[chorus]` are fine.

If either is missing, the agent asks the user. Lyrics are never generated.

## Quick start

```bash
npm install
npm run build:player

# prove the pipeline with the throwaway test scene
node render/render.mjs --scene scenes/test/scene.js --profile draft --frames 60

# vision-loop filmstrip (a grid of frames the agent can look at)
node render/filmstrip.mjs --scene scenes/test/scene.js --count 12

# interactive review in your browser (play / scrub / frame-step with audio)
node review/serve.mjs --song <name>
```

## Pipeline

```
songs/<name>/audio.mp3 + info.txt        (user-provided lyrics + vibe notes)
   |  agent extracts clean lyrics.txt and its own freeform concept.md
   v
lyrics.txt
   |  ElevenLabs FORCED ALIGNMENT (user's lyrics -> exact word times)   [API]
   v
lyrics-fixed.json + lyrics-lines.json
   |  ffmpeg -> energy.json (bass/mid/high/beat)          [local, no API]
   v
agent invents a one-off concept and authors scene.js     (no templates)
   |
   v
draft render (laptop) -> review / selective vision loop (filmstrips)
   |
   v
final render on vast.ai -> output/<name>.mp4 (high444 / yuv444p)
```

## Layout

```
player/                 deterministic browser player + review UI (esbuild bundle)
  src/{player,review,text,energy}.js
render/
  render.mjs            frame-by-frame capture + ffmpeg master
  filmstrip.mjs         contact-sheet generator for the vision loop
  lib/{server,chrome,capture,ffmpeg}.mjs
review/
  serve.mjs             interactive browser review server
scripts/
  build-player.mjs      esbuild bundle
  analyze-audio.mjs     energy.json (bass/mid/high + beats)
  align-lyrics.mjs      forced alignment (user lyrics + audio -> word timings)
  caption-to-lyrics.mjs .srt -> lyrics text helper
scenes/test/scene.js    proof-of-method scene
songs/<name>/           per-song inputs + authored scene (gitignored)
vastai/                 Dockerfile + launch/render orchestration + README
docs/scene-api.md       the scene contract (read before writing scenes)
docs/text-guidance.md   typography principles + text primitives
.opencode/              orchestrator agent + skills
```

## Profiles (`render.config.json`)

| profile | resolution | fps | supersample | encode |
|---|---|---|---|---|
| `draft` | 854x480 | 30 | 1x | x264 crf20 yuv420p |
| `final` | 1920x1080 | 60 | 2x | x264 crf0 high444 yuv444p |

## Requirements

- Node 18+ (22 tested), ffmpeg on PATH, Chrome (local) or Playwright Chromium
  (container).
- `ELEVENLABS_API_KEY` in `.env` (forced alignment; needs the
  `forced_alignment` permission).
- For finals: vast.ai account + `vastai` CLI + `VAST_API_KEY` + a pushed image
  (`vastai/README.md`).

## Docs

- Scene contract: `docs/scene-api.md`
- Text/typography: `docs/text-guidance.md`
- Operating manual: `AGENTS.md`
- Container/final render: `vastai/README.md`
