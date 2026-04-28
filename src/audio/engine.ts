"use client";

import * as Tone from "tone";

export type Waveform = "sine" | "triangle" | "sawtooth" | "square";
export type FilterType = "lowpass" | "highpass" | "bandpass";
export type LFODestination = "off" | "cutoff" | "pitch" | "amp";

/** A4 = MIDI 69 = 440Hz. Equal temperament. */
export const midiToHz = (midi: number): number =>
  440 * Math.pow(2, (midi - 69) / 12);

/**
 * Audio engine — owns every Tone.js object.
 *
 * Signal chain:
 *   Oscillator → Filter → AmplitudeEnvelope → masterGain → destination
 *                                                        ↓
 *                                                   Waveform tap (parallel)
 *
 * LFO is created but unrouted by default. setLFODestination() patches it
 * onto one of three modulation targets (filter.frequency, oscillator.detune,
 * masterGain.gain). Web Audio sums multiple connections to the same param,
 * so the LFO output adds to the user's static knob value.
 */
class AudioEngine {
  private oscillator: Tone.Oscillator | null = null;
  private filter: Tone.Filter | null = null;
  private envelope: Tone.AmplitudeEnvelope | null = null;
  private masterGain: Tone.Gain | null = null;
  private lfo: Tone.LFO | null = null;
  private waveform: Tone.Waveform | null = null;
  private started = false;

  /** Held notes, ordered. Last element is the currently-sounding pitch. */
  private heldNotes: number[] = [];

  /** Tuning offset in semitones (float). Applied on top of the played note. */
  private tuneSemitones = 0;

  /** Current LFO routing state. */
  private lfoDestination: LFODestination = "off";
  private lfoAmount = 0;

  async init(): Promise<void> {
    if (this.started) return;
    await Tone.start();

    this.masterGain = new Tone.Gain(0.6).toDestination();

    this.envelope = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: 0.2,
      sustain: 0.7,
      release: 0.4,
    }).connect(this.masterGain);

    this.filter = new Tone.Filter({
      type: "lowpass",
      frequency: 2000,
      Q: 1,
    }).connect(this.envelope);

    this.oscillator = new Tone.Oscillator({
      frequency: 220,
      type: "sine",
    }).connect(this.filter);
    this.oscillator.start();

    // LFO runs continuously; routing is what actually makes it audible.
    this.lfo = new Tone.LFO({
      frequency: 1,
      type: "triangle",
      min: 0,
      max: 0,
    }).start();

    this.waveform = new Tone.Waveform(1024);
    this.masterGain.connect(this.waveform);

    this.started = true;
  }

  isStarted(): boolean {
    return this.started;
  }

  getWaveform(): Float32Array | null {
    if (!this.waveform) return null;
    return this.waveform.getValue() as unknown as Float32Array;
  }

  // ── Oscillator ────────────────────────────────────────────────

  setWaveform(type: Waveform): void {
    if (this.oscillator) this.oscillator.type = type;
  }

  setTuneSemitones(n: number): void {
    this.tuneSemitones = n;
    if (this.heldNotes.length > 0) {
      this.applyFrequency(this.heldNotes[this.heldNotes.length - 1]);
    }
  }

  // ── Filter ────────────────────────────────────────────────────

  setFilterCutoff(hz: number): void {
    this.filter?.frequency.rampTo(hz, 0.04);
  }
  setFilterResonance(q: number): void {
    if (this.filter) this.filter.Q.value = q;
  }
  setFilterType(type: FilterType): void {
    if (this.filter) this.filter.type = type;
  }

  // ── Envelope ──────────────────────────────────────────────────

  setAttack(seconds: number): void {
    if (this.envelope) this.envelope.attack = seconds;
  }
  setDecay(seconds: number): void {
    if (this.envelope) this.envelope.decay = seconds;
  }
  setSustain(level01: number): void {
    if (this.envelope) {
      this.envelope.sustain = Math.max(0, Math.min(1, level01));
    }
  }
  setRelease(seconds: number): void {
    if (this.envelope) this.envelope.release = seconds;
  }

  // ── LFO ───────────────────────────────────────────────────────

  setLFORate(hz: number): void {
    if (this.lfo) this.lfo.frequency.value = hz;
  }
  setLFOWaveform(type: Waveform): void {
    if (this.lfo) this.lfo.type = type;
  }
  setLFODestination(dest: LFODestination): void {
    this.lfoDestination = dest;
    this.routeLFO();
  }
  setLFOAmount(amount01: number): void {
    this.lfoAmount = Math.max(0, Math.min(1, amount01));
    this.routeLFO();
  }

  /**
   * Reroutes LFO based on current destination + amount. Disconnects first
   * (idempotent — safe to call repeatedly).
   *
   * Per-destination depth scaling: filter cutoff in Hz, pitch in cents,
   * amp in linear gain. The "right" depth differs wildly between targets,
   * so amount=1 means "max sensible swing" rather than a fixed unit.
   */
  private routeLFO(): void {
    if (!this.lfo) return;
    this.lfo.disconnect();

    if (this.lfoDestination === "off" || this.lfoAmount === 0) {
      this.lfo.min = 0;
      this.lfo.max = 0;
      return;
    }

    switch (this.lfoDestination) {
      case "cutoff": {
        if (!this.filter) return;
        const depth = 3000 * this.lfoAmount; // ±3 kHz max
        this.lfo.min = -depth;
        this.lfo.max = depth;
        this.lfo.connect(this.filter.frequency);
        return;
      }
      case "pitch": {
        if (!this.oscillator) return;
        const depth = 100 * this.lfoAmount; // ±100 cents (1 semitone) max
        this.lfo.min = -depth;
        this.lfo.max = depth;
        this.lfo.connect(this.oscillator.detune);
        return;
      }
      case "amp": {
        if (!this.masterGain) return;
        const depth = 0.3 * this.lfoAmount; // ±0.3 gain max
        this.lfo.min = -depth;
        this.lfo.max = depth;
        this.lfo.connect(this.masterGain.gain);
        return;
      }
    }
  }

  // ── Note triggering ───────────────────────────────────────────

  noteOn(midi: number): void {
    if (!this.envelope || !this.oscillator) return;
    if (this.heldNotes.includes(midi)) return;

    const wasEmpty = this.heldNotes.length === 0;
    this.heldNotes.push(midi);
    this.applyFrequency(midi);
    if (wasEmpty) {
      this.envelope.triggerAttack();
    }
  }

  noteOff(midi: number): void {
    if (!this.envelope || !this.oscillator) return;
    const idx = this.heldNotes.indexOf(midi);
    if (idx === -1) return;
    this.heldNotes.splice(idx, 1);

    if (this.heldNotes.length === 0) {
      this.envelope.triggerRelease();
    } else {
      this.applyFrequency(this.heldNotes[this.heldNotes.length - 1]);
    }
  }

  allNotesOff(): void {
    this.heldNotes = [];
    this.envelope?.triggerRelease();
  }

  // ── Internal ──────────────────────────────────────────────────

  private applyFrequency(midi: number): void {
    if (!this.oscillator) return;
    this.oscillator.frequency.rampTo(
      midiToHz(midi + this.tuneSemitones),
      0.01,
    );
  }
}

export const engine = new AudioEngine();
