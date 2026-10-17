import { lineWords, lightUp, shareLit } from "./lightUp";

/**
 * WHICH LINE ON THE SCREEN SOMEBODY JUST SAID, IF ANY (docs/41-fifth-batch.md, D20).
 *
 * Where a screen already offers answers (a conversation's picks, a round's
 * options, the landing café's lines), what was heard is matched to them after
 * decoding, never by biasing the decoder toward them (D8). Both sides are
 * folded through `soundKey` by way of `lightUp`, so a pick's score is the share
 * of its words heard in order.
 *
 * Two numbers, and they are the whole rule. A pick is lit when at least
 * `MATCH_AT` of its words were heard in order **and** no other pick comes
 * within `MATCH_MARGIN` of it. Anything less lights nothing and the transcript
 * goes to the box to edit, because a garbled utterance that lands near one of
 * two similar picks is exactly the case where the person who said it should be
 * the one to decide.
 */
export const MATCH_AT = 0.7;
export const MATCH_MARGIN = 0.2;

/**
 * How long a lit line, or a heard turn in the box, waits before it is sent on
 * its own: the countdown ring of D20. Long enough to read what was heard and
 * touch the screen to stop it, short enough that a conversation still flows.
 * Any touch of the screen or the box stops it, and "Send what I say straight
 * away" skips it (`lib/ux/speechPrefs.ts`).
 */
export const SEND_RING_MS = 2500;

export interface PickMatch {
  /** The index of the pick that was said, or null where none clearly was. */
  readonly index: number | null;
  /** Every pick's share of words heard in order, in the picks' own order. */
  readonly scores: readonly number[];
}

export function matchPick(picks: readonly string[], heard: string): PickMatch {
  const scores = picks.map((pick) => shareLit(lightUp(lineWords(pick), heard)));
  if (scores.length === 0 || !heard.trim()) return { index: null, scores };
  let best = -1;
  for (let i = 0; i < scores.length; i++) if (best === -1 || scores[i]! > scores[best]!) best = i;
  const top = scores[best]!;
  if (top < MATCH_AT) return { index: null, scores };
  const rival = Math.max(-Infinity, ...scores.filter((_, i) => i !== best));
  // Two picks within the margin are two things the learner might have meant.
  if (rival > top - MATCH_MARGIN + 1e-9) return { index: null, scores };
  return { index: best, scores };
}
