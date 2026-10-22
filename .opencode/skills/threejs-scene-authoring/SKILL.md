---
name: threejs-scene-authoring
description: Author a freeform, deterministic Three.js scene module for a lyric video that satisfies the scene API and renders cleanly at high quality
---

# Authoring a scene

Write `songs/<name>/scene.js` exporting `createScene(ctx)` (see
`docs/scene-api.md`). The look is **yours to invent** for this song; nothing is
read from a palette or style config.

## Hard rules (violating these breaks rendering)

- Pure function of `t`. No rAF draw loop, no `Date.now()`/`performance.now()`,
  no timers, no `Math.random()` (use a seeded PRNG).
- Do **not** `import "three"` - use `ctx.THREE`.
- Audio reactivity only via `ctx.energy.sample(t)`.
- Assets only under the song folder; load bundled fonts with
  `ctx.helpers.loadFont` and await them before returning `ready`.
- Add `dispose()` if you allocate per-frame resources.

## Structure that works well

```js
export async function createScene(ctx) {
  const { THREE, addons, renderer, scene, camera, lyrics, energy, helpers } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // choose this song's palette yourself, right here
  const palette = { bg: "#05060a", ink: "#eaf2ff", accent: "#ff4d8d" };
  scene.background = new THREE.Color(palette.bg);

  // ... build geometry ONCE (merge/BVH/CSG at build time, never per frame) ...

  const composer = new addons.EffectComposer(renderer);
  composer.addPass(new addons.RenderPass(scene, camera));
  const bloom = new addons.UnrealBloomPass(new THREE.Vector2(ctx.width, ctx.height), 0.5, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new addons.OutputPass());

  function render(t) {
    const e = energy.sample(t);
    // mutate transforms/emissive/uniforms from t and e, then:
    composer.render();
  }
  return { duration: /* song length */, render };
}
```

## Text and lyrics

Read `docs/text-guidance.md` first. Build lyric meshes once with
`ctx.helpers.createTextMesh` / `createTextTexture`, then drive only
`material.opacity`, `material.color`, `scale` and `position` per frame.
Never regenerate textures inside `render(t)`.

- Quote font families that contain spaces: `'"Exo 2", sans-serif'`, not
  `"Exo 2, sans-serif"` (unquoted names silently fall back to a broken 10px
  font).
- Word-level karaoke comes from `ctx.lyrics` entries carrying
  `words: [{text,start,end}]` (see `lyrics-lines.json`).
- The text primitives (outline, soft shadow, gradient fill, max-width/wrap,
  contrast scrim) are low-level options on the helpers - choose values that fit
  this song, do not pick a named preset.
- Keep lyric text high-contrast; avoid full-white blowout under bloom
  (threshold above ~1.0).

## Quality checklist

- Build heavy geometry once; per-frame work is only camera/transform/uniform
  updates.
- One clear concept; a few strong moving elements beat many weak ones.
- The centre stays readable for lyrics; busy motion lives at the edges.
- Use `energy.sample(t).beat` for punchy accents, bands for continuous motion.
- Prefer explicit `duration` (song length in seconds) over deriving it.

## Checking your work

- Build/search: `npm run build:player`.
- Review live: `node review/serve.mjs --song <name>` (it opens the full URL).
- Look at risky moments: `node render/filmstrip.mjs --song <name> --count 12`.
