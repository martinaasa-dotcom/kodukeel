import { learnerDayClock } from "@/lib/progress/dayClock";
import { readSetting, readSettings, SETTING_KEYS, writeSetting } from "@/lib/settings/store";
import { playedFrom, withPlayed, type Played } from "@/lib/ux/games";

/**
 * Writes down that a game was played today, in the learner's own day.
 *
 * Called from a press on the Games board and from the two daily puzzles when
 * one is finished, never from a render: a page is fetched whenever a pointer
 * settles on a link to it, so a write on render would mark a game played for
 * somebody who only hovered over its tile. A game that is not on the board is
 * refused by `withPlayed`, so nothing a caller sends can grow the setting.
 */
export async function notePlayed(ownerId: string, href: string): Promise<boolean> {
  const [clock, stored] = await Promise.all([
    learnerDayClock(ownerId),
    readSetting(ownerId, SETTING_KEYS.gamesPlayed),
  ]);
  const today = clock.dayKey();
  if (playedFrom(stored).get(href) === today) return true;
  const next = withPlayed(stored, href, today);
  if (next === null) return false;
  await writeSetting(ownerId, SETTING_KEYS.gamesPlayed, next);
  return true;
}

/** What this learner has played, and the day it is for them, for the board. */
export async function playedToday(ownerId: string): Promise<{ played: Played; today: string }> {
  const [clock, settings] = await Promise.all([
    learnerDayClock(ownerId),
    readSettings(ownerId, [SETTING_KEYS.gamesPlayed]),
  ]);
  return { played: playedFrom(settings[SETTING_KEYS.gamesPlayed]), today: clock.dayKey() };
}
