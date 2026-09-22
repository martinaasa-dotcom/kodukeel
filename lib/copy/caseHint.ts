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
 */
const BY_LATIN: ReadonlyMap<string, string> = new Map(
  CASES.map((c) => [c.en.toLowerCase(), c.questionEn]),
);

/** The separator the card builders join a hint's parts with. */
const SEP = " · ";

export function readableHint(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let changed = false;
  const parts = raw.split("·").map((part) => {
    const named = BY_LATIN.get(part.trim().toLowerCase().replace(/^the\s+/, ""));
    if (!named) return part;
    changed = true;
    return named;
  });
  // Nothing to say about this hint, so it reaches the screen exactly as it was
  // stored, spacing and all.
  return changed ? parts.map((p) => p.trim()).join(SEP) : raw;
}
