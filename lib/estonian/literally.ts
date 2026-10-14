/**
 * WORDS THAT ARE FUNNY ON PURPOSE: COMPOUNDS READ WORD BY WORD, AND WORDS THAT
 * ONLY LOOK ENGLISH.
 *
 * Estonian is already funny to an English speaker, and the funny part is a
 * fact about the language rather than a joke anybody had to write. A bat is a
 * `nahkhiir`, a leather mouse. A turtle is a `kilpkonn`, a shield frog. And `pea`
 * is a head, which is the one thing you must not order at a market. This file
 * is that, kept in one place so the screens that show it cannot say different
 * things about one word: the first meeting of a word (`components/WordIntro.tsx`),
 * the dictionary entry, and the Sõnamäng round (`lib/games/wordplay.ts`).
 *
 * THE ESTONIAN IS CHOSEN AND NEVER WRITTEN (ADR-005). Every word here is a
 * request against the dictionary, the way a syllabus unit's lemmas are, and
 * `literally.test.ts` holds each one to it: the word is an entry the seed
 * writes, every part is either a form the dictionary stores for the entry the
 * part names or a headword Ekilex lists (`prisma/data/wordlist.txt`), the parts
 * spell the word exactly, and where the dictionary glosses a part or the word,
 * the English here shares a word with that gloss. A part is cut out of a word
 * a lexicographer recorded, which is choosing, the latitude
 * `lib/estonian/sayings.ts` takes with a phrase cut out of a sentence.
 *
 * WHAT IS AUTHORED IS ENGLISH, which is the one language this project writes:
 * what each part says on its own, the word-for-word reading, what the word
 * means, and one line about it. The line is where the humour is, and it is held
 * to the standard `docs/18-voice.md` §3c sets for humour: a true fact said with
 * a wink, never a pun for its own sake, never an exclamation mark doing the
 * work, and never at the learner's expense. It names no Estonian word, so the
 * Russian and Ukrainian tables can carry it whole (`lib/copy/i18n/areas/wordplay.ts`).
 *
 * "WORD FOR WORD" MEANS THE SPELLING, NOT THE HISTORY. `lapsepõlv` is a child
 * and a knee because `põlv` is a knee, and it is also a generation, which is
 * what it means in that word. Where the reading is a pun on a second sense
 * rather than the etymology, the line says so, because a learner told a false
 * history of a word has been taught something.
 *
 * Read by a person before it ships. Every row arrives in the pull request
 * that adds it and is read by the native Estonian speaker who develops this
 * app, as the scene bank and the written sentences are.
 *
 * Pure: no React, no Prisma, no network.
 */

/** One piece of a compound. */
export interface WordPart {
  /** The piece exactly as it is spelled inside the word. */
  readonly text: string;
  /** The entry the piece is a form of, or the piece itself where Ekilex lists it as a headword. */
  readonly lemma: string;
  /** What the piece says on its own, in the sense it has inside this word. English. */
  readonly en: string;
  /**
   * The meaning the dictionary gives the entry `lemma` names, where that is a
   * different homonym from the one inside this word. `asesõna` is built on the
   * `ase` that means a stead, as in instead, and the dictionary's `ase` is a
   * bed: reading the part as the dictionary's meaning would be the one false
   * thing a "word for word" line can say. Never shown; it is the evidence
   * the test reads to accept a reading that the entry's own gloss does not.
   */
  readonly notThe?: string;
}

export interface Compound {
  /** Stable and ASCII, so a stored answer or a link survives a respelling. */
  readonly id: string;
  /** The compound, as the dictionary spells its headword. */
  readonly word: string;
  readonly parts: readonly [WordPart, WordPart, ...WordPart[]];
  /** What it says if you read it piece by piece. English, lower case, no quotation marks. */
  readonly literal: string;
  /** What it actually means. English. */
  readonly means: string;
  /** One playful line about it, true and in no need of Estonian. */
  readonly quip: string;
}

export interface FalseFriend {
  readonly id: string;
  /**
   * The Estonian word, spelled exactly like an English one, or for a few
   * (`kool`, `hai`) said like one: `looksLike` is then the English spelling.
   */
  readonly word: string;
  /** What an English reader takes it for. English. */
  readonly looksLike: string;
  /** What it actually means. English. */
  readonly means: string;
  readonly quip: string;
}

const p = (text: string, lemma: string, en: string, notThe?: string): WordPart =>
  (notThe ? { text, lemma, en, notThe } : { text, lemma, en });

/**
 * The compounds, roughly from the commonest word to the rarest, which is the
 * order the round deals them in. A compound earns its place by a literal
 * reading that is surprising, vivid or honest to the point of being funny:
 * `korvpall` is a basket ball in English too and is not here.
 */
export const COMPOUNDS: readonly Compound[] = [
  {
    id: "fridge", word: "külmkapp",
    parts: [p("külm", "külm", "cold"), p("kapp", "kapp", "cupboard")],
    literal: "cold cupboard", means: "fridge",
    quip: "Everything a fridge does, in two words. Estonian saw no need for more.",
  },
  {
    id: "bicycle", word: "jalgratas",
    parts: [p("jalg", "jalg", "foot"), p("ratas", "ratas", "wheel")],
    literal: "foot wheel", means: "bicycle",
    quip: "Two wheels, and the name says whose legs do the work.",
  },
  {
    id: "shoe", word: "jalanõu",
    parts: [p("jala", "jalg", "foot"), p("nõu", "nõu", "dish, vessel")],
    literal: "foot dish", means: "a shoe, any footwear",
    quip: "The second half is a vessel, the word that gives you the dishes you wash. A little bowl for your foot, then.",
  },
  {
    id: "capital", word: "pealinn",
    parts: [p("pea", "pea", "chief, head"), p("linn", "linn", "town")],
    literal: "chief town", means: "capital city",
    quip: "The first half is the head, as in the one in charge. Put the town first and you get its mayor.",
  },
  {
    id: "mayor", word: "linnapea",
    parts: [p("linna", "linn", "town"), p("pea", "pea", "head")],
    literal: "town head", means: "mayor",
    quip: "Every town has one, and on a good day it uses it.",
  },
  {
    id: "marriage", word: "abielu",
    parts: [p("abi", "abi", "help"), p("elu", "elu", "life")],
    literal: "help life", means: "marriage",
    quip: "A life of helping each other. As definitions of marriage go, a sensible one.",
  },
  {
    id: "world", word: "maailm",
    parts: [p("maa", "maa", "land"), p("ilm", "ilm", "realm", "weather")],
    literal: "land realm", means: "world",
    quip: "Alone, the second half is an old word for the world. Today it mostly means the weather, which some days is the whole world.",
  },
  {
    id: "kitten", word: "kassipoeg",
    parts: [p("kassi", "kass", "cat"), p("poeg", "poeg", "son, young one")],
    literal: "cat's son", means: "kitten",
    quip: "The second half is a son, and also the young of any animal. So every kitten is a son, even the daughters.",
  },
  {
    id: "lunch", word: "lõunasöök",
    parts: [p("lõuna", "lõuna", "south, noon"), p("söök", "söök", "food, a meal")],
    literal: "south meal", means: "lunch",
    quip: "The first half means both south and noon, because at noon the sun is in the south.",
  },
  {
    id: "afternoon", word: "pärastlõuna",
    parts: [p("pärast", "pärast", "after"), p("lõuna", "lõuna", "south, noon")],
    literal: "after south", means: "afternoon",
    quip: "The second half is also lunch, so officially the afternoon starts the moment lunch is over.",
  },
  {
    id: "vegetable", word: "köögivili",
    parts: [p("köögi", "köök", "kitchen"), p("vili", "vili", "fruit, produce")],
    literal: "kitchen fruit", means: "vegetable",
    quip: "A fruit that ended up in the kitchen. Ask any tomato how that feels.",
  },
  {
    id: "doorbell", word: "uksekell",
    parts: [p("ukse", "uks", "door"), p("kell", "kell", "clock, bell")],
    literal: "door clock", means: "doorbell",
    quip: "The second half is a clock and a bell at once. This one only ever tells you somebody's at the door.",
  },
  {
    id: "hourglass", word: "liivakell",
    parts: [p("liiva", "liiv", "sand"), p("kell", "kell", "clock")],
    literal: "sand clock", means: "hourglass",
    quip: "It only starts when you turn it upside down, which is more than most clocks ask.",
  },
  {
    id: "weekend", word: "nädalavahetus",
    parts: [p("nädala", "nädal", "week"), p("vahetus", "vahetus", "change, changing")],
    literal: "week change", means: "weekend",
    quip: "The weekend as a shift change between one week and the next. Accurate.",
  },
  {
    id: "day-before-yesterday", word: "üleeile",
    parts: [p("üle", "üle", "over"), p("eile", "eile", "yesterday")],
    literal: "over yesterday", means: "the day before yesterday",
    quip: "One word where English needs four, and it has a twin for the other direction.",
  },
  {
    id: "day-after-tomorrow", word: "ülehomme",
    parts: [p("üle", "üle", "over"), p("homme", "homme", "tomorrow")],
    literal: "over tomorrow", means: "the day after tomorrow",
    quip: "Hop over tomorrow and you land here. Handy for putting things off.",
  },
  {
    id: "date", word: "kuupäev",
    parts: [p("kuu", "kuu", "moon, month"), p("päev", "päev", "day")],
    literal: "moon day", means: "date",
    quip: "The word for month is the word for moon, from when the moon was the calendar.",
  },
  {
    id: "railway", word: "raudtee",
    parts: [p("raud", "raud", "iron"), p("tee", "tee", "road")],
    literal: "iron road", means: "railway",
    quip: "Estonia's first trains ran on one in 1870. The rails have been steel for well over a century, and nobody has suggested renaming it.",
  },
  {
    id: "character", word: "iseloom",
    parts: [p("ise", "ise", "self"), p("loom", "loom", "nature", "animal")],
    literal: "self nature", means: "character (a person's)",
    quip: "Here the second half means your nature. The same word is also an animal, which some characters live up to.",
  },
  {
    id: "fire", word: "tulekahju",
    parts: [p("tule", "tuli", "fire"), p("kahju", "kahju", "damage")],
    literal: "fire damage", means: "fire (one that burns a house down)",
    quip: "A house fire, named after the bill that comes afterwards.",
  },
  {
    id: "ambulance", word: "kiirabi",
    parts: [p("kiir", "kiir", "quick", "ray, beam"), p("abi", "abi", "help")],
    literal: "quick help", means: "ambulance",
    quip: "The first half here is quick, not the ray of light it can also be. Dial 112 and that's what turns up.",
  },
  {
    id: "umbrella", word: "vihmavari",
    parts: [p("vihma", "vihm", "rain"), p("vari", "vari", "shadow, shade")],
    literal: "rain shade", means: "umbrella",
    quip: "In an Estonian summer you may need it for sun and rain on the same day.",
  },
  {
    id: "grape", word: "viinamari",
    parts: [p("viina", "viin", "vodka"), p("mari", "mari", "berry")],
    literal: "vodka berry", means: "grape",
    quip: "The first half is vodka today, but it was borrowed from the German for wine. Wrong drink, right idea.",
  },
  {
    id: "garlic", word: "küüslauk",
    parts: [p("küüs", "küüs", "nail"), p("lauk", "lauk", "allium, onion")],
    literal: "nail onion", means: "garlic",
    quip: "A single clove is still called a nail, which makes peeling one sound worse than it is.",
  },
  {
    id: "roe", word: "kalamari",
    parts: [p("kala", "kala", "fish"), p("mari", "mari", "berry")],
    literal: "fish berry", means: "roe",
    quip: "Not calamari, though it sounds close. Look at roe on a plate and you'll see why.",
  },
  {
    id: "dream", word: "unenägu",
    parts: [p("une", "uni", "sleep"), p("nägu", "nägu", "sight, face")],
    literal: "sleep sight", means: "dream",
    quip: "The second half is the word for a face, but here it means what you see. By breakfast the dream has usually faded.",
  },
  {
    id: "childhood", word: "lapsepõlv",
    parts: [p("lapse", "laps", "child"), p("põlv", "põlv", "knee, generation")],
    literal: "child knee", means: "childhood",
    quip: "The second half means a generation here. It also means a knee, and childhood is mostly grazed knees anyway.",
  },
  {
    id: "deadline", word: "tähtaeg",
    parts: [p("täht", "täht", "mark, fixed point", "letter"), p("aeg", "aeg", "time")],
    literal: "marked time", means: "deadline",
    quip: "The first half is a mark you set on a calendar. It can mean a star too, but deadlines are rarely written in the stars.",
  },
  {
    id: "slow-motion", word: "aegluup",
    parts: [p("aeg", "aeg", "time"), p("luup", "luup", "magnifying glass")],
    literal: "time magnifying glass", means: "slow motion",
    quip: "A magnifying glass held up to time. Quietly one of the loveliest words in the language.",
  },
  {
    id: "schadenfreude", word: "kahjurõõm",
    parts: [p("kahju", "kahju", "damage, pity"), p("rõõm", "rõõm", "joy")],
    literal: "damage joy", means: "schadenfreude",
    quip: "Translated piece by piece from the German, so it's the same mean little joy in another language.",
  },
  {
    id: "volcano", word: "tulemägi",
    parts: [p("tule", "tuli", "fire"), p("mägi", "mägi", "mountain")],
    literal: "fire mountain", means: "volcano",
    quip: "Exactly as alarming as it sounds. Estonia, happily, has none.",
  },
  {
    id: "sunflower", word: "päevalill",
    parts: [p("päeva", "päev", "day"), p("lill", "lill", "flower")],
    literal: "day flower", means: "sunflower",
    quip: "The first half once meant the sun as well as the day, which a sunflower would agree with.",
  },
  {
    id: "cream-puff", word: "tuuletasku",
    parts: [p("tuule", "tuul", "wind"), p("tasku", "tasku", "pocket")],
    literal: "wind pocket", means: "cream puff",
    quip: "Mostly air, wrapped in pastry. The name is just being honest.",
  },
  {
    id: "flatulence", word: "kõhutuul",
    parts: [p("kõhu", "kõht", "stomach"), p("tuul", "tuul", "wind")],
    literal: "stomach wind", means: "breaking wind (flatus)",
    quip: "English calls it wind too. Estonian adds where it blows from.",
  },
  {
    id: "earth", word: "maamuna",
    parts: [p("maa", "maa", "land, earth"), p("muna", "muna", "egg")],
    literal: "land egg", means: "the Earth",
    quip: "The whole planet, as an egg. Handle with care.",
  },
  {
    id: "eyeball", word: "silmamuna",
    parts: [p("silma", "silm", "eye"), p("muna", "muna", "egg")],
    literal: "eye egg", means: "eyeball",
    quip: "Sounds like breakfast, means anatomy.",
  },
  {
    id: "puffball", word: "murumuna",
    parts: [p("muru", "muru", "lawn"), p("muna", "muna", "egg")],
    literal: "lawn egg", means: "puffball (a mushroom)",
    quip: "A mushroom that looks as if somebody lost an egg on the grass.",
  },
  {
    id: "hippo", word: "jõehobu",
    parts: [p("jõe", "jõgi", "river"), p("hobu", "hobu", "horse")],
    literal: "river horse", means: "hippopotamus",
    quip: "The Greek name says the same thing, so nobody gets points for originality.",
  },
  {
    id: "rhino", word: "ninasarvik",
    parts: [p("nina", "nina", "nose"), p("sarvik", "sarvik", "horned one")],
    literal: "nose horned one", means: "rhinoceros",
    quip: "Named for the one thing you'd notice first, from a safe distance.",
  },
  {
    id: "turtle", word: "kilpkonn",
    parts: [p("kilp", "kilp", "shield"), p("konn", "konn", "frog")],
    literal: "shield frog", means: "turtle",
    quip: "A frog that brought its own shield. Nobody argued.",
  },
  {
    id: "toad", word: "kärnkonn",
    parts: [p("kärn", "kärn", "scab"), p("konn", "konn", "frog")],
    literal: "scab frog", means: "toad",
    quip: "Harsh. But you have seen a toad.",
  },
  {
    id: "bat", word: "nahkhiir",
    parts: [p("nahk", "nahk", "skin, leather"), p("hiir", "hiir", "mouse")],
    literal: "leather mouse", means: "bat",
    quip: "Estonian looked at a bat and said exactly what it saw.",
  },
  {
    id: "giraffe", word: "kaelkirjak",
    parts: [p("kael", "kael", "neck"), p("kirjak", "kirjak", "spotted one")],
    literal: "spotted neck one", means: "giraffe",
    quip: "Two facts about a giraffe, and Estonian kept both.",
  },
  {
    id: "guinea-pig", word: "merisiga",
    parts: [p("meri", "meri", "sea"), p("siga", "siga", "pig")],
    literal: "sea pig", means: "guinea pig",
    quip: "It has never seen the sea and it isn't a pig. In fairness, the English one isn't from Guinea either.",
  },
  {
    id: "porcupine", word: "okassiga",
    parts: [p("okas", "okas", "needle, thorn"), p("siga", "siga", "pig")],
    literal: "needle pig", means: "porcupine",
    quip: "Those needles are really hairs, grown stiff. A bad hair day that never ends.",
  },
  {
    id: "raccoon", word: "pesukaru",
    parts: [p("pesu", "pesu", "washing"), p("karu", "karu", "bear")],
    literal: "washing bear", means: "raccoon",
    quip: "It's famous for dunking its food in water first, which is more than some of us manage.",
  },
  {
    id: "echidna", word: "sipelgasiil",
    parts: [p("sipelga", "sipelgas", "ant"), p("siil", "siil", "hedgehog")],
    literal: "ant hedgehog", means: "echidna",
    quip: "It also lays eggs, which the name politely leaves out.",
  },
  {
    id: "platypus", word: "nokkloom",
    parts: [p("nokk", "nokk", "beak"), p("loom", "loom", "animal")],
    literal: "beak animal", means: "platypus",
    quip: "Of all the strange things about a platypus, Estonian went with the beak.",
  },
  {
    id: "owl", word: "öökull",
    parts: [p("öö", "öö", "night"), p("kull", "kull", "hawk")],
    literal: "night hawk", means: "owl",
    quip: "A hawk on the night shift.",
  },
  {
    id: "moth", word: "ööliblikas",
    parts: [p("öö", "öö", "night"), p("liblikas", "liblikas", "butterfly")],
    literal: "night butterfly", means: "moth",
    quip: "A butterfly that keeps late hours and can't fly past a lit window.",
  },
  {
    id: "bookworm", word: "raamatukoi",
    parts: [p("raamatu", "raamat", "book"), p("koi", "koi", "clothes moth")],
    literal: "book moth", means: "bookworm",
    quip: "Same reader, different insect.",
  },
  {
    id: "starling", word: "kuldnokk",
    parts: [p("kuld", "kuld", "gold"), p("nokk", "nokk", "beak")],
    literal: "gold beak", means: "starling",
    quip: "Its beak turns yellow in spring, which may be how it earned the gold.",
  },
  {
    id: "waxwing", word: "siidisaba",
    parts: [p("siidi", "siid", "silk"), p("saba", "saba", "tail")],
    literal: "silk tail", means: "waxwing",
    quip: "Its feathers really are silky. English named it for the wings, Estonian for the tail.",
  },
  {
    id: "razor", word: "habemenuga",
    parts: [p("habeme", "habe", "beard"), p("nuga", "nuga", "knife")],
    literal: "beard knife", means: "razor",
    quip: "Says exactly what it's for, which is reassuring in something that sharp.",
  },
  {
    id: "handkerchief", word: "taskurätik",
    parts: [p("tasku", "tasku", "pocket"), p("rätik", "rätik", "towel")],
    literal: "pocket towel", means: "handkerchief",
    quip: "A towel, cut down to the size of one sneeze.",
  },
  {
    id: "vacuum", word: "tolmuimeja",
    parts: [p("tolmu", "tolm", "dust"), p("imeja", "imeja", "sucker")],
    literal: "dust sucker", means: "vacuum cleaner",
    quip: "No marketing department was consulted.",
  },
  {
    id: "arm", word: "käsivars",
    parts: [p("käsi", "käsi", "hand"), p("vars", "vars", "shaft", "stalk")],
    literal: "hand shaft", means: "arm",
    quip: "A plant's stalk is spelled the same, which makes your hand the flower on top.",
  },
  {
    id: "hanger", word: "riidepuu",
    parts: [p("riide", "riie", "cloth"), p("puu", "puu", "wood", "tree")],
    literal: "cloth wood", means: "clothes hanger",
    quip: "Here the second half is the wood a coat hangs on, but it is also the word for a tree. Picture one that grows coats.",
  },
  {
    id: "ruler", word: "joonlaud",
    parts: [p("joon", "joon", "line"), p("laud", "laud", "table, board")],
    literal: "line board", means: "ruler",
    quip: "The second half is the word for a table, shrunk to fit a pencil case.",
  },
  {
    id: "noun", word: "nimisõna",
    parts: [p("nimi", "nimi", "name"), p("sõna", "sõna", "word")],
    literal: "name word", means: "noun",
    quip: "Your name is one. So is your cat's.",
  },
  {
    id: "verb", word: "tegusõna",
    parts: [p("tegu", "tegu", "deed, doing"), p("sõna", "sõna", "word")],
    literal: "doing word", means: "verb",
    quip: "Grammar that explains itself. Your teacher will be pleased.",
  },
  {
    id: "pronoun", word: "asesõna",
    parts: [p("ase", "ase", "stead, place", "bed"), p("sõna", "sõna", "word")],
    literal: "instead word", means: "pronoun",
    quip: "The first half means in place of, as in instead. So he, she and it are all just standing in for somebody.",
  },
  {
    id: "interjection", word: "hüüdsõna",
    parts: [p("hüüd", "hüüd", "shout"), p("sõna", "sõna", "word")],
    literal: "shout word", means: "interjection",
    quip: "Ouch, wow, hey. Every one of them is meant to be shouted.",
  },
  {
    id: "baseball", word: "pesapall",
    parts: [p("pesa", "pesa", "nest"), p("pall", "pall", "ball")],
    literal: "nest ball", means: "baseball",
    quip: "The bases are nests, which makes running home sound rather cosy.",
  },
  {
    id: "dictionary", word: "sõnaraamat",
    parts: [p("sõna", "sõna", "word"), p("raamat", "raamat", "book")],
    literal: "word book", means: "dictionary",
    quip: "The one book whose name you can look up inside it.",
  },
  {
    id: "snowman", word: "lumememm",
    parts: [p("lume", "lumi", "snow"), p("memm", "memm", "granny")],
    literal: "snow granny", means: "snowman",
    quip: "English builds a snowman. Estonian builds a granny.",
  },
  {
    id: "dandelion", word: "võilill",
    parts: [p("või", "või", "butter"), p("lill", "lill", "flower")],
    literal: "butter flower", means: "dandelion",
    quip: "As yellow as butter, and every lawn in May agrees.",
  },
  {
    id: "grandmother", word: "vanaema",
    parts: [p("vana", "vana", "old"), p("ema", "ema", "mother")],
    literal: "old mother", means: "grandmother",
    quip: "Honest, if not exactly tactful. Best not to translate it for her.",
  },
  {
    id: "spouse", word: "abikaasa",
    parts: [p("abi", "abi", "help"), p("kaasa", "kaasa", "companion", "along (coming with somebody)")],
    literal: "help companion", means: "spouse",
    quip: "The second half alone can already mean a spouse. The help is a promise added on top.",
  },
  {
    id: "zoo", word: "loomaaed",
    parts: [p("looma", "loom", "animal"), p("aed", "aed", "garden")],
    literal: "animal garden", means: "zoo",
    quip: "Planted with animals. Please don't water them.",
  },
  {
    id: "kindergarten", word: "lasteaed",
    parts: [p("laste", "laps", "child"), p("aed", "aed", "garden")],
    literal: "children garden", means: "kindergarten",
    quip: "The German word, translated piece by piece, so the children are still in a garden.",
  },
  {
    id: "dentist", word: "hambaarst",
    parts: [p("hamba", "hammas", "tooth"), p("arst", "arst", "doctor")],
    literal: "tooth doctor", means: "dentist",
    quip: "A doctor for one part of you only, the part that bites. Open wide.",
  },
  {
    id: "wristwatch", word: "käekell",
    parts: [p("käe", "käsi", "hand"), p("kell", "kell", "clock")],
    literal: "hand clock", means: "wristwatch",
    quip: "The wrist doesn't get a mention. In Estonian the hand covers it.",
  },
  {
    id: "torch", word: "taskulamp",
    parts: [p("tasku", "tasku", "pocket"), p("lamp", "lamp", "lamp")],
    literal: "pocket lamp", means: "torch, flashlight",
    quip: "On a December afternoon here, it's the most useful thing in your coat.",
  },
  {
    id: "spiderweb", word: "ämblikuvõrk",
    parts: [p("ämbliku", "ämblik", "spider"), p("võrk", "võrk", "net")],
    literal: "spider net", means: "spiderweb, cobweb",
    quip: "The same word means your phone's network, so every spider is online.",
  },  {
    id: "newspaper", word: "ajaleht",
    parts: [p("aja", "aeg", "time"), p("leht", "leht", "leaf")],
    literal: "time leaf", means: "newspaper",
    quip: "A leaf of the times, fresh every morning and old news by night.",
  },
  {
    id: "toy", word: "mänguasi",
    parts: [p("mängu", "mäng", "game, play"), p("asi", "asi", "thing")],
    literal: "game thing", means: "a toy",
    quip: "Anything at all can be one, as every cardboard box knows.",
  },
  {
    id: "thursday", word: "neljapäev",
    parts: [p("nelja", "neli", "four"), p("päev", "päev", "day")],
    literal: "four day", means: "Thursday",
    quip: "Monday to Thursday are counted off, one to four. Friday gets a name of its own.",
  },
  {
    id: "sandwich", word: "võileib",
    parts: [p("või", "või", "butter"), p("leib", "leib", "bread")],
    literal: "butter bread", means: "a sandwich",
    quip: "The first half also means or, though nobody has ever had to choose between them.",
  },
  {
    id: "cash", word: "sularaha",
    parts: [p("sula", "sula", "melted, thawed"), p("raha", "raha", "money")],
    literal: "melted money", means: "cash",
    quip: "Here the first half is an old word for pure, as in pure gold. The melting is only a pun.",
  },
  {
    id: "signature", word: "allkiri",
    parts: [p("all", "all", "below, underneath"), p("kiri", "kiri", "writing, letter")],
    literal: "under writing", means: "a signature",
    quip: "Where it goes on every form: at the bottom, below everything you agreed to.",
  },
  {
    id: "sunday", word: "pühapäev",
    parts: [p("püha", "püha", "holy"), p("päev", "päev", "day")],
    literal: "holy day", means: "Sunday",
    quip: "English built its word holiday from the same two pieces.",
  },
  {
    id: "pet", word: "lemmikloom",
    parts: [p("lemmik", "lemmik", "favourite"), p("loom", "loom", "animal")],
    literal: "favourite animal", means: "a pet",
    quip: "Ask any owner. There was never a contest.",
  },
  {
    id: "tablet", word: "tahvelarvuti",
    parts: [p("tahvel", "tahvel", "blackboard"), p("arvuti", "arvuti", "computer")],
    literal: "blackboard computer", means: "a tablet",
    quip: "A slate you carry about, which is what schoolchildren once wrote on.",
  },
  {
    id: "season", word: "aastaaeg",
    parts: [p("aasta", "aasta", "year"), p("aeg", "aeg", "time")],
    literal: "year time", means: "a season",
    quip: "One boggy national park in the west claims a fifth, when spring floods turn its roads into rivers.",
  },
  {
    id: "history", word: "ajalugu",
    parts: [p("aja", "aeg", "time"), p("lugu", "lugu", "story")],
    literal: "time story", means: "history",
    quip: "English hides a story inside its word as well, and the two are related.",
  },
  {
    id: "gingerbread", word: "piparkook",
    parts: [p("pipar", "pipar", "pepper"), p("kook", "kook", "cake")],
    literal: "pepper cake", means: "gingerbread",
    quip: "German bakes one under the same name, and both fill a kitchen at Christmas.",
  },
  {
    id: "cousin", word: "onupoeg",
    parts: [p("onu", "onu", "uncle"), p("poeg", "poeg", "son")],
    literal: "uncle son", means: "a cousin",
    quip: "Through an aunt the word changes. Estonian names a cousin by the route to them.",
  },
  {
    id: "driving-licence", word: "juhiluba",
    parts: [p("juhi", "juht", "leader, driver"), p("luba", "luba", "permission")],
    literal: "leader permission", means: "a driving licence",
    quip: "The same first half leads a choir or a company. This permit stops at one car.",
  },
  {
    id: "gym", word: "jõusaal",
    parts: [p("jõu", "jõud", "strength"), p("saal", "saal", "hall")],
    literal: "strength hall", means: "a gym",
    quip: "You go in hoping the name rubs off.",
  },
  {
    id: "headline", word: "pealkiri",
    parts: [p("peal", "peal", "on top of"), p("kiri", "kiri", "writing, letter")],
    literal: "on-top writing", means: "a headline, title",
    quip: "The signature waits at the bottom of the page. This sits at the top, and everything else goes between.",
  },
  {
    id: "armchair", word: "tugitool",
    parts: [p("tugi", "tugi", "support"), p("tool", "tool", "chair")],
    literal: "support chair", means: "an armchair",
    quip: "The seat that props you up on both sides after a long day.",
  },
  {
    id: "coward", word: "argpüks",
    parts: [p("arg", "arg", "shy, timid"), p("püks", "püksid", "trousers")],
    literal: "timid trousers", means: "a coward",
    quip: "English says scaredy-pants. Estonian got there with fewer letters.",
  },
  {
    id: "gem", word: "kalliskivi",
    parts: [p("kallis", "kallis", "dear, expensive"), p("kivi", "kivi", "stone")],
    literal: "dear stone", means: "a gem, jewel",
    quip: "The first half is also what you call your sweetheart, so every gem is a small endearment.",
  },
  {
    id: "page", word: "lehekülg",
    parts: [p("lehe", "leht", "leaf"), p("külg", "külg", "side")],
    literal: "leaf side", means: "a page",
    quip: "Every leaf of a book has two of them, the front and the back.",
  },
  {
    id: "magazine", word: "ajakiri",
    parts: [p("aja", "aeg", "time"), p("kiri", "kiri", "letter, writing")],
    literal: "time letter", means: "a magazine",
    quip: "A letter from the times that turns up every week or month. Nobody ever writes back.",
  },
  {
    id: "cobbler", word: "kingsepp",
    parts: [p("king", "king", "shoe"), p("sepp", "sepp", "smith")],
    literal: "shoe smith", means: "a cobbler",
    quip: "A smith who works in leather rather than iron.",
  },
  {
    id: "cornflower", word: "rukkilill",
    parts: [p("rukki", "rukis", "rye"), p("lill", "lill", "flower")],
    literal: "rye flower", means: "a cornflower",
    quip: "Estonia's national flower, named for the grain fields it grows in.",
  },
  {
    id: "exclamation-mark", word: "hüüumärk",
    parts: [p("hüüu", "hüüd", "shout"), p("märk", "märk", "sign")],
    literal: "shout sign", means: "an exclamation mark",
    quip: "Every sale sign in town has at least one, and usually three.",
  },
  {
    id: "sink-basin", word: "kraanikauss",
    parts: [p("kraani", "kraan", "tap"), p("kauss", "kauss", "bowl")],
    literal: "tap bowl", means: "a sink, washbasin",
    quip: "The bowl that sits under the tap, named the way a plumber would name it.",
  },
  {
    id: "peninsula", word: "poolsaar",
    parts: [p("pool", "pool", "half"), p("saar", "saar", "island")],
    literal: "half island", means: "a peninsula",
    quip: "Latin said almost an island. Estonian settles for half.",
  },
  {
    id: "bra", word: "rinnahoidja",
    parts: [p("rinna", "rind", "chest"), p("hoidja", "hoidja", "holder")],
    literal: "chest holder", means: "a bra",
    quip: "Says what it does and leaves the French at home.",
  },
  {
    id: "proverb", word: "vanasõna",
    parts: [p("vana", "vana", "old"), p("sõna", "sõna", "word")],
    literal: "old word", means: "a proverb",
    quip: "Advice handed down because it kept turning out to be right.",
  },
  {
    id: "easter", word: "lihavõtted",
    parts: [p("liha", "liha", "meat"), p("võtted", "võte", "taking, a way")],
    literal: "meat takings", means: "Easter",
    quip: "After weeks of fasting, this is when meat came back to the table.",
  },
  {
    id: "skull", word: "pealuu",
    parts: [p("pea", "pea", "head"), p("luu", "luu", "bone")],
    literal: "head bone", means: "the skull",
    quip: "As anatomy goes, it saves a great deal of Latin.",
  },
  {
    id: "cotton", word: "puuvill",
    parts: [p("puu", "puu", "tree"), p("vill", "vill", "wool")],
    literal: "tree wool", means: "cotton",
    quip: "Cotton grows on a bush, but the fluff does look like a fleece.",
  },
  {
    id: "greenhouse", word: "kasvuhoone",
    parts: [p("kasvu", "kasv", "growth"), p("hoone", "hoone", "building")],
    literal: "growth building", means: "a greenhouse",
    quip: "Tomatoes do their growing in here while summer is making up its mind.",
  },
  {
    id: "lecturer", word: "õppejõud",
    parts: [p("õppe", "õpe", "study, learning"), p("jõud", "jõud", "strength, force")],
    literal: "learning force", means: "a lecturer, professor",
    quip: "The person powering a lecture hall, or trying to, at nine in the morning.",
  },
  {
    id: "oil-shale", word: "põlevkivi",
    parts: [p("põlev", "põlev", "burning"), p("kivi", "kivi", "stone")],
    literal: "burning stone", means: "oil shale",
    quip: "A rock that burns. Estonia has been digging it up for over a century.",
  },
  {
    id: "nickname", word: "hüüdnimi",
    parts: [p("hüüd", "hüüd", "shout, cry"), p("nimi", "nimi", "name")],
    literal: "shout name", means: "a nickname",
    quip: "The name people call across the playground.",
  },
  {
    id: "deskmate", word: "pinginaaber",
    parts: [p("pingi", "pink", "bench"), p("naaber", "naaber", "neighbour")],
    literal: "bench neighbour", means: "a deskmate",
    quip: "The person you share a school bench with, and on a lucky day their answers.",
  },
  {
    id: "christmas-eve", word: "jõululaupäev",
    parts: [p("jõulu", "jõulud", "Christmas"), p("laupäev", "laupäev", "Saturday")],
    literal: "Christmas Saturday", means: "Christmas Eve",
    quip: "It keeps the name even in years when it falls on a Wednesday.",
  },
  {
    id: "revenge", word: "kättemaks",
    parts: [p("kätte", "käsi", "into the hand"), p("maks", "maks", "payment, tax")],
    literal: "into-hand payment", means: "revenge",
    quip: "English calls it payback, which is the same deal.",
  },
  {
    id: "chapter", word: "peatükk",
    parts: [p("pea", "pea", "head"), p("tükk", "tükk", "piece")],
    literal: "head piece", means: "a chapter",
    quip: "English chapter grew from a Latin word for a little head as well.",
  },
  {
    id: "shelter", word: "varjupaik",
    parts: [p("varju", "vari", "shadow"), p("paik", "paik", "place")],
    literal: "shadow place", means: "a shelter, refuge",
    quip: "Somewhere out of the sun, the rain, or trouble.",
  },
  {
    id: "compound", word: "liitsõna",
    parts: [p("liit", "liit", "union"), p("sõna", "sõna", "word")],
    literal: "union word", means: "a compound",
    quip: "Estonian makes them so freely that this very word is one.",
  },
  {
    id: "pleasure", word: "heameel",
    parts: [p("hea", "hea", "good"), p("meel", "meel", "mind, mood")],
    literal: "good mind", means: "gladness, pleasure",
    quip: "The good mood that makes you say yes to helping before the favour is even explained.",
  },
  {
    id: "conspiracy", word: "vandenõu",
    parts: [p("vande", "vanne", "oath"), p("nõu", "nõu", "advice, a plan")],
    literal: "oath advice", means: "a conspiracy",
    quip: "A plan sworn to in secret, which is the dangerous part.",
  },
  {
    id: "extended-family", word: "suguvõsa",
    parts: [p("sugu", "sugu", "kin, gender"), p("võsa", "võsa", "thicket")],
    literal: "kin thicket", means: "the extended family",
    quip: "English draws a family tree. Estonian lets the whole thing grow wild.",
  },
  {
    id: "pollen", word: "õietolm",
    parts: [p("õie", "õis", "blossom, flower"), p("tolm", "tolm", "dust")],
    literal: "blossom dust", means: "pollen",
    quip: "Every spring it coats the windowsills and sets half the country sneezing.",
  },
  {
    id: "goal", word: "eesmärk",
    parts: [p("ees", "ees", "in front of"), p("märk", "märk", "sign, mark")],
    literal: "front mark", means: "a goal, aim",
    quip: "The mark out ahead of you, which is where an aim belongs.",
  },
  {
    id: "standpoint", word: "vaatenurk",
    parts: [p("vaate", "vaade", "view, look"), p("nurk", "nurk", "corner")],
    literal: "view corner", means: "a standpoint, angle",
    quip: "Stand in another one and the whole room looks different.",
  },
  {
    id: "outlaw", word: "lindprii",
    parts: [p("lind", "lind", "bird"), p("prii", "prii", "free")],
    literal: "bird free", means: "an outlaw",
    quip: "Free as a bird sounds lovely. Borrowed from German, it means nobody has to protect you.",
  },
  {
    id: "mercury", word: "elavhõbe",
    parts: [p("elav", "elav", "lively, living"), p("hõbe", "hõbe", "silver")],
    literal: "living silver", means: "mercury",
    quip: "English once said quicksilver, and quick meant alive back then.",
  },
  {
    id: "july", word: "heinakuu",
    parts: [p("heina", "hein", "hay"), p("kuu", "kuu", "month")],
    literal: "hay month", means: "July",
    quip: "From the folk calendar, when there was hay to make and no time to spare.",
  },
  {
    id: "pin", word: "nööpnõel",
    parts: [p("nööp", "nööp", "button"), p("nõel", "nõel", "needle")],
    literal: "button needle", means: "a pin",
    quip: "A needle with a round head on top, a bit like a button.",
  },
  {
    id: "resentment", word: "pahameel",
    parts: [p("paha", "paha", "bad"), p("meel", "meel", "mood, mind")],
    literal: "bad mind", means: "resentment, displeasure",
    quip: "The grumpy twin of a word that means pleasure.",
  },
  {
    id: "horseshoe", word: "hobuseraud",
    parts: [p("hobuse", "hobune", "horse"), p("raud", "raud", "iron")],
    literal: "horse iron", means: "a horseshoe",
    quip: "Hung over doors for luck across half of Europe.",
  },
  {
    id: "beehive", word: "mesipuu",
    parts: [p("mesi", "mesi", "honey"), p("puu", "puu", "tree")],
    literal: "honey tree", means: "a beehive",
    quip: "The first hives were hollow trees, and the name never moved out.",
  },
  {
    id: "hypocritical", word: "silmakirjalik",
    parts: [p("silma", "silm", "eye"), p("kirjalik", "kirjalik", "written")],
    literal: "eye written", means: "hypocritical",
    quip: "The root of the second half still means a pattern, as on a mitten, so think of a show put on for the eye.",
  },
  {
    id: "february", word: "küünlakuu",
    parts: [p("küünla", "küünal", "candle"), p("kuu", "kuu", "month")],
    literal: "candle month", means: "February",
    quip: "An old name for the month, since Candlemas falls early in it.",
  },
  {
    id: "marionette", word: "hüpiknukk",
    parts: [p("hüpik", "hüpik", "jumper, hopper"), p("nukk", "nukk", "doll")],
    literal: "hopping doll", means: "a marionette",
    quip: "It hops about on strings while somebody above does all the work.",
  },
  {
    id: "orca", word: "mõõkvaal",
    parts: [p("mõõk", "mõõk", "sword"), p("vaal", "vaal", "whale")],
    literal: "sword whale", means: "an orca",
    quip: "That tall fin on its back does look like a blade.",
  },
  {
    id: "special-day", word: "tähtpäev",
    parts: [p("täht", "täht", "mark, fixed point", "letter"), p("päev", "päev", "day")],
    literal: "marked day", means: "a special date, anniversary",
    quip: "The first half is also a star, and such a day often gets one in the diary.",
  },
  {
    id: "amber", word: "merevaik",
    parts: [p("mere", "meri", "sea"), p("vaik", "vaik", "resin")],
    literal: "sea resin", means: "amber",
    quip: "Resin from forests long gone. Now and then a fly is trapped inside.",
  },
  {
    id: "namesake", word: "nimekaim",
    parts: [p("nime", "nimi", "name"), p("kaim", "kaim", "relative")],
    literal: "name relative", means: "a namesake",
    quip: "Two people sharing a name, and related by nothing else.",
  },
  {
    id: "youngest-child", word: "pesamuna",
    parts: [p("pesa", "pesa", "nest"), p("muna", "muna", "egg")],
    literal: "nest egg", means: "the lastborn, youngest child",
    quip: "English uses the same two words for savings. Here they mean the baby of the family.",
  },
  {
    id: "crowbar", word: "sõrgkang",
    parts: [p("sõrg", "sõrg", "cloven hoof"), p("kang", "kang", "bar")],
    literal: "hoof bar", means: "a crowbar",
    quip: "English blamed a crow instead, for the forked end.",
  },
  {
    id: "bumper", word: "põrkeraud",
    parts: [p("põrke", "põrge", "bounce"), p("raud", "raud", "iron")],
    literal: "bounce iron", means: "a bumper",
    quip: "Optimistic about the metal: on a modern car it is mostly plastic.",
  },
  {
    id: "thyme", word: "liivatee",
    parts: [p("liiva", "liiv", "sand"), p("tee", "tee", "tea")],
    literal: "sand tea", means: "wild thyme",
    quip: "It grows on sandy ground and makes a fine herbal brew.",
  },
  {
    id: "cap", word: "nokamüts",
    parts: [p("noka", "nokk", "beak"), p("müts", "müts", "hat")],
    literal: "beak hat", means: "a baseball cap",
    quip: "Seen in profile, the peak sticks out like a bird's.",
  },
  {
    id: "spinal-cord", word: "seljaaju",
    parts: [p("selja", "selg", "back"), p("aju", "aju", "brain")],
    literal: "back brain", means: "the spinal cord",
    quip: "It handles your reflexes before your brain has even heard about it.",
  },
  {
    id: "library", word: "raamatukogu",
    parts: [p("raamatu", "raamat", "book"), p("kogu", "kogu", "the whole, a gathering")],
    literal: "book gathering", means: "a library",
    quip: "The second half also means the whole, so in principle every book. The shelves are working on it.",
  },
  {
    id: "shrew", word: "karihiir",
    parts: [p("kari", "kari", "herd, cattle"), p("hiir", "hiir", "mouse")],
    literal: "herd mouse", means: "a shrew",
    quip: "A shrew keeps no herd whatsoever. The name is a small mystery.",
  },
  {
    id: "forget-me-not", word: "lõosilm",
    parts: [p("lõo", "lõo", "lark"), p("silm", "silm", "eye")],
    literal: "lark eye", means: "a forget-me-not",
    quip: "A tiny blue flower with a bright eye in the middle, small as a bird's.",
  },
  {
    id: "pioneer", word: "teerajaja",
    parts: [p("tee", "tee", "road"), p("rajaja", "rajaja", "founder")],
    literal: "road founder", means: "a pioneer, trailblazer",
    quip: "The second half clears a path or founds a town, and a pioneer does both.",
  },
  {
    id: "department-store", word: "kaubamaja",
    parts: [p("kauba", "kaup", "goods"), p("maja", "maja", "house")],
    literal: "goods house", means: "a department store",
    quip: "A whole house of things to buy, floor after floor.",
  },
  {
    id: "glowworm", word: "jaaniuss",
    parts: [p("jaani", "jaan", "Midsummer"), p("uss", "uss", "worm")],
    literal: "Midsummer worm", means: "a glowworm",
    quip: "It lights up in June, around Midsummer, and that is all its name says.",
  },
  {
    id: "crown", word: "pealagi",
    parts: [p("pea", "pea", "head"), p("lagi", "lagi", "ceiling")],
    literal: "head ceiling", means: "the crown",
    quip: "The very top of you, where a room keeps its ceiling.",
  },
  {
    id: "infinitive", word: "tegevusnimi",
    parts: [p("tegevus", "tegevus", "activity"), p("nimi", "nimi", "name")],
    literal: "activity name", means: "the infinitive",
    quip: "Latin named it the unbounded form, since it belongs to no person and no tense. Estonian is less poetic.",
  },
  {
    id: "hammock", word: "võrkkiik",
    parts: [p("võrk", "võrk", "net"), p("kiik", "kiik", "swing")],
    literal: "net swing", means: "a hammock",
    quip: "Built for summer afternoons with nothing planned.",
  },
  {
    id: "loofah", word: "käsnkõrvits",
    parts: [p("käsn", "käsn", "sponge"), p("kõrvits", "kõrvits", "pumpkin")],
    literal: "sponge pumpkin", means: "a loofah",
    quip: "A loofah grows as a gourd before it ends up in the shower.",
  },
  {
    id: "reindeer", word: "põhjapõder",
    parts: [p("põhja", "põhi", "north"), p("põder", "põder", "elk, moose")],
    literal: "north elk", means: "a reindeer",
    quip: "The only deer whose females grow antlers too.",
  },
  {
    id: "nacre", word: "pärlmutter",
    parts: [p("pärl", "pärl", "pearl"), p("mutter", "mutter", "nut (for a bolt)")],
    literal: "pearl nut", means: "nacre",
    quip: "Borrowed whole from German, where it is pearl mother. German calls a nut a mother too, which is where the hardware came from.",
  },
  {
    id: "waist", word: "vöökoht",
    parts: [p("vöö", "vöö", "belt"), p("koht", "koht", "place")],
    literal: "belt place", means: "the waist",
    quip: "Where a belt goes, and where a tailor's tape goes too.",
  },
  {
    id: "adjective", word: "omadussõna",
    parts: [p("omadus", "omadus", "quality"), p("sõna", "sõna", "word")],
    literal: "quality word", means: "an adjective",
    quip: "Words like tall, green and grumpy, which describe what things are like.",
  },
  {
    id: "foundry", word: "valukoda",
    parts: [p("valu", "valu", "pain"), p("koda", "koda", "chamber, hallway")],
    literal: "pain chamber", means: "a foundry",
    quip: "Here the first half means casting molten metal. Its other meaning is pain, as foundry workers could tell you.",
  },
  {
    id: "pupil", word: "silmatera",
    parts: [p("silma", "silm", "eye"), p("tera", "tera", "blade, grain")],
    literal: "eye grain", means: "the pupil",
    quip: "It also means the person you love most, and the English apple of the eye first meant the pupil too.",
  },
  {
    id: "guesthouse", word: "võõrastemaja",
    parts: [p("võõraste", "võõras", "the unfamiliar, strangers"), p("maja", "maja", "house")],
    literal: "strangers' house", means: "a guesthouse, inn",
    quip: "You check in a stranger and leave a guest.",
  },
  {
    id: "kettle", word: "veekeetja",
    parts: [p("vee", "vesi", "water"), p("keetja", "keetja", "boiler")],
    literal: "water boiler", means: "a kettle",
    quip: "Every office has one, and every office argues about who refills it.",
  },
  {
    id: "rifle", word: "vintpüss",
    parts: [p("vint", "vint", "finch"), p("püss", "püss", "gun")],
    literal: "finch gun", means: "a rifle",
    quip: "The first half here is the spiral groove cut inside the barrel. It is a finch too, oddly.",
  },
  {
    id: "burglar", word: "murdvaras",
    parts: [p("murd", "murd", "breaking, fracture"), p("varas", "varas", "thief")],
    literal: "break thief", means: "a burglar",
    quip: "English says housebreaker, which is the same idea with the house left in.",
  },
  {
    id: "gooseberry", word: "karusmari",
    parts: [p("karus", "karus", "furry"), p("mari", "mari", "berry")],
    literal: "furry berry", means: "a gooseberry",
    quip: "Look closely and the skin is a little hairy. English blamed a goose instead.",
  },
  {
    id: "werewolf", word: "libahunt",
    parts: [p("liba", "liba", "fake"), p("hunt", "hunt", "wolf")],
    literal: "fake wolf", means: "a werewolf",
    quip: "Folklore agrees it's no real wolf: there is a person underneath.",
  },
  {
    id: "fern", word: "sõnajalg",
    parts: [p("sõna", "sõna", "word"), p("jalg", "jalg", "foot, leg")],
    literal: "word foot", means: "a fern",
    quip: "Why a fern should stand on a word is anybody's guess.",
  },
  {
    id: "allspice", word: "nelkpipar",
    parts: [p("nelk", "nelk", "carnation, clove"), p("pipar", "pipar", "pepper")],
    literal: "carnation pepper", means: "allspice, pimento",
    quip: "The first half is a clove as well, and clove is much of what allspice tastes of.",
  },
  {
    id: "archer", word: "vibukütt",
    parts: [p("vibu", "vibu", "bow"), p("kütt", "kütt", "hunter")],
    literal: "bow hunter", means: "an archer",
    quip: "Robin Hood, summed up.",
  },
  {
    id: "aphid", word: "lehetäi",
    parts: [p("lehe", "leht", "leaf"), p("täi", "täi", "louse")],
    literal: "leaf louse", means: "an aphid",
    quip: "Gardeners have stronger words for them.",
  },
  {
    id: "quarter", word: "veerand",
    parts: [p("vee", "vesi", "water"), p("rand", "rand", "beach")],
    literal: "water beach", means: "a quarter",
    quip: "Spelled like water and a beach, which is pure coincidence. Nobody swims in a quarter.",
  },
  {
    id: "bookmark", word: "järjehoidja",
    parts: [p("järje", "järg", "one's place in a row"), p("hoidja", "hoidja", "keeper")],
    literal: "place keeper", means: "a bookmark",
    quip: "It holds your place until you come back to the story.",
  },
];

/**
 * Words spelled exactly like an English word, or said like one, and meaning
 * something else. A word whose `looksLike` is spelled differently is labelled
 * as sounding English rather than looking it (`friendLabel`), so the screen
 * never promises a spelling the word does not have.
 * Common words first, since meeting `pea` on a market stall is the moment this
 * is for.
 */
export const FALSE_FRIENDS: readonly FalseFriend[] = [
  {
    id: "pea", word: "pea", looksLike: "pea", means: "head",
    quip: "Tell a doctor your pea hurts and they'll check your head, not your soup.",
  },
  {
    id: "kool", word: "kool", looksLike: "cool", means: "school",
    quip: "Most teenagers would say it can't be both.",
  },
  {
    id: "must", word: "must", looksLike: "must", means: "black",
    quip: "For some people a black coffee is a must before anything else.",
  },
  {
    id: "all", word: "all", looksLike: "all", means: "under, below",
    quip: "Under the sofa is where everything ends up eventually.",
  },
  {
    id: "tool", word: "tool", looksLike: "tool", means: "chair",
    quip: "The one thing in a long meeting nobody complains about.",
  },
  {
    id: "seen", word: "seen", looksLike: "seen", means: "mushroom",
    quip: "It's what people head into the forest for every autumn, basket in hand.",
  },
  {
    id: "kook", word: "kook", looksLike: "cook", means: "cake",
    quip: "Somebody else did the cooking. You just eat it.",
  },
  {
    id: "sink", word: "sink", looksLike: "sink", means: "ham",
    quip: "Order a sink sandwich with confidence. You'll get ham.",
  },
  {
    id: "vend", word: "vend", looksLike: "vend", means: "brother",
    quip: "He might still have a snack for you.",
  },
  {
    id: "hunt", word: "hunt", looksLike: "hunt", means: "wolf",
    quip: "To be fair, it is the one doing the hunting.",
  },
  {
    id: "luu", word: "luu", looksLike: "loo", means: "bone",
    quip: "Ask for the toilet by name. It saves everybody a confusing minute.",
  },
  {
    id: "hai", word: "hai", looksLike: "hi", means: "shark",
    quip: "If you ever meet one, a wave from the shore is plenty.",
  },
  {
    id: "hind", word: "hind", looksLike: "hind", means: "price",
    quip: "It comes up at every till, usually just before you wince.",
  },
  {
    id: "tee", word: "tee", looksLike: "tee", means: "road, tea",
    quip: "Which one depends on the sentence, and golf never comes into it.",
  },
  {
    id: "pall", word: "pall", looksLike: "pall", means: "ball",
    quip: "In English it's a cloud of gloom. This one bounces.",
  },
  {
    id: "tore", word: "tore", looksLike: "tore", means: "great, lovely",
    quip: "Say it about somebody's cooking and you'll be asked back.",
  },
  {
    id: "pill", word: "pill", looksLike: "pill", means: "musical instrument",
    quip: "Plenty of people would call music a kind of medicine.",
  },
  {
    id: "torn", word: "torn", looksLike: "torn", means: "tower",
    quip: "If it's torn as well, something has gone very wrong with the building.",
  },
  {
    id: "vale", word: "vale", looksLike: "vale", means: "wrong, false",
    quip: "It can also mean a lie. English keeps vale for poems about valleys.",
  },
  {
    id: "veri", word: "veri", looksLike: "very", means: "blood",
    quip: "It does sound very dramatic.",
  },
  {
    id: "scar", word: "arm", looksLike: "arm", means: "scar",
    quip: "Fall off a bike and you may come home with one on your arm. Then both words fit.",
  },
  {
    id: "kits", word: "kits", looksLike: "kits", means: "goat",
    quip: "Just the one goat, and no assembly required.",
  },
  {
    id: "kast", word: "kast", looksLike: "cast", means: "box",
    quip: "Moving house takes dozens of them. Not one of them can act.",
  },
  {
    id: "tuba", word: "tuba", looksLike: "tuba", means: "room",
    quip: "A tuba would fill one nicely.",
  },
  {
    id: "seal", word: "seal", looksLike: "seal", means: "there",
    quip: "Point at one on the rocks and the word is right either way.",
  },
  {
    id: "pool", word: "pool", looksLike: "pool", means: "half, side",
    quip: "Order half a cake and nobody will hand you a towel.",
  },
  {
    id: "mood", word: "mood", looksLike: "mood", means: "fashion",
    quip: "The right coat can do wonders for your mood as well.",
  },  {
    id: "pink", word: "pink", looksLike: "pink", means: "bench",
    quip: "Paint one rose-coloured and you've covered both meanings.",
  },
  {
    id: "sai", word: "sai", looksLike: "sigh", means: "white bread",
    quip: "Breathe out at a bakery counter and you've half ordered a loaf.",
  },
  {
    id: "laud", word: "laud", looksLike: "laud", means: "table",
    quip: "Set a good one for your guests and they will praise you to the skies.",
  },
  {
    id: "king", word: "king", looksLike: "king", means: "shoe",
    quip: "Cinderella lost one and became royalty.",
  },
  {
    id: "lai", word: "lai", looksLike: "lie", means: "wide",
    quip: "Anglers use it about the one that got away, and the look-alike too.",
  },
  {
    id: "laps", word: "laps", looksLike: "laps", means: "child",
    quip: "One will happily run them round the garden all afternoon.",
  },
  {
    id: "lips", word: "lips", looksLike: "lips", means: "tie, necktie",
    quip: "Worn a little lower down, from the collar to the belt.",
  },
  {
    id: "rand", word: "rand", looksLike: "rand", means: "beach",
    quip: "In South Africa it's money. Here it's sand and the Baltic.",
  },
  {
    id: "hall", word: "hall", looksLike: "hall", means: "grey",
    quip: "It is frost as well. An unheated hall in January manages both at once.",
  },
  {
    id: "kuu", word: "kuu", looksLike: "coo", means: "moon, month",
    quip: "Lovers coo under it about once a month, give or take.",
  },
  {
    id: "see", word: "see", looksLike: "see", means: "this, it",
    quip: "English see points with the eyes. This one points with a finger.",
  },
  {
    id: "tort", word: "tort", looksLike: "tort", means: "layer cake",
    quip: "Lawyers in Estonia have one at birthdays, like everybody else.",
  },
  {
    id: "suu", word: "suu", looksLike: "sue", means: "mouth",
    quip: "Open it carefully, before anybody decides to take you to court.",
  },
  {
    id: "loss", word: "loss", looksLike: "loss", means: "castle",
    quip: "Owning one would be anything but.",
  },
  {
    id: "miks", word: "miks", looksLike: "mix", means: "why",
    quip: "Muddle up a sentence and somebody will ask this.",
  },
  {
    id: "tall", word: "tall", looksLike: "tall", means: "lamb",
    quip: "The newest member of the flock, which is short by any measure.",
  },
  {
    id: "rong", word: "rong", looksLike: "wrong", means: "train",
    quip: "Board the incorrect one and the trip gets longer than you planned.",
  },
  {
    id: "lukk", word: "lukk", looksLike: "look", means: "lock",
    quip: "Give the door one last glance before you leave.",
  },
  {
    id: "siis", word: "siis", looksLike: "cease", means: "then",
    quip: "It never stops anything. It only leads on to what comes next.",
  },
  {
    id: "lend", word: "lend", looksLike: "lend", means: "flight",
    quip: "No airline will lend you one. It is paid for before you board.",
  },
  {
    id: "pruun", word: "pruun", looksLike: "prune", means: "brown",
    quip: "Dried plums are this colour, which helps it stick.",
  },
  {
    id: "till", word: "till", looksLike: "till", means: "dill",
    quip: "Till the garden in May and you'll have it on new potatoes by July.",
  },
  {
    id: "nii", word: "nii", looksLike: "knee", means: "so, like this",
    quip: "Show how a thing is done and say it. Kneeling is optional.",
  },
  {
    id: "kallis", word: "kallis", looksLike: "callous", means: "dear, expensive",
    quip: "The look-alike means unfeeling, the very last thing to call somebody you love.",
  },
  {
    id: "mull", word: "mull", looksLike: "mull", means: "bubble",
    quip: "Blow one and watch it think things over before it pops.",
  },
  {
    id: "ammu", word: "ammu", looksLike: "ammo", means: "long ago",
    quip: "Grandparents load their best stories with it.",
  },
  {
    id: "kivi", word: "kivi", looksLike: "kiwi", means: "stone",
    quip: "Bite into one and you'll soon find out it isn't fruit.",
  },
  {
    id: "pull", word: "pull", looksLike: "pull", means: "bull",
    quip: "Grab one by the horns and you'll be doing a lot of that too.",
  },
  {
    id: "vali", word: "vali", looksLike: "valley", means: "loud",
    quip: "Shout across one and the echo agrees with you.",
  },
  {
    id: "mis", word: "mis", looksLike: "miss", means: "what",
    quip: "Fail to catch a word and this is what you'll ask.",
  },
  {
    id: "hull", word: "hull", looksLike: "hull", means: "crazy, mad",
    quip: "Weeks at sea inside one can do that to a sailor.",
  },
  {
    id: "tädi", word: "tädi", looksLike: "teddy", means: "aunt",
    quip: "Some are as cuddly as the bear.",
  },
  {
    id: "kauss", word: "kauss", looksLike: "cows", means: "bowl",
    quip: "A farm would need an enormous one for the herd.",
  },
  {
    id: "hell", word: "hell", looksLike: "hell", means: "gentle, tender",
    quip: "Its look-alike is the hottest place going. This one is a soft touch.",
  },
  {
    id: "luud", word: "luud", looksLike: "lewd", means: "broom",
    quip: "Nothing scandalous goes on with it, unless you count sweeping.",
  },
  {
    id: "hani", word: "hani", looksLike: "honey", means: "goose",
    quip: "Geese are many things, but sweet is rarely one of them.",
  },
  {
    id: "pant", word: "pant", looksLike: "pant", means: "pledge, deposit",
    quip: "Lug the empties back to the shop and you'll pant, but you get it back.",
  },
  {
    id: "mutt", word: "mutt", looksLike: "mutt", means: "mole",
    quip: "It digs up gardens, which a dog might also do.",
  },
  {
    id: "sool", word: "sool", looksLike: "soul", means: "salt",
    quip: "Good for the soup and, some cooks swear, the soul.",
  },
  {
    id: "vats", word: "vats", looksLike: "vats", means: "belly",
    quip: "After a big dinner it can feel the size of a barrel.",
  },
  {
    id: "laut", word: "laut", looksLike: "lout", means: "cowshed, barn",
    quip: "The cows live in here, whatever their manners.",
  },
  {
    id: "koi", word: "koi", looksLike: "koi", means: "clothes moth",
    quip: "Keep your woollens well away from this one. The pond fish is harmless.",
  },
  {
    id: "lint", word: "lint", looksLike: "lint", means: "ribbon, tape",
    quip: "It ties up presents instead of clogging the dryer.",
  },
  {
    id: "kruus", word: "kruus", looksLike: "cruise", means: "gravel",
    quip: "It is also a mug, which is the half you would rather be handed on a cruise.",
  },
  {
    id: "ämber", word: "ämber", looksLike: "amber", means: "bucket",
    quip: "A bucket of the precious stuff would be worth a fortune.",
  },
  {
    id: "tint", word: "tint", looksLike: "tint", means: "smelt, a small fish",
    quip: "Its tint is silver, and spring brings it to the frying pan by the plateful.",
  },
  {
    id: "peal", word: "peal", looksLike: "peal", means: "on top of",
    quip: "Church bells ring from up there, which suits the look-alike.",
  },
  {
    id: "jook", word: "jook", looksLike: "yoke", means: "drink",
    quip: "Far lighter than what oxen wear, and better company once evening comes.",
  },
  {
    id: "mutter", word: "mutter", looksLike: "mutter", means: "nut (for a bolt)",
    quip: "Tighten it properly and nobody grumbles under their breath.",
  },
  {
    id: "vann", word: "vann", looksLike: "van", means: "bath, bathtub",
    quip: "Fit one inside a van and you'd have a camper.",
  },
  {
    id: "keel", word: "keel", looksLike: "keel", means: "language, tongue",
    quip: "The English one keeps a ship on course. This one keeps a conversation going.",
  },
  {
    id: "part", word: "part", looksLike: "part", means: "duck",
    quip: "Every pond has one or two playing their part.",
  },
  {
    id: "male", word: "male", looksLike: "male", means: "chess",
    quip: "Kings and queens both play, so the look-alike gets it only half right.",
  },
  {
    id: "vein", word: "vein", looksLike: "vein", means: "wine",
    quip: "Red runs through the English one too.",
  },
  {
    id: "manner", word: "manner", looksLike: "manner", means: "continent",
    quip: "Each has its own, as anybody who has crossed one will tell you.",
  },
  {
    id: "menu", word: "menu", looksLike: "menu", means: "success",
    quip: "Behind many a restaurant's, there is a good menu.",
  },
  {
    id: "mall", word: "mall", looksLike: "mall", means: "protractor",
    quip: "Found in pencil cases, not on the edge of town.",
  },
  {
    id: "lame", word: "lame", looksLike: "lame", means: "flat",
    quip: "A flat joke is a lame one in English too, so the two do meet.",
  },
  {
    id: "auk", word: "auk", looksLike: "auk", means: "hole",
    quip: "The great auk died out long ago and left one in the list of birds.",
  },
  {
    id: "seller", word: "seller", looksLike: "seller", means: "celery",
    quip: "Say English celery aloud and you hear seller with a little extra on the end.",
  },
  {
    id: "soon", word: "soon", looksLike: "soon", means: "vein",
    quip: "A nurse will find one, sooner or later.",
  },
  {
    id: "last", word: "last", looksLike: "last", means: "cargo",
    quip: "The last thing a ship wants is to lose it overboard.",
  },
  {
    id: "keep", word: "keep", looksLike: "keep", means: "cloak",
    quip: "A good one keeps the rain off.",
  },
  {
    id: "pale", word: "pale", looksLike: "pale", means: "cheek",
    quip: "Turn pale and it shows there first.",
  },
  {
    id: "purse", word: "purse", looksLike: "purse", means: "outburst",
    quip: "Lose your purse and you may well have one.",
  },
  {
    id: "maks", word: "maks", looksLike: "max", means: "tax",
    quip: "The same word is your liver, and neither enjoys being squeezed to the max.",
  },
];

const COMPOUND_BY_WORD: ReadonlyMap<string, Compound> = new Map(COMPOUNDS.map((c) => [c.word, c]));
const FRIEND_BY_WORD: ReadonlyMap<string, FalseFriend> = new Map(FALSE_FRIENDS.map((f) => [f.word, f]));

/** The compound filed under this headword, if there is one. */
export function compoundFor(lemma: string): Compound | null {
  return COMPOUND_BY_WORD.get(lemma) ?? null;
}

/** The false friend filed under this headword, if there is one. */
export function falseFriendFor(lemma: string): FalseFriend | null {
  return FRIEND_BY_WORD.get(lemma) ?? null;
}

/**
 * What a screen showing one word can say about it that is fun: the literal
 * reading of a compound, or the warning on a false friend, with its line.
 *
 * One shape for both, so the first meeting and the dictionary entry draw one
 * thing rather than knowing about two tables. `label` is the short heading the
 * line goes under; `reading` is the bit in quotation marks: the
 * word-for-word reading of a compound, or the English a false friend is not. Null where the word
 * has nothing, which is nearly every word, and is the point: a joke on every
 * card is no joke at all.
 */
export interface WordFun {
  readonly kind: "compound" | "false-friend";
  readonly label: string;
  readonly reading: string;
  readonly quip: string;
}

/** What the screen calls a false friend: one spelled like English, or only said like it. */
export function friendLabel(friend: Pick<FalseFriend, "word" | "looksLike">): string {
  return friend.word === friend.looksLike ? "Looks English, isn't" : "Sounds English, isn't";
}

export function wordFunFor(lemma: string, gloss: string | null): WordFun | null {
  const compound = compoundFor(lemma);
  if (compound && meansWhatIsShown(compound.means, gloss)) {
    return { kind: "compound", label: "Word for word", reading: compound.literal, quip: compound.quip };
  }
  const friend = falseFriendFor(lemma);
  if (friend && meansWhatIsShown(friend.means, gloss)) {
    return { kind: "false-friend", label: friendLabel(friend), reading: friend.looksLike, quip: friend.quip };
  }
  return null;
}

/**
 * WHETHER THE JOKE IS ABOUT THE WORD ON THE SCREEN.
 *
 * A headword can carry two senses, and a line about one of them under the
 * other is the app telling a learner something false about the word in front
 * of them: "Half, not somewhere to swim" belongs to `pool` the half, and a
 * screen glossing another sense of it gets nothing. So a screen hands in the
 * gloss it is printing and the line is drawn only where that gloss and the
 * line's own meaning share a word. A screen with no gloss to hand gets no
 * line, since it cannot say which sense it is showing.
 */
function meansWhatIsShown(means: string, gloss: string | null | undefined): boolean {
  if (!gloss) return false;
  const shown = contentWords(gloss);
  for (const w of contentWords(means)) if (shown.has(w)) return true;
  return false;
}

/** The spellings American and British English disagree on, folded so two glosses can be compared. */
const SPELLING: Readonly<Record<string, string>> = { grey: "gray", racoon: "raccoon", neighbour: "neighbor", colour: "color", favourite: "favorite" };
const FILLER = new Set(["a", "an", "the", "of", "or", "and", "any", "one", "who", "that", "it", "is", "to", "in", "on", "for", "with", "somebody"]);

/** The words of a line of English that carry meaning, lower case and folded. */
export function contentWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 1 && !FILLER.has(w)).map((w) => SPELLING[w] ?? w),
  );
}
