import { fill, type Locale } from "@/lib/copy/locale";
import { quoted } from "@/lib/copy/values";
import { wordFunFor } from "@/lib/estonian/literally";

/**
 * THE ONE LINE UNDER A WORD THAT READS FUNNY TO AN ENGLISH SPEAKER.
 *
 * `kilpkonn` is a shield frog and `pea` is a head, and both are facts a
 * learner remembers for the rest of their life once they have noticed them.
 * `lib/estonian/literally.ts` holds which words have something to say and what
 * it is; this is the one drawing of it, so the first meeting and the
 * dictionary entry cannot say it two ways. It is the reading alone, "Word for
 * word: “leather mouse”." or "Sounds English, isn't: not “sigh”.", and no
 * quip after it: a joke under a word somebody is meeting for the first time
 * was reported as confusing. The quips live on in the Sõnamäng round.
 *
 * It draws nothing for nearly every word, and that is the design. The
 * headword is not repeated, since it is printed in large type right above.
 *
 * NO DIRECTIVE, so it draws inside a client screen (the first meeting, the
 * dictionary) and a server one (the word of the day) alike. The caller hands
 * in its own translator, `useT()` on one side and `tr(locale, ...)` on the
 * other, which is the one thing that differs.
 */
export function WordFun({ lemma, gloss, t, locale, className = "" }: {
  lemma: string;
  /** The reader's language, for the quotation marks: “leather mouse” in English, «кожаная мышь» in Russian. */
  locale: Locale;
  /** The English the screen prints for this word, so a joke about another sense of it is never drawn. */
  gloss: string | null;
  t: (english: string, context?: string) => string;
  className?: string;
}) {
  const fun = wordFunFor(lemma, gloss);
  if (!fun) return null;
  const reading = fun.kind === "compound"
    ? quoted(t(fun.reading, "wordplay"), locale)
    : fill(t("not “{english}”"), { english: lookalike(fun.reading, t) });
  return (
    <p data-word-fun={fun.kind} className={`max-w-md text-sm ${className}`} style={{ color: "var(--ink-2)" }}>
      <span className="font-semibold" style={{ color: "var(--accent-deep)" }}>{t(fun.label)}</span>
      {": "}
      <span style={{ color: "var(--ink)" }}>{reading}</span>
      {"."}
    </p>
  );
}

/**
 * The English a false friend looks like, as the reader can see it.
 *
 * The joke is the spelling: `pea` looks like the English "pea". Translated
 * alone, a Russian reader would be told the word is not «горошина», which is
 * true and hides the one thing that makes it a trap, so outside English the
 * spelling stays and its meaning follows in brackets: «pea (горошина)».
 */
export function lookalike(english: string, t: (english: string, context?: string) => string): string {
  const meaning = t(english, "wordplay");
  return meaning === english ? english : `${english} (${meaning})`;
}
