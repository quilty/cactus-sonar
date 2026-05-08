import { Handle, Position, useEdges, useHandleConnections, useReactFlow, useNodeId, type HandleType } from "@xyflow/react";
import { useDisconnectMode } from "@/state/disconnectMode";
import { useState } from "react";

type JackProps = {
  id: string;
  type: HandleType;
  position?: Position;
  label: string;
  defaultRingColor?: string;
};

// Base64-encoded scissors SVG cursor
const SCISSORS_BASE64 = "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkNGQ0ZDgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI2IiBjeT0iNiIgcj0iMyIvPjxjaXJjbGUgY3g9IjYiIGN5PSIxOCIgcj0iMyIvPjxsaW5lIHgxPSIyMCIgeTE9IjQiIHgyPSI4LjEyIiB5Mj0iMTUuODgiLz48bGluZSB4MT0iMTQuNDciIHkxPSIxNC40OCIgeDI9IjIwIiB5Mj0iMjAiLz48bGluZSB4MT0iOC4xMiIgeTE9IjguMTIiIHgyPSIxMiIgeTI9IjEyIi8+PC9zdmc+";
const SCISSORS_CURSOR = `url("data:image/svg+xml;base64,${SCISSORS_BASE64}") 12 12, crosshair`;

export function Jack({
  id,
  type,
  position = type === "source" ? Position.Bottom : Position.Top,
  label,
  defaultRingColor = "#52525b",
}: JackProps) {
  const connections = useHandleConnections({ type, id });
  const edges = useEdges();
  const disconnectMode = useDisconnectMode();
  const { setEdges } = useReactFlow();
  const nodeId = useNodeId();
  const [isHovered, setIsHovered] = useState(false);

  const isConnected = connections.length > 0;

  // Find the color of the connected cable
  let connectedColor: string | null = null;
  if (isConnected) {
    const conn = connections[0];
    const edge = edges.find(
      (e) =>
        e.source === conn.source &&
        e.target === conn.target &&
        e.sourceHandle === conn.sourceHandle &&
        e.targetHandle === conn.targetHandle
    );
    if (edge?.data?.color) {
      connectedColor = edge.data.color as string;
    }
  }

  const ringColor = connectedColor || defaultRingColor;
  const showDisconnectRing = isConnected && disconnectMode && isHovered;

  const handleDisconnect = (e: React.MouseEvent | React.PointerEvent) => {
    if (!isConnected || !disconnectMode) return;
    e.stopPropagation();
    e.preventDefault();
    setEdges((eds) =>
      eds.filter((edge) => {
        const srcMatch = edge.source === nodeId && edge.sourceHandle === id;
        const tgtMatch = edge.target === nodeId && edge.targetHandle === id;
        return !(srcMatch || tgtMatch);
      })
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <span
        className="text-[8px] uppercase tracking-[0.1em] font-mono absolute pointer-events-none"
        style={{ color: connectedColor ?? ringColor, top: -20 }}
      >
        {label}
      </span>

      {/* Visual jack ring — purely decorative, pointer-events-none */}
      <div
        className="absolute w-6 h-6 rounded-full bg-zinc-950 pointer-events-none transition-all duration-150"
        style={{
          border: showDisconnectRing ? "2px solid #ec4899" : `2px solid ${ringColor}`,
          boxShadow: showDisconnectRing
            ? "0 0 0 5px rgba(236,72,153,0.3), 0 0 16px #ec4899"
            : connectedColor
            ? `0 0 12px ${connectedColor}, inset 0 0 6px ${connectedColor}`
            : "inset 0 2px 4px rgba(0,0,0,0.8)",
          zIndex: 0,
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]" />
        </div>
      </div>

      {/*
        The Handle IS the topmost interactive element.
        We put cursor + hover + click directly on it.
        It's transparent but covers the jack exactly.
      */}
      <Handle
        type={type}
        position={position}
        id={id}
        style={{
          position: "relative",
          width: 24,
          height: 24,
          minWidth: 24,
          minHeight: 24,
          border: "none",
          borderRadius: "50%",
          background: "transparent",
          cursor: isConnected && disconnectMode ? SCISSORS_CURSOR : undefined,
          zIndex: 10,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleDisconnect}
      />
    </div>
  );
}
