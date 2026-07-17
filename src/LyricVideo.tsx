import { Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BackgroundLayer } from "./layers/BackgroundLayer";
import { ParticleLayer } from "./layers/ParticleLayer";
import { LyricOverlay } from "./layers/LyricOverlay";
import { themeConfig } from "./data/themeConfig";
import { syncedLyrics } from "./data/syncedLyrics";

export const LyricVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        flex: 1,
        background: "black",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("audio.mp3")} />
      <BackgroundLayer />
      <ParticleLayer fps={fps} frame={frame} />
      <LyricOverlay fps={fps} frame={frame} />
    </div>
  );
};
