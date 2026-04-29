"use client";

import { useEffect } from "react";
import { Module } from "../Module";
import { Knob } from "../Knob";
import { engine } from "@/audio/engine";
import { usePreset } from "@/state/preset";

const DRIFT_MAX_CENTS = 30; // 0..1 knob → 0..30 cents
const knobToDrift = (v: number): number => v * DRIFT_MAX_CENTS;
const formatDrift = (cents: number): string =>
  cents < 1 ? `${cents.toFixed(2)} ¢` : `${cents.toFixed(1)} ¢`;

type Props = { powered: boolean };

/**
 * Two-channel mixer between the oscillators and the envelope, plus a global
 * voice-drift knob that staggers each voice/oscillator's detune slightly to
 * simulate analog VCO tuning drift.
 */
export function Mixer({ powered }: Props) {
  const [osc1Level, setOsc1Level] = usePreset("mix.osc1", 1.0);
  const [osc2Level, setOsc2Level] = usePreset("mix.osc2", 0.0);
  const [drift, setDrift] = usePreset("mix.drift", 0);

  useEffect(() => {
    if (powered) engine.setMixLevel(0, osc1Level);
  }, [osc1Level, powered]);
  useEffect(() => {
    if (powered) engine.setMixLevel(1, osc2Level);
  }, [osc2Level, powered]);
  useEffect(() => {
    if (powered) engine.setVoiceDrift(knobToDrift(drift));
  }, [drift, powered]);

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
      <Knob
        label="drift"
        value={drift}
        onChange={setDrift}
        format={(v) => formatDrift(knobToDrift(v))}
      />

      {!powered && (
        <div className="mt-2 text-[9px] uppercase tracking-widest text-zinc-600 italic">
          power off
        </div>
      )}
    </Module>
  );
}
