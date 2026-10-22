# Text guidance (lyrics + titles)

Text is the product. The visuals support it. This file gives principles and
low-level primitives - **not styles**. Every song's typography is invented for
that song; never copy another song's treatment.

## Data you start with

`lyrics-lines.json` gives you, per line:

```
{ "text": "...", "start": 12.4, "end": 15.1,
  "words": [ { "text": "...", "start": 12.4, "end": 12.7 }, ... ] }
```

Word timings are exact (forced alignment). Use them; do not re-estimate.

## Principles

1. **Legibility beats decoration.** If a word is hard to read, the treatment is
   wrong - no matter how cool it looks.
2. **Contrast is guaranteed, not hoped for.** The background moves. Give text a
   contrast strategy: a dark/light scrim, an outline, a shadow, or a stable
   region of the frame.
3. **One line at a time, mostly.** Show the line that is being sung, with the
   active word clearly distinguished. Avoid walls of text.
4. **Motion follows meaning.** Rising lines can rise; heavy lines can land;
   long vowels can hold. Match the edit to the vocal, not to a generic loop.
5. **Hierarchy.** Titles may be large and expressive; lyrics should be calm and
   consistent so the eye can track them.
6. **Safe areas.** Keep text inside a consistent margin and away from faces,
   the focal object, and busy particles.
7. **Restraint.** Not every word needs an effect. A strong base look + a few
   accent beats reads better than constant motion.

## Primitives (`player/src/text.js`)

`createTextTexture(text, opts)` / `createTextMesh(THREE, text, opts)`:

- `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `letterSpacing`,
  `lineHeight`, `align` - typographic controls.
- `color` or `gradient` - solid or vertical gradient fill.
- `strokeColor` / `strokeWidth` - outline for contrast.
- `shadowColor` / `shadowBlur` / `shadowOffsetX/Y` - soft drop shadow.
- `glowColor` / `glowBlur` - halo (can combine with the shadow).
- `maxWidth` - wrap long lines automatically.
- `scrim` - `{ color, radius, inset }` contrast plate drawn behind the text.
- `resolutionScale` - texture crispness (raise for final, lower for draft).

Quote font families that contain spaces: `'"Exo 2", sans-serif'`. Unquoted
multi-word names silently fail.

## Karaoke techniques (choose per song, don't preset them)

- **Active-word emphasis**: scale and/or brighten the word being sung, dim the
  rest. Drive from `word.start`/`word.end`.
- **Fill sweep**: reveal a coloured copy of the line proportionally to the
  current word's progress.
- **Rise / settle**: active word lifts a few pixels, settles on the next.
- **Line entrance/exit**: soft fade or short rise in, drift/fade out. Keep it
  quick; lyrics should appear just before they are sung.
- **Hold**: leave the line visible through instrumental gaps in its span.

All of these must be a pure function of `t` (and the word timings). No
state carried between frames.

## Performance

- Build each word/line mesh **once**; in `render(t)` only change
  `material.opacity`, `material.color`, `scale`, `position`.
- **Never** call `createTextTexture` inside `render(t)`.
- Reuse one texture per word string when words repeat.
- Set `resolutionScale` by profile (e.g. ~1.5 for draft/review, 2+ for final).
- Keep the text plane `depthWrite: false` and render it late so it never fights
  with the scene behind it.

## Checklist (run before calling it done)

- [ ] Every line is readable at the review size, at speed.
- [ ] The active word is obvious without staring.
- [ ] No clipping at the frame edge; margins are consistent.
- [ ] No collision with the focal object or dense motion.
- [ ] Text does not blow out white or lose to bloom.
- [ ] Timing matches the vocal (check a few words frame-by-frame).
- [ ] No per-frame texture generation; no accumulation across `t` jumps.
