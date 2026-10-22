import * as THREE from "three";

/**
 * Renders text onto a canvas and returns a THREE.CanvasTexture.
 * Deterministic (uses only the passed-in string/style), crisp at any scale via
 * resolutionScale. This is the default high-quality text path.
 *
 * These are low-level primitives, not presets. Choose the values that fit the
 * song; there is no theme lookup.
 */
export function createTextTexture(
  text,
  {
    fontFamily = "Inter, Arial, sans-serif",
    fontSize = 120,
    fontWeight = 700,
    fontStyle = "normal",
    color = "#ffffff",
    /** Vertical gradient fill: [[0,"#fff"], [1,"#f00"]] or {from,to}. */
    gradient = null,
    letterSpacing = 0,
    padding = 48,
    lineHeight = 1.12,
    align = "center",
    /** Wrap the text to this many layout pixels (0 = no wrap). */
    maxWidth = 0,
    strokeColor = null,
    strokeWidth = 0,
    /** Soft drop shadow behind the glyphs. */
    shadowColor = null,
    shadowBlur = 0,
    shadowOffsetX = 0,
    shadowOffsetY = 0,
    /** Halo/glow emitted by the glyphs (may combine with the drop shadow). */
    glowColor = null,
    glowBlur = 0,
    /** Optional contrast plate behind the text: { color, radius, inset }. */
    scrim = null,
    resolutionScale = 2,
  } = {}
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;

  const measure = (s) => ctx.measureText(s).width + Math.max(0, s.length - 1) * letterSpacing;

  let lines = String(text).split("\n");
  if (maxWidth > 0) lines = wrapLines(lines, measure, maxWidth);

  const textWidth = Math.max(1, ...lines.map(measure));
  const width = Math.ceil(Math.min(maxWidth || Infinity, textWidth) + padding * 2);
  const height = Math.ceil(lines.length * fontSize * lineHeight + padding * 2);

  canvas.width = Math.ceil(width * resolutionScale);
  canvas.height = Math.ceil(height * resolutionScale);
  ctx.scale(resolutionScale, resolutionScale);

  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  ctx.lineJoin = "round";

  // Optional contrast plate behind the text.
  if (scrim && scrim.color) {
    const inset = scrim.inset ?? padding * 0.4;
    const radius = scrim.radius ?? 24;
    ctx.fillStyle = scrim.color;
    roundRect(ctx, inset, inset, width - inset * 2, height - inset * 2, radius);
    ctx.fill();
  }

  const fillStyle = makeFillStyle(ctx, { gradient, color, height });

  const startY = padding + (fontSize * lineHeight) / 2;
  lines.forEach((line, i) => {
    const y = startY + i * fontSize * lineHeight;
    const x = align === "center" ? width / 2 : align === "right" ? width - padding : padding;

    // Drop shadow pass (fill only).
    if (shadowColor && (shadowBlur > 0 || shadowOffsetX || shadowOffsetY)) {
      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffsetX;
      ctx.shadowOffsetY = shadowOffsetY;
      ctx.fillStyle = fillStyle;
      drawSpacedLine(ctx, line, x, y, letterSpacing, align, "fill");
      ctx.restore();
    }

    // Glow pass (fill only).
    if (glowColor && glowBlur > 0) {
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowBlur;
      ctx.fillStyle = fillStyle;
      drawSpacedLine(ctx, line, x, y, letterSpacing, align, "fill");
      ctx.restore();
    }

    // Main pass: fill (+ optional outline).
    if (strokeColor && strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      drawSpacedLine(ctx, line, x, y, letterSpacing, align, "stroke");
    }
    ctx.fillStyle = fillStyle;
    drawSpacedLine(ctx, line, x, y, letterSpacing, align, "fill");
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  texture.userData = {
    width,
    height,
    aspect: width / height,
    pixelWidth: canvas.width,
    pixelHeight: canvas.height,
    lines,
  };
  return texture;
}

function makeFillStyle(ctx, { gradient, color, height }) {
  if (!gradient) return color;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  const stops = Array.isArray(gradient) ? gradient : [[0, gradient.from], [1, gradient.to]];
  for (const [offset, stopColor] of stops) g.addColorStop(offset, stopColor);
  return g;
}

function wrapLines(lines, measure, maxWidth) {
  const out = [];
  for (const line of lines) {
    const words = line.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = current + " " + words[i];
      if (current && measure(candidate) > maxWidth) {
        out.push(current);
        current = words[i];
      } else {
        current = candidate;
      }
    }
    out.push(current);
  }
  return out;
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawSpacedLine(ctx, line, x, y, letterSpacing, align, mode) {
  const draw = (s, sx) => (mode === "stroke" ? ctx.strokeText(s, sx, y) : ctx.fillText(s, sx, y));
  if (!letterSpacing) {
    draw(line, x);
    return;
  }
  const chars = Array.from(line);
  const advance = chars.map((c) => ctx.measureText(c).width + letterSpacing);
  const total = advance.reduce((a, b) => a + b, 0) - letterSpacing;
  let cx = align === "center" ? x - total / 2 : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    draw(c, cx);
    cx += advance[i];
  });
  ctx.textAlign = prevAlign;
}

/**
 * Convenience: builds a plane mesh sized to keep the texture's aspect ratio.
 * Returns a THREE.Mesh with the text texture applied.
 */
export function createTextMesh(THREE_NS, text, opts = {}) {
  const { worldHeight = 8, ...texOpts } = opts;
  const texture = createTextTexture(text, texOpts);
  const aspect = texture.userData.aspect;
  const geometry = new THREE_NS.PlaneGeometry(worldHeight * aspect, worldHeight);
  const material = new THREE_NS.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE_NS.Mesh(geometry, material);
  mesh.userData.texture = texture;
  return mesh;
}
