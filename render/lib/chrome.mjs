import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

/**
 * Deterministic-friendly Chromium launch.
 *
 * Software WebGL (SwiftShader) is the DEFAULT: identical pixels on every
 * machine, which is what makes renders reproducible. On a GPU box (vast.ai)
 * pass `gpu: true` for hardware ANGLE/Vulkan acceleration.
 *
 * Browser resolution order:
 *   CHROME_EXECUTABLE env  -> explicit binary
 *   CHROME_CHANNEL env     -> e.g. "chrome", or "bundled" for Playwright's chromium
 *   cfg.executablePath     -> if it exists on disk
 *   cfg.channel            -> fallback
 *   otherwise              -> Playwright's bundled chromium
 */
export async function launchBrowser(cfg = {}, { gpu = false, headless = true } = {}) {
  const baseArgs = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--mute-audio",
    "--force-color-profile=srgb",
    "--disable-lcd-text",
    "--force-device-scale-factor=1",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-features=CalculateNativeWinOcclusion",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ];

  const glArgs = gpu
    ? ["--use-gl=angle", "--use-angle=vulkan", "--enable-gpu-rasterization", "--enable-zero-copy"]
    : ["--use-gl=angle", "--use-angle=swiftshader"];

  const envExec = process.env.CHROME_EXECUTABLE;
  const envChannel = process.env.CHROME_CHANNEL;
  const execPath =
    envExec || (cfg.executablePath && existsSync(cfg.executablePath) ? cfg.executablePath : undefined);

  const launchOpts = { headless, args: [...baseArgs, ...glArgs] };
  if (execPath) {
    launchOpts.executablePath = execPath;
  } else {
    const channel = envChannel || cfg.channel;
    if (channel && channel !== "bundled") launchOpts.channel = channel;
  }

  return chromium.launch(launchOpts);
}
