"use client";

import { useEffect, type ReactNode } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine } from "@/audio/engine";
import { usePreset } from "@/state/preset";

// ── Knob mappings ────────────────────────────────────────────────

const DELAY_TIME_MIN_MS = 1;
const DELAY_TIME_MAX_MS = 1500;
const knobToDelayTime = (v: number): number =>
  (DELAY_TIME_MIN_MS *
    Math.pow(DELAY_TIME_MAX_MS / DELAY_TIME_MIN_MS, v)) /
  1000;
const formatTime = (s: number): string =>
  s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(2)} s`;

const REVERB_DECAY_MIN_S = 0.5;
const REVERB_DECAY_MAX_S = 8;
const knobToReverbDecay = (v: number): number =>
  REVERB_DECAY_MIN_S *
  Math.pow(REVERB_DECAY_MAX_S / REVERB_DECAY_MIN_S, v);

const knobToFeedback = (v: number): number => v * 0.95;

type Props = { powered: boolean };

/**
 * Combined effects module. Currently delay + reverb. To add a new effect:
 *   1. Engine: add private node + setters.
 *   2. Preset keys: add `fx.<name>.*`.
 *   3. UI: add another <FXBlock label="..."> below with its knobs.
 */
export function FX({ powered }: Props) {
  // Delay
  const [dlyTime, setDlyTime] = usePreset("fx.dly.time", 0.5);
  const [dlyFb, setDlyFb] = usePreset("fx.dly.fb", 0.35);
  const [dlyLvl, setDlyLvl] = usePreset("fx.dly.lvl", 0);

  // Reverb
  const [revDecay, setRevDecay] = usePreset("fx.rev.decay", 0.5);
  const [revLvl, setRevLvl] = usePreset("fx.rev.lvl", 0);

  useEffect(() => {
    if (powered) engine.setDelayTime(knobToDelayTime(dlyTime));
  }, [dlyTime, powered]);
  useEffect(() => {
    if (powered) engine.setDelayFeedback(knobToFeedback(dlyFb));
  }, [dlyFb, powered]);
  useEffect(() => {
    if (powered) engine.setDelayLevel(dlyLvl);
  }, [dlyLvl, powered]);

  useEffect(() => {
    if (powered) engine.setReverbDecay(knobToReverbDecay(revDecay));
  }, [revDecay, powered]);
  useEffect(() => {
    if (powered) engine.setReverbLevel(revLvl);
  }, [revLvl, powered]);

  return (
    <Module title="FX" hp={14} accent="var(--fx-accent)" minHeight={420}>
      <FXBlock label="dly">
        <Knob
          label="time"
          value={dlyTime}
          onChange={setDlyTime}
          size={48}
          format={(v) => formatTime(knobToDelayTime(v))}
        />
        <Knob
          label="fb"
          value={dlyFb}
          onChange={setDlyFb}
          size={48}
          format={(v) => knobToFeedback(v).toFixed(2)}
        />
        <Knob
          label="level"
          value={dlyLvl}
          onChange={setDlyLvl}
          size={48}
          format={(v) => v.toFixed(2)}
        />
      </FXBlock>

      <FXBlock label="rev">
        <Knob
          label="decay"
          value={revDecay}
          onChange={setRevDecay}
          size={48}
          format={(v) => `${knobToReverbDecay(v).toFixed(1)} s`}
        />
        <Knob
          label="level"
          value={revLvl}
          onChange={setRevLvl}
          size={48}
          format={(v) => v.toFixed(2)}
        />
      </FXBlock>

      {!powered && (
        <div className="mt-2 text-[9px] uppercase tracking-widest text-zinc-600 italic">
          power off
        </div>
      )}
    </Module>
  );
}

/** One labeled effect within the FX module. Knobs lay out in a horizontal row. */
function FXBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div
        className="text-[8px] uppercase tracking-[0.25em]"
        style={{
          color: "var(--accent)",
          textShadow:
            "0 0 6px color-mix(in srgb, var(--accent) 50%, transparent)",
        }}
      >
        {label}
      </div>
      <div className="flex justify-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}
