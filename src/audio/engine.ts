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
 * Per-voice drift factors. Spread evenly from -1..+1 across voices, with
 * osc1/osc2 within a voice deliberately opposite. This gives mono mode
 * (just voice 0) a real "two oscillators detuning apart" character when
 * the drift knob is up, not just luck-of-the-draw.
 */
function driftFactorsFor(index: number): [number, number] {
  const half = (VOICE_COUNT - 1) / 2;
  const f = (index - half) / half; // -1..+1
  return [f, -f];
}

type Voice = {
  osc1: Tone.Oscillator;
  osc2: Tone.Oscillator;
  gain1: Tone.Gain;
  gain2: Tone.Gain;
  envelope: Tone.AmplitudeEnvelope;
  /** Static drift factors per oscillator. Multiplied by global drift cents. */
  driftFactor: [number, number];
  /** -1 = idle. Otherwise the MIDI note this voice is currently playing. */
  midi: number;
};

/**
 * Audio engine.
 *
 * Signal chain:
 *   voice(osc1+osc2 → env) → filter → delay → reverb → masterGain → destination
 *                                                                ↓
 *                                                          waveform tap
 *
 * LFO destinations:
 *   cutoff → filter.frequency
 *   amp    → masterGain.gain
 *   pitch  → fanned out to every voice osc detune
 */
class AudioEngine {
  private filter: Tone.Filter | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private reverb: Tone.Reverb | null = null;
  private masterGain: Tone.Gain | null = null;
  private lfo: Tone.LFO | null = null;
  /** LFO scalers — one per destination. Gain controls modulation depth. */
  private lfoToCutoff: Tone.Gain | null = null;
  private lfoToPitch: Tone.Gain | null = null;
  private lfoToAmp: Tone.Gain | null = null;
  private waveform: Tone.Waveform | null = null;
  private voices: Voice[] = [];
  private started = false;

  /** Per-osc tuning state. */
  private oscTune: [number, number] = [0, 0];
  private oscDetune: [number, number] = [0, 0];

  /** Global drift in cents (multiplied by each voice's drift factors). */
  private voiceDriftCents = 0;

  /** Mixer levels (0..1). */
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

    // Effects chain: filter → delay → reverb → master.
    this.reverb = new Tone.Reverb({
      decay: 2.5,
      preDelay: 0.01,
      wet: 0,
    }).connect(this.masterGain);
    // Async IR build; we don't await — wet defaults to 0 so it's inaudible
    // during the brief generation window anyway.
    this.reverb.generate();

    this.delay = new Tone.FeedbackDelay({
      delayTime: 0.3,
      feedback: 0.35,
      wet: 0,
    }).connect(this.reverb);

    this.filter = new Tone.Filter({
      type: "lowpass",
      frequency: 2000,
      Q: 1,
    }).connect(this.delay);

    for (let i = 0; i < VOICE_COUNT; i++) {
      this.voices.push(this.createVoice(i));
    }

    // LFO routing topology — fixed at init, never reconnects at runtime.
    // The LFO outputs ±1 (bipolar) and fans out to three scaling Gain nodes,
    // each statically wired to its target AudioParam. Switching destinations
    // just changes the scaler gains; no audio-graph mutation, no disconnect
    // quirks, no clicks.
    this.lfoToCutoff = new Tone.Gain(0).connect(this.filter.frequency);
    this.lfoToAmp = new Tone.Gain(0).connect(this.masterGain.gain);
    this.lfoToPitch = new Tone.Gain(0);
    for (const v of this.voices) {
      this.lfoToPitch.connect(v.osc1.detune);
      this.lfoToPitch.connect(v.osc2.detune);
    }

    this.lfo = new Tone.LFO({
      frequency: 1,
      type: "triangle",
      min: -1,
      max: 1,
    }).start();
    this.lfo.connect(this.lfoToCutoff);
    this.lfo.connect(this.lfoToPitch);
    this.lfo.connect(this.lfoToAmp);

    this.waveform = new Tone.Waveform(1024);
    this.masterGain.connect(this.waveform);

    this.started = true;
  }

  private createVoice(index: number): Voice {
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

    return {
      osc1,
      osc2,
      gain1,
      gain2,
      envelope,
      driftFactor: driftFactorsFor(index),
      midi: -1,
    };
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

  // ── Per-oscillator controls ───────────────────────────────────

  setOscWaveform(idx: OscIndex, type: Waveform): void {
    for (const v of this.voices) {
      (idx === 0 ? v.osc1 : v.osc2).type = type;
    }
  }

  setOscTune(idx: OscIndex, semitones: number): void {
    this.oscTune[idx] = semitones;
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
    for (const v of this.voices) this.updateDetuneForVoice(v);
  }

  setVoiceDrift(cents: number): void {
    this.voiceDriftCents = cents;
    for (const v of this.voices) this.updateDetuneForVoice(v);
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

  /**
   * Route the LFO by adjusting per-target send gains. The LFO itself stays
   * permanently connected — every reroute is just gain ramps on three nodes,
   * which is glitch-free and immune to Tone's disconnect quirks.
   */
  private routeLFO(): void {
    if (!this.lfoToCutoff || !this.lfoToPitch || !this.lfoToAmp) return;

    let cutoff = 0;
    let pitch = 0;
    let amp = 0;

    if (this.lfoDestination !== "off" && this.lfoAmount > 0) {
      switch (this.lfoDestination) {
        case "cutoff":
          cutoff = 3000 * this.lfoAmount;
          break;
        case "pitch":
          pitch = 100 * this.lfoAmount;
          break;
        case "amp":
          amp = 0.3 * this.lfoAmount;
          break;
      }
    }

    this.lfoToCutoff.gain.rampTo(cutoff, 0.02);
    this.lfoToPitch.gain.rampTo(pitch, 0.02);
    this.lfoToAmp.gain.rampTo(amp, 0.02);
  }

  // ── FX: Delay ─────────────────────────────────────────────────

  setDelayTime(seconds: number): void {
    this.delay?.delayTime.rampTo(seconds, 0.05);
  }
  setDelayFeedback(amount01: number): void {
    if (this.delay) {
      this.delay.feedback.value = Math.max(0, Math.min(0.95, amount01));
    }
  }
  setDelayLevel(wet01: number): void {
    if (this.delay) {
      this.delay.wet.rampTo(Math.max(0, Math.min(1, wet01)), 0.05);
    }
  }

  // ── FX: Reverb ────────────────────────────────────────────────

  setReverbDecay(seconds: number): void {
    if (this.reverb) {
      // decay is a property; setting it triggers IR regeneration internally.
      this.reverb.decay = seconds;
    }
  }
  setReverbLevel(wet01: number): void {
    if (this.reverb) {
      this.reverb.wet.rampTo(Math.max(0, Math.min(1, wet01)), 0.05);
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

  // ── Internal ──────────────────────────────────────────────────

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

  /** Recompute static detune (user detune + drift) for a voice. */
  private updateDetuneForVoice(voice: Voice): void {
    const drift0 = this.voiceDriftCents * voice.driftFactor[0];
    const drift1 = this.voiceDriftCents * voice.driftFactor[1];
    voice.osc1.detune.value = this.oscDetune[0] + drift0;
    voice.osc2.detune.value = this.oscDetune[1] + drift1;
  }
}

export const engine = new AudioEngine();
