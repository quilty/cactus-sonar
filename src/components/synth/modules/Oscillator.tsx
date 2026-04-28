"use client";

import { useEffect } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine, type OscIndex, type Waveform } from "@/audio/engine";
import { usePreset } from "@/state/preset";

const WAVEFORMS: Waveform[] = ["sine", "triangle", "sawtooth", "square"];

const TUNE_RANGE_ST = 12; // ±12 semitones across the knob
const knobToSemitones = (v: number): number => (v - 0.5) * 2 * TUNE_RANGE_ST;
const formatSemitones = (st: number): string =>
  `${st >= 0 ? "+" : ""}${st.toFixed(1)} st`;

const DETUNE_RANGE_CENTS = 50; // ±50 cents fine detune
const knobToCents = (v: number): number => (v - 0.5) * 2 * DETUNE_RANGE_CENTS;
const formatCents = (c: number): string =>
  `${c >= 0 ? "+" : ""}${c.toFixed(1)} ¢`;

type Props = {
  powered: boolean;
  index: OscIndex;
  title: string;
  /** Default waveform when no preset has been saved. */
  defaultWave?: Waveform;
};

export function Oscillator({
  powered,
  index,
  title,
  defaultWave = "sine",
}: Props) {
  const keyPrefix = index === 0 ? "vco1" : "vco2";
  const [tuneKnob, setTuneKnob] = usePreset(`${keyPrefix}.tune`, 0.5);
  const [detuneKnob, setDetuneKnob] = usePreset(`${keyPrefix}.detune`, 0.5);
  const [waveform, setWaveform] = usePreset<Waveform>(
    `${keyPrefix}.wave`,
    defaultWave,
  );

  useEffect(() => {
    if (!powered) return;
    engine.setOscTune(index, knobToSemitones(tuneKnob));
    engine.setOscDetune(index, knobToCents(detuneKnob));
    engine.setOscWaveform(index, waveform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powered]);

  useEffect(() => {
    if (powered) engine.setOscTune(index, knobToSemitones(tuneKnob));
  }, [tuneKnob, powered, index]);
  useEffect(() => {
    if (powered) engine.setOscDetune(index, knobToCents(detuneKnob));
  }, [detuneKnob, powered, index]);
  useEffect(() => {
    if (powered) engine.setOscWaveform(index, waveform);
  }, [waveform, powered, index]);

  return (
    <Module title={title} hp={10} accent="var(--vco-accent)">
      <Knob
        label="tune"
        value={tuneKnob}
        onChange={setTuneKnob}
        format={(v) => formatSemitones(knobToSemitones(v))}
      />
      <Knob
        label="detune"
        value={detuneKnob}
        onChange={setDetuneKnob}
        format={(v) => formatCents(knobToCents(v))}
      />

      <div className="flex flex-col gap-1 w-full pt-2">
        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 text-center">
          wave
        </div>
        <div className="grid grid-cols-2 gap-1">
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              onClick={() => setWaveform(w)}
              className="text-[10px] uppercase tracking-wider rounded px-1 py-1 border transition-colors"
              style={
                waveform === w
                  ? {
                      borderColor: "var(--accent)",
                      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                      color: "var(--accent)",
                    }
                  : {
                      borderColor: "#3f3f46",
                      background: "#18121f",
                      color: "#a1a1aa",
                    }
              }
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {!powered && (
        <div className="mt-2 text-[9px] uppercase tracking-widest text-zinc-600 italic">
          power off
        </div>
      )}
    </Module>
  );
}
