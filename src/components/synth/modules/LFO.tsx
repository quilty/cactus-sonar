"use client";

import { useEffect, useState } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine, type LFODestination, type Waveform } from "@/audio/engine";

const WAVES: Waveform[] = ["sine", "triangle", "sawtooth", "square"];
const DESTS: LFODestination[] = ["off", "cutoff", "pitch", "amp"];

const RATE_MIN = 0.05;
const RATE_MAX = 30;
const knobToRate = (v: number): number =>
  RATE_MIN * Math.pow(RATE_MAX / RATE_MIN, v);
const rateToKnob = (hz: number): number =>
  Math.log(hz / RATE_MIN) / Math.log(RATE_MAX / RATE_MIN);

const formatRate = (hz: number): string =>
  hz < 1 ? `${hz.toFixed(2)} Hz` : `${hz.toFixed(1)} Hz`;

type Props = { powered: boolean };

export function LFO({ powered }: Props) {
  const [rate, setRate] = useState(() => rateToKnob(1));
  const [amount, setAmount] = useState(0);
  const [wave, setWave] = useState<Waveform>("triangle");
  const [dest, setDest] = useState<LFODestination>("off");

  useEffect(() => {
    if (!powered) return;
    engine.setLFORate(knobToRate(rate));
    engine.setLFOAmount(amount);
    engine.setLFOWaveform(wave);
    engine.setLFODestination(dest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powered]);

  useEffect(() => {
    if (powered) engine.setLFORate(knobToRate(rate));
  }, [rate, powered]);
  useEffect(() => {
    if (powered) engine.setLFOAmount(amount);
  }, [amount, powered]);
  useEffect(() => {
    if (powered) engine.setLFOWaveform(wave);
  }, [wave, powered]);
  useEffect(() => {
    if (powered) engine.setLFODestination(dest);
  }, [dest, powered]);

  return (
    <Module title="LFO 01" hp={12}>
      <Knob
        label="rate"
        value={rate}
        onChange={setRate}
        format={(v) => formatRate(knobToRate(v))}
      />
      <Knob
        label="amt"
        value={amount}
        onChange={setAmount}
        format={(v) => v.toFixed(2)}
      />

      <div className="flex flex-col gap-1 w-full pt-1">
        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 text-center">
          wave
        </div>
        <div className="grid grid-cols-2 gap-1">
          {WAVES.map((w) => (
            <button
              key={w}
              onClick={() => setWave(w)}
              className={`text-[10px] uppercase tracking-wider rounded px-1 py-1 border transition-colors ${
                wave === w
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 w-full pt-1">
        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 text-center">
          dest
        </div>
        <div className="grid grid-cols-2 gap-1">
          {DESTS.map((d) => (
            <button
              key={d}
              onClick={() => setDest(d)}
              className={`text-[10px] uppercase tracking-wider rounded px-1 py-1 border transition-colors ${
                dest === d
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {d}
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
