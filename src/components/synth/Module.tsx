import type { ReactNode } from "react";

type ModuleProps = {
  /** Title engraved at the top of the panel. */
  title: string;
  /** Eurorack horizontal pitch units. 1 HP ≈ 5.08mm IRL. We use it as a width hint. */
  hp?: number;
  children: ReactNode;
};

const HP_TO_PX = 22;

/**
 * Eurorack-style faceplate. Children render in a single column, centered.
 * Server-rendered: this component has no interactivity of its own.
 */
export function Module({ title, hp = 8, children }: ModuleProps) {
  return (
    <section
      className="relative shrink-0 rounded-md border border-zinc-700/60 bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-lg shadow-black/50"
      style={{ width: hp * HP_TO_PX, minHeight: 380 }}
    >
      <Screw className="top-1.5 left-1.5" />
      <Screw className="top-1.5 right-1.5" />
      <Screw className="bottom-1.5 left-1.5" />
      <Screw className="bottom-1.5 right-1.5" />

      <header className="px-3 pt-5 pb-3 text-center">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-300">
          {title}
        </h2>
        <div className="mt-1 mx-auto h-px w-8 bg-zinc-600/60" />
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
