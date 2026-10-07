"use client";

import { useEffect } from "react";
import { useOffline } from "@/components/OfflineProvider";
import type { Locale } from "@/lib/copy/locale";

/**
 * THE SHELL'S LANGUAGE, HANDED TO WHAT IS DRAWN OUTSIDE IT.
 *
 * Two things a learner reads sit above the signed-in shell's `LocaleProvider`.
 * The offline banner lives in the root layout, because the offline fallback is
 * reachable from either route group, so it said "You're offline" in English on
 * a screen otherwise in Russian. And the document's own `lang` is written once,
 * as English, by the root layout, so anything drawn in a portal straight onto
 * the body (and the page as a whole, to a screen reader) was announced with
 * English phonology over Cyrillic words.
 *
 * Both are set here on mount and put back on unmount, so leaving the shell for
 * the landing page or sign-in reads as English again. The shell's own wrapper
 * carries `lang` from the first paint (app/(app)/layout.tsx); this is the half
 * that cannot be server rendered. Estonian keeps its own `lang="et"` wherever
 * it is drawn, which wins inside it.
 */
export function ShellLocale({ locale }: { locale: Locale }) {
  const { publishLocale } = useOffline();
  useEffect(() => {
    publishLocale(locale);
    const root = document.documentElement;
    const before = root.lang;
    root.lang = locale;
    return () => {
      publishLocale("en");
      root.lang = before || "en";
    };
  }, [locale, publishLocale]);
  return null;
}
