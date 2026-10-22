/**
 * Deterministic audio-reactivity sampler.
 *
 * Reads the precomputed `energy.json` produced by scripts/analyze-audio.mjs.
 * Shape: { rate: number, duration: number, bass: number[], mid: number[],
 *          high: number[], level: number[], beats: number[] }
 * All arrays sampled at `rate` Hz (e.g. 30 => one value every 1/30 s).
 *
 * NEVER use live WebAudio during rendering: it is not deterministic.
 */
export function createEnergySampler(data, fps = 60) {
  const empty = { bass: 0, mid: 0, high: 0, level: 0, beat: 0 };
  if (!data) return { sample: () => ({ ...empty }), duration: 0 };

  const rate = data.rate || 30;
  const pick = (arr) => (Array.isArray(arr) ? arr : []);
  const bass = pick(data.bass);
  const mid = pick(data.mid);
  const high = pick(data.high);
  const level = pick(data.level);
  const len = Math.max(bass.length, mid.length, high.length, level.length, 1);

  const at = (arr, i) => (arr.length ? arr[Math.min(arr.length - 1, i)] ?? 0 : 0);
  const beats = Array.isArray(data.beats) ? data.beats : [];
  const beatAt = (t) => {
    // 1 if within ~120ms after a beat time
    for (let i = 0; i < beats.length; i++) {
      const d = t - beats[i];
      if (d >= 0 && d < 0.12) return 1 - d / 0.12;
      if (beats[i] > t) break;
    }
    return 0;
  };

  return {
    rate,
    duration: data.duration ?? len / rate,
    sample(t) {
      const i = Math.max(0, Math.min(len - 1, Math.round(t * rate)));
      return {
        bass: at(bass, i),
        mid: at(mid, i),
        high: at(high, i),
        level: at(level, i),
        beat: beatAt(t),
      };
    },
  };
}
