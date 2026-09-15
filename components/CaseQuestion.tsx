"use client";

import { questionInEnglish } from "@/lib/estonian/cases";
import { useCaseGloss } from "@/components/CaseGloss";

/**
 * A CASE QUESTION, AND WHAT IT IS ASKING.
 *
 * `milles?` is how Estonia names a case and it is also six letters an English
 * speaker cannot cash in. Every screen here printed the Estonian question as
 * the identity of a case, which is right and is what a class, a textbook and
 * the state examination all do, and then printed the Latin name beside it as
 * the only thing in English, which helps nobody: somebody who does not know
 * what `milles?` asks is not helped by being told it is the inessive. It was
 * reported that way by a learner reading the dictionary's own case table.
 *
 * ONE DRAWING, because the question is printed on eleven screens and eleven
 * copies would be eleven answers to which half leads and what happens when the
 * table has no reading. `lib/estonian/cases.ts` is the one table of what a
 * question word asks; this is the one place it reaches a reader.
 *
 * The Estonian leads because it is the name, and the reading sits under it
 * because that is the half somebody can act on the first time they meet the
 * word. A question with no reading prints the Estonian on its own, exactly as
 * the app did before this existed.
 *
 * THE ESTONIAN NEVER GOES AWAY, AND THE READING IS THE ONE HALF A LEARNER MAY
 * TURN OFF. `useCaseGloss` is the shell's own answer, on by default through
 * B1 and off from B2 (lib/estonian/caseGloss.ts), and a learner overrides
 * either direction in Settings. Turning it off is never a reason to fall
 * back to a Latin or English case *name*: that question stays closed, and
 * this component still has no such reading to offer.
 */
export function CaseQuestion({ question, className = "", inline = false }: {
  /** The Estonian question, one word or the case's whole name. */
  question: string | null | undefined;
  className?: string;
  /**
   * Both on one line, for a place with no room for two: a chip, a hint under
   * an option, a sentence a reading has to sit inside.
   */
  inline?: boolean;
}) {
  const wantsGloss = useCaseGloss();
  if (!question) return null;
  const english = wantsGloss ? questionInEnglish(question) : null;
  if (!english) {
    return <span lang="et" className={className}>{question}</span>;
  }
  if (inline) {
    return (
      <span className={className}>
        <span lang="et">{question}</span>
        <span style={{ color: "var(--ink-3)" }}> · {english}</span>
      </span>
    );
  }
  return (
    <span className={className}>
      <span lang="et" className="block">{question}</span>
      <span className="block" style={{ color: "var(--ink-3)" }}>{english}</span>
    </span>
  );
}
