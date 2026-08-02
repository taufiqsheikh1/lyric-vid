# Stage 2: PC Render Verification Plan

This stage validates the Hyperframes refactor (stage 1, branch `refactor/hyperframes`) on a PC.
Rendering requires native binaries (esbuild, sharp, onnxruntime) that cannot run on the Android
`noexec` workspace — hence this runs on a real machine.

## Preconditions

- A song is present with pipeline outputs: `songs/<name>/audio.mp3`, `lyrics-fixed.json`, `theme.json`, `bg.jpg`
- `assets/energy.json` exists (run `npm run analyze -- songs/<name>` if not)
- `index.html` + `compositions/lyrics.html` generated (run `npm run generate -- songs/<name>` if not)
- Node.js 18+ installed

## Steps

### 1. Install dependencies

```bash
npm install
```

> Note: the Android `.npmrc` sets `bin-links=false` and the lockfile was created with
> `--force --ignore-scripts`. On PC, run a clean `npm install` (or `rm -rf node_modules package-lock.json && npm install`)
> so native binaries (esbuild, sharp, onnxruntime-node) build correctly.

### 2. Lint the composition

```bash
npx hyperframes lint
```

Expected: passes with no schema errors. Fix any issues raised and re-run
`npm run generate -- songs/<name>` + `npx hyperframes lint`.

### 3. Inspect compositions

```bash
npx hyperframes compositions      # list compositions (root + lyrics sub-comp)
npx hyperframes info              # show resolved project/composition metadata
```

Sanity checks:
- Root: `data-composition-id="root"`, `data-width="1920"`, `data-height="1080"`, `data-duration` = song duration
- Lyrics sub-composition resolves via `data-composition-src="compositions/lyrics.html"`
- 5 tracks: 0=audio, 1=bg image, 2=overlay, 3=particles, 4=lyrics host

### 4. Preview (optional, visual check)

```bash
npx hyperframes preview
```

Verify: Ken Burns bg, particles pulse with energy, word-by-word karaoke sync,
highlight/glow on active word, chunk wrapping around ~10–14 words.

### 5. Render

```bash
npx hyperframes render --output output/<name>.mp4
```

- Defaults to `index.html` (omit `--composition`).
- Add `--fps 30` to match the theme's `fps` if not auto-detected.

### 6. Verify output

- Play `output/<name>.mp4`; check duration, audio sync, lyric timing, particle reactivity.
- Optionally render a low-quality fast pass first: `--quality draft`.

## Known Risks / Fallbacks

- **GSAP timeline seeking**: framework seeks paused timelines. If a sub-composition timeline
  (`window.__timelines["lyrics"]`) isn't picked up, verify the sub-comp is registered on
  `window.__timelines` under its `data-composition-id` and that it runs in a `<template>` wrapper.
- **CSS var reactivity**: `--bass/--mid/--high` are set via `tl.set("#root", ...)` per 0.1s.
  If particles don't react, check `calc(var(--bass,0))` usage resolves during capture (no live WebAudio).
- **Font loading**: Google Fonts `<link>` in generated HTML needs network during render.

## Done Criteria

- `npx hyperframes lint` passes
- `npx hyperframes render --output output/<name>.mp4` produces a playable MP4
- Lyrics sync correctly to audio word timestamps
