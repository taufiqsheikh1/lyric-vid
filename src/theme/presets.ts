import { ThemeConfig } from "./types";

export const vibeThemes: Record<string, Partial<ThemeConfig>> = {
  energetic: {
    colors: {
      primary: "#ff3366",
      secondary: "#ff9933",
      accent: "#ffcc00",
      background: "#0a0a0a",
      text: "#ffffff",
      textShadow: "rgba(255,51,102,0.8)",
    },
    typography: {
      fontFamily: '"Bebas Neue", "Impact", sans-serif',
      fontSize: 72,
      fontWeight: 800,
      letterSpacing: 4,
      lineHeight: 1.1,
      activeWordScale: 1.15,
      activeWordGlow: "0 0 30px currentColor",
    },
    animation: {
      wordEntrance: "scale-pop",
      springConfig: { stiffness: 200, damping: 12, mass: 0.5 },
    },
    particles: {
      count: 120,
      types: ["spark", "glow"],
      sizeRange: [2, 8],
      speedRange: [1, 5],
      opacityRange: [0.3, 0.9],
      colors: ["#ff3366", "#ff9933", "#ffcc00", "#ffffff"],
      responsiveBands: 32,
    },
    background: {
      zoomAmount: 0.12,
      blur: 0,
      brightness: 0.6,
      saturation: 1.4,
      overlayOpacity: 0.3,
    },
  },

  melancholic: {
    colors: {
      primary: "#4a6fa5",
      secondary: "#8ba5c8",
      accent: "#c4d7f2",
      background: "#0a0c14",
      text: "#e8ecf1",
      textShadow: "rgba(74,111,165,0.5)",
    },
    typography: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: 64,
      fontWeight: 400,
      letterSpacing: 2,
      lineHeight: 1.3,
      activeWordScale: 1.08,
      activeWordGlow: "0 0 20px rgba(74,111,165,0.4)",
    },
    animation: {
      wordEntrance: "fade",
      springConfig: { stiffness: 80, damping: 25, mass: 1.2 },
    },
    particles: {
      count: 60,
      types: ["bubble", "glow"],
      sizeRange: [3, 12],
      speedRange: [0.3, 1.5],
      opacityRange: [0.1, 0.5],
      colors: ["#4a6fa5", "#8ba5c8", "#a0b9d8"],
      responsiveBands: 16,
    },
    background: {
      zoomAmount: 0.06,
      blur: 2,
      brightness: 0.4,
      saturation: 0.6,
      overlayOpacity: 0.5,
    },
  },

  aggressive: {
    colors: {
      primary: "#ff1a1a",
      secondary: "#cc0000",
      accent: "#ffffff",
      background: "#000000",
      text: "#ffffff",
      textShadow: "rgba(255,26,26,0.9)",
    },
    typography: {
      fontFamily: '"Anton", "Arial Black", sans-serif',
      fontSize: 80,
      fontWeight: 900,
      letterSpacing: 6,
      lineHeight: 1.0,
      activeWordScale: 1.25,
      activeWordGlow: "0 0 40px rgba(255,26,26,0.9)",
    },
    animation: {
      wordEntrance: "spring",
      springConfig: { stiffness: 300, damping: 8, mass: 0.3 },
    },
    particles: {
      count: 200,
      types: ["spark", "geometric"],
      sizeRange: [2, 6],
      speedRange: [2, 8],
      opacityRange: [0.4, 1.0],
      colors: ["#ff1a1a", "#ff4444", "#ffffff", "#333333"],
      responsiveBands: 32,
    },
    background: {
      zoomAmount: 0.15,
      blur: 0,
      brightness: 0.5,
      saturation: 1.0,
      overlayOpacity: 0.35,
    },
  },

  dreamy: {
    colors: {
      primary: "#b366ff",
      secondary: "#cc99ff",
      accent: "#ff99cc",
      background: "#0d0a1a",
      text: "#f0e6ff",
      textShadow: "rgba(179,102,255,0.6)",
    },
    typography: {
      fontFamily: '"Quicksand", "Segoe UI", sans-serif',
      fontSize: 68,
      fontWeight: 300,
      letterSpacing: 6,
      lineHeight: 1.25,
      activeWordScale: 1.1,
      activeWordGlow: "0 0 25px rgba(179,102,255,0.6)",
    },
    animation: {
      wordEntrance: "slide-up",
      springConfig: { stiffness: 100, damping: 15, mass: 0.8 },
    },
    particles: {
      count: 100,
      types: ["bubble", "glow", "wave"],
      sizeRange: [4, 16],
      speedRange: [0.5, 2],
      opacityRange: [0.15, 0.6],
      colors: ["#b366ff", "#cc99ff", "#ff99cc", "#e6ccff"],
      responsiveBands: 24,
    },
    background: {
      zoomAmount: 0.04,
      blur: 3,
      brightness: 0.5,
      saturation: 1.3,
      overlayOpacity: 0.4,
    },
  },

  romantic: {
    colors: {
      primary: "#ff6b9d",
      secondary: "#ff99b8",
      accent: "#ffd4e0",
      background: "#0f080d",
      text: "#fff0f5",
      textShadow: "rgba(255,107,157,0.5)",
    },
    typography: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: 60,
      fontWeight: 400,
      letterSpacing: 3,
      lineHeight: 1.35,
      activeWordScale: 1.1,
      activeWordGlow: "0 0 18px rgba(255,107,157,0.4)",
    },
    animation: {
      wordEntrance: "fade",
      springConfig: { stiffness: 90, damping: 20, mass: 1.0 },
    },
    particles: {
      count: 80,
      types: ["bubble", "glow"],
      sizeRange: [2, 10],
      speedRange: [0.4, 2],
      opacityRange: [0.15, 0.55],
      colors: ["#ff6b9d", "#ff99b8", "#ffcce0", "#ffffff"],
      responsiveBands: 16,
    },
    background: {
      zoomAmount: 0.05,
      blur: 1,
      brightness: 0.55,
      saturation: 1.1,
      overlayOpacity: 0.35,
    },
  },
};

export function resolveTheme(mood: string, energy: number, genre: string): ThemeConfig {
  const base = (vibeThemes[mood] ?? vibeThemes.energetic) as ThemeConfig;

  return {
    fps: 30,
    mood: base.mood,
    genre,
    energy,
    colors: base.colors,
    typography: base.typography,
    animation: base.animation,
    particles: {
      ...base.particles,
      count: Math.round(base.particles.count * (0.5 + energy)),
    },
    background: {
      ...base.background,
      zoomAmount: base.background.zoomAmount * (0.5 + energy),
      brightness: base.background.brightness * (0.8 + energy * 0.4),
    },
  };
}
