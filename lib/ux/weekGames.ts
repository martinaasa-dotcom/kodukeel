import { modeAt } from "./modes";
import { DESTINATIONS } from "./nav";
import { WEEKDAY_LONG, type Weekday } from "./schedule";

/**
 * ONE GAME A DAY, THE SAME ONE EVERY WEEK.
 *
 * The brief asked for this and gave the reason in one line: "it becomes
 * predictable and also something to look forward to". Eleven rounds on a menu
 * is a decision to make before you can start; one on the home page with a
 * reason beside it is an invitation. Thursday is Match, always, and by the
 * third week that is a thing somebody knows about their own Thursdays.
 *
 * NOTHING IS HIDDEN BY THIS, which is the same distinction `lib/ux/nav.ts`
 * draws about `within`. Every round stays on `/practice`, in the command
 * palette and at its own URL, on every day of the week. What this table decides
 * is only what Today *leads with*, which is `lib/ux/disclosure.ts`'s kind of
 * question rather than this one's, asked a different way: that module decides
 * by how far in a learner is, this one by what day it is.
 *
 * THE TWO PUZZLES THAT ARE GENUINELY ONE A DAY GET THE DAYS THAT SUIT THEM.
 * Sõnad and Ristsõna build a new one each morning and are finished once you
 * have done it, so featuring them is a nudge rather than a limit. Sõnad opens
 * the week because it is three minutes; Ristsõna is Saturday because it is
 * fifteen and Saturday is the day somebody has fifteen. The other five days
 * carry a round that can be played again, so a Tuesday with ten spare minutes
 * is not a Tuesday that runs out.
 *
 * The `href` is a mode's own, resolved through `lib/ux/modes.ts`, so a round
 * renamed there is renamed here and an invariant fails on an href this table
 * names and that table does not have. One row is not a round: Situations is a
 * place in `lib/ux/nav.ts` rather than a mode, and it is on the table because
 * every other day was a recall or a speed round and the thing the purpose doc
 * leads with, a conversation with somebody who wants something from you, was
 * on no day of the week. `featuredTitle` resolves either.
 *
 * `why` carries more weight than it looks like it does, because Today's card
 * draws a title and this line and no subtitle. So when Ristsõna was renamed out
 * of English, this was the one screen the word "crossword" left entirely, and
 * the line says it now: somebody who has never met the word should not have to
 * press the button to find out what the puzzle is.
 *
 * Pure: a weekday in, a row out.
 */

export interface FeaturedGame {
  /** The mode, by its own href. `modeAt` in lib/ux/modes.ts resolves it. */
  href: string;
  /** Why this one today, in the learner's terms. One short line. */
  why: string;
}

/**
 * Sunday first, because that is what `Date.getUTCDay` returns and
 * `WEEKDAY_LONG` is already indexed that way. Reordering it to start on Monday
 * would mean two conventions in one directory.
 */
export const WEEK_GAMES: readonly FeaturedGame[] = [
  { href: "/quest", why: "A short round on whatever tripped you up this week." },
  { href: "/sonad", why: "A fresh word to guess every morning. Monday's a good day to start." },
  { href: "/review/target", why: "Four versions of one word, and only the ending tells you which to hit." },
  { href: "/situations", why: "Midweek, try a real conversation. Order a coffee, buy a bus ticket." },
  { href: "/review/match", why: "Pairs against the clock, and a personal best to beat." },
  { href: "/review/sprint", why: "It's Friday, so keep it short: a quick burst of endings on the clock." },
  { href: "/crossword", why: "The crossword, for a Saturday with time to spare." },
];

/**
 * THE SAME WEEK FOR SOMEBODY THE COURSE HAS NOT TAKEN TO THE CASES YET.
 *
 * The table above is a week for a learner with endings to practise, and four
 * of its rows are about endings or need them: the quest drills the weakest
 * case, Target and the sprint are "a quick burst of endings", and a
 * conversation needs the asking-and-offering words the course reaches at A2.
 * On a beginner's first Friday Today said "a quick burst of endings on the
 * clock" to somebody who had met five words and no case at all, which is the
 * app suggesting the one thing its own course has decided they are not ready
 * for. A1 teaches words and phrases and leaves the cases to A2 (CLAUDE.md, "A1
 * is vocabulary and phrases"), so until then the week is the rounds the
 * module itself deals at A1, plus Sõnad, which keeps its Monday, and an ear
 * test on Saturday where the full week has the crossword.
 *
 * Nothing is hidden by it, exactly as above: every round is still on
 * /practice. What changes is only what Today leads with.
 */
export const FIRST_LEVEL_WEEK: readonly FeaturedGame[] = [
  { href: "/review/flashcards", why: "A quiet round on the words you've met, typed from their meaning." },
  { href: "/sonad", why: "A fresh word to guess every morning. Monday's a good day to start." },
  { href: "/review/letters", why: "Unscramble a word you've met. Every letter has its place." },
  { href: "/review/listening", why: "Midweek, train your ear: hear a word and pick what it means." },
  { href: "/review/match", why: "Pairs against the clock, and a personal best to beat." },
  { href: "/review/speaking", why: "It's Friday: say this week's words out loud, then hear them said." },
  /* Not the crossword: it is filled from the dictionary at the learner's band,
     and a beginner two evenings in has met eleven words of it. Long or short
     needs no vocabulary at all, only an ear, which is the thing a first month
     is short of. */
  { href: "/review/pairs", why: "Long sound or short? A Saturday ear test, no words needed." },
];

/**
 * Which week a learner gets: the beginner's until their course reaches A2,
 * where the cases start, and the full one after. The level is the course's
 * own (`courseLevelFor`), which reads a learner nothing has placed as A1, and
 * a caller that passes none gets the full week.
 */
function weekFor(level?: string | null): readonly FeaturedGame[] {
  return level === "A1" || level === "pre-A1" ? FIRST_LEVEL_WEEK : WEEK_GAMES;
}

/**
 * What today's row is called, off the table that owns the name.
 *
 * A mode's title where the href is a mode, and a destination's label where
 * it is a place, so this table describes nothing itself and a rename in
 * either source reaches the card on Today.
 */
export function featuredTitle(href: string): string | undefined {
  return modeAt(href)?.title ?? DESTINATIONS.find((d) => d.href === href)?.label;
}

/** Today's, for a learner at this level. */
export function gameOn(weekday: Weekday, level?: string | null): FeaturedGame {
  const week = weekFor(level);
  return week[weekday] ?? week[0]!;
}

/** Tomorrow's, which is half of what makes a week have a shape. */
export function gameAfter(weekday: Weekday, level?: string | null): { game: FeaturedGame; weekday: string } {
  const next = ((weekday + 1) % 7) as Weekday;
  return { game: gameOn(next, level), weekday: WEEKDAY_LONG[next] ?? "" };
}
