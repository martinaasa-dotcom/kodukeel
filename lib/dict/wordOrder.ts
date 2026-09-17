/**
 * What the dictionary says about the words of the sentences an exercise is
 * about to set.
 *
 * `lib/estonian/wordOrder.ts` decides which orders of a sentence are Estonian
 * and takes the reading of each word as a parameter, because it is pure and
 * because the three screens that mark this exercise do their marking where
 * there is no database: the lesson marks in the browser, and the examination
 * rebuilds its paper to mark it and may not open a socket on the way. So the
 * reading is resolved once, where the exercise is built, and the alternatives
 * ride on the item.
 *
 * **Bounded by the sentences rather than by the dictionary.** Reading every
 * form of every entry would be the widest query on the page for a question
 * about eight sentences. Two reads instead, each keyed on the spellings in
 * front of it: the verbs whose stored first person a person ending in one of
 * these words could have come from, which is `possibleFirstPersons` read the
 * way `lib/dict/search.ts` already reads it so that `tuleb` finds `tulema`;
 * and the entries that are not verbs and hold one of these spellings, which is
 * what says `kaalu` is the genitive of `kaal` as well as an imperative.
 */
import { prisma } from "@/lib/db";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { possibleFirstPersons } from "@/lib/estonian/conjugate";
import { orderContextFrom, type OrderContext, type OrderWord } from "@/lib/estonian/wordOrder";

/** The empty reading: no word is a verb, so no alternative order is offered. */
export const NO_ORDER_CONTEXT: OrderContext = orderContextFrom([]);

export async function orderContextFor(sentences: readonly string[]): Promise<OrderContext> {
  const words = new Set<string>();
  for (const sentence of sentences) {
    for (const token of sentence.matchAll(ESTONIAN_WORD)) words.add(token[0].toLowerCase());
  }
  if (words.size === 0) return NO_ORDER_CONTEXT;

  const spellings = [...words];
  const firstPersons = [...new Set(spellings.flatMap((w) => possibleFirstPersons(w)))];

  const [verbs, nominals] = await Promise.all([
    prisma.lexeme.findMany({
      where: {
        pos: "VERB",
        OR: [
          { lemma: { in: spellings } },
          { forms: { some: { value: { in: [...spellings, ...firstPersons] } } } },
        ],
      },
      select: { lemma: true, pos: true, forms: { select: { formType: true, value: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.lexeme.findMany({
      where: {
        pos: { not: "VERB" },
        OR: [{ lemma: { in: spellings } }, { forms: { some: { value: { in: spellings } } } }],
      },
      select: { lemma: true, pos: true, forms: { select: { formType: true, value: true } } },
      orderBy: { id: "asc" },
    }),
  ]);

  return orderContextFrom([...verbs, ...nominals] as OrderWord[]);
}
