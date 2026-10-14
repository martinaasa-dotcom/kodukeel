import { PARTS } from "@/lib/copy/values";
import { isRefusedSentence } from "@/lib/dict/refused";
import { BLANK } from "@/lib/estonian/cloze";

/**
 * THE REFUSED LINE A CARD IN A DECK WAS CUT FROM, OR NULL.
 *
 * Every door `lib/dict/refused.ts` guards stops a sentence on its way into a
 * card, and none of them reaches a card already built: a `Card` row keeps the front it was made with,
 * so a gap cut from `Haige on palavikust nõrk.` before the refusal came back
 * due on the daily path two days after it was refused, and was reported from
 * there. Removing the row is `npm run audit:decks --write`, which is a command
 * somebody has to run against every deployment; this is what makes the
 * refusal hold on the read before anybody has, so the card is never asked.
 *
 * The sentence is put back together, the front's gap filled with each
 * spelling the back holds, which is how `refusedSentenceCards` names the same
 * cards for removal and how a review card finds its own English.
 */
export function refusedCardSentence(card: { readonly front: string; readonly back: string }): string | null {
  if (!card.front.includes(BLANK)) return null;
  for (const answer of card.back.split(PARTS)) {
    const filled = card.front.replace(BLANK, answer.trim());
    if (isRefusedSentence(filled)) return filled;
  }
  return null;
}
