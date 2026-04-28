"use client";

import * as Tone from "tone";

export type Waveform = "sine" | "triangle" | "sawtooth" | "square";
export type FilterType = "lowpass" | "highpass" | "bandpass";
export type LFODestination = "off" | "cutoff" | "pitch" | "amp";

/** A4 = MIDI 69 = 440Hz. Equal temperament. */
export const midiToHz = (midi: number): number =>
  440 * Math.pow(2, (midi - 69) / 12);

const VOICE_COUNT = 8;

type Voice = {
  oscillator: Tone.Oscillator;
  envelope: Tone.AmplitudeEnvelope;
  /** -1 = idle. Otherwise the MIDI note this voice is currently playing. */
  midi: number;
};

/**
 * Audio engine — owns every Tone.js object.
 *
 * Signal chain (per voice → shared tail):
 *   voice(oscillator → envelope) ──┐
 *                                  ├── filter → masterGain → destination
 *   voice(oscillator → envelope) ──┘                                ↓
 *                                                              waveform tap
 *
 * Voice model:
 *   - All voices are pre-allocated at init() and run continuously.
 *   - In MONO mode (default), only voice[0] is used. Last-note priority +
 *     legato are preserved (envelope only retriggers on the first held key).
 *   - In POLY mode, every noteOn allocates a free voice (or steals the
 *     longest-playing one if all 8 are busy). Each voice has its own
 *     envelope, so chords get independent amplitude shaping.
 *
 * LFO routing:
 *   - cutoff → shared filter.frequency
 *   - amp    → shared masterGain.gain
 *   - pitch  → fanned out to every voice oscillator's detune
 */
class AudioEngine {
  private filter: Tone.Filter | null = null;
  private masterGain: Tone.Gain | null = null;
  private lfo: Tone.LFO | null = null;
  private waveform: Tone.Waveform | null = null;
  private voices: Voice[] = [];
  private started = false;

  /** Tuning offset in semitones (float). Applied on top of the played note. */
  private tuneSemitones = 0;

  /** Current LFO routing state. */
  private lfoDestination: LFODestination = "off";
  private lfoAmount = 0;

  /** Mode + per-mode bookkeeping. */
  private polyphony = false;
  /** MONO: held keys, ordered. Last is the currently-sounding pitch. */
  private heldNotes: number[] = [];
  /** POLY: which voice is currently allocated to which MIDI note. */
  private noteToVoice = new Map<number, Voice>();
  /** POLY: voices ordered by allocation age. Oldest at front, for stealing. */
  private voiceOrder: Voice[] = [];

  async init(): Promise<void> {
    if (this.started) return;
    await Tone.start();

    this.masterGain = new Tone.Gain(0.6).toDestination();

    this.filter = new Tone.Filter({
      type: "lowpass",
      frequency: 2000,
      Q: 1,
    }).connect(this.masterGain);

    // Allocate voice pool. Each voice = osc → envelope → shared filter.
    for (let i = 0; i < VOICE_COUNT; i++) {
      this.voices.push(this.createVoice());
    }

    // LFO runs continuously; routing is what makes it audible.
    this.lfo = new Tone.LFO({
      frequency: 1,
      type: "triangle",
      min: 0,
      max: 0,
    }).start();

    // Scope tap on master output.
    this.waveform = new Tone.Waveform(1024);
    this.masterGain.connect(this.waveform);

    this.started = true;
  }

  private createVoice(): Voice {
    const envelope = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: 0.2,
      sustain: 0.7,
      release: 0.4,
    }).connect(this.filter!);
    const oscillator = new Tone.Oscillator({
      frequency: 220,
      type: "sine",
    }).connect(envelope);
    oscillator.start();
    return { oscillator, envelope, midi: -1 };
  }

  isStarted(): boolean {
    return this.started;
  }

  getWaveform(): Float32Array | null {
    if (!this.waveform) return null;
    return this.waveform.getValue() as unknown as Float32Array;
  }

  // ── Mode ──────────────────────────────────────────────────────

  setPolyphony(enabled: boolean): void {
    if (this.polyphony === enabled) return;
    // Clean slate so we don't carry stuck notes across the mode boundary.
    this.allNotesOff();
    this.polyphony = enabled;
  }

  isPoly(): boolean {
    return this.polyphony;
  }

  // ── Oscillator (fans out to all voices) ───────────────────────

  setWaveform(type: Waveform): void {
    for (const v of this.voices) v.oscillator.type = type;
  }

  setTuneSemitones(n: number): void {
    this.tuneSemitones = n;
    if (this.polyphony) {
      // Re-tune every active poly voice.
      for (const [midi, voice] of this.noteToVoice) {
        voice.oscillator.frequency.rampTo(midiToHz(midi + n), 0.01);
      }
    } else if (this.heldNotes.length > 0) {
      const top = this.heldNotes[this.heldNotes.length - 1];
      this.voices[0]?.oscillator.frequency.rampTo(midiToHz(top + n), 0.01);
    }
  }

  // ── Filter (shared) ───────────────────────────────────────────

  setFilterCutoff(hz: number): void {
    this.filter?.frequency.rampTo(hz, 0.04);
  }
  setFilterResonance(q: number): void {
    if (this.filter) this.filter.Q.value = q;
  }
  setFilterType(type: FilterType): void {
    if (this.filter) this.filter.type = type;
  }

  // ── Envelope (fans out to all voices) ─────────────────────────

  setAttack(seconds: number): void {
    for (const v of this.voices) v.envelope.attack = seconds;
  }
  setDecay(seconds: number): void {
    for (const v of this.voices) v.envelope.decay = seconds;
  }
  setSustain(level01: number): void {
    const clamped = Math.max(0, Math.min(1, level01));
    for (const v of this.voices) v.envelope.sustain = clamped;
  }
  setRelease(seconds: number): void {
    for (const v of this.voices) v.envelope.release = seconds;
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
        const depth = 3000 * this.lfoAmount;
        this.lfo.min = -depth;
        this.lfo.max = depth;
        this.lfo.connect(this.filter.frequency);
        return;
      }
      case "pitch": {
        const depth = 100 * this.lfoAmount;
        this.lfo.min = -depth;
        this.lfo.max = depth;
        // Fan out to every voice oscillator's detune.
        for (const v of this.voices) this.lfo.connect(v.oscillator.detune);
        return;
      }
      case "amp": {
        if (!this.masterGain) return;
        const depth = 0.3 * this.lfoAmount;
        this.lfo.min = -depth;
        this.lfo.max = depth;
        this.lfo.connect(this.masterGain.gain);
        return;
      }
    }
  }

  // ── Note triggering ───────────────────────────────────────────

  noteOn(midi: number): void {
    if (!this.started) return;
    if (this.polyphony) this.noteOnPoly(midi);
    else this.noteOnMono(midi);
  }

  noteOff(midi: number): void {
    if (!this.started) return;
    if (this.polyphony) this.noteOffPoly(midi);
    else this.noteOffMono(midi);
  }

  allNotesOff(): void {
    this.heldNotes = [];
    for (const v of this.voices) {
      v.envelope.triggerRelease();
      v.midi = -1;
    }
    this.noteToVoice.clear();
    this.voiceOrder = [];
  }

  // MONO: legato + last-note priority. Only voice[0] is used.
  private noteOnMono(midi: number): void {
    if (this.heldNotes.includes(midi)) return;
    const voice = this.voices[0];
    if (!voice) return;
    const wasEmpty = this.heldNotes.length === 0;
    this.heldNotes.push(midi);
    voice.oscillator.frequency.rampTo(
      midiToHz(midi + this.tuneSemitones),
      0.01,
    );
    if (wasEmpty) {
      voice.envelope.triggerAttack();
      voice.midi = midi;
    }
  }

  private noteOffMono(midi: number): void {
    const idx = this.heldNotes.indexOf(midi);
    if (idx === -1) return;
    this.heldNotes.splice(idx, 1);
    const voice = this.voices[0];
    if (!voice) return;
    if (this.heldNotes.length === 0) {
      voice.envelope.triggerRelease();
      voice.midi = -1;
    } else {
      const top = this.heldNotes[this.heldNotes.length - 1];
      voice.oscillator.frequency.rampTo(
        midiToHz(top + this.tuneSemitones),
        0.01,
      );
    }
  }

  // POLY: each note gets its own voice. Steal oldest if pool exhausted.
  private noteOnPoly(midi: number): void {
    if (this.noteToVoice.has(midi)) return; // dedupe key repeat

    let voice = this.voices.find((v) => v.midi === -1);
    if (!voice) {
      // Steal: oldest at front of voiceOrder.
      voice = this.voiceOrder.shift();
      if (!voice) return;
      this.noteToVoice.delete(voice.midi);
    }
    voice.oscillator.frequency.rampTo(
      midiToHz(midi + this.tuneSemitones),
      0.005,
    );
    voice.midi = midi;
    voice.envelope.triggerAttack();
    this.noteToVoice.set(midi, voice);
    this.voiceOrder.push(voice);
  }

  private noteOffPoly(midi: number): void {
    const voice = this.noteToVoice.get(midi);
    if (!voice) return;
    voice.envelope.triggerRelease();
    voice.midi = -1;
    this.noteToVoice.delete(midi);
    const idx = this.voiceOrder.indexOf(voice);
    if (idx >= 0) this.voiceOrder.splice(idx, 1);
  }
}

export const engine = new AudioEngine();
