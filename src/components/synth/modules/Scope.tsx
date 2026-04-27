"use client";

import { useEffect, useRef } from "react";
import { Module } from "../Module";
import { engine } from "@/audio/engine";

const VIEW_W = 304;
const VIEW_H = 120;
const Y_PAD = 6;

type Props = { powered: boolean };

/**
 * Real-time waveform display. Pulls 1024 samples per frame from the engine's
 * Tone.Waveform analyser tap and rewrites the SVG path's `d` attribute.
 *
 * Why SVG instead of canvas: at 1024 points × 60fps the path-string churn is
 * well under what modern browsers handle, and SVG keeps the trace crisp and
 * stylable (drop-shadow filter, color via theme). If we ever add multi-channel
 * scope or higher-rate visuals, switching to canvas is a 30-line change.
 */
export function Scope({ powered }: Props) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const draw = () => {
      const data = engine.getWaveform();
      const path = pathRef.current;
      if (path) {
        path.setAttribute("d", data ? buildPath(data) : flatLine());
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <Module title="SCOPE" hp={16}>
      <div className="rounded-sm bg-black border border-zinc-800/80 overflow-hidden shadow-inner shadow-black/80">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width={VIEW_W}
          height={VIEW_H}
          preserveAspectRatio="none"
          className="block"
        >
          {/* crosshair grid */}
          <line
            x1="0"
            y1={VIEW_H / 2}
            x2={VIEW_W}
            y2={VIEW_H / 2}
            stroke="#1f2937"
            strokeWidth="1"
          />
          <line
            x1={VIEW_W / 2}
            y1="0"
            x2={VIEW_W / 2}
            y2={VIEW_H}
            stroke="#1f2937"
            strokeWidth="1"
          />
          {/* trace */}
          <path
            ref={pathRef}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.4"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 2px rgba(251,191,36,0.65))" }}
          />
        </svg>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            powered ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "bg-zinc-700"
          }`}
        />
        <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
          {powered ? "live · 1024 sa" : "no signal"}
        </span>
      </div>
    </Module>
  );
}

function buildPath(data: Float32Array): string {
  const len = data.length;
  if (len === 0) return flatLine();
  const yMid = VIEW_H / 2;
  const yScale = VIEW_H / 2 - Y_PAD;
  const stepX = VIEW_W / (len - 1);
  // Single string allocation per frame; faster than array.join.
  let d = `M0,${(yMid - data[0] * yScale).toFixed(2)}`;
  for (let i = 1; i < len; i++) {
    const x = i * stepX;
    const y = yMid - data[i] * yScale;
    d += `L${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d;
}

function flatLine(): string {
  return `M0,${VIEW_H / 2}L${VIEW_W},${VIEW_H / 2}`;
}
