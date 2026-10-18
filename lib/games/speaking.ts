import { checkAnswer, acceptedAnswers, type AnswerCheck } from "@/lib/estonian/answer";
import { cardVerdict, heardAsSpelled, type SpokenVerdict } from "@/lib/speech/verdict";
import { core, type Hearing } from "@/lib/speech/reconcile";

/**
 * THE SPEAKING ROUND, IN THREE STEPS (docs/41-fifth-batch.md VB-5).
 *
 * It used to record a word, play it beside a native one and ask the learner to
 * mark themselves, which is half an exercise: nothing was recalled, and the
 * judge was the person least able to hear the difference. With a recognizer on
 * the device it becomes the one round that asks for Estonian from memory, out
 * loud, and says what came across. Each line is asked three ways, plainest
 * first:
 *
 *   `along`    The text and the native recording; the learner says it along,
 *              the words lighting as they are heard. Ungraded: saying what you
 *              can see and hear is shadowing, not recall.
 *   `back`     The recording only, then the learner says it. Ungraded for the
 *              same reason: what was just heard is not a memory.
 *   `meaning`  The English only, the asked word marked the way a gap's meaning
 *              is. The learner says the Estonian. Heard as spelled, the word's
 *              production card grades Good; anything else goes into the box,
 *              editable, and Check marks it as a typed answer would. A missed
 *              recall writes nothing, because a machine's mishearing may not
 *              be the reason a learner's card goes back to the start (D4).
 *
 * Hands-free runs the first two steps only, over the whole round, and grades
 * nothing, because nothing in them is recalled.
 *
 * WHERE THE LINES COME FROM, IN ORDER. The learner's own words that are due or
 * recently met; then phrase entries, where the lemma is the line; then
 * attested usages that carry their shipped English and pass the gate a
 * sentence has to pass to be said aloud. The page reads each source and holds
 * it to what the evenings taught inside a module (D11); this decides the
 * order, the shape and the marking. At A1 a line is a single word, or a
 * sentence whose asked form is the word itself or a present person, which is
 * the narrowing the flash round's `beginnerSlot` draws.
 *
 * Nothing here is written and nothing is Estonian (ADR-005, D10): every line
 * is a dictionary entry or a usage a lexicographer recorded. Pure.
 */

export const SPEAKING_STEPS = ["along", "back", "meaning"] as const;
export type SpeakingStep = (typeof SPEAKING_STEPS)[number];

/** The steps a line is asked in. Hands-free never reaches the one that grades. */
export function stepsFor(handsFree: boolean): readonly SpeakingStep[] {
  return handsFree ? SPEAKING_STEPS.slice(0, 2) : SPEAKING_STEPS;
}

/** Whether a step is a recall that may grade. Only the last, and never hands-free. */
export function stepGrades(step: SpeakingStep, handsFree: boolean): boolean {
  return step === "meaning" && !handsFree;
}

export type SpeakingSource = "deck" | "phrase" | "usage";

/** What the page hands over for one line, before it is dealt. */
export interface SpeakingCandidate {
  readonly source: SpeakingSource;
  /** The word's production card, which the recall grades. Null where the learner holds none: then nothing grades. */
  readonly cardId: string | null;
  readonly lexemeId: string | null;
  readonly lemma: string;
  readonly pos: string;
  /** The word's English meaning, the dictionary's own gloss. */
  readonly meaning: string;
  /** A recorded sentence with its shipped English, and the form of the word in it. */
  readonly sentence: { readonly et: string; readonly en: string; readonly form: string } | null;
  /**
   * The part of a verb the sentence's form is, where the page could name one
   * (`IndPrSg3`), so a beginner is asked only the present persons. Null where
   * it is the dictionary form or nobody could say.
   */
  readonly formSlot: string | null;
  readonly starred: boolean;
}

/** One line of a round, as the screen asks it. */
export interface SpeakingItem {
  readonly key: string;
  readonly source: SpeakingSource;
  readonly cardId: string | null;
  readonly lexemeId: string | null;
  readonly lemma: string;
  /** What is said, in Estonian: the word, the phrase, or the sentence. */
  readonly et: string;
  /** What it means in English: the gloss, or the sentence's translation. */
  readonly en: string;
  /** The form a recall is marked on: the word itself, or its form in the sentence. */
  readonly target: string;
  readonly isSentence: boolean;
  readonly starred: boolean;
}

/** Whether a beginner may be asked this sentence: its form is the word itself or a present person. */
export function beginnerLine(candidate: SpeakingCandidate): boolean {
  if (!candidate.sentence) return true;
  if (core(candidate.sentence.form) === core(candidate.lemma)) return true;
  if (candidate.pos !== "VERB") return false;
  const slot = candidate.formSlot ?? "";
  return slot.startsWith("IndPrSg") || slot.startsWith("IndPrPl");
}

const ORDER: Record<SpeakingSource, number> = { deck: 0, phrase: 1, usage: 2 };

/**
 * The round: up to `size` lines, the sources in their order, one line per word.
 *
 * A deck word whose sentence a beginner may not be asked is asked as the word
 * alone, not dropped, because the word is still worth saying. A phrase entry
 * is always its own line. Stable: the same candidates give the same round.
 */
export function dealSpeaking(
  candidates: readonly SpeakingCandidate[],
  { size, beginner }: { size: number; beginner: boolean },
): SpeakingItem[] {
  const seen = new Set<string>();
  const out: SpeakingItem[] = [];
  const ordered = [...candidates]
    .map((candidate, at) => ({ candidate, at }))
    .sort((a, b) => ORDER[a.candidate.source] - ORDER[b.candidate.source] || a.at - b.at)
    .map(({ candidate }) => candidate);
  for (const candidate of ordered) {
    if (out.length >= size) break;
    const word = candidate.lexemeId ?? `${candidate.lemma}|${candidate.pos}`;
    if (seen.has(word)) continue;
    const sentence = candidate.sentence && (!beginner || beginnerLine(candidate)) ? candidate.sentence : null;
    // A usage is a sentence or nothing: without one it is a word another source already offers.
    if (candidate.source === "usage" && !sentence) continue;
    seen.add(word);
    out.push(sentence
      ? {
          key: `${word}|s`, source: candidate.source, cardId: candidate.cardId, lexemeId: candidate.lexemeId,
          lemma: candidate.lemma, et: sentence.et, en: sentence.en, target: sentence.form,
          isSentence: true, starred: candidate.starred,
        }
      : {
          key: `${word}|w`, source: candidate.source, cardId: candidate.cardId, lexemeId: candidate.lexemeId,
          lemma: candidate.lemma, et: candidate.lemma, en: candidate.meaning, target: candidate.lemma,
          isSentence: candidate.pos === "PHRASE", starred: candidate.starred,
        });
  }
  return out;
}

/** Every spelling a recall of this line is marked against. */
export function acceptedFor(item: SpeakingItem): string[] {
  return acceptedAnswers(item.target, "et");
}

/**
 * What a spoken recall is worth, only ever up (D4, D19, D13).
 *
 * A word or a phrase is the card's own verdict on the whole turn. A sentence
 * is said whole and marked on its one asked form: Good where that form was
 * heard as spelled, anything else fills the box for Check.
 */
export function spokenVerdict(item: SpeakingItem, hearing: Hearing): SpokenVerdict {
  if (!item.isSentence || item.target === item.et) return cardVerdict(hearing, acceptedFor(item));
  const wanted = new Set(acceptedFor(item).map(core));
  const hit = hearing.words.some((word) => wanted.has(core(word.text)) && heardAsSpelled(word, true));
  return hit ? { kind: "good" } : { kind: "fill", text: hearing.understood };
}

/**
 * Check, on what is in the box: the same marker a typed answer meets.
 *
 * For a sentence the asked form is looked for among the words in the box, and
 * the best reading of any of them is the answer, so the rest of the sentence
 * said around it never counts against it.
 */
export function checkSpoken(item: SpeakingItem, typed: string): AnswerCheck {
  if (!item.isSentence || item.target === item.et) return checkAnswer(typed, item.target, "et");
  const words = typed.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean);
  const checks = words.map((w) => checkAnswer(w, item.target, "et"));
  const best = checks.sort((a, b) => b.suggestedRating - a.suggestedRating)[0];
  return best ?? checkAnswer("", item.target, "et");
}

/**
 * What a checked recall writes, or nothing.
 *
 * A miss writes nothing (VB-5): the box was filled by a machine's hearing, and
 * a card sent back to the start because of a mishearing is a lapse the learner
 * never made, written where it can never be taken back. A word the dictionary
 * repaired and the learner left in place writes nothing either (D13). What is
 * left is the marker's own grade, Good or Hard.
 */
export function ratingFor(check: AnswerCheck, repaired: boolean): 2 | 3 | null {
  if (repaired) return null;
  if (check.suggestedRating === 1) return null;
  return check.suggestedRating;
}
