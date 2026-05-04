"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
} from "@xyflow/react";

import { DummyVCO } from "./modules/DummyVCO";
import { MasterOut } from "./modules/MasterOut";
import { ShiftModeContext } from "@/state/shiftMode";

const nodeTypes = {
  vco: ({ data }: any) => <DummyVCO />,
  out: ({ data }: any) => <MasterOut />,
};

const initialNodes = [
  { id: "vco-1", type: "vco", dragHandle: ".module-drag-handle", position: { x: 100, y: 100 }, data: {} },
  { id: "out-1", type: "out", dragHandle: ".module-drag-handle", position: { x: 400, y: 100 }, data: {} },
];

const initialEdges: Edge[] = [];

export function ModularRack() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      // Create a glowing, animated patch cable style
      const patchCableEdge = {
        ...params,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#a78bfa", strokeWidth: 3, filter: "drop-shadow(0 0 4px rgba(167, 139, 250, 0.8))" },
      };
      setEdges((eds) => addEdge(patchCableEdge, eds));
    },
    [setEdges],
  );

  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "Shift") setShiftHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    const onBlur = () => setShiftHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("shift-mode", shiftHeld);
    return () => {
      document.body.classList.remove("shift-mode");
    };
  }, [shiftHeld]);

  return (
    <ShiftModeContext.Provider value={shiftHeld}>
    <div
      className="w-full h-full relative min-h-screen flex flex-col items-center"
      style={{
        background: "radial-gradient(ellipse at top, #1a1233 0%, #0f0a1e 55%, #07050f 100%)",
      }}
    >
      <header className="flex flex-col items-center gap-2 mt-10 mb-6 relative z-10 pointer-events-none">
        <h1
          className="font-pixel"
          style={{
            fontSize: "16px",
            letterSpacing: "0.2em",
            color: "#e4e4e7",
            textShadow: "0 0 12px rgba(167,139,250,0.5)",
          }}
        >
          CACTUS·MODULAR
        </h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-mono">
          patch cable test spike
        </p>
      </header>

      <div className="w-full relative" style={{ height: "calc(100vh - 120px)" }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.25}
            maxZoom={2}
            nodesConnectable={true}
            nodesDraggable={shiftHeld}
            elementsSelectable={false}
            panOnDrag={false}
            fitView
            proOptions={{ hideAttribution: true }}
            className="synth-flow"
          >
            <Background color="#3b2c5e" gap={24} size={1} />
            <Controls className="!bg-zinc-900 !border-zinc-800 !text-zinc-400 fill-current" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      
      {/* Add a global style tag for customizing the React Flow connection line and removing some defaults */}
      <style dangerouslySetInnerHTML={{__html: `
        .synth-flow .react-flow__connection-path {
          stroke: #fbbf24;
          stroke-width: 3;
          filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.8));
        }
        /* Make handles invisible by default and take up space over the custom jacks, hover to show */
        .synth-flow .react-flow__handle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: transparent;
          border: none;
        }
      `}} />
      
      <div
        className="absolute top-3 right-4 pointer-events-none text-[10px] uppercase tracking-[0.25em] font-mono select-none z-50"
        style={{
          color: shiftHeld ? "#fbbf24" : "#52525b",
          opacity: shiftHeld ? 1 : 0.6,
          textShadow: shiftHeld
            ? "0 0 8px rgba(251, 191, 36, 0.6)"
            : undefined,
        }}
      >
        {shiftHeld ? "drag mode active" : "hold shift to drag modules"}
      </div>
    </div>
    </ShiftModeContext.Provider>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}
