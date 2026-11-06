import type { Level } from "@/lib/collections/syllabus/types";
import { scoreGuess, solvedAt, SONAD_GUESSES, type Mark } from "@/lib/games/sonad";

/**
 * A FINISHED SÕNAD BOARD AS A FEW LINES OF TEXT SOMEBODY CAN SEND A FRIEND.
 *
 * The board without its letters: one circle per letter, the header saying which
 * day it was and how many guesses it took, and the address. No letter and no
 * word, so it spoils nothing for somebody who has not played yet.
 *
 * CIRCLES IN WORDLE'S TWO COLORS, AND THAT IS A DECISION THE OPERATOR TOOK.
 * The board is circles in this app's own hues (`lib/games/sonad.ts` argues why
 * the look is not borrowed), and the share is read in a chat by people who
 * know the English game, so "in place" is green there rather than the board's
 * blue: anybody who has seen a Wordle grid reads it without a legend. The
 * circles are what keep it from being that grid.
 *
 * THE LEVEL IS IN THE HEADER BECAUSE NOT EVERYBODY GETS THE SAME WORD. The word
 * is drawn at the learner's level, and for somebody the course holds it is one
 * their evenings taught (`lib/progress/sonad.ts`), so "Sõnad 15" is not one
 * word across a group chat. The level is what tells two friends whether they
 * are comparing like with like.
 *
 * Pure, so the number, the grid and the header are tested without a browser.
 * This file is excused from the emoji rule in `lib/copy/readerCopy.test.ts`
 * and nothing else: the circles are the grid, never a picture in a sentence.
 */

/** The day Sõnad first shipped, which is puzzle 1. */
export const SONAD_FIRST_DAY = "2026-10-23";

/** One circle per mark. */
export const SHARE_MARK: Record<Mark, string> = {
  here: "🟢",
  elsewhere: "🟡",
  absent: "⚪",
};

function utcDay(day: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Which puzzle a day is, counting the first day as 1.
 *
 * Read off the learner's own day key, the one the board was drawn for, so the
 * number changes at their midnight rather than at the server's. A day before
 * the first is clamped to 1 rather than shared as a zero or a negative.
 */
export function sonadNumber(day: string): number {
  const from = utcDay(SONAD_FIRST_DAY);
  const to = utcDay(day);
  if (from === null || to === null) return 1;
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
}

/** The finished board, header first, then a row per guess, then the address. */
export function shareText({ day, level, guesses, answer, site }: {
  day: string;
  level: Level;
  guesses: readonly string[];
  answer: string;
  /** The host the board was played on, so a fork shares its own address. */
  site: string;
}): string {
  const at = solvedAt(guesses, answer);
  const score = at === null ? "X" : String(at);
  const rows = guesses.map((guess) => scoreGuess(guess, answer).map((mark) => SHARE_MARK[mark]).join(""));
  return [`Sõnad ${sonadNumber(day)}, ${level}, ${score}/${SONAD_GUESSES}`, "", ...rows, "", site].join("\n");
}
