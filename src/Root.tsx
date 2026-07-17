import { Composition } from "remotion";
import { LyricVideo } from "./LyricVideo";
import { themeConfig } from "./data/themeConfig";
import { syncedLyrics } from "./data/syncedLyrics";

export const RemotionRoot: React.FC = () => {
  if (!syncedLyrics || syncedLyrics.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111",
          color: "#fff",
          fontFamily: "system-ui",
          fontSize: 24,
        }}
      >
        No lyrics data found. Run the pipeline first.
      </div>
    );
  }

  const lastWord = syncedLyrics[syncedLyrics.length - 1];
  const totalDurationS = lastWord.end;
  const fps = themeConfig.fps ?? 30;
  const totalFrames = Math.ceil(totalDurationS * fps) + fps * 3;

  return (
    <Composition
      id="LyricVideo"
      component={LyricVideo}
      durationInFrames={totalFrames}
      fps={fps}
      width={1920}
      height={1080}
    />
  );
};
