"use client";

import "@xyflow/react/dist/style.css";

import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
  type OnNodeDrag,
} from "@xyflow/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { engine } from "@/audio/engine";
import { usePreset } from "@/state/preset";
import { ShiftModeContext } from "@/state/shiftMode";
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

const LAYOUT_KEY = "cactus-sonar-layout";

const PoweredContext = createContext(false);

type ModuleNodeData = { render: (powered: boolean) => ReactNode };
type ModuleNodeType = Node<ModuleNodeData, "module">;

function ModuleNode({ data }: NodeProps<ModuleNodeType>) {
  const powered = useContext(PoweredContext);
  // Wrap with explicit pointer-events to make sure interactive descendants
  // receive events regardless of React Flow's internal pointer handling.
  return (
    <div style={{ pointerEvents: "auto" }}>{data.render(powered)}</div>
  );
}

const nodeTypes = { module: ModuleNode };

function makeInitialNodes(): ModuleNodeType[] {
  const HP = 22;
  const GAP = 10;
  let x = 0;
  const place = (hp: number) => {
    const result = x;
    x += hp * HP + GAP;
    return result;
  };
  return [
    {
      id: "vco1",
      type: "module",
      dragHandle: ".module-drag-handle",
      position: { x: place(10), y: 0 },
      data: {
        render: (p) => (
          <Oscillator powered={p} index={0} title="VCO 01" defaultWave="sine" />
        ),
      },
    },
    {
      id: "vco2",
      type: "module",
      dragHandle: ".module-drag-handle",
      position: { x: place(10), y: 0 },
      data: {
        render: (p) => (
          <Oscillator
            powered={p}
            index={1}
            title="VCO 02"
            defaultWave="sawtooth"
          />
        ),
      },
    },
    {
      id: "mix",
      type: "module",
      dragHandle: ".module-drag-handle",
      position: { x: place(8), y: 0 },
      data: { render: (p) => <Mixer powered={p} /> },
    },
    {
      id: "vcf",
      type: "module",
      dragHandle: ".module-drag-handle",
      position: { x: place(12), y: 0 },
      data: { render: (p) => <Filter powered={p} /> },
    },
    {
      id: "env",
      type: "module",
      dragHandle: ".module-drag-handle",
      position: { x: place(12), y: 0 },
      data: { render: (p) => <Envelope powered={p} /> },
    },
    {
      id: "lfo",
      type: "module",
      dragHandle: ".module-drag-handle",
      position: { x: place(12), y: 0 },
      data: { render: (p) => <LFO powered={p} /> },
    },
    {
      id: "fx",
      type: "module",
      dragHandle: ".module-drag-handle",
      position: { x: place(14), y: 0 },
      data: { render: (p) => <FX powered={p} /> },
    },
    {
      id: "scope",
      type: "module",
      dragHandle: ".module-drag-handle",
      position: { x: place(16), y: 0 },
      data: { render: (p) => <Scope powered={p} /> },
    },
  ];
}

export function Rack() {
  const [powered, setPowered] = useState(false);
  const [poly, setPoly] = usePreset<boolean>("global.poly", true);

  const handlePower = async () => {
    if (powered) return;
    await engine.init();
    setPowered(true);
  };

  useEffect(() => {
    if (powered) engine.setPolyphony(poly);
  }, [poly, powered]);

  return (
    <div
      className="min-h-screen w-full text-zinc-200 flex flex-col items-center py-10 gap-6"
      style={{
        background:
          "radial-gradient(ellipse at top, #1a1233 0%, #0f0a1e 55%, #07050f 100%)",
      }}
    >
      <SideNav poly={poly} onPolyChange={setPoly} />

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

      <PoweredContext.Provider value={powered}>
        <ReactFlowProvider>
          <RackFlow />
        </ReactFlowProvider>
      </PoweredContext.Provider>

      <Keyboard powered={powered} />
    </div>
  );
}

function RackFlow() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<ModuleNodeType>(makeInitialNodes());
  const { fitView } = useReactFlow();
  const [shiftHeld, setShiftHeld] = useState(false);

  // Track Shift state.
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

  // Toggle body class so CSS can light up the drag handles when shift is held.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("shift-mode", shiftHeld);
    return () => {
      document.body.classList.remove("shift-mode");
    };
  }, [shiftHeld]);

  // Restore saved positions on mount with format validation. Old HP-format
  // numbers (from before React Flow) are silently dropped.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAYOUT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const positions: Record<string, { x: number; y: number }> = {};
      for (const [id, val] of Object.entries(parsed)) {
        if (val && typeof val === "object") {
          const obj = val as Record<string, unknown>;
          if (
            typeof obj.x === "number" &&
            typeof obj.y === "number" &&
            !Number.isNaN(obj.x) &&
            !Number.isNaN(obj.y)
          ) {
            positions[id] = { x: obj.x, y: obj.y };
          }
        }
      }
      if (Object.keys(positions).length > 0) {
        setNodes((curr) =>
          curr.map((n) =>
            positions[n.id] ? { ...n, position: positions[n.id] } : n,
          ),
        );
      }
    } catch {
      /* ignore */
    }
  }, [setNodes]);

  // fitView with retries — wait for ResizeObserver to measure node DOM nodes.
  useEffect(() => {
    const ids = [
      setTimeout(() => fitView({ padding: 0.12, maxZoom: 1.0 }), 250),
      setTimeout(() => fitView({ padding: 0.12, maxZoom: 1.0 }), 600),
    ];
    return () => ids.forEach(clearTimeout);
  }, [fitView]);

  const handleNodeDragStop: OnNodeDrag<ModuleNodeType> = (_e, _node, all) => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of all) positions[n.id] = n.position;
    try {
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(positions));
    } catch {
      /* ignore */
    }
  };

  return (
    <ShiftModeContext.Provider value={shiftHeld}>
    <div
      className="w-full relative"
      style={{
        height: 420,
        backgroundColor: "rgba(10, 7, 22, 0.6)",
        backgroundImage:
          "radial-gradient(circle, #2a213f 1px, transparent 1.5px)",
        backgroundSize: "24px 24px",
        borderTop: "1px solid #2a213f",
        borderBottom: "1px solid #2a213f",
      }}
    >
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={shiftHeld}
        nodesConnectable={false}
        nodesFocusable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        panOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        // Allow wheel events to bubble up so the page can scroll over the
        // React Flow viewport. Without this, React Flow preventDefaults
        // every wheel event even when zoom/pan are disabled.
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      />

      <div
        className="absolute top-3 right-4 pointer-events-none text-[10px] uppercase tracking-[0.25em] font-mono select-none"
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
