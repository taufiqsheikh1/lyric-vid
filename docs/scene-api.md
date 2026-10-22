# Scene API (deterministic Three.js)

Every song's animation is a single ES module: `songs/<name>/scene.js`.

## Contract

```js
export async function createScene(ctx) {
  // ... build scene ...
  return {
    duration: 12.5,              // seconds
    render(t) { /* draw frame at time t */ },
  };
}
```

- `createScene(ctx)` may be async. If it returns a `ready` promise, the player waits on it.
- `render(t)` is called once per output frame with the exact timestamp in seconds.
- `render(t)` may be async; the harness awaits it before capturing.

## Rules (non-negotiable)

1. **Pure function of `t`.** No `requestAnimationFrame` draw loops, no `Date.now()`,
   no `performance.now()`, no wall-clock timers, no `Math.random()` (use a seeded PRNG).
   The same `t` must always produce the same pixels.
2. **Do not `import "three"`.** Use the injected `ctx.THREE`. Importing your own copy
   creates a second Three.js instance and breaks the scene.
3. **No live audio.** Read reactivity from `ctx.energy.sample(t)` (precomputed from
   `energy.json`). Never construct an `AudioContext`.
4. **Local assets only.** No network fetches during render (textures, fonts, models must
   live under the song folder). Fonts must be loaded before `ready` resolves.
5. **`dispose()`** (optional) to free GPU resources.

## `ctx` fields

| field | description |
|---|---|
| `THREE` | the shared Three.js namespace |
| `addons` | post-FX + helpers: `EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, SMAAPass, BokehPass, FilmPass` |
| `renderer` | `WebGLRenderer` (`preserveDrawingBuffer`, tone mapping ready) |
| `scene`, `camera` | pre-created `Scene` and `PerspectiveCamera` |
| `canvas`, `width`, `height`, `fps`, `supersample` | render target info |
| `config` | render settings only (`width,height,fps,supersample,profile`) - no design data |
| `lyrics` | parsed lyrics (array of `{text,start,end,type}`; line entries may also carry `words:[{text,start,end}]`) |
| `energy` | `{ sample(t) -> {bass,mid,high,level,beat} }` |
| `helpers` | `{ createTextTexture(text,opts), createTextMesh(THREE,text,opts), loadFont(family,url,descriptors) }` |

## Design is yours

There is no palette/style field and nothing is loaded from a theme. Choose the
palette, typography, motion and post-FX inside `scene.js`, invented for this
song. Do not copy another song's look.

## Text

Use `ctx.helpers.createTextTexture` / `createTextMesh` for deterministic, crisp
canvas-texture typography. Low-level options include outline, soft shadow,
gradient fill, max-width/auto-wrap and a contrast scrim (see
`docs/text-guidance.md` and `player/src/text.js`). Build text once; only mutate
materials/transforms per frame.

## Audio reactivity

`ctx.energy.sample(t)` returns normalized 0..1 bands and a `beat` impulse
(1 -> 0 over ~120 ms after each detected beat). Drive scale/emissive/particle
speed from these.
