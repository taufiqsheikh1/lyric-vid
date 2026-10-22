# Rendering on vast.ai

Deterministic rendering is **CPU-heavy** (headless Chromium compositing + x264),
so the best boxes have **many CPU cores**, plenty of RAM, and a modern GPU. Choose
hardware accordingly:

| workload | recommendation |
|---|---|
| local draft / vision loop | your laptop, `--profile draft` (low res, few frames) |
| final 1080p60 | 16–32 vCPU, 32–64 GB RAM, RTX 4090 / A4000+, **80–120 GB disk** |
| final 4K60 | 32–64 vCPU, 64 GB+ RAM, A6000/H100, **200 GB+ disk** |

Disk sizing: PNG frames ≈ `width × height × ~1.5 bytes × fps × seconds`. A 3‑min
1080p60 render peaks around 20–30 GB before encoding, so 80 GB is safe.

## One-time

```bash
pip install vastai
vastai set api-key <YOUR_KEY>            # or set VAST_API_KEY
vastai create ssh-key "$(cat ~/.ssh/id_ed25519.pub)"   # SSH access (Linux/macOS)
docker build -f vastai/Dockerfile -t <dockerhub_user>/agentic-threejs:latest .
docker push <dockerhub_user>/agentic-threejs:latest
# put the image name into vastai/vast.config.json -> "image"
```

## Render

```bash
node vastai/render-on-vast.mjs --song my-song --dry-run     # preview offer + cost
node vastai/render-on-vast.mjs --song my-song --yes         # rent, render, download, destroy
```

Options: `--profile final|draft`, `--keep` (don't destroy), `--no-gpu` (force
SwiftShader). The instance is destroyed automatically after the master downloads.

## Environment knobs (inside the image)

- `CHROME_CHANNEL=bundled` (default) uses Playwright's Chromium.
- `WORKERS` overrides worker count (defaults to `nproc`).
- `GPU=1` (3rd arg) enables `--gpu` hardware GL.

## Determinism notes

- Software SwiftShader is the most reproducible path. GPU (ANGLE/Vulkan) can
  differ by a hair in AA/float rounding — pick one and use it for both preview
  and final if exact parity matters.
- Bundle fonts with the song (see `ctx.helpers.loadFont`) so typography matches
  across machines. Container ships DejaVu/Liberation/Noto as fallbacks.
