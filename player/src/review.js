// Real-time browser review mode.
// Play/scrub/frame-step a scene with the song audio, at full speed on the real
// GPU. This is for human review only — the deterministic render path uses the
// on-demand renderFrame(t) API instead.
//
// Enabled with ?mode=review in the player URL.

const CSS = `
  body.review-mode { background: #0b0d12; overflow: hidden; }
  body.review-mode #gl { position: absolute; left: 50%; top: 44px;
    transform: translateX(-50%); box-shadow: 0 10px 40px rgba(0,0,0,.6); }
  #rv-bar { position: fixed; left: 0; top: 0; right: 0; height: 44px; z-index: 20;
    display: flex; align-items: center; gap: 12px; padding: 0 14px;
    background: #12151c; border-bottom: 1px solid #232838; color: #e6e9f0;
    font: 13px/1.4 ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif; }
  #rv-bar .title { font-weight: 600; letter-spacing: .02em; }
  #rv-bar .dim { color: #8b93a7; }
  #rv-panel { position: fixed; left: 0; bottom: 0; right: 0; z-index: 20;
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
    background: #12151c; border-top: 1px solid #232838; color: #e6e9f0;
    font: 13px/1.4 ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif; }
  #rv-panel button, #rv-panel select {
    background: #1c2130; color: #e6e9f0; border: 1px solid #2b3145; border-radius: 8px;
    padding: 7px 11px; cursor: pointer; font: inherit; }
  #rv-panel button:hover { background: #262c3d; }
  #rv-play { min-width: 84px; font-weight: 600; }
  #rv-scrub { flex: 1; min-width: 160px; accent-color: #5ac8fa; height: 4px; cursor: pointer; }
  #rv-time { font-variant-numeric: tabular-nums; white-space: nowrap; }
  #rv-frame { color: #8b93a7; font-variant-numeric: tabular-nums; white-space: nowrap; }
  #rv-toggle { margin-left: auto; background: #1c2130; color: #cdd3e0; border: 1px solid #2b3145;
    border-radius: 8px; padding: 5px 10px; cursor: pointer; font: 12px ui-sans-serif, system-ui, sans-serif; }
  body.review-mode.hide-ui #rv-bar, body.review-mode.hide-ui #rv-panel { display: none; }
  body.review-mode.hide-ui #gl { top: 0; }
  #rv-error { position: fixed; inset: 0; z-index: 50; display: none; place-items: center;
    background: #16110f; color: #ffb4a2; padding: 40px; white-space: pre-wrap;
    font: 13px/1.5 ui-monospace, Consolas, monospace; }
`;

const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "style") Object.assign(node.style, v);
    else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
};

const fmt = (t) => {
  if (!Number.isFinite(t)) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t * 100) % 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

export function startReview(ctx, { api, params, draw }) {
  const { canvas, width, height, fps, renderer } = ctx;
  document.body.classList.add("review-mode");
  const style = el("style", { text: CSS });
  document.head.append(style);

  const sceneName = (params.get("scene") || "scene").replace(/^.*\//, "");

  // Responsive canvas fit ----------------------------------------------------
  const fit = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 44 - 60;
    const scale = Math.min(vw / width, vh / height);
    canvas.style.width = `${Math.max(1, Math.floor(width * scale))}px`;
    canvas.style.height = `${Math.max(1, Math.floor(height * scale))}px`;
  };
  window.addEventListener("resize", fit);
  fit();

  // Audio --------------------------------------------------------------------
  const audioParam = params.get("audio");
  const audio = audioParam ? new Audio(abs(audioParam)) : null;
  if (audio) {
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
  }

  let duration = api.duration || (audio ? audio.duration : 10) || 10;
  let t = 0;
  let playing = false;
  let speed = 1;
  let loop = false;
  let dragging = false;

  // UI -----------------------------------------------------------------------
  const playBtn = el("button", { id: "rv-play", text: "▶ Play" });
  const toStart = el("button", { text: "⏮", title: "to start" });
  const stepBack = el("button", { text: "◀|", title: "prev frame (←)" });
  const stepFwd = el("button", { text: "|▶", title: "next frame (→)" });
  const scrub = el("input", { id: "rv-scrub", type: "range", min: "0", max: "1", step: "0.001", value: "0" });
  const timeEl = el("span", { id: "rv-time", text: "00:00.00 / 00:00.00" });
  const frameEl = el("span", { id: "rv-frame", text: "f0" });
  const speedSel = el(
    "select",
    { title: "playback speed" },
    ...[0.25, 0.5, 1, 1.5, 2].map((s) => el("option", { value: String(s), text: `${s}×` }))
  );
  speedSel.value = "1";
  const loopBtn = el("button", { text: "Loop: off", title: "loop" });

  const panel = el(
    "div",
    { id: "rv-panel" },
    playBtn,
    toStart,
    stepBack,
    stepFwd,
    scrub,
    timeEl,
    frameEl,
    speedSel,
    loopBtn
  );
  const toggle = el("button", { id: "rv-toggle", text: "hide UI (h)" });
  const bar = el(
    "div",
    { id: "rv-bar" },
    el("span", { class: "title", text: `Review — ${sceneName}` }),
    el("span", { class: "dim", text: `${width}×${height} @ ${fps}fps` }),
    audio ? null : el("span", { class: "dim", text: "no audio (clock-driven)" }),
    toggle
  );
  const errorBox = el("pre", { id: "rv-error" });

  document.body.append(bar, panel, errorBox);

  // Behaviour ----------------------------------------------------------------
  const setPlaying = (p) => {
    playing = p;
    if (audio) {
      if (p) audio.play().catch(showError);
      else audio.pause();
    }
    playBtn.textContent = p ? "❚❚ Pause" : "▶ Play";
  };
  const seek = (time) => {
    t = Math.max(0, Math.min(duration, time));
    if (audio) audio.currentTime = t;
    renderOnce();
  };
  const stepFrame = (dir) => {
    setPlaying(false);
    seek(t + dir / fps);
  };

  playBtn.onclick = () => setPlaying(!playing);
  toStart.onclick = () => seek(0);
  stepBack.onclick = () => stepFrame(-1);
  stepFwd.onclick = () => stepFrame(1);
  speedSel.onchange = () => {
    speed = Number(speedSel.value) || 1;
    if (audio) audio.playbackRate = speed;
  };
  loopBtn.onclick = () => {
    loop = !loop;
    loopBtn.textContent = `Loop: ${loop ? "on" : "off"}`;
    if (audio) audio.loop = loop;
  };
  scrub.addEventListener("pointerdown", () => (dragging = true));
  window.addEventListener("pointerup", () => (dragging = false));
  scrub.addEventListener("input", () => {
    setPlaying(false);
    seek(Number(scrub.value));
  });
  let hideUI = false;
  toggle.onclick = () => toggleUI();
  function toggleUI() {
    hideUI = !hideUI;
    document.body.classList.toggle("hide-ui", hideUI);
  }

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.code === "Space") { e.preventDefault(); setPlaying(!playing); }
    else if (e.code === "ArrowLeft") { e.preventDefault(); e.shiftKey ? seek(t - 1) : stepFrame(-1); }
    else if (e.code === "ArrowRight") { e.preventDefault(); e.shiftKey ? seek(t + 1) : stepFrame(1); }
    else if (e.code === "Home") seek(0);
    else if (e.key === "h") toggleUI();
  });

  function showError(e) {
    errorBox.style.display = "grid";
    errorBox.textContent = "Review player error:\n" + String((e && e.stack) || e);
    console.error(e);
  }

  async function renderOnce() {
    try {
      await draw(t);
    } catch (e) {
      showError(e);
    }
  }

  if (audio) {
    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
      scrub.max = String(duration);
    });
    audio.addEventListener("ended", () => {
      if (!loop) setPlaying(false);
    });
    audio.addEventListener("error", () => showError("failed to load audio: " + audioParam));
  }
  scrub.max = String(duration);

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      if (audio) t = audio.currentTime;
      else {
        t += dt * speed;
        if (t >= duration) { if (loop) t = 0; else { t = duration; setPlaying(false); } }
      }
    }
    renderOnce();
    if (!dragging) scrub.value = String(t);
    timeEl.textContent = `${fmt(t)} / ${fmt(duration)}`;
    frameEl.textContent = `f${Math.round(t * fps)}`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.__review = { get time() { return t; }, seek, setPlaying, get playing() { return playing; } };
}

function abs(p) {
  return /^https?:/.test(p) || p.startsWith("/") ? p : "/" + p;
}
