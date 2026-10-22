// M0 proof-of-method scene.
// A throwaway but visually real scene that exercises the whole pipeline:
// deterministic t-driven motion, particles, MSDF-free crisp text, and a
// multi-pass post-FX chain (bloom + tone mapping). Everything is a pure
// function of `t` — no rAF, no Date.now(), no live audio.
export async function createScene(ctx) {
  const { THREE, addons, renderer, scene, camera, helpers, energy } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene.background = new THREE.Color(0x02020a);
  scene.fog = new THREE.FogExp2(0x02020a, 0.004);

  camera.position.set(0, 6, 42);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x223355, 2.0));
  const key = new THREE.DirectionalLight(0xff5f9e, 3.0);
  key.position.set(6, 10, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5ac8fa, 2.2);
  rim.position.set(-8, -4, -6);
  scene.add(rim);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(9, 3),
    new THREE.MeshStandardMaterial({
      color: 0x111318,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x1b2a4a,
      emissiveIntensity: 0.6,
      flatShading: true,
    })
  );
  scene.add(core);

  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(10.5, 2),
    new THREE.MeshBasicMaterial({ color: 0x5ac8fa, wireframe: true, transparent: true, opacity: 0.25 })
  );
  scene.add(wire);

  // Deterministic star/particle field (seeded, no Math.random).
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const N = 2500;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 30 + rnd() * 90;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
    positions[i * 3 + 1] = r * Math.cos(ph);
    positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pGeom,
    new THREE.PointsMaterial({ color: 0xffcc66, size: 0.6, transparent: true, opacity: 0.8, depthWrite: false })
  );
  scene.add(particles);

  const titleTex = helpers.createTextTexture("AGENTIC THREE.JS", {
    fontFamily: "Impact, Arial Black, sans-serif",
    fontSize: 150,
    fontWeight: 900,
    color: "#ffffff",
    letterSpacing: 8,
    glowColor: "rgba(90,200,250,0.55)",
    glowBlur: 10,
  });
  const titleAspect = titleTex.userData.aspect;
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(30 * titleAspect, 30),
    new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, depthWrite: false })
  );
  title.position.set(0, -13.5, 6);
  scene.add(title);

  const composer = new addons.EffectComposer(renderer);
  composer.addPass(new addons.RenderPass(scene, camera));
  const bloom = new addons.UnrealBloomPass(new THREE.Vector2(ctx.width, ctx.height), 0.55, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new addons.OutputPass());

  const duration = 4;

  function render(t) {
    const e = energy ? energy.sample(t) : { bass: 0, mid: 0, high: 0, beat: 0 };

    core.rotation.y = t * 0.5;
    core.rotation.x = Math.sin(t * 0.4) * 0.35;
    wire.rotation.y = -t * 0.32;
    wire.rotation.z = t * 0.18;

    const pulse = 1 + Math.sin(t * 2.2) * 0.04 + e.bass * 0.15 + e.beat * 0.1;
    core.scale.setScalar(pulse);

    particles.rotation.y = t * 0.06;
    particles.rotation.x = Math.sin(t * 0.2) * 0.1;

    title.position.y = -13.5 + Math.sin(t * 1.4) * 0.5;
    title.material.opacity = THREE.MathUtils.clamp((t - 0.4) * 2, 0, 1);

    bloom.strength = 0.5 + e.beat * 0.6;

    composer.render();
  }

  return { duration, render };
}
