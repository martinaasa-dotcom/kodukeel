/**
 * WHERE EACH CONVERSATION HAPPENS, WHICH IS NOT THE SAME QUESTION AS WHAT IS
 * SAID IN IT.
 *
 * Fourteen conversations were fourteen identical screens. A health center
 * reception, a phone call to a landlord, the counter of a small café and a job
 * interview all opened as the same white card, and the only thing that told
 * them apart was the sentence you read. That is fine for a list and poor for a
 * place: somebody stepping into a room should be able to tell which room it is
 * before they have read a word of it.
 *
 * ONE SETTING PER PLACE, RATHER THAN ONE MOOD PER FIVE PLACES. The first
 * version of this table held five *ambiences* and shared them out: a pharmacy
 * and a health center were both "a counter with a queue", a bus station and a
 * street corner were both "a journey". That is a category, and a category is
 * what a learner already has in the scene's own title. What they do not have
 * is the room. So a setting is a room: a pharmacy has a cross and a bottle on
 * the counter, a bus station has a bus in it, a restaurant has a plate on the
 * table, a stairwell has stairs. Two scenes share a setting only where the room
 * really is the same one, which is the two that are somebody at home on the
 * phone.
 *
 * WHAT THIS TABLE MAY NOT DO IS COLOR THEM IN. The five hues carry fixed
 * meanings and never drift (`docs/14-design-system.md` §1): mint is "you got
 * it", peach is "again", butter is "nearly", sky is "easy", and the cornflower
 * is the app's own voice. A table that handed the café mint and the pharmacy
 * peach would be spending the only colors in this app that mean something on
 * decoration, and it would do it on the one screen where a learner is about to
 * be told whether they were understood. So every room is drawn in the ink, and
 * what tells them apart is what is in them.
 *
 * NOTHING IS A PICTURE OF ANYTHING AND NOTHING IS SHIPPED. There is no artwork
 * here and there will not be: a drawing per scene is a license question nobody
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
 * Checked both ways in `scenery.test.ts`: every scene in the catalog has a
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
  /*
    The shop `poodi-piima` walks into, opened in rather than moved to: this
    one starts at the rail and ends at the till, and both are the same room.
  */
  riidepood: { icon: "Shirt", setting: "shop" },
  "uus-kolleeg": { icon: "Users", setting: "meeting" },
  "abi-palumine": { icon: "HeartHandshake", setting: "street" },
  ootamine: { icon: "CloudSun", setting: "street" },
  kokkulepe: { icon: "CalendarCheck", setting: "home_phone" },
  turul: { icon: "Scale", setting: "shop" },
  bussipeatus: { icon: "Bus", setting: "street" },
  raamatukogu: { icon: "Library", setting: "office" },
  nadalavahetus: { icon: "Sunrise", setting: "meeting" },
  hadaabi: { icon: "LifeBuoy", setting: "home_phone" },
  pangas: { icon: "Landmark", setting: "office" },
  perearst: { icon: "Stethoscope", setting: "clinic" },
  tootukassa: { icon: "Briefcase", setting: "office" },
  elamisluba: { icon: "Stamp", setting: "office" },
  peretoetus: { icon: "MessageCircleQuestion", setting: "home_phone" },
  lastevanemad: { icon: "GraduationCap", setting: "classroom" },
  "tehniline-tugi": { icon: "MessageSquareWarning", setting: "home_phone" },
  koosolek: { icon: "MessagesSquare", setting: "meeting" },
  soovitus: { icon: "Camera", setting: "cafe" },
  "sobra-mure": { icon: "Heart", setting: "cafe" },
  palk: { icon: "TrendingUp", setting: "meeting" },
  tagatisraha: { icon: "KeyRound", setting: "home_phone" },
  "kolm-palvet": { icon: "MessagesSquare", setting: "cafe" },
  kuulsin: { icon: "Megaphone", setting: "stairwell" },
  "elanike-koosolek": { icon: "Users", setting: "meeting" },
  graafik: { icon: "TrendingUp", setting: "meeting" },
  raamatuklubi: { icon: "BookOpen", setting: "cafe" },
  "eksam-b1": { icon: "GraduationCap", setting: "meeting" },
  "eksam-b2": { icon: "Mic", setting: "meeting" },
  /*
    Today's chat is with a neighbor on the stairs, which is a room this app
    already draws (D17): the stairwell `trepikoda` opens in.
  */
  chat: { icon: "MessageCircle", setting: "stairwell" },
  // The lessons' own role-plays (`lib/scenes/lessonScenes.ts`) borrow the rooms their situations already have.
  "a1-kohvik": { icon: "Utensils", setting: "cafe" },
  "a1-tee": { icon: "Compass", setting: "street" },
  "a1-trepil": { icon: "Footprints", setting: "stairwell" },
  "a1-kursus": { icon: "School", setting: "classroom" },
  "a1-plaan": { icon: "MessagesSquare", setting: "home_phone" },
  "a1-mutsipood": { icon: "Shirt", setting: "shop" },
  "a1-nadal": { icon: "MessagesSquare", setting: "home_phone" },
  "a1-kutse": { icon: "Footprints", setting: "stairwell" },
  "a2-raamatukogu": { icon: "BookOpen", setting: "office" },
  "a2-linnas": { icon: "Compass", setting: "street" },
  "a2-suvi": { icon: "Sun", setting: "street" },
  "a2-arst": { icon: "Stethoscope", setting: "clinic" },
  "a2-piletikassa": { icon: "Bus", setting: "bus" },
  "a2-restoran": { icon: "Utensils", setting: "restaurant" },
  "a2-intervjuu": { icon: "Briefcase", setting: "office" },
  "a2-vana-sober": { icon: "MessagesSquare", setting: "street" },
  "b1-vaidlus": { icon: "Users", setting: "meeting" },
  "b1-uhistu": { icon: "Users", setting: "meeting" },
  "b1-palgatous": { icon: "Briefcase", setting: "meeting" },
  "b1-meister": { icon: "House", setting: "stairwell" },
  "b1-tagatis": { icon: "KeyRound", setting: "stairwell" },
  "b1-eksam": { icon: "GraduationCap", setting: "classroom" },
  "b2-ohtusook": { icon: "Utensils", setting: "restaurant" },
  "b1-kolleeg": { icon: "Briefcase", setting: "office" },
  "b2-teade": { icon: "MessagesSquare", setting: "home_phone" },
  "b2-lastevanemad": { icon: "GraduationCap", setting: "classroom" },
  "b2-perearst": { icon: "Stethoscope", setting: "home_phone" },
  "b2-koosolek": { icon: "Users", setting: "meeting" },
  "b2-ametikone": { icon: "Stamp", setting: "home_phone" },
  "b2-monoloog": { icon: "GraduationCap", setting: "classroom" },
  "b2-eksam": { icon: "GraduationCap", setting: "classroom" },
  "c1-nimepidu": { icon: "Heart", setting: "restaurant" },
  "c1-mysteerium": { icon: "Drama", setting: "restaurant" },
  "c1-pakkumine": { icon: "House", setting: "meeting" },
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
 * THE CONVERSATIONS THAT ARE A TELEPHONE CALL, WHICH CAN BE HAD HANDS-FREE.
 *
 * On a call nobody presses a button to speak: the other side finishes and it
 * is your turn. So in these, once the learner has pressed the microphone once,
 * it opens by itself after each of the other side's lines
 * (docs/41-fifth-batch.md, VB-4 call mode).
 *
 * Read off the room a conversation *opens* in, because a call stays a call
 * when the room moves: `poodi-piima` rings in a kitchen, walks into a shop and
 * walks home again, and the friend is on the line the whole way (the shop is
 * drawn with the phone at your ear for that reason). The same shop is an
 * ordinary counter in `riidepood`, so a room alone could not say which.
 */
const TELEPHONES: ReadonlySet<Setting> = new Set<Setting>(["home_phone"]);

export function isCall(sceneId: string): boolean {
  return TELEPHONES.has(sceneryFor(sceneId).setting);
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
 * question about a screen, and the catalog is the conversation.
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
  /* The stop, then the bus: the question about stops is asked of the driver. */
  bussipeatus: { stops: "bus" },
  /* The friend at the café, the manager at work, the official at a desk. */
  "kolm-palvet": { manager: "meeting", official: "office" },
};

/** The room a beat moves into, where it moves you at all. */
export function movesTo(sceneId: string, beatId: string | null): Setting | null {
  if (!beatId) return null;
  return MOVES[sceneId]?.[beatId] ?? null;
}

/**
 * WHAT HAS JUST COME UP, DRAWN.
 *
 * A curveball is the one thing in a conversation that arrives without being
 * asked for, and it arrived as English: a sentence describing what had
 * happened, above a question in Estonian. The learner reads the sentence,
 * works out what changed, and then answers. Somebody standing at a counter
 * does none of that, because they can see it: the person who started talking
 * over them is standing there, the queue behind them got longer, the form on
 * the counter is the thing being pointed at.
 *
 * So the room says it too. This is a *cue*, not an illustration of each of the
 * fourteen: four kinds, because four is what a drawing made of strokes can
 * carry without becoming a puzzle of its own, and because the fourteen really
 * do fall into four shapes. Somebody behind you, somebody beside them,
 * something on the counter, or the person themselves being the thing that
 * changed.
 *
 * It is never the only thing saying so. The objective in play still names the
 * way out in words, in the panel the learner types into, which is where
 * somebody looks when they are stuck; this is what tells them to look.
 */
export type Cue = "behind" | "another" | "paper" | "attention";

/**
 * One row per curveball, checked both ways in `scenery.test.ts`.
 *
 * Every curveball, including the silent one: `queue` never becomes a beat and
 * so never reaches the screen as a question, and a queue forming behind you is
 * the one of the fourteen that is *entirely* visual.
 *
 * Keyed on the curveball rather than on the beat it stands as, because the
 * beat is a thing inside the machine and never reaches a browser: the route
 * sends the curveball's own id, and `cueFor` says why.
 */
export const CUES: Readonly<Record<string, Cue>> = {
  /* Somebody behind you, which is pressure rather than a question. */
  queue: "behind",
  /* Somebody else with a claim on the person you are talking to. */
  interrupted: "another",
  /* The thing between you is the problem: a form, a price, a slot, a refusal. */
  "missing-document": "paper",
  "wrong-price": "paper",
  "slot-gone": "paper",
  "not-possible": "paper",
  "their-order": "paper",
  /* The person is what changed: how they heard you, how fast, which language,
     which pronoun, what they now say, or where they are sending you. */
  misheard: "attention",
  faster: "attention",
  english: "attention",
  "other-register": "attention",
  contradiction: "attention",
  "small-talk": "attention",
  "place-instruction": "attention",
};

/**
 * The cue for the curveball standing in the way.
 *
 * THE ID IS ASKED FOR RATHER THAN READ OFF THE BEAT, which was the first
 * version of this and was wrong on every one of the thirteen. A curveball does
 * become a beat of its own inside the machine (`hurdleBeat`), and the route
 * does not send that beat: `beatId` is the scene's own beat, which is the one
 * waiting behind the curveball, and only the *objective* comes off the one
 * standing in front of it. So a screen reading the beat saw a health center
 * asking for the next thing on the card while the panel underneath said "ask
 * them to slow down", and drew nothing at all. It was written, it typechecked,
 * the tables were complete and read both ways, and the one thing that found it
 * was playing a conversation on a hard setting until one fired.
 *
 * Nothing standing is most of a conversation, which is why this answers null
 * for a missing id rather than being called only where there is one.
 */
export function cueFor(curveball: string | null | undefined): Cue | null {
  return curveball ? CUES[curveball] ?? null : null;
}
