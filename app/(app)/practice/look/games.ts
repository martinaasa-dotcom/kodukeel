import { modeAt } from "@/lib/ux/modes";
import { roundName } from "./names";

/**
 * THE GAMES AREA, AS PROPOSED, FOR THE MOCKUP UNDER `/practice/look/3`.
 *
 * MOCKUP. Three groups by what somebody is in the mood for (Daily, Quick and
 * Tricky on the chips, chosen by the operator for now), a name per game
 * that is English at A1 and Estonian with its English from A2, and a game of
 * the day drawn from games alone. None of this is wired into the real page
 * yet; the names and the groups are waiting on the operator.
 *
 * Every Estonian name is a dictionary word or a phrase already in the app,
 * and is for the native Estonian speaker who develops this app to read in the
 * pull request (ADR-005 amendment 4's standing, for copy).
 */

export type GroupId = "daily" | "play" | "think";

export interface LookGroup {
  id: GroupId;
  /** The group's name, on its filter chip and as the heading over it. */
  name: string;
  hint: string;
  tone: string;
}

export const GROUPS: readonly LookGroup[] = [
  { id: "daily", name: "Daily", hint: "A new puzzle every morning. Come back tomorrow for the next.", tone: "sky" },
  { id: "play", name: "Quick", hint: "Quick and light. Play as often as you like.", tone: "butter" },
  { id: "think", name: "Tricky", hint: "Work out how Estonian fits together.", tone: "accent" },
];

export interface LookGame {
  href: string;
  group: GroupId;
  /** The English name, which is the whole name at A1. */
  en: string;
  /** The Estonian name, which leads from A2. */
  et: string;
  icon: string;
  tone: string;
  hook: string;
  minutes: number;
  /** The level it opens at, where that is above A1. */
  from?: "A2";
  /** Something true about this learner's own round, where there is one. */
  live?: string;
}

/*
  Each tile's colour is chosen here rather than taken from the round's icon,
  so that no two tiles that touch share one, whether the board is laid out
  three or two across. In the icon table Laused and Mis edasi? are both
  lavender and Väljendid and Sõnamäng both butter, which is two pairs of twins
  side by side.
*/
const GAMES: readonly Omit<LookGame, "icon" | "en" | "et">[] = [
  { href: "/sonad", tone: "sky", group: "daily", hook: "Six letters, seven tries, one new word a day.", minutes: 3 },
  { href: "/crossword", tone: "butter", group: "daily", hook: "A fresh grid every morning, with the clues in English.", minutes: 15 },
  { href: "/review/match", tone: "sky", group: "play", hook: "Eight pairs against the clock. Beat your own best.", minutes: 2 },
  { href: "/review/letters", tone: "accent", group: "play", hook: "The letters are all there. Put them back in order.", minutes: 3 },
  { href: "/review/twenty", tone: "blush", group: "play", hook: "I'm thinking of something. Ask me in Estonian.", minutes: 10 },
  { href: "/review/sayings", tone: "butter", group: "play", hook: "Phrases that mean something other than they say.", minutes: 5 },
  { href: "/review/wordplay", tone: "sky", group: "play", hook: "A bat is a leather mouse. Take words apart and laugh.", minutes: 5 },
  { href: "/review/twins", tone: "blush", group: "think", hook: "Two words that look alike and mean different things.", minutes: 5 },
  { href: "/review/map", tone: "sky", group: "think", hook: "In the house, into it or out of it? The ending says.", minutes: 4 },
  { href: "/review/sentences", tone: "accent", group: "think", hook: "Every word is right. The order isn't, yet.", minutes: 5, from: "A2" },
  { href: "/review/openers", tone: "butter", group: "think", hook: "Hear how a sentence starts and see the ending coming.", minutes: 5, from: "A2" },
];

export function lookGames(live: Record<string, string | undefined> = {}): LookGame[] {
  return GAMES.map((g) => {
    const mode = modeAt(g.href);
    return { ...g, ...roundName(g.href), icon: mode?.icon ?? "Sparkles", live: live[g.href] };
  });
}

/**
 * Today's game, by weekday, as agreed on 2026-10-18.
 *
 * The daily puzzles are left out of the A2 week, since they sit right under
 * the spotlight marked "New today" every morning; the spotlight's job is to
 * point at a game somebody would not open on their own, and each day has a
 * mood: a warm-up on Monday, a laugh on Friday, something longer at the
 * weekend. A1 has its own week of games an A1 learner can play, with the
 * daily puzzles back in because the choice is smaller.
 *
 * In the real build two things sit in front of this table: until a learner
 * has tried every game, the spotlight shows the next one they have not, and a
 * game already played today hands the spotlight to the next day's.
 */
export const GAME_WEEK: readonly string[] = [
  "/review/sayings", // pühapäev: a slow Sunday with the stories behind phrases
  "/review/match", // esmaspäev: two minutes to warm up the week
  "/review/twins", // teisipäev: one tricky pair, sorted out for good
  "/review/sentences", // kolmapäev: midweek, put real sentences back together
  "/review/map", // neljapäev: the endings, made visual
  "/review/wordplay", // reede: Friday is for laughing
  "/review/twenty", // laupäev: a weekend game with time to talk
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

/** The weekday in English, and in Estonian, which the spotlight teaches. */
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const WEEKDAYS_ET = ["pühapäev", "esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev"] as const;

export const OPTIONS = [
  { n: 3, name: "Games", line: "Grouped by mood, with today's game on top." },
  { n: 4, name: "Practice", line: "Due now, your words, and the four skills." },
] as const;
