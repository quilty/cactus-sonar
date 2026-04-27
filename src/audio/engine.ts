"use client";

import * as Tone from "tone";

export type Waveform = "sine" | "triangle" | "sawtooth" | "square";

/**
 * The audio engine owns every Tone.js object in the app.
 *
 * Design rules:
 *   - UI components never import `tone` directly. They go through this engine.
 *   - All Tone objects are created lazily inside `init()`, which MUST run from
 *     a user gesture (browser autoplay policy).
 *   - Setters are no-ops before init, so UI doesn't have to gate every call.
 *   - Param changes use `rampTo` to avoid clicks/zipper noise.
 */
class AudioEngine {
  private oscillator: Tone.Oscillator | null = null;
  private outGain: Tone.Gain | null = null;
  private started = false;

  /** Idempotent. Must be called from a user gesture (click, keypress, etc.). */
  async init(): Promise<void> {
    if (this.started) return;
    await Tone.start();

    // Master output, starts silent. Capped at 0.6 (≈ -4 dBFS) for headroom.
    this.outGain = new Tone.Gain(0).toDestination();

    this.oscillator = new Tone.Oscillator({
      frequency: 220,
      type: "sine",
    }).connect(this.outGain);
    this.oscillator.start();

    this.started = true;
  }

  isStarted(): boolean {
    return this.started;
  }

  /** Hz, smoothly ramped. */
  setFrequency(hz: number): void {
    this.oscillator?.frequency.rampTo(hz, 0.02);
  }

  setWaveform(type: Waveform): void {
    if (this.oscillator) this.oscillator.type = type;
  }

  /** Level in 0..1, perceptually scaled. */
  setLevel(level01: number): void {
    if (!this.outGain) return;
    const clamped = Math.max(0, Math.min(1, level01));
    // Square law approximates perceptual loudness; 0.6 cap is for headroom.
    const gain = clamped * clamped * 0.6;
    this.outGain.gain.rampTo(gain, 0.05);
  }
}

/** Singleton — there is one audio engine per browser tab. */
export const engine = new AudioEngine();
