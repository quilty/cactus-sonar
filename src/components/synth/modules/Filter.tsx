"use client";

import { useEffect } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine, type FilterType } from "@/audio/engine";
import { usePreset } from "@/state/preset";

const FILTER_TYPES: FilterType[] = ["lowpass", "highpass", "bandpass"];
const TYPE_LABEL: Record<FilterType, string> = {
  lowpass: "lp",
  highpass: "hp",
  bandpass: "bp",
};

const MIN_HZ = 20;
const MAX_HZ = 18000;
const knobToCutoff = (v: number): number =>
  MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, v);
const cutoffToKnob = (hz: number): number =>
  Math.log(hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ);

const MAX_Q = 18; // beyond ~10 the filter self-oscillates; cap for safety
const knobToQ = (v: number): number => v * MAX_Q;

const formatHz = (hz: number): string =>
  hz < 1000 ? `${Math.round(hz)} Hz` : `${(hz / 1000).toFixed(2)} kHz`;

type Props = { powered: boolean };

export function Filter({ powered }: Props) {
  const [cutoff, setCutoff] = usePreset("vcf.cutoff", cutoffToKnob(2000));
  const [reso, setReso] = usePreset("vcf.reso", 0.05);
  const [type, setType] = usePreset<FilterType>("vcf.type", "lowpass");

  useEffect(() => {
    if (powered) engine.setFilterCutoff(knobToCutoff(cutoff));
  }, [cutoff, powered]);
  useEffect(() => {
    if (powered) engine.setFilterResonance(knobToQ(reso));
  }, [reso, powered]);
  useEffect(() => {
    if (powered) engine.setFilterType(type);
  }, [type, powered]);

  return (
    <Module title="VCF 01" hp={12} accent="var(--vcf-accent)">
      <Knob
        label="cutoff"
        value={cutoff}
        onChange={setCutoff}
        format={(v) => formatHz(knobToCutoff(v))}
      />
      <Knob
        label="reso"
        value={reso}
        onChange={setReso}
        format={(v) => knobToQ(v).toFixed(1)}
      />

      <div className="flex flex-col gap-1 w-full pt-2">
        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 text-center">
          type
        </div>
        <div
          className="nodrag grid grid-cols-3 gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="text-[10px] uppercase tracking-wider rounded px-1 py-1 border transition-colors"
              style={
                type === t
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
              {TYPE_LABEL[t]}
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
