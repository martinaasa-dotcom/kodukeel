"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setGlossLanguage } from "@/app/actions";
import { ChoiceSegment } from "@/components/Choice";
import { useLocale, useT } from "@/components/Locale";
import {
  GLOSS_LANGUAGES, type GlossLanguage,
} from "@/lib/collections/glossLanguage";

/**
 * Which language a meaning is given in.
 *
 * Each option is labeled in the language it names as well as in English,
 * because somebody who wants Russian is looking for `русский` rather than
 * reading down a list of English words for languages.
 */
export function GlossLanguagePanel({ current }: { current: GlossLanguage }) {
  const t = useT();
  const locale = useLocale();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: GlossLanguage) => {
    setValue(next);
    start(async () => {
      const landed = await setGlossLanguage(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  return (
    <ChoiceSegment
      ariaLabel={t("Which language you see meanings in")}
      value={value}
      disabled={pending}
      onSelect={pick}
      /* Somebody reading the app in Russian or Ukrainian is offered English and
         their own language, never the other one, which a great many of them
         would rightly find out of place in their own setting. The one
         exception is a choice already stored, so it can still be changed. */
      options={GLOSS_LANGUAGES.filter((option) =>
        locale === "en" || option.id === "en" || option.id === locale || option.id === value,
      ).map((option) => ({
        id: option.id,
        title: t(option.label),
        detail: t(option.id === "en" ? "Meanings in English only."
          : option.id === "ru" ? "The Russian meaning next to the English, wherever the dictionary has one."
            : "The Ukrainian meaning next to the English, wherever the dictionary has one."),
      }))}
    />
  );
}
