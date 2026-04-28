"use client";

import { useCallback, useRef, useState } from "react";

type KnobProps = {
  label: string;
  /** 0..1 */
  value: number;
  onChange: (next: number) => void;
  /** Optional formatter for the value readout. */
  format?: (v: number) => string;
  /** Pixel size of the knob disc. */
  size?: number;
};

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const DRAG_RANGE_PX = 200; // 200px drag = full 0..1 sweep

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Drag-vertically knob. Up increases, down decreases. Pointer-capture means
 * the drag follows the cursor even outside the disc until release.
 */
export function Knob({
  label,
  value,
  onChange,
  format = (v) => v.toFixed(2),
  size = 56,
}: KnobProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const angle = MIN_ANGLE + (MAX_ANGLE - MIN_ANGLE) * value;

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startValue: value };
      setDragging(true);
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = drag.startY - e.clientY; // up = positive
      onChange(clamp01(drag.startValue + dy / DRAG_RANGE_PX));
    },
    [onChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setDragging(false);
  }, []);

  const onDoubleClick = useCallback(() => {
    onChange(0.5); // double-click resets to center; nice-to-have ergonomics
  }, [onChange]);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={value}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        style={{
          width: size,
          height: size,
          boxShadow: dragging
            ? "0 0 0 1px var(--accent, #fbbf24), inset 0 2px 3px rgba(0,0,0,0.6)"
            : "inset 0 2px 3px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05)",
        }}
        className={`relative rounded-full bg-gradient-to-b from-[#2a2440] to-[#13101e] touch-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* Indicator line; rotates with value. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div
            className="absolute left-1/2 top-1.5 -translate-x-1/2 h-[35%] w-[3px] rounded-full"
            style={{
              background: "var(--accent, #fbbf24)",
              boxShadow:
                "0 0 4px color-mix(in srgb, var(--accent, #fbbf24) 60%, transparent)",
            }}
          />
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-400">
        {label}
      </div>
      <div className="text-[11px] tabular-nums text-zinc-200 font-mono">
        {format(value)}
      </div>
    </div>
  );
}
