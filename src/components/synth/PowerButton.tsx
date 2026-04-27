"use client";

import { useState } from "react";

type Props = {
  powered: boolean;
  onPower: () => Promise<void>;
};

export function PowerButton({ powered, onPower }: Props) {
  const [pending, setPending] = useState(false);

  const handle = async () => {
    if (powered || pending) return;
    setPending(true);
    try {
      await onPower();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={powered || pending}
      aria-pressed={powered}
      aria-label={powered ? "Audio engine running" : "Power on the audio engine"}
      className="relative h-12 w-12 rounded-full border border-zinc-600 bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-lg active:translate-y-[1px] transition-transform disabled:cursor-not-allowed"
    >
      <span
        className={`absolute inset-2 rounded-full transition-colors duration-300 ${
          powered
            ? "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.85)]"
            : "bg-zinc-950"
        }`}
      />
    </button>
  );
}
