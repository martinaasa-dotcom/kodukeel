"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { tr, type Locale } from "@/lib/copy/locale";

/**
 * The language the app's own words are in, published once by the signed-in
 * shell (app/(app)/layout.tsx) and read by every client component that draws
 * one of those words. A context for the reason `AudioPrefs` is one: the shell
 * reads it once and a great many screens need it. The default is English,
 * which is what every screen outside the shell is written in.
 *
 * See lib/copy/locale.ts for the tables, the fallback and the notice.
 */
const Context = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Context.Provider value={locale}>{children}</Context.Provider>;
}

export function useLocale(): Locale {
  return useContext(Context);
}

/**
 * `t("Settings")` is the line in this learner's language, or the English where
 * none exists yet. `context` picks a line that means two things in English
 * (see `tr`). The same function for as long as the language is, so a round
 * can name it in a hook's dependencies without re-running every render.
 */
export function useT(): (english: string, context?: string) => string {
  const locale = useContext(Context);
  return useCallback((english: string, context?: string) => tr(locale, english, context), [locale]);
}
