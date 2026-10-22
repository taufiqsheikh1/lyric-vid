#!/usr/bin/env bash
# Runs inside the vast.ai instance. Renders the final master.
# Usage: bash vastai/render-remote.sh <song> [profile] [gpu:0|1]
set -euo pipefail

SONG="${1:?usage: render-remote.sh <song> [profile] [gpu]}"
PROFILE="${2:-final}"
USE_GPU="${3:-1}"

cd "$(dirname "$0")/.."

CORES="$(nproc 2>/dev/null || echo 4)"
WORKERS="${WORKERS:-$CORES}"
export CHROME_CHANNEL="${CHROME_CHANNEL:-bundled}"
export NODE_OPTIONS="--max-old-space-size=8192"

echo "[remote] song=$SONG profile=$PROFILE cores=$CORES workers=$WORKERS gpu=$USE_GPU"

npm run build:player

GPU_FLAG=""
if [ "$USE_GPU" = "1" ]; then GPU_FLAG="--gpu"; fi

node render/render.mjs \
  --song "$SONG" \
  --profile "$PROFILE" \
  --workers "$WORKERS" \
  $GPU_FLAG \
  --out "output/${SONG}.mp4"

echo "[remote] done -> output/${SONG}.mp4"
