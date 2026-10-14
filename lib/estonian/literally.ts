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
  /** The Estonian word, spelled exactly like an English one. */
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
    quip: "A cupboard that's cold. Estonian saw no need to say more.",
  },
  {
    id: "bicycle", word: "jalgratas",
    parts: [p("jalg", "jalg", "foot"), p("ratas", "ratas", "wheel")],
    literal: "foot wheel", means: "bicycle",
    quip: "Wheels you turn with your feet. Hard to argue with.",
  },
  {
    id: "shoe", word: "jalanõu",
    parts: [p("jala", "jalg", "foot"), p("nõu", "nõu", "dish, vessel")],
    literal: "foot dish", means: "a shoe, any footwear",
    quip: "The second half is a vessel, the same word that gives you the dishes you wash. A little bowl for your foot, then.",
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
    quip: "The head of the town. Put the head first and you get the capital.",
  },
  {
    id: "marriage", word: "abielu",
    parts: [p("abi", "abi", "help"), p("elu", "elu", "life")],
    literal: "help life", means: "marriage",
    quip: "Read as it looks today, a life of help. The first half is really an old word for marriage, which comes to much the same thing.",
  },
  {
    id: "spouse", word: "abikaasa",
    parts: [p("abi", "abi", "help"), p("kaasa", "kaasa", "companion", "along (coming with somebody)")],
    literal: "help companion", means: "spouse",
    quip: "Both halves are old words, one for marriage and one for a companion. Read as they look today, a help companion. Romantic, in a practical way.",
  },
  {
    id: "world", word: "maailm",
    parts: [p("maa", "maa", "land"), p("ilm", "ilm", "air, sky", "weather")],
    literal: "land and air", means: "world",
    quip: "The second half still means the world in a few old phrases. Today it mostly means the weather, which some days is the whole world.",
  },
  {
    id: "kitten", word: "kassipoeg",
    parts: [p("kassi", "kass", "cat"), p("poeg", "poeg", "son, young one")],
    literal: "cat's son", means: "kitten",
    quip: "The second half is a son, and also the young of any animal. So every kitten counts, even the daughters.",
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
    quip: "After noon, not after the south. Though on a map you'd be in Latvia.",
  },
  {
    id: "vegetable", word: "köögivili",
    parts: [p("köögi", "köök", "kitchen"), p("vili", "vili", "fruit")],
    literal: "kitchen fruit", means: "vegetable",
    quip: "A fruit that ended up in the kitchen. Ask any tomato how that feels.",
  },
  {
    id: "doorbell", word: "uksekell",
    parts: [p("ukse", "uks", "door"), p("kell", "kell", "clock, bell")],
    literal: "door clock", means: "doorbell",
    quip: "One word does clocks and bells, so the door gets a clock.",
  },
  {
    id: "hourglass", word: "liivakell",
    parts: [p("liiva", "liiv", "sand"), p("kell", "kell", "clock")],
    literal: "sand clock", means: "hourglass",
    quip: "Sand that tells the time. Slowly, and only once you turn it over.",
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
    id: "umbrella", word: "vihmavari",
    parts: [p("vihma", "vihm", "rain"), p("vari", "vari", "shadow, shade")],
    literal: "rain shade", means: "umbrella",
    quip: "Shade, but for rain. In an Estonian summer you may need it for sun and rain on the same day.",
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
    quip: "Not calamari, though it sounds close. Fish berries is exactly what roe looks like on a plate.",
  },
  {
    id: "dream", word: "unenägu",
    parts: [p("une", "uni", "sleep"), p("nägu", "nägu", "sight, face")],
    literal: "sleep sight", means: "dream",
    quip: "The second half is the word for a face, but here it is the older sense of what you see. Either way it's gone by breakfast.",
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
    quip: "The first half is a mark, the kind you set on a calendar. It also means a star, but deadlines are rarely written in the stars.",
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
    quip: "English calls it wind too. Estonian just says where it blows from.",
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
    quip: "The Greek says nose horn too. Some animals only need describing once.",
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
    quip: "A pig with needles. Hugs at your own risk.",
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
    quip: "Looks like a hedgehog, eats ants. Case closed.",
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
    quip: "A butterfly that keeps late hours and loves a light.",
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
    id: "vacuum", word: "tolmuimeja",
    parts: [p("tolmu", "tolm", "dust"), p("imeja", "imeja", "sucker")],
    literal: "dust sucker", means: "vacuum cleaner",
    quip: "No marketing department was consulted.",
  },
  {
    id: "arm", word: "käsivars",
    parts: [p("käsi", "käsi", "hand"), p("vars", "vars", "shaft, stalk")],
    literal: "hand shaft", means: "arm",
    quip: "The second half is a shaft, the same word as a plant's stalk. Your hand grows on the end of it.",
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
    quip: "A name word. Every noun is somebody's name for something.",
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
    quip: "The first half means in place of, as in instead. A pronoun stands in for another word, so the name is the job description.",
  },
  {
    id: "interjection", word: "hüüdsõna",
    parts: [p("hüüd", "hüüd", "shout"), p("sõna", "sõna", "word")],
    literal: "shout word", means: "interjection",
    quip: "Ouch, wow, hey. Shout words, every one.",
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
    quip: "German says the same, a word book. English went to Latin for its word instead.",
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
    id: "zoo", word: "loomaaed",
    parts: [p("looma", "loom", "animal"), p("aed", "aed", "garden")],
    literal: "animal garden", means: "zoo",
    quip: "A garden where the animals grow. Please don't water them.",
  },
  {
    id: "kindergarten", word: "lasteaed",
    parts: [p("laste", "laps", "child"), p("aed", "aed", "garden")],
    literal: "children garden", means: "kindergarten",
    quip: "English borrowed the same idea from German: a garden where children grow.",
  },
  {
    id: "dentist", word: "hambaarst",
    parts: [p("hamba", "hammas", "tooth"), p("arst", "arst", "doctor")],
    literal: "tooth doctor", means: "dentist",
    quip: "A doctor who is only interested in your teeth. Open wide.",
  },
  {
    id: "wristwatch", word: "käekell",
    parts: [p("käe", "käsi", "hand"), p("kell", "kell", "clock")],
    literal: "hand clock", means: "wristwatch",
    quip: "A clock you wear on your hand. The wrist is close enough.",
  },
  {
    id: "torch", word: "taskulamp",
    parts: [p("tasku", "tasku", "pocket"), p("lamp", "lamp", "lamp")],
    literal: "pocket lamp", means: "torch, flashlight",
    quip: "A light that fits in your pocket, which on a December afternoon here you'll be glad of.",
  },
  {
    id: "spiderweb", word: "ämblikuvõrk",
    parts: [p("ämbliku", "ämblik", "spider"), p("võrk", "võrk", "net")],
    literal: "spider net", means: "spiderweb, cobweb",
    quip: "The spider's own network. Reception is excellent, if you're a fly.",
  },
];

/**
 * Words spelled exactly like an English word and meaning something else.
 * Common words first, since meeting `pea` on a market stall is the moment this
 * is for.
 */
export const FALSE_FRIENDS: readonly FalseFriend[] = [
  {
    id: "pea", word: "pea", looksLike: "pea", means: "head",
    quip: "Tell a doctor your pea hurts and you'll get sympathy, not a recipe.",
  },
  {
    id: "kool", word: "kool", looksLike: "cool", means: "school",
    quip: "School, not cool. Most teenagers would say it can't be both.",
  },
  {
    id: "must", word: "must", looksLike: "must", means: "black",
    quip: "Black, not an order. For some people a black coffee is a must anyway.",
  },
  {
    id: "all", word: "all", looksLike: "all", means: "under, below",
    quip: "Under, not everything. Though under the sofa is where everything ends up eventually.",
  },
  {
    id: "tool", word: "tool", looksLike: "tool", means: "chair",
    quip: "A chair, not a tool. In some meetings it's the most useful thing in the room.",
  },
  {
    id: "seen", word: "seen", looksLike: "seen", means: "mushroom",
    quip: "Nothing to do with having seen anything. It's what people head into the forest for every autumn, basket in hand.",
  },
  {
    id: "kook", word: "kook", looksLike: "cook", means: "cake",
    quip: "Nothing to do with cooking. Everything to do with eating.",
  },
  {
    id: "sink", word: "sink", looksLike: "sink", means: "ham",
    quip: "Order a sink sandwich with confidence. You'll get ham.",
  },
  {
    id: "vend", word: "vend", looksLike: "vend", means: "brother",
    quip: "A brother, not a vending machine. He might still have a snack for you.",
  },
  {
    id: "hunt", word: "hunt", looksLike: "hunt", means: "wolf",
    quip: "A wolf, which to be fair is the one doing the hunting.",
  },
  {
    id: "luu", word: "luu", looksLike: "loo", means: "bone",
    quip: "A bone, not the bathroom. Ask for the toilet instead and save everybody a confusing minute.",
  },
  {
    id: "hai", word: "hai", looksLike: "hi", means: "shark",
    quip: "Sounds like hi. If you ever meet one, a wave from the shore is plenty.",
  },
  {
    id: "hind", word: "hind", looksLike: "hind", means: "price",
    quip: "The price, not the back legs. A high one still makes people step back.",
  },
  {
    id: "tee", word: "tee", looksLike: "tee", means: "road, tea",
    quip: "A road, or tea, depending on the sentence. Golf has nothing to do with it.",
  },
  {
    id: "pall", word: "pall", looksLike: "pall", means: "ball",
    quip: "A ball, not a gloom. Few things lift one faster.",
  },
  {
    id: "tore", word: "tore", looksLike: "tore", means: "great, lovely",
    quip: "Lovely, and nothing to do with tearing. Say it about somebody's new coat and they'll be pleased.",
  },
  {
    id: "pill", word: "pill", looksLike: "pill", means: "musical instrument",
    quip: "A musical instrument, not medicine. Though plenty of people swear by both.",
  },
  {
    id: "torn", word: "torn", looksLike: "torn", means: "tower",
    quip: "A tower, not ripped. Unless something has gone very wrong with the building.",
  },
  {
    id: "vale", word: "vale", looksLike: "vale", means: "wrong, false",
    quip: "Wrong, or a lie. Not a valley, poets.",
  },
  {
    id: "veri", word: "veri", looksLike: "very", means: "blood",
    quip: "Blood, not very. Which is very dramatic either way.",
  },
  {
    id: "arm", word: "arm", looksLike: "arm", means: "scar",
    quip: "A scar, not a limb. You can get one on your arm, which helps nobody.",
  },
  {
    id: "kits", word: "kits", looksLike: "kits", means: "goat",
    quip: "One goat, not a set of anything. Assembly not required.",
  },
  {
    id: "tuba", word: "tuba", looksLike: "tuba", means: "room",
    quip: "A room, not a brass instrument. Though one of those would fill it nicely.",
  },
  {
    id: "seal", word: "seal", looksLike: "seal", means: "there",
    quip: "There, not the animal. Point at one on the rocks and the word is right either way.",
  },
  {
    id: "pool", word: "pool", looksLike: "pool", means: "half, side",
    quip: "Half, not somewhere to swim. Order half a cake and nobody will hand you a towel.",
  },
  {
    id: "mood", word: "mood", looksLike: "mood", means: "fashion",
    quip: "Fashion, not a feeling. Though the right coat can do wonders for both.",
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

export function wordFunFor(lemma: string, gloss: string | null): WordFun | null {
  const compound = compoundFor(lemma);
  if (compound && meansWhatIsShown(compound.means, gloss)) {
    return { kind: "compound", label: "Word for word", reading: compound.literal, quip: compound.quip };
  }
  const friend = falseFriendFor(lemma);
  if (friend && meansWhatIsShown(friend.means, gloss)) {
    return { kind: "false-friend", label: "Looks English, isn't", reading: friend.looksLike, quip: friend.quip };
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
const SPELLING: Readonly<Record<string, string>> = { grey: "gray", racoon: "raccoon", colour: "color", favourite: "favorite" };
const FILLER = new Set(["a", "an", "the", "of", "or", "and", "any", "one", "who", "that", "it", "is", "to", "in", "on", "for", "with", "somebody"]);

/** The words of a line of English that carry meaning, lower case and folded. */
export function contentWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 1 && !FILLER.has(w)).map((w) => SPELLING[w] ?? w),
  );
}
