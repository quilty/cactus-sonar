import type { ReactNode } from "react";
import { useShiftMode } from "@/state/shiftMode";

type ModularNodeProps = {
  title: string;
  hp?: number;
  minHeight?: number;
  accent?: string;
  children: ReactNode;
};

const HP_TO_PX = 22;

export function ModularNode({
  title,
  hp = 8,
  minHeight = 380,
  accent = "var(--env-accent)",
  children,
}: ModularNodeProps) {
  const dragMode = useShiftMode();
  return (
    <section
      className="select-none relative shrink-0 rounded-md border bg-gradient-to-b from-[#1a1530] to-[#0e0a1c] shadow-lg shadow-black/60"
      style={{
        width: hp * HP_TO_PX,
        minHeight,
        ["--accent" as string]: accent,
        borderColor: `color-mix(in srgb, ${accent} 35%, #2a213f)`,
      }}
    >
      <Screw className="top-1.5 left-1.5" />
      <Screw className="top-1.5 right-1.5" />
      <Screw className="bottom-1.5 left-1.5" />
      <Screw className="bottom-1.5 right-1.5" />

      <header
        className="module-drag-handle px-3 pt-5 pb-3 text-center cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: dragMode
            ? "rgba(251, 146, 60, 0.28)"
            : undefined,
          boxShadow: dragMode
            ? "inset 0 0 0 1px rgba(251, 146, 60, 0.85), 0 0 18px rgba(251, 146, 60, 0.7)"
            : undefined,
          transition: "background-color 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <h2
          className="font-pixel"
          style={{
            color: "var(--accent)",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textShadow: `0 0 6px color-mix(in srgb, var(--accent) 60%, transparent)`,
          }}
        >
          {title}
        </h2>
        <div
          className="mt-2 mx-auto h-px w-10"
          style={{
            background: `linear-gradient(90deg, transparent, var(--accent), transparent)`,
            opacity: 0.6,
          }}
        />
      </header>

      <div className="px-3 pb-6 flex flex-col gap-4 items-center">
        {children}
      </div>
    </section>
  );
}

function Screw({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute h-2 w-2 rounded-full bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ${className}`}
    />
  );
}
