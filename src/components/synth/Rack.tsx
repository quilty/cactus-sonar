"use client";

import { useState } from "react";
import { engine } from "@/audio/engine";
import { PowerButton } from "./PowerButton";
import { Oscillator } from "./modules/Oscillator";
import { Envelope } from "./modules/Envelope";
import { Keyboard } from "./Keyboard";

export function Rack() {
  const [powered, setPowered] = useState(false);

  const handlePower = async () => {
    if (powered) return;
    await engine.init();
    setPowered(true);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-200 flex flex-col items-center py-12 gap-8">
      <header className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-light tracking-[0.4em] text-zinc-300">
          CACTUS SONAR
        </h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em]">
          modular synthesis · v0.2
        </p>
      </header>

      <div className="flex items-center gap-5">
        <PowerButton powered={powered} onPower={handlePower} />
        <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 font-mono">
          {powered ? "audio · live" : "audio · off — press power"}
        </span>
      </div>

      <RackFrame>
        <Oscillator powered={powered} />
        <Envelope powered={powered} />
      </RackFrame>

      <Keyboard powered={powered} />
    </div>
  );
}

function RackFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl shadow-black/60">
      <div className="h-3 rounded-t-lg bg-gradient-to-b from-zinc-700 to-zinc-800 border-b border-black/60" />
      <div className="flex p-3 gap-2">{children}</div>
      <div className="h-3 rounded-b-lg bg-gradient-to-b from-zinc-800 to-zinc-700 border-t border-black/60" />
    </div>
  );
}
