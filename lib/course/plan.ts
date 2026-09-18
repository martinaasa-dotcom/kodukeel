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
 * through, and which of the fourteen conversations belongs to which unit.
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
 * and the crossword replaces the picture board above A2, because matching a
 * picture to a word is a question about vocabulary a B1 learner has.
 */
export const ROTATION: Record<string, readonly ActivityKey[]> = {
  /*
    A1 IS FOUR ROUNDS, AND EVERY ONE OF THEM IS PLAYED ON THE WORDS THE MODULE
    HAS TAUGHT AND NOTHING ELSE.

    It was ten, and the second evening of the module was measured at forty
    minutes against a promise of sixteen. Eight of the ten put something in
    front of a beginner that nobody had taught them: Sõnad deals a word off
    the dictionary, and dealt an A2 verb on the second evening; the sprint,
    Target, the picture board and Describe all ask for a case; dictation and
    speaking put a whole attested sentence up, which at A1 is a sentence made
    of words further up the course (`npm run audit:readable`). None of that is
    a fault in the round. Each is the right round for somebody who opened it
    from Practice and the wrong one for somebody the module sent there with
    eleven words.

    What is left is the four a beginner's own words can carry: Match and
    Listening ask the words back as meanings; the picture board asks a
    pictured noun as a word rather than as a case at A1; the conjugation table
    asks the verbs in its matching shape. Each of the four reads the module's
    own taught list off the address it was opened from
    (`lib/course/scope.ts`), so the words on the board are the words met. And
    a round is scheduled only once the words behind it exist: `rounds()` in
    `build.ts` swaps the table for Listening until a verb has been taught and
    the board for Match until a pictured noun has, which is why the first two
    evenings are the same pair and `course.test.ts` allows exactly that.

    Sõnad, the sprint and the rest stay on Practice, in the palette and as the
    game of the day, where a learner chooses them.
  */
  A1: ["match", "listening", "picture", "conjugation"],
  /*
    AND SÕNAD IS ON NONE OF THEM. Its word is dealt off the dictionary at the
    learner's band by design, and `recordSonad` rebuilds the day's puzzle from
    the date and the level on the server to grade it, so there is no honest
    way to hold it to what the module has taught: a scoped board would be
    marked against a different word. It stays the game of the day and on
    Practice, where a learner chooses it. The picture board takes its slot,
    which above A1 is the case board over taught nouns and taught cases.

    Every other round on these lists is dealt only once `supportsRound` in
    `build.ts` says the evenings before have taught what it needs, a case page
    for a case round, a sentence of taught words for dictation and ordering,
    the government page and a few governed verbs for government; and each
    reads the same ledger back off the step's address and narrows to it.
  */
  A2: ["match", "dictation", "target", "sentences", "sprint", "write", "picture", "describe"],
  B1: ["picture", "write", "target", "government", "sprint", "sentences", "match", "flash"],
  B2: ["picture", "write", "target", "flash", "sprint", "describe", "match", "government"],
  C1: ["picture", "write", "target", "exceptions", "sprint", "describe", "match", "flash"],
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
 * All fourteen the app has, each on the unit whose words it needs and none
 * before the words exist. A scene declares the units it may draw on, and
 * `course.test.ts` checks that every unit it declares has been taught by the
 * time the programme opens it, which is the whole of what makes a conversation
 * at this point fair rather than a wall.
 *
 * A unit with no entry has no conversation, which is most of them: fourteen
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
  vordlemine: "restoranis-tellimine",
  plaanid: "arsti-aeg",
  suhtlemine: "helistamine",
  tunded: "apteek",
  haridus: "toovestlus",
  eluase: "uuri-remont",
  probleemid: "ametiasutus",
  oigus: "kaebus",
};

/**
 * AND WHY THERE IS NO CONVERSATION IN THE WHOLE OF A1, WHICH IS A FINDING
 * RATHER THAN AN OMISSION.
 *
 * Every one of the fourteen scenes declares `korraldused` among the units it
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
 * fourteen scenes fall inside A2 as a result, which is the right shape: A1 is
 * where you get the words, A2 is where you start using them on people.
 *
 * A1 is not left without anything to enjoy. Every A1 evening carries a game
 * off the rotation, which at that level is Sõnad, the picture board, Match,
 * Target and the sprint, and those need no vocabulary the evening has not just
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
    title: "Esimesed sõnad", subtitle: "Hello, I and you, to be, and who is in the room",
    blurb:
      "From nothing, in the order a sentence needs: five words on the first evening, the "
      + "pronouns on the second, the verb to be and its six endings straight after, and then "
      + "the greetings and the people around you. At the end you can say hello, say who you "
      + "are, and say who is in your family.",
    units: ["vastused", "asesonad", "esimesed-verbid", "tervitused", "inimesed"],
  },
  {
    id: "a1.2", level: "A1",
    title: "Sina, arvud ja kodu", subtitle: "Who you are, counting, home, and the verbs that break the rules",
    blurb:
      "Your name and address, the numbers, the room you are standing in, and the eleven verbs "
      + "an Estonian sentence cannot avoid. At the end you can introduce yourself, count, and "
      + "describe your home.",
    units: ["tutvumine", "arvud", "kodu", "pohiverbid"],
  },
  {
    id: "a1.3", level: "A1",
    title: "Söök, aeg ja tegevused", subtitle: "Food, the clock, what you do all day, and what things are like",
    blurb:
      "The words for ordering, the days and the hours, the verbs of an ordinary day, and the "
      + "first adjectives and colors. At the end you can say what you are doing, when, and what "
      + "it is like.",
    units: ["sook-ja-jook", "aeg", "iga-paev", "omadussonad", "varvid"],
  },
  {
    id: "a1.4", level: "A1",
    title: "Riided, ilm ja pood", subtitle: "Clothes, weather, prices, and a shop",
    blurb:
      "Clothes and weather, the numbers a price needs, and then the shop where you use all of "
      + "them. At the end you can say what something is like and buy it.",
    units: ["riided", "ilm", "suured-arvud", "ostmine"],
  },
  {
    id: "a1.5", level: "A1",
    title: "Kus, kes, millal", subtitle: "Places, the bus, questions, the rest of the pronouns, and when",
    blurb:
      "The words a sentence is built out of rather than the ones it is about. At the end you "
      + "can ask where something is, catch a bus to it, and say when you got there.",
    units: ["kus-ja-kuhu", "transport", "kusisonad", "umbmaarased", "millal", "kohasonad"],
  },
  {
    id: "a1.6", level: "A1",
    title: "Sidesõnad, kuud ja abi", subtitle: "The small words, the calendar, the world, and asking for help",
    blurb:
      "The last of A1: the words that join two sentences or say how sure you are, the months, "
      + "where people are from, and how to ask somebody for help. At the end you have every "
      + "word A1 asks for.",
    units: ["sidesonad", "kindlus", "maaramine", "kuud", "riigid", "abi"],
  },

  {
    id: "a2.1", level: "A2",
    title: "Palved ja eile", subtitle: "Asking for things, yesterday, the outdoors and the body",
    blurb:
      "A2 opens with the unit that makes a conversation possible, asking somebody for something "
      + "without sounding like a machine, and then the past tense. At the end you can say what "
      + "you did yesterday and what is wrong with you, and the first two conversations open.",
    units: ["korraldused", "minevik", "loodus", "keha-ja-tervis"],
  },
  {
    id: "a2.2", level: "A2",
    title: "Linn ja liikumine", subtitle: "School, travel, the house, the town and a free afternoon",
    blurb:
      "Everything that happens outside your own front door, and three conversations to have "
      + "there. At the end you can buy a ticket, ask the way and say what you did on Saturday.",
    units: ["kool-ja-keel", "reisimine", "kodutood", "linn-ja-teenused", "vaba-aeg"],
  },
  {
    id: "a2.3", level: "A2",
    title: "Söök, plaanid ja tunded", subtitle: "Eating out, comparing things, what is next, and how you feel",
    blurb:
      "Comparing two things, talking about what has not happened yet, and saying how you feel "
      + "about either. Five conversations, more than any other part: at the end you can hold a "
      + "whole meal in Estonian, book an appointment and ring somebody about it.",
    units: ["restoranis", "vordlemine", "plaanid", "suhtlemine", "tunded"],
  },

  {
    id: "b1.1", level: "B1",
    title: "Sihitis ja rektsioon", subtitle: "The object, verb government, would, and the participles",
    blurb:
      "The four things that separate somebody who has words from somebody who has Estonian. "
      + "Hard, and short: four grammar units and the vocabulary of work and money.",
    units: ["objekt", "rektsioon", "tingiv", "kesksonad", "too-ja-raha"],
  },
  {
    id: "b1.2", level: "B1",
    title: "Kodu, meedia ja keskkond", subtitle: "Housing, the news, technology and the environment",
    blurb:
      "The subjects a newspaper is about, and the impersonal that a newspaper is written in. "
      + "At the end you can follow a news item and say what you think of it.",
    units: ["eluase", "meedia", "tehnoloogia", "keskkond", "haridus"],
  },
  {
    id: "b1.3", level: "B1",
    title: "Inimesed ja arvamused", subtitle: "Relationships, character, opinions, and things going wrong",
    blurb:
      "Describing a person, disagreeing with one, and dealing with the afternoon where "
      + "something breaks. At the end you can argue your side without switching to English.",
    units: ["inimsuhted", "iseloom", "arvamus", "probleemid", "liitverbid"],
  },

  {
    id: "b2.1", level: "B2",
    title: "Kes seda ütles", subtitle: "The impersonal, the reported, the converb and word-building",
    blurb:
      "Four ways Estonian says something without saying who did it, and the machinery for "
      + "building a word you have never met out of one you have.",
    units: ["umbisikuline", "kaudne", "des-vorm", "sonamoodustus", "uhiskond"],
  },
  {
    id: "b2.2", level: "B2",
    title: "Ühiskond ja ajalugu", subtitle: "Politics, money, law, science, history and the arts",
    blurb:
      "The vocabulary of a public argument. At the end you can read an opinion piece on any of "
      + "six subjects without a dictionary open beside it.",
    units: ["poliitika", "majandus", "oigus", "teadus", "ajalugu", "kunst"],
  },
  {
    id: "b2.3", level: "B2",
    title: "Töö ja argument", subtitle: "Mind, health, working life, data, and making a case",
    blurb:
      "The end of B2: describing behavior, navigating a health system, working in Estonian, "
      + "and building an argument that concedes a point before it wins one.",
    units: ["psuhholoogia", "tervishoid", "toomaailm", "statistika", "argumenteerimine"],
  },

  {
    id: "c1.1", level: "C1",
    title: "Lause ja mõte", subtitle: "Compressing a clause, and writing a long sentence that works",
    blurb:
      "C1 is mostly about compression: saying in a phrase what B2 says in a clause. Four units "
      + "of that, and then academic and research writing, which are what it is for.",
    units: ["nominalisatsioon", "lauseloome", "akadeemiline", "teadustoo", "filosoofia"],
  },
  {
    id: "c1.2", level: "C1",
    title: "Veenmine ja register", subtitle: "Ethics, rhetoric, register, idiom and holding a text together",
    blurb:
      "Choosing how formal to be and meaning it, persuading somebody who disagrees, and the "
      + "fixed expressions that no rule reaches.",
    units: ["eetika", "retoorika", "register", "idioomid", "diskursus"],
  },
  {
    id: "c1.3", level: "C1",
    title: "Maailm ja nüanss", subtitle: "Innovation, the world outside, literature, and choosing between near-synonyms",
    blurb:
      "The last of the course. At the end there is nothing left in the syllabus you have not "
      + "met, and what is left is reading Estonian because you want to.",
    units: ["innovatsioon", "rahvusvaheline", "kirjandus", "nuansid"],
  },
];
