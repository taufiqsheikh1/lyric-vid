# Deterministic Three.js render image for vast.ai.
# Node + headless Chromium (Playwright) + ffmpeg, all pinned so output is
# reproducible. Build once, push, then rent a GPU box with many CPU cores.
#
#   docker build -f vastai/Dockerfile -t <user>/agentic-threejs:latest .
#   docker push <user>/agentic-threejs:latest
#
FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV CHROME_CHANNEL=bundled

# ffmpeg (encode) + fonts (deterministic text) + chromium runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg ca-certificates \
      fonts-dejavu-core fonts-liberation fonts-noto-core \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
      libpango-1.0-0 libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

COPY package.json package-lock.json* ./
RUN npm install

# Playwright's bundled Chromium + its system deps
RUN npx --yes playwright-core install --with-deps chromium

COPY . .
RUN node scripts/build-player.mjs

CMD ["sleep", "infinity"]
