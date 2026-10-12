/**
 * SAYINGS, THE ROUND: SEE IT, MATCH IT, FILL IT.
 *
 * Three steps and one thing to do on each, in the shape the Learn ladder
 * already teaches a word in. A saying is met once with the trap beside the
 * way out (what it says word for word, what it means), then the five of them
 * are matched to their meanings, then each is asked again inside a real
 * sentence with its second word missing.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING IS GRADED BY A MODEL. The Estonian is
 * `lib/estonian/sayings.ts`, every character of it a recorded sentence or a
 * word cut out of one. A match is right when two ids are the same id, and a
 * blank is right when the pick is the string that was taken out of the
 * sentence. All three steps are string comparisons.
 *
 * WHERE A SAYING IS ASKED IS NOT WHERE IT WAS MET. The see step reads the
 * first recorded sentence and the fill step the second, where the dictionary
 * holds two, so the question is never the line the learner has just read.
 * That is the cheapest honest version of "the same pair in new surroundings",
 * and it is why `sayings.ts` keeps a second sentence wherever there is one.
 *
 * SHUFFLED ON THE SERVER AND HANDED DOWN, for the reason Tähed gives: a
 * shuffle run in a render disagrees with itself between the server and the
 * browser, and the whole board is regenerated on arrival.
 *
 * Pure: no React, no Prisma, no network.
 */

import { shuffle } from "@/lib/random/shuffle";
import { MIN_SET, wordsOf, type Saying } from "@/lib/estonian/sayings";

/** A recorded sentence as the dictionary holds it now, with what it means. */
export interface ResolvedSentence {
  readonly et: string;
  /** Its English, where the deployment holds one. Null is "not yet", never "no". */
  readonly en: string | null;
  /** The stretch of it that is the saying. */
  readonly run: string;
  /** The entry it hangs off, so a missing translation can be asked for and stored. */
  readonly lexemeId: string;
}

/** A saying together with the sentences the live dictionary still holds for it. */
export interface PlayableSaying {
  readonly saying: Saying;
  readonly sentences: readonly [ResolvedSentence, ...ResolvedSentence[]];
}

export interface SeeStep {
  readonly id: string;
  readonly phrase: string;
  readonly means: string;
  readonly literal: string;
  readonly sentence: ResolvedSentence;
}

export interface MatchBoard {
  /** The pairs, in the order they are met. */
  readonly phrases: readonly { id: string; phrase: string }[];
  /** The same ids, with what they mean, in another order. */
  readonly meanings: readonly { id: string; means: string }[];
}

export interface FillQuestion {
  readonly id: string;
  /** The sentence before the missing word, and after it. */
  readonly before: string;
  readonly after: string;
  /** What was taken out. */
  readonly answer: string;
  /** The answer and its neighbours in the set, shuffled. */
  readonly options: readonly string[];
  readonly sentence: ResolvedSentence;
  /** What the pair means, for the line shown after the answer. */
  readonly phrase: string;
  readonly means: string;
  readonly literal: string;
}

export interface SayingsPlan {
  readonly see: readonly SeeStep[];
  readonly match: MatchBoard;
  readonly fill: readonly FillQuestion[];
}

/** How many wrong answers stand beside the right one, at most. */
export const WRONG_OPTIONS = 3;

/**
 * A sentence cut round the one word that is missing, or null where it cannot
 * be done honestly: the word absent, or present twice, in which case the other
 * one would stand in the sentence and give the answer away.
 */
export function blankOut(
  sentence: string, particle: string,
): { before: string; after: string } | null {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(particle)}(?![\\p{L}\\p{N}])`, "giu");
  const hits = [...sentence.matchAll(pattern)];
  if (hits.length !== 1) return null;
  const at = hits[0]!.index!;
  return { before: sentence.slice(0, at), after: sentence.slice(at + particle.length) };
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The sentence a saying is asked in: the second one the dictionary holds
 * where there is one that can be cut, and otherwise the first.
 */
export function askedIn(playable: PlayableSaying): ResolvedSentence {
  const { saying, sentences } = playable;
  const cuttable = sentences.filter((s) => blankOut(s.et, saying.particle));
  return cuttable[1] ?? cuttable[0] ?? sentences[0];
}

/** Whether the saying is asked in a sentence other than the one it was met in. */
export function isAskedElsewhere(playable: PlayableSaying): boolean {
  return askedIn(playable).et !== playable.sentences[0].et;
}

/**
 * One sitting, built. Null where there is not enough to make a board of: three
 * is the least a match has anything to rule out with.
 */
export function buildPlan(
  playable: readonly PlayableSaying[], random: () => number = Math.random,
): SayingsPlan | null {
  const usable = playable.filter((p) => blankOut(askedIn(p).et, p.saying.particle) !== null);
  if (usable.length < MIN_SET) return null;

  const see: SeeStep[] = usable.map((p) => ({
    id: p.saying.id,
    phrase: p.saying.phrase,
    means: p.saying.means,
    literal: p.saying.literal,
    sentence: firstWith(p),
  }));

  const phrases = usable.map((p) => ({ id: p.saying.id, phrase: p.saying.phrase }));
  const meanings = shuffleApart(
    usable.map((p) => ({ id: p.saying.id, means: p.saying.means })), random,
  );

  const particles = usable.map((p) => p.saying.particle);
  const fill: FillQuestion[] = shuffle(usable, random).map((p) => {
    const sentence = askedIn(p);
    const cut = blankOut(sentence.et, p.saying.particle)!;
    const wrong = shuffle(particles.filter((w) => w !== p.saying.particle), random).slice(0, WRONG_OPTIONS);
    return {
      id: p.saying.id,
      before: cut.before,
      after: cut.after,
      answer: p.saying.particle,
      options: shuffle([p.saying.particle, ...wrong], random),
      sentence,
      phrase: p.saying.phrase,
      means: p.saying.means,
      literal: p.saying.literal,
    };
  });

  return { see, match: { phrases, meanings }, fill };
}

/** The sentence a saying is met in: the first, which is the one with the pair in it whole. */
function firstWith(p: PlayableSaying): ResolvedSentence {
  return p.sentences.find((s) => containsPhrase(s.et, p.saying.phrase)) ?? p.sentences[0];
}

function containsPhrase(sentence: string, phrase: string): boolean {
  const have = new Set(wordsOf(sentence));
  return wordsOf(phrase).every((w) => have.has(w));
}

/**
 * Shuffled so that no meaning sits level with its own phrase, where the board
 * is big enough to manage it. A board whose rows already pair up is an answer
 * key with a column break in it.
 */
function shuffleApart<T extends { id: string }>(items: readonly T[], random: () => number): T[] {
  for (let tries = 0; tries < 20; tries++) {
    const out = shuffle(items, random);
    if (out.every((item, i) => item.id !== items[i]!.id)) return out;
  }
  // Rotated by one, which has no fixed point however the dice fall.
  return [...items.slice(1), items[0]!];
}

/** A match is right when both taps belong to the same saying. */
export function isMatch(phraseId: string, meaningId: string): boolean {
  return phraseId === meaningId;
}

/** A blank is right when the pick is the word that was taken out. */
export function isRight(question: FillQuestion, pick: string): boolean {
  return pick === question.answer;
}
