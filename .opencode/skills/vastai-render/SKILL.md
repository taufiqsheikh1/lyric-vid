---
name: vastai-render
description: Hand off a finalized scene to vast.ai for the deterministic high-quality final render, then download the master
---

# Final render on vast.ai

Once the scene is finalized and a draft render looks right, do the master
render on rented hardware.

## Preconditions

- `songs/<name>/{scene.js, audio.mp3, lyrics-lines.json, energy.json}` all exist.
- `vastai/vast.config.json` points at your pushed Docker image.
- `vastai` CLI installed and an SSH key registered.
- `VAST_API_KEY` set in `.env` (loaded automatically by the scripts).

## Steps

1. Preview cost and hardware (no spend):
   ```
   node vastai/render-on-vast.mjs --song <name> --dry-run
   ```
   Check that the picked offer has enough CPU cores and disk. Adjust `query`,
   `diskGb`, `maxDph` in `vastai/vast.config.json` if needed.
2. Render (spends money; destroys the instance when done):
   ```
   node vastai/render-on-vast.mjs --song <name> --yes
   ```
   For 4K or long songs raise `diskGb` first (see `vastai/README.md` sizing).
3. Verify `output/<name>.mp4`: duration, audio sync, lyric timing.
4. To debug on the box without renting again, pass `--keep` and SSH in.

## Choosing hardware

Rendering is CPU-bound (Chromium compositing + x264). Prefer **16-32 vCPU** and
32-64 GB RAM with a modern GPU over one with a huge GPU and few cores. More cores
means more parallel workers and a shorter wall time.
