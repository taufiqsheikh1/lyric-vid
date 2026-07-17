export interface ThemeConfig {
  fps: number;
  mood: "energetic" | "melancholic" | "aggressive" | "dreamy" | "romantic";
  genre: string;
  energy: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textShadow: string;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    letterSpacing: number;
    lineHeight: number;
    activeWordScale: number;
    activeWordGlow: string;
  };
  animation: {
    wordEntrance: "spring" | "fade" | "slide-up" | "scale-pop";
    springConfig: {
      stiffness: number;
      damping: number;
      mass: number;
    };
  };
  particles: {
    count: number;
    types: ("spark" | "bubble" | "wave" | "glow" | "geometric")[];
    sizeRange: [number, number];
    speedRange: [number, number];
    opacityRange: [number, number];
    colors: string[];
    responsiveBands: number;
  };
  background: {
    zoomAmount: number;
    blur: number;
    brightness: number;
    saturation: number;
    overlayOpacity: number;
  };
}

export interface SyncedWord {
  text: string;
  start: number;
  end: number;
  type: "word" | "spacing" | "audio_event";
}

export interface STTWord {
  text: string;
  start: number;
  end: number;
  type: "word" | "spacing" | "audio_event";
  logprob: number;
  speaker_id?: string | null;
}
