"use client";

import { useEffect } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine } from "@/audio/engine";
import { usePreset } from "@/state/preset";

type Props = { powered: boolean };

/**
 * Two-channel mixer between the oscillators and the envelope.
 *
 * Knob values 0..1 are gain levels into each voice's per-osc gain stage.
 * Defaults: VCO1 full, VCO2 silent — matches single-osc behavior of v0.5
 * until the user dials in the second oscillator.
 */
export function Mixer({ powered }: Props) {
  const [osc1Level, setOsc1Level] = usePreset("mix.osc1", 1.0);
  const [osc2Level, setOsc2Level] = usePreset("mix.osc2", 0.0);

  useEffect(() => {
    if (!powered) return;
    engine.setMixLevel(0, osc1Level);
    engine.setMixLevel(1, osc2Level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powered]);

  useEffect(() => {
    if (powered) engine.setMixLevel(0, osc1Level);
  }, [osc1Level, powered]);
  useEffect(() => {
    if (powered) engine.setMixLevel(1, osc2Level);
  }, [osc2Level, powered]);

  return (
    <Module title="MIX" hp={8} accent="var(--mix-accent)">
      <Knob
        label="vco 1"
        value={osc1Level}
        onChange={setOsc1Level}
        format={(v) => v.toFixed(2)}
      />
      <Knob
        label="vco 2"
        value={osc2Level}
        onChange={setOsc2Level}
        format={(v) => v.toFixed(2)}
      />

      {!powered && (
        <div className="mt-2 text-[9px] uppercase tracking-widest text-zinc-600 italic">
          power off
        </div>
      )}
    </Module>
  );
}
