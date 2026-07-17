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
- **Audio-reactive particles** — Frequency-band-driven DOM particle system
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
  Remotion render ─── output/<name>.mp4
```

## Folder Structure

```
lyric-vid/
├── src/
│   ├── Root.tsx                  # Composition registration
│   ├── LyricVideo.tsx            # Main scene (Audio + 3 layers)
│   ├── layers/
│   │   ├── BackgroundLayer.tsx   # Ken-burns animated AI image
│   │   ├── ParticleLayer.tsx     # Audio-reactive particles
│   │   └── LyricOverlay.tsx      # Word-level subtitle animations
│   ├── theme/
│   │   ├── types.ts              # ThemeConfig type definitions
│   │   └── presets.ts            # 5 vibe presets + theme resolver
│   └── data/
│       ├── syncedLyrics.ts       # Overwritten with word data each run
│       └── themeConfig.ts        # Overwritten with theme each run
├── songs/<name>/                 # Per-song input/output
│   ├── audio.mp3                 # Source audio (required)
│   ├── lyrics-stt.json           # Raw ElevenLabs output
│   ├── lyrics-fixed.json         # Corrected lyrics + timestamps
│   ├── theme.json                # Vibe analysis + theme config
│   └── bg.jpg                    # AI-generated background
├── public/                       # Remotion static assets
├── output/                       # Rendered .mp4 files
└── .opencode/                    # OpenCode agent & skill configs
    ├── agents/lyric-video.md     # Orchestrator agent (5-step pipeline)
    └── skills/                   # song-analysis, lyric-fixing, theme-design
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Video rendering | [Remotion 4.x](https://remotion.dev) |
| Speech-to-text | [ElevenLabs scribe_v2](https://elevenlabs.io) |
| Background images | [Pollinations.ai](https://pollinations.ai) (free) |
| Lyric fixing | Web search + Levenshtein word alignment |
| Vibe analysis | LLM (via OpenCode) |
| Audio analysis | `@remotion/media-utils` |

## Requirements

- Node.js 18+
- [OpenCode](https://opencode.ai) installed
- ElevenLabs API key (free tier works)
- Internet access

## License

MIT
