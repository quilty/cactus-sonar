"use client";

import { useEffect } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine } from "@/audio/engine";
import { usePreset } from "@/state/preset";

// Time knobs are logarithmic across a [minMs, maxMs] window.
// Returns seconds (Tone.js param unit).
const knobToTime = (v: number, minMs: number, maxMs: number): number =>
  (minMs * Math.pow(maxMs / minMs, v)) / 1000;

const timeToKnob = (s: number, minMs: number, maxMs: number): number => {
  const ms = s * 1000;
  return Math.log(ms / minMs) / Math.log(maxMs / minMs);
};

const ATK_MIN = 1, ATK_MAX = 2000;     // 1ms → 2s
const DEC_MIN = 5, DEC_MAX = 4000;     // 5ms → 4s
const REL_MIN = 5, REL_MAX = 6000;     // 5ms → 6s

const formatTime = (s: number): string =>
  s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(2)} s`;

type Props = { powered: boolean };

export function Envelope({ powered }: Props) {
  const [a, setA] = usePreset("env.a", timeToKnob(0.005, ATK_MIN, ATK_MAX));
  const [d, setD] = usePreset("env.d", timeToKnob(0.2, DEC_MIN, DEC_MAX));
  const [s, setS] = usePreset("env.s", 0.7);
  const [r, setR] = usePreset("env.r", timeToKnob(0.4, REL_MIN, REL_MAX));

  // Sync on power-on.
  useEffect(() => {
    if (!powered) return;
    engine.setAttack(knobToTime(a, ATK_MIN, ATK_MAX));
    engine.setDecay(knobToTime(d, DEC_MIN, DEC_MAX));
    engine.setSustain(s);
    engine.setRelease(knobToTime(r, REL_MIN, REL_MAX));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powered]);

  useEffect(() => {
    if (powered) engine.setAttack(knobToTime(a, ATK_MIN, ATK_MAX));
  }, [a, powered]);
  useEffect(() => {
    if (powered) engine.setDecay(knobToTime(d, DEC_MIN, DEC_MAX));
  }, [d, powered]);
  useEffect(() => {
    if (powered) engine.setSustain(s);
  }, [s, powered]);
  useEffect(() => {
    if (powered) engine.setRelease(knobToTime(r, REL_MIN, REL_MAX));
  }, [r, powered]);

  return (
    <Module title="ENV 01" hp={12} accent="var(--env-accent)">
      <div className="grid grid-cols-2 gap-3 mt-1">
        <Knob
          label="atk"
          value={a}
          onChange={setA}
          format={(v) => formatTime(knobToTime(v, ATK_MIN, ATK_MAX))}
        />
        <Knob
          label="dec"
          value={d}
          onChange={setD}
          format={(v) => formatTime(knobToTime(v, DEC_MIN, DEC_MAX))}
        />
        <Knob
          label="sus"
          value={s}
          onChange={setS}
          format={(v) => v.toFixed(2)}
        />
        <Knob
          label="rel"
          value={r}
          onChange={setR}
          format={(v) => formatTime(knobToTime(v, REL_MIN, REL_MAX))}
        />
      </div>

      {!powered && (
        <div className="mt-2 text-[9px] uppercase tracking-widest text-zinc-600 italic">
          power off
        </div>
      )}
    </Module>
  );
}
