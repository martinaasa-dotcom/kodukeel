/**
 * WHICH WORDS FADE, LINE BY LINE (B1 on, `components/course/SayAlongFade.tsx`).
 *
 * The evening's key lines are the ones its rule is shown on (`how.examples`),
 * or its first three spoken lines where it names none, at most four. Each is
 * said three times. The first pass hides nothing. The second hides tonight's
 * words, which is where the evening's endings are, and where a line holds
 * none of them it hides every other word of four letters or more, so the
 * second pass is never the first again. The third hides everything.
 *
 * FROM THE FOURTH PART OF A LEVEL IT STARTS A STEP HARDER (docs/reviews/b1-cast.md,
 * the ramp): the first pass already hides tonight's words, and the second
 * hides every other longer word besides, so a learner who has said lines
 * along for three parts is not given the whole line to read again.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { lineWords } from "@/lib/speech/lightUp";
import { unfold, wordsOf } from "./ledger";
import type { LessonSpec } from "./types";

export interface FadePass {
  readonly pass: 1 | 2 | 3;
  readonly who: string;
  readonly et: string;
  readonly en: string;
  /** For each word of the line as `lineWords` cuts it, whether it is hidden. */
  readonly hidden: readonly boolean[];
}

/** The most lines said along in one evening. */
export const FADE_LINES = 4;

const core = (text: string) => text.toLocaleLowerCase("et").replace(/[^\p{L}]/gu, "");

/** Tonight's spellings, lower-cased: every word of every item the lesson teaches. */
export function tonightSpellings(lesson: LessonSpec): ReadonlySet<string> {
  return new Set(lesson.teaches.flatMap(unfold).flatMap((item) => wordsOf(item.et).map((w) => w.low)));
}

/** The part of a level from which the fade starts with words already hidden. */
export const FADE_HARDER_FROM = 4;

/**
 * `partAt` is which part of its level the lesson is in, counted from 1. It is
 * handed in rather than looked up, because this module is drawn in the browser
 * and the list of parts holds every lesson of the course.
 */
export function fadePlan(lesson: LessonSpec, partAt = 1): FadePass[] {
  const spoken = lesson.conversation.map((line, i) => ({ line, i })).filter(({ line }) => line.et && line.en);
  const named = (lesson.how.examples ?? []).map((i) => spoken.find((s) => s.i === i)).filter((s) => s !== undefined);
  const lines = (named.length > 0 ? named : spoken.slice(0, 3)).slice(0, FADE_LINES);
  const tonight = tonightSpellings(lesson);
  const harder = partAt >= FADE_HARDER_FROM;
  /** Tonight's words, or every other longer word where the line holds none of them. */
  const tonights = (words: ReturnType<typeof lineWords>): boolean[] => {
    const hidden = words.map((w) => tonight.has(core(w.text)));
    if (hidden.some(Boolean)) return hidden;
    let n = 0;
    return words.map((w) => core(w.text).length >= 4 && n++ % 2 === 0);
  };
  const out: FadePass[] = [];
  for (const pass of [1, 2, 3] as const) {
    for (const { line } of lines) {
      const words = lineWords(line.et!);
      let hidden: boolean[];
      if (pass === 3) hidden = words.map((w) => core(w.text).length > 0);
      else if (pass === 1) hidden = harder ? tonights(words) : words.map(() => false);
      else if (!harder) hidden = tonights(words);
      else {
        // A step on from the first pass: tonight's words, and every other longer word besides.
        const first = tonights(words);
        let n = 0;
        hidden = words.map((w, i) => first[i]! || (core(w.text).length >= 4 && n++ % 2 === 0));
      }
      out.push({ pass, who: line.who, et: line.et!, en: line.en!, hidden });
    }
  }
  return out;
}
