/**
 * WHETHER THE LOG SUPPORTS MOVING UP, AND WHY IT IS A WARNING RATHER THAN A
 * WALL.
 *
 * A learner can finish a part without having learned it. Every step of every
 * evening can be ticked, the words can all have been answered once, and the
 * scheduler can still be watching four fifths of them come back wrong. Handing
 * that person B2.1 is the false confidence this app is built against: they
 * will meet a fortnight of words they cannot hold up and conclude the language
 * is the problem.
 *
 * So the ladder reads their own log at the hand-off and says what it sees.
 * **It never blocks.** The learner is the authority on their own week: they may
 * be revising elsewhere, sitting a class, or simply willing to be uncomfortable,
 * and an app that locked the door on the strength of a retention figure would be
 * wrong about some of those people and insufferable to all of them. What it does
 * is say plainly that Kodukeel does not think they are ready, say what it is
 * reading and what would change it, and put the way on next to it.
 *
 * TWO SIGNALS, AND BOTH ARE ABOUT THE PART THEY JUST DID.
 *
 * Retention is the one that matters: of the words that part taught, how many
 * has the scheduler actually graduated. Ticking an evening says somebody sat
 * down; a graduated card says they still had the word days later, which is the
 * only thing that makes the next part answerable.
 *
 * Accuracy is the second, over their own recent answers, and it is the one that
 * catches the opposite shape: somebody who is getting through but getting it
 * wrong. It is deliberately the weaker of the two, since a hard fortnight
 * honestly answered is not a reason to hold anybody back.
 *
 * AND THINNESS IS NOT A VERDICT. Under `MIN_EVIDENCE` answers the reading says
 * nothing at all rather than guessing, which is the same discipline
 * `lib/exam/readiness.ts` applies to its confidence figure and
 * `lib/classroom/roster.ts` to a band beside somebody's name. A warning built
 * on nine reviews would be an opinion wearing a measurement's clothes.
 *
 * Pure: four numbers in, a verdict out.
 */

/** The share of a part's words that have to have stuck. */
export const READY_KNOWN_SHARE = 0.6;

/** The share of recent answers that have to be right. */
export const READY_ACCURACY = 0.7;

/**
 * Answers needed before the reading says anything.
 *
 * Forty, which is `lib/readiness/`'s own floor for its middle rung and is
 * about a fortnight of the closing rounds. Under it the honest answer is that
 * the app has not watched somebody long enough to have a view.
 */
export const MIN_EVIDENCE = 40;

export interface LadderEvidence {
  /** Words the part just finished taught, that the dictionary could supply. */
  taught: number;
  /** Of those, the ones whose card the scheduler has graduated. */
  known: number;
  /** Answers graded in the recent window. */
  answers: number;
  /** Of those, the ones that counted as recalled. */
  right: number;
}

export type LadderVerdict =
  /** Enough evidence, and it supports going on. */
  | { kind: "ready" }
  /** Not enough evidence to have a view. Never shown as a warning. */
  | { kind: "unmeasured" }
  /** Enough evidence, and it does not support going on. */
  | {
      kind: "hold";
      /** Which of the two readings fell short, for the sentence on screen. */
      because: "retention" | "accuracy";
      /** The share seen, 0 to 1, so the screen can print it. */
      seen: number;
      /** The share it is being held to. */
      bar: number;
    };

/**
 * What the log says about moving on.
 *
 * Retention is read first, because it is the reading that actually predicts
 * whether the next part is answerable, and because it is the one a learner can
 * act on: the words are there, in the queue, waiting to be asked again.
 */
export function ladderVerdict(evidence: LadderEvidence): LadderVerdict {
  if (evidence.answers < MIN_EVIDENCE) return { kind: "unmeasured" };

  if (evidence.taught > 0) {
    const share = evidence.known / evidence.taught;
    if (share < READY_KNOWN_SHARE) {
      return { kind: "hold", because: "retention", seen: share, bar: READY_KNOWN_SHARE };
    }
  }

  const accuracy = evidence.right / evidence.answers;
  if (accuracy < READY_ACCURACY) {
    return { kind: "hold", because: "accuracy", seen: accuracy, bar: READY_ACCURACY };
  }

  return { kind: "ready" };
}

/** The one sentence the screen leads with, in the app's own voice. */
export function holdReason(verdict: Extract<LadderVerdict, { kind: "hold" }>): string {
  const seen = Math.round(verdict.seen * 100);
  return verdict.because === "retention"
    ? `Of the words that part taught, ${seen} in a hundred have stuck so far. `
      + "The rest are in the review queue and will come back on their own."
    : `You are getting ${seen} in a hundred right at the moment. `
      + "That is the number a harder part makes harder, not easier.";
}

/** What to do about it, which is never "start again". */
export function holdAdvice(verdict: Extract<LadderVerdict, { kind: "hold" }>): string {
  return verdict.because === "retention"
    ? "A few more days of review and this reading moves on its own. Nothing here is lost, and nothing has to be done twice."
    : "Slowing down for a few days is what moves this. The queue already knows which words are the problem.";
}
