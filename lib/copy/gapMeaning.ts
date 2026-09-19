import { sensesOf } from "@/lib/dict/synonyms";
import { mentions, whereWhole } from "@/lib/estonian/cloze";
import { fold } from "@/lib/estonian/fold";

/**
 * WHAT THE SENTENCE AROUND A GAP SAYS, WITH THE WORD BEING ASKED FOR MARKED
 * INSIDE IT.
 *
 * A gap card printed the Estonian sentence with a hole in it and, under it, the
 * bare English gloss of the missing word: `Kohtume kell ____.` over `four`. A
 * learner reported that, and the report is the whole argument. `four` is the
 * answer's meaning and nothing else; it says what the word is and not what the
 * sentence is doing with it, so the one thing a gap-fill is for, producing a
 * form because a sentence needs it, is being asked with the sentence unreadable
 * to everybody below about B1. The line reads `Let's meet at four.` now, with
 * `four` marked, which says the same thing the gloss said and puts it in the
 * place the learner is being asked to fill.
 *
 * THIS AMENDS A RULE RATHER THAN IGNORING ONE. "A translation shown before the
 * answer is the answer" was written for exactly one fault, the thirty entries
 * spelled the same in both languages, where `I watched the film` over
 * `Vaatasin ____` hands `filmi` over. That fault is real and both of this
 * module's refusals are it. What the rule over-reached on is the other
 * ninety-nine percent: the gloss was *already* on the question, so a sentence
 * carrying that same gloss gives away nothing the card was not giving away
 * before, and withholding it bought a screen nobody could read rather than a
 * question nobody could cheat. What a measurement does is unchanged and is not
 * this: the mock examination, the level checkpoint and the placement check each
 * print a sentence and no English because there the sentence *is* the question
 * (`lib/copy/sentenceCoverage.ts`), and none of them reaches this module.
 *
 * TWO REFUSALS, AND BOTH ARE THE SAME FAULT AT TWO WIDTHS.
 *
 * Whole-line: where the English carries the answer as a whole word, nothing is
 * drawn at all. That is `mentions`, which is the guard the learn ladder's gap
 * rung has applied to this very line since it was written, and this is that
 * rule moved into one place rather than a second copy of it.
 *
 * Mark-only: where the English word that *would* be marked is the answer
 * wearing an English ending, the sentence is still drawn and nothing in it is
 * marked. `film` is not `filmi`, so `mentions` passes it, and a bold `film`
 * directly over a gap wanting `filmi` points at the answer more plainly than
 * printing it would. Read on the shared opening rather than on equality,
 * because the ending is exactly what differs: `paus : pausi` is `pause`, and
 * neither spelling is a prefix of the other. Four characters of agreement is a
 * loanword; an English word and an Estonian one that are not the same word
 * share a first letter and stop (`room` against `toas`, `shop` against
 * `poodi`), so the floor costs nothing real. Refusing here costs the mark and
 * never the sentence.
 *
 * MEASURED OVER THE SHIPPED DICTIONARY RATHER THAN REASONED ABOUT. Of the
 * 10,520 gap cards it builds, 10,419 have an English line already (the other
 * 101 are a sentence `npm run translate:examples` has not covered, and those
 * cards read exactly as they did before this existed). Of those, 55.1 percent
 * are marked, 44.7 percent draw the sentence with nothing marked and keep the
 * card's own cue beside it, and **19 are withheld whole**. Those nineteen are
 * the argument for the first refusal, since every one of them is a word spelled
 * alike in both languages: `risk`, `euro`, `just`, `reform`, `seminar`,
 * `sauna`, `kama`, `riigikogu`. What is left unmarked is a translator's own
 * choice of word rather than a rule this could learn, `ankle` for `jalg` and
 * `phone` for `telephone`, and chasing those is how a rule starts guessing.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING IS ESTONIAN. The sentence is the English
 * the dictionary already holds for a line a lexicographer recorded, built once
 * by `npm run translate:examples` and shipped; the gloss is the card's own
 * cue, which is authored English; and all this decides is where one of them
 * sits inside the other. Pure, so it is unit tested rather than driven.
 */
export interface MeaningRun {
  readonly text: string;
  /** True on the one run that is the word the gap is asking for. */
  readonly asked: boolean;
}

export interface GapMeaning {
  readonly runs: readonly MeaningRun[];
  /**
   * Whether the asked word was found and marked.
   *
   * The caller needs this rather than having to walk the runs, because it is
   * what decides whether the line may stand *instead of* the bare gloss or has
   * to stand beside it. A sentence with nothing marked is still worth reading
   * and no longer says which of its words is wanted, so the cue stays.
   */
  readonly marked: boolean;
}

/**
 * A card's back may carry every spelling a marker takes, joined.
 *
 * `tuppa / toasse` is one answer written twice, so both have to be checked:
 * reading the whole string as one word would find neither in the English and
 * would let a line through that gives one of them away. The separators are
 * `acceptedForms`'s own, so what a marker accepts and what this withholds
 * over cannot come apart; the normalising it does afterwards is deliberately
 * not done here, since these are compared against an English sentence as
 * written rather than folded for marking.
 */
const ANSWER_SEPARATOR = /\s*[/,;]\s*|\s+or\s+/;

function eachAnswer(answer: string): string[] {
  return answer.split(ANSWER_SEPARATOR).map((one) => one.trim()).filter(Boolean);
}

/** Shortest opening that is a word rather than a letter they happen to share. */
const SAME_WORD_FLOOR = 4;
/** Shortest whole word that may be read as one spelling of another. */
const WHOLE_WORD_FLOOR = 3;
/** How much of an ending the two spellings may disagree about. */
const ENDING_SLACK = 2;

/**
 * Whether an English word is the Estonian answer wearing an English ending.
 *
 * Folded, because the six letters an English keyboard has no key for are
 * exactly the ones a loanword loses on the way into English.
 */
function sameWord(english: string, answer: string): boolean {
  const a = fold(english.trim().toLowerCase());
  const b = fold(answer.trim().toLowerCase());
  if (!a || !b) return false;
  if (Math.min(a.length, b.length) >= WHOLE_WORD_FLOOR && (a.startsWith(b) || b.startsWith(a))) return true;
  let shared = 0;
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared += 1;
  /*
    And the agreement has to be most of the shorter word rather than its first
    syllable, or a compound is read as its own first part: `post office` over a
    gap wanting `postkontoris` shares four characters and is not that word.
    `ENDING_SLACK` is what an English ending costs, `pause` against `pausi`.
  */
  return shared >= SAME_WORD_FLOOR && shared >= Math.min(a.length, b.length) - ENDING_SLACK;
}

/**
 * The commonest English plurals no ending reaches.
 *
 * Deliberately short and deliberately these: they are the ones the course's
 * own glosses actually hit, measured over every gap card the shipped
 * dictionary builds. A word missing from here costs a mark and never a wrong
 * one, which is what lets the list stay this size.
 */
const IRREGULAR_PLURALS: Readonly<Record<string, string>> = {
  person: "people", child: "children", man: "men", woman: "women",
  foot: "feet", tooth: "teeth", mouse: "mice", goose: "geese",
  life: "lives", knife: "knives", wife: "wives", leaf: "leaves", half: "halves",
};

/** Shortest sense worth inflecting. Below it, `us` would look for `uses`. */
const INFLECT_FLOOR = 3;

/**
 * An English sense and the shapes the sentence may be carrying it in.
 *
 * THIS IS THE SCANNER'S RULE IN A SMALLER ROOM, AND THAT IS WHAT MAKES IT
 * SAFE. Nothing derived here is ever printed: a shape is a *spelling to look
 * for* inside English a translator actually wrote, and one nobody wrote
 * matches nothing and disappears. So a wrong guess costs a word left unmarked,
 * which is the state every one of these was in before this module existed, and
 * it can never put a word on the screen that is not in the sentence already.
 *
 * It was measured before it was written rather than assumed. Over every gap
 * card the shipped dictionary builds, the single commonest reason the gloss
 * could not be found in its own sentence was number: the gap is plural in
 * Estonian, so the line reads `Young and educated people.` over `inimene,
 * person` and `I like reading books.` over `raamat, book`. The gloss is
 * singular because a dictionary headword is.
 *
 * Only the plural, and only of a noun-shaped sense. English verb inflection is
 * where the irregulars are, `go` against `went` and `buy` against `bought`, and
 * a list long enough to be worth having would be this project writing an
 * English grammar for one bold run.
 */
function englishShapes(sense: string): string[] {
  if (sense.length < INFLECT_FLOOR || sense.includes(" ")) return [sense];
  const irregular = IRREGULAR_PLURALS[sense];
  if (irregular) return [sense, irregular];
  if (/(s|x|z|ch|sh)$/.test(sense)) return [sense, `${sense}es`];
  if (/[^aeiou]y$/.test(sense)) return [sense, `${sense.slice(0, -1)}ies`];
  return [sense, `${sense}s`];
}

/**
 * Which English words could be the gloss standing in the sentence.
 *
 * The senses of the cue, longest first, so `post office` is preferred over the
 * `office` inside it, and the cue whole behind them for a gloss written as one
 * phrase. A cue is the card's own ladder (`lemma, meaning`, then `meaning`, then
 * nothing), and the Estonian lemma in it is dropped rather than left to miss.
 */
function candidates(cue: string, lemma: string | null): string[] {
  const estonian = lemma?.trim().toLowerCase();
  /*
    AND THE ESTONIAN HALF OF THE CUE IS NEVER MARKED IN AN ENGLISH SENTENCE.

    A gap card's cue is `lemma, meaning`, so the lemma arrives here as a sense
    like any other, and most of them simply never occur in English. The ones
    that do are why this is dropped rather than left to luck: `on` is the third
    person of `olema` and is a word in half the English sentences there are, so
    the card for `olema` marked `The book is on the table.` on `on`, which is
    the wrong word, in the wrong language, pointing at the wrong place.
  */
  const senses = sensesOf(cue).map((sense) => sense.of).filter((sense) => sense !== estonian);
  /*
    The cue whole is the fallback and never a rival, because `sensesOf` has
    already read it: it returns a comma-free gloss entire, minus a verb's
    leading `to`, so ranking the untouched string beside its own senses would
    put `to help` back in front of `help` on every verb in the course.
  */
  const whole = cue.replace(/\([^)]*\)/g, "").trim().toLowerCase();
  const all = (senses.length > 0 ? senses : [whole]).filter((word) => word.length > 1);
  return [...new Set(all.flatMap(englishShapes))].sort((a, b) => b.length - a.length);
}

/**
 * The English of a gap's own sentence, with the asked word marked.
 *
 * Null where there is nothing honest to draw: no translation stored yet, or a
 * translation that carries the answer.
 */
export function gapMeaning(
  { en, answer, cue, lemma = null }: {
    en: string | null;
    answer: string;
    cue: string | null;
    /**
     * The card's own headword, where the cue may carry it.
     *
     * Neither marked nor looked for: see `candidates`. A caller whose cue is
     * the gloss alone has nothing to pass and passes nothing.
     */
    lemma?: string | null;
  },
): GapMeaning | null {
  const line = en?.trim();
  if (!line) return null;
  if (eachAnswer(answer).some((one) => mentions(line, one))) return null;

  const plain: GapMeaning = { runs: [{ text: line, asked: false }], marked: false };
  if (!cue?.trim()) return plain;
  const answers = eachAnswer(answer);

  for (const word of candidates(cue, lemma)) {
    const at = whereWhole(line, word);
    if (!at) continue;
    const found = line.slice(at.index, at.index + at.length);
    // The mark is what points at the answer, so where the two are one word the
    // sentence is drawn and nothing in it is.
    if (answers.some((one) => sameWord(found, one))) return plain;
    return {
      marked: true,
      runs: [
        { text: line.slice(0, at.index), asked: false },
        { text: found, asked: true },
        { text: line.slice(at.index + at.length), asked: false },
      ].filter((run) => run.text.length > 0 || run.asked),
    };
  }

  return plain;
}

/**
 * What the card's own cue still has to say, once the sentence has said it.
 *
 * A MARKED SENTENCE REPLACES THE GLOSS AND NEVER THE WORD, and the first
 * version of this replaced both. `Card.hint` on a gap is one string and it is
 * usually two things: `lib/srs/cards.ts` builds it as `${lemma}, ${translation}`
 * and says in as many words why, that the card "asks for the right *form*, not
 * for the vocabulary, which the recognition card already tests". So a screen
 * that hides the whole cue the moment the English line is marked takes the
 * Estonian headword off the question with the gloss, and asks for the
 * vocabulary after all. Measured over every gap card the shipped dictionary
 * builds: 5,746 are marked and 3,760 of them, 65.4%, carry a lemma in the cue,
 * so `Läksin ____ juurde.` was asked over "I went to the **doctor**." with
 * `arst` nowhere on the screen.
 *
 * What is redundant under a marked line is the gloss, because the mark is that
 * gloss printed in context. The lemma is not, so it stays.
 *
 * This can never print more than the cue already printed: a hint carrying the
 * lemma is by construction a hint whose lemma is *not* the answer, since the
 * ladder in `lib/srs/cards.ts` falls to the meaning alone wherever the gap
 * wants the dictionary form. A caller whose cue is the gloss alone passes no
 * lemma and gets nothing back, which is the flash round and the exceptions
 * round, both of which withhold the lemma on purpose.
 */
export function gapCue(
  { hint, lemma, marked }: { hint: string | null; lemma: string | null; marked: boolean },
): string | null {
  const cue = hint?.trim();
  if (!cue) return null;
  if (!marked) return cue;
  const word = lemma?.trim();
  return word && mentions(cue, word) ? word : null;
}
