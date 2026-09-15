"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Whether the English reading of a case question shows beside the Estonian
 * one, published once by the signed-in shell off the same settings read the
 * audio pace already uses (app/(app)/layout.tsx), and read by
 * `CaseQuestion`, the one place a case question reaches a screen. See
 * lib/estonian/caseGloss.ts for what decides the value and why it is never
 * the Estonian question itself.
 *
 * A context rather than a prop threaded through the eleven screens that
 * print a case question, for `UiLanguageProvider`'s own reason: the shell
 * resolves the setting once and every one of those screens needs it, most
 * of them with no other reason to know a learner's level or their stored
 * preference.
 */
const Context = createContext<boolean>(true);

export function CaseGlossProvider({ on, children }: { on: boolean; children: ReactNode }) {
  return <Context.Provider value={on}>{children}</Context.Provider>;
}

/** True while this learner's case questions carry an English reading. */
export const useCaseGloss = () => useContext(Context);
