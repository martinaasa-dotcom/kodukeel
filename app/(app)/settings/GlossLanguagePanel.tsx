"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setGlossLanguage } from "@/app/actions";
import { ChoiceSegment } from "@/components/Choice";
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
      ariaLabel="Which language a meaning is given in"
      value={value}
      disabled={pending}
      onSelect={pick}
      options={GLOSS_LANGUAGES.map((option) => ({
        id: option.id,
        title: option.label,
        detail: option.id === "en" ? "The course's own English meanings." : `${option.native}, beside the English.`,
      }))}
    />
  );
}
