import { LEVELS, type Level } from "@/lib/collections/syllabus/types";
import { levelBefore } from "./placement";

/**
 * HOW THE COURSE MEETS SOMEBODY WHO IS STRUGGLING, OR FLYING.
 *
 * First run believes the level somebody names (`lib/course/placement.ts`), and
 * believing a person is only kind if the app then watches whether it was
 * right. A guess ticked in ninety seconds is wrong in both directions for
 * somebody: the B1 speaker whose B1 was a long time ago, and the A2 learner
 * who has been sitting a class twice a week and is bored by the second
 * evening. This module is what the app does about either, and it does two
 * different kinds of thing on purpose.
 *
 * **It adjusts on its own, a little, and says so.** Somebody getting most
 * things wrong is read to more slowly and spoken to more plainly in a
 * conversation; somebody getting nearly everything right is read to at a
 * natural pace and met with a harder day at the counter. Neither changes what
 * the course teaches, only how hard the delivery is, so it is safe to do
 * without asking, and it undoes itself the week the answers change. The module
 * screen names it whenever it is on, because an app that quietly changes how
 * it treats somebody is an app they cannot trust.
 *
 * **It offers a move, and never makes one.** Where the answers say the part is
 * the wrong one, the module screen says so and puts the move beside it: step
 * down a level and go over it again, or skip ahead a part. The learner is the
 * authority on their own week, which is the argument `gate.ts` makes about the
 * hand-off and is the same argument here.
 *
 * A STEP DOWN IS A REFRESHER, NOT A DEMOTION, AND THE COPY SAYS SO. The
 * hand-off gate may never tell anybody to start a part again, because nothing
 * there repeats a fortnight somebody has already done. This is the other case
 * and the operator asked for it in as many words: somebody placed above where
 * their answers put them is offered the level below to go over, framed as
 * ground they very likely know, since that is exactly what it is, and it is
 * the ground the part in front of them is built on.
 *
 * AND THINNESS IS NOT A VERDICT. Under `ADAPT_MIN_EVIDENCE` answers the reading says
 * nothing, for the reason `gate.ts` gives: a view on somebody built out of a
 * dozen answers is an opinion wearing a measurement's clothes.
 *
 * Pure: counts in, a verdict and an offer out. `lib/progress/adapt.ts` asks
 * the database.
 */

/** Answers needed before the reading says anything. About a week of evenings. */
export const ADAPT_MIN_EVIDENCE = 30;

/**
 * Under this share right is struggling.
 *
 * Deliberately under `READY_ACCURACY` in `gate.ts`, which is 0.7 and is asked
 * once, at a hand-off, about whether the next part is answerable. This is
 * asked every evening about whether the one in front of them is, and a
 * reading that fired on an ordinary hard week would be the app telling
 * somebody who is learning perfectly well that they are failing. Under six in
 * ten, over at least thirty answers, is consistently wrong.
 */
export const STRUGGLING_ACCURACY = 0.6;

/** A share of misses (Again) this high is struggling whatever else is true. */
export const STRUGGLING_MISSES = 0.3;

/** At or over this share right, with the two conditions under it, is flying. */
export const FLYING_ACCURACY = 0.92;

/** Flying also needs this many answers, since "nearly everything" over thirty is thin. */
export const FLYING_EVIDENCE = 60;

/** And almost nothing missed outright. */
export const FLYING_MISSES = 0.04;

export interface AdaptEvidence {
  /** Answers graded in the window. */
  answers: number;
  /** Of those, recalled: Good or Easy, which is what every reading here calls right. */
  right: number;
  /** Of those, missed outright: Again. */
  missed: number;
}

export type AdaptReading =
  /** Not enough answers to have a view. Never shown. */
  | { kind: "unmeasured" }
  | { kind: "steady"; accuracy: number }
  | { kind: "struggling"; accuracy: number; because: "accuracy" | "misses" }
  | { kind: "flying"; accuracy: number };

/** What the recent answers say. Misses are read first, since they are the louder signal. */
export function adaptReading(evidence: AdaptEvidence): AdaptReading {
  if (evidence.answers < ADAPT_MIN_EVIDENCE) return { kind: "unmeasured" };
  const accuracy = evidence.right / evidence.answers;
  const misses = evidence.missed / evidence.answers;
  if (misses >= STRUGGLING_MISSES) return { kind: "struggling", accuracy, because: "misses" };
  if (accuracy < STRUGGLING_ACCURACY) return { kind: "struggling", accuracy, because: "accuracy" };
  if (evidence.answers >= FLYING_EVIDENCE && accuracy >= FLYING_ACCURACY && misses <= FLYING_MISSES) {
    return { kind: "flying", accuracy };
  }
  return { kind: "steady", accuracy };
}

/**
 * Which way the delivery leans: -1 gentler, 0 as the level says, +1 harder.
 *
 * One notch and never more, and only ever off the reading, so it cannot run
 * away: a learner who struggles at the gentler setting is offered a move, and
 * the lean does not deepen on its own.
 */
export type Tilt = -1 | 0 | 1;

export function tiltFor(reading: AdaptReading): Tilt {
  if (reading.kind === "struggling") return -1;
  if (reading.kind === "flying") return 1;
  return 0;
}

/**
 * The level a delivery is pitched at, leaned one band by the tilt and held to
 * the ladder. What it pitches is the pace a clip is read at and the band a
 * conversation opens at; it is never the level the course teaches.
 */
export function tiltedLevel(level: Level, tilt: Tilt): Level {
  const at = LEVELS.indexOf(level) + tilt;
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, at))]!;
}

/** One part of the ladder, as far as an offer needs to know about it. */
export interface PartRef {
  id: string;
  level: Level;
}

export interface AdaptPosition {
  /** The part in play. */
  part: PartRef;
  /** The whole ladder in order. */
  ladder: readonly PartRef[];
  /** Parts this learner has ever ticked a step of, which a move must not land in. */
  touched: ReadonlySet<string>;
  /** The level they hold, or null for a beginner. */
  held: Level | null;
  /** Whether that level was a paper's or their own word, for the sentence on screen. */
  kind: "measured" | "declared" | null;
}

/** A move the module screen offers, worked out entirely here. */
export type AdaptMove =
  | {
      kind: "down";
      /** The part it moves them to: the first of the level below the one in play. */
      to: PartRef;
      /** What they will hold afterwards, or null for nothing yet. */
      held: Level | null;
    }
  | { kind: "back"; to: PartRef; held: Level | null }
  | { kind: "ahead"; to: PartRef; held: Level | null };

export interface AdaptOffer {
  reading: Extract<AdaptReading, { kind: "struggling" | "flying" }>;
  /** The move the card leads with, or none where nothing is honest to offer. */
  move: AdaptMove | null;
  /**
   * Whether the level in play is the one first run placed them at from a level
   * they named, which is what the copy for a step down leans on: "you told us
   * B1" is a sentence about their own answer, and it is only true of them.
   */
  placed: boolean;
}

/**
 * The move a reading supports, from where somebody is.
 *
 * **Down** is the first part of the level below the one in play, and they
 * then hold the level below *that*, so the course and the climb agree about
 * the refresher. It is offered only onto a part they have never ticked a step
 * of, because the course reads a part's progress off its ticks and a part
 * already walked would open on "finished" rather than on its first evening.
 * That is also the case the offer is for: a learner placed at B2.1 has never
 * seen B1, and B1 is what B2 is built on.
 *
 * **Back** is the part immediately before, on the same condition, which is the
 * shape of somebody who skipped ahead a part and found the next one too far.
 *
 * **Ahead** is the part immediately after. Moving out of a level credits it:
 * somebody flying through the last part of B2 holds B2 when they skip to C1.
 *
 * Where no move is honest the offer carries none, and the card says what the
 * gentler delivery is doing instead. That is a beginner at the first part of
 * the course, and a learner who walked up from it, whose earlier parts are
 * all theirs already.
 */
export function adaptOffer(reading: AdaptReading, at: AdaptPosition): AdaptOffer | null {
  if (reading.kind !== "struggling" && reading.kind !== "flying") return null;
  const index = at.ladder.findIndex((p) => p.id === at.part.id);
  if (index < 0) return null;
  const placed = at.held !== null
    && LEVELS.indexOf(at.part.level) - LEVELS.indexOf(at.held) <= 1
    && LEVELS.indexOf(at.part.level) >= LEVELS.indexOf(at.held);

  if (reading.kind === "flying") {
    const next = at.ladder[index + 1];
    if (!next) return { reading, move: null, placed };
    const leaving = next.level !== at.part.level;
    const held = leaving && (at.held === null || LEVELS.indexOf(at.held) < LEVELS.indexOf(at.part.level))
      ? at.part.level
      : at.held;
    return { reading, move: { kind: "ahead", to: next, held }, placed };
  }

  const below = levelBefore(at.part.level);
  const down = below ? at.ladder.find((p) => p.level === below) : undefined;
  if (down && !at.touched.has(down.id)) {
    return { reading, move: { kind: "down", to: down, held: levelBefore(below!) ?? null }, placed };
  }
  const prev = at.ladder[index - 1];
  if (prev && !at.touched.has(prev.id)) {
    const held = at.held !== null && LEVELS.indexOf(at.held) >= LEVELS.indexOf(prev.level)
      ? levelBefore(prev.level) ?? null
      : at.held;
    return { reading, move: { kind: "back", to: prev, held }, placed };
  }
  return { reading, move: null, placed };
}

/**
 * Which of the two levers the lean actually moved for this learner.
 *
 * Asked rather than assumed, because a sentence claiming recordings are slower
 * is false for somebody at A1, whose pace is already the slowest, and for
 * somebody who picked a pace in Settings, which the lean never overrules. The
 * card says only what is true of the person reading it.
 */
export interface LeanEffects {
  /** The pace a clip is read at moved. */
  pace: boolean;
  /** The band a conversation opens at moved. */
  talk: boolean;
}

/** What the lean is doing, as one sentence, or nothing where it moved nothing. */
export function leanSentence(tilt: Tilt, effects: LeanEffects): string {
  if (tilt === 0) return "";
  const parts = tilt < 0
    ? [effects.pace && "recordings play a little slower", effects.talk && "conversations start a little simpler"]
    : [effects.talk && "conversations start a little harder", effects.pace && "recordings play a little quicker"];
  const said = parts.filter((p): p is string => Boolean(p));
  if (said.length === 0) return "";
  const joined = said.join(" and ");
  return tilt < 0
    ? `For now, ${joined}. That goes back to normal on its own as your answers pick up.`
    : `For now, ${joined}. If your answers change, that goes back to normal on its own.`;
}

/** The card's heading. */
export function offerTitle(offer: AdaptOffer): string {
  if (offer.reading.kind === "flying") {
    return offer.move ? "You're flying through this" : "You're flying through the top of the course";
  }
  return "This part is a tough one";
}

/**
 * What the card says, in the app's own voice: what it is reading, what it is
 * already doing about it, and why the move beside it would help. Never a
 * sentence about the learner's ability, only about the fit between them and
 * the part, which is the thing that is actually wrong.
 */
/**
 * The card's text in three parts, drawn as three paragraphs: what the answers
 * show, what the move would do, and what the lean is already doing, which is
 * set smaller because it is a note about the app rather than advice. Five
 * sentences run together were one block nobody finishes on a phone.
 */
export interface OfferText {
  lead: string;
  advice: string;
  lean: string;
}

export function offerParts(offer: AdaptOffer, effects: LeanEffects): OfferText {
  const seen = Math.round(offer.reading.accuracy * 100);
  const lean = leanSentence(tiltFor(offer.reading), effects);
  if (offer.reading.kind === "flying") {
    const lead = `Lately you've been getting ${seen} out of a hundred right.`;
    const advice = offer.move
      ? `If this part feels too easy, skip ahead to ${offer.move.to.id.toUpperCase()}. `
        + "Everything from this one stays in your reviews either way."
      : "There's no part above this one, so stretch yourself with your reviews and the tougher conversations.";
    return { lead, advice, lean };
  }

  const lead = offer.reading.because === "misses"
    ? "Quite a few of your recent answers have been misses. That usually means this part is a step ahead of you for now, not that anything's wrong with how you learn."
    : `Lately you've been getting ${seen} out of a hundred right. That usually means this part is a step ahead of you for now, not that anything's wrong with how you learn.`;
  const move = offer.move;
  if (!move) {
    return { lead, advice: "Your reviews already know which words are slipping away. Give them a few days and this will turn around.", lean };
  }
  if (move.kind === "down") {
    const below = move.to.level;
    const first = offer.placed
      ? `The level you started at was a first guess. Going over ${below} first will make this part much easier.`
      : `Going over ${below} first will make this part much easier.`;
    return {
      lead,
      advice: `${first} Much of it will feel familiar, and that's the idea: it's a refresher. This part waits for you afterwards, right where you left it.`,
      lean,
    };
  }
  return { lead, advice: `${move.to.id.toUpperCase()} is the part you skipped, and this one leans on it. Going back fills in the gaps.`, lean };
}

/** The same, as one string, for a reader that has room for one paragraph. */
export function offerBody(offer: AdaptOffer, effects: LeanEffects): string {
  const { lead, advice, lean } = offerParts(offer, effects);
  return [lead, advice, lean].filter(Boolean).join(" ");
}

/** The label on the button that makes the move. */
export function moveLabel(move: AdaptMove): string {
  if (move.kind === "down") return `Refresh ${move.to.level} first`;
  if (move.kind === "back") return `Go back to ${move.to.id.toUpperCase()}`;
  return `Skip ahead to ${move.to.id.toUpperCase()}`;
}
