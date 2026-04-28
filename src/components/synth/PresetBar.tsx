"use client";

import { useEffect, useState } from "react";
import {
  type PresetData,
  applyPreset,
  loadAllPresets,
  saveAllPresets,
  snapshotPreset,
} from "@/state/preset";

export function PresetBar() {
  const [presets, setPresets] = useState<Record<string, PresetData>>({});
  const [name, setName] = useState("");

  useEffect(() => {
    setPresets(loadAllPresets());
  }, []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = { ...presets, [trimmed]: snapshotPreset() };
    setPresets(next);
    saveAllPresets(next);
    setName("");
  };

  const handleLoad = (presetName: string) => {
    if (!presetName) return;
    const data = presets[presetName];
    if (data) applyPreset(data);
  };

  const handleDelete = (presetName: string) => {
    if (!presetName) return;
    if (!confirm(`delete "${presetName}"?`)) return;
    const next = { ...presets };
    delete next[presetName];
    setPresets(next);
    saveAllPresets(next);
  };

  const names = Object.keys(presets).sort();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-wider font-mono">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
        }}
        placeholder="preset name"
        className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-200 w-32 focus:outline-none focus:border-amber-400/60"
      />
      <button
        onClick={handleSave}
        disabled={!name.trim()}
        className="border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 text-zinc-200"
      >
        save
      </button>
      {names.length > 0 && (
        <>
          <span className="text-zinc-600">·</span>
          <select
            onChange={(e) => {
              handleLoad(e.target.value);
              e.currentTarget.value = "";
            }}
            className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-200"
            defaultValue=""
          >
            <option value="">load…</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            onChange={(e) => {
              handleDelete(e.target.value);
              e.currentTarget.value = "";
            }}
            className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-200"
            defaultValue=""
          >
            <option value="">delete…</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
