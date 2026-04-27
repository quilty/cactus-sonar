"use client";

import { useEffect, useState } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine, type Waveform } from "@/audio/engine";

const WAVEFORMS: Waveform[] = ["sine", "triangle", "sawtooth", "square"];
const MIN_FREQ = 30;
const MAX_FREQ = 2000;

// Knob sweeps logarithmically across the audible range — feels musical.
const knobToFreq = (v: number): number =>
  MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, v);
const freqToKnob = (f: number): number =>
  Math.log(f / MIN_FREQ) / Math.log(MAX_FREQ / MIN_FREQ);

type Props = {
  powered: boolean;
};

export function Oscillator({ powered }: Props) {
  const [freqKnob, setFreqKnob] = useState(() => freqToKnob(220)); // A3
  const [level, setLevel] = useState(0);
  const [waveform, setWaveform] = useState<Waveform>("sine");

  // When power flips on, push the current UI state into the freshly-init'd
  // engine so we don't have a silent moment where the engine has defaults
  // that don't match the visible knobs.
  useEffect(() => {
    if (!powered) return;
    engine.setFrequency(knobToFreq(freqKnob));
    engine.setLevel(level);
    engine.setWaveform(waveform);
    // intentionally only on `powered` flipping — see per-control effects below
    // for live updates after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powered]);

  useEffect(() => {
    if (powered) engine.setFrequency(knobToFreq(freqKnob));
  }, [freqKnob, powered]);

  useEffect(() => {
    if (powered) engine.setLevel(level);
  }, [level, powered]);

  useEffect(() => {
    if (powered) engine.setWaveform(waveform);
  }, [waveform, powered]);

  return (
    <Module title="VCO 01" hp={10}>
      <Knob
        label="freq"
        value={freqKnob}
        onChange={setFreqKnob}
        format={(v) => {
          const hz = knobToFreq(v);
          return hz < 100 ? `${hz.toFixed(1)} Hz` : `${Math.round(hz)} Hz`;
        }}
      />

      <Knob
        label="level"
        value={level}
        onChange={setLevel}
        format={(v) => v.toFixed(2)}
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
              className={`text-[10px] uppercase tracking-wider rounded px-1 py-1 border transition-colors ${
                waveform === w
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
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
