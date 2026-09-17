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
 * saving. The rule moves a verb particle and nothing else, so a sentence with
 * no particle in it has no alternative order whatever the dictionary says
 * about its verbs, and asking about its words is work for an answer that is
 * already known. It is the examination that makes this matter rather than the
 * lesson: a paper is built from a pool of 500 entries and rebuilt again to
 * mark it, and measured over the shipped dictionary those 1,642 sentences bind
 * 14,052 values where the 125 holding a particle bind 1,792. Postgres takes at
 * most 65,535 in one statement, so the unfiltered read was not going to fail;
 * it was going to be slow on the one path that already reads the most, twice
 * per sitting.
 */
import { prisma } from "@/lib/db";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { possibleFirstPersons } from "@/lib/estonian/conjugate";
import { orderContextFrom, PARTICLES, type OrderContext, type OrderWord } from "@/lib/estonian/wordOrder";

/** The empty reading: no word is a verb, so every sentence keeps its one order. */
const NOTHING = orderContextFrom([]);

const PARTICLE = new Set(PARTICLES);

export async function orderContextFor(sentences: readonly string[]): Promise<OrderContext> {
  const words = new Set<string>();
  for (const sentence of sentences) {
    const tokens = [...sentence.matchAll(ESTONIAN_WORD)].map((t) => t[0].toLowerCase());
    if (!tokens.some((t) => PARTICLE.has(t))) continue;
    for (const token of tokens) words.add(token);
  }
  if (words.size === 0) return NOTHING;

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
