import { BUILD_FROM } from "@/lib/collections/levels";
import { LEVELS, type Level } from "@/lib/collections/syllabus/types";
import type { Tone } from "./nav";

/**
 * THE GAMES AREA: WHICH GAMES, IN WHICH GROUP, AND WHICH ONE LEADS TODAY.
 *
 * Practice and Games used to be one page, eight sections and some twenty
 * doors, reported as a page somebody landed on and did not know where to
 * press. The operator split it on 2026-10-18: Practice keeps the words fresh
 * and answers "what needs doing", Games answers "what feels fun", and each
 * page is one decision rather than two.
 *
 * Eleven games in three groups, by what somebody is in the mood for rather
 * than by what each one drills: a puzzle that is new every morning, something
 * quick and light to play as often as you like, and something tricky that
 * makes you work out how Estonian fits together. The group names are the
 * operator's, picked "for now", and the heading over each group is the same
 * word as its filter chip, which was asked for by name.
 *
 * Each tile's color is chosen here rather than taken from the round's icon,
 * so that no two tiles that touch share one at any width the board is laid out
 * at, which `games.test.ts` holds. In the icon table Laused and Mis edasi? are
 * both lavender and Väljendid and Sõnamäng both butter, which was two pairs of
 * twins side by side.
 *
 * Pure: what a game *is* lives in `lib/ux/modes.ts`, what it is called in
 * `lib/ux/roundNames.ts`, and what this learner has played is handed in.
 */

export type GroupId = "daily" | "play" | "think";

export interface GameGroup {
  id: GroupId;
  /** The group's name, on its filter chip and as the heading over it. */
  name: string;
  hint: string;
  tone: Tone;
}

export const GROUPS: readonly GameGroup[] = [
  { id: "daily", name: "Daily", hint: "A new puzzle every morning. Come back tomorrow for the next.", tone: "sky" },
  { id: "play", name: "Quick", hint: "Quick and light. Play as often as you like.", tone: "butter" },
  { id: "think", name: "Tricky", hint: "Work out how Estonian fits together.", tone: "accent" },
];

export interface Game {
  href: string;
  group: GroupId;
  tone: Tone;
  /** One line that makes somebody want to press it. */
  hook: string;
  /** Roughly how long a round takes. */
  minutes: number;
  /**
   * The level it opens at, where that is above A1. Shown as a locked tile
   * that says so rather than hidden, since knowing what is coming is part of
   * a reason to keep going.
   */
  from?: Level;
}

/** Board order inside each group, which is also the order the tiles are drawn in. */
export const GAMES: readonly Game[] = [
  { href: "/sonad", group: "daily", tone: "sky", hook: "Six letters, seven tries, one new word a day.", minutes: 3 },
  { href: "/crossword", group: "daily", tone: "butter", hook: "A fresh grid every morning, with the clues in English.", minutes: 15 },
  { href: "/review/match", group: "play", tone: "sky", hook: "Eight pairs against the clock. Beat your own best.", minutes: 2 },
  { href: "/review/letters", group: "play", tone: "accent", hook: "The letters are all there. Put them back in order.", minutes: 3 },
  { href: "/review/twenty", group: "play", tone: "blush", hook: "I'm thinking of something. Ask me in Estonian.", minutes: 10 },
  { href: "/review/sayings", group: "play", tone: "butter", hook: "Phrases that mean something other than they say.", minutes: 5 },
  { href: "/review/wordplay", group: "play", tone: "sky", hook: "A bat is a leather mouse. Take words apart and laugh.", minutes: 5 },
  { href: "/review/twins", group: "think", tone: "blush", hook: "Two words that look alike and mean different things.", minutes: 5 },
  { href: "/review/map", group: "think", tone: "sky", hook: "In the house, into it or out of it? The ending says.", minutes: 4 },
  /* Word order waits for the band the round itself waits for (`maySortWords`). */
  { href: "/review/sentences", group: "think", tone: "accent", hook: "Every word is right. The order isn't, yet.", minutes: 5, from: BUILD_FROM },
  /* The openers round answers an A1 learner with "from A2" on its own screen. */
  { href: "/review/openers", group: "think", tone: "butter", hook: "Hear how a sentence starts and see the ending coming.", minutes: 5, from: "A2" },
];

/** Whether a learner at this band can play it yet. */
export function opensFor(game: Game, level: Level): boolean {
  return !game.from || LEVELS.indexOf(level) >= LEVELS.indexOf(game.from);
}

/** A game's row, by its href. */
export function gameAt(href: string): Game | undefined {
  return GAMES.find((g) => g.href === href);
}

/**
 * TODAY'S GAME, BY WEEKDAY, AS AGREED ON 2026-10-18. Sunday first, which is
 * what `weekdayOf` in `lib/ux/schedule.ts` returns.
 *
 * The daily puzzles are left out of the full week, since they sit right under
 * the spotlight marked "New today" every morning; the spotlight's job is to
 * point at a game somebody would not open on their own, and each day has a
 * mood: a warm-up on Monday, a laugh on Friday, something longer at the
 * weekend. A1 has its own week of games an A1 learner can play, with the
 * daily puzzles back in because the choice is smaller.
 */
export const GAME_WEEK: readonly string[] = [
  "/review/sayings", // Sunday: a slow one, with the stories behind phrases
  "/review/match", // Monday: two minutes to warm up the week
  "/review/twins", // Tuesday: one tricky pair, sorted out for good
  "/review/sentences", // Wednesday: midweek, put real sentences back together
  "/review/map", // Thursday: the endings, made visual
  "/review/wordplay", // Friday: Friday is for laughing
  "/review/twenty", // Saturday: a weekend game with time to talk
];

export const A1_GAME_WEEK: readonly string[] = [
  "/review/sayings",
  "/review/match",
  "/review/letters",
  "/sonad",
  "/review/twins",
  "/review/wordplay",
  "/crossword",
];

export function weekFor(level: Level): readonly string[] {
  return GAMES.every((g) => opensFor(g, level)) ? GAME_WEEK : A1_GAME_WEEK;
}

/*
  WHAT THIS LEARNER HAS PLAYED, AND WHEN.

  A game round writes review rows like every other mode, and a `Review` row
  carries no note of which mode wrote it, so which games somebody has opened is
  a fact no log can reconstruct. It is one setting, like a personal best: each
  game's href and the last day it was played, space separated as `href@day`.
  Only a game on the board is kept, so a forged value can hold nothing else,
  and the last day is all anybody needs: "tried it" is having a day at all, and
  "played today" is that day being today.
*/

export type Played = ReadonlyMap<string, string>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The stored value, read. Anything that is not a game and a day is dropped. */
export function playedFrom(stored: string | null | undefined): Played {
  const out = new Map<string, string>();
  for (const entry of (stored ?? "").split(" ")) {
    const at = entry.lastIndexOf("@");
    if (at < 0) continue;
    const href = entry.slice(0, at);
    const day = entry.slice(at + 1);
    if (gameAt(href) && DAY.test(day)) out.set(href, day);
  }
  return out;
}

/** The value to store once `href` has been played on `day`, or null when it is not a game. */
export function withPlayed(stored: string | null | undefined, href: string, day: string): string | null {
  if (!gameAt(href) || !DAY.test(day)) return null;
  const played = new Map(playedFrom(stored));
  played.set(href, day);
  return [...played].map(([h, d]) => `${h}@${d}`).join(" ");
}

export interface Spotlight {
  game: Game;
  /** `new` where it is a game this learner has not opened yet, `week` where it is the day's own. */
  why: "new" | "week";
  /** The week's game for tomorrow, said where the spotlight is the week's. */
  tomorrow: Game | null;
}

/**
 * Which game leads the board today.
 *
 * Until somebody has tried every game they can play, the spotlight shows the
 * next one they have not, in the week's order from today, because finding out
 * what is here is the first thing worth doing. After that it is the day's own
 * game, and one already played today hands over to the next day's, so the top
 * of the board is never a game somebody has just finished. The daily puzzles
 * are not offered as new at A2 and above, for the reason the week leaves them
 * out: they already sit under the spotlight marked "New today".
 */
export function spotlight(weekday: number, level: Level, played: Played, today: string): Spotlight {
  const week = weekFor(level);
  const open = (href: string) => {
    const game = gameAt(href);
    return game && opensFor(game, level) ? game : undefined;
  };
  const rotated = [...week.slice(weekday), ...week.slice(0, weekday)];
  const rest = GAMES.filter((g) => !week.includes(g.href) && g.group !== "daily");
  const untried = [...rotated, ...rest.map((g) => g.href)].map(open).find((g) => g && !played.has(g.href));
  if (untried) return { game: untried, why: "new", tomorrow: null };

  const fresh = rotated.map(open).find((g) => g && played.get(g.href) !== today);
  const game = fresh ?? open(rotated[0]!) ?? GAMES[0]!;
  const tomorrow = fresh === open(rotated[0]!) ? open(rotated[1]!) ?? null : null;
  return { game, why: "week", tomorrow };
}
