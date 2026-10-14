"use client";

import {
  createContext, use, useCallback, useContext, useMemo, useState, type ReactNode,
} from "react";
import { tr, type Locale } from "@/lib/copy/locale";
import { registerTable } from "#i18n-tables";
import { loadTable, tableReady } from "@/lib/copy/i18n/load";
import type { LocaleTable } from "@/lib/copy/i18n/table";

/**
 * The language the app's own words are in, published once by the signed-in
 * shell (app/(app)/layout.tsx) and read by every client component that draws
 * one of those words. A context for the reason `AudioPrefs` is one: the shell
 * reads it once and a great many screens need it. The default is English,
 * which is what every screen outside the shell is written in.
 *
 * See lib/copy/locale.ts for the tables, the fallback and the notice.
 */
interface LocaleState {
  locale: Locale;
  /** Moves when more of the language arrives, so everything under it draws again. */
  version: number;
  /** Asks for the whole language, for a page that started with a slice of it. */
  wholeLanguage: () => void;
}

const Context = createContext<LocaleState>({ locale: "en", version: 0, wholeLanguage: () => {} });

/**
 * THE TABLE ARRIVES BEFORE ANYTHING UNDER IT IS DRAWN.
 *
 * A browser holds no translation until it is handed one
 * (`lib/copy/i18n/tables.browser.ts`), and the server rendered the page in the
 * learner's language. So a provider for Russian or Ukrainian either hands its
 * slice over in the render (`table`, which the static landing page does with
 * its own lines) or waits for the whole language to load (`loadTable`, which
 * the signed-in shell does) before anything below it renders. Hydration waits
 * with the server's HTML still on screen, and a change of language made in a
 * transition keeps the old screen up until the new table is in. Either way no
 * line is drawn in English and then swapped.
 *
 * A PAGE THAT STARTED WITH A SLICE CAN ASK FOR THE REST. The landing page's
 * slice covers what it draws on arrival; a press on one of its demos can draw a
 * line that lives in another area, so a demo asks for the whole language the
 * moment somebody reaches for it (`useWholeLanguage`), and everything under the
 * provider draws again once it is in.
 *
 * On the server every table is already there and none of this does anything.
 * Registering in the render is safe because it only ever adds, and adds the
 * same line under the same key every time.
 */
export function LocaleProvider({
  locale,
  table,
  children,
}: {
  locale: Locale;
  /** A slice of the language, for a static page that says little. Without one, the whole language loads. */
  table?: LocaleTable;
  children: ReactNode;
}) {
  const [version, setVersion] = useState(0);
  const wholeLanguage = useCallback(() => {
    if (locale === "en" || tableReady(locale)) return;
    void loadTable(locale).then(() => {
      if (tableReady(locale)) setVersion((v) => v + 1);
    });
  }, [locale]);
  const value = useMemo(() => ({ locale, version, wholeLanguage }), [locale, version, wholeLanguage]);
  /*
    AFTER EVERY HOOK, NOT BEFORE. When `use` suspends a first render, React
    replays the component once the table is in, and on that replay the
    condition below is false. With the hooks after it, the replay met a
    `useState` the suspended attempt never reached and React threw #467
    ("update hook called on initial render") on three screens of the
    production build. Last, the hooks are the same on both attempts.
  */
  if (locale !== "en") {
    if (table) registerTable(locale, table);
    else if (!tableReady(locale)) use(loadTable(locale));
  }
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLocale(): Locale {
  return useContext(Context).locale;
}

/**
 * `t("Settings")` is the line in this learner's language, or the English where
 * none exists yet. `context` picks a line that means two things in English
 * (see `tr`). The same function for as long as the language and the table
 * are, so a round can name it in a hook's dependencies without re-running
 * every render.
 */
export function useT(): (english: string, context?: string) => string {
  const { locale, version } = useContext(Context);
  return useCallback(
    (english: string, context?: string) => tr(locale, english, context),
    // `version` is not read: it is here so the function changes, and a round
    // holding it redraws, when more of the language arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, version],
  );
}

/**
 * Handlers that ask for the whole language when somebody reaches for a part of
 * the page that can draw more than the page arrived with: a pointer coming
 * down on it or the keyboard arriving in it. Spread on the part's own root.
 */
export function useWholeLanguage(): {
  onPointerDownCapture: () => void;
  onFocusCapture: () => void;
} {
  const { wholeLanguage } = useContext(Context);
  return useMemo(() => ({ onPointerDownCapture: wholeLanguage, onFocusCapture: wholeLanguage }), [wholeLanguage]);
}
