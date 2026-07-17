import { useMemo } from "react";
import { spring } from "remotion";
import { themeConfig } from "../data/themeConfig";
import { syncedLyrics } from "../data/syncedLyrics";

export const LyricOverlay: React.FC<{ fps: number; frame: number }> = ({
  fps,
  frame,
}) => {
  const { colors, typography, animation } = themeConfig;

  const currentTimeS = frame / fps;

  const words = useMemo(() => {
    return syncedLyrics.filter((w) => w.type === "word");
  }, []);

  const currentIndex = useMemo(() => {
    if (words.length === 0) return -1;
    let lo = 0;
    let hi = words.length - 1;
    if (currentTimeS < words[0].start) return -1;
    if (currentTimeS > words[hi].end) return -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (words[mid].start <= currentTimeS && words[mid].end >= currentTimeS) {
        return mid;
      }
      if (words[mid].start > currentTimeS) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return -1;
  }, [currentTimeS, words]);

  const visibleWindow = 14;
  const startIdx =
    currentIndex === -1
      ? 0
      : Math.max(0, currentIndex - Math.floor(visibleWindow / 2));
  const endIdx = Math.min(words.length, startIdx + visibleWindow);

  if (words.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexWrap: "wrap",
        alignContent: "center",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 140px",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: `${typography.letterSpacing * 2.5}px`,
          maxWidth: 1700,
        }}
      >
        {words.slice(startIdx, endIdx).map((word, relativeIdx) => {
          const idx = startIdx + relativeIdx;
          const isPast = currentIndex !== -1 && idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = currentIndex !== -1 && idx > currentIndex;
          const isNear = currentIndex !== -1 && Math.abs(idx - currentIndex) <= 4;

          const opacity = isCurrent
            ? 1
            : isPast
            ? 0.1
            : isNear
            ? 0.45
            : 0.25;

          const wordProgress = isCurrent
            ? Math.min(1, Math.max(0, (currentTimeS - word.start) / Math.max(0.01, word.end - word.start)))
            : 0;

          const entranceSpring = isCurrent
            ? spring({
                frame: Math.round(wordProgress * fps * 0.4),
                fps,
                from: 0.6,
                to: 1,
                config: {
                  stiffness: animation.springConfig.stiffness,
                  damping: animation.springConfig.damping,
                  mass: animation.springConfig.mass,
                },
              })
            : 1;

          const scale = isCurrent
            ? entranceSpring * (1 + (typography.activeWordScale - 1) * wordProgress)
            : 1;

          const glowIntensity = isCurrent ? 10 + wordProgress * 30 : 0;
          const textShadow = isCurrent
            ? `0 0 ${glowIntensity}px ${colors.accent}, 0 0 ${glowIntensity * 2}px ${colors.accent}40`
            : "none";

          const translateY =
            animation.wordEntrance === "slide-up" && isCurrent
              ? (1 - entranceSpring) * 20
              : 0;

          return (
            <span
              key={idx}
              style={{
                fontFamily: typography.fontFamily,
                fontSize: typography.fontSize,
                fontWeight: typography.fontWeight,
                letterSpacing: typography.letterSpacing,
                lineHeight: typography.lineHeight,
                color: colors.text,
                textShadow,
                opacity,
                transform: `scale(${scale}) translateY(${translateY}px)`,
                display: "inline-block",
                whiteSpace: "pre",
                willChange: "transform, opacity, text-shadow",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
