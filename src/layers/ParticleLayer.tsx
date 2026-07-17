import { useMemo } from "react";
import { staticFile, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { themeConfig } from "../data/themeConfig";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  band: number;
  seedX: number;
  seedY: number;
  driftX: number;
  driftY: number;
}

export const ParticleLayer: React.FC<{ fps: number; frame: number }> = ({
  fps,
  frame,
}) => {
  const { width, height } = useVideoConfig();
  const audioData = useAudioData(staticFile("audio.mp3"));

  const { particles: pConfig } = themeConfig;

  const particles = useMemo(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < pConfig.count; i++) {
      const band = Math.floor(Math.random() * pConfig.responsiveBands);
      arr.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        size:
          pConfig.sizeRange[0] +
          Math.random() * (pConfig.sizeRange[1] - pConfig.sizeRange[0]),
        speed:
          pConfig.speedRange[0] +
          Math.random() * (pConfig.speedRange[1] - pConfig.speedRange[0]),
        opacity:
          pConfig.opacityRange[0] +
          Math.random() * (pConfig.opacityRange[1] - pConfig.opacityRange[0]),
        color:
          pConfig.colors[Math.floor(Math.random() * pConfig.colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        band,
        seedX: Math.random() * 1000,
        seedY: Math.random() * 1000,
        driftX: (Math.random() - 0.5) * 0.6,
        driftY: (Math.random() - 0.5) * 0.3 - 0.8,
      });
    }
    return arr;
  }, [width, height, pConfig]);

  if (!audioData) {
    return null;
  }

  const visualization = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: pConfig.responsiveBands,
  });

  const bassEnergy = visualization.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
  const midEnergy =
    visualization.slice(4, pConfig.responsiveBands * 0.6).reduce((a, b) => a + b, 0) /
    Math.max(1, Math.floor(pConfig.responsiveBands * 0.6) - 4);
  const highEnergy =
    visualization
      .slice(Math.floor(pConfig.responsiveBands * 0.6))
      .reduce((a, b) => a + b, 0) /
    Math.max(1, pConfig.responsiveBands - Math.floor(pConfig.responsiveBands * 0.6));

  const energyBoost = 1 + bassEnergy * 1.5 + midEnergy * 0.5;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {particles.map((p) => {
        const bandVal = visualization[p.band] ?? 0;
        const bandFraction = p.band / pConfig.responsiveBands;

        const sinShift = Math.sin(frame * 0.02 + p.seedX) * 40 * bandVal;
        const cosShift = Math.cos(frame * 0.03 + p.seedY) * 30 * bandVal;

        const moveX = p.driftX * p.speed + sinShift * 0.5;
        const moveY = p.driftY * p.speed * 1.5 + cosShift * 0.3;

        const px = ((p.x + moveX * frame) % (width + 100)) - 50;
        const py = ((p.y + moveY * frame + height + 100) % (height + 100)) - 50;

        const scale = 0.6 + bandVal * 1.5 * energyBoost;
        const opacity = p.opacity * (0.3 + bandVal * 1.2);

        const shape = pConfig.types[p.band % pConfig.types.length];

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: p.size * scale,
              height: p.size * scale,
              opacity: Math.min(1, opacity),
              background: shape === "spark" || shape === "geometric"
                ? "transparent"
                : p.color,
              borderRadius:
                shape === "bubble" || shape === "glow" ? "50%" : "0%",
              boxShadow:
                shape === "glow"
                  ? `0 0 ${p.size * 2 * scale}px ${p.color}, 0 0 ${p.size * scale}px ${p.color}`
                  : shape === "spark"
                  ? `0 0 ${p.size * 1.5 * scale}px ${p.color}`
                  : "none",
              border:
                shape === "geometric"
                  ? `${Math.max(1, p.size * 0.15 * scale)}px solid ${p.color}`
                  : "none",
              transform: `rotate(${p.rotation + frame * p.rotationSpeed * bandVal}rad)`,
              willChange: "transform, opacity",
            }}
          />
        );
      })}
    </div>
  );
};
