/**
 * LOOKING BACK AT THE WORD BEFORE THIS ONE.
 *
 * A round is one card at a time and the browser's back button is no help at
 * all: a session is a single history entry, so pressing it leaves the whole
 * round rather than stepping back a word. That was reported plainly, by
 * somebody who wanted to see the last word again and lost their place
 * finding out that they could not.
 *
 * WHAT THIS IS NOT. It is not undo. `undoGrade` rewinds what the scheduler
 * was told and puts a card back to be answered again, which is the right
 * thing for an answer the learner did not mean and far too much for "what
 * was that word?". Looking back writes nothing, grades nothing, reorders
 * nothing and takes nothing out of the queue: it is a record of what was on
 * the screen, kept in the session and dropped with it.
 *
 * SO A SEEN CARD IS A RECORD RATHER THAN A CARD. The session says what it
 * drew, once, at the moment it drew it, and this holds the sentence rather
 * than the row it came from. Two things follow. A card that has since been
 * put aside, requeued or graded again still reads back exactly as it was
 * shown, which is what somebody looking back is asking about; and nothing
 * here can reach a deck, a grade or a dictionary entry, so there is no way
 * for a look back to change the round it is inside.
 *
 * `of` is what the showing was about, opaque here and a card id to the
 * callers. It exists for undo alone: rewinding a grade puts that card back
 * in front of the learner, so the showing it is rewinding has not happened
 * any more and `forgetLast` takes it out again.
 */

/** One card as it was drawn, kept so it can be read back. */
export interface SeenCard {
  /** Unique per showing, since one card can be shown twice in a session. */
  key: string;
  /** What the showing was about, for `forgetLast`. Opaque here. */
  of: string;
  /** What kind of card it was, in the words the round's own chip uses. */
  label: string;
  /** The question as it was drawn, gaps and all. */
  question: string;
  /** The answer it turned out to be. */
  answer: string;
  /** The plain sentence saying what was being asked, where the round prints one. */
  note: string | null;
  questionLang: "et" | "en";
  answerLang: "et" | "en";
  /** The one form worth hearing again, or null where neither side is Estonian. */
  speak: string | null;
}

/**
 * How many showings are kept.
 *
 * A sprint is forty cards and an evening's review is rarely more, so this is
 * a ceiling on a pathological session rather than a limit anybody meets: what
 * it stops is a tab left open on a round that requeues for an hour growing an
 * unbounded array. The oldest go first, because the card somebody wants to
 * see again is nearly always the one just gone.
 */
export const LOOK_BACK_MAX = 40;

/** Adds a showing, oldest first, capped. */
export function remember(seen: readonly SeenCard[], entry: SeenCard): SeenCard[] {
  const next = [...seen, entry];
  return next.length > LOOK_BACK_MAX ? next.slice(next.length - LOOK_BACK_MAX) : next;
}

/**
 * Drops the most recent showing of one card, which is what undo rewinds.
 *
 * The most recent showing rather than every showing of it: a card answered
 * twice in a session was genuinely shown twice, and undo takes back one of
 * them. A card that is not there at all leaves the list alone, since a
 * showing that was never recorded cannot be taken back.
 */
export function forgetLast(seen: readonly SeenCard[], of: string): SeenCard[] {
  for (let i = seen.length - 1; i >= 0; i -= 1) {
    if (seen[i]?.of === of) return [...seen.slice(0, i), ...seen.slice(i + 1)];
  }
  return [...seen];
}

/**
 * Where a look back opens, which is the card that just went.
 *
 * Null when nothing has been seen yet, and the button that would open it is
 * not drawn at all: there is no honest screen for "the word before the first
 * one".
 */
export function openAt(seen: readonly SeenCard[]): number | null {
  return seen.length ? seen.length - 1 : null;
}

/** One further back, or null at the oldest kept showing. */
export function earlier(at: number, seen: readonly SeenCard[]): number | null {
  if (at <= 0 || at >= seen.length) return null;
  return at - 1;
}

/**
 * One forward, or null for the round itself.
 *
 * Null is the way back rather than a refusal, which is the whole of what the
 * forward button means: stepping past the newest thing seen is arriving back
 * where the learner was standing.
 */
export function later(at: number, seen: readonly SeenCard[]): number | null {
  if (at < 0 || at >= seen.length - 1) return null;
  return at + 1;
}
