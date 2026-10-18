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

const GAMES: readonly Omit<LookGame, "icon" | "tone" | "en" | "et">[] = [
  { href: "/sonad", group: "daily", hook: "Six letters, seven tries, one new word a day.", minutes: 3 },
  { href: "/crossword", group: "daily", hook: "A fresh grid every morning, with the clues in English.", minutes: 15 },
  { href: "/review/match", group: "play", hook: "Eight pairs against the clock. Beat your own best.", minutes: 2 },
  { href: "/review/letters", group: "play", hook: "The letters are all there. Put them back in order.", minutes: 3 },
  { href: "/review/twenty", group: "play", hook: "I'm thinking of something. Ask me in Estonian.", minutes: 10 },
  { href: "/review/sayings", group: "play", hook: "Phrases that mean something other than they say.", minutes: 5 },
  { href: "/review/wordplay", group: "play", hook: "A bat is a leather mouse. Take words apart and laugh.", minutes: 5 },
  { href: "/review/twins", group: "think", hook: "Two words that look alike and mean different things.", minutes: 5 },
  { href: "/review/map", group: "think", hook: "In the house, into it or out of it? The ending says.", minutes: 4 },
  { href: "/review/sentences", group: "think", hook: "Every word is right. The order isn't, yet.", minutes: 5, from: "A2" },
  { href: "/review/openers", group: "think", hook: "Hear how a sentence starts and see the ending coming.", minutes: 5, from: "A2" },
];

export function lookGames(live: Record<string, string | undefined> = {}): LookGame[] {
  return GAMES.map((g) => {
    const mode = modeAt(g.href);
    return { ...g, ...roundName(g.href), icon: mode?.icon ?? "Sparkles", tone: mode?.tone ?? "accent", live: live[g.href] };
  });
}

/**
 * Today's game, by weekday, from the games alone.
 *
 * The week table on Today (`lib/ux/weekGames.ts`) mixes in rounds that are
 * practice rather than play (the quest, flash cards, a conversation). The
 * Games page leads with a game, so its week is its own: Sõnad opens the week
 * and the crossword has the Saturday, as they do on Today.
 */
export const GAME_WEEK: readonly string[] = [
  "/review/twenty", // Sunday
  "/sonad",
  "/review/match",
  "/review/map",
  "/review/twins",
  "/review/sayings",
  "/crossword",
];

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const OPTIONS = [
  { n: 3, name: "Games", line: "Grouped by mood, with today's game on top." },
  { n: 4, name: "Practice", line: "Due now, your words, and the four skills." },
] as const;
