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

### Energy-to-parameters mapping:
- Low energy (0.0-0.3): slow, gentle, blurred bg, few particles, conservative fonts
- Medium energy (0.3-0.6): balanced, moderate effects
- High energy (0.6-1.0): fast, intense, sharp, many particles, bold fonts

Output as a valid JSON object for `songs/<name>/theme.json`. The build script merges it over defaults, so partial themes are fine, but prefer to fill in the full config above.
