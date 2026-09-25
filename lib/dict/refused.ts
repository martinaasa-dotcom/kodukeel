/**
 * THE ATTESTED SENTENCES A PERSON HAS READ AND REFUSED.
 *
 * Every Estonian sentence in this app is one a lexicographer recorded, and
 * that is what keeps it honest: nothing here writes Estonian (ADR-005), so a
 * card, a gap, a worksheet and an examination paper are all cut out of text
 * somebody else wrote. What attestation does not buy is that the sentence is
 * one anybody would say, or that it is a sentence a learner should be handed.
 * Ekilex records a usage to illustrate a *sense* to somebody who already reads
 * Estonian, and a handful of those are not the language as it is used.
 *
 * `Ega ma temaks ole.` is the one this file was built for. It was reported off
 * a gap card by somebody who speaks Estonian: the sentence is not one anybody
 * would ever use, and the English line the dictionary shipped beside it, "I am
 * not him", is a translation of `Ma ei ole tema`, which is a different
 * sentence. That second half is the more useful finding. Asked to translate a
 * sentence nobody would write, the model wrote down what the sentence was
 * plainly meant to say, so the English came back fluent and the fault was
 * hidden rather than shown. There is no check downstream of that, because the
 * answer looks exactly like a good one.
 *
 * SO THE JUDGEMENT IS A PERSON'S AND THIS IS WHERE IT IS KEPT. No rule here
 * could have caught it. `naturalSentence` refuses a fragment, an ellipsis, a
 * slash and the label pattern, and every one of those is a shape; this is a
 * sentence in perfectly ordinary shape that a native speaker reads once and
 * refuses. A check that could see it would be a parser of Estonian that this
 * app does not have and should not pretend to, and the near version of it
 * would refuse correct Estonian, which is the fault this whole project is
 * built against.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING IS CORRECTED. A refusal only ever
 * withholds: the sentence stays exactly as Ekilex recorded it in the file the
 * harvest generates, and what this decides is that no screen may draw it. It
 * is the same latitude `lib/estonian/cloze.ts` takes, which hides a word out
 * of a recorded sentence and writes none, one step further out.
 *
 * ONE GATE, SO ONE LINE REACHES EVERY SURFACE. `parseExamples` is the single
 * reader of `Lexeme.examples` and about fifty callers come through it, so a
 * refusal there is a refusal on the dictionary entry, on every card the deck
 * builder makes, on the borrowed pool, on the printed worksheet, on the
 * grammar reference, on the examination pool and on the placement check at
 * once. `usableExamples` refuses it a second time, because a list mapped
 * straight out of a live Ekilex lookup never passes through `parseExamples`,
 * and `prisma/seed.ts` refuses it a third, so a fresh install never stores it
 * at all. Three readers rather than one is deliberate and asserted: a
 * refusal that holds on most of the doors is the state this replaced.
 *
 * AND IT IS A LIST RATHER THAN A DELETION, which is the durable half.
 * `prisma/data/harvested.ts` is generated and rewritten whole by every run of
 * `npm run harvest`, so a refusal recorded by deleting the line is a refusal
 * the next harvest undoes, silently, in the file nobody re-reads. That is the
 * argument `lib/dict/exampleEnglish.ts` already makes about which file an
 * English line belongs in.
 *
 * IT MATCHES ONE SPELLING AND MAKES NO CLAIM ABOUT ANY OTHER. A sentence is
 * refused where it keys onto a refusal exactly, after the trim, the collapse
 * and the case fold `usableExamples` already compares two examples through.
 * A variant is not covered: the same sentence with the stop dropped, an
 * ellipsis in place of the full stop, or a word reordered is a different
 * string and reaches every screen. That is deliberate rather than a gap
 * somebody forgot. What would cover it is a judgement about how near two
 * Estonian sentences are, which is the parser this file's own header refuses
 * to pretend to, and the near version of it withholds correct Estonian. The
 * harvest holds one spelling per usage, so a variant only arrives if Ekilex
 * changes what it records, and the answer to that is a second line here.
 *
 * THERE IS NO STALENESS CHECK ON IT, and that is the one exemption list here
 * without one. Everywhere else in this repository an entry naming something
 * the tree no longer holds has to go, because an exemption nobody can reach is
 * a parking space. Here the opposite is true: the harvest drops a refused
 * usage on the way out, so a run of it makes every entry in this file
 * unreachable, and a check that then required them to be deleted would hand
 * the sentence back the moment Ekilex was asked again. A refusal is permanent
 * by design.
 *
 * Pure: no React, no Prisma, no network.
 */

/** One sentence nobody may be shown, and why a person refused it. */
export interface RefusedSentence {
  /** The sentence exactly as it was recorded, so the entry can be searched for. */
  readonly et: string;
  /**
   * Why it may not be drawn, in the words of whoever refused it.
   *
   * Long enough to be a reason rather than a shrug, which is the floor
   * `lib/estonian/grammarExamples.ts` puts under a written gap for the same
   * reason: "bad" is not a reason and reads as nobody having looked.
   */
  readonly why: string;
}

/**
 * Every refusal, in the order they were made.
 *
 * Small on purpose. This is not a quality filter over the corpus and must not
 * become one: the corpus is fifteen thousand sentences, and a list built by guessing would withhold correct Estonian at a far
 * greater rate than it withholds anything worth withholding. An entry goes in
 * when somebody who speaks the language has read that sentence and said so.
 */
export const REFUSED_SENTENCES: readonly RefusedSentence[] = [
  {
    et: "Ega ma temaks ole.",
    why:
      "Not a sentence anybody would use, reported by a native speaker off the gap " +
      "card built from it. The English shipped beside it read \"I am not him\", " +
      "which is what Ma ei ole tema means and not what this says, so the " +
      "translation pass had quietly written down the sentence that was meant.",
  },
];

/**
 * The key two spellings of one sentence share.
 *
 * Trimmed, whitespace collapsed and folded for case, which is exactly what
 * `usableExamples` does before it compares two examples: a sentence that
 * reached the column through a backup, a hand edit or a refetch can differ
 * from the harvested one by a space and is the same sentence.
 */
function key(sentence: string): string {
  return sentence.trim().replace(/\s+/g, " ").toLocaleLowerCase("et");
}

function firstLetterOf(sentence: string): string {
  const trimmed = sentence.trimStart();
  return trimmed.length > 0 ? trimmed[0]!.toLocaleLowerCase("et") : "";
}

/*
  THE CHEAP HALF OF THE ANSWER, BECAUSE THIS IS ON THE HOTTEST READ IN THE APP.

  `parseExamples` asks about every sentence of every entry it reads, and the
  audits ask about all sixteen thousand the dictionary ships, several hundred
  times over. `key` trims, collapses and folds for case, and a locale fold is
  an ICU call: measured at 1.5 microseconds a sentence, which is nothing on a
  page and six seconds across a run of the audits, and it took the grammar pin
  suite past its own timeout the first time this landed.

  A GUARD IN FRONT OF A REFUSAL MAY ONLY EVER BE SOUND, and the first version
  of these two rested on an argument that is false. It said `key` can only
  shrink a string, which is true of the trim and the collapse and not of the
  fold: `toLocaleLowerCase` lengthens `İ` to `i` plus a combining dot, so a
  string can key longer than it arrived, and one character can become two.
  Nothing in Estonian spells that way and the sentence refused today holds no
  such character, so both guards were correct about the data rather than
  about the operation, which is a guard that holds until somebody adds the
  entry that breaks it.

  So each is built from both spellings. The floor is the shorter of a
  refusal's two lengths, so no candidate that could key onto one is ever under
  it; and a refusal contributes the first letter of its raw sentence as well
  as of its key, which is what stops the worse of the two failures, a refusal
  whose own sentence starts with such a character and which therefore never
  matches itself, silently and for ever.

  IT IS A FUNCTION OF THE ENTRIES RATHER THAN OF THE ONE LIST, so that the
  soundness can be driven. Asked of `REFUSED_SENTENCES` the guards are correct
  today whether or not the argument behind them is, which is a test that
  cannot fail; asked of an entry written to break them, it can.
*/
export function refusalMatcher(
  entries: readonly RefusedSentence[],
): (sentence: string) => RefusedSentence | null {
  const byKey = new Map(entries.map((entry) => [key(entry.et), entry] as const));
  const shortest = Math.min(
    ...entries.map((entry) => Math.min(entry.et.length, key(entry.et).length)),
    Infinity,
  );
  const firstLetters = new Set(
    entries
      .flatMap((entry) => [key(entry.et)[0], firstLetterOf(entry.et)])
      .filter((letter): letter is string => letter !== undefined && letter !== ""),
  );

  return (sentence: string) => {
    if (byKey.size === 0) return null;
    if (sentence.length < shortest) return null;
    if (!firstLetters.has(firstLetterOf(sentence))) return null;
    return byKey.get(key(sentence)) ?? null;
  };
}

const matchRefusal = refusalMatcher(REFUSED_SENTENCES);

/** Has somebody read this sentence and said it may not be shown? */
export function isRefusedSentence(sentence: string): boolean {
  return matchRefusal(sentence) !== null;
}

/** The reason one sentence was refused, for a report that prints it. */
export function refusalFor(sentence: string): RefusedSentence | null {
  return matchRefusal(sentence);
}
