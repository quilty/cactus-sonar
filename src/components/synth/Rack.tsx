"use client";

import { useState } from "react";
import { engine } from "@/audio/engine";
import { PowerButton } from "./PowerButton";
import { Pet } from "./Pet";
import { PresetBar } from "./PresetBar";
import { Oscillator } from "./modules/Oscillator";
import { Filter } from "./modules/Filter";
import { Envelope } from "./modules/Envelope";
import { LFO } from "./modules/LFO";
import { Scope } from "./modules/Scope";
import { Keyboard } from "./Keyboard";

export function Rack() {
  const [powered, setPowered] = useState(false);

  const handlePower = async () => {
    if (powered) return;
    await engine.init();
    setPowered(true);
  };

  return (
    <div
      className="min-h-screen w-full text-zinc-200 flex flex-col items-center py-10 gap-6 overflow-x-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, #1a1233 0%, #0f0a1e 55%, #07050f 100%)",
      }}
    >
      <header className="flex flex-col items-center gap-2">
        <h1
          className="font-pixel"
          style={{
            fontSize: "16px",
            letterSpacing: "0.2em",
            color: "#e4e4e7",
            textShadow: "0 0 12px rgba(167,139,250,0.5)",
          }}
        >
          CACTUS·SONAR
        </h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-mono">
          modular synthesis · v0.4
        </p>
      </header>

      <div className="flex items-center gap-6">
        <Pet powered={powered} />
        <div className="flex flex-col items-center gap-3">
          <PowerButton powered={powered} onPower={handlePower} />
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-mono">
            {powered ? "audio · live" : "audio · off"}
          </span>
        </div>
      </div>

      <PresetBar />

      {/* Rack scrolls horizontally if it doesn't fit the viewport. */}
      <div className="w-full overflow-x-auto px-4">
        <div className="mx-auto" style={{ width: "fit-content" }}>
          <RackFrame>
            <Oscillator powered={powered} />
            <Filter powered={powered} />
            <Envelope powered={powered} />
            <LFO powered={powered} />
            <Scope powered={powered} />
          </RackFrame>
        </div>
      </div>

      <Keyboard powered={powered} />
    </div>
  );
}

function RackFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg shadow-2xl shadow-black/70"
      style={{
        background: "linear-gradient(180deg, #1a1530 0%, #0a0716 100%)",
        border: "1px solid #2a213f",
      }}
    >
      <div
        className="h-3 rounded-t-lg border-b border-black/60"
        style={{ background: "linear-gradient(180deg, #463663 0%, #2a213f 100%)" }}
      />
      <div className="flex p-3 gap-2">{children}</div>
      <div
        className="h-3 rounded-b-lg border-t border-black/60"
        style={{ background: "linear-gradient(180deg, #2a213f 0%, #463663 100%)" }}
      />
    </div>
  );
}
