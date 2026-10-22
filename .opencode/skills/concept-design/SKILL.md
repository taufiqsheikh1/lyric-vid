---
name: concept-design
description: Invent an original, song-specific visual concept (no templates, no presets) and note which moments must be validated visually
---

# Concept design

You are a designer, not a form-filler. For **this** song, invent one idea that
could not be the default for any other song. There is no palette schema, no beat
JSON, no genre->style table. Do not copy another song's look.

## Inputs to read

- The user's `info.txt` vibe/theme/genre notes (the strongest signal).
- `lyrics.txt` (what the song is actually about, and its structure).
- `energy.json` via the numbers (where it is quiet, where it explodes).
- Optional: web research about the song/artist/genre context.

If the user stated a vibe, honor it. If not, ask rather than guessing from the
lyrics alone.

## What to write

Freeform notes in `songs/<name>/concept.md`. Suggested (not required) shape:

- **Thesis** - the one visual idea, in a sentence.
- **Why this song** - the images/words/music that suggested it.
- **Palette** - your chosen colours and why.
- **Typography** - display + lyric approach (see `docs/text-guidance.md`).
- **Motion language** - how the camera and elements move and breathe.
- **Structure** - what happens across the song, section by section.
- **Risky moments** - the 2-4 beats you cannot predict from code and must
  verify visually (shader behaviour, dense choreography, text/geometry
  collisions, potential blowout).

This file is notes for you and the human. Nothing reads it. Keep it honest and
specific; no boilerplate.

## Rules

- One song, one idea. If two ideas fight, pick the stronger.
- Keep the centre readable for lyrics; put busy motion at the edges.
- Favour a few strong moving elements over many weak ones.
- Do not invent a "preset name". Describe the actual look in concrete terms.
- Note only genuinely uncertain moments as risky; simple tweens are safe.
