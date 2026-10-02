import { CASES } from "@/lib/estonian/cases";

/**
 * A STORED CARD HINT AS A LEARNER SHOULD READ IT.
 *
 * A `CASE_FORM` card built before the sentence rule landed has a front of
 * `üks → kellega? millega?` and a hint of `kaasaütlev · the comitative`, which
 * is two names and no instruction. The Estonian one is the name a class says
 * and stays; the Latin one is a translation of a translation to somebody who
 * has met neither, and it was reported off exactly that card: "the comitative"
 * as the only English anywhere near the answer.
 *
 * `lib/srs/cards.ts` has not written one of these for a long time. A `Card`
 * row carries its own hint and nothing in the app rewrites one, so every deck
 * built before that keeps the line, and a learner meets it tomorrow morning.
 *
 * So the Latin name is **rewritten to the question the case answers**, off the
 * one table in `lib/estonian/cases.ts`: `kaasaütlev · with whom? with what?`.
 * That is `readableGovernment`'s own shape one column over, and for its reason.
 *
 * DISPLAY ONLY, AND `Card.hint` IS NEVER REWRITTEN. This is a function over the
 * column on the way to a screen, so a deck is not touched, a repair that does
 * rebuild such a card (`repairCaseFronts`) is unaffected, and a hint this
 * cannot read comes back byte for byte as it was. It may only ever *replace* a
 * part that is exactly a case's Latin name, with or without its article: a
 * `GRADATION` hint's "consonant gradation" and a `GOVERNMENT` hint's "verb
 * government" name no case and are left alone.
 *
 * `questionEn` RATHER THAN `asksEn`, WHICH IS THE OTHER WAY ROUND FROM THE
 * USUAL RULE. A label with no word in front of it takes the short reading, the
 * thing question and the place adverb, because the whole name runs to three
 * questions and is a mouthful inside a sentence. This label has a word in front
 * of it: the card's own front is `üks → kellega? millega?`, both pronouns, and
 * the hint sits under the answer to exactly that. `with what?` alone beside it
 * would translate one of the two questions the learner was just asked and say
 * nothing about the other, so the reading is the whole name and the two lines
 * match one for one.
 */
const BY_LATIN: ReadonlyMap<string, string> = new Map(
  CASES.map((c) => [c.en.toLowerCase(), c.questionEn]),
);

/**
 * What a hint's parts are joined with on the way to a screen. Cards built
 * before the middot went from every screen were stored with it, so the
 * stored string is still split on it; what is printed is a comma.
 */
const SEP = ", ";

export function readableHint(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let changed = false;
  const parts = raw.split(/·|, /).map((part) => {
    const named = BY_LATIN.get(part.trim().toLowerCase().replace(/^the\s+/, ""));
    if (!named) return part;
    changed = true;
    return named;
  });
  // Nothing to say about this hint, so it reaches the screen exactly as it was
  // stored, spacing and all.
  return changed || raw.includes("·") ? parts.map((p) => p.trim()).join(SEP) : raw;
}

/**
 * A STORED CARD FRONT AS A LEARNER SHOULD READ IT.
 *
 * The oldest decks hold case cards whose front is `tool → allative`: the word,
 * an arrow and the Latin name of the case, written by a builder that predates
 * every rule about naming a case. Nothing rewrites a `Card` row until the seed
 * runs `repairCaseFronts`, so a learner on the second evening of A1 read
 * "allative" in a pill under `tool`, which is the one English word this app
 * has taken off every screen, on the card that had no business being asked at
 * all. It was reported from exactly there.
 *
 * The tail is read the way `readableHint` reads a hint: a part that is exactly
 * a case's Latin name, with or without its article, becomes the Estonian
 * question that case answers, `millele? kuhu?`, which is what the builder has
 * written on such a front ever since. Anything else comes back byte for byte,
 * so a sentence front, a conjugation label and a government card are untouched.
 * Display only: `Card.front` is never rewritten here.
 */
const QUESTION_BY_LATIN: ReadonlyMap<string, string> = new Map(
  CASES.map((c) => [
    c.en.toLowerCase(),
    [c.asksThing, c.asksWhere].filter(Boolean).join(" "),
  ]),
);

export function readableFront(front: string): string {
  const at = front.indexOf("→");
  if (at < 0) return front;
  const tail = front.slice(at + 1).trim().toLowerCase().replace(/^the\s+/, "");
  const question = QUESTION_BY_LATIN.get(tail);
  return question ? `${front.slice(0, at).trimEnd()} → ${question}` : front;
}

/**
 * The case a bare front names after its arrow, by any name it was ever
 * written in: the Latin one an old builder used, the Estonian one, or the
 * question the case answers. Null where the tail names none of them.
 */
export function caseFromFront(front: string): string | null {
  const at = front.indexOf("\u2192");
  if (at < 0) return null;
  const tail = front.slice(at + 1).trim().toLowerCase().replace(/^the\s+/, "");
  if (!tail) return null;
  for (const c of CASES) {
    const names = [c.en.toLowerCase(), c.et, c.question.toLowerCase(), c.asksThing, c.asksPerson];
    if (names.some((n) => n && (tail === n || tail.startsWith(`${n} `) || tail.startsWith(`${n},`)))) return c.key;
  }
  return null;
}
