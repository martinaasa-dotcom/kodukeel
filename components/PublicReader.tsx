"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * WHETHER THE PAGE IS BEING READ BY SOMEBODY WITH NO ACCOUNT (FB-8).
 *
 * The grammar reference is readable signed out, and a handful of controls
 * that sit inside it reach routes a session guards: a speaker button asks
 * `/api/tts`, a drill link opens a round, a report button writes a
 * suggestion. Each of those asks this rather than being threaded a prop
 * through every component between the page and itself, and stands down: a
 * button that answers 401 is worse than no button, and a link into a signed-in
 * route sends a stranger to a sign-in form they did not ask for.
 *
 * False by default, so every screen inside the app is untouched; only
 * `components/grammar/PublicReference.tsx` sets it.
 */
const Context = createContext(false);

export function PublicReader({ children }: { children: ReactNode }) {
  return <Context.Provider value>{children}</Context.Provider>;
}

export function usePublicReader(): boolean {
  return useContext(Context);
}
