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
      options={LOCALES.map((id) => ({
        id,
        title: LOCALE_NAMES[id],
        detail: id === "en" ? t("The app in English.") : <span lang={id}>{MACHINE_SHORT[id]}</span>,
      }))}
    />
  );
}
