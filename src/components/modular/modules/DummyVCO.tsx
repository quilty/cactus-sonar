import { Jack } from "@/components/modular/Jack";
import { ModularNode } from "@/components/modular/ModularNode";

export function DummyVCO() {
  return (
    <ModularNode title="VCO" hp={10} accent="#fbbf24">
      <div className="flex flex-col items-center gap-6 mt-4 relative w-full h-full">
        <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-mono text-center">
          FREQ
          <div className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-zinc-700 mt-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
            <div className="w-1 h-3 bg-amber-400 rounded-full mb-6"></div>
          </div>
        </div>

        {/* Outputs */}
        <div className="flex gap-4 mt-auto pt-8">
          <Jack
            id="sine-out"
            type="source"
            label="SINE"
            defaultRingColor="#fbbf24"
          />
          
          <Jack
            id="saw-out"
            type="source"
            label="SAW"
            defaultRingColor="#fbbf24"
          />
        </div>
      </div>
    </ModularNode>
  );
}
