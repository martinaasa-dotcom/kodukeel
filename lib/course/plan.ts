/**
 * THE WHOLE LADDER, PLANNED: A1.1 TO C1.3, EIGHTEEN PARTS.
 *
 * This file is the judgement. Everything else in `lib/course/` is machinery
 * that turns it into evenings, and the machinery has no opinions: it does not
 * choose a word, a round or a grammar page, it reads what is decided here and
 * what the syllabus already decided.
 *
 * WHAT IS DECIDED HERE, AND WHAT IS NOT.
 *
 * Not the words. `lib/collections/syllabus/` is the course, its units are in
 * teaching order and so are the words inside each one, and both were written
 * by somebody who knows the language. A programme walks that order and slices
 * it into evenings. Every word of all 82 units is in exactly one evening of
 * exactly one part, which is a stronger claim than a hand-picked hundred, and
 * it means nothing in the course is quietly unreachable through the short way.
 *
 * Not the grammar page either. A unit already names the points it teaches, in
 * its own order, so an evening reads the next one on that list. `kus-ja-kuhu`
 * names six cases and takes three evenings, so it opens three different case
 * pages, which is what a class would do with it.
 *
 * What is decided here is the shape of the thing: where the parts break, how
 * many words an evening carries at each level, which rounds a level rotates
 * through, and which of the fifteen conversations belongs to which unit.
 *
 * THE ROUNDS ALTERNATE, AND THAT IS LOAD-BEARING. Each level's rotation runs
 * game, drill, game, drill, and an evening takes two neighbours off it, so
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
 * They get harder down the file rather than merely different. A1 spends its
 * drills on hearing and spelling, which is where a beginner's difficulty
 * actually is; from B1 the rotation carries writing a sentence of your own and
 * verb government, which are the two things that stop being optional there;
 * and above A1 the game slot the picture board used to fill is Tähed, which
 * scrambles the level's own longer words.
 */
export const ROTATION: Record<string, readonly ActivityKey[]> = {
  /*
    A1 IS SIX ROUNDS, AND EVERY ONE OF THEM IS PLAYED ON THE WORDS THE MODULE
    HAS TAUGHT AND NOTHING ELSE.

    It was ten, and the second evening of the module was measured at forty
    minutes against a promise of sixteen. Eight of the ten put something in
    front of a beginner that nobody had taught them: Sõnad deals a word off
    the dictionary, and dealt an A2 verb on the second evening; the picture board
    asks for a case; dictation and
    speaking put a whole attested sentence up, which at A1 is a sentence made
    of words further up the course (`npm run audit:readable`). None of that is
    a fault in the round. Each is the right round for somebody who opened it
    from Practice and the wrong one for somebody the module sent there with
    eleven words.

    What is left is what a beginner's own words can carry: Match and
    Listening ask the words back as meanings; the conjugation table asks the
    verbs in its matching shape. Each of the four reads the module's
    own taught list off the address it was opened from
    (`lib/course/scope.ts`), so the words on the board are the words met. And
    a round is scheduled only once the words behind it exist: `rounds()` in
    `build.ts` swaps the table for Listening until a verb has been taught and
    Tähed for Match until four spellable words have, which is why the first
    evenings can be the same pair and `course.test.ts` allows exactly that.

    AND THEN IT WAS FOUR, AND THE EVENINGS WERE REPORTED AS THE SAME EVENING.
    Match and Listening are what a handful of words can carry and both ask
    the words back as meanings, so most of A1 was the one pair with a table
    on the verb units, and A1 is where people give up. Tähed is the game the
    words can carry from the first evening: the letters of a taught word,
    scrambled, put back in order (`lib/games/letters.ts`), which is the one
    thing about Estonian a beginner has to notice before anything else. And
    the flash round is the drill beside it, held inside the module to the
    taught words, the taught verb pages and nothing else (`slotWithin`), so at
    A1 it is the word typed from its meaning and, once the present tense has
    been read, a person of a verb. Three pairs rather than one, walked two an
    evening, so a fortnight of A1 is not the same fortnight three times.

    Sõnad and the rest stay on Practice, in the palette and as the
    game of the day, where a learner chooses them.

    AND THE PICTURE BOARD WENT, WHICH LEFT A1 WITH TWO GAMES. The operator
    called it pointless and took it out of the app: matching an emoji to a
    word the learner met an hour ago asks nothing Match does not already ask,
    and it drew the evening's game slot on one night in three. Two games
    alternating with two drills is four rounds, so the drills are Listening
    and the flash round; the conjugation table still comes on the evenings a
    unit of verbs pins it (`rounds()`'s `table`), which is where a beginner
    meets a verb, and Listening stands in for it until one has been taught.
  */
  A1: ["match", "listening", "letters", "flash"],
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
  A2: ["match", "dictation", "letters", "write", "sentences", "flash"],
  B1: ["letters", "write", "sentences", "government", "match", "flash"],
  B2: ["letters", "write", "match", "government", "sentences", "flash"],
  C1: ["letters", "write", "match", "exceptions", "sentences", "flash"],
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
 * All fifteen the app has, each on the unit whose words it needs and none
 * before the words exist, and seven of them a second time a level up (below). A scene declares the units it may draw on, and
 * `course.test.ts` checks that every unit it declares has been taught by the
 * time the programme opens it, which is the whole of what makes a conversation
 * at this point fair rather than a wall.
 *
 * A unit with no entry has no conversation, which is most of them: fifteen
 * scenes over a hundred and eighty evenings is roughly one a fortnight, and
 * that is the right rhythm for the one step that takes six minutes and some
 * nerve.
 */
export const SCENE_FOR_UNIT: Record<string, string> = {
  korraldused: "poodi-piima",
  minevik: "trepikoda",
  "kool-ja-keel": "keeletund",
  reisimine: "bussipilet",
  "linn-ja-teenused": "tee-kusimine",
  restoranis: "kohvikus",
  kirjeldamine: "restoranis-tellimine",
  plaanid: "arsti-aeg",
  suhtlemine: "helistamine",
  tunded: "apteek",
  haridus: "toovestlus",
  eluase: "uuri-remont",
  probleemid: "ametiasutus",
  oigus: "kaebus",
  /*
    The clothes shop rehearses `riided`, which is A1, and is dealt here
    because no conversation can open before `korraldused`: every scene
    declares it, and it is what makes asking for anything possible. This is
    the first free evening after it that is not already carrying one.
  */
  "vaba-aeg": "riidepood",
  /*
    AND B1, B2 AND C1 COME BACK TO SEVEN OF THEM, because the fifteen thin
    out above A2 and C1 used to go six weeks without a single conversation,
    in a course whose whole point is the conversation somebody has outside
    it. Nothing about the scene changes and everything about the run does: a
    run is pitched at the learner's own level (`lib/scenes/pitch.ts`), so the
    clerk who asked a beginner one short question at a time talks to a C1
    speaker the way they would to anybody, and the learner has a year of
    words to answer with. Each sits on the unit closest to what it rehearses,
    and the step says it is a second time (`DaySpec.sceneAgain`).
  */
  inimsuhted: "trepikoda",
  uhiskond: "bussipilet",
  tervishoid: "arsti-aeg",
  toomaailm: "toovestlus",
  akadeemiline: "keeletund",
  register: "uuri-remont",
  rahvusvaheline: "helistamine",
};

/**
 * AND WHY THERE IS NO CONVERSATION IN THE WHOLE OF A1, WHICH IS A FINDING
 * RATHER THAN AN OMISSION.
 *
 * Every one of the fifteen scenes declares `korraldused` among the units it
 * may draw on, which is the unit for asking, telling and offering, and it sits
 * in A2. That is not a mistake in the scenes: you cannot ask anybody for
 * anything without it, so a conversation before it is a conversation the
 * learner can only answer in single words. It was found by asking the question
 * mechanically rather than by reading, and `course.test.ts` is where the
 * question lives: a scene is opened only once every unit it declares has been
 * taught, checked over the whole ladder in order.
 *
 * What it changed is where A2 starts. `korraldused` used to sit near the end
 * of A2 and now opens it, because it is the unit that makes a conversation
 * possible and everything after it is better for having it. Ten of the
 * fifteen scenes fall inside A2 as a result, which is the right shape: A1 is
 * where you get the words, A2 is where you start using them on people.
 *
 * A1 is not left without anything to enjoy. Every A1 evening carries a game
 * off the rotation, which at that level is Match and Tähed, and those need no vocabulary the evening has not just
 * taught. It is the conversations that need a fortnight of function words
 * first, and pretending otherwise would be the false confidence the readiness
 * screen is built against.
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
 * The eighteen parts.
 *
 * WHERE THE BREAKS FALL IS THE ONE THING ARITHMETIC COULD NOT DECIDE. A part
 * is two to three weeks of fifteen-minute evenings, which is short enough to
 * see the end of from the first night and long enough to be worth finishing,
 * and every break lands between two units rather than inside one. They land on
 * a change of subject as well: A1.2 ends on the everyday verbs and A1.3 opens
 * on describing things, B2.1 ends on word-building and B2.2 opens on society.
 *
 * HOW MANY EVENINGS A PART TAKES IS NOT WRITTEN DOWN HERE, and that is
 * deliberate: it falls out of how many words its units hold and how long a
 * word takes to meet at that level, so a number typed into a blurb would be a
 * second answer waiting to go stale. Every screen that says how long a part is
 * counts its days.
 *
 * A1 is six parts because A1 is the biggest level in this course by a long
 * way, over four hundred words against 235 at A2, and that is the language
 * rather than an imbalance: a beginner needs the words for a room before
 * anything else can be said about one. Six rather than five since the
 * evenings got shorter: five words a night at A1 is the Learn ladder's own
 * batch, and a part is held to under four weeks of them.
 */
export const PARTS: readonly PartSpec[] = [
  {
    id: "a1.1", level: "A1",
    title: "Esimesed sõnad", subtitle: "Hello, you and me, the verb to be, and the people around you",
    blurb:
      "You start from nothing and build up the way a sentence does. Five words on the first "
      + "evening, then I, you, he and she, then the verb to be, with a form for each person. After that "
      + "come the little words that hold a sentence together, a few greetings and questions, and "
      + "the people in your life. By the end you can say hello, ask where somebody lives and tell "
      + "them who's in your family.",
    units: ["vastused", "asesonad", "esimesed-verbid", "vaikesed-sonad", "tervitused", "kusisonad", "inimesed"],
  },
  {
    id: "a1.2", level: "A1",
    title: "Sina, arvud ja kodu", subtitle: "Your name, numbers, your home, and the verbs you'll use every day",
    blurb:
      "Your name and where you live, how to count, the rooms of your home, and the eleven verbs "
      + "you'll need in almost every sentence you ever say. By the end you can introduce "
      + "yourself, count, and describe where you live.",
    units: ["tutvumine", "arvud", "kodu", "pohiverbid", "veel-verbe"],
  },
  {
    id: "a1.3", level: "A1",
    title: "Söök, aeg ja tegevused", subtitle: "Food, the time, your day, and what things are like",
    blurb:
      "Food and drink, the days and the clock, what you do from morning to night, and your "
      + "first words for what things look like, colors included. By the end you can say what "
      + "you're doing, when, and what it's like.",
    units: ["sook-ja-jook", "aeg", "iga-paev", "omadussonad", "varvid", "tahtsad-sonad"],
  },
  {
    id: "a1.4", level: "A1",
    title: "Riided, ilm ja pood", subtitle: "Clothes, weather, prices, and a shop",
    blurb:
      "What you're wearing, what the weather's doing, the bigger numbers you need for prices, "
      + "and then a shop to put it all to work in. By the end you can describe what you want and "
      + "buy it.",
    units: ["riided", "ilm", "suured-arvud", "ostmine", "kodus"],
  },
  {
    id: "a1.5", level: "A1",
    title: "Kus ja millal", subtitle: "Where things are, the bus, somebody and something, and when",
    blurb:
      "Where things are and where you're heading, getting around by bus, words like somebody "
      + "and nothing, and talking about when. By the end you can ask where something is, catch a "
      + "bus there, and say when you arrived.",
    units: ["kus-ja-kuhu", "transport", "umbmaarased", "millal", "kohasonad"],
  },
  {
    id: "a1.6", level: "A1",
    title: "Sidesõnad, kuud ja riigid", subtitle: "Joining words, the calendar, and where people are from",
    blurb:
      "Words for joining two thoughts or saying how sure you are, the months and the holidays, "
      + "where people come from, and a few animals and parts of the body. By the end you can link "
      + "two ideas and say when something happens.",
    units: ["sidesonad", "kindlus", "maaramine", "kuud", "riigid", "loomad-ja-keha"],
  },
  {
    id: "a1.7", level: "A1",
    title: "Kuidas, kinni ja abi", subtitle: "How things are done, more everyday words, and asking for help",
    /*
      A seventh part rather than two more units inside the sixth, and that is
      about the day ids rather than about the shape. `CourseStep` rows are
      keyed on a day id, so inserting a unit into the middle of a part moves
      every evening after it onto an id somebody else's ticks already point at.
      Taking the last unit of a1.6 and standing it at the end of a new part
      moves no evening that anybody has reached: a1.6 keeps its own ids and
      simply stops earlier.

      The order inside it is the argument. The manner words and the particles
      are the last of the machinery, then the everyday words the course had
      been missing (the market, the town, ten verbs and ten adjectives), and
      A1 still ends on asking for help, which is where it ended before.
    */
    blurb:
      "The last of A1. Words for how something was done, and the small words that change what "
      + "a verb means. Then more of the everyday: food, places in town and the people who work "
      + "there, ten verbs every child knows and ten more describing words. It ends on asking for "
      + "help, and by then you have every word A1 asks for.",
    units: ["viisisonad", "osakesed", "rohkem-toitu", "kohad-ja-ametid", "tegusonad", "veel-omadussonu", "abi"],
  },

  {
    id: "a2.1", level: "A2",
    title: "Palved ja eile", subtitle: "Asking for things, yesterday, the outdoors, the body and the house",
    blurb:
      "A2 starts with what makes a conversation possible: asking for something without sounding "
      + "like a robot. Then the past tense, and your first case endings, starting with the one "
      + "all the others are built on. By the end you can say what you did yesterday and what's "
      + "wrong with you, and your first two conversations are waiting.",
    units: ["korraldused", "minevik", "loodus", "keha-ja-tervis", "kodutood"],
  },
  {
    id: "a2.2", level: "A2",
    title: "Linn ja liikumine", subtitle: "School, travel, the town, a free afternoon, and comparing things",
    blurb:
      "Life outside your front door: school, trips, the town, your weekends, and saying which "
      + "of two things is better. There are four conversations to practice on along the way. By "
      + "the end you can buy a ticket, ask the way and say what you did on Saturday.",
    units: ["kool-ja-keel", "reisimine", "linn-ja-teenused", "vaba-aeg", "vordlemine"],
  },
  {
    id: "a2.3", level: "A2",
    title: "Söök, plaanid ja tunded", subtitle: "Eating out, making plans, keeping in touch, and how you feel",
    blurb:
      "Talking about what hasn't happened yet, keeping in touch, and saying how you feel about "
      + "it all. It has five conversations, more than any other part. By the end you can get "
      + "through a whole meal in Estonian, book an appointment and call somebody about it.",
    units: ["restoranis", "plaanid", "suhtlemine", "tunded", "kirjeldamine", "kuivord"],
  },

  {
    id: "b1.1", level: "B1",
    title: "Sihitis ja rektsioon", subtitle: "Objects, the people in your life, what each verb asks for, money, and would",
    blurb:
      "Two things separate knowing Estonian words from knowing Estonian: getting the object of "
      + "a sentence right, and knowing which ending each verb wants after it. You learn each one "
      + "on everyday words, first the people in your life, then work and money. Then comes would, "
      + "for wishes and polite requests. Grammar and new words take turns, so it's never two "
      + "weeks of tables.",
    units: ["objekt", "inimsuhted", "rektsioon", "too-ja-raha", "tingiv"],
  },
  {
    id: "b1.2", level: "B1",
    title: "Kool, minevik ja kodu", subtitle: "School, two new past forms, renting, what people are like, and the news",
    blurb:
      "School and a job interview first. Then the verb forms ending in -nud and -tud, and the "
      + "two past tenses built from them. Then renting an apartment, what people are like, and the "
      + "news, which leans on those same forms to say what happened without saying who did it. By "
      + "the end you can get through an interview, read a news story and phone a landlord.",
    units: ["haridus", "kesksonad", "eluase", "iseloom", "meedia"],
  },
  {
    id: "b1.3", level: "B1",
    title: "Arvamused ja probleemid", subtitle: "Technology, opinions, the environment, things going wrong, and two-part verbs",
    blurb:
      "Disagreeing with somebody, the things the papers argue about, and coping when something "
      + "breaks. B1 ends on verbs that come in two parts, because they follow the same object "
      + "rule you met at the start of B1. By the end you can argue your side without switching to "
      + "English.",
    units: ["tehnoloogia", "arvamus", "keskkond", "probleemid", "liitverbid"],
  },

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
      "The end of B2: the arts, making a proper complaint, describing how people behave, "
      + "working in Estonian, reading a table of figures, and building an argument that gives a "
      + "little ground before it wins.",
    units: ["kunst", "oigus", "psuhholoogia", "toomaailm", "statistika", "argumenteerimine"],
  },

  {
    id: "c1.1", level: "C1",
    title: "Lause ja mõte", subtitle: "Saying more in fewer words, and long sentences that hold together",
    blurb:
      "C1 is mostly about saying more with less: fitting into a phrase what B2 needed a whole "
      + "clause for. You practice it on academic writing, research and philosophy, which is where "
      + "you'll need it most.",
    units: ["nominalisatsioon", "lauseloome", "akadeemiline", "teadustoo", "filosoofia"],
  },
  {
    id: "c1.2", level: "C1",
    title: "Veenmine ja register", subtitle: "Ethics, persuasion, how formal to be, idioms, and holding a text together",
    blurb:
      "Knowing how formal to be and getting it right, winning over somebody who disagrees, and "
      + "the set phrases no rule will ever explain.",
    units: ["eetika", "retoorika", "register", "idioomid", "diskursus"],
  },
  {
    id: "c1.3", level: "C1",
    title: "Maailm ja nüanss", subtitle: "New ideas, the wider world, literature, and words that almost mean the same",
    blurb:
      "The last part of the course. By the end you've met everything in it, and what's left is "
      + "reading Estonian because you want to.",
    units: ["innovatsioon", "rahvusvaheline", "kirjandus", "nuansid"],
  },
];
