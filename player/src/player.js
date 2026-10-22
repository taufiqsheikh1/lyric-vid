import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { createTextTexture, createTextMesh } from "./text.js";
import { createEnergySampler } from "./energy.js";
import { startReview } from "./review.js";

const params = new URLSearchParams(location.search);
const num = (k, d) => (params.has(k) ? Number(params.get(k)) : d);

const width = num("width", 1920);
const height = num("height", 1080);
const fps = num("fps", 60);
const supersample = num("supersample", 1);

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(supersample);
renderer.setSize(width, height, false);
canvas.style.width = width + "px";
canvas.style.height = height + "px";
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000);
camera.position.set(0, 0, 60);

const addons = {
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  ShaderPass,
  OutputPass,
  SMAAPass,
  BokehPass,
  FilmPass,
};

async function fetchJson(p) {
  if (!p) return null;
  const url = /^https?:/.test(p) || p.startsWith("/") ? p : "/" + p;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${p}: ${res.status}`);
  return res.json();
}

/** Loads bundled font files so typography is identical on every machine. */
async function loadFont(family, url, descriptors = {}) {
  const u = /^https?:/.test(url) || url.startsWith("/") ? url : "/" + url;
  const face = new FontFace(family, `url(${u})`, descriptors);
  await face.load();
  document.fonts.add(face);
  return face;
}

async function main() {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  const config = { width, height, fps, supersample, profile: params.get("profile") || "draft" };
  const lyrics = await fetchJson(params.get("lyrics"));
  const energyData = await fetchJson(params.get("energy"));
  const energy = createEnergySampler(energyData, fps);

  const ctx = {
    THREE,
    addons,
    renderer,
    scene,
    camera,
    canvas,
    width,
    height,
    fps,
    supersample,
    profile: config.profile,
    config,
    lyrics,
    energy,
    helpers: { createTextTexture, createTextMesh, loadFont },
  };

  let api = { duration: num("duration", 5) };
  const scenePath = params.get("scene");
  if (scenePath) {
    const sceneUrl =
      /^https?:/.test(scenePath) || scenePath.startsWith("/") ? scenePath : "/" + scenePath;
    const mod = await import(/* webpackIgnore: true */ sceneUrl);
    const factory = mod.createScene || mod.default;
    if (typeof factory !== "function") {
      throw new Error("scene module must export createScene(ctx)");
    }
    const result = await factory(ctx);
    if (result) api = { ...api, ...result };
    if (api.ready) await api.ready;
  }

  const draw = api.render || (() => renderer.render(scene, camera));

  const boot = document.getElementById("boot");
  if (boot) {
    const msg = boot.querySelector(".msg");
    if (msg) msg.textContent = params.get("mode") === "review" ? "ready" : "rendering";
    boot.classList.add("done");
    setTimeout(() => boot.remove(), 450);
  }

  if (params.get("mode") === "review") {
    startReview(ctx, { api, params, draw });
    return;
  }

  window.__player = {
    ready: true,
    width,
    height,
    fps,
    duration: api.duration,
    renderFrame: async (t) => {
      await draw(t);
    },
  };
}

main().catch((e) => {
  window.__playerError = String((e && e.stack) || e);
  const boot = document.getElementById("boot");
  if (boot) {
    const m = boot.querySelector(".msg");
    if (m) {
      m.textContent = "scene error — see console";
      m.style.color = "#ffb4a2";
    }
    boot.querySelector(".spin")?.remove();
  }
  // eslint-disable-next-line no-console
  console.error(e);
});
