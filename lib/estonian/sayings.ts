/**
 * SAYINGS: A VERB AND THE LITTLE WORD THAT CHANGES WHAT IT MEANS.
 *
 * `läks katki` is not "went broken". A learner who meets it word by word reads
 * a sentence about a vase going somewhere, and the one thing that would have
 * told them otherwise, that `katki` is the whole meaning, is exactly what a
 * dictionary entry for `minema` buries in its fourteenth sense. These are the
 * pairs a learner keeps meeting and keeps reading wrong.
 *
 * THE ESTONIAN IS CHOSEN AND NEVER WRITTEN (ADR-005). Every sentence here is
 * one a lexicographer recorded, named by the entry it is recorded under, the
 * way `lib/estonian/grammarExamples.ts` names a sentence for a grammar page.
 * `sayings.test.ts` fails on one the shipped dictionary does not hold
 * character for character, on one that ships without its English, and on a
 * marked run that is not really in the sentence. The two short phrases a
 * screen prints (`phrase` and `particle`) are cut out of those sentences and
 * the test checks they are in them, so nothing here is a form somebody typed
 * into a table and hoped.
 *
 * WHAT IS AUTHORED IS ENGLISH, which is the one language this project writes:
 * what the pair means and what it would mean word for word. The word-for-word
 * line is the point of the round. It is shown beside the real meaning so the
 * learner sees the trap and the way out in one look.
 *
 * TWO SENTENCES A SAYING WHERE THE DICTIONARY HAS TWO, because a pair
 * remembered from one sentence is a sentence remembered. The first is where it
 * is met and the second is where it is asked, so the question is never the
 * line the learner has just been shown. Where the dictionary holds one, the
 * round asks it again, and the test says which sayings are in that state.
 *
 * What is NOT here and is asked for next: `mine metsa` and `tülli minema`,
 * which are what this was started for and which Ekilex records as usages of
 * `minema` that this dictionary never kept. They need the harvest to keep
 * them first, since a saying whose sentence is not in the dictionary is a
 * saying nobody can vouch for.
 *
 * Pure: no React, no Prisma, no network.
 */

export interface SayingSentence {
  /** The entry the sentence is recorded under. A screen looks it up by this. */
  readonly lemma: string;
  /** The sentence exactly as recorded. Never edited. */
  readonly et: string;
  /** The stretch of it that is the saying, marked on screen. A run of whole words. */
  readonly run: string;
}

export interface Saying {
  /** Stable and ASCII, so a link or a stored answer survives a respelling. */
  readonly id: string;
  /** The pair as a screen prints it. Every word of it is in the first sentence. */
  readonly phrase: string;
  /** The word that makes it a saying, and the one the round blanks out. */
  readonly particle: string;
  /** What it means, said the way a person would say it. English. */
  readonly means: string;
  /** What it would mean if read word by word. English. */
  readonly literal: string;
  /** One sentence, or two. The first is where it is met, the second where it is asked. */
  readonly sentences: readonly [SayingSentence, ...SayingSentence[]];
}

export const SAYINGS: readonly Saying[] = [
  /* A set is five sayings in order, so the order below is the order a learner meets them. */
  {
    id: "minema-katki", phrase: "läks katki", particle: "katki",
    means: "it broke", literal: "went broken",
    sentences: [
      { lemma: "kukkuma", et: "Vaas kukkus maha ja läks katki.", run: "läks katki" },
      { lemma: "kuna", et: "Pean uue telefoni ostma, kuna vana läks katki.", run: "läks katki" },
    ],
  },
  {
    id: "minema-polema", phrase: "läks põlema", particle: "põlema",
    means: "it lit up, or caught fire", literal: "went to burn",
    sentences: [
      { lemma: "lüliti", et: "Vajutasin lülitit ja lamp läks põlema.", run: "läks põlema" },
      { lemma: "autobuss", et: "Avariisse sattunud autobuss läks põlema.", run: "läks põlema" },
    ],
  },
  {
    id: "minema-vaja", phrase: "läheb vaja", particle: "vaja",
    means: "you need it", literal: "goes needed",
    sentences: [
      { lemma: "vaja", et: "Kas sul läheb abi vaja?", run: "läheb abi vaja" },
      { lemma: "vaja", et: "Mul läheb autot täna endal vaja.", run: "läheb autot täna endal vaja" },
    ],
  },
  {
    id: "minema-kaduma", phrase: "läks kaduma", particle: "kaduma",
    means: "it went missing", literal: "went to vanish",
    sentences: [
      { lemma: "kaduma", et: "Lennujaamas läks kaduma kott miljoni dollariga.", run: "läks kaduma" },
    ],
  },
  {
    id: "minema-maksma", phrase: "läheb maksma", particle: "maksma",
    means: "it will cost", literal: "goes to pay",
    sentences: [
      { lemma: "miljon", et: "Hoone remont läheb maksma miljoneid eurosid.", run: "läheb maksma" },
      { lemma: "jõulurõõm", et: "Eelmisel aastal läks jõulurõõm tartlastele maksma 2000 eurot.", run: "läks jõulurõõm tartlastele maksma" },
    ],
  },

  {
    id: "minema-lahti", phrase: "läks lahti", particle: "lahti",
    means: "it broke out, it went off", literal: "went loose",
    sentences: [
      { lemma: "pauk", et: "Pauk läks lahti.", run: "läks lahti" },
      { lemma: "hüsteeria", et: "Oi-oi, milline hüsteeria nüüd lahti läks!", run: "lahti läks" },
    ],
  },
  {
    id: "minema-kinni", phrase: "ei lähe kinni", particle: "kinni",
    means: "it won't shut", literal: "doesn't go shut",
    sentences: [
      { lemma: "vahel", et: "Uks ei lähe kinni, sest midagi on vahel.", run: "ei lähe kinni" },
      { lemma: "kinni", et: "Kohver ei taha kinni minna.", run: "kinni minna" },
    ],
  },
  {
    id: "minema-kaima", phrase: "ei lähe käima", particle: "käima",
    means: "it won't start", literal: "doesn't go to walk",
    sentences: [
      { lemma: "ühendus", et: "Kui auto ei lähe käima, vaata ühendused üle.", run: "ei lähe käima" },
    ],
  },
  {
    id: "minema-laiali", phrase: "läks laiali", particle: "laiali",
    means: "it spread, it smeared", literal: "went apart",
    sentences: [
      { lemma: "laiali", et: "Kust selline jutt laiali läks?", run: "laiali läks" },
      { lemma: "tušš", et: "Tušš on silma ümber laiali läinud.", run: "laiali läinud" },
    ],
  },
  {
    id: "minema-segamini", phrase: "lähevad segamini", particle: "segamini",
    means: "they get mixed up", literal: "go mixed",
    sentences: [
      { lemma: "mõiste", et: "Arv ja number on mõisted, mis sageli segamini lähevad.", run: "segamini lähevad" },
    ],
  },

  {
    id: "minema-ule", phrase: "läks üle", particle: "üle",
    means: "it passed, it wore off", literal: "went over",
    sentences: [
      { lemma: "kuni", et: "Tüdruk nuttis, kuni viha üle läks.", run: "üle läks" },
    ],
  },
  {
    id: "minema-meelest", phrase: "ei lähe meelest", particle: "meelest",
    means: "you can't forget it", literal: "doesn't go out of mind",
    sentences: [
      { lemma: "lõust", et: "Ähvardajate jubedad lõustad ei lähe tal elu lõpuni meelest.", run: "ei lähe tal elu lõpuni meelest" },
    ],
  },
  {
    id: "minema-onge", phrase: "läks õnge", particle: "õnge",
    means: "you fell for it", literal: "went onto the hook",
    sentences: [
      { lemma: "tolvan", et: "Mõni tolvan läks müügikuulutuse peale õnge ka.", run: "läks müügikuulutuse peale õnge" },
    ],
  },
  {
    id: "minema-liiale", phrase: "minna liiale", particle: "liiale",
    means: "to go too far", literal: "to go to excess",
    sentences: [
      { lemma: "reegel", et: "Muinsuskaitse ei tohiks reeglitega liiale minna.", run: "liiale minna" },
    ],
  },
];

/** How many sayings make one sitting: the same five the Learn ladder takes at a time. */
export const SET_SIZE = 5;

/** Fewest a final set may hold. Under this a match board has nothing to rule out. */
export const MIN_SET = 3;

/** A word's whole-word tokens, lower case, for the checks that ask whether it is in a sentence. */
export function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** The sayings of one sitting, in order. Empty past the last. */
export function sayingSet(n: number): readonly Saying[] {
  const sets = setCount();
  if (!Number.isInteger(n) || n < 0 || n >= sets) return [];
  // A short tail rides with the set before it rather than standing alone.
  const last = n === sets - 1;
  return SAYINGS.slice(n * SET_SIZE, last ? undefined : n * SET_SIZE + SET_SIZE);
}

/** How many sittings there are. A tail under `MIN_SET` is folded into the set before it. */
export function setCount(): number {
  const full = Math.floor(SAYINGS.length / SET_SIZE);
  const tail = SAYINGS.length % SET_SIZE;
  return tail >= MIN_SET ? full + 1 : Math.max(1, full);
}
