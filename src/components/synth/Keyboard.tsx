"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "@/audio/engine";

// ── QWERTY → MIDI mapping ───────────────────────────────────────
// Standard tracker layout. Lower row starts at C4 (60). Upper row at C5 (72).
const KEY_TO_MIDI: Record<string, number> = {
  // Lower row (z-row), C4..E5
  z: 60, s: 61, x: 62, d: 63, c: 64, v: 65, g: 66, b: 67, h: 68, n: 69,
  j: 70, m: 71, ",": 72, l: 73, ".": 74, ";": 75, "/": 76,
  // Upper row (q-row), C5..E6 — overlaps with lower row at C5/D5/E5
  q: 72, "2": 73, w: 74, "3": 75, e: 76, r: 77, "5": 78, t: 79, "6": 80,
  y: 81, "7": 82, u: 83, i: 84, "9": 85, o: 86, "0": 87, p: 88,
};

// Reverse map for labeling on-screen keys with their QWERTY shortcut.
// Lower row preferred when both rows hit the same MIDI.
const MIDI_TO_KEY_LABEL: Record<number, string> = (() => {
  const m: Record<number, string> = {};
  for (const [k, midi] of Object.entries(KEY_TO_MIDI)) {
    if (!(midi in m)) m[midi] = k;
  }
  return m;
})();

// ── Music helpers ───────────────────────────────────────────────
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);
const isBlack = (midi: number): boolean => BLACK_PCS.has(midi % 12);
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midiToName = (midi: number): string =>
  `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

// ── Layout ──────────────────────────────────────────────────────
const FIRST_MIDI = 60;        // C4
const LAST_MIDI = 84;         // C6 (exclusive)
const WHITE_W = 38;
const WHITE_H = 150;
const BLACK_W = 24;
const BLACK_H = 95;

type Props = { powered: boolean };

export function Keyboard({ powered }: Props) {
  const [held, setHeld] = useState<Set<number>>(new Set());
  const heldRef = useRef(held);
  heldRef.current = held;

  const startNote = useCallback(
    (midi: number) => {
      if (!powered) return;
      if (heldRef.current.has(midi)) return;
      const next = new Set(heldRef.current);
      next.add(midi);
      setHeld(next);
      engine.noteOn(midi);
    },
    [powered],
  );

  const endNote = useCallback((midi: number) => {
    if (!heldRef.current.has(midi)) return;
    const next = new Set(heldRef.current);
    next.delete(midi);
    setHeld(next);
    engine.noteOff(midi);
  }, []);

  // QWERTY input.
  useEffect(() => {
    if (!powered) return;
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const midi = KEY_TO_MIDI[e.key.toLowerCase()];
      if (midi === undefined) return;
      e.preventDefault();
      startNote(midi);
    };
    const onUp = (e: KeyboardEvent) => {
      const midi = KEY_TO_MIDI[e.key.toLowerCase()];
      if (midi === undefined) return;
      endNote(midi);
    };
    const onBlur = () => {
      // Window lost focus; treat all keys as released to avoid stuck notes.
      engine.allNotesOff();
      setHeld(new Set());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [powered, startNote, endNote]);

  // ── Derived layout ─────────────────────────────────────────────
  const whiteKeys: number[] = [];
  const blackKeys: number[] = [];
  for (let m = FIRST_MIDI; m < LAST_MIDI; m++) {
    if (isBlack(m)) blackKeys.push(m);
    else whiteKeys.push(m);
  }
  const totalWidth = whiteKeys.length * WHITE_W;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-md bg-gradient-to-b from-zinc-800 to-zinc-900 p-3 shadow-2xl shadow-black/60 border border-zinc-700/60"
      >
        <div
          className="relative"
          style={{ width: totalWidth, height: WHITE_H }}
        >
          {whiteKeys.map((m, i) => (
            <KeyCap
              key={m}
              midi={m}
              isBlack={false}
              pressed={held.has(m)}
              powered={powered}
              label={MIDI_TO_KEY_LABEL[m]}
              noteName={midiToName(m)}
              style={{
                left: i * WHITE_W,
                top: 0,
                width: WHITE_W,
                height: WHITE_H,
              }}
              onPress={() => startNote(m)}
              onRelease={() => endNote(m)}
            />
          ))}
          {blackKeys.map((m) => {
            const prevWhiteIdx = whiteKeys.indexOf(m - 1);
            const x = (prevWhiteIdx + 1) * WHITE_W - BLACK_W / 2;
            return (
              <KeyCap
                key={m}
                midi={m}
                isBlack={true}
                pressed={held.has(m)}
                powered={powered}
                label={MIDI_TO_KEY_LABEL[m]}
                noteName={midiToName(m)}
                style={{
                  left: x,
                  top: 0,
                  width: BLACK_W,
                  height: BLACK_H,
                }}
                onPress={() => startNote(m)}
                onRelease={() => endNote(m)}
              />
            );
          })}
        </div>
      </div>
      <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-mono">
        {powered
          ? "play with mouse · qwerty · z=c4 · q=c5"
          : "power on to play"}
      </div>
    </div>
  );
}

// ── Key cap ────────────────────────────────────────────────────
type KeyCapProps = {
  midi: number;
  isBlack: boolean;
  pressed: boolean;
  powered: boolean;
  label: string | undefined;
  noteName: string;
  style: React.CSSProperties;
  onPress: () => void;
  onRelease: () => void;
};

function KeyCap({
  isBlack: black,
  pressed,
  powered,
  label,
  noteName,
  style,
  onPress,
  onRelease,
}: KeyCapProps) {
  const handleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!powered) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onPress();
  };
  const handleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onRelease();
  };

  const base = black
    ? "rounded-b-sm border border-black/80"
    : "rounded-b-md border border-zinc-300/60";
  const bg = black
    ? pressed
      ? "bg-amber-300 text-zinc-900"
      : "bg-zinc-950 text-zinc-300"
    : pressed
      ? "bg-amber-200 text-zinc-900"
      : "bg-zinc-100 text-zinc-700";
  const z = black ? "z-10" : "z-0";

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={noteName}
      aria-pressed={pressed}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={(e) => {
        // If cursor drags off while held, release.
        if (e.currentTarget.hasPointerCapture(e.pointerId)) return;
        onRelease();
      }}
      style={{ ...style, position: "absolute", touchAction: "none" }}
      className={`${base} ${bg} ${z} flex flex-col items-center justify-end pb-2 select-none transition-colors duration-75 ${
        powered ? "" : "opacity-60 cursor-not-allowed"
      }`}
    >
      {label && (
        <span
          className={`text-[10px] font-mono uppercase tracking-wider ${
            black ? "opacity-80" : "opacity-70"
          }`}
        >
          {label === " " ? "␣" : label}
        </span>
      )}
    </button>
  );
}
