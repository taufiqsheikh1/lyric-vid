# Lyric Video Generator

An AI-powered system that generates lyric music videos using Remotion, ElevenLabs STT, and Pollinations AI.

## Project Overview

This project creates dynamic lyric videos with:
- AI-generated background images based on song vibe
- Audio-reactive particle effects
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
   - Render the final MP4 video with Remotion

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
Remotion renders: particles + lyrics + bg → MP4 video
```

## Requirements

- Node.js 18+
- Remotion 4.x
- ElevenLabs API key (env: `ELEVENLABS_API_KEY`)
- Internet access (for lyric search and AI image generation)

## Folder Structure

```
songs/<name>/       → per-song input/output
  audio.mp3         → source audio file
  lyrics-stt.json   → raw ElevenLabs transcription
  lyrics-fixed.json → corrected lyrics + timestamps
  theme.json        → vibe analysis + theme config
  bg.jpg            → AI-generated background image
output/<name>.mp4   → rendered video
```

## Pipeline Details

See `.opencode/agents/lyric-video.md` for the orchestrator agent's step-by-step workflow.
See `.opencode/skills/` for detailed guidance on each phase.
