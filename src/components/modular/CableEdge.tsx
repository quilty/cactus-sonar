import { BaseEdge, EdgeProps } from '@xyflow/react';

export function CableEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
}: EdgeProps) {
  // A realistic gravity droop for Eurorack patch cables
  const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
  
  // The slack creates control points that pull downward.
  const droop = Math.max(80, distance * 0.5); 
  
  // Cubic Bezier curve:
  // Starts going straight down from the source
  // Arrives coming straight up from the bottom into the target
  const path = `M ${sourceX},${sourceY} C ${sourceX},${sourceY + droop} ${targetX},${targetY + droop} ${targetX},${targetY}`;

  return (
    <BaseEdge path={path} style={style} />
  );
}
