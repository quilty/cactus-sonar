"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  poly: boolean;
  onPolyChange: (v: boolean) => void;
};

/**
 * Slide-out side navigation. Designed to grow:
 *
 *   <Section title="..." accent="...">
 *     <Row label="..."><SegmentedToggle ... /></Row>
 *   </Section>
 *
 * Add new sections here as the synth gains preferences.
 */
export function SideNav({ poly, onPolyChange }: Props) {
  const [open, setOpen] = useState(false);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <HamburgerButton open={open} onClick={() => setOpen(!open)} />

      {/* Backdrop — kept mounted so opacity transition runs. */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-30 transition-opacity duration-200"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        aria-hidden
      />

      <aside
        className="fixed top-0 left-0 h-full z-40 transition-transform duration-200 ease-out"
        style={{
          width: "288px",
          background:
            "linear-gradient(180deg, #1a1233 0%, #0f0a1e 70%, #07050f 100%)",
          borderRight: "1px solid #2a213f",
          boxShadow: "8px 0 24px rgba(0,0,0,0.5)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
        aria-hidden={!open}
      >
        <header className="relative px-4 py-4 border-b border-zinc-800 text-center">
          <h2
            className="font-pixel"
            style={{
              fontSize: "11px",
              letterSpacing: "0.25em",
              color: "#e4e4e7",
            }}
          >
            MENU
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 text-xl leading-none px-1"
          >
            ×
          </button>
        </header>

        <Section title="Engine Selection" accent="#fbbf24">
          <div className="flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.15em]">
            <Link href="/analog" className="block px-3 py-2 border border-zinc-700 rounded hover:border-[#fbbf24]/50 hover:bg-[#fbbf24]/10 transition-colors text-zinc-300">
              Analog Synth
            </Link>
            <Link href="/modular" className="block px-3 py-2 border border-zinc-700 rounded hover:border-[#fbbf24]/50 hover:bg-[#fbbf24]/10 transition-colors text-zinc-300">
              Modular Synth
            </Link>
          </div>
        </Section>

        <Section title="Sound Options" accent="var(--vco-accent)">
          <Row label="Voice Mode">
            <SegmentedToggle
              options={[
                { value: false, label: "mono" },
                { value: true, label: "poly" },
              ]}
              value={poly}
              onChange={onPolyChange}
              accent="var(--vco-accent)"
            />
          </Row>
        </Section>
      </aside>
    </>
  );
}

function HamburgerButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className="fixed top-4 left-4 z-50 p-2 rounded transition-colors hover:brightness-125"
      style={{
        background: "rgba(20, 15, 35, 0.85)",
        border: "1px solid #3b2c5e",
        backdropFilter: "blur(4px)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <rect x="2" y="3" width="12" height="2" fill="#a78bfa" />
        <rect x="2" y="7" width="12" height="2" fill="#a78bfa" />
        <rect x="2" y="11" width="12" height="2" fill="#a78bfa" />
      </svg>
    </button>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-4 border-b border-zinc-800/60">
      <h3
        className="font-pixel mb-3"
        style={{
          fontSize: "9px",
          letterSpacing: "0.2em",
          color: accent,
          textShadow: `0 0 6px color-mix(in srgb, ${accent} 50%, transparent)`,
        }}
      >
        {title.toUpperCase()}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-mono">
        {label}
      </span>
      {children}
    </div>
  );
}

type ToggleOption<T> = { value: T; label: string };

function SegmentedToggle<T>({
  options,
  value,
  onChange,
  accent,
}: {
  options: ToggleOption<T>[];
  value: T;
  onChange: (v: T) => void;
  accent: string;
}) {
  return (
    <div className="flex gap-1 text-[9px] uppercase tracking-[0.2em] font-mono">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.label}
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className="px-2 py-1 border rounded transition-colors"
            style={
              selected
                ? {
                    borderColor: accent,
                    background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                    color: accent,
                  }
                : {
                    borderColor: "#3f3f46",
                    background: "#18121f",
                    color: "#a1a1aa",
                  }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
