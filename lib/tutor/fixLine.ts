import { fixFrom } from "@/lib/tutor/markers";

/**
 * WHETHER A `FIX:` LINE IS A CORRECTION OR A HABIT.
 *
 * The prompt says the line appears only under a learner's sentence that was
 * changed, and every model measured puts one under questions that had no
 * sentence anyway: `FIX: Lugesin raamatut` under "why is it lugesin raamatut",
 * `FIX: sõbraga` under "how do you say with a friend", sixteen times in
 * seventy-four answers on the cheapest model that otherwise teaches well.
 * The screen boxes that line as a correction of the learner's own writing,
 * so a stray one tells somebody who asked a question that they wrote
 * something wrong. A prompt is a request; this is the check.
 *
 * Three readings, each a way the line is not a correction, and all of them
 * decided from what the app already holds rather than by a model: the
 * learner's own message, and how many of its words the dictionary vouched
 * for (`lib/tutor/words.ts`, the same resolution that grounds the answer).
 *
 *  - No run of `SENTENCE_WORDS` consecutive Estonian words in the message:
 *    there was no sentence to correct. "Is this right: Ma elan Tallinnas ja
 *    töötan kool" runs six; "why is it lugesin raamatut and not lugesin
 *    raamatu" vouches four and runs two, which is two quoted forms and not a
 *    sentence, and the cheapest model put `FIX: Lugesin raamatu läbi` under
 *    it. The run is `sentenceRun`, and a capitalised word beside a vouched
 *    one is in the run, because a place name is a word in the sentence and
 *    the forms list holds no capitals.
 *  - The line spells a run of the learner's own message: they quoted it and
 *    nothing changed, so the "correction" is the sentence handed back.
 *  - One word: a form, which the prose already carries, and never a sentence.
 *
 * Pure. Errs toward keeping: a message with three vouched words and a line
 * that differs from it is a correction whether or not it was a good one.
 */
export const SENTENCE_WORDS = 3;

/** Lowercased letters and spaces only, so punctuation, case and bold cannot hide a match. */
export function sentenceKey(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * The longest run of consecutive Estonian words in the learner's message,
 * given the spellings the dictionary vouched for in it.
 */
export function sentenceRun(learnerMessage: string, vouched: Iterable<string>): number {
  const known = new Set([...vouched].map((w) => w.toLowerCase()));
  const tokens = learnerMessage.split(/[^\p{L}\p{M}-]+/u).filter(Boolean);
  const isKnown = (t: string | undefined) => t !== undefined && known.has(t.toLowerCase());
  let best = 0;
  let run = 0;
  tokens.forEach((token, i) => {
    const inRun = isKnown(token) || (/^\p{Lu}/u.test(token) && (isKnown(tokens[i - 1]) || isKnown(tokens[i + 1])));
    run = inRun ? run + 1 : 0;
    if (run > best) best = run;
  });
  return best;
}

export function isStrayFix(fix: string, learnerMessage: string, sentenceWords: number): boolean {
  const key = sentenceKey(fix);
  if (!key) return true;
  if (key.split(" ").length < 2) return true;
  if (sentenceWords < SENTENCE_WORDS) return true;
  return sentenceKey(learnerMessage).includes(key);
}

/** The reply with its stray FIX lines taken out, for a caller holding the whole of it. */
export function dropStrayFixes(reply: string, learnerMessage: string, sentenceWords: number): string {
  return reply
    .split("\n")
    .filter((line) => {
      const fix = fixFrom(line);
      return fix === null || !isStrayFix(fix, learnerMessage, sentenceWords);
    })
    .join("\n");
}
