/**
 * WHICH MODEL A TURN NEEDS: THE CHEAP ONE, OR THE ONE THAT SOUNDS LIKE A PERSON.
 *
 * Most turns in a scene are the learner answering and the other side taking it
 * and asking the next thing. A small model writes those well. A few turns are
 * where a conversation is won or lost: the learner asked something back, said
 * something off the point, got stuck, or the other side has bad news to give.
 * Those want the stronger model, and so does any line the gate or the reviewer
 * has already withheld once, because a retry is a turn the learner is waiting
 * on.
 *
 * Pure: it reads the ask the composer is about to be handed and nothing else.
 *
 * HARNESS ONLY, AND WHY. Measured on all 43 scenes (docs/21-situations.md §87),
 * `claude-haiku-5-5` writing the easy turns lost to Sonnet writing all of them
 * 27 to 4 and 23 to 10 before a blind judge: the easy turns are where a person's
 * small reactions show. `npm run play:scenes -- --cascade` keeps the question
 * askable of the next Haiku.
 */
import type { MoveKind } from "../../lib/scenes/types";

/** The fields of an ask this reads. A `TurnAsk` and a harness's ask both carry them. */
export interface CascadeAsk {
  readonly move: MoveKind | string;
  /** What happened to the learner's last turn, where something did (`composeNote`). */
  readonly note?: string;
  /** Why the draft before this one was withheld. Set on every retry. */
  readonly because?: string;
  readonly feel?: string;
  readonly madeBefore?: number;
  readonly stillTalking?: boolean;
}

/**
 * Moves that carry the scene's content, where a person tells the learner
 * something (a price, a no, a correction, how to do a thing) rather than
 * asking. A small model gets these wrong in ways the reviewer catches late.
 */
const HEAVY_MOVES: ReadonlySet<string> = new Set(["offer", "refuse", "correct", "instruct"]);

/** Whether this ask goes to the stronger model. */
export function needsStrongModel(ask: CascadeAsk, avoid: readonly string[] = []): boolean {
  if (ask.because !== undefined || avoid.length > 0) return true;
  if (ask.note) return true;
  if (ask.feel === "sorry") return true;
  if ((ask.madeBefore ?? 0) >= 2) return true;
  if (ask.stillTalking) return true;
  return HEAVY_MOVES.has(ask.move);
}
