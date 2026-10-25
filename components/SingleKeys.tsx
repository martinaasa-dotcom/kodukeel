"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Whether this learner lets a bare character key act (lib/ux/shortcuts.ts),
 * published once by the signed-in shell like the audio preferences, and read
 * by every round's keydown handler before it answers a letter or a digit.
 *
 * True outside the shell, which is the behavior everybody had before this was
 * a setting.
 */
const Context = createContext<boolean>(true);

export const useSingleKeys = () => useContext(Context);

export function SingleKeysProvider({ on, children }: { on: boolean; children: ReactNode }) {
  return <Context.Provider value={on}>{children}</Context.Provider>;
}
