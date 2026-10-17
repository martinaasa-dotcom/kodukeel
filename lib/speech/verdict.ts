import { soundKey } from "@/lib/estonian/sounds";
import type { RawTurn } from "./engine";
import { core, coresOf, type Hearing, type HeardWord } from "./reconcile";

/**
 * WHAT A SPOKEN ANSWER IS WORTH, DECIDED IN ONE PLACE, AND ONLY EVER UPWARD.
 *
 * `Review` is append-only, so a misheard word graded as a miss would be a lapse
 * the learner never made, written where it can never be taken back. So the
 * machine may grade a spoken answer up and never down (docs/39-speech.md D6,
 * docs/41-fifth-batch.md D4 and D19): a recall heard exactly as the card spells
 * it is Good, and anything else goes into the answer box, editable, to be
 * marked when the learner presses Check by the same `checkAnswer` a typed
 * answer meets. There is no third outcome, and the type has no room for one.
 *
 * "Heard as spelled" is one test (D19): the two decodings agree on the word,
 * the forms list holds it, and nothing made it unsure. A word the dictionary
 * repaired never passes it (D13): the learner said a non-word, and the
 * dictionary's spelling of what they meant is not something they produced.
 *
 * Good means the word was recalled, never that it was said well: the model hears
 * most words said with an accent as the right word, which is fine for recall and is
 * why nothing about a sound is ever graded here.
 */

export type SpokenVerdict =
  | { readonly kind: "good" }
  | { readonly kind: "fill"; readonly text: string };

/** Heard as it is spelled: both readings agree, nothing repaired, nothing unsure, and the dictionary holds it. */
export function heardAsSpelled(word: HeardWord, knownByAnswer: boolean): boolean {
  if (word.repaired || !word.agreed) return false;
  // The card's own answer is a form the dictionary vouches for, so matching it
  // is the forms-list half of the test; anything else has to be known outright.
  if (knownByAnswer) return true;
  return word.known === true && !word.unsure;
}

/**
 * A spoken answer to a card that asks for an Estonian form.
 *
 * `accepted` is every spelling the marker would take, as `acceptedAnswers`
 * returns it. Good only where what was heard is one of them word for word,
 * every word of it heard as spelled; otherwise the box is filled with what was
 * understood, for the learner to check or change.
 */
export function cardVerdict(hearing: Hearing, accepted: readonly string[]): SpokenVerdict {
  const said = coresOf(hearing).join(" ");
  if (said === "") return { kind: "fill", text: "" };
  const answers = accepted.map((answer) => answer.split(/\s+/).map(core).filter(Boolean).join(" "));
  if (answers.includes(said) && hearing.words.every((word) => heardAsSpelled(word, true))) return { kind: "good" };
  return { kind: "fill", text: hearing.understood };
}

/**
 * Did they say this word: the say-it check of `docs/39-speech.md` section 3.6.
 *
 * Used where nothing is graded, on meeting a word and in shadowing. Either
 * reading of the same audio counts, compared after the folds an English ear
 * makes, which accepted 91.6% of right words with under 1 in 100 others let
 * through; never a hotword for the expected word, which made it worse. A word
 * not accepted is not a mistake: it is simply not lit, and the learner says it
 * again or carries on.
 */
export function saidIt(turn: RawTurn, expected: string): boolean {
  const target = soundKey(expected.replace(/\s+/g, ""));
  if (!target) return false;
  const readings = [turn.greedy.text, turn.beam.text].map((text) => soundKey(text.replace(/\s+/g, "")));
  return readings.includes(target);
}

/**
 * Whether the answer about to be marked still holds a word the dictionary
 * repaired, as the microphone left it (D13).
 *
 * The box is the learner's to change, and a repaired word they retyped or
 * left in place reads the same on the screen. What tells them apart is that
 * a repaired word is exactly the spelling the dictionary put there: where the
 * learner changed it, it is their own typing and marks like any typed answer;
 * where it is still there, it is the dictionary's spelling of what they meant,
 * which they never produced, and the answer grades nothing. Only ever a reason
 * to write no row, never a reason to write a worse one.
 */
export function repairedInAnswer(hearing: Hearing | null, answer: string): boolean {
  if (!hearing) return false;
  const repaired = new Set(hearing.words.filter((word) => word.repaired).map((word) => core(word.text)).filter(Boolean));
  if (repaired.size === 0) return false;
  return answer.split(/\s+/).map(core).some((word) => repaired.has(word));
}
