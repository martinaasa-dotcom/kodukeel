/**
 * The exam at the end of a level.
 *
 * A checkpoint is not another unit and deliberately not another lesson. It
 * teaches nothing, offers no options to pick between, and draws on the whole
 * level at once rather than one theme — because the question it answers is
 * whether a level is finished or merely visited, and recognition cannot answer
 * that. Four options give a quarter of the marks away to somebody who knows
 * nothing.
 *
 * So every question is production: either write the word from its English gloss,
 * or fill its form into a sentence a lexicographer recorded. Both are typed, and
 * both are graded by `lib/estonian/answer`, which tells a dropped diacritic from
 * a typo from a wrong word — so `soda` for `sõda` is called out by name rather
 * than being waved through or failed flat.
 *
 * Pure and framework-free, like the rest of lib/collections.
 */
import { buildCloze, mentions } from "@/lib/estonian/cloze";
import { gapFormsFromParts } from "@/lib/estonian/gapForms";
import { shuffle } from "@/lib/random/shuffle";
import { rng } from "@/lib/random/seeded";

export interface CheckpointWord {
  lemma: string;
  gloss: string;
  pos: string;
  examples: readonly string[];
  parts: Readonly<Record<string, string>>;
}

export interface CheckpointQuestion {
  id: string;
  kind: "type" | "gap";
  lemma: string;
  gloss: string;
  /** The sentence with a blank, for a gap question. Empty for a typed one. */
  sentence: string;
  /** The full sentence, revealed afterwards. */
  full: string;
  answer: string;
  /**
   * The word's other forms, handed to `checkAnswer` so another ending one
   * keystroke away is marked as the wrong form rather than as a slip: `toast`
   * for `toas` read as "One letter out." and counted toward passing a level.
   */
  rivals: readonly string[];
}

/**
 * Roughly this share of a checkpoint is gap-fill rather than bare production.
 *
 * Not all of it, because a word without an attested sentence would then be
 * untestable, and not none of it, because producing a lemma in isolation says
 * nothing about whether the learner can put it in a sentence.
 */
const GAP_SHARE = 0.4;

/**
 * Every spelling of a word that could be the one hidden in a sentence.
 *
 * Two copies of this loop existed, here and in the other of these two files,
 * and neither knew a verb person: `Kontsert algab kell 18.` could not be
 * gapped for `algama`. `lib/estonian/gapForms.ts` is the one answer and three
 * other screens read it.
 *
 * The plural is taken out of it here, for the reason `lib/collections/lesson.ts`
 * gives at length beside its own copy of this function: `NOM_PL`, `GEN_PL`
 * and `PART_PL` are stored principal parts rather than a derivable ending,
 * and no lesson in this course teaches how Estonian forms one. A checkpoint
 * is a review of what a level already taught, so asking it about a form
 * nothing ever taught is testing the dictionary rather than the learner.
 */
const UNTAUGHT_PRINCIPAL_PARTS = ["NOM_PL", "GEN_PL", "PART_PL"];

function knownForms(word: CheckpointWord): string[] {
  const untaught = new Set(
    UNTAUGHT_PRINCIPAL_PARTS
      .map((key) => word.parts[key]?.trim().toLowerCase())
      .filter((v): v is string => !!v),
  );
  return [...gapFormsFromParts(word).keys()].filter((form) => !untaught.has(form));
}

function rivalsFor(word: CheckpointWord, answer: string): string[] {
  const right = answer.trim().toLowerCase();
  return [...gapFormsFromParts(word).keys()].filter((spelling) => spelling !== right);
}

/**
 * Builds a checkpoint.
 *
 * Returns fewer questions than asked for rather than repeating a word: a
 * twenty-question exam over a level with twelve usable words is twelve
 * questions, and saying so is better than asking about `ühiskond` twice and
 * calling it twenty.
 */
export function buildCheckpoint(
  words: readonly CheckpointWord[],
  count: number,
  seed = 1,
): CheckpointQuestion[] {
  const rand = rng(seed);
  const chosen = shuffle(words, rand).slice(0, count);
  const wantGaps = Math.round(chosen.length * GAP_SHARE);

  const questions: CheckpointQuestion[] = [];
  let gaps = 0;

  for (const [i, word] of chosen.entries()) {
    if (gaps < wantGaps) {
      const cloze = formGap(word);
      if (cloze) {
        gaps += 1;
        questions.push({
          id: `q${i}`, kind: "gap", lemma: word.lemma, gloss: word.gloss,
          sentence: cloze.text, full: cloze.full, answer: cloze.answer,
          rivals: rivalsFor(word, cloze.answer),
        });
        continue;
      }
    }
    questions.push({
      id: `q${i}`, kind: "type", lemma: word.lemma, gloss: word.gloss,
      sentence: "", full: "", answer: word.lemma,
      rivals: rivalsFor(word, word.lemma),
    });
  }

  return questions;
}

/**
 * A gap that wants a form this word does not spell like its own lemma.
 *
 * A CHECKPOINT IS A MEASUREMENT, AND THE SCREEN PRINTS THE WORD. It says
 * "The word is X, in the form the sentence needs" under the sentence, which
 * is right while the sentence wants an inflected form and is the answer
 * written out the moment it wants the dictionary form. Taking the first
 * sentence that clozes at all took the nominative on 616 of the 1,354 course
 * words that can carry a gap, and passing this checkpoint moves the learner
 * up a level: a question nobody can get wrong measures nothing, and here it
 * measures nothing while counting toward a level (`lib/assessment/items.ts`
 * makes the same argument about the placement check's own free marks).
 *
 * So a sentence wanting a real form is taken and every other sentence is
 * passed over. A word left with none is not dropped: the loop below falls
 * through to the typed question, which asks the same word from its English
 * gloss and prints nothing the learner could copy. That is the shape this
 * file already has for a word with no attested sentence at all, so nothing
 * new is introduced and no word goes unasked.
 */
function formGap(word: CheckpointWord) {
  const forms = knownForms(word);
  // Exactly what the screen prints under the sentence, and the whole of it:
  // the meaning hands an answer over as completely as the word does, which is
  // `saun`, glossed "sauna", over a gap wanting `sauna`.
  const cue = `${word.lemma} ${word.gloss}`;
  for (const sentence of word.examples) {
    const cloze = buildCloze(sentence, forms);
    if (cloze && !mentions(cue, cloze.answer)) return cloze;
  }
  return null;
}

/** Whether a checkpoint was passed, as a whole-percent comparison. */
export function checkpointPassed(correct: number, total: number, passMark: number): boolean {
  if (total === 0) return false;
  return Math.round((correct / total) * 100) >= passMark;
}
