
/**
 * AN ANSWER ABOUT YOURSELF HAS YOUR NAME IN IT, NOT TOM'S.
 *
 * The Say it step's model answers are written for a learner called Tom
 * (`Minu nimi on Tom.`), and the October feedback was that a learner who typed
 * `Minu nimi on Amanda` was painted "nearly" against Tom's, which reads as
 * being told their own name is a mistake. So the model is shown with the
 * learner's own name where we have one, and the stand-in is a slot: any one
 * word there is right, so a learner with no name on file is not marked down
 * for theirs either.
 *
 * Pure. The name is the display name the learner gave, first word only, and
 * nothing here writes Estonian: the one word substituted is the learner's.
 * A leaf, imported by `LessonText` on every lesson screen, so it holds the
 * names alone; the marking is `markOwnAnswer` in `practice.ts`.
 */
export const STAND_IN = "Tom";

/** The stand-in as it is written in the lessons and in their Russian and Ukrainian. */
const STAND_IN_WORD = /(?<!\p{L})(?:Tom|Том)(?!\p{L})/gu;

/** The first word of a display name, as a name to say, or null where there is none. */
export function sayableName(display: string | null | undefined): string | null {
  const first = (display ?? "").trim().split(/\s+/)[0] ?? "";
  const letters = first.replace(/[^\p{L}'’-]/gu, "");
  if (letters.length < 2) return null;
  return letters.charAt(0).toLocaleUpperCase() + letters.slice(1);
}

/** A model line with the learner's own name where the stand-in was. */
export function personal(text: string, name: string | null): string {
  return name ? text.replace(STAND_IN_WORD, name) : text;
}

/** Whether a model line carries the stand-in, so the card says to use your own name. */
export function hasStandIn(text: string): boolean {
  return new RegExp(STAND_IN_WORD.source, "u").test(text);
}
