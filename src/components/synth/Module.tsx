import type { ReactNode } from "react";

type ModuleProps = {
  /** Title engraved at the top of the panel. */
  title: string;
  /** Eurorack horizontal pitch units. */
  hp?: number;
  /** Minimum panel height. */
  minHeight?: number;
  /**
   * Module accent color (CSS color string). Children can reference it as
   * `var(--accent)`. Defaults to gold to match envelope-style modules.
   */
  accent?: string;
  children: ReactNode;
};

const HP_TO_PX = 22;

export function Module({
  title,
  hp = 8,
  minHeight = 380,
  accent = "var(--env-accent)",
  children,
}: ModuleProps) {
  return (
    <section
      className="relative shrink-0 rounded-md border bg-gradient-to-b from-[#1a1530] to-[#0e0a1c] shadow-lg shadow-black/60"
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

      <header className="px-3 pt-5 pb-3 text-center">
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
