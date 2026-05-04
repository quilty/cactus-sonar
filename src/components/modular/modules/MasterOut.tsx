import { Handle, Position } from "@xyflow/react";
import { ModularNode } from "../ModularNode";

export function MasterOut() {
  return (
    <ModularNode title="OUT" hp={8} accent="#f87171">
      <div className="flex flex-col items-center gap-6 mt-4 relative w-full h-full">
        <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-mono text-center">
          VOL
          <div className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-zinc-700 mt-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
            <div className="w-1 h-3 bg-red-400 rounded-full mb-6"></div>
          </div>
        </div>

        {/* Inputs */}
        <div className="flex gap-4 mt-auto pt-8">
          <div className="relative flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-[0.1em] text-red-400 font-mono mb-2 absolute -top-5">L/MONO</span>
            {/* React Flow Target Handle */}
            <Handle
              type="target"
              position={Position.Top}
              id="in-l"
              className="!w-4 !h-4 !bg-red-400 !border-2 !border-zinc-950 -translate-y-2 opacity-0 hover:opacity-100 transition-opacity"
            />
            <div className="w-6 h-6 rounded-full border-2 border-red-400 bg-zinc-950 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
            </div>
          </div>
          
          <div className="relative flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-[0.1em] text-red-400 font-mono mb-2 absolute -top-5">R</span>
            {/* React Flow Target Handle */}
            <Handle
              type="target"
              position={Position.Top}
              id="in-r"
              className="!w-4 !h-4 !bg-red-400 !border-2 !border-zinc-950 -translate-y-2 opacity-0 hover:opacity-100 transition-opacity"
            />
            <div className="w-6 h-6 rounded-full border-2 border-red-400 bg-zinc-950 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
            </div>
          </div>
        </div>
      </div>
    </ModularNode>
  );
}
