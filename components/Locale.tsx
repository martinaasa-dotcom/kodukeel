"use client";

import { createContext, useContext, type ReactNode } from "react";
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

/** `t("Settings")` is the line in this learner's language, or the English where none exists yet. */
export function useT(): (english: string) => string {
  const locale = useContext(Context);
  return (english) => tr(locale, english);
}
