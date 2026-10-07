import { prisma } from "@/lib/db";
import { borrowedSentences, sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import { BLANK } from "@/lib/estonian/cloze";
import { generateCards, isBareCaseFront, type LexemeForCards } from "@/lib/srs/cards";
import { conjugationSlotFromFront } from "@/lib/srs/slots";

/**
 * A FORM CARD IS A SENTENCE WITH A GAP, WHEREVER IT IS ASKED.
 *
 * `lib/srs/cards.ts` has built a case card and a person-of-a-verb card as a
 * sentence with the form taken out since the day a learner asked what the
 * point of `ravim → millest?` was. A `Card` row keeps the front it was built
 * with, so a deck assembled before that still holds `juhtuma → lihtminevik,
 * ma`, which asks for a form with nothing to say when anybody would use it,
 * and the seed's repair only reaches a deployment somebody reseeds.
 *
 * So the review path asks here, on every read: for each bare form card in the
 * batch, what would the builder make for this word and this slot today? A
 * card it can rebuild is shown as the sentence, the card, its schedule and its
 * history untouched (only what is *read* changes, never the row). A card it
 * cannot rebuild has no recorded sentence behind it and is held back from the
 * session rather than asked as a bare suffix on a stem, which is the one thing
 * this app no longer asks anywhere. `npm run audit:decks` is what removes it.
 *
 * Nothing is written to the database and nothing in Estonian is written here:
 * every sentence is one a lexicographer recorded, hidden by `buildCloze`.
 */

export interface FormCardRow {
  id: string;
  cardType: string;
  front: string;
  targetCase: string | null;
  slot: string | null;
  lexemeId: string | null;
}

export interface SentenceFront {
  front: string;
  back: string;
  hint: string | null;
  slot: string | null;
}

/** Whether a card is one of the two form cards in the old, sentence-less shape. */
export function isBareFormCard(row: Pick<FormCardRow, "cardType" | "front">): boolean {
  return (row.cardType === "CASE_FORM" || row.cardType === "CONJUGATION")
    && isBareCaseFront(row.front) && !row.front.includes(BLANK);
}

/**
 * The sentence version of each bare form card, by card id; null where the
 * dictionary holds no sentence for that word in that form.
 */
export async function sentenceFronts(rows: readonly FormCardRow[]): Promise<Map<string, SentenceFront | null>> {
  const bare = rows.filter((r) => isBareFormCard(r) && r.lexemeId);
  const out = new Map<string, SentenceFront | null>();
  if (bare.length === 0) return out;

  const ids = [...new Set(bare.map((r) => r.lexemeId!))];
  const [lexemes, borrowed, reach] = await Promise.all([
    prisma.lexeme.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, lemma: true, translation: true, pos: true, semanticTypes: true, cefr: true,
        gradation: true, gradationNote: true, government: true, examples: true,
        forms: {
          select: { formType: true, value: true, morphCode: true },
          orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
        },
      },
    }),
    borrowedSentences(),
    sentenceReach(),
  ]);

  const built = new Map<string, Map<string, SentenceFront>>();
  for (const lexeme of lexemes) {
    const lex: LexemeForCards = {
      ...lexeme,
      borrowed: borrowed.get(lexeme.id) ?? [],
      plainest: plainerFirst(lexeme.cefr, reach),
    };
    const byKey = new Map<string, SentenceFront>();
    for (const card of generateCards(lex, ["CASE_FORM", "CONJUGATION"])) {
      const key = card.cardType === "CASE_FORM" ? card.targetCase : card.slot;
      if (!key) continue;
      byKey.set(`${card.cardType}:${key}`, {
        front: card.front, back: card.back, hint: card.hint, slot: card.slot,
      });
    }
    built.set(lexeme.id, byKey);
  }

  for (const row of bare) {
    const key = row.cardType === "CASE_FORM"
      ? row.targetCase
      : row.slot ?? conjugationSlotFromFront(row.front);
    out.set(row.id, key ? built.get(row.lexemeId!)?.get(`${row.cardType}:${key}`) ?? null : null);
  }
  return out;
}
