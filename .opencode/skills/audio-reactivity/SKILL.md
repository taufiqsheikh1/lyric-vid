---
name: audio-reactivity
description: Use the precomputed energy bands and beat grid to drive scene motion deterministically
---

# Audio reactivity

Reactivity is **precomputed** into `songs/<name>/energy.json` by
`node scripts/analyze-audio.mjs --input songs/<name>/audio.mp3` and sampled at
render time with `ctx.energy.sample(t)`. This is measurement only - it tells you
*when* things happen, never *how the video should look*.

## What you get

```
sample(t) -> { bass, mid, high, level, beat }
```

- `bass|mid|high|level` are normalized `0..1` envelopes at `rate` Hz (default 30).
- `beat` is a `1 -> 0` impulse over about 120 ms after each detected onset.

## How to use it musically

| band | feels like | can drive |
|---|---|---|
| `bass` | thump, weight | core scale, floor shake, ring radius |
| `mid` | body, warmth | glow strength, camera drift, colour shift |
| `high` | sparkle, air | particle jitter, shard shimmer, bloom radius |
| `beat` | accents | flashes, hard cuts, single-frame pops |
| `level` | overall loudness | master brightness/intensity |

These are starting points, not rules. Choose the mapping yourself per song.

## Rules

- `render(t)` may jump (frames render out of order under workers), so **do not
  accumulate state across frames**. Compute purely from `t`, or derive smoothing
  analytically (e.g. `Math.sin(t * k)` envelopes) instead of storing the
  previous value.
- Never read live audio; `energy.json` must exist before rendering. If it is
  missing, ask the orchestrator to run the analyzer.

## Regenerating

```
node scripts/analyze-audio.mjs --input songs/<name>/audio.mp3   # -> songs/<name>/energy.json
```
