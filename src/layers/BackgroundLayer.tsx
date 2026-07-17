import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { spring } from "remotion";
import { themeConfig } from "../data/themeConfig";

export const BackgroundLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const { background: bg } = themeConfig;
  const progress = frame / durationInFrames;

  const scale = spring({
    frame,
    fps,
    from: 1,
    to: 1 + bg.zoomAmount,
    config: { damping: 200, stiffness: 20, mass: 0.5 },
    durationInFrames,
  });

  const blurAmount = bg.blur;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile("bg.jpg")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: `blur(${blurAmount}px) brightness(${bg.brightness}) saturate(${bg.saturation})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg,
            ${themeConfig.colors.background}${Math.round(bg.overlayOpacity * 255).toString(16).padStart(2, "0")} 0%,
            transparent 30%,
            transparent 70%,
            ${themeConfig.colors.background}${Math.round((bg.overlayOpacity + 0.15) * 255).toString(16).padStart(2, "0")} 100%
          )`,
        }}
      />
    </div>
  );
};
