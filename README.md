# Lyric Video Generator

Generate dynamic lyric music videos from any audio file — fully automated with AI.

https://github.com/user-attachments/assets/placeholder

## How It Works

```
Drop audio.mp3 → AI transcribes lyrics → fixes errors via web search
→ analyzes vibe → generates background image → renders MP4 video
```

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/taufiqsheikh1/lyric-vid
cd lyric-vid
npm install

# 2. Add your ElevenLabs API key
export ELEVENLABS_API_KEY="your-key-here"

# 3. Drop an audio file
mkdir -p songs/my-song
cp ~/Downloads/song.mp3 songs/my-song/audio.mp3

# 4. Run with OpenCode
opencode
# Type: "Generate lyric video for my-song"

# Output: output/my-song.mp4
```

## Features

- **Word-level lyric sync** — ElevenLabs `scribe_v2` with word timestamps
- **STT error correction** — Web search finds real lyrics, diffs against transcription, preserves timestamps
- **AI-generated backgrounds** — Pollinations free API generates images from song vibe
- **Audio-reactive particles** — Precomputed 3-band energy drives DOM particle CSS
- **Per-song choreography** — LLM-designed music-dance elements (rings, orbiters, bursts, bars, waves, glow) that dance with the song's energy bands
- **Dynamic typography** — Fonts, colors, animations adapt to song mood
- **5 vibe presets** — Energetic, Melancholic, Aggressive, Dreamy, Romantic

## Architecture

```
songs/<name>/audio.mp3
        │
        ▼
  ElevenLabs STT ──── word timestamps (lyrics-stt.json)
        │
        ▼
  Web search ──────── fix + align (lyrics-fixed.json)
        │
        ▼
  LLM analysis ───── vibe → theme.json
        │
        ▼
  Pollinations API ── background image (bg.jpg)
        │
        ▼
  ffmpeg astats ───── 3-band energy (assets/energy.json)
        │
        ▼
  Hyperframes render ─ output/<name>.mp4
```

## Folder Structure

```
lyric-vid/
├── scripts/
│   ├── analyze-audio.mjs      # ffmpeg 3-band energy → assets/energy.json
│   ├── build-composition.mjs  # theme + lyrics + energy → index.html/compositions
│   └── generate.mjs           # analyze + build wrapper
├── songs/<name>/              # Per-song input/output
│   ├── audio.mp3              # Source audio (required)
│   ├── lyrics-stt.json        # Raw ElevenLabs output
│   ├── lyrics-fixed.json      # Corrected lyrics + timestamps
│   ├── theme.json             # Vibe analysis + theme config
│   └── bg.jpg                 # AI-generated background
├── assets/                    # Generated (gitignored): audio.mp3, bg.jpg, energy.json
├── compositions/              # Generated (gitignored): lyrics.html sub-composition
├── index.html                 # Generated root composition (gitignored)
├── vendor/gsap.min.js         # Vendored GSAP (npm install fails on Android noexec)
├── output/                    # Rendered .mp4 files
├── docs/                      # Dev plans (e.g. PC render verification)
└── .opencode/                 # OpenCode agent & skill configs
    ├── agents/lyric-video.md  # Orchestrator agent (5-step pipeline)
    └── skills/                # song-analysis, lyric-fixing, theme-design
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Video rendering | [Hyperframes](https://github.com/iamdotnet/hyperframes) (HTML + GSAP compositions, captured in headless Chrome) |
| Speech-to-text | [ElevenLabs scribe_v2](https://elevenlabs.io) |
| Background images | [Pollinations.ai](https://pollinations.ai) (free) |
| Lyric fixing | Web search + word alignment |
| Vibe analysis | LLM (via OpenCode) |
| Audio analysis | ffmpeg `astats` (3-band energy) |

## Requirements

- Node.js 18+
- [OpenCode](https://opencode.ai) installed
- ElevenLabs API key (free tier works)
- ffmpeg
- Chrome for rendering (hyperframes auto-downloads `chrome-headless-shell` on first render, or set `HYPERFRAMES_BROWSER_PATH` to a system Chrome)
- Internet access

## License

MIT
