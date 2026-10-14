import { fill } from "@/lib/copy/locale";
import { wordFunFor } from "@/lib/estonian/literally";

/**
 * THE ONE LINE THAT IS FUNNY ON PURPOSE, UNDER A WORD THAT HAS ONE.
 *
 * `kilpkonn` is a shield frog and `pea` is a head, and both are facts a
 * learner remembers for the rest of their life once they have laughed at them.
 * `lib/estonian/literally.ts` holds which words have something to say and what
 * it is; this is the one drawing of it, so the first meeting and the
 * dictionary entry cannot tell the same joke two ways (`docs/18-voice.md` §3c).
 *
 * It draws nothing for nearly every word, and that is the design: a joke on
 * every card stops being one by the second evening. The headword is not
 * repeated, since it is printed in large type right above.
 *
 * NO DIRECTIVE, so it draws inside a client screen (the first meeting, the
 * dictionary) and a server one (the word of the day) alike. The caller hands
 * in its own translator, `useT()` on one side and `tr(locale, ...)` on the
 * other, which is the one thing that differs.
 */
export function WordFun({ lemma, gloss, t, className = "" }: {
  lemma: string;
  /** The English the screen prints for this word, so a joke about another sense of it is never drawn. */
  gloss: string | null;
  t: (english: string, context?: string) => string;
  className?: string;
}) {
  const fun = wordFunFor(lemma, gloss);
  if (!fun) return null;
  const reading = fun.kind === "compound"
    ? `“${t(fun.reading, "wordplay")}”`
    : fill(t("not “{english}”"), { english: t(fun.reading, "wordplay") });
  return (
    <p data-word-fun={fun.kind} className={`max-w-md text-sm ${className}`} style={{ color: "var(--ink-2)" }}>
      <span className="font-semibold" style={{ color: "var(--accent-deep)" }}>{t(fun.label)}</span>
      {": "}
      <span style={{ color: "var(--ink)" }}>{reading}</span>
      {". "}
      {t(fun.quip, "wordplay")}
    </p>
  );
}
