"use client";

import { useEffect, useState } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine, type Waveform } from "@/audio/engine";

const WAVEFORMS: Waveform[] = ["sine", "triangle", "sawtooth", "square"];

const TUNE_RANGE_ST = 12; // ±12 semitones across the knob
// Knob 0..1 → semitones in [-TUNE_RANGE_ST, +TUNE_RANGE_ST], with 0.5 == 0.
const knobToSemitones = (v: number): number => (v - 0.5) * 2 * TUNE_RANGE_ST;
const formatSemitones = (st: number): string =>
  `${st >= 0 ? "+" : ""}${st.toFixed(1)} st`;

type Props = { powered: boolean };

export function Oscillator({ powered }: Props) {
  const [tuneKnob, setTuneKnob] = useState(0.5); // centered = 0 semitones
  const [waveform, setWaveform] = useState<Waveform>("sine");

  // Sync UI → engine on power-on (so engine matches what the knobs say).
  useEffect(() => {
    if (!powered) return;
    engine.setTuneSemitones(knobToSemitones(tuneKnob));
    engine.setWaveform(waveform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powered]);

  useEffect(() => {
    if (powered) engine.setTuneSemitones(knobToSemitones(tuneKnob));
  }, [tuneKnob, powered]);

  useEffect(() => {
    if (powered) engine.setWaveform(waveform);
  }, [waveform, powered]);

  return (
    <Module title="VCO 01" hp={10}>
      <Knob
        label="tune"
        value={tuneKnob}
        onChange={setTuneKnob}
        format={(v) => formatSemitones(knobToSemitones(v))}
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
