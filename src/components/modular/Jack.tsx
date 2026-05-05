import { Handle, Position, useEdges, useHandleConnections, type HandleType } from "@xyflow/react";

type JackProps = {
  id: string;
  type: HandleType;
  position?: Position;
  label: string;
  defaultRingColor?: string;
};

export function Jack({
  id,
  type,
  position = type === "source" ? Position.Bottom : Position.Top,
  label,
  defaultRingColor = "#52525b", // zinc-600 default
}: JackProps) {
  const connections = useHandleConnections({ type, id });
  const edges = useEdges();

  const isConnected = connections.length > 0;
  
  // Find the color of the first connected cable
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

  return (
    <div className="relative flex flex-col items-center justify-center">
      <span
        className="text-[8px] uppercase tracking-[0.1em] font-mono mb-2 absolute"
        style={{
          color: isConnected && connectedColor ? connectedColor : ringColor,
          top: type === "target" ? -20 : -20,
        }}
      >
        {label}
      </span>

      {/* Visual Jack Receptacle */}
      <div
        className="relative w-6 h-6 rounded-full bg-zinc-950 flex items-center justify-center transition-all duration-200"
        style={{
          border: `2px solid ${ringColor}`,
          boxShadow: connectedColor
            ? `0 0 12px ${connectedColor}, inset 0 0 6px ${connectedColor}`
            : `inset 0 2px 4px rgba(0,0,0,0.8)`,
        }}
      >
        <div className="w-3 h-3 rounded-full bg-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]"></div>

        {/* React Flow Handle placed exactly in the center */}
        <Handle
          type={type}
          position={position}
          id={id}
          isConnectable={!isConnected}
          className="!absolute !top-[10px] !left-[10px] !w-0 !h-0 !border-none !bg-transparent !min-w-0 !min-h-0"
        >
          {/* Hit area that spans the whole jack, and contains the hover glow */}
          {/* We only render the hit area if the jack is connectable (or we just disable the glow when connected) */}
          <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center ${!isConnected ? 'cursor-crosshair group' : ''}`}
          >
            {/* The orange center glow - only shown if not connected */}
            {!isConnected && (
              <div className="w-[8px] h-[8px] rounded-full bg-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_#f97316]" />
            )}
          </div>
        </Handle>
      </div>
    </div>
  );
}
