"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Level } from "@/lib/collections/syllabus";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";

/**
 * Whether this learner's level is A1, published once by the signed-in shell
 * off the same `courseLevelFor` read the audio pace already uses
 * (app/(app)/layout.tsx), and read by every screen that has a word or two of
 * Estonian baked into its own chrome rather than into a card. See
 * lib/copy/uiLanguage.ts for what "A1" decides and why.
 *
 * A context rather than a prop threaded through every session component, for
 * the same reason `AudioPrefs` is one: the shell reads the level once and a
 * dozen screens need it, and a prop would make every one of their parent
 * pages fetch it again or pass it down through components that have no other
 * reason to know a learner's level. The default is Estonian, which is the
 * behavior every screen outside the shell already had.
 */
const Context = createContext<boolean>(false);

export function UiLanguageProvider({ level, children }: { level: Level; children: ReactNode }) {
  return <Context.Provider value={uiWantsEnglish(level)}>{children}</Context.Provider>;
}

/** Pick the Estonian or the English chrome string, read off the shell's own level. */
export function useUiText(): (et: string, en: string) => string {
  const english = useContext(Context);
  return (et, en) => (english ? en : et);
}

// Re-exported so a caller with a level in hand (a server component, say)
// need not import two modules for one question.
export { uiText, uiWantsEnglish };
