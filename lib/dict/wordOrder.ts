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
 *
 * **And bounded again by the sentences that could fire**, which is most of the
 * saving. Both moves pick up a named word, so a sentence holding none of them
 * has no alternative order whatever the dictionary says about its verbs, and
 * asking about its words is work for an answer that is already known.
 * `wordsWorthAsking` is that narrowing and it lives beside the lists rather
 * than here: written against `PARTICLES` alone it went on narrowing by the
 * particle after the adverb had been added, so `Ma loen raamatut täna` asked
 * about nothing, the reading could not tell which word was the verb, and the
 * whole adverb move was offered by the audit and by nothing a learner could
 * reach. It is the examination that makes this matter rather than the lesson,
 * since a paper is built from a pool of 500 entries and rebuilt again to mark
 * it. Measured over the 9,480 sentences the builder can set in the shipped
 * dictionary: 22,245 distinct spellings unfiltered, 4,106 once the sentences
 * holding nothing movable are dropped, which is 1,218 sentences of the 9,480.
 * **Widening it to the adverb cost about a tenth of that saving**, from 3,730
 * spellings and 1,047 sentences, which is the price of the move working at
 * all. Postgres takes at most 65,535 bind values in one statement, so the
 * unfiltered read was never going to fail; it was going to be slow on the one
 * path that already reads the most, twice per sitting.
 */
import { prisma } from "@/lib/db";
import { possibleFirstPersons } from "@/lib/estonian/conjugate";
import { orderContextFrom, wordsWorthAsking, type OrderContext, type OrderWord } from "@/lib/estonian/wordOrder";

/** The empty reading: no word is a verb, so every sentence keeps its one order. */
const NOTHING = orderContextFrom([]);

export async function orderContextFor(sentences: readonly string[]): Promise<OrderContext> {
  const spellings = wordsWorthAsking(sentences);
  if (spellings.length === 0) return NOTHING;

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
