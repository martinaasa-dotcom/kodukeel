import { englishFor } from "@/lib/dict/exampleEnglish";
import type { Example } from "@/lib/dict/examples";

/**
 * WHAT A SENTENCE MEANS, WHICHEVER ENTRY IT IS FILED UNDER.
 *
 * Answered off one entry's own examples alone, this was every
 * sentence a card was cut from until `lib/dict/borrow.ts` existed: a word may
 * now be drilled in a sentence recorded under another headword, and for those
 * the match found nothing. The screen then had no line to print and asked a
 * model for one, and `translateExample` correctly refused, because the
 * sentence really is not on that word. What a learner read was
 * `Olen Rootsis käinud vaid ühe korra.` with nothing under it on a card for
 * `üks`, since the sentence is filed under `kord`, and then an error naming
 * this app's own storage.
 *
 * An English line is a fact about the **sentence**, which is why the shipped
 * table is keyed on the sentence rather than on the entry, so the line was
 * already built and one entry over. This asks the entry first and that table
 * behind it.
 *
 * THE CHEAP ANSWER IS ALSO THE RIGHT ONE, AND THAT WAS MEASURED RATHER THAN
 * ASSUMED. The other way to reach it is `borrowedSentences()`, which is the
 * borrowed pool the card builder already reads, and it costs a full read of
 * the heaviest column in the dictionary, 1.46 MB and 360ms of index building
 * per cache fill, on the hottest read in the app, every minute of active use
 * on every instance. Over the shipped dictionary the two cover 11,125 and
 * 11,126 of the 11,223 borrowable sentences, which is the same 99.1% and one
 * sentence apart, so the pool buys nothing a free deployment can afford.
 *
 * AND A REFUSAL IS RESPECTED WHEREVER IT CAN BE SEEN. A line a reviewer took
 * off leaves `en` null on the entry that holds it, so an entry that holds the
 * sentence answers for it and the table is never asked: that is what stops
 * the shipped line being handed back over a decision somebody made, which is
 * the fault `mayFillEnglish` exists for one door over. What is left, and is
 * written down rather than left to be rediscovered, is a sentence refused on
 * the entry that owns it and *borrowed* by another: this cannot see that row,
 * so it prints the shipped line. That needs a reviewer's refusal, on a
 * sentence another word borrows, on a card cut from it.
 *
 * The one reader of "does the dictionary already say what this line means":
 * the review card, the sprint and the daily quest reconstruct a gap card's
 * sentence by putting the answer back and look it up here. Matched on the
 * exact spelling, because a translation belongs to the sentence it was made
 * of and a near miss is a different line. Null is "not yet", never "no":
 * `SentenceTranslation` is what turns one into the other.
 */
export function sentenceEnglish(examples: Example[], sentence: string): string | null {
  const held = examples.find((e) => e.et === sentence);
  if (held) return held.en ?? null;
  return englishFor(sentence);
}
