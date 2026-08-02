---
name: theme-design
description: Design a dynamic Hyperframes theme.json from song vibe analysis, mapping mood/energy/genre to colors, fonts, particle effects, and GSAP animation eases
---

## How to Design a Theme from Vibe Analysis

You receive a vibe analysis:
```json
{
  "mood": "dreamy",
  "genre": "electronic",
  "energy": 0.45,
  "colorPalette": {
    "primary": "#b366ff",
    "secondary": "#cc99ff",
    "accent": "#ff99cc"
  }
}
```

### Map to ThemeConfig

The theme.json is consumed by `scripts/build-composition.mjs`, which merges it over defaults and bakes it into GSAP timelines + CSS. `mood` picks the entrance animation + particle shapes. Use these baselines:

| mood | font style | wordEntrance | particle style |
|------|-----------|--------------|----------------|
| energetic | Bold sans-serif (Impact, Bebas Neue) | scale-pop | sparks + glow |
| melancholic | Serif (Georgia, Times) | fade | bubbles + glow |
| aggressive | Heavy sans-serif (Anton, Arial Black) | spring | geometric + sparks |
| dreamy | Light sans-serif (Quicksand) | slide-up | bubbles + glow + wave |
| romantic | Elegant serif (Playfair Display) | fade | bubbles + glow |

### Generate the full ThemeConfig (JSON for `songs/<name>/theme.json`):

```json
{
  "fps": 30,
  "mood": "<from analysis>",
  "genre": "<from analysis>",
  "energy": <from analysis>,
  "colors": {
    "primary": "<from palette>",
    "secondary": "<from palette>",
    "accent": "<from palette>",
    "background": "#0a0a0a",
    "text": "#ffffff",
    "textShadow": "<primary with 50% alpha>"
  },
  "typography": {
    "fontFamily": "\"Bebas Neue\", \"Impact\", sans-serif",
    "fontSize": <60-85 based on energy>,
    "fontWeight": <300-900 based on mood>,
    "letterSpacing": <2-8 based on energy>,
    "lineHeight": <1.0-1.4>,
    "activeWordScale": <1.05-1.25 based on energy>,
    "activeWordGlow": "\"0 0 30px <accent>\""
  },
  "animation": {
    "wordEntrance": "<from mood>"
  },
  "particles": {
    "count": <40-200 based on energy>,
    "types": ["<from mood>"],
    "sizeRange": [2, <6-16>],
    "speedRange": [<0.3-2>, <1.5-8>],
    "opacityRange": [0.1, <0.5-1.0>],
    "colors": ["<palette colors + white>"]
  },
  "background": {
    "zoomAmount": <0.04-0.15 based on energy>,
    "blur": <0-3 based on mood>,
    "brightness": <0.4-0.6>,
    "saturation": <0.6-1.4>,
    "overlayOpacity": <0.3-0.5>
  },
  "choreography": {
    "elements": [ <3-6 dance elements, see "Choreography" section below> ]
  }
}
```

### `wordEntrance` → GSAP ease mapping (used by the build script):
- `spring` → `elastic.out(1, 0.45)`, from y:18, scale:0.7
- `scale-pop` → `back.out(1.7)`, from y:0, scale:0.5
- `fade` → `power1.out`, from y:0, scale:1
- `slide-up` → `power2.out`, from y:26, scale:1

### `particles.types` allowed values:
`spark`, `glow`, `bubble`, `wave`, `geometric` (any subset). Shape determines reactivity class: spark/glow/geometric pulse to bass, bubble/mid to mid-band, wave to soft blend. Particle colors come from `colors` (palette + white).

### Google Fonts
`fontFamily` is a CSS font stack like `"Bebas Neue", "Impact", sans-serif`. If the quoted name is a Google Font (e.g. Bebas Neue, Quicksand, Playfair Display, Anton), the build script automatically adds the `<link>` to Google Fonts for the given weight. Use a generic stack (`Impact`, `Georgia`, etc.) when you don't want a network font.

## Choreography: Make the Video Dance With the Music

Every song gets its own unique motion-graphics "dance" designed by the LLM in `theme.json` under `choreography`. The build script renders each element as deterministic HTML/CSS driven by the precomputed energy bands (bass/mid/high) plus optional GSAP loops. **Always design a choreography for every song** — pick 3-6 elements that match the song's character and complement the lyrics/particles/bg (never overcrowd the center where lyrics sit; place side/center glow/rings elements with low opacity).

### Common element fields (all types):
- `band`: `"bass"` (thump, punch), `"mid"` (body, warmth), `"high"` (sparkle, shimmer)
- `position`: `"center"`, `"top"`, `"bottom"`, `"left"`, `"right"`
- `colors`: array of hexes (use the song palette + white)
- `count`: element count (see per-type ranges)
- Type-specific fields below.

### Element types (vocabulary):
| type | what it does | key fields |
|------|-------------|------------|
| `rings` | Concentric pulsing circles scaling with a band | `size` (max px, 200-700), `count` 3-8 |
| `bars` | Equalizer bars (bottom strip) scaling with a band | `count` 16-48, `vertical` (bool, optional) |
| `orbiters` | Dots orbiting center while pulsing with a band | `radius` 200-500, `speed` (sec/rev, 8-40), `dotSize` 4-14, `count` 6-20 |
| `burst` | Radial sparks emanating from center, spin loop + band scale | `len` 60-200, `radius` 40-140, `speed` (sec/rotation, 10-40), `count` 8-24 |
| `waves` | Horizontal waveform line scaling with a band | `count` 16-48 |
| `glow` | Large soft radial glow blob breathing with a band | `radius` 120-360 |

### Creative rules:
- **Match band to musical role**: hip-hop/R&B → bass-heavy (rings, orbiters, glow); EDM/dance → high+mid (burst, bars, waves); ballads/dreamy → gentle mid (waves, glow, slow orbiters); rock → aggressive bass+high.
- **Vary the set per song** — don't reuse the same 3 elements for every song. Different positions, counts, speeds, and band mixes make each video unique.
- Keep center clear for lyrics: center-positioned elements should be low-opacity (rings/glow) or orbital (orbiters); put `bars` at `bottom`, `waves` at `top`/`bottom`, `burst` at `left`/`right` corners if center is busy.
- `speed` in seconds per full rotation (larger = slower, calmer).
- Don't exceed ~6 elements; more reads as noise. If the song is very sparse/quiet, use 2-3 subtle elements (glow + waves).

### Example choreography (energetic electronic):
```json
"choreography": {
  "elements": [
    { "type": "orbiters", "band": "bass", "position": "center", "count": 10, "radius": 380, "speed": 16, "dotSize": 9, "colors": ["#ff3366", "#ffcc00", "#ffffff"] },
    { "type": "rings", "band": "mid", "position": "center", "count": 5, "size": 560, "colors": ["#ff9933"] },
    { "type": "burst", "band": "high", "position": "center", "count": 14, "radius": 80, "len": 140, "speed": 24, "colors": ["#ffcc00", "#ffffff"] },
    { "type": "bars", "band": "mid", "position": "bottom", "count": 36, "colors": ["#ff3366", "#ff9933"] }
  ]
}
```

## Energy-to-parameters mapping:
- Low energy (0.0-0.3): slow, gentle, blurred bg, few particles, conservative fonts
- Medium energy (0.3-0.6): balanced, moderate effects
- High energy (0.6-1.0): fast, intense, sharp, many particles, bold fonts

Output as a valid JSON object for `songs/<name>/theme.json`. The build script merges it over defaults, so partial themes are fine, but prefer to fill in the full config above.
