"use client";

import * as Tone from "tone";

export type Waveform = "sine" | "triangle" | "sawtooth" | "square";

/** A4 = MIDI 69 = 440Hz. Equal temperament. */
export const midiToHz = (midi: number): number =>
  440 * Math.pow(2, (midi - 69) / 12);

/**
 * Audio engine — owns every Tone.js object.
 *
 * Signal chain:
 *   Oscillator → AmplitudeEnvelope → masterGain → destination
 *
 * Note model: monophonic with last-note priority and legato.
 *   - heldNotes is ordered (most-recent at end).
 *   - Pressing the first key triggers the envelope.
 *   - Pressing additional keys slides the oscillator pitch but does NOT
 *     retrigger the envelope (legato).
 *   - Releasing keys slides back to the next-most-recent held note.
 *   - Releasing the last key triggers envelope release.
 */
class AudioEngine {
  private oscillator: Tone.Oscillator | null = null;
  private envelope: Tone.AmplitudeEnvelope | null = null;
  private masterGain: Tone.Gain | null = null;
  /** Parallel tap on the master output for visualization. Doesn't affect audio. */
  private waveform: Tone.Waveform | null = null;
  private started = false;

  /** Held notes, ordered. Last element is the currently-sounding pitch. */
  private heldNotes: number[] = [];

  /** Tuning offset in semitones (float). Applied on top of the played note. */
  private tuneSemitones = 0;

  /** Idempotent. Must be called from a user gesture. */
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

    this.oscillator = new Tone.Oscillator({
      frequency: 220,
      type: "sine",
    }).connect(this.envelope);
    this.oscillator.start();

    // Scope tap: parallel branch off masterGain, doesn't disrupt audio path.
    this.waveform = new Tone.Waveform(1024);
    this.masterGain.connect(this.waveform);

    this.started = true;
  }

  /** Latest time-domain samples [-1..1], or null before init. */
  getWaveform(): Float32Array | null {
    if (!this.waveform) return null;
    // Tone returns its own array type that's array-like; cast for the consumer.
    return this.waveform.getValue() as unknown as Float32Array;
  }

  isStarted(): boolean {
    return this.started;
  }

  // ── Oscillator controls ───────────────────────────────────────

  setWaveform(type: Waveform): void {
    if (this.oscillator) this.oscillator.type = type;
  }

  setTuneSemitones(n: number): void {
    this.tuneSemitones = n;
    if (this.heldNotes.length > 0) {
      this.applyFrequency(this.heldNotes[this.heldNotes.length - 1]);
    }
  }

  // ── Envelope controls ─────────────────────────────────────────

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

  // ── Note triggering ───────────────────────────────────────────

  noteOn(midi: number): void {
    if (!this.envelope || !this.oscillator) return;
    if (this.heldNotes.includes(midi)) return; // dedupe key repeat

    const wasEmpty = this.heldNotes.length === 0;
    this.heldNotes.push(midi);
    this.applyFrequency(midi);
    if (wasEmpty) {
      this.envelope.triggerAttack();
    }
    // else: legato — pitch slides but envelope keeps going
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

  /** Force release everything. Used on window blur to prevent stuck notes. */
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
