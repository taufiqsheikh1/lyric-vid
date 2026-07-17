---
name: theme-design
description: Design a dynamic Remotion theme config from song vibe analysis, mapping mood/energy/genre to colors, fonts, particle effects, and animation presets
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

Elk`mood` maps to a preset from `src/theme/presets.ts`. Use these baselines:

| mood | font style | animation | particle style |
|------|-----------|-----------|----------------|
| energetic | Bold sans-serif (Impact, Bebas Neue) | scale-pop, fast spring | sparks + glow |
| melancholic | Serif (Georgia, Times) | fade, slow spring | bubbles + glow |
| aggressive | Heavy sans-serif (Anton, Arial Black) | spring, high stiffness | geometric + sparks |
| dreamy | Light sans-serif (Quicksand) | slide-up, gentle | bubbles + glow + wave |
| romantic | Elegant serif (Playfair Display) | fade, smooth | bubbles + glow |

### Generate the full ThemeConfig:

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
    "fontFamily": "<choose based on mood>",
    "fontSize": <60-85 based on energy>,
    "fontWeight": <300-900 based on mood>,
    "letterSpacing": <2-8 based on energy>,
    "lineHeight": <1.0-1.4>,
    "activeWordScale": <1.05-1.25 based on energy>,
    "activeWordGlow": "<CSS text-shadow with primary color>"
  },
  "animation": {
    "wordEntrance": "<from mood>",
    "springConfig": {
      "stiffness": <80-300>,
      "damping": <8-25>,
      "mass": <0.3-1.2>
    }
  },
  "particles": {
    "count": <40-200 based on energy>,
    "types": ["<from mood>"],
    "sizeRange": [2, <6-16>],
    "speedRange": [<0.3-2>, <1.5-8>],
    "opacityRange": [0.1, <0.5-1.0>],
    "colors": ["<palette colors + white>"],
    "responsiveBands": <16 or 32>
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

### Energy-to-parameters mapping:
- Low energy (0.0-0.3): slow, gentle, blurred bg, few particles, conservative fonts
- Medium energy (0.3-0.6): balanced, moderate effects
- High energy (0.6-1.0): fast, intense, sharp, many particles, bold fonts

Output as a valid TypeScript-object-compatible JSON for `src/data/themeConfig.ts`.
