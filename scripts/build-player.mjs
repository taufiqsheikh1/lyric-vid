#!/usr/bin/env node
// Bundles the player (three + post-FX + helpers) into a single ESM file so the
// browser needs no import-map and no network. Run before rendering.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(ROOT, "player/src/player.js")],
  bundle: true,
  format: "esm",
  target: ["chrome110"],
  outfile: path.join(ROOT, "player/dist/player.bundle.js"),
  logLevel: "info",
  // The scene module is resolved at runtime via a dynamic import; leave it external.
  external: [],
});

console.log("✓ player bundle built");
