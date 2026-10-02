/**
 * WHETHER A TURN NEEDS A PERSON, OR ONLY THE NEXT LINE.
 *
 * Since ADR-025 amendment 1 the model was asked on every beat that carries
 * content, on the argument that a line written with the conversation in front
 * of it beats one drafted months before. That argument is right exactly where
 * the conversation has given the model something to work with, and on most
 * turns it has not: the learner answered the question they were asked, in the
 * words the beat expected, and the other side's whole job is to take it and
 * ask the next thing. The keyless reply already does that well, out of the
 * dictionary and the bank: it says the learner's own word back, put right
 * where it slipped (`recast`), reacts to news the scene marked as news
 * (`feltAt`), and moves on with a line a person wrote and a native speaker
 * read (`lib/scenes/bank.ts`). A model on that turn was a paid paraphrase of
 * the line underneath it.
 *
 * So the model is kept for the turns where a person is what the turn needs,
 * which are the ones the bank cannot have anticipated: a miss that deserves an
 * answer rather than the question again, a question the scene did not plan
 * for, news to react to, a goodbye after something they said, and a learner
 * who said a good deal more than the answer. Everything else is on rails and answers from the bank, which costs
 * nothing, books nothing and is exactly what a keyless deployment has always
 * said on the same turn.
 *
 * WHAT THIS DOES NOT CHANGE. Every rung under the model is untouched, the gate
 * is untouched, and a turn that needs a person still gets the same model with
 * the same prompt. Where the bank has nothing left for a beat the model is
 * asked as before, since the line underneath would otherwise be the repair
 * phrase. And a run opened without a key never reached here.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import type { TurnReading } from "./turn";

/**
 * How many words beyond what met the beat make a turn more than an answer.
 *
 * Counted rather than read, because this module holds no Estonian: a learner
 * who answers "which floor?" with a whole sentence says three or four words
 * the beat did not need (`ma elan`, a noun), and one who also tells the
 * neighbour they have just moved in and the stairs are steep says eight. Six
 * is between the two, so an answer phrased as a sentence stays on rails and a
 * turn that volunteered something is answered by somebody who read it.
 */
export const CHATTY_WORDS = 6;

export interface TurnNeed {
  /** Turns the learner has taken so far. None means the other side is opening the scene. */
  readonly turns: number;
  /** How the last turn was read, null before any. */
  readonly reading: TurnReading | null;
  /** The last turn landed: it answered this beat, a beat further on, or one the other side had moved past. */
  readonly landed: boolean;
  /**
   * The last turn asked something that neither the card nor the bank answers
   * (`asideFor` came back empty), so without a person the honest reply is a
   * shrug. A question the scene anticipated is answered by its own line.
   */
  readonly unanswered: boolean;
  /** The beat they answered marks its answer as news to react to (`BeatSpec.feel`). */
  readonly news: boolean;
  /** The scene is closing on something the learner just told them rather than on their goodbye. */
  readonly closingOnNews: boolean;
  /** Words in the last turn beyond the ones that met the beat. */
  readonly extraWords: number;
  /** The rungs under the model have a real line for this move, not the repair phrase. */
  readonly bankHasLine: boolean;
}

/**
 * Readings of a turn that was real Estonian and missed: the one case where
 * the question said again is the machine the learner reported, and where a
 * person answers what they actually said before asking again.
 */
const MISSED = new Set<TurnReading>(["offtarget", "incomplete", "fragment"]);

/**
 * True where the turn needs a person to write the next line; false where the
 * bank's line, with the keyless reaction in front of it, is the right one.
 *
 * Kept to the turns nothing prepared could answer, on the operator's
 * instruction that scenes run as cheaply as they can be made to run: a
 * curveball has banked lines, a counter-offer is said off the card, a word
 * handed to somebody stuck is the dictionary's, a late answer is credited by
 * the marker, and a question the scene anticipated has its own answer. What
 * is left is a miss, a question nobody planned for, news, a goodbye after
 * news, and a learner who said a good deal more than the answer.
 */
export function needsComposer(need: TurnNeed): boolean {
  if (!need.bankHasLine) return true;
  // Nothing has been said yet, so there is nothing for a line to be about.
  if (need.turns === 0) return false;
  if (need.unanswered) return true;
  if (need.reading !== null && MISSED.has(need.reading)) return true;
  if (need.news || need.closingOnNews) return true;
  return need.landed && need.extraWords >= CHATTY_WORDS;
}

/**
 * Words in a turn beyond the ones that met the beat, off the turn's own
 * record: what was said, less what `readTurn` wrote down as producing the
 * answer (`TurnRecord.produced`) and what it repeats back (`matched`).
 */
export function extraWordsOf(
  said: readonly string[],
  produced: readonly string[] | undefined,
  matched: readonly string[] | undefined,
): number {
  const used = new Set([...(produced ?? []), ...(matched ?? [])].map((w) => w.toLocaleLowerCase("et")));
  return said.filter((w) => !used.has(w.toLocaleLowerCase("et"))).length;
}
