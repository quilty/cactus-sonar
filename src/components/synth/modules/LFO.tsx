"use client";

import { useEffect } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine, type LFODestination, type Waveform } from "@/audio/engine";
import { usePreset } from "@/state/preset";

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
  const [rate, setRate] = usePreset("lfo.rate", rateToKnob(1));
  const [amount, setAmount] = usePreset("lfo.amount", 0);
  const [wave, setWave] = usePreset<Waveform>("lfo.wave", "triangle");
  const [dest, setDest] = usePreset<LFODestination>("lfo.dest", "off");

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
    <Module title="LFO 01" hp={12} accent="var(--lfo-accent)">
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
              className="text-[10px] uppercase tracking-wider rounded px-1 py-1 border transition-colors"
              style={
                wave === w
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

      <div className="flex flex-col gap-1 w-full pt-1">
        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 text-center">
          dest
        </div>
        <div className="grid grid-cols-2 gap-1">
          {DESTS.map((d) => (
            <button
              key={d}
              onClick={() => setDest(d)}
              className="text-[10px] uppercase tracking-wider rounded px-1 py-1 border transition-colors"
              style={
                dest === d
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
