/**
 * THE LADDER FROM B2 UP, PLANNED: B2.1 TO C1.3, SIX PARTS.
 *
 * A1, A2 and B1 are the lessons (`lib/course/lessons/`, docs/43-lessons.md),
 * eight, eight and seven parts, which come in front of these. This file is the judgment
 * for the rest. Everything else in `lib/course/` is machinery
 * that turns it into evenings, and the machinery has no opinions: it does not
 * choose a word, a round or a grammar page, it reads what is decided here and
 * what the syllabus already decided.
 *
 * WHAT IS DECIDED HERE, AND WHAT IS NOT.
 *
 * Not the words. `lib/collections/syllabus/` is the course, its units are in
 * teaching order and so are the words inside each one, and both were written
 * by somebody who knows the language. A program walks that order and slices
 * it into evenings. Every word of every unit from B2 up is in exactly one
 * evening of exactly one part, which is a stronger claim than a hand-picked
 * hundred, and it means nothing there is quietly unreachable through the short
 * way.
 *
 * Not the grammar page either. A unit already names the points it teaches, in
 * its own order, so an evening reads the next one on that list. `kus-ja-kuhu`
 * names six cases and takes three evenings, so it opens three different case
 * pages, which is what a class would do with it.
 *
 * What is decided here is the shape of the thing: where the parts break, how
 * many words an evening carries at each level, which rounds a level rotates
 * through, and which of the conversations belongs to which unit.
 *
 * THE ROUNDS ALTERNATE, AND THAT IS LOAD-BEARING. Each level's rotation runs
 * game, drill, game, drill, and an evening takes two neighbors off it, so
 * every evening has one of each and no two evenings running are the same pair.
 * A fortnight of drills is homework and a fortnight of games teaches nothing,
 * and the alternation is what keeps a hundred and eighty evenings from being
 * either. `course.test.ts` asserts it rather than trusting the lists below.
 *
 * A UNIT OF VERBS IS CONJUGATED. That is the one round pinned by what a unit
 * is made of rather than by where it falls, worked out from the unit's own
 * parts of speech: a unit that is mostly verbs gets the conjugation table,
 * because a verb you cannot put in the third person is a verb you cannot use.
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
    A1, A2 AND B1 ARE THE LESSONS NOW (docs/43-lessons.md §9 and §12), and
    their role-plays are the lessons' own conversations
    (`lib/scenes/lessonScenes.ts`). The catalog's conversations that used to
    open on a B1 unit are offered on the finish of the B1 lesson that
    rehearses them (`lib/course/lessonSituations.ts`), and the ones below
    declare units a learner has once B1's lessons are behind them
    (`unitsThrough`), so B2 is the first place the module opens one.
  */
  oigus: "kaebus",
  uhiskond: "bussipilet",
  tervishoid: "arsti-aeg",
  toomaailm: "toovestlus",
  akadeemiline: "keeletund",
  register: "uuri-remont",
  rahvusvaheline: "helistamine",
  /*
    THE THIRD BATCH'S SCENES (docs/38-third-batch.md, TB-10) from B2 on. Two
    moved off the unit the brief named, each because course.test.ts refused
    the placement, and each scene's own comment says why: `sobra-mure` is on
    `kunst` (its sorry beat needs `probleemid`), and `kuulsin` on
    `nominalisatsioon` (`kaudne` has one reading and the scene evening would
    take it).
  */
  teadus: "nadalavahetus",
  "des-vorm": "perearst",
  majandus: "tootukassa",
  umbisikuline: "elamisluba",
  ajalugu: "peretoetus",
  kunst: "sobra-mure",
  sonamoodustus: "palk",
  psuhholoogia: "tagatisraha",
  diskursus: "kolm-palvet",
  nominalisatsioon: "kuulsin",
  poliitika: "elanike-koosolek",
  statistika: "graafik",
  kirjandus: "raamatuklubi",
  argumenteerimine: "eksam-b2",
};

/**
 * THE EVERYDAY ERRANDS THAT USED TO OPEN ON AN A2 UNIT, ON A FREE EVENING OF
 * A B2 ONE.
 *
 * Eleven conversations of the catalog rehearsed A2's own errands, the shop,
 * the café, the pharmacy, the way to somewhere, and sat on the A2 units the
 * lessons replaced. Eight are offered on the finish of a B1 lesson now
 * (`lessonSituations.ts`); these go to the start of B2, on an evening of a unit that reads no page that night: a scene
 * evening shows no reading (`day()` in types.ts), so an evening that had none
 * to show loses nothing. The builder deals each, in order, on the unit's
 * earliest evening with no page left to read and before its last, which is
 * `SCENE_FOR_UNIT`'s (`build.ts`), and `course.test.ts` holds every one to
 * having landed.
 */
export const EARLIER_SCENES_FOR_UNIT: Readonly<Record<string, readonly string[]>> = {
  /*
    The other eight are offered by the B1 lessons that rehearse them
    (`lessonSituations.ts`). These three sit in B2, each where it is nearest
    home: the café among the society unit's people, the corner shop with the
    economy, and the emergency call with health.
  */
  uhiskond: ["kohvikus"],
  majandus: ["poodi-piima"],
  tervishoid: ["hadaabi"],
};

/**
 * AND WHY THE CATALOG'S CONVERSATIONS START AT B1, WHICH IS A FINDING RATHER
 * THAN AN OMISSION.
 *
 * Every scene in the catalog declares `korraldused` among the units it may
 * draw on, which is the unit for asking, telling and offering, and it is A2.
 * A1, A2 and B1 are the lessons, which teach by goal rather than unit by unit, so
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
 * The parts from B2 up. A1, A2 and B1 are the lessons (`lessonCourse.ts`).
 *
 * WHERE THE BREAKS FALL IS THE ONE THING ARITHMETIC COULD NOT DECIDE. A part
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
    A1, A2 AND B1 ARE THE LESSONS (docs/43-lessons.md), built by
    `lessonProgrammes` in `lessonCourse.ts`, and these parts start at B2. The
    builder's ledger is handed what the lessons taught before B2.1 is built
    (`teachLessons` in `build.ts`), so B2's first evening is dealt against the
    A1, A2 and B1 a learner actually had. B1's old parts (b1.1 to b1.3, built
    from the objekt to liitverbid units) went when B1 became lessons, with
    their day ids, which is the A2 precedent: a learner on one restarts B1 at
    its first lesson and keeps every card and review.
  */
  {
    id: "b2.1", level: "B2",
    title: "Kes seda ütles", subtitle: "Leaving out who did it, society, hearsay, the economy, and doing two things at once",
    blurb:
      "Estonian has three forms you learn here: one for when nobody is named, one for passing "
      + "on what you heard, and one for doing two things at once. Each comes with the words it "
      + "usually goes with: the impersonal with society, the reported form with the economy, and "
      + "the last on its own. By the end you can read a report that never names anybody.",
    units: ["umbisikuline", "uhiskond", "kaudne", "majandus", "des-vorm"],
  },
  {
    id: "b2.2", level: "B2",
    title: "Ajalugu ja sõnamoodustus", subtitle: "History, building new words, politics, health and science",
    blurb:
      "It opens on had done, the past before the past, learned on history, where you'll meet it "
      + "most. Then how to "
      + "work out a word you've never seen from one you already know, and three subjects to try "
      + "it on. By the end you can read an opinion piece on any of them without a dictionary "
      + "open.",
    units: ["ajalugu", "sonamoodustus", "poliitika", "tervishoid", "teadus"],
  },
  {
    id: "b2.3", level: "B2",
    title: "Kunst, töö ja argument", subtitle: "The arts, the law, the mind, working life, figures, and making a case",
    blurb:
      "The end of B2: the arts, making a proper complaint, describing how people behave, working in Estonian, reading a table of figures, and building an argument that concedes a point.",
    units: ["kunst", "oigus", "psuhholoogia", "toomaailm", "statistika", "argumenteerimine"],
  },

  {
    id: "c1.1", level: "C1",
    title: "Lause ja mõte", subtitle: "Saying more in fewer words, and long sentences that hold together",
    blurb:
      "C1 is about fitting into a phrase what B2 needed a whole clause for. You practice it on academic writing, research and philosophy, which is where you'll need it most.",
    units: ["nominalisatsioon", "lauseloome", "akadeemiline", "teadustoo", "filosoofia"],
  },
  {
    id: "c1.2", level: "C1",
    title: "Veenmine ja register", subtitle: "Ethics, persuasion, how formal to be, idioms, and holding a text together",
    blurb:
      "Knowing how formal to be and getting it right, winning over somebody who disagrees, and set phrases you learn whole.",
    units: ["eetika", "retoorika", "register", "idioomid", "diskursus"],
  },
  {
    id: "c1.3", level: "C1",
    title: "Maailm ja nüanss", subtitle: "New ideas, the wider world, literature, and words that almost mean the same",
    blurb:
      "The last part of the course. By the end you've met everything in it.",
    units: ["innovatsioon", "rahvusvaheline", "kirjandus", "nuansid"],
  },
];
