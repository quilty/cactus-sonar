"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Preset registry.
 *
 * Drop-in for useState that registers the value under a string key. A central
 * snapshot()/apply() pair can read all registered values into JSON and push
 * a JSON blob back to set everything at once.
 *
 * Each module names its keys with a "module.field" convention (e.g. "vco.tune").
 *
 * Why a registry instead of lifting state up: it keeps modules self-contained
 * — they don't need to be controlled components, and presets become a side
 * concern that any module can opt into by switching one hook call.
 */

const STATE_GETTERS = new Map<string, () => unknown>();
const STATE_SETTERS = new Map<string, (v: unknown) => void>();

export function usePreset<T>(
  key: string,
  initial: T,
): [T, (v: T) => void] {
  const [state, setState] = useState<T>(initial);
  // Keep a ref of the latest value so the registry's getter always returns
  // current state (the closure would otherwise capture stale state at effect
  // mount time).
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    STATE_GETTERS.set(key, () => stateRef.current);
    STATE_SETTERS.set(key, (v) => setState(v as T));
    return () => {
      STATE_GETTERS.delete(key);
      STATE_SETTERS.delete(key);
    };
  }, [key]);

  return [state, setState];
}

export type PresetData = Record<string, unknown>;

export function snapshotPreset(): PresetData {
  const out: PresetData = {};
  for (const [key, getter] of STATE_GETTERS) out[key] = getter();
  return out;
}

export function applyPreset(data: PresetData): void {
  for (const [key, value] of Object.entries(data)) {
    STATE_SETTERS.get(key)?.(value);
  }
}

// ── localStorage helpers ──────────────────────────────────────────

const STORAGE_KEY = "cactus-sonar-presets";

export function loadAllPresets(): Record<string, PresetData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAllPresets(presets: Record<string, PresetData>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage full or disabled — silent fail is OK for a synth.
  }
}
