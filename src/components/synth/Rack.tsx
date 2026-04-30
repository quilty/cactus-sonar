"use client";

import { useEffect, useState, type ReactNode } from "react";
import { engine } from "@/audio/engine";
import { usePreset } from "@/state/preset";
import { PowerButton } from "./PowerButton";
import { Pet } from "./Pet";
import { PresetBar } from "./PresetBar";
import { SideNav } from "./SideNav";
import { Oscillator } from "./modules/Oscillator";
import { Mixer } from "./modules/Mixer";
import { Filter } from "./modules/Filter";
import { Envelope } from "./modules/Envelope";
import { LFO } from "./modules/LFO";
import { FX } from "./modules/FX";
import { Scope } from "./modules/Scope";
import { Keyboard } from "./Keyboard";

const HP_TO_PX = 22;
const TOTAL_HP = 110;
const RACK_HEIGHT = 480;
const LAYOUT_STORAGE_KEY = "cactus-sonar-layout";

// ── Module registry ─────────────────────────────────────────────
type ModuleEntry = {
  id: string;
  hp: number;
  render: (props: { powered: boolean }) => ReactNode;
};

const MODULES: ModuleEntry[] = [
  {
    id: "vco1",
    hp: 10,
    render: ({ powered }) => (
      <Oscillator
        powered={powered}
        index={0}
        title="VCO 01"
        defaultWave="sine"
      />
    ),
  },
  {
    id: "vco2",
    hp: 10,
    render: ({ powered }) => (
      <Oscillator
        powered={powered}
        index={1}
        title="VCO 02"
        defaultWave="sawtooth"
      />
    ),
  },
  { id: "mix", hp: 8, render: ({ powered }) => <Mixer powered={powered} /> },
  { id: "vcf", hp: 12, render: ({ powered }) => <Filter powered={powered} /> },
  { id: "env", hp: 12, render: ({ powered }) => <Envelope powered={powered} /> },
  { id: "lfo", hp: 12, render: ({ powered }) => <LFO powered={powered} /> },
  { id: "fx", hp: 14, render: ({ powered }) => <FX powered={powered} /> },
  { id: "scope", hp: 16, render: ({ powered }) => <Scope powered={powered} /> },
];

const DEFAULT_LAYOUT: Record<string, number> = {
  vco1: 0,
  vco2: 10,
  mix: 20,
  vcf: 28,
  env: 40,
  lfo: 52,
  fx: 64,
  scope: 78,
};

export function Rack() {
  const [powered, setPowered] = useState(false);
  const [poly, setPoly] = usePreset<boolean>("global.poly", true);

  const [layout, setLayout] = useState<Record<string, number>>(DEFAULT_LAYOUT);
  const [moveMode, setMoveMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Read saved layout on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge so any new module ids fall back to defaults.
        setLayout((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist layout changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, [layout]);

  const handlePower = async () => {
    if (powered) return;
    await engine.init();
    setPowered(true);
  };

  useEffect(() => {
    if (powered) engine.setPolyphony(poly);
  }, [poly, powered]);

  // Ctrl+Z toggles move mode; Esc exits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        setMoveMode((m) => !m);
        setSelectedId(null);
        return;
      }

      if (e.key === "Escape" && moveMode) {
        setMoveMode(false);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveMode]);

  const hpFromClick = (e: React.MouseEvent<HTMLDivElement>): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (e.clientX - rect.left) / HP_TO_PX;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!moveMode || !selectedId) return;
    const targetHp = Math.floor(hpFromClick(e));

    const selected = MODULES.find((m) => m.id === selectedId);
    if (!selected) return;

    if (targetHp < 0 || targetHp + selected.hp > TOTAL_HP) {
      engine.playErrorSound();
      return;
    }

    const collision = MODULES.some((m) => {
      if (m.id === selectedId) return false;
      const mx = layout[m.id] ?? 0;
      return targetHp < mx + m.hp && targetHp + selected.hp > mx;
    });

    if (collision) {
      engine.playErrorSound();
      return;
    }

    setLayout((l) => ({ ...l, [selectedId]: targetHp }));
    setSelectedId(null);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!moveMode) return;
    const targetHp = hpFromClick(e);
    const m = MODULES.find((mod) => {
      const mx = layout[mod.id] ?? 0;
      return targetHp >= mx && targetHp < mx + mod.hp;
    });
    if (m) setSelectedId(m.id);
  };

  return (
    <div
      className="min-h-screen w-full text-zinc-200 flex flex-col items-center py-10 gap-6 overflow-x-hidden relative"
      style={{
        background:
          "radial-gradient(ellipse at top, #1a1233 0%, #0f0a1e 55%, #07050f 100%)",
      }}
    >
      <SideNav poly={poly} onPolyChange={setPoly} />

      {moveMode && (
        <>
          {/* Animated diagonal stripes — fullscreen, non-blocking */}
          <div
            aria-hidden
            className="fixed inset-0 pointer-events-none move-mode-bg z-30"
          />
          {/* Top banner with instructions */}
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 text-zinc-900 py-2 text-center text-[11px] uppercase tracking-[0.2em] font-mono shadow-lg">
            move mode · double-click module to select · click to drop ·
            ctrl+z or esc to exit
            {selectedId && (
              <span className="ml-3 text-zinc-900 font-bold">
                · selected: {selectedId}
              </span>
            )}
          </div>
        </>
      )}

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
          modular synthesis · v0.7
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

      <div className="w-full overflow-x-auto px-4">
        <div className="mx-auto" style={{ width: "fit-content" }}>
          <RackFrame>
            <div className="p-2">
              <div
                className="relative"
                style={{
                  width: TOTAL_HP * HP_TO_PX,
                  height: RACK_HEIGHT,
                  cursor: moveMode
                    ? selectedId
                      ? "crosshair"
                      : "pointer"
                    : undefined,
                }}
                onClick={moveMode ? handleCanvasClick : undefined}
                onDoubleClick={moveMode ? handleCanvasDoubleClick : undefined}
              >
                {MODULES.map((m) => {
                  const x = layout[m.id] ?? 0;
                  const isSelected = selectedId === m.id;
                  return (
                    <div
                      key={m.id}
                      className="absolute top-0 transition-all duration-300"
                      style={{
                        left: x * HP_TO_PX,
                        // In move mode, modules are inert — clicks pass through
                        // to the canvas for hit-testing.
                        pointerEvents: moveMode ? "none" : "auto",
                      }}
                    >
                      {m.render({ powered })}
                      {isSelected && (
                        <div
                          aria-hidden
                          className="absolute inset-0 pointer-events-none rounded-md"
                          style={{ animation: "pulse-ring 1s ease-in-out infinite" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </RackFrame>
        </div>
      </div>

      <Keyboard powered={powered} />
    </div>
  );
}

function RackFrame({ children }: { children: ReactNode }) {
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
        style={{
          background: "linear-gradient(180deg, #463663 0%, #2a213f 100%)",
        }}
      />
      {children}
      <div
        className="h-3 rounded-b-lg border-t border-black/60"
        style={{
          background: "linear-gradient(180deg, #2a213f 0%, #463663 100%)",
        }}
      />
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}
