---
name: vision-critique
description: Look at filmstrips/keyframes of a scene and critique only the hard-to-predict moments, then edit the code and re-render
---

# Vision critique loop

You have image reading. Use it **only** where code alone cannot tell you whether
something looks right. You decide which moments are risky and list them in
`concept.md`; do not burn renders on simple tweens.

## Procedure (per risky moment)

1. **Review it live first** (fastest, real GPU, real audio):
   ```
   node review/serve.mjs --song <name>
   ```
   It opens the full review URL. Never type a bare player URL - that page has no
   scene and shows black. Scrub to the moment, press Play.
2. **Then look at a filmstrip** around the moment and read the PNG:
   ```
   node render/filmstrip.mjs --song <name> --start <t0> --end <t1> --count 12 --out tmp/strip_<beat>.png
   ```
3. For a specific instant, render one full-res still:
   ```
   node render/render.mjs --song <name> --profile draft --frames 1 --start <t> --out tmp/still.mp4
   ```
   then extract frame 0 to PNG with ffmpeg.
4. Judge against `concept.md`: composition, contrast, lyric legibility, colour,
   whether the intended motion reads across the strip, no blowout/clipping, no
   empty/black frames, no collisions with lyrics.
5. Edit `songs/<name>/scene.js`, rebuild if needed, and re-render the same strip.

## Budget

- Max **2-3 iterations per risky moment**. If still imperfect, accept and move on.
- Never render whole songs at high res just to look - use review + filmstrips.
- After the risky moments pass, do one end-to-end `draft` pass, then hand off to
  the vast.ai final render.

## What to look for

- [ ] Frame is not empty/black; content actually painted.
- [ ] Lyrics readable, centred, not clipped, not washed out by bloom.
- [ ] Text has enough contrast and does not collide with busy geometry.
- [ ] Motion reads as intended across the strip (arc, growth, reveal).
- [ ] Palette is coherent; no muddy or over-saturated wash.
- [ ] No visual noise/aliasing; edges clean.
- [ ] Beat accents land on the music (cross-check the printed timestamps).
