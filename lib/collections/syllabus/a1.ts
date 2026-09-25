/**
 * A1 — from nothing to getting by.
 *
 * THE ORDER IS THE ORDER A SENTENCE NEEDS. Five words on the first evening,
 * the six persons on the second, the verb to be and the six endings on the
 * third and fourth, and only then the greetings, the people and the rooms.
 * It was nouns first for a long time, and the module's second evening was
 * measured at forty minutes for a promise of sixteen: a conjugation table
 * dealt to somebody who had never been shown `sina`, a case card in the
 * closing review, an A2 word from the daily puzzle. Everything after the
 * fourth evening builds on a learner who can already say `ma olen` and
 * `sa elad`.
 *
 * A1 ASKS FOR NO CASE AND NO GAP. Every unit here declares recognition and
 * production, and the units of verbs the conjugation table, and nothing else:
 * a beginner builds vocabulary and the phrases everybody needs, reads about a
 * case where a unit is about one, and is asked to produce a case from A2. The
 * grammar still arrives as it is needed rather than as a syllabus of its own,
 * as a page to read: the partitive turns up in the food unit because that is
 * where a learner first meets it, and the inessive in the home unit because a
 * room is the easiest thing to be inside of. `syllabus.test.ts` holds both.
 */
import { unit } from "./types";

export const A1 = [
  unit({
    /*
      FIVE WORDS, ALONE, ON THE FIRST EVENING, AND THE PRONOUNS ON THE SECOND.

      This unit used to be thirteen particles (`küll`, `eks`, `tegelikult`),
      three evenings of them, before a learner had met `mina` or `olen`. The
      second evening of the curated module was measured at forty minutes for a
      sixteen-minute promise, and the reason was not the words, it was that
      everything around them assumed grammar nobody had been shown: a
      conjugation table with no pronouns behind it, a case card in the closing
      review, a Sõnad word from A2. So the first evening is the five words
      anybody says on their first day in the country, and the eight particles
      about how sure you are moved to `kindlus`, late in A1, where a learner
      has sentences to put them in.

      Five is under the floor every other unit has, and the floor was lowered
      for this one unit on purpose: the second evening has to be the pronouns
      (`asesonad`), and a unit of eight here is two evenings of particles in
      front of them.
    */
    id: "vastused",
    title: "Vastused",
    subtitle: "Hello, thank you, yes and no",
    icon: "MessageCircle",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Say hello, say thank you, and answer yes or no.",
    blurb: "Five words, said alone. Nothing here is a sentence yet.",
    /*
      The dictionary form and nothing else: these are words said alone, and
      the politeness page, which is the plural as a polite you and the
      conditional, belongs to `tervitused`, which declares it. Declared here
      as well, the first evening of the whole course read it to somebody
      holding five words and no pronoun, and the greetings then read nothing
      because the part had already read it.
    */
    grammar: ["nominative"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    words: [
      ["tere", "hello", "ADVERB"],
      ["aitäh", "thank you", "ADVERB"],
      ["jah", "yes", "ADVERB"],
      ["ei", "no, not", "ADVERB"],
      ["muidugi", "of course", "ADVERB"],
    ],
  }),

  unit({
    /*
      THE SECOND EVENING OF THE COURSE, BECAUSE NOTHING ELSE CAN BE SAID
      WITHOUT THEM. Every verb ending in the language is an ending *for* one of
      these, and a learner asked to fill a conjugation table who has never been
      shown `sina` or `nemad` is guessing at both halves of every row. That was
      reported off the module's second evening. So the six persons and the two
      pointers come straight after hello, and the verbs come straight after
      them (`esimesed-verbid`).

      The indefinite pronouns that used to sit in this unit (`keegi`, `miski`,
      `kõik`) are `umbmaarased` now, late in A1: they are pronouns too and they
      are not the reason anybody learns the word `pronoun`.

      AND THE SIX ARE ONE EVENING, BECAUSE HALF A PARADIGM IS NOT A LESSON.
      This unit used to carry the two pointers as well, eight words, which the
      five-word budget sliced into four and four: the module's second evening
      taught `mina, sina, tema, meie` under a heading promising I, you, he,
      we, you and they, so the screen named two pronouns the evening did not
      teach and a learner reported exactly that. Six is one word over the
      budget and three under the ceiling, and it is fifteen minutes to the
      minute, so the paradigm is met whole. `see` and `too` are in
      `esimesed-verbid` now, on the evening of `olema`, which is the verb a
      pointer needs: `See on raamat` is the first sentence anybody says, and
      it cannot be said on an evening that teaches the pointer and no verb.
    */
    id: "asesonad",
    title: "Asesõnad",
    subtitle: "I, you, he, we, you, they",
    icon: "Users",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Say I, you, he, we, you and they, about yourself and about anybody else.",
    blurb: "The six persons, in one evening. Every verb ending you meet next is an ending for one of them.",
    grammar: ["nominative"],
    /*
      The glosses carry both English roles where English has two words for one
      pronoun ("I, me", "we, us", "they, them"), because that is the sense the
      course was missing rather than a second entry: `mind` is "me" and no rule
      over "I" reaches it. Which of the two a form takes is
      `lib/estonian/pronouns.ts`, and the everyday spelling beside the headword
      (`mina` and `ma`) is read off the dictionary on the meeting step itself.
    */
    // No case cards from the seed alone: a pronoun's everyday case forms are
    // the short ones (`mulle`, `mul`), which no rule over the genitive reaches,
    // and a card answering `minule` would mark the form everybody says wrong.
    // Ekilex records both, so an enriched entry shows the pair on its table.
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["vastused"],
    words: [
      ["mina", "I, me", "PRONOUN"],
      ["sina", "you (one person)", "PRONOUN"],
      ["tema", "he, she", "PRONOUN"],
      ["meie", "we, us", "PRONOUN"],
      ["teie", "you (several people, or one politely)", "PRONOUN"],
      ["nemad", "they, them", "PRONOUN"],
    ],
    // One evening, said out loud rather than left to `Math.ceil(6 / 5)`, which
    // is two. See the note at the top of the unit.
    evenings: [["mina", "sina", "tema", "meie", "teie", "nemad"]],
  }),

  unit({
    /*
      THE ENDINGS, ON THE THIRD AND FOURTH EVENINGS, WITH THE PRONOUNS STILL
      WARM. `olema` first because it is the verb every sentence in A1 is built
      on and the one the rule does not reach (`olen, oled, on`), then seven
      more whose table is the same six endings every time: `-n, -d, -b, -me,
      -te, -vad`. What is not the same every time is the stem they go on, and
      four of the seven do not hand it over: `õppima : õpin`, `rääkima :
      räägin` and `tahtma : tahan` gradate on the way to it, and `minema :
      lähen` is not the same word twice. That is the lesson rather than an
      exception to it, and it is why the dictionary stores a verb's first
      person and `lib/estonian/conjugate.ts` derives the other five off that
      rather than off the infinitive. The blurb says so, because a learner who
      reads "six endings on one stem" and reasons from the infinitive writes
      `rääkin`. Eight verbs is two evenings, and both are the
      conjugation drill in its matching shape, where the six forms are on the
      screen and the learner puts each beside its pronoun, before anybody is
      asked to type one.

      `olema`, `minema` and `tulema` came out of `pohiverbid` and the five
      regular ones out of `iga-paev`, so a word is still introduced exactly
      once; those two units are eleven and thirteen words now.

      AND THE TWO POINTERS ARE HERE, ON THE EVENING OF `olema`. They were in
      `asesonad`, where they were the two words that made the six persons into
      eight and got the paradigm sliced in half. They are better off here
      anyway, and that is the argument rather than the excuse: `see` and `too`
      are useless without a verb, and `See on raamat` is the first sentence
      anybody says in this language. So the first evening is the verb to be
      and the two things you point at with it, and the second is the other
      five, declared rather than sliced so the three cannot come apart again.
    */
    id: "esimesed-verbid",
    title: "Esimesed verbid",
    subtitle: "To be, this and that, and the six endings",
    icon: "Zap",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Say I am, you are and this is, and put a simple verb with each of the six pronouns.",
    blurb: "The verb to be, the two words you point with, and seven more. The six endings never change; which stem they go on is what you learn per verb.",
    grammar: ["olema", "present-tense"],
    cardTypes: ["RECOGNITION", "PRODUCTION", "CONJUGATION"],
    requires: ["asesonad"],
    words: [
      ["olema", "to be"],
      ["see", "this, it", "PRONOUN"],
      ["too", "that (one over there)", "PRONOUN"],
      ["elama", "to live"],
      ["õppima", "to learn, to study"],
      ["rääkima", "to speak"],
      ["töötama", "to work"],
      ["tahtma", "to want"],
      ["minema", "to go"],
      ["tulema", "to come"],
    ],
    evenings: [
      ["olema", "see", "too", "elama", "õppima"],
      ["rääkima", "töötama", "tahtma", "minema", "tulema"],
    ],
  }),

  unit({
    id: "tervitused",
    title: "Tervitused",
    subtitle: "Putting words together",
    icon: "Hand",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Greet someone, thank them, apologize, and say you do not understand.",
    blurb: "The words from Vastused, put together into the phrases that get you through a first conversation.",
    grammar: ["politeness"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["vastused"],
    words: [
      ["Tere!", "Hello!", "PHRASE"],
      ["Tere hommikust!", "Good morning!", "PHRASE"],
      ["Head aega!", "Goodbye!", "PHRASE"],
      ["Nägemist!", "See you!", "PHRASE"],
      ["Aitäh!", "Thank you!", "PHRASE"],
      ["Palun", "Please / You're welcome", "PHRASE"],
      ["Vabandust!", "Sorry! / Excuse me!", "PHRASE"],
      ["Kuidas läheb?", "How's it going?", "PHRASE"],
      ["Ma ei saa aru", "I don't understand", "PHRASE"],
      ["Kas sa räägid inglise keelt?", "Do you speak English?", "PHRASE"],
      ["Ma õpin eesti keelt", "I am learning Estonian", "PHRASE"],
      ["Mis kell on?", "What time is it?", "PHRASE"],
      ["Kui palju see maksab?", "How much does it cost?", "PHRASE"],
      ["Mulle meeldib see", "I like it", "PHRASE"],
      ["Head isu!", "Enjoy your meal!", "PHRASE"],
      ["Palju õnne!", "Congratulations!", "PHRASE"],
      ["Mul on hea meel", "I'm glad", "PHRASE"],
      ["Ma ei tea veel", "I don't know yet", "PHRASE"],
    ],
  }),

  unit({
    id: "inimesed",
    title: "Inimesed",
    subtitle: "People and family",
    icon: "Users",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Say who is in your family and introduce the people around you.",
    blurb: "Who is in the room.",
    grammar: ["nominative"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["tervitused"],
    words: [
      ["inimene", "person, human"],
      ["naine", "woman, wife"],
      ["mees", "man, husband"],
      ["laps", "child"],
      ["sõber", "friend"],
      ["ema", "mother"],
      ["isa", "father"],
      ["pere", "family"],
      ["vend", "brother"],
      ["õde", "sister"],
      ["tütar", "daughter"],
      ["poeg", "son"],
      ["vanaema", "grandmother", "NOUN"],
      ["vanaisa", "grandfather"],
      ["nimi", "name"],
      ["õpetaja", "teacher"],
      ["õpilane", "pupil, student"],
      ["arst", "doctor"],
    ],
  }),

  unit({
    id: "tutvumine",
    title: "Tutvumine",
    subtitle: "Saying who you are",
    icon: "Handshake",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Introduce yourself, say where you live and what you do, and ask the same back.",
    blurb: "The first conversation anybody has here, and the one that comes back every time you meet somebody new. Your name, your address, your work and one thing you like doing.",
    grammar: ["nominative", "genitive"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["inimesed"],
    words: [
      ["eesnimi", "first name"],
      ["perekonnanimi", "surname"],
      // Ekilex A1, and the course met it first at A2. It is asked for at every
      // counter, every doctor and every parcel machine.
      ["aadress", "address"],
      ["elukoht", "place of residence"],
      ["sünnikoht", "place of birth"],
      ["sünniaeg", "date of birth"],
      ["tutvuma", "to get to know someone"],
      ["tutvustama", "to introduce"],
      ["tuttav", "acquaintance"],
      ["kolleeg", "colleague"],
      ["sõbranna", "a female friend"],
      ["hobi", "hobby"],
      ["huvi", "interest"],
      ["meeldiv", "pleasant", "ADJECTIVE"],
      ["abielus", "married", "ADVERB"],
      ["vallaline", "unmarried, single", "ADJECTIVE"],
    ],
  }),

  unit({
    id: "arvud",
    title: "Arvud",
    subtitle: "Numbers and counting",
    icon: "Hash",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Count, give your phone number, say a price and tell someone your age.",
    blurb: "Counting is where the osastav first bites: kaks raamatut, not kaks raamat. The teens end in -teist and the tens in -kümmend, and from the third on an ordinal is -s on the omastav, which is how you say which floor you live on. Esimene and teine are their own words.",
    grammar: ["numerals", "partitive"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["inimesed"],
    words: [
      /*
        The can-do says "give your phone number, say a price and tell someone
        your age", and the list stopped at ten and then jumped to a hundred, so
        a teacher checking the unit against the promise on its own page finds
        the gap on the first screen. Zero, two teens and two tens is what a
        class actually teaches: the pattern is `-teist` and `-kümmend`, and
        somebody who has met two of each has met the rule. Each of these is a
        request rather than a fact, and the harvest drops and reports any that
        Ekilex will not confirm.
      */
      ["number", "number"],
      ["null", "zero"],
      ["üks", "one"],
      ["kaks", "two"],
      ["kolm", "three"],
      ["neli", "four"],
      ["viis", "five"],
      ["kuus", "six"],
      ["seitse", "seven"],
      ["kaheksa", "eight"],
      ["üheksa", "nine"],
      ["kümme", "ten"],
      ["üksteist", "eleven"],
      ["kaksteist", "twelve"],
      ["kakskümmend", "twenty"],
      ["kolmkümmend", "thirty"],
      ["vanus", "age"],
      ["sada", "hundred"],
      ["tuhat", "thousand"],
      /*
        THE ORDINALS STOPPED AT TWO, AND A FLOOR IS AN ORDINAL.

        A learner told to say which floor they live on wrote `kolmandal
        korrusel`, which is the sentence, and the app answered that it had not
        understood them. The list held `esimene` and `teine` and then nothing,
        which is the same shape as the gap `docs/21-situations.md` §29 found
        across the course: the nouns of a situation are taught and the words
        that do things with them are not. A floor, a course, a try and a street
        number are all ordinals, and the pattern is `-s` on the genitive of the
        cardinal, so somebody who has met five of them has met the rule.

        Requests like every other line here: the harvest either confirms each
        against Ekilex or drops and reports it.
      */
      ["esimene", "first", "ADJECTIVE"],
      ["teine", "second, other", "ADJECTIVE"],
      ["kolmas", "third", "ADJECTIVE"],
      ["neljas", "fourth", "ADJECTIVE"],
      ["viies", "fifth", "ADJECTIVE"],
    ],
  }),

  unit({
    id: "kodu",
    title: "Kodu",
    subtitle: "Home and everyday objects",
    icon: "House",
    level: "A1",
    module: "Igapäevaelu",
    canDo: "Describe your home and say where things are in it.",
    blurb: "Things you can point at, the easiest place to meet the seesütlev (toas, köögis).",
    grammar: ["inessive", "nominative"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["inimesed"],
    words: [
      ["kodu", "home"],
      ["maja", "house"],
      ["tuba", "room"],
      ["köök", "kitchen"],
      ["korter", "flat, apartment"],
      ["uks", "door"],
      ["aken", "window"],
      ["laud", "table"],
      ["tool", "chair"],
      ["voodi", "bed"],
      ["raamat", "book"],
      ["arvuti", "computer"],
      ["telefon", "telephone"],
      ["võti", "key"],
      ["klaas", "glass"],
      ["tass", "cup"],
      ["pilt", "picture"],
      ["sein", "wall"],
      ["põrand", "floor"],
      ["korrus", "floor, story"],
    ],
  }),

  unit({
    id: "sook-ja-jook",
    title: "Söök ja jook",
    subtitle: "Food and drink",
    icon: "Utensils",
    level: "A1",
    module: "Igapäevaelu",
    canDo: "Order food, shop for groceries and say what you like to eat.",
    blurb: "Enough to order, shop and read a menu. The osastav lives here (ma joon kohvi).",
    // The partitive alone. The object rule was here too, and its own page
    // says it is the main thing separating B1 from A2; it is B1's `objekt`.
    grammar: ["partitive"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["kodu"],
    words: [
      ["toit", "food"],
      ["söök", "food, a meal"],
      ["jook", "drink"],
      ["leib", "bread (dark)"],
      ["sai", "bread (white)"],
      ["kohv", "coffee"],
      ["vesi", "water"],
      ["piim", "milk"],
      ["mahl", "juice"],
      ["liha", "meat"],
      ["kala", "fish"],
      ["õun", "apple"],
      ["kartul", "potato"],
      ["juust", "cheese"],
      ["muna", "egg"],
      ["või", "butter"],
      ["sool", "salt"],
      ["suhkur", "sugar"],
      ["supp", "soup"],
    ],
  }),

  unit({
    id: "aeg",
    title: "Aeg",
    subtitle: "Days, hours and when things happen",
    icon: "Clock",
    level: "A1",
    module: "Igapäevaelu",
    canDo: "Tell the time, name the days, and say when something happens.",
    blurb: "Time words carry the alalütlev and seestütlev constantly, hommikul, esmaspäevast.",
    grammar: ["adessive", "elative", "time-expressions"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["arvud"],
    words: [
      ["aeg", "time"],
      ["päev", "day"],
      ["öö", "night"],
      ["hommik", "morning"],
      ["õhtu", "evening"],
      ["nädal", "week"],
      ["kuu", "month, moon"],
      ["aasta", "year"],
      ["tund", "hour, lesson"],
      ["minut", "minute"],
      ["kell", "clock, o'clock"],
      ["esmaspäev", "Monday"],
      ["teisipäev", "Tuesday"],
      ["kolmapäev", "Wednesday"],
      ["neljapäev", "Thursday"],
      ["reede", "Friday"],
      ["laupäev", "Saturday"],
      ["pühapäev", "Sunday"],
      ["kellaaeg", "time of day"],
      /*
        `pool` came over from `arvud` when the ordinals went in, and this is
        the better home for it either way: half past eleven is `pool
        kaksteist`, which is this unit's own can-do, and `arvud` is counting.
        The word and its gloss are unchanged, and the harvest stores no unit.
      */
      ["pool", "half"],
      // "Üks hetk" is what anybody behind a counter says while they look.
      ["hetk", "moment"],
    ],
  }),

  unit({
    id: "pohiverbid",
    title: "Põhiverbid",
    subtitle: "The irregular core",
    icon: "Zap",
    level: "A1",
    module: "Tegevused",
    canDo: "Build a simple sentence in the present tense about what you do.",
    blurb: "Verbs that break the rules and are used constantly. Learn these as forms, not patterns.",
    grammar: ["present-tense", "olema", "negation"],
    cardTypes: ["RECOGNITION", "PRODUCTION", "CONJUGATION"],
    requires: ["esimesed-verbid"],
    words: [
      ["tegema", "to do, to make"],
      ["saama", "to get, to become"],
      ["pidama", "to have to, must", "VERB", 216079],
      ["sööma", "to eat"],
      ["jooma", "to drink"],
      ["tooma", "to bring"],
      // Not "to take away": in English that means to remove, and Ekilex's own
      // definition and all three stored sentences are about taking somebody or
      // something somewhere ("Isa viis hommikul lapsed kooli"). The unit pairs
      // it with tooma, which is the other direction of the same act, and "take
      // away" points a beginner at ära viima instead.
      ["viima", "to take (somewhere), to carry"],
      ["andma", "to give"],
      ["võtma", "to take"],
      ["panema", "to put"],
      ["jääma", "to stay, to remain"],
    ],
  }),

  unit({
    id: "iga-paev",
    title: "Iga päev",
    subtitle: "Everyday actions",
    icon: "Footprints",
    level: "A1",
    module: "Tegevused",
    canDo: "Describe your daily routine from waking up to going to bed.",
    blurb: "What you do all day, in the two infinitives Estonian actually uses.",
    grammar: ["present-tense", "infinitives"],
    cardTypes: ["RECOGNITION", "PRODUCTION", "CONJUGATION"],
    requires: ["pohiverbid"],
    words: [
      ["teadma", "to know (a fact)"],
      ["tundma", "to know (a person), to feel"],
      ["nägema", "to see"],
      ["kuulma", "to hear"],
      ["ütlema", "to say"],
      ["küsima", "to ask"],
      ["vastama", "to answer"],
      ["lugema", "to read, to count"],
      ["kirjutama", "to write"],
      ["magama", "to sleep"],
      ["ärkama", "to wake up"],
      ["istuma", "to sit"],
      ["seisma", "to stand"],
    ],
  }),

  unit({
    id: "omadussonad",
    title: "Omadussõnad",
    subtitle: "Describing things",
    icon: "Palette",
    level: "A1",
    module: "Kirjeldamine",
    canDo: "Describe a thing or a person with an adjective that agrees with it.",
    blurb: "Adjectives agree with their noun in Estonian, so every one you learn pays for itself.",
    grammar: ["adjective-agreement", "nominative"],
    /*
      NO CASE CARD, AND THE ADJECTIVES ARE WHERE THAT RULE BITES FIRST.

      A case card is now built out of a sentence a lexicographer recorded using
      that very case, and not one of this unit's twenty adjectives has one: the
      usages under `kallis` are `Tere, kallis!`, `Kallid sõbrad!` and
      `Kallis taevas!`, which are the word in the nominative three times. It is
      the only unit in the course that loses the type, which is the right place
      for it to be lost, because an adjective in isolation is the emptiest
      version of the question — the whole point of this unit's own `canDo` is
      that an adjective agrees with *its noun*, and a bare `suur → millesse?`
      is that noun taken away. Agreement is taught on the grammar pages this
      unit links to and met in its gap-fill cards, which is the answer `objekt`
      already got when it asked for a card its verbs could not make.
    */
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["kodu"],
    words: [
      ["suur", "big, large", "ADJECTIVE"],
      ["väike", "small", "ADJECTIVE"],
      ["hea", "good", "ADJECTIVE"],
      ["halb", "bad", "ADJECTIVE"],
      ["uus", "new", "ADJECTIVE"],
      ["vana", "old", "ADJECTIVE"],
      ["noor", "young", "ADJECTIVE"],
      ["pikk", "long, tall", "ADJECTIVE"],
      ["lühike", "short", "ADJECTIVE"],
      ["kiire", "fast, quick", "ADJECTIVE"],
      ["aeglane", "slow", "ADJECTIVE"],
      ["kallis", "expensive, dear", "ADJECTIVE"],
      ["odav", "cheap", "ADJECTIVE"],
      ["ilus", "beautiful", "ADJECTIVE"],
      ["tore", "nice, lovely", "ADJECTIVE"],
      ["raske", "difficult, heavy", "ADJECTIVE"],
      ["kerge", "easy, light", "ADJECTIVE"],
      ["lihtne", "simple", "ADJECTIVE"],
      ["valmis", "ready", "ADJECTIVE"],
      ["keeruline", "complicated", "ADJECTIVE"],
    ],
  }),

  unit({
    id: "varvid",
    title: "Värvid",
    subtitle: "Colors",
    icon: "Paintbrush",
    level: "A1",
    module: "Kirjeldamine",
    canDo: "Name colors and describe what something looks like.",
    blurb: "The word for color itself, and eleven adjectives that decline like any other.",
    grammar: ["adjective-agreement"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["omadussonad"],
    words: [
      ["värv", "color"],
      ["punane", "red", "ADJECTIVE"],
      ["sinine", "blue", "ADJECTIVE"],
      ["roheline", "green", "ADJECTIVE"],
      ["kollane", "yellow", "ADJECTIVE"],
      ["must", "black", "ADJECTIVE"],
      ["valge", "white", "ADJECTIVE"],
      ["hall", "gray", "ADJECTIVE"],
      ["pruun", "brown", "ADJECTIVE"],
      ["roosa", "pink", "ADJECTIVE"],
      ["lilla", "purple", "ADJECTIVE"],
      ["hele", "light, pale", "ADJECTIVE"],
      ["tume", "dark", "ADJECTIVE"],
    ],
  }),

  unit({
    id: "riided",
    title: "Riided",
    subtitle: "Clothes and what you wear",
    icon: "Shirt",
    level: "A1",
    module: "Kirjeldamine",
    canDo: "Say what you are wearing and shop for clothes by size and color.",
    blurb: "A shop conversation you will have in your first week, and a pile of easy nouns.",
    grammar: ["adjective-agreement", "partitive"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["varvid"],
    words: [
      ["särk", "shirt"],
      ["kleit", "dress"],
      ["seelik", "skirt"],
      ["king", "shoe"],
      ["sokk", "sock"],
      ["müts", "hat"],
      ["mantel", "coat"],
      ["jope", "jacket"],
      ["sall", "scarf"],
      ["kinnas", "glove"],
      ["taskurätik", "handkerchief"],
      ["vöö", "belt"],
      ["riie", "cloth, fabric"],
      /*
        "Shop for clothes by size" needs a word for size and a word for
        trousers, and this unit had neither: it taught a handkerchief and a
        belt, which Ekilex rates B1, and left out the two garments a beginner
        buys first. Requests, checked by the harvest like every other lemma.
      */
      ["suurus", "size"],
      ["püksid", "trousers"],
      ["kampsun", "jumper, sweater"],
      ["saabas", "boot"],
    ],
  }),

  unit({
    id: "ilm",
    title: "Ilm",
    subtitle: "Weather",
    icon: "CloudSun",
    level: "A1",
    module: "Maailm ümber",
    canDo: "Talk about the weather, which in Estonia is never small talk for long.",
    blurb: "Half of every Estonian conversation opens here, and the vocabulary is tiny.",
    grammar: ["olema", "adjective-agreement"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["omadussonad"],
    words: [
      ["ilm", "weather"],
      ["päike", "sun"],
      ["vihm", "rain"],
      ["lumi", "snow"],
      ["tuul", "wind"],
      ["pilv", "cloud"],
      ["torm", "storm"],
      ["jää", "ice"],
      ["udu", "fog"],
      ["kraad", "degree"],
      ["külm", "cold", "ADJECTIVE"],
      ["soe", "warm", "ADJECTIVE"],
      ["kuum", "hot", "ADJECTIVE"],
      ["märg", "wet", "ADJECTIVE"],
      ["kuiv", "dry", "ADJECTIVE"],
    ],
  }),

  unit({
    id: "suured-arvud",
    title: "Suuremad arvud",
    subtitle: "Thirteen to a million",
    icon: "Calculator",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Say a price, a phone number, a floor and a year without running out of numbers.",
    blurb: "Two patterns and you have the lot. The teens put -teist on the unit and the tens put -kümmend on it, so somebody who can say kolm can say kolmteist and kolmkümmend. The ordinals are -s on the omastav, which is the form a floor and a date are given in.",
    grammar: ["numerals", "partitive"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["arvud"],
    words: [
      ["kolmteist", "thirteen"],
      ["neliteist", "fourteen"],
      ["viisteist", "fifteen"],
      ["kuusteist", "sixteen"],
      ["seitseteist", "seventeen"],
      ["kaheksateist", "eighteen"],
      ["üheksateist", "nineteen"],
      ["nelikümmend", "forty"],
      ["viiskümmend", "fifty"],
      ["kuuskümmend", "sixty"],
      ["seitsekümmend", "seventy"],
      ["kaheksakümmend", "eighty"],
      ["üheksakümmend", "ninety"],
      /*
        The ordinals `arvud` stopped at five, carried on. A floor, a date, a
        bus line and a place in a queue are all ordinals, and the five it had
        were enough to show the pattern and not enough to use it.
      */
      ["kuues", "sixth", "ADJECTIVE"],
      ["seitsmes", "seventh", "ADJECTIVE"],
      ["kaheksas", "eighth", "ADJECTIVE"],
      ["üheksas", "ninth", "ADJECTIVE"],
      ["kümnes", "tenth", "ADJECTIVE"],
      ["miljon", "million"],
    ],
  }),

  unit({
    id: "ostmine",
    title: "Poes ja tänaval",
    subtitle: "Shopping and getting around",
    icon: "ShoppingBag",
    level: "A1",
    module: "Maailm ümber",
    canDo: "Buy something, ask the price, and find your way to a place in town.",
    blurb: "Buying, paying, going. Verbs and places together, because that is how they turn up.",
    grammar: ["partitive", "illative", "allative"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["sook-ja-jook", "arvud"],
    words: [
      ["pood", "shop"],
      ["turg", "market"],
      ["raha", "money"],
      ["sularaha", "cash"],
      ["hind", "price"],
      ["pilet", "ticket"],
      ["ostma", "to buy"],
      ["müüma", "to sell"],
      ["maksma", "to pay, to cost"],
      ["linn", "town, city"],
      ["tänav", "street"],
      ["tee", "road, tea"],
      ["buss", "bus"],
      ["rong", "train"],
      ["auto", "car"],
      ["jaam", "station"],
      ["park", "park"],
      // The currency every counter names, and the dictionary held `sent` and not
      // this. `npm run eval:scene` withheld a pharmacy line over it twice.
      ["euro", "euro"],
    ],
  }),

  unit({
    id: "kus-ja-kuhu",
    title: "Kus ja kuhu",
    subtitle: "Places and directions",
    icon: "Map",
    level: "A1",
    module: "Maailm ümber",
    canDo: "Ask where something is and understand the directions you are given.",
    blurb: "Estonian answers 'where' and 'where to' with different cases. This is that split.",
    grammar: ["inessive", "illative", "elative", "allative", "adessive", "ablative"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["ostmine", "kodu"],
    words: [
      ["koht", "place"],
      ["kesklinn", "town center"],
      ["väljak", "square"],
      ["sild", "bridge"],
      ["nurk", "corner"],
      ["kool", "school"],
      ["töö", "work"],
      ["haigla", "hospital"],
      ["kirik", "church"],
      ["rand", "beach"],
      ["ülikool", "university"],
      ["kohvik", "café"],
      ["restoran", "restaurant"],
      ["hotell", "hotel"],
      /*
        The can-do promises "understand the directions you are given", and
        neither this unit nor Kohasõnad had a word for left, right or straight
        on. Somebody who has met every building in the town center and cannot
        follow "vasakule, siis otse" has not been taught to follow directions.
        Requests, like every other lemma here.
      */
      ["vasak", "left", "ADJECTIVE"],
      /*
        The adverbs, not the adjective, because that is what a direction is
        given with: "vasakul, siis otse". `parem` was requested first and came
        back as Ekilex 213895, whose note and all four sentences are the
        comparative of `hea`, better: the homonym fault this whole pass is
        about, made while fixing it. `paremal` has no such twin.
      */
      ["vasakul", "on the left", "ADVERB"],
      ["paremal", "on the right", "ADVERB"],
      ["otse", "straight on", "ADVERB"],
      ["edasi", "onwards, further", "ADVERB"],
      ["tagasi", "back", "ADVERB"],
      ["asuma", "to be located"],
      ["mujal", "elsewhere", "ADVERB"],
      ["siia", "to here", "ADVERB"],
    ],
  }),

  /*
    THE WORDS EVERY SENTENCE IS MADE OF, WHICH THE COURSE HAD LEFT OUT.

    Fourteen units of nouns, verbs and adjectives, and no unit for the words
    between them: nobody asking "kes?" or "millal?" or looking up "täna" or
    "peal" found anything, and two of the twelve months were missing from the
    dictionary altogether. These six are appended after the fourteen so that
    the first three units at A1, which is what first run builds a deck from,
    stay what they were. Every lemma is still a request the harvest either
    honors or reports, and a pronoun is harvested as a nominal because it
    declines like one: `kes`, `kelle`, `keda`, and the case table follows.
  */

  unit({
    id: "transport",
    title: "Bussiga linna",
    subtitle: "Getting about town",
    icon: "Bus",
    level: "A1",
    module: "Maailm ümber",
    canDo: "Catch a bus, ask which stop you want, and say how you got somewhere.",
    blurb: "How you travel is the kaasaütlev and nothing else: bussiga, rongiga, jalgrattaga. Getting on and off are the inside cases, bussi and bussist, which is the same split Kus ja kuhu already taught about rooms.",
    /*
      The comitative leads because it is the one ending this whole subject
      turns on and it is regular: the genitive stem plus -ga, on every word in
      the unit. A learner who has met it here can say how they got anywhere.
    */
    grammar: ["comitative", "illative", "elative"],
    cardTypes: ["RECOGNITION", "PRODUCTION", "CONJUGATION"],
    requires: ["kus-ja-kuhu"],
    words: [
      // Ekilex A1, and the course had it at A2. You cannot answer "kuidas sa
      // tulid?" without it.
      ["sõitma", "to travel, to ride"],
      ["tramm", "tram"],
      // Also a creature out of Scandinavian folklore, which Ekilex holds as
      // the second homonym.
      ["troll", "trolleybus", "NOUN", 246753],
      ["takso", "taxi"],
      // The other entry is the state of being at a loss for what to do.
      ["peatus", "stop (bus or tram)", "NOUN", 214917],
      ["bussijaam", "bus station"],
      ["lennujaam", "airport"],
      ["sadam", "port, harbour"],
      ["jalgratas", "bicycle"],
      ["sõit", "a ride, a journey"],
      ["väljuma", "to depart, to leave"],
      ["sisenema", "to go in, to enter"],
      ["väljapääs", "way out, exit"],
      ["sõiduplaan", "timetable"],
      ["hilinema", "to be late"],
      ["ootama", "to wait"],
      ["foor", "traffic light"],
      ["kõnnitee", "pavement, sidewalk"],
      ["jalgsi", "on foot", "ADVERB"],
      ["ühistransport", "public transport"],
    ],
  }),

  unit({
    id: "kusisonad",
    title: "Küsisõnad",
    subtitle: "Question words",
    icon: "CircleHelp",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Ask who, what, where, when, why and how, and follow the question when it comes back.",
    blurb: "Every conversation is a question first. These are the words it starts with.",
    grammar: ["word-order"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["tervitused"],
    words: [
      ["kes", "who", "PRONOUN"],
      ["mis", "what", "PRONOUN"],
      ["kus", "where", "ADVERB"],
      ["kuhu", "where to", "ADVERB"],
      ["kust", "where from", "ADVERB"],
      ["millal", "when", "ADVERB"],
      ["miks", "why", "ADVERB"],
      ["kuidas", "how", "ADVERB"],
      ["kas", "whether (opens a yes or no question)", "ADVERB"],
      ["milline", "which, what kind of", "PRONOUN"],
      ["kumb", "which of the two", "PRONOUN"],
      ["mitu", "how many", "PRONOUN"],
      ["palju", "much, many, a lot", "ADVERB"],
      ["kui", "how, as, if, than", "ADVERB"],
    ],
  }),

  unit({
    id: "umbmaarased",
    title: "Keegi, miski, kõik",
    subtitle: "Somebody, something, everybody",
    icon: "Users",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Say somebody, something, everybody and each, and say that a thing is your own.",
    blurb: "The pronouns that point at nobody in particular. They decline like the personal ones you already have.",
    grammar: ["nominative", "genitive", "partitive"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["asesonad"],
    words: [
      ["ise", "self, myself, yourself", "PRONOUN"],
      ["keegi", "somebody, anybody", "PRONOUN"],
      ["miski", "something, anything", "PRONOUN"],
      ["kõik", "all, everything, everybody", "PRONOUN"],
      ["igaüks", "everyone, each one", "PRONOUN"],
      ["mõni", "some, a few", "PRONOUN"],
      ["iga", "every, each", "PRONOUN", 171378],
      // Three Ekilex entries carry this; 211037 is the possessive.
      ["oma", "one's own", "PRONOUN", 211037],
    ],
  }),

  unit({
    id: "millal",
    title: "Millal ja kui tihti",
    subtitle: "When, and how often",
    icon: "Clock",
    level: "A1",
    module: "Igapäevaelu",
    canDo: "Say when something happens and how often, from today to hardly ever.",
    blurb: "No case endings at all: twenty adverbs that carry half of every plan.",
    grammar: ["time-expressions"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["aeg"],
    words: [
      ["täna", "today", "ADVERB"],
      ["homme", "tomorrow", "ADVERB"],
      ["eile", "yesterday", "ADVERB"],
      ["ülehomme", "the day after tomorrow", "ADVERB"],
      ["üleeile", "the day before yesterday", "ADVERB"],
      ["nüüd", "now", "ADVERB"],
      ["praegu", "right now, at the moment", "ADVERB"],
      ["kohe", "at once, straight away", "ADVERB"],
      ["varsti", "soon", "ADVERB"],
      ["hiljem", "later", "ADVERB"],
      ["alati", "always", "ADVERB"],
      ["tihti", "often", "ADVERB"],
      ["sageli", "often, frequently", "ADVERB"],
      ["harva", "rarely, seldom", "ADVERB"],
      ["mõnikord", "sometimes", "ADVERB"],
      ["kunagi", "ever, at some time; never (with a negative)", "ADVERB"],
      ["juba", "already", "ADVERB"],
      ["veel", "still, yet, more", "ADVERB"],
      ["jälle", "again", "ADVERB"],
      ["ammu", "long ago, for a long time", "ADVERB"],
      ["vanasti", "in the old days, once", "ADVERB"],
      ["taas", "again, once more", "ADVERB"],
    ],
  }),

  unit({
    id: "kohasonad",
    title: "Peal, all, ees, taga",
    subtitle: "Where things are",
    icon: "Compass",
    level: "A1",
    module: "Maailm ümber",
    canDo: "Say what is on, under, in front of, behind and next to what.",
    blurb: "Most of these come after the noun and put it in the omastav: laua peal, not peal laud. A few go in front and ask for another case, and this unit has both.",
    /*
      All four cases this unit's twenty words actually take, not the two it
      used to name. Fifteen of them take the genitive; koos takes the
      comitative, ilma the abessive, and enne, pärast and mööda the partitive.
      A beginner following a unit that named only the genitive writes "ilma
      raha" and "koos sõbra", and the app's own dictionary contradicts the
      unit on the rektsioon of the very words it links to. Each id resolves to
      a case page through `grammarPoint`, so the chips say the Estonian name
      and the question it answers.
    */
    grammar: ["genitive", "adessive", "partitive", "comitative", "abessive"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["kus-ja-kuhu"],
    words: [
      ["peal", "on, on top of", "ADVERB"],
      ["all", "under, below", "ADVERB"],
      ["ees", "in front of", "ADVERB"],
      ["taga", "behind", "ADVERB"],
      ["kõrval", "next to, beside", "ADVERB"],
      ["juures", "at, by, with (a person or a place)", "ADVERB"],
      ["vahel", "between", "ADVERB"],
      ["sees", "inside", "ADVERB"],
      ["keskel", "in the middle of", "ADVERB"],
      ["vastas", "opposite", "ADVERB"],
      ["ümber", "around", "ADVERB"],
      ["üle", "over, across", "ADVERB"],
      ["läbi", "through", "ADVERB"],
      ["koos", "together with", "ADVERB"],
      ["ilma", "without", "ADVERB"],
      ["enne", "before", "ADVERB"],
      ["pärast", "after", "ADVERB"],
      ["lähedal", "near, close to", "ADVERB"],
      ["kohal", "above, over", "ADVERB"],
      ["mööda", "along", "ADVERB"],
      ["alates", "from, starting from", "ADVERB"],
      ["kaasas", "along, with you", "ADVERB"],
      // `valu vastu`, which is how a pharmacist says what a medicine is for.
      ["vastu", "against, for (a pain)", "ADVERB"],
    ],
  }),

  unit({
    id: "sidesonad",
    title: "Sidesõnad",
    subtitle: "Joining two thoughts",
    icon: "Link",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Join two clauses, give a reason, and set one thing against another.",
    blurb: "Estonian puts a comma before et, sest, kui and kes, always, even where English would not.",
    grammar: ["word-order"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["tervitused"],
    words: [
      ["ja", "and", "ADVERB"],
      ["ning", "and (joining the last of a list)", "ADVERB"],
      // Also a noun meaning a troubling circumstance, and a district in Russia.
      ["aga", "but", "ADVERB", 155181],
      ["vaid", "only, and nothing else", "ADVERB"],
      // Also the ISO code for Estonian, which Ekilex holds as a word.
      ["et", "that", "ADVERB", 165201],
      ["sest", "because", "ADVERB"],
      ["kuna", "since, because", "ADVERB"],
      ["ega", "nor", "ADVERB"],
      // The conjunction, not the butter the food unit already teaches.
      ["või", "or", "ADVERB", 258019],
      ["ehk", "perhaps, maybe", "ADVERB"],
      ["kuni", "until", "ADVERB"],
      ["nagu", "like, as", "ADVERB"],
      ["sellepärast", "for that reason", "ADVERB"],
      ["seega", "so, therefore", "ADVERB"],
      ["siis", "then", "ADVERB"],
      ["nii", "so, like this", "ADVERB"],
      ["mitte", "not", "ADVERB", 203249],
      // Ekilex holds the conjunction and the adverb as one word (adv, konj), and the
      // definition, the four usages and the Russian it returns are all the adverb:
      // `Ma ei tundnud teda kuigi hästi`. The gloss names both, so a gap cut from
      // one of those sentences is not cued with a sense it does not carry.
      ["kuigi", "although, not particularly", "ADVERB"],
      // A literary "but", commoner in writing than aga.
      ["ent", "but, however", "ADVERB"],
    ],
  }),

  unit({
    id: "kindlus",
    title: "Kindlasti, vist, äkki",
    subtitle: "How sure you are",
    icon: "MessageCircle",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Agree, disagree, and say how sure you are.",
    blurb: "The small words that say how much you mean it. They used to open the course; they belong here, once there are sentences to put them in.",
    grammar: ["politeness"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["vastused"],
    words: [
      ["kindlasti", "definitely", "ADVERB"],
      ["vist", "probably, I think", "ADVERB"],
      ["äkki", "maybe, suddenly", "ADVERB"],
      ["küll", "indeed, do (an emphasizing word)", "ADVERB", 191080],
      ["eks", "right? (asking for agreement)", "ADVERB"],
      ["tõesti", "really", "ADVERB"],
      ["tegelikult", "actually", "ADVERB"],
      // An adjective, not a particle, and the one word in this unit that
      // declines: `õige, õige, õiget`. Labeled ADVERB it would be harvested
      // formless, get no case table and no case cards, and `npm run
      // audit:senses` says so, because Ekilex calls it `adj`.
      ["õige", "right, correct", "ADJECTIVE"],
    ],
  }),

  unit({
    id: "maaramine",
    title: "Kui palju",
    subtitle: "How much, how often, how far",
    icon: "Gauge",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Say how much of something there is, and how strongly you mean it.",
    blurb: "These are the words that change a sentence without changing a single ending.",
    grammar: ["word-order"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["tervitused"],
    words: [
      ["ka", "also, too", "ADVERB"],
      ["ju", "you know (a softening word)", "ADVERB"],
      ["just", "just, exactly", "ADVERB"],
      ["väga", "very", "ADVERB"],
      ["hästi", "well", "ADVERB"],
      ["ainult", "only", "ADVERB"],
      ["enam", "any more", "ADVERB", 164013],
      ["isegi", "even", "ADVERB"],
      ["ikka", "still, always", "ADVERB"],
      ["rohkem", "more", "ADVERB", 228501],
      // Not the sports league.
      ["liiga", "too (much)", "ADVERB", 194792],
      ["päris", "quite, fairly", "ADVERB"],
      ["natuke", "a little", "ADVERB"],
      ["üldse", "at all", "ADVERB"],
      ["eriti", "especially", "ADVERB"],
      ["sama", "the same", "ADVERB"],
      ["uuesti", "again", "ADVERB"],
      ["varem", "earlier", "ADVERB"],
      ["kaua", "for a long time", "ADVERB"],
      // Not the steel rail a curtain runs along.
      ["siin", "here", "ADVERB", 233338],
      ["siit", "from here", "ADVERB"],
      ["sinna", "to there", "ADVERB"],
      /*
        Two the eval watched a model reach for and the course taught at no
        level. `Kas te elate üksi?` is the second question anybody asks on a
        stairwell, and `rääkige aeglasemalt` is the single most useful
        sentence a learner owns, off an adjective the course already teaches
        and an adverb it did not.

        A third was asked for and did not arrive. `olemas` is how a shop says
        it has the thing (`meil on see olemas`) and Ekilex holds no headword
        for it, so the harvest dropped it and said so, which is the whole
        point of a lemma being a request rather than a fact (ADR-005). It is
        not written in here as a word this project decided on.
      */
      ["üksi", "alone", "ADVERB"],
      ["aeglaselt", "slowly", "ADVERB"],
    ],
  }),
  /*
    WHAT A PERSON ARRIVING IN ESTONIA NEEDS IN THEIR FIRST MONTH, WHICH THE
    COURSE HAD SCATTERED ACROSS THREE LEVELS.

    A1 taught counting to twelve and then jumped to a hundred, so a learner
    who had finished the numbers unit could not say a price, a phone number or
    which floor they live on. It taught `buss`, `rong` and `pilet` inside a
    shopping unit and left the stop, the timetable and the word for being late
    at A2 and B1. It put `abi` at B1 and `aitama` at A2, which is to say that
    asking for help was three units past the point where somebody needs it.
    And the words for introducing yourself sat in four different units at
    three levels.

    The Institute's own judgment is the evidence rather than ours. Every word
    these four units move down carries an A1 proficiency code in Ekilex:
    `abi`, `aitama`, `appi`, `politsei`, `helistama`, `sõitma`, `jalgratas`,
    `ootama` and `aadress` are all A1 there and were A2 or B1 here. Reading
    that back off the same response the forms come from is what makes this a
    correction rather than an opinion.

    Nothing is taken out of the later units. A word may appear in more than one
    and the first in course order is the one that introduces it, so `reisimine`
    still drills `sõitma` while booking a trip and `probleemid` still drills
    `abi` while describing what went wrong. What changes is where a learner
    first meets them.

    Appended after the existing twenty-three so that the first three units at
    A1, which is what first run builds a deck from, stay what they were.
  */

  unit({
    id: "kuud",
    title: "Kuud ja tähtpäevad",
    subtitle: "Months and the days that matter",
    icon: "CalendarRange",
    level: "A1",
    module: "Igapäevaelu",
    canDo: "Name the months, give a date, and say when your birthday is.",
    blurb: "Twelve months, all in the seesütlev when something happens in them: jaanuaris, mais.",
    grammar: ["inessive", "time-expressions"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["aeg"],
    words: [
      ["jaanuar", "January"],
      ["veebruar", "February"],
      ["märts", "March"],
      ["aprill", "April"],
      ["mai", "May"],
      ["juuni", "June"],
      ["juuli", "July"],
      ["august", "August"],
      ["september", "September"],
      ["oktoober", "October"],
      ["november", "November"],
      ["detsember", "December"],
      ["kuupäev", "date"],
      ["sünnipäev", "birthday"],
      ["tähtpäev", "anniversary, special day"],
      ["jaanipäev", "Midsummer Day"],
      ["nädalavahetus", "weekend"],
      ["puhkepäev", "day off"],
    ],
  }),

  unit({
    id: "riigid",
    title: "Riigid ja rahvad",
    subtitle: "Countries and peoples",
    icon: "Landmark",
    level: "A1",
    module: "Maailm ümber",
    canDo: "Say where you are from, what you are, and which language you speak.",
    blurb: "The neighbors first. A nationality ends in -lane. Eesti and Soome take the inside cases, Eestist; the countries ending in -maa take the outside ones, the way the islands do: Saksamaal, Saksamaale, Saksamaalt.",
    grammar: ["elative", "nominative"],
    cardTypes: ["RECOGNITION", "PRODUCTION"],
    requires: ["kus-ja-kuhu"],
    words: [
      ["Eesti", "Estonia"],
      ["Soome", "Finland"],
      ["Läti", "Latvia"],
      ["Venemaa", "Russia"],
      ["Rootsi", "Sweden"],
      ["Saksamaa", "Germany"],
      ["Inglismaa", "England"],
      ["Ameerika", "America"],
      ["Euroopa", "Europe"],
      ["eestlane", "an Estonian"],
      ["soomlane", "a Finn"],
      ["lätlane", "a Latvian"],
      ["venelane", "a Russian"],
      ["rootslane", "a Swede"],
      ["sakslane", "a German"],
      ["inglane", "an English person"],
      ["ameeriklane", "an American"],
      ["välismaalane", "foreigner"],
      ["kodumaa", "homeland"],
      ["rahvus", "nationality"],
      // `Kust sa pärit oled?` is how the question is actually asked, and the
      // dictionary carries that very sentence while teaching no unit the word.
      ["pärit", "originally from", "ADVERB"],
      /*
        `npm run measure:scenes` found the neighbors covered and the
        adjective a language takes not: `vene keel`, not `venelane keel`,
        and Ekilex holds `vene` and `prantsuse` as their own headwords. The
        unit was already at its sitting cap, so this is the room that was
        left rather than the whole of the ranked list.

        Both are the formless class rather than adjectives with a stem:
        Ekilex records the nationality sense of each as muutumatu sõna,
        indeclinable, and the ADJECTIVE path demands a genitive. Labeled that
        way, `vene` first matched a regular noun that happens to be spelled
        the same (a dugout canoe) rather than the word this unit means.
      */
      ["vene", "Russian", "ADVERB", 255516],
      ["prantsuse", "French", "ADVERB"],
      ["Prantsusmaa", "France"],
    ],
  }),

  /*
    THE WORDS BETWEEN THE WORDS, PART TWO.

    Six units were appended here for the words every sentence is made of, and
    a frequency count over a large corpus of film and television subtitles
    said the job was half done: of the four hundred commonest words in
    Estonian, a hundred and twenty-five were ones the dictionary could not
    vouch for in any form, and the top of that list is not exotic. It is `ja`,
    `et`, `aga`, `jah`, `ei`, `ka`, `siis`, `nii` and `väga`: the words that
    hold a sentence together, which a learner meets in their first hour and
    could not look up.

    They are labeled ADVERB for the reason `scripts/harvest-ekilex.ts`
    already gives about the connectives it had: an Estonian adverb does not
    inflect, so demanding a set of forms for one would drop every connective
    in the course, and existing in Ekilex is the whole check that matters.
    The label is a bucket saying which card types a word can take rather than
    a claim that `ja` is an adverb, which is the same latitude `kas` has been
    taking in the question words unit since it was written.

    Three units rather than one, because sixty words in a row is a list
    nobody works through, and because these are three different jobs: joining
    two clauses, answering somebody, and saying how much.
  */

  unit({
    id: "abi",
    title: "Abi küsimine",
    subtitle: "Asking for help, and calling for it",
    icon: "LifeBuoy",
    level: "A1",
    module: "Esimesed sammud",
    canDo: "Ask someone for help, say what has happened, and call the right number for it.",
    blurb: "The unit nobody wants to need and everybody does. Appi is what you shout; abi is what you ask for. The emergency number in Estonia is 112, and it is answered in Estonian, Russian and English.",
    /*
      The imperative, because every sentence in this unit is one: aidake,
      kutsuge, helistage. Politeness beside it, since the difference between
      `aita` and `aidake` is the difference between a friend and a stranger,
      and a learner who gets that wrong at a counter has not been rude by
      accident, they have been taught wrong.
    */
    grammar: ["imperative", "politeness"],
    cardTypes: ["RECOGNITION", "PRODUCTION", "CONJUGATION"],
    requires: ["tervitused"],
    words: [
      // The second entry is the adjective for somebody who is a help to you.
      ["abi", "help", "NOUN", 154673],
      ["aitama", "to help"],
      // Ekilex calls it adv/interj. It does not inflect, so it is harvested
      // the way every other uninflecting word in this course is.
      ["appi", "help! (calling for help)", "ADVERB"],
      ["politsei", "police"],
      ["kiirabi", "ambulance"],
      ["tuletõrje", "fire brigade"],
      ["hädaabi", "emergency aid"],
      ["apteek", "pharmacy"],
      // Not the intensifier, which Ekilex holds as a second entry.
      ["tuli", "fire", "NOUN", 247938],
      ["ohtlik", "dangerous", "ADJECTIVE"],
      ["varas", "thief"],
      ["eksima", "to get lost, to go wrong"],
      ["helistama", "to call, to phone"],
      ["vaja", "necessary, needed", "ADVERB"],
    ],
  }),
] as const;
