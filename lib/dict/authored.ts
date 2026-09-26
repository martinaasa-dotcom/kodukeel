/**
 * SENTENCES WRITTEN FOR A BEGINNER, AND THE RULES THAT MAKE THEM SAFE TO SHOW.
 *
 * Every other sentence in this app is one a lexicographer recorded, and that
 * is the right source for almost everything: a card, an exam, a gap-fill, a
 * borrowed usage. It was the wrong source for exactly one reader, somebody in
 * their first month. Ekilex records a usage to illustrate a word to somebody
 * who already reads Estonian, so the sentences filed under the first five
 * hundred words of the course are made of words from further up it:
 * `npm run audit:readable` found 55 of the 499 A1 words the dictionary can gap
 * with a sentence a learner could read by the evening they meet the word. So
 * the app took the sentence off every A1 screen, and a beginner met every word
 * alone, for three months, with nothing showing it doing anything.
 *
 * These are the sentences that fill that gap, and they are written rather than
 * recorded, which is a real change and is ADR-005 amendment 4
 * (`docs/03-architecture.md`). It is drawn narrowly, on the model the scene
 * bank already set (amendment 1 of ADR-025): drafted, checked by machine, and
 * read by the native Estonian speaker who develops this app in the pull
 * request that adds them.
 *
 * WHAT THE MACHINE CHECKS, IN `authored.test.ts`, ON EVERY ROW:
 *
 *   1. Every word is one the course has taught by the evening the sentence
 *      is for, through the module's own walk (`taughtThrough`) and the
 *      app's own reading of what a taught word covers (`readableSpellings`,
 *      which is stored forms and the forms the app derives off them). So
 *      every word of it is a word the dictionary vouches for, and one the
 *      learner has already been shown.
 *   2. The sentence carries the word it is filed under, in a form the
 *      dictionary knows, and it is a sentence (`naturalSentence`).
 *   3. It has an English line, with no Estonian letter in it.
 *   4. It is not a sentence Ekilex already recorded for the word, not a
 *      duplicate, and not one somebody has refused (`lib/dict/refused.ts`).
 *
 * WHAT NO MACHINE CAN CHECK is whether the grammar is right and whether
 * anybody would say it, which is the person's reading, and is why every row
 * arrives in a pull request rather than at runtime. Nor whether a spelling is
 * the word it looks like: `vali` passes as the imperative of `valima` when it
 * was written to mean "loud", which is a word no evening had taught, and the
 * check caught nothing because both are one string. A homograph is the
 * writer's to notice. No model writes a row at
 * runtime; nothing here is reachable from the provider chain.
 *
 * WHERE THEY ARE SHOWN, AND WHERE THEY MAY NOT BE. On the screens that
 * introduce a word: the Learn ladder's meeting and gap rungs, the first
 * meeting on the review card, and the unit lesson. Never in anything that
 * marks or measures (the mock exam, the level check, the checkpoint), never
 * lent to another word (`lib/dict/borrow.ts`), never cut into a deck card,
 * and never in a scene, because each of those says on its own screen that its
 * Estonian was recorded by a lexicographer, and the invariant beside this
 * module holds every one of them to not importing it. They are not stored:
 * a table read at render, like the grammar pins, so there is nothing in
 * `Lexeme.examples` to export, erase or confuse with the Institute's.
 *
 * A sentence somebody reports is taken out through `lib/dict/refused.ts`,
 * which this module reads, exactly as an attested one is.
 */
import type { Example } from "@/lib/dict/examples";
import { isRefusedSentence } from "@/lib/dict/refused";
import { AUTHORED_ROWS } from "@/lib/dict/authoredRows";

/** One written sentence: the word it is filed under, the Estonian, the English. */
export type AuthoredRow = readonly [lemma: string, et: string, en: string];

/** Every written sentence, by the lemma it is filed under. */
const BY_LEMMA: ReadonlyMap<string, readonly AuthoredRow[]> = (() => {
  const out = new Map<string, AuthoredRow[]>();
  for (const row of AUTHORED_ROWS) {
    const held = out.get(row[0]) ?? [];
    held.push(row);
    out.set(row[0], held);
  }
  return out;
})();

/** Every row, for the checker. */
export function authoredRows(): readonly AuthoredRow[] {
  return AUTHORED_ROWS;
}

/**
 * The written sentences for one word, as examples, refusals taken out.
 *
 * `source: "AUTHORED"`, which is what every screen that draws one reads to
 * know it may show it to a beginner, and what the exclusion invariant reads to
 * know it is not a lexicographer's.
 */
export function authoredFor(lemma: string): Example[] {
  return (BY_LEMMA.get(lemma) ?? [])
    .filter(([, et]) => !isRefusedSentence(et))
    .map(([, et, en]) => ({ et, en, source: "AUTHORED" as const }));
}

/** Whether this example is one written here rather than recorded. */
export function isAuthored(example: Pick<Example, "source">): boolean {
  return example.source === "AUTHORED";
}
