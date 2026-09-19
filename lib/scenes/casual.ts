/**
 * HOW PEOPLE ACTUALLY SAY HELLO AND GOODBYE, WHICH IS NOT HOW THE COURSE SAYS IT.
 *
 * A scene's greet beat is met by anything the learner says back, and its close
 * beat by `Head aega!`, `Nägemist!` or a plain thanks. Those are the greetings
 * the course teaches, and they are not the ones anybody uses with a friend: a
 * learner ended a scene with "ciao", another with "tsau", and the friend on the
 * phone answered "Vabandust!" and asked the same question again. Somebody who
 * says goodbye has left, whichever word they left with, and a scene that
 * cannot hear "tsau" is a scene that has never been on an Estonian street.
 *
 * ACCEPT ONLY. This table is read by `readTurn` to decide whether a turn
 * greeted or took its leave, and by nothing else: nothing here is ever said by
 * the other side, banked, graded or put on a card, and a beat met through it
 * is written down as a substitution so no row in the review log claims the
 * learner produced the course's own farewell. That is the shape `ENGLISH` in
 * `turn.ts` already takes and the shape ADR-005 allows: a word list read to
 * understand, never to answer.
 *
 * Two halves, kept apart because they are two claims. `et` is Estonian as it
 * is spoken, loans included, and every entry is a spelling the forms list
 * (`prisma/data/forms/`, Ekilex and Vabamorf with guessing off) vouches for,
 * asserted in `casual.test.ts`, so this file writes no Estonian the language
 * has not already written down. `other` is what a learner brings with them
 * from another language, which English, German, Russian, Finnish and Italian
 * all leave on an Estonian street corner; those are written here on the
 * latitude `ENGLISH` takes, since they are not Estonian and cannot be checked
 * against it.
 *
 * `tsau` is in both halves of the day, exactly as "ciao" is, so which it means
 * is the beat's to say: on the greet beat it is hello and anywhere else it is
 * goodbye, which is what a person on the other end of the phone would take it
 * as too.
 *
 * Pure: no React, no Next, no Prisma, no network.
 */
import { fold } from "@/lib/estonian/fold";

export const CASUAL = {
  hello: {
    et: ["tsau", "tšau", "tsauki", "hei", "tervist", "hai"],
    other: ["hi", "hello", "hey", "ciao", "hallo", "hej", "moi", "privet", "salut", "hola", "yo"],
  },
  bye: {
    et: ["tsau", "tšau", "tsauki", "pakaa", "hüvasti", "nägemiseni", "kohtumiseni", "davai"],
    other: ["bye", "goodbye", "ciao", "tschüss", "adieu", "adios", "hejdå", "poka", "cheers", "later"],
  },
} as const;

/**
 * How long a turn may be and still be read as a bare leave-taking.
 *
 * `Head aega!` is credited anywhere in a turn because a scene names it; a word
 * that means hello as readily as goodbye is credited only where it is most of
 * what was said. "ok tsau" is somebody leaving; "tsau, kuhu ma pean minema?"
 * is somebody asking, and reading it as a goodbye would end the scene on a
 * question the learner wanted answered.
 */
export const CASUAL_BYE_WORDS = 3;

const HELLO = new Set([...CASUAL.hello.et, ...CASUAL.hello.other].map(fold));
const BYE = new Set([...CASUAL.bye.et, ...CASUAL.bye.other].map(fold));

/** The casual hello in a turn, or null. Folded, since `tšau` is typed on a keyboard with no š. */
export function casualHello(spoken: readonly string[]): string | null {
  return spoken.find((word) => HELLO.has(fold(word))) ?? null;
}

/** The casual goodbye in a short turn, or null. */
export function casualBye(spoken: readonly string[]): string | null {
  if (spoken.length === 0 || spoken.length > CASUAL_BYE_WORDS) return null;
  return spoken.find((word) => BYE.has(fold(word))) ?? null;
}
