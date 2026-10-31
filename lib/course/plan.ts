/**
 * THE LADDER BUILT FROM UNITS, WITH NO PART LEFT TO BUILD.
 *
 * Every level from A1 to C1 is lessons now (`lib/course/lessons/`,
 * docs/43-lessons.md §9, §12, §14 and §16): eight, eight, seven, eight and
 * eight parts. C1 was the last level built from units, and its three parts
 * (c1.1 to c1.3) went with their day ids the day its forty-nine lessons
 * replaced them, so `PARTS` below is empty and the builder in `build.ts`
 * builds nothing from it.
 *
 * What is left here is what the unit builder still reads until it is removed
 * in its own pull request a week after the move (docs/43-lessons.md §15.13,
 * C1-9): the rotations, `SCENE_FOR_UNIT` (empty: the six catalog
 * conversations C1's units opened are offered on the finish of a C1 lesson,
 * `lessonSituations.ts`) and `EARLIER_SCENES_FOR_UNIT` (empty since B2 moved).
 * The pure-function tests of the builder ask them until then.
 *
 * What a part built from units was is still written down below: where the
 * breaks fell, how many words an evening carried, which rounds rotated and
 * which conversation sat on which unit. THE ROUNDS ALTERNATED, a game and a
 * drill, so every evening had one of each and no two evenings running were
 * the same pair, and A UNIT OF VERBS WAS CONJUGATED: a unit that is mostly
 * verbs got the conjugation table. `course.test.ts` asserts the rotations
 * while they last.
 */

import type { ActivityKey } from "./types";

/** The share of a unit's words that have to be verbs before it is conjugated. */
export const VERB_HEAVY = 0.5;

/**
 * The rounds each level rotates through, alternating a game and a drill.
 *
 * They get harder down the file rather than merely different: from B1 the
 * rotation carries writing a sentence of your own and verb government, which
 * are the two things that stop being optional there, and the game slot the
 * picture board used to fill is Tähed, which scrambles the level's own longer
 * words. A1 has none, since it is the lessons, and A2's is dealt on no evening.
 */
export const ROTATION: Record<string, readonly ActivityKey[]> = {
  /*
    A1 HAS NO ROTATION: it is the lessons (`lessonCourse.ts`), and a lesson
    is its own six steps, practice and speaking included, rather than an
    evening of two rounds. A2 is the lessons as well (below).
  */
  /*
    AND SÕNAD IS ON NONE OF THEM. Its word is dealt off the dictionary at the
    learner's band by design, and `recordSonad` rebuilds the day's puzzle from
    the date and the level on the server to grade it, so there is no honest
    way to hold it to what the module has taught: a scoped board would be
    marked against a different word. It stays the game of the day and on
    Practice, where a learner chooses it. Tähed takes its slot, on the
    level's own words.

    Every other round on these lists is dealt only once `supportsRound` in
    `build.ts` says the evenings before have taught what it needs, a case page
    for a case round, a sentence of taught words for dictation and ordering,
    the government page and a few governed verbs for government; and each
    reads the same ledger back off the step's address and narrows to it.
  */
  /*
    THE CASE SPRINT AND TARGET ARE OUT OF THE APP, AND THE GAME SLOTS THEY
    HELD ARE THE SENTENCE BUILDER'S. The operator called both bad games and had
    them removed everywhere. Building a sentence is a game in the sense this
    table means (something to play rather than something to be marked on), so
    it takes the second game slot, and each list is the three games and three
    drills there are to deal. "Say what you see" is not on any of them: it
    asks for five sentences about a picture, which is its own sitting of eight
    minutes or so and not a step of a fifteen-minute evening, so it stays on
    Practice and in the palette.
  */
  /*
    AND FROM A2 THE WORKBOOK TAKES THE FLASH ROUND'S SLOT. A course book's
    exercise is the drill every class sets as homework: a page of real
    sentences with a word in brackets in each, and the form it needs written
    on the line (`lib/games/workbook.ts`). It asks the same thing the flash
    round's gap asked, a form because a sentence needs it, eight times over on
    one subject rather than once a word, and on a case evening that subject
    is today's case, which is what `CASE_ROUNDS` in `build.ts` deals it for.
    The flash round stays A1's drill, where no case is asked, and stays on
    Practice for everybody.
  */
  /*
    AND A2'S SECOND DRILL IS NUMBERS SAID OUT LOUD (docs/41-fifth-batch.md,
    VB-7), WHERE WRITING A SENTENCE OF YOUR OWN USED TO BE.

    A2 is where the counters start: the shop, the ticket window, the doctor's
    desk, every one of them asking for a price, a time or how many. A rotation
    alternates a game and a drill and holds no round twice, and A2 has three
    games to deal, so a fourth drill was not on offer and one had to make room.
    Writing goes, because this file's own header says B1 is where writing a
    sentence of your own stops being optional, and B1 to C1 carry it still;
    A2's case evenings keep the workbook, which is the case round they swap
    to. The round is dealt once the evenings have taught enough number words
    for a round of ten (`supportsRound`), and inside the module it waits for
    `kell` before a clock and `euro` before a price.
  */
  /*
    A2 IS THE LESSONS TOO NOW (docs/43-lessons.md §9), so the module deals
    this list on no evening. It stays as the rotation `rounds` falls back to
    for a level with none of its own, and dictation and numbers stay on
    Practice, where a learner chooses them.
  */
  A2: ["match", "dictation", "letters", "numbers", "sentences", "workbook"],
  B1: ["letters", "write", "sentences", "government", "match", "workbook"],
  B2: ["letters", "write", "match", "government", "sentences", "workbook"],
  C1: ["letters", "write", "match", "exceptions", "sentences", "workbook"],
};

/**
 * AND THE CROSSWORD IS NOT ON ANY OF THEM, WHICH IS ABOUT THE CLOCK.
 *
 * A seven-word grid is a quarter of an hour on its own, and an evening here is
 * a quarter of an hour in total. It stays exactly where it was, on Practice,
 * in the command palette and as Saturday's game of the day in
 * `lib/ux/weekGames.ts`, which is the right home for the one round that is a
 * sitting rather than a step.
 */

/**
 * Which conversation belongs to which unit, on the last evening of it.
 *
 * Every one the app has (`SCENES`), each on the unit whose words it needs and
 * none before the words exist, and seven of them a second time a level up (below). A scene declares the units it may draw on, and
 * `course.test.ts` checks that every unit it declares has been taught by the
 * time the program opens it, which is the whole of what makes a conversation
 * at this point fair rather than a wall.
 *
 * A unit with no entry has no conversation, which is most of them: a scene
 * every few evenings rather than every evening, which is the right rhythm for
 * the one step that takes six minutes and some nerve. `course.test.ts` holds
 * every scene in the catalog to an entry here, so the count is the table's.
 */
export const SCENE_FOR_UNIT: Record<string, string> = {
  /*
    EVERY LEVEL IS LESSONS NOW (docs/43-lessons.md §16), and their role-plays
    are the lessons' own conversations (`lib/scenes/lessonScenes.ts`). The six
    catalog conversations that opened on a C1 unit (keeletund on akadeemiline,
    uuri-remont on register, helistamine on rahvusvaheline, kolm-palvet on
    diskursus, kuulsin on nominalisatsioon, raamatuklubi on kirjandus) are
    offered on the finish of the lesson that rehearses them
    (`lib/course/lessonSituations.ts`), as B1's and B2's were. No unit opens one.
  */
};

/**
 * THE EVERYDAY ERRANDS THAT USED TO OPEN ON AN A2 UNIT, ON A FREE EVENING OF
 * A UNIT FURTHER ON.
 *
 * Eleven conversations of the catalog rehearsed A2's own errands, the shop,
 * the café, the pharmacy, the way to somewhere, and sat on the A2 units the
 * lessons replaced. Eight are offered on the finish of a B1 lesson
 * (`lessonSituations.ts`), and the last three, which sat on free evenings of
 * B2's units, on the finish of a B2 lesson since B2 became lessons: the café
 * where somebody switches to English, the corner shop that is said to be
 * closing, and the emergency call on the night at the emergency department.
 * So no unit carries one today. The table stays for the next errand that
 * needs a free evening: the builder deals each, in order, on the unit's
 * earliest evening with no page left to read and before its last, which is
 * `SCENE_FOR_UNIT`'s (`build.ts`), since a scene evening shows no reading
 * (`day()` in types.ts), and `course.test.ts` holds every one to having landed.
 */
export const EARLIER_SCENES_FOR_UNIT: Readonly<Record<string, readonly string[]>> = {};

/**
 * AND WHY THE CATALOG'S CONVERSATIONS START AT B1, WHICH IS A FINDING RATHER
 * THAN AN OMISSION.
 *
 * Every scene in the catalog declares `korraldused` among the units it may
 * draw on, which is the unit for asking, telling and offering, and it is A2.
 * Every level is the lessons, which teach by goal rather than unit by unit, so
 * no unit of theirs counts as taught until the level's lessons are behind a
 * learner (`unitsThrough`), and `course.test.ts` asks the question
 * mechanically: a scene is opened only once every unit it declares has been
 * taught.
 *
 * A1 and A2 are not left without conversations. Every part of the lessons
 * ends on a role-play played live, held to what the lessons have taught
 * (`lib/scenes/lessonScenes.ts`): A2 has eight, the library desk, meeting in
 * town, the summer, the doctor, the ticket window, a restaurant, a job
 * interview and an old friend.
 */

/** One part of a level: a stretch of units, worked in order. */
export interface PartSpec {
  id: string;
  level: string;
  /** Estonian, like a unit's title. */
  title: string;
  /** English, so the title is never what blocks somebody. */
  subtitle: string;
  /** One paragraph on what finishing it means, shown once before it starts. */
  blurb: string;
  /** Unit ids, in the order the part works them. */
  units: readonly string[];
}

/**
 * The parts built from units, none since C1 became lessons (`lessonCourse.ts`).
 *
 * WHERE THE BREAKS FELL WAS THE ONE THING ARITHMETIC COULD NOT DECIDE. A part
 * is two to three weeks of fifteen-minute evenings, which is short enough to
 * see the end of from the first night and long enough to be worth finishing,
 * and every break lands between two units rather than inside one. They land on
 * a change of subject as well: B2.1 ends on word-building and B2.2 opens on
 * society.
 *
 * HOW MANY EVENINGS A PART TAKES IS NOT WRITTEN DOWN HERE, and that is
 * deliberate: it falls out of how many words its units hold and how long a
 * word takes to meet at that level, so a number typed into a blurb would be a
 * second answer waiting to go stale. Every screen that says how long a part is
 * counts its days.
 */
export const PARTS: readonly PartSpec[] = [
  /*
    EMPTY: EVERY LEVEL IS LESSONS (docs/43-lessons.md), built by
    `lessonProgrammes` in `lessonCourse.ts`. C1's old parts (c1.1 to c1.3,
    built from the nominalisatsioon to nuansid units) went when C1 became
    lessons, with their day ids, which is the A2, B1 and B2 precedent: a
    learner on one restarts C1 at its first lesson and keeps every card and
    review. The lesson parts reuse the old ids c1.1 to c1.3, so that restart is
    worked out off the learner's own ticks (`rehomed` in
    `lib/progress/course.ts`, held by `rehome.itest.ts`).
  */
];
