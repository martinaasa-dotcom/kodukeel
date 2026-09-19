import { PARTS, plainPhrase } from "@/lib/copy/values";

/**
 * WHAT A CARD SHOULD SAY, GIVEN WHAT IT SAYS AND WHAT ITS ENTRY HOLDS.
 *
 * `lib/srs/cards.ts` writes a RECOGNITION or PRODUCTION card's front and back
 * through `plainPhrase`, which drops a *phrase's* own capital and exclamation
 * mark so `Tere hommikust!` reads `tere hommikust` on a card, and leaves every
 * other word exactly as the dictionary holds it. A `Card` row carries its own
 * front and back and nothing in the app rewrites one, so each time that rule
 * was corrected the correction reached every card built since and not one
 * built before. Twice now: before `plainPhrase` existed a phrase card shouted
 * its greeting, and while it read only the first character of the whole string
 * it lowered a capital that was the language's rather than the app's, so
 * `aprill` was taught as `april`, `Eesti` as `eesti`, which is a different
 * word, and `Ma ei saa aru` as `i don't understand`.
 *
 * The half that decides, kept apart from the half that reads and writes the
 * database, which is what `lib/estonian/caseBuild.ts` and
 * `lib/progress/caseWalk.ts` are to each other and for the same reason: the
 * judgment is where the faults live and it is only unit testable out here.
 * `prisma/repair.ts` is the one caller.
 */

/**
 * WHICH SIDE OF A CARD HOLDS THE ESTONIAN, for the two card types whose front
 * and back are a word rather than a sentence, and the whole of what says this
 * may be run over a card at all.
 *
 * `prisma/repair.ts` asks only about those two, in a `where` clause, and that
 * was the only thing keeping this honest: handed a CLOZE card of a phrase
 * entry it answered `tere hommikust! Kuidas läheb?`, which is the reported
 * fault inside a sentence somebody wrote. A card whose front is an attested
 * sentence has no capital of ours to drop, and its back is a form rather than
 * an answer either half of this could recognise. Nothing about the data made
 * that safe: it is `gradates(pos)` and a phrase having no recorded usage that
 * leave the combination unreachable today, which is an accident rather than a
 * property. So the restriction is asked here, where the judgment is, and a
 * card type this does not answer for keeps exactly the text it had.
 */
const SIDES: Readonly<Record<string, { front: Side; back: Side }>> = {
  RECOGNITION: { front: "lemma", back: "translation" },
  PRODUCTION: { front: "translation", back: "lemma" },
};

type Side = "lemma" | "translation";

/**
 * Case and a trailing mark folded away, which is exactly what this may change.
 *
 * `checkAnswer` already normalises both before comparing, so two strings with
 * one key are one answer to the marker too, and adopting one over the other
 * can never change what a card accepts.
 */
const key = (text: string) => text.replace(/!+\s*$/, "").trimEnd().toLocaleLowerCase("et");

export interface CardText {
  readonly cardType: string;
  readonly front: string;
  readonly back: string;
}

export interface EntryText {
  readonly lemma: string;
  readonly translation: string;
  readonly pos: string;
}

/**
 * The front and back the builder would write for this card today.
 *
 * WHAT IT MAY CHANGE, in two parts, because the first was written down alone
 * and is not sufficient. Two strings are the same answer when they differ
 * only in case and in a trailing `!`, so this can change a card's capitals
 * and its mark and can never change which word it asks for or which answers
 * it takes. That is what makes it safe to run over a phrase and a word alike,
 * and it says nothing about a card whose front is a sentence: a case change
 * there is the reported fault rather than a correction of it, which is what
 * `SIDES` is for.
 *
 * EACH COLUMN AGAINST ITS OWN SIDE OF THE CARD, never against both. Five
 * shipped entries are one string in both languages once the case is folded
 * (`august` and `August`, `november`, `september`, `islam`, `muslim`), so a
 * single pool of spellings lets a recognition card's Estonian front adopt the
 * English gloss's capital and start teaching `August` as the Estonian word.
 * Driven over the real shapes before it was trusted, which is how that was
 * found.
 *
 * AN ANSWER THE ENTRY DOES NOT SUPPLY IS STILL CLEANED rather than left, since
 * `repairProductionBacks` widens a back with other entries' lemmas and the
 * builder runs every one of those through `plainPhrase` too. For a word that
 * is identity, so nothing is touched; for a phrase it is the capital and the
 * mark, which is what the builder would have written.
 *
 * THE RESIDUAL, because it is a fact about the data rather than about the
 * rule: a widened back names other entries' lemmas and this cannot restore a
 * capital on one, holding only this card's own entry. Measured over the
 * shipped dictionary, the fifteen shared prompts that touch a capital all
 * carry it in the *gloss* and every lemma under them is lower case, so there
 * is nothing there to restore.
 */
export function spellingFor(card: CardText, entry: EntryText): { front: string; back: string } {
  const sides = SIDES[card.cardType];
  if (!sides) return { front: card.front, back: card.back };

  const adopt = (stored: string, source: string) => {
    const known = new Map(
      plainPhrase(source, entry.pos).split(PARTS).map((written) => [key(written), written] as const),
    );
    return stored
      .split(PARTS)
      .map((part) => known.get(key(part)) ?? plainPhrase(part, entry.pos))
      .join(PARTS);
  };
  return {
    front: adopt(card.front, entry[sides.front]),
    back: adopt(card.back, entry[sides.back]),
  };
}
