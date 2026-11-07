import type { LineAsk } from "./againstLine";
import { hasStandIn, personal } from "./ownAnswer";
import type { LessonSpec, Prompt } from "./types";

/**
 * WHAT A SAY IT CARD ASKED, AS THE COMPARISON READS IT (`againstLine`).
 *
 * One builder, for the card on the screen and for the server that checks it,
 * so the two cannot disagree about which lines count or whose details are the
 * learner's own. Pure, and a leaf beside the lessons: the card imports it
 * into the browser.
 */

/** Whether a card lets the learner make it true for them: every question about themselves, and a role-play turn that says so. */
export function ownDetailsFor(which: "answers" | "turns", prompt: Prompt): boolean {
  if (which === "answers") return true;
  return /yourself|your own|your name|about you/i.test(prompt.cue) || hasStandIn(prompt.model.et);
}

/** The lesson's own English for each spelling it teaches, and which spellings it teaches. */
export function lessonMeanings(lesson: LessonSpec): { meanings: Map<string, string>; taught: Set<string> } {
  const meanings = new Map<string, string>();
  const taught = new Set<string>();
  for (const item of lesson.teaches) {
    const spelling = item.et.toLocaleLowerCase("et");
    taught.add(spelling);
    if (!meanings.has(spelling)) meanings.set(spelling, item.en);
  }
  return { meanings, taught };
}

/** The comparison's reading of one card: the model with the learner's name in it, its alternatives, and the lesson's meanings. */
export function lineAskFor(lesson: LessonSpec, which: "answers" | "turns", prompt: Prompt, name: string | null): LineAsk {
  const { meanings, taught } = lessonMeanings(lesson);
  return {
    lines: [personal(prompt.model.et, name), ...(prompt.also ?? [])],
    ownDetails: ownDetailsFor(which, prompt),
    meanings, taught,
  };
}

/** One line of a story, told back about whoever told it. */
export function retellAsk(lesson: LessonSpec, line: string): LineAsk {
  const { meanings, taught } = lessonMeanings(lesson);
  return { lines: [line], ownDetails: false, meanings, taught, aboutThem: true };
}
