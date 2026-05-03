"use client";

import { createContext, useContext } from "react";

/**
 * True when the user is holding Shift (drag-mode active). Provided at the
 * Rack level; consumed by any descendant that needs to react visually
 * (currently the Module header).
 */
export const ShiftModeContext = createContext(false);

export function useShiftMode(): boolean {
  return useContext(ShiftModeContext);
}
