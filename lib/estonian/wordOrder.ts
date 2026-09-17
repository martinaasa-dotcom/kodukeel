/**
 * Whether a sentence somebody rebuilt is an order Estonian actually uses.
 *
 * The sentence builder compared the tiles with the recording and called
 * everything else wrong. That is a claim the recording cannot support: a usage
 * is one Estonian sentence rather than the only one, and the field after the
 * verb in this language is genuinely free. It was reported off the app's own
 * first unit, where `Muidugi tuleb ette näpukaid` rebuilt as
 * `Muidugi tuleb näpukaid ette`, which is what anybody says, was marked wrong
 * under "Not the order Estonian uses here." A learner told their own Estonian
 * is wrong stops trusting the marking, and on a word-order exercise the
 * marking is all there is.
 *
 * So a built sentence is read three ways rather than two: the order the writer
 * chose, another order Estonian allows, and an order it does not. The first
 * two are both right and neither is penalised.
 *
 * **Accepting a permutation is this app making a claim about Estonian**, so
 * only the permutation it can be certain of is accepted and every other order
 * is still refused. One rule, and each of the conditions on it is there
 * because taking it away accepts a sentence nobody says. They were arrived at
 * by reading what the rule accepted rather than by reasoning about Estonian,
 * which is what `npm run audit:order` prints.
 *
 * 1. **A verb particle directly after the finite verb may instead stand at the
 *    end of its clause.** `panen kinni akna` and `panen akna kinni` are both
 *    ordinary Estonian and which one a lexicographer happened to write down
 *    says nothing about the other. The verb is the anchor rather than a
 *    position, because Estonian drops a pronoun subject and puts the verb
 *    first when it does: read positionally, `Pühkisin otsa eest higi` has a
 *    postposition where `Muidugi tuleb ette näpukaid` has a particle, and the
 *    two are the same shape to anything that is counting words.
 * 2. **Half of these words are also adpositions**, and moving one of those
 *    breaks the phrase it heads. An adposition stands next to the nominal it
 *    governs, so `PARTICLES` is in two halves: a word that is never an
 *    adposition moves to the clause end whatever follows it, and a word that
 *    can be one moves only when exactly one word follows, which makes the move
 *    a swap of the last two and can strand no complement. After that swap a
 *    preposition has become the postposition Estonian already uses for the
 *    same phrase, `üle tee` and `tee üle`, `mööda teed` and `teed mööda`.
 * 3. **Nothing is carried past a clause boundary, a joiner or another verb.**
 *    A comma ends a clause; `Nad kõndisid edasi ja jõudsid järveni` does not
 *    survive `edasi` being sent past the `ja`; and `lahti kirjutamata
 *    akronüümide` is a participle standing in front of its noun, which the
 *    particle in front of it belongs to.
 *
 * **One direction only, and that is the residual rather than an oversight.** A
 * particle the writer put at the end stays there: pulling one leftward out of
 * the end of a clause is where a postposition lives (`Ma ootasin bussi ees`),
 * and telling that from a particle needs the sentence parsed. So `Ta pani
 * raamatu ära` rebuilt as `Ta pani ära raamatu` is correct Estonian this still
 * refuses, which costs a learner the marking they already had. Getting it
 * wrong the other way would teach them a sentence nobody says, and that is the
 * fault this module exists against.
 *
 * Pure and framework-free, like the rest of `lib/estonian/`. **It writes no
 * Estonian**: every word it names is an uninflected adverb or conjunction, so
 * the lemma is the spelling, each is a request rather than a fact, and
 * `wordOrder.test.ts` asks `prisma/data/forms/` about every one of them,
 * which is the accept list and the question it exists to answer.
 * Which tiles are finite verbs is not its judgment either: the caller hands
 * that in off the dictionary, the way the scene gate is handed its forms.
 */
import { ESTONIAN_WORD, sentenceMatches, sentenceTiles } from "./cloze";
import { finiteFormsFrom } from "./conjugate";

/**
 * Verb particles that are never adpositions, so nothing governs a case around
 * them and moving one cannot break a phrase.
 *
 * Deliberately the short certain list rather than every adverb in the
 * language, which is the shape `DA_ONLY_VERBS` takes one directory over and
 * for the same reason: a list grown by widening until nothing complained would
 * accept an order somebody has to unlearn. `valmis` and `ringi` were tried and
 * left out, because `valmis maja` is an adjective in front of its noun and
 * `ringi` is also a form of `ring`.
 */
export const FREE_PARTICLES: readonly string[] = [
  "ära", "välja", "sisse", "üles", "maha", "kinni", "lahti", "katki",
  "kokku", "edasi", "laiali", "segi", "lõhki", "pooleks", "eemale", "kaasa",
];

/**
 * Verb particles that are also adpositions, so each moves only as a swap with
 * the one word that follows it.
 *
 * Every one of them is an ordinary postposition with the case it takes as a
 * preposition, which is what makes the swap safe rather than lucky. `alla` and
 * `üle` are the two left out on measurement rather than on principle: both
 * also mean "under" and "over" in front of a quantity, where `langeb alla
 * kümne kraadi` is not a particle verb at all.
 */
export const BOUND_PARTICLES: readonly string[] = [
  "ette", "läbi", "ümber", "mööda", "vastu", "juurde", "peale", "otsa",
  "külge", "kohale", "taha", "kõrvale", "eest", "järele", "tagasi", "täis",
];

export const PARTICLES: readonly string[] = [...FREE_PARTICLES, ...BOUND_PARTICLES];

/**
 * The conjunctions that open a clause without a comma in front of them.
 *
 * Estonian writes a comma before `et`, `sest`, `kui`, `aga`, `kuid` and every
 * relative pronoun, always, which the course's own conjunctions unit says on
 * its front. These four are the ones it does not, so they are the only ones a
 * boundary read off punctuation alone would miss.
 */
export const CLAUSE_JOINERS: readonly string[] = ["ja", "ning", "või", "ehk"];

const FREE = new Set(FREE_PARTICLES);
const BOUND = new Set(BOUND_PARTICLES);
const JOINERS = new Set(CLAUSE_JOINERS);

/** How the built order stands to the one a lexicographer recorded. */
export type OrderReading = "exact" | "variant" | "wrong";

export interface OrderVerdict {
  reading: OrderReading;
  /** The particle that sits somewhere else. Null unless the reading is `variant`. */
  moved: string | null;
}

/**
 * What the dictionary says about the words of a sentence.
 *
 * Two predicates rather than one, because the two questions are different and
 * both are load-bearing. `finiteVerb` is what anchors the particle, so it has
 * to mean a form carrying a person and a tense: `Ähvardas kõri läbi lõigata`
 * has its finite verb at the front, and `läbi` belongs to the infinitive at
 * the end. `verbForm` is any form at all, and it is what stops a particle
 * being sent past a participle standing in front of its noun: `lahti
 * kirjutamata akronüümide` is one phrase and `kirjutamata akronüümide lahti`
 * is not Estonian.
 *
 * Predicates rather than sets so a caller hands in whatever it already holds
 * and this module cannot reach a database.
 */
export interface OrderContext {
  /**
   * A spelling the dictionary holds as a finite verb form **and as nothing
   * else**. The second half is the whole of it: `kaalu` is the genitive of
   * `kaal` and the imperative of `kaaluma`, so `kui maiasmokk kaalu peale
   * astus` reads as a verb followed by a particle and is a postpositional
   * phrase followed by its verb. It is `readCase`'s discipline one room over,
   * exactly one reading or no claim.
   */
  finiteVerb: (word: string) => boolean;
  /** A spelling the dictionary holds as any form of any verb at all. */
  verbForm: (word: string) => boolean;
}

/** An entry as this module needs to read it, which is every dictionary's shape. */
export interface OrderWord {
  readonly lemma: string;
  readonly pos: string;
  readonly forms: readonly { formType?: string | null; morphCode?: string | null; value: string }[];
}

/**
 * The reading of a dictionary this module works from.
 *
 * One resolver rather than one per caller, which is what `contextFromRows`
 * does for the scene gate and for the reason that file gives: a harness, a
 * lesson and an examination that each built their own would be three answers
 * to which words of a sentence are verbs, and the paper would be marked
 * against a different Estonian from the one it was set in.
 */
export function orderContextFrom(words: Iterable<OrderWord>): OrderContext {
  const finite = new Set<string>();
  const anyVerb = new Set<string>();
  const nominal = new Set<string>();
  for (const word of words) {
    const spellings = [word.lemma, ...word.forms.map((f) => f.value)].map((v) => v.toLowerCase());
    if (word.pos === "VERB") {
      for (const v of spellings) anyVerb.add(v);
      for (const v of finiteFormsFrom(word.lemma, word.forms)) {
        anyVerb.add(v);
        finite.add(v);
      }
    } else {
      for (const v of spellings) nominal.add(v);
    }
  }
  return {
    finiteVerb: (w) => {
      const lower = w.toLowerCase();
      return finite.has(lower) && !nominal.has(lower);
    },
    verbForm: (w) => anyVerb.has(w.toLowerCase()),
  };
}

/**
 * The tiles of a sentence, grouped by clause.
 *
 * `sentenceTiles` drops punctuation, so the grouping is read off the original
 * text. A comma is the boundary and the conjunctions are not, which is the
 * opposite of the first version of this and was settled by reading what it
 * accepted: `ja` joins two clauses in `Nad kõndisid edasi ja jõudsid järveni`
 * and two adjectives in `Mees nägi välja rõõsa ja ümarik`, and nothing here
 * can tell those apart. Both are answered instead by refusing a move that
 * would carry a particle past a joiner at all, which costs the rule a few
 * sentences and cannot be wrong about either.
 */
export function sentenceClauses(original: string): string[][] {
  const clauses: string[][] = [[]];
  let cursor = 0;
  for (const token of original.matchAll(ESTONIAN_WORD)) {
    const between = original.slice(cursor, token.index);
    if (/[,;:!?]/.test(between) && clauses[clauses.length - 1]!.length > 0) clauses.push([]);
    clauses[clauses.length - 1]!.push(token[0]);
    cursor = token.index + token[0].length;
  }
  return clauses.filter((c) => c.length > 0);
}

/**
 * Every order of this sentence the app is prepared to call Estonian, the
 * writer's own first.
 *
 * At most one particle moves. Two moving at once is not a shape any of this
 * was measured on, and a rule allowing several is one nobody can check by
 * reading a screen.
 *
 * **The whole of it was drawn by reading what it accepted** over the 9,464
 * sentences the shipped dictionary can set as this exercise, which is the only
 * way any of these conditions could have been arrived at. Each one is in the
 * list because taking it out accepts a sentence nobody says, and the run after
 * the last of them offers 40 alternative orders, every one of them Estonian.
 */
export function acceptedOrders(original: string, dict: OrderContext): string[][] {
  const clauses = sentenceClauses(original);
  const orders: string[][] = [clauses.flat()];

  clauses.forEach((clause, clauseIndex) => {
    /*
      ONE FINITE VERB, OR THE APP DOES NOT KNOW WHICH WORD IS THE VERB. Two
      candidates in one clause is a clause this cannot read, so it stands down
      rather than taking the first. The commoner shape of the same doubt is one
      spelling that is a verb and a noun at once, and `OrderContext.finiteVerb`
      is where that one is refused.
    */
    const verbs = clause.map((w, i) => (dict.finiteVerb(w) ? i : -1)).filter((i) => i >= 0);
    if (verbs.length !== 1) return;
    const at = verbs[0]! + 1;
    const word = clause[at];
    if (word === undefined) return;
    const lower = word.toLowerCase();
    const free = FREE.has(lower);
    if (!free && !BOUND.has(lower)) return;

    const last = clause.length - 1;
    if (at === last) return; // already at the end: there is no move
    if (!free && at !== last - 1) return; // a swap of the last two, or nothing

    const over = clause.slice(at + 1, last);
    if (over.some((w) => JOINERS.has(w.toLowerCase()))) return; // never past a joiner
    if (over.some((w) => dict.verbForm(w))) return; // never past a participle or an infinitive

    const moved = [...clause.slice(0, at), ...clause.slice(at + 1), word];
    orders.push(clauses.flatMap((c, i) => (i === clauseIndex ? moved : c)));
  });

  return orders;
}

/**
 * How a built sentence stands to the recorded one.
 *
 * `exact` is the writer's own order and `variant` is another order Estonian
 * allows. Both are right. The alternatives are handed in rather than worked
 * out here, because the dictionary is what decides them and the three screens
 * that mark this exercise do their marking where there is none: the
 * examination rebuilds its paper to mark it and may not open a socket to do
 * it, and the lesson marks in the browser.
 */
export function readOrder(
  built: readonly string[],
  original: string,
  alsoRight: readonly string[],
): OrderVerdict {
  if (sentenceMatches(built, original)) return { reading: "exact", moved: null };
  const target = sentenceTiles(original).map((w) => w.toLowerCase());
  for (const order of alsoRight) {
    if (!sentenceMatches(built, order)) continue;
    const tiles = sentenceTiles(order);
    const moved = tiles.find((w, i) => w.toLowerCase() !== target[i]) ?? null;
    return { reading: "variant", moved };
  }
  return { reading: "wrong", moved: null };
}

/** Whether the built order counts as right. A variant is never penalised. */
export function orderIsRight(reading: OrderReading): boolean {
  return reading !== "wrong";
}

/**
 * The alternative orders as a caller stores them beside the sentence.
 *
 * The writer's own order is dropped, since that is the sentence itself and
 * carrying it twice is a second copy of the answer for somebody to get wrong.
 */
export function alsoRightOrders(original: string, dict: OrderContext): string[] {
  return acceptedOrders(original, dict).slice(1).map((order) => order.join(" "));
}
