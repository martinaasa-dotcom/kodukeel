import { CASES, type CaseSpec } from "@/lib/estonian/cases";
import { caseNearness } from "./distractors";

/**
 * THE THREE ENDINGS OFFERED AGAINST THE RIGHT ONE.
 *
 * `/grammar/build-a-word` teaches one claim: eleven cases are the second form of a
 * word with a few letters on the end, the same letters for every word in the
 * language. The only honest way to check whether that landed is to ask for the
 * letters rather than for the whole form, and a question with one answer needs
 * three that are wrong.
 *
 * `lib/questions/caseChoices.ts` is the neighbouring answer and a different
 * question: it offers `toast`, `toasse` and `toale` against `toas`, which is
 * whole forms of one word and is right on a card whose answer is a form. Here
 * the stem is already on the screen and under discussion, so offering it four
 * times over would be asking somebody to read the same five letters four times
 * to find the two that differ.
 *
 * WHAT MAKES A WRONG ENDING SAFE IS THE WORDING OF THE QUESTION. `kus?` is
 * answered by the seesütlev and by the alalütlev, so `-s` and `-l` are both
 * right answers to it and offering one against the other would mark somebody
 * wrong for knowing that. The screen asks with the declining pronoun alone,
 * which is what `caseQuestionFor` returns and why it drops the place adverb:
 * `milles?` has one ending and `kus?` has two.
 *
 * Pure: no React, no Prisma, no Estonian. An ending is a suffix off `CASES`,
 * which is the domain model, and nothing here writes one.
 */

/** How many options a question offers, the answer included. */
export const ENDING_OPTIONS = 4;

/**
 * The answer first, then the nearest wrong endings, best rival first.
 *
 * Ranked by `caseNearness`, the same scoring the mock exam and the placement
 * check use to decide which case to offer against another, so a beginner is
 * asked to tell `-s` from `-st` rather than from `-ga`. The comparator ends on
 * the case key, because two cases can score the same and `sort` is stable:
 * without it which three endings a learner is offered would be decided by the
 * order `CASES` happens to list them in, which is a fact about a table rather
 * than about the question.
 *
 * The three principal parts are never offered. They have no ending, the whole
 * question is which ending goes on, and "no ending at all" is a fourth answer
 * to a question nobody asked.
 */
export function endingOptions(answer: CaseSpec, count = ENDING_OPTIONS): CaseSpec[] {
  const rivals = CASES
    .filter((c) => !c.principal && c.suffix !== "" && c.suffix !== answer.suffix)
    .sort((a, b) => caseNearness(b, answer) - caseNearness(a, answer) || a.key.localeCompare(b.key));
  return [answer, ...rivals.slice(0, Math.max(0, count - 1))];
}
