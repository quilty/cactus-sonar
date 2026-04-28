"use client";

import * as Tone from "tone";

export type Waveform = "sine" | "triangle" | "sawtooth" | "square";
export type FilterType = "lowpass" | "highpass" | "bandpass";
export type LFODestination = "off" | "cutoff" | "pitch" | "amp";
export type OscIndex = 0 | 1;

/** A4 = MIDI 69 = 440Hz. Equal temperament. */
export const midiToHz = (midi: number): number =>
  440 * Math.pow(2, (midi - 69) / 12);

const VOICE_COUNT = 8;

/**
 * One polyphonic voice. Two oscillators each gain-staged before being summed
 * into a per-voice amplitude envelope. The envelope feeds into the shared
 * filter, then to the master output.
 *
 *   osc1 → gain1 ─┐
 *                 ├── envelope → (shared) filter → masterGain → destination
 *   osc2 → gain2 ─┘
 */
type Voice = {
  osc1: Tone.Oscillator;
  osc2: Tone.Oscillator;
  gain1: Tone.Gain;
  gain2: Tone.Gain;
  envelope: Tone.AmplitudeEnvelope;
  /** -1 = idle. Otherwise the MIDI note this voice is currently playing. */
  midi: number;
};

class AudioEngine {
  private filter: Tone.Filter | null = null;
  private masterGain: Tone.Gain | null = null;
  private lfo: Tone.LFO | null = null;
  private waveform: Tone.Waveform | null = null;
  private voices: Voice[] = [];
  private started = false;

  /** Per-oscillator tuning state, used when applying frequency to voices. */
  private oscTune: [number, number] = [0, 0]; // semitones (float)
  private oscDetune: [number, number] = [0, 0]; // cents (float)

  /** Mixer levels (0..1) for osc1 and osc2. */
  private mixLevels: [number, number] = [1.0, 0.0];

  private lfoDestination: LFODestination = "off";
  private lfoAmount = 0;

  private polyphony = false;
  private heldNotes: number[] = [];
  private noteToVoice = new Map<number, Voice>();
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

    for (let i = 0; i < VOICE_COUNT; i++) {
      this.voices.push(this.createVoice());
    }

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

  private createVoice(): Voice {
    const envelope = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: 0.2,
      sustain: 0.7,
      release: 0.4,
    }).connect(this.filter!);

    const gain1 = new Tone.Gain(this.mixLevels[0]).connect(envelope);
    const gain2 = new Tone.Gain(this.mixLevels[1]).connect(envelope);

    const osc1 = new Tone.Oscillator({
      frequency: 220,
      type: "sine",
    }).connect(gain1);
    const osc2 = new Tone.Oscillator({
      frequency: 220,
      type: "sawtooth",
    }).connect(gain2);
    osc1.start();
    osc2.start();

    return { osc1, osc2, gain1, gain2, envelope, midi: -1 };
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
    this.allNotesOff();
    this.polyphony = enabled;
  }
  isPoly(): boolean {
    return this.polyphony;
  }

  // ── Per-oscillator controls (fan out to all voices) ───────────

  setOscWaveform(idx: OscIndex, type: Waveform): void {
    for (const v of this.voices) {
      (idx === 0 ? v.osc1 : v.osc2).type = type;
    }
  }

  setOscTune(idx: OscIndex, semitones: number): void {
    this.oscTune[idx] = semitones;
    // Re-tune any voice that's currently sounding.
    if (this.polyphony) {
      for (const [midi, voice] of this.noteToVoice) {
        this.applyOscFrequency(voice, idx, midi);
      }
    } else if (this.heldNotes.length > 0) {
      const top = this.heldNotes[this.heldNotes.length - 1];
      this.applyOscFrequency(this.voices[0], idx, top);
    }
  }

  setOscDetune(idx: OscIndex, cents: number): void {
    this.oscDetune[idx] = cents;
    // detune.value is the static offset; LFO connections (when active) sum on top.
    for (const v of this.voices) {
      (idx === 0 ? v.osc1 : v.osc2).detune.value = cents;
    }
  }

  // ── Mixer ─────────────────────────────────────────────────────

  setMixLevel(idx: OscIndex, level01: number): void {
    const clamped = Math.max(0, Math.min(1, level01));
    this.mixLevels[idx] = clamped;
    for (const v of this.voices) {
      const target = idx === 0 ? v.gain1 : v.gain2;
      target.gain.rampTo(clamped, 0.05);
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
        // Both oscillators of every voice — vibrato applies to whole voice.
        for (const v of this.voices) {
          this.lfo.connect(v.osc1.detune);
          this.lfo.connect(v.osc2.detune);
        }
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

  private noteOnMono(midi: number): void {
    if (this.heldNotes.includes(midi)) return;
    const voice = this.voices[0];
    if (!voice) return;
    const wasEmpty = this.heldNotes.length === 0;
    this.heldNotes.push(midi);
    this.applyVoiceFrequency(voice, midi);
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
      this.applyVoiceFrequency(voice, top);
    }
  }

  private noteOnPoly(midi: number): void {
    if (this.noteToVoice.has(midi)) return;
    let voice = this.voices.find((v) => v.midi === -1);
    if (!voice) {
      voice = this.voiceOrder.shift();
      if (!voice) return;
      this.noteToVoice.delete(voice.midi);
    }
    this.applyVoiceFrequency(voice, midi);
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

  // ── Internal frequency application ────────────────────────────

  private applyVoiceFrequency(voice: Voice, midi: number): void {
    voice.osc1.frequency.rampTo(midiToHz(midi + this.oscTune[0]), 0.01);
    voice.osc2.frequency.rampTo(midiToHz(midi + this.oscTune[1]), 0.01);
  }

  private applyOscFrequency(
    voice: Voice,
    idx: OscIndex,
    midi: number,
  ): void {
    const osc = idx === 0 ? voice.osc1 : voice.osc2;
    osc.frequency.rampTo(midiToHz(midi + this.oscTune[idx]), 0.01);
  }
}

export const engine = new AudioEngine();
