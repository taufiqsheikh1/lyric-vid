---
name: song-analysis
description: Analyze song lyrics to determine vibe, mood, genre, energy level, and color palette for dynamic theme generation
---

## How to Analyze Song Lyrics for Vibe

Given the full lyrics text of a song, determine:

### mood (pick one):
- **energetic** — upbeat, fast-paced, empowering, celebratory, high-tempo, dance
- **melancholic** — sad, slow, introspective, nostalgic, longing, bittersweet
- **aggressive** — angry, intense, confrontational, heavy, raw, rebellious
- **dreamy** — ethereal, atmospheric, surreal, psychedelic, floaty, ambient
- **romantic** — loving, warm, tender, passionate, affectionate, sweet

### genre (best guess):
- pop, rock, hip-hop, electronic, folk, r&b, metal, indie, country, jazz, latin, k-pop, reggae, punk, soul, blues, classical

### energy (0.0 to 1.0):
- 0.0-0.3: very calm, quiet, acoustic
- 0.3-0.5: moderate, steady
- 0.5-0.7: upbeat, lively
- 0.7-1.0: high intensity, explosive

### colorPalette:
Based on mood, suggest:
- primary: main accent color hex
- secondary: complementary color hex
- accent: highlight color hex

### Key indicators:
- Fast, short words → higher energy
- Repetitive hooks → pop/electronic
- Complex vocabulary, storytelling → folk/indie
- Screaming, anger words → aggressive/metal
- Love themes, "baby", "heart" → romantic/r&b
- Nature imagery, atmosphere → dreamy

### Output Format:
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
