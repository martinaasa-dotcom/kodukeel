"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setGlossAlso, setGlossLanguage } from "@/app/actions";
import { ChoiceSegment } from "@/components/Choice";
import { useLocale, useT } from "@/components/Locale";
import {
  GLOSS_LANGUAGES, alsoShowOffered, type GlossLanguage,
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

/**
 * "ALSO SHOW", THE OTHER OF RUSSIAN AND UKRAINIAN, SMALL AFTER THE FIRST.
 *
 * Offered only where the meaning leads in one of the two, and only ever the
 * other one: many Ukrainians in Estonia use Russian every day, and the other
 * way round, and for them the second equivalent beside the first is worth a
 * line. Nothing is the default, because a missing row reads as what everybody
 * had. The page reads the lead on the server and draws this only where it is
 * Russian or Ukrainian, so changing the lead above redraws it.
 */
export function GlossAlsoPanel({ lead, current }: { lead: GlossLanguage; current: GlossLanguage | null }) {
  const t = useT();
  const offered = alsoShowOffered(lead);
  const [value, setValue] = useState<"none" | GlossLanguage>(current ?? "none");
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!offered) return null;

  const pick = (next: "none" | GlossLanguage) => {
    const before = value;
    setValue(next);
    start(async () => {
      const landed = await setGlossAlso(next).then(() => true).catch(() => false);
      if (!landed) { setValue(before); return; }
      router.refresh();
    });
  };

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{t("Also show")}</p>
      <ChoiceSegment
        ariaLabel={t("Also show a second language after the first")}
        value={value}
        disabled={pending}
        onSelect={pick}
        options={[
          { id: "none" as const, title: t("Nothing else"), detail: t("Just the one language and the English.") },
          /*
            Named in its own language, the way the entry pages name a language
            in their switcher, rather than by a line of ours: the Ukrainian
            interface holds no line naming Russian and the Russian none naming
            Ukrainian (lib/copy/purity-uk.test.ts, purity-ru.test.ts), and a
            learner who wants the other one is looking for it by its own name.
          */
          {
            id: offered,
            title: GLOSS_LANGUAGES.find((l) => l.id === offered)?.native ?? offered,
            detail: t("Shown small, after the first meaning."),
          },
        ]}
      />
    </div>
  );
}
