"use client";

import { createContext, useContext } from "react";

export const DisconnectModeContext = createContext(false);

export function useDisconnectMode(): boolean {
  return useContext(DisconnectModeContext);
}
