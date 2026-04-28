"use client";

import { useEffect, useState } from "react";

type Props = { powered: boolean };

/**
 * Tamagotchi-style cactus pet. Idle bob, periodic blink, sleeps when power off.
 *
 * Renders into a fake LCD screen housed in a pebble-shaped device shell with
 * three little physical-looking buttons below. Frame ticks at 3fps for that
 * authentic Game Boy / Tamagotchi feel.
 */
export function Pet({ powered }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 8), 333);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative rounded-[28px] p-3 shadow-2xl shadow-black/60"
        style={{
          width: 168,
          height: 150,
          background: "linear-gradient(180deg, #2a1f3d 0%, #1a1129 100%)",
          border: "2px solid #3b2c5e",
        }}
      >
        {/* LCD screen */}
        <div
          className="relative h-[100px] w-full overflow-hidden"
          style={{
            background: powered
              ? "linear-gradient(180deg, #1a3a1a 0%, #0a1f0a 100%)"
              : "linear-gradient(180deg, #1a1f1a 0%, #0a100a 100%)",
            border: "2px solid #0a0a0a",
            borderRadius: "4px",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
            imageRendering: "pixelated",
          }}
        >
          <CactusSprite frame={frame} powered={powered} />
          <div
            className="absolute bottom-1 left-0 right-0 text-center font-mono"
            style={{
              fontSize: "7px",
              letterSpacing: "0.15em",
              color: powered ? "#86efac" : "#3f3f46",
            }}
          >
            {powered ? "* hello *" : "z z z"}
          </div>
        </div>
        {/* fake buttons */}
        <div className="flex justify-center gap-4 mt-3">
          <FakeButton color="#dc2626" />
          <FakeButton color="#facc15" />
          <FakeButton color="#16a34a" />
        </div>
      </div>
    </div>
  );
}

function FakeButton({ color }: { color: string }) {
  return (
    <div
      className="rounded-full"
      style={{
        width: 11,
        height: 11,
        background: color,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.6)",
      }}
    />
  );
}

function CactusSprite({ frame, powered }: { frame: number; powered: boolean }) {
  if (!powered) return <SleepingSprite />;
  // Bob: shift up 1px on odd frames. Blink: frame 4 only (~once every 8 frames).
  const bobY = frame % 2 === 1 ? -1 : 0;
  const blinking = frame === 4;
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      style={{
        position: "absolute",
        inset: 0,
        transform: `translateY(${bobY}px)`,
      }}
    >
      <AwakeCactus blinking={blinking} />
    </svg>
  );
}

function AwakeCactus({ blinking }: { blinking: boolean }) {
  return (
    <g>
      {/* Trunk: highlight / body / shadow columns */}
      <rect x="26" y="16" width="2" height="36" fill="#4ade80" />
      <rect x="28" y="16" width="6" height="36" fill="#22c55e" />
      <rect x="34" y="16" width="2" height="36" fill="#15803d" />
      {/* Trunk top cap */}
      <rect x="28" y="14" width="6" height="2" fill="#22c55e" />
      <rect x="26" y="16" width="8" height="1" fill="#4ade80" />

      {/* Left arm */}
      <rect x="14" y="28" width="2" height="12" fill="#4ade80" />
      <rect x="16" y="28" width="4" height="12" fill="#22c55e" />
      <rect x="20" y="28" width="2" height="12" fill="#15803d" />
      <rect x="14" y="36" width="14" height="2" fill="#22c55e" />
      <rect x="14" y="36" width="14" height="1" fill="#4ade80" />

      {/* Right arm */}
      <rect x="42" y="22" width="2" height="14" fill="#4ade80" />
      <rect x="44" y="22" width="4" height="14" fill="#22c55e" />
      <rect x="48" y="22" width="2" height="14" fill="#15803d" />
      <rect x="36" y="30" width="12" height="2" fill="#22c55e" />
      <rect x="36" y="30" width="12" height="1" fill="#4ade80" />

      {/* Eyes */}
      {blinking ? (
        <>
          <rect x="29" y="24" width="2" height="1" fill="#0a0a0a" />
          <rect x="33" y="24" width="2" height="1" fill="#0a0a0a" />
        </>
      ) : (
        <>
          <rect x="29" y="22" width="2" height="3" fill="#0a0a0a" />
          <rect x="33" y="22" width="2" height="3" fill="#0a0a0a" />
          {/* sparkle */}
          <rect x="29" y="22" width="1" height="1" fill="#ffffff" />
          <rect x="33" y="22" width="1" height="1" fill="#ffffff" />
        </>
      )}
      {/* Smile */}
      <rect x="30" y="28" width="3" height="1" fill="#0a0a0a" />
      <rect x="29" y="27" width="1" height="1" fill="#0a0a0a" />
      <rect x="33" y="27" width="1" height="1" fill="#0a0a0a" />

      {/* Cheek blush */}
      <rect x="26" y="26" width="2" height="1" fill="#f472b6" opacity="0.7" />
      <rect x="35" y="26" width="2" height="1" fill="#f472b6" opacity="0.7" />

      {/* Soil */}
      <rect x="20" y="52" width="24" height="4" fill="#78350f" />
      <rect x="20" y="52" width="24" height="1" fill="#a16207" />
    </g>
  );
}

function SleepingSprite() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      style={{ position: "absolute", inset: 0 }}
    >
      {/* Dimmer trunk */}
      <rect x="26" y="16" width="2" height="36" fill="#22c55e" opacity="0.5" />
      <rect x="28" y="16" width="6" height="36" fill="#166534" opacity="0.7" />
      <rect x="34" y="16" width="2" height="36" fill="#0f3a1f" opacity="0.7" />
      <rect x="28" y="14" width="6" height="2" fill="#166534" opacity="0.7" />
      {/* Arms */}
      <rect x="14" y="28" width="8" height="12" fill="#166534" opacity="0.6" />
      <rect x="14" y="36" width="14" height="2" fill="#166534" opacity="0.6" />
      <rect x="42" y="22" width="8" height="14" fill="#166534" opacity="0.6" />
      <rect x="36" y="30" width="12" height="2" fill="#166534" opacity="0.6" />
      {/* Closed eyes */}
      <rect x="29" y="24" width="2" height="1" fill="#052e16" />
      <rect x="33" y="24" width="2" height="1" fill="#052e16" />
      {/* Z's */}
      <rect x="42" y="14" width="3" height="1" fill="#86efac" opacity="0.5" />
      <rect x="44" y="15" width="1" height="1" fill="#86efac" opacity="0.5" />
      <rect x="42" y="16" width="3" height="1" fill="#86efac" opacity="0.5" />
      <rect x="46" y="10" width="2" height="1" fill="#86efac" opacity="0.4" />
      <rect x="47" y="11" width="1" height="1" fill="#86efac" opacity="0.4" />
      <rect x="46" y="12" width="2" height="1" fill="#86efac" opacity="0.4" />
      {/* Soil */}
      <rect x="20" y="52" width="24" height="4" fill="#451a03" />
    </svg>
  );
}
