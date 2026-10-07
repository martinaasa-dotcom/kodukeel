"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUiLocale } from "@/app/actions";
import { ChoiceSegment } from "@/components/Choice";
import { useT } from "@/components/Locale";
import { LOCALES, LOCALE_NAMES, MACHINE_SHORT, type Locale } from "@/lib/copy/locale";

/**
 * The language the app's own words are in.
 *
 * Each option is named in its own language and its line under it is in that
 * language too, because somebody looking for Russian is reading for
 * `Русский` rather than down a list of English names for languages. The two
 * machine-translated ones say so on the choice itself. See lib/copy/locale.ts.
 */
export function InterfaceLanguagePanel({ current }: { current: Locale }) {
  const t = useT();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: Locale) => {
    const before = value;
    setValue(next);
    start(async () => {
      const landed = await setUiLocale(next).then(() => true).catch(() => false);
      if (!landed) { setValue(before); return; }
      router.refresh();
    });
  };

  return (
    <ChoiceSegment
      ariaLabel={t("Language of the app")}
      value={value}
      disabled={pending}
      onSelect={pick}
      /* English and the language the app is in now, never the other one:
         a Ukrainian reader is not offered Russian by name, or the reverse,
         which the meaning-language panel already keeps. The other one is
         a press away, through English. */
      options={LOCALES.filter((id) => current === "en" || id === "en" || id === current).map((id) => ({
        id,
        title: LOCALE_NAMES[id],
        /* Said in the language the app is in now, never in the other one: a
           Ukrainian reader is not shown a Russian sentence, or the reverse.
           Somebody still on English sees each note in its own language. */
        detail: id === "en"
          ? t("The app in English.")
          : value === "en"
            ? <span lang={id}>{MACHINE_SHORT[id]}</span>
            : <span lang={value}>{MACHINE_SHORT[value]}</span>,
      }))}
    />
  );
}
