/**
 * WHAT THE ROOM LOOKS LIKE, WHICH IS NOT THE SAME QUESTION AS WHAT IS SAID IN
 * IT.
 *
 * Fourteen conversations were fourteen identical screens. A health centre
 * reception, a phone call to a landlord, the counter of a small café and a job
 * interview all opened as the same white card with the same lead, and the only
 * thing that told them apart was the sentence you read. That is fine for a list
 * and poor for a place: somebody stepping into a room should be able to tell
 * which room it is before they have read a word of it.
 *
 * WHAT THIS TABLE MAY NOT DO IS COLOUR THEM IN. The five hues carry fixed
 * meanings and never drift (`docs/14-design-system.md` §1): mint is "you got
 * it", peach is "again", butter is "nearly", sky is "easy", and the cornflower
 * is the app's own voice. A table that handed the café mint and the pharmacy
 * peach would be spending the only colours in this app that mean something on
 * decoration, and it would do it on the one screen where a learner is about to
 * be told whether they were understood. So every scene is drawn in the accent
 * like everything else, and what tells them apart is a drawing and a movement.
 *
 * AN AMBIENCE RATHER THAN A PICTURE. There is no artwork here and there will
 * not be: a generated illustration is a licence question nobody on this project
 * can answer, and a file per scene is fourteen files before a conversation
 * stops repeating itself. What a place has instead is one small thing moving
 * the way that place moves. A queue advances a step at a time. A phone rings
 * out in circles. A journey travels. Steam comes off something hot. A room you
 * are being looked at in simply breathes. Five of those cover fourteen scenes
 * without any of them being a picture of anything, and a fifteenth scene picks
 * whichever one its own place already moves like.
 *
 * NO JSX AND NO ESTONIAN. It carries a lucide icon *name*, which
 * `components/icons.tsx` is the one place allowed to turn into a component, so
 * this stays a plain table a unit test can read without a DOM. And it holds no
 * Estonian at all, for the reason `lib/collections/topical.ts` holds none: a
 * word typed here would be this app writing Estonian onto a screen (ADR-005).
 *
 * No emoji either, which is not a style preference: `lib/copy/voice.ts` bans
 * the pictographic kind everywhere a reader can see one, and the only file
 * excused is the table of which word has a picture. A row of little pictures
 * across the top of a conversation is exactly the marketing register that ban
 * exists to keep off these screens.
 */

/** How the place moves. One of five, and a scene names one of them. */
export type Ambience =
  /** A queue that advances a step at a time: a desk, a counter, a window. */
  | "queue"
  /** Circles going out from the middle: a telephone, ringing. */
  | "ring"
  /** Something travelling from here to there: a journey, an errand, a walk. */
  | "travel"
  /** Warmth coming off something: a cup, a plate, a kitchen. */
  | "steam"
  /** A room that is simply breathing, because somebody in it is looking at you. */
  | "attend";

export interface Scenery {
  /** Resolved by `components/icons.tsx` and nowhere else. */
  readonly icon: string;
  readonly ambience: Ambience;
}

/*
  THERE IS NO LABEL HERE, AND THERE WAS.

  It said what kind of place this is in three or four words, for a reader who
  gets nothing from a drawing, which is the right instinct and was the wrong
  answer: every screen that prints the mark already prints the scene's own
  `place`, which is a sentence somebody wrote about that scene rather than a
  category name shared by four of them. So the drawing is decoration and
  `place` is what it means, and two lines came off the chooser and the briefing
  that were saying the same thing twice.
*/

/**
 * One row per scene, keyed on the scene's own id.
 *
 * Checked both ways in `scenery.test.ts`: every scene in the catalogue has a
 * row, and no row names a scene that is not there. A scene added without one
 * would open as the blank screen this table was written to replace, and it
 * would do it silently, which is the shape of failure this repository keeps
 * finding in its own tables.
 */
export const SCENERY: Readonly<Record<string, Scenery>> = {
  "arsti-aeg": { icon: "Stethoscope", ambience: "queue" },
  "uuri-remont": { icon: "House", ambience: "ring" },
  ametiasutus: { icon: "Stamp", ambience: "queue" },
  "poodi-piima": { icon: "ShoppingBag", ambience: "travel" },
  kohvikus: { icon: "Utensils", ambience: "steam" },
  "tee-kusimine": { icon: "Compass", ambience: "travel" },
  bussipilet: { icon: "Map", ambience: "travel" },
  "restoranis-tellimine": { icon: "Utensils", ambience: "steam" },
  helistamine: { icon: "MessagesSquare", ambience: "ring" },
  trepikoda: { icon: "Footprints", ambience: "travel" },
  apteek: { icon: "HeartPulse", ambience: "queue" },
  keeletund: { icon: "School", ambience: "attend" },
  toovestlus: { icon: "Briefcase", ambience: "attend" },
  kaebus: { icon: "ClipboardCheck", ambience: "queue" },
};

/**
 * The room, or a room.
 *
 * A scene with no row falls back rather than throwing, which is `icon()`'s own
 * argument one file over: a typo in a table should cost a screen its character
 * and never cost a learner their conversation. The test is what stops the
 * fallback becoming the answer.
 */
export function sceneryFor(sceneId: string): Scenery {
  return SCENERY[sceneId] ?? { icon: "MessagesSquare", ambience: "attend" };
}
