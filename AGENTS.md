# AGENTS.md

Operating manual for the **generalized, deterministic lyric-video designer**.

## What this repo is

A pipeline that turns a song into a high-end lyric video. It is a *general
designer*, not a template library: every song gets a concept invented from
scratch for that song. Frames are rendered at exact timestamps in headless
Chromium and mastered with ffmpeg. Screen-recording is forbidden.

## Core philosophy (do not violate)

- **No templates, no presets, no design schemas.** There is no palette JSON, no
  beat/storyboard schema, no "genre -> style" table, no text-style presets.
- **Measurement vs design.** The pipeline may *measure* data (word timings,
  energy bands), but it must never *dictate* a look. All aesthetic and editorial
  decisions are invented per song and live in that song's `scene.js` (plus
  freeform notes in `concept.md`).
- **General across genres.** Expect pop, rock, hip-hop, country, metal, ambient,
  classical, etc. Use the user's stated vibe; never assume from the lyrics alone.
- **Never reuse one song's aesthetic as a default.** Shared code provides
  primitives only.

## Inputs the user provides

`songs/<name>/`:

- `audio.mp3` - the song.
- `info.txt` - ONE unstructured text file containing the lyrics *and* the
  genre / mood / theme / vibe notes. It may contain section tags like
  `[verse]` / `[chorus]` and prose about the intended feel.

**If `info.txt` or `audio.mp3` is missing, STOP and ask the user.** Do not
transcribe the audio, do not invent lyrics, do not use an LLM to "recreate" the
lyrics. Generating lyrics and then force-fitting them is wrong.

## Workflow

### 1. Ingest (agent-manipulated)

Read `info.txt` and separate it yourself:

- Strip section tags (`[chorus]`, etc.) and vibe prose from the lyrics.
- Write `songs/<name>/lyrics.txt` - clean lyric lines only, in order.
- Write `songs/<name>/concept.md` - your own freeform notes: the concept,
  palette, motion language, text approach, and moments you expect to be risky.
  This is notes for you and the human; nothing reads it. No schema.
- Leave the user's `info.txt` untouched.

### 2. Word timings (one forced-alignment call)

Use the *user's* lyrics (never generated ones):

```bash
node scripts/align-lyrics.mjs --song <name>    # reads lyrics.txt + audio.mp3
```

Produces `lyrics-fixed.json` (words) + `lyrics-lines.json` (karaoke lines).
Requires `ELEVENLABS_API_KEY` and the key must have the `forced_alignment`
permission (else 401 `missing_permissions`). Announce paid calls before spending.

### 3. Energy (local, no API)

```bash
node scripts/analyze-audio.mjs --input songs/<name>/audio.mp3
```

Produces `energy.json` (bass / mid / high / level / beat).

### 4. Invent the concept

From the user's vibe notes, the lyrics, the energy curve, and (optionally) web
research about the song, invent a single original visual idea for *this* song.
Write it in `concept.md`. There is no fixed format and no list of allowed styles.

### 5. Author the scene

Write `songs/<name>/scene.js` from scratch (see `docs/scene-api.md` and the
`threejs-scene-authoring` skill). Choose palette, typography, motion and post-FX
yourself; never look them up from a preset.

### 6. Review + selective vision loop

- Human review in the browser: `node review/serve.mjs --song <name>`. It opens
  the full review URL - never type a bare player URL (it has no scene and shows
  black).
- For moments you cannot predict from code, render a filmstrip and *look* at it
  (`vision-critique` skill). Decide which moments are risky yourself.
- Draft: `node render/render.mjs --song <name> --profile draft`.

### 7. Final render

`node vastai/render-on-vast.mjs --song <name> --dry-run`, then `--yes`
(`vastai-render` skill). Announce cost first. Needs `VAST_API_KEY` in `.env`.

## Commands

```bash
npm install
npm run build:player
node render/render.mjs --song <n> --profile draft
node render/render.mjs --song <n> --profile final
node render/filmstrip.mjs --song <n> --count 16
node review/serve.mjs --song <n>
node scripts/align-lyrics.mjs --song <n>
node scripts/analyze-audio.mjs --input songs/<n>/audio.mp3
```

Verification after code changes:

```bash
npm run build:player
node render/render.mjs --scene scenes/test/scene.js --profile draft --frames 30 --out output/_smoke.mp4
```

## Hard rules (determinism)

- A scene is a **pure function of `t`**. No `requestAnimationFrame` draw loops,
  no `Date.now()` / `performance.now()`, no timers, no `Math.random()` (seeded
  PRNG only).
- Scenes must **not** `import "three"`; use the injected `ctx.THREE`.
- Audio reactivity only via `ctx.energy.sample(t)` (precomputed `energy.json`).
- No network asset fetches during render; bundle fonts with the song.
- Per-frame work is transforms / materials / uniforms only; build geometry once.
  Add `dispose()` if you allocate per-frame resources.

## Conventions

- Scene files live at `songs/<name>/scene.js`; read `docs/scene-api.md` first.
- Read `docs/text-guidance.md` before designing lyrics or titles.
- `songs/` is gitignored - songs are never published to GitHub.
- Don't commit `output/`, `frames/`, `player/dist/`, `tmp/`, or `.env`.
- Windows dev: prefer the edit/write tools; scripts are cross-platform Node ESM.
