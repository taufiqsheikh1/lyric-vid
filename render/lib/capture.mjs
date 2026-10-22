import { promises as fs } from "node:fs";
import path from "node:path";

export function buildPlayerUrl(origin, params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) q.set(k, String(v));
  }
  return `${origin}/player/index.html?${q.toString()}`;
}

async function setupPage(browser, url, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.error("[page]", m.text());
  });
  page.on("pageerror", (e) => console.error("[pageerror]", e.message));
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(
    () => (window.__player && window.__player.ready) || window.__playerError,
    null,
    { timeout: 120000 }
  );
  const err = await page.evaluate(() => window.__playerError || null);
  if (err) throw new Error("Player failed to init:\n" + err);
  return { context, page };
}

export async function getDuration(browser, url, width, height) {
  const { context, page } = await setupPage(browser, url, width, height);
  const duration = await page.evaluate(() => window.__player.duration);
  await context.close();
  return duration;
}

/**
 * Renders a list of global frame indices by seeking each frame to t = i/fps and
 * capturing the WebGL canvas. Divides the work across `workers` isolated pages.
 * Fully deterministic: every frame renders fully before capture, so no drops.
 */
export async function captureFrames({
  browser,
  url,
  width,
  height,
  fps,
  frameIndices,
  outDir,
  workers = 1,
  onProgress,
}) {
  await fs.mkdir(outDir, { recursive: true });

  const chunks = Array.from({ length: Math.max(1, workers) }, () => []);
  frameIndices.forEach((idx, i) => chunks[i % chunks.length].push(idx));

  let done = 0;
  const total = frameIndices.length;

  await Promise.all(
    chunks.map(async (chunk, w) => {
      if (!chunk.length) return;
      const { context, page } = await setupPage(browser, url, width, height);
      const canvas = page.locator("canvas#gl");
      try {
        for (const idx of chunk) {
          const t = idx / fps;
          await page.evaluate((time) => window.__player.renderFrame(time), t);
          const file = path.join(outDir, `${String(idx).padStart(6, "0")}.png`);
          await canvas.screenshot({ path: file, type: "png" });
          done++;
          if (onProgress && (done % 5 === 0 || done === total)) onProgress(done, total);
        }
      } finally {
        await context.close();
      }
    })
  );

  return total;
}
