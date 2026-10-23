import { Braced } from "@/components/Braced";
import { tr, type Locale } from "@/lib/copy/locale";
import { personal } from "@/lib/course/lessons/ownAnswer";

/**
 * A LESSON'S OWN ENGLISH, SAID TO BE ENGLISH WHERE NOBODY HAS TRANSLATED IT.
 *
 * A lesson is written with its English beside its Estonian (its title, goal,
 * rules, the English under each line), and the interface around it is
 * translated area by area (`lib/copy/i18n/`). Until a lesson's own English has
 * a line in the reader's language, a Russian or Ukrainian reader is reading
 * English, and the screen says so: `lang="en"`, so a screen reader reads it as
 * English, and `data-untranslated`, which the language sweep counts as a known
 * gap rather than reporting as a slip (`scripts/test-locales.mjs`). Once a
 * line is translated, the marker goes on its own, because it is decided by
 * whether `tr` found one.
 *
 * Estonian in braces is marked by `Braced` either way. No hooks, so a server
 * page and a client step draw it the same way.
 */
export function LessonText({ text, locale, name = null }: {
  text: string;
  locale: Locale;
  /** The learner's own name, put in for the stand-in Tom after translating (`ownAnswer.ts`). */
  name?: string | null;
}) {
  const said = tr(locale, text);
  if (locale === "en" || said !== text) return <Braced text={personal(said, name)} />;
  return (
    <span lang="en" data-untranslated="lesson">
      <Braced text={personal(text, name)} />
    </span>
  );
}

/** Whether a lesson's English has a line in this language, for a prop that takes a string. */
export function lessonTextLang(text: string, locale: Locale): string | undefined {
  return locale !== "en" && tr(locale, text) === text ? "en" : undefined;
}
