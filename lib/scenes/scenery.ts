/**
 * WHERE EACH CONVERSATION HAPPENS, WHICH IS NOT THE SAME QUESTION AS WHAT IS
 * SAID IN IT.
 *
 * Fourteen conversations were fourteen identical screens. A health centre
 * reception, a phone call to a landlord, the counter of a small café and a job
 * interview all opened as the same white card, and the only thing that told
 * them apart was the sentence you read. That is fine for a list and poor for a
 * place: somebody stepping into a room should be able to tell which room it is
 * before they have read a word of it.
 *
 * ONE SETTING PER PLACE, RATHER THAN ONE MOOD PER FIVE PLACES. The first
 * version of this table held five *ambiences* and shared them out: a pharmacy
 * and a health centre were both "a counter with a queue", a bus station and a
 * street corner were both "a journey". That is a category, and a category is
 * what a learner already has in the scene's own title. What they do not have
 * is the room. So a setting is a room: a pharmacy has a cross and a bottle on
 * the counter, a bus station has a bus in it, a restaurant has a plate on the
 * table, a stairwell has stairs. Two scenes share a setting only where the room
 * really is the same one, which is the two that are somebody at home on the
 * phone.
 *
 * WHAT THIS TABLE MAY NOT DO IS COLOUR THEM IN. The five hues carry fixed
 * meanings and never drift (`docs/14-design-system.md` §1): mint is "you got
 * it", peach is "again", butter is "nearly", sky is "easy", and the cornflower
 * is the app's own voice. A table that handed the café mint and the pharmacy
 * peach would be spending the only colours in this app that mean something on
 * decoration, and it would do it on the one screen where a learner is about to
 * be told whether they were understood. So every room is drawn in the ink, and
 * what tells them apart is what is in them.
 *
 * NOTHING IS A PICTURE OF ANYTHING AND NOTHING IS SHIPPED. There is no artwork
 * here and there will not be: a drawing per scene is a licence question nobody
 * on this project can answer and a file per scene to carry. Every room in
 * `components/scene/SceneVignette.tsx` is strokes in an SVG, built out of the
 * same handful of parts, so a fifteenth scene costs a row here and no file at
 * all.
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

/**
 * The room, as a place rather than as a mood.
 *
 * Every one of these is drawn in `components/scene/SceneVignette.tsx`, and an
 * invariant fails on a setting that has no drawing: a room added here with
 * nothing drawn for it would fall through to a default, which is the blank
 * screen this table was written to replace, arriving silently.
 */
export type Setting =
  /** A reception desk with chairs to wait in. */
  | "clinic"
  /** A counter with a cross over it and a queue behind you. */
  | "pharmacy"
  /** A counter, and paperwork on it. */
  | "office"
  /** A counter with something hot on it. */
  | "cafe"
  /** A table with a plate on it, and somebody taking the order. */
  | "restaurant"
  /** Shelves, and you inside them with a phone to your ear. */
  | "shop"
  /** A counter with a parcel on it, which is where things go back. */
  | "returns"
  /** A bus, and the window you buy the ticket at. */
  | "bus"
  /** A street, a lamp post, and somebody who lives here. */
  | "street"
  /** The stairs in your own building. */
  | "stairwell"
  /** On your way somewhere, with the phone still to your ear. */
  | "walking"
  /** A board on the wall and somebody teaching in front of it. */
  | "classroom"
  /** A table, and somebody across it deciding about you. */
  | "meeting"
  /** Your own place, and somebody on the other end of a line. */
  | "home_phone";

export interface Scenery {
  /** Resolved by `components/icons.tsx` and nowhere else. */
  readonly icon: string;
  readonly setting: Setting;
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
  "arsti-aeg": { icon: "Stethoscope", setting: "clinic" },
  "uuri-remont": { icon: "House", setting: "home_phone" },
  ametiasutus: { icon: "Stamp", setting: "office" },
  /*
    It opens in your own kitchen, which is where the friend rings: the shop is
    two beats away and `MOVES` is what takes you there. A scene set in the room
    it ends in draws that room over the beats before anybody has left the house.
  */
  "poodi-piima": { icon: "ShoppingBag", setting: "home_phone" },
  kohvikus: { icon: "Utensils", setting: "cafe" },
  "tee-kusimine": { icon: "Compass", setting: "street" },
  bussipilet: { icon: "Map", setting: "bus" },
  "restoranis-tellimine": { icon: "Utensils", setting: "restaurant" },
  helistamine: { icon: "MessagesSquare", setting: "home_phone" },
  trepikoda: { icon: "Footprints", setting: "stairwell" },
  apteek: { icon: "HeartPulse", setting: "pharmacy" },
  keeletund: { icon: "School", setting: "classroom" },
  toovestlus: { icon: "Briefcase", setting: "meeting" },
  kaebus: { icon: "ClipboardCheck", setting: "returns" },
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
  return SCENERY[sceneId] ?? { icon: "MessagesSquare", setting: "meeting" };
}

/**
 * WHERE A SCENE MOVES YOU TO, WHICH IS THE HALF A SINGLE SETTING CANNOT SAY.
 *
 * `BeatSpec.meanwhile` is one line of English about time passing, and for one
 * scene it is not only time: `poodi-piima` opens in your own kitchen with a
 * friend ringing, walks you to the corner shop, and walks you home again. A
 * scene with one setting draws the shop for the whole of it, including the two
 * beats before anybody has left the house.
 *
 * So the row above is where a scene *opens*, and this is where a beat takes
 * you. It is keyed on the beat rather than named in `lib/scenes/catalogue.ts`
 * for the reason the icon is not in there either: which room is drawn is a
 * question about a screen, and the catalogue is the conversation.
 *
 * What it buys is the cover between the two (`components/scene/SceneInterlude.tsx`):
 * the room you were in goes, the room you are in arrives, and the sentence
 * saying so is between them. A `meanwhile` that does not move you keeps its
 * room and gets the clock instead, which is the honest drawing of twenty
 * minutes in a queue at the same desk.
 *
 * A room reached only this way is still a room somebody is in, so
 * `scenery.test.ts` counts these as used: the shop is drawn for half of
 * `poodi-piima` and is the opening setting of nothing.
 */
export const MOVES: Readonly<Record<string, Readonly<Record<string, Setting>>>> = {
  "poodi-piima": { inside: "shop", back: "walking" },
};

/** The room a beat moves into, where it moves you at all. */
export function movesTo(sceneId: string, beatId: string | null): Setting | null {
  if (!beatId) return null;
  return MOVES[sceneId]?.[beatId] ?? null;
}
