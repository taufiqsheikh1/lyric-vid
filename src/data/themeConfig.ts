import { ThemeConfig } from "../theme/types";

export const themeConfig: ThemeConfig = {
  fps: 30,
  mood: "energetic",
  genre: "pop",
  energy: 0.7,
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
    zoomAmount: 0.1,
    blur: 0,
    brightness: 0.6,
    saturation: 1.4,
    overlayOpacity: 0.3,
  },
};
