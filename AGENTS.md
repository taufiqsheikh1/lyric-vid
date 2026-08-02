# Lyric Video Generator

An AI-powered system that generates lyric music videos using Hyperframes, ElevenLabs STT, and Pollinations AI.

## Project Overview

This project creates dynamic lyric videos with:
- AI-generated background images based on song vibe
- Audio-reactive particle effects (precomputed energy bands)
- Word-level synchronized lyrics with animated typography
- Dynamic theming (colors, fonts, animations) based on song mood

## How to Use

1. Create a folder in `songs/` with your song name:
   ```
   songs/my-song/
   └── audio.mp3
   ```

2. Message OpenCode: "Generate lyric video for `my-song`"

3. The orchestrator agent (`lyric-video`) will:
   - Transcribe audio with ElevenLabs (word-level timestamps)
   - Search the internet for correct lyrics and fix STT errors
   - Analyze song vibe (mood, genre, energy)
   - Generate AI background image with Pollinations
   - Analyze audio into bass/mid/high energy bands
   - Generate the Hyperframes composition and render the final MP4 video

## Architecture

```
song audio → ElevenLabs STT → word timestamps
     ↓
web search → correct lyrics → fix + align timestamps
     ↓
LLM analysis → vibe (mood/genre/energy/colors)
     ↓
Pollinations API → AI background image
     ↓
ffmpeg astats → 3-band energy → assets/energy.json
     ↓
Hyperframes composition (index.html + compositions/) → MP4 video
```

## Requirements

- Node.js 18+
- Hyperframes (dev dependency; render must run on a PC — this Android workspace is `noexec`, so native binaries like esbuild/onnxruntime can't run here)
- ElevenLabs API key (env: `ELEVENLABS_API_KEY`)
- ffmpeg (for energy band analysis)
- Internet access (for lyric search and AI image generation)

## Folder Structure

```
songs/<name>/       → per-song input/output
  audio.mp3         → source audio file
  lyrics-stt.json   → raw ElevenLabs transcription
  lyrics-fixed.json → corrected lyrics + timestamps
  theme.json        → vibe analysis + theme config
  bg.jpg            → AI-generated background image
scripts/            → analyze/build/generate Node scripts
assets/             → generated: audio.mp3, bg.jpg, energy.json (gitignored)
compositions/       → generated: lyrics.html sub-composition (gitignored)
index.html          → generated root composition (gitignored)
output/<name>.mp4   → rendered video
```

## Pipeline Details

See `.opencode/agents/lyric-video.md` for the orchestrator agent's step-by-step workflow.
See `.opencode/skills/` for detailed guidance on each phase.

## Local Workflow (on this device)

```bash
npm run analyze -- --input songs/<name>/audio.mp3   # ffmpeg 3-band energy → assets/energy.json
npm run generate -- songs/<name>    # build index.html + compositions/lyrics.html
npm run check                       # JSON schema checks (no native binaries)
# Render (PC only):
npx hyperframes lint
npx hyperframes render --output output/<name>.mp4
```

## Hyperframes Model Notes

- Plain HTML compositions with `data-composition-id`, `data-start`, `data-duration`, `data-width/height`, `data-track-index`; media (`<audio>`, `<video>`) playback owned by the framework.
- Animation = GSAP timelines registered on `window.__timelines["<composition-id>"]` (paused; framework seeks/plays them).
- Sub-compositions referenced via `data-composition-src`.
- Audio reactivity is precomputed (no live WebAudio during capture): ffmpeg 3-band analysis → `assets/energy.json`, baked into the GSAP timeline as `tl.set("#root", {"--bass":...})` per 0.1s, which drives CSS vars used by particle `calc()`.
- `vendor/gsap.min.js` is vendored (npm install fails on Android due to `noexec`).
