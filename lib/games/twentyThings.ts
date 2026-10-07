/**
 * THE THINGS A ROUND OF KAKSKÜMMEND KÜSIMUST CAN BE THINKING OF.
 *
 * Each row is a request against the dictionary, like a lemma in a syllabus unit:
 * the word is a headword Ekilex answers for, the gloss a learner meets at the end
 * of the round is the dictionary's own, and a test fails on a lemma the shipped
 * dictionary does not hold. What the row adds is a handful of plain facts about
 * the thing itself, written as keys and never as sentences, so nothing in this
 * file is Estonian beyond the headwords it names.
 *
 * CLOSED WORLD, AND THAT IS THE RISK. A fact that is not listed is answered "no",
 * so a thing is only given a colour, a place or an ability where the answer is
 * plain; where it is "it depends" the key goes in the `...S` list ("sometimes"),
 * which is what the classic game says for a question that has no honest yes or no.
 * A fact somebody disagrees with is a one-line change here, and the way a wrong
 * answer gets reported is the same one every other wrong fact in the app uses.
 *
 * SIZE IS A SCALE, NOT A MEASUREMENT. One to ten, in steps a person could place
 * by holding the thing up: 1 sits on a fingertip, 3 is the size of a loaf of
 * bread (`leib` is the anchor, and the one a learner is most likely to compare
 * against), 5 is a dog, 7 a horse, 9 something you ride in, 10 something you
 * stand in. Two things on the same step are "about the same", which the game
 * answers "sometimes".
 *
 * Pure: no React, no Prisma.
 */

export type Kind = "animal" | "plant" | "food" | "drink" | "object" | "clothes" | "vehicle" | "nature";

/** Parts a thing can have. A lemma, because the learner asks for one by its name. */
export const PARTS = ["jalg", "tiib", "saba", "ratas", "uks", "aken", "sulg", "karv", "leht", "nokk"] as const;
export type Part = (typeof PARTS)[number];

export type Action = "fly" | "swim" | "move" | "jump";
export type Use = "eat" | "drink" | "wear" | "read" | "ride";
export type Where = "home" | "kitchen" | "outdoors" | "forest" | "water" | "city";
export type Feel = "fast" | "slow" | "hard" | "soft" | "cold" | "warm";

/** The eight colours the course teaches, as lemmas. */
export const COLOURS = ["punane", "sinine", "kollane", "roheline", "valge", "must", "pruun", "hall"] as const;
export type Colour = (typeof COLOURS)[number];

export interface Thing {
  /** The headword. A request against the dictionary. */
  lemma: string;
  kind: Kind;
  /** One to ten. See the header. */
  size: number;
  /** Category headwords it is a kind of, so "is it an animal?" has an answer. */
  isa: readonly string[];
  isaS: readonly string[];
  has: readonly Part[];
  hasS: readonly Part[];
  can: readonly Action[];
  canS: readonly Action[];
  use: readonly Use[];
  useS: readonly Use[];
  where: readonly Where[];
  whereS: readonly Where[];
  colour: readonly Colour[];
  colourS: readonly Colour[];
  feel: readonly Feel[];
  feelS: readonly Feel[];
}

/** Category headwords a question can name besides a thing. */
export const CATEGORIES = [
  "loom", "lind", "imetaja", "putukas", "taim", "toit", "jook", "puuvili", "köögivili", "sõiduk", "mööbel",
] as const;

type Rest = Partial<Omit<Thing, "lemma" | "kind" | "size">>;

function thing(lemma: string, kind: Kind, size: number, rest: Rest = {}): Thing {
  return {
    lemma, kind, size,
    isa: [], isaS: [], has: [], hasS: [], can: [], canS: [], use: [], useS: [],
    where: [], whereS: [], colour: [], colourS: [], feel: [], feelS: [],
    ...rest,
  };
}

const MAMMAL = ["loom", "imetaja"] as const;
const BIRD = ["loom", "lind"] as const;
const FOOD = ["toit"] as const;
const PALE: readonly Colour[] = ["punane", "sinine", "kollane", "roheline", "valge", "must", "pruun", "hall"];

export const THINGS: readonly Thing[] = [
  // Animals
  thing("koer", "animal", 5, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], canS: ["swim", "jump"], whereS: ["home", "outdoors"], colourS: ["pruun", "must", "valge", "hall"], feelS: ["fast"] }),
  thing("kass", "animal", 4, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move", "jump"], canS: ["swim"], whereS: ["home", "outdoors"], colourS: ["must", "valge", "hall", "pruun"], feelS: ["soft", "fast"] }),
  thing("part", "animal", 4, { isa: BIRD, has: ["jalg", "tiib", "sulg", "nokk"], hasS: ["saba"], can: ["move", "swim", "fly"], whereS: ["water", "outdoors"], colourS: ["pruun", "valge", "kollane", "roheline"] }),
  thing("kana", "animal", 4, { isa: BIRD, has: ["jalg", "tiib", "sulg", "nokk"], hasS: ["saba"], can: ["move"], canS: ["fly"], useS: ["eat"], whereS: ["outdoors"], colourS: ["valge", "pruun", "must"] }),
  thing("kala", "animal", 3, { isa: ["loom"], has: ["saba"], can: ["move", "swim"], use: ["eat"], where: ["water"], colourS: ["hall", "sinine", "punane", "must"] }),
  thing("hobune", "animal", 7, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move", "jump"], canS: ["swim"], use: ["ride"], whereS: ["outdoors"], colourS: ["pruun", "must", "valge", "hall"], feelS: ["fast"] }),
  thing("lehm", "animal", 7, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["outdoors"], colourS: ["valge", "must", "pruun"] }),
  thing("siga", "animal", 6, { isa: MAMMAL, has: ["jalg", "saba"], can: ["move"], whereS: ["outdoors"], colourS: ["valge", "must"] }),
  thing("jänes", "animal", 4, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move", "jump"], whereS: ["outdoors", "forest"], colourS: ["hall", "pruun", "valge"], feel: ["fast"] }),
  thing("karu", "animal", 7, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], canS: ["swim"], whereS: ["forest", "outdoors"], colourS: ["pruun", "must", "valge"] }),
  thing("hunt", "animal", 6, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["forest", "outdoors"], colourS: ["hall", "must", "valge"], feelS: ["fast"] }),
  thing("rebane", "animal", 5, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["forest", "outdoors"], colourS: ["punane", "pruun"] }),
  thing("lammas", "animal", 6, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["outdoors"], colourS: ["valge", "must"], feelS: ["soft"] }),
  thing("hiir", "animal", 2, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["home", "outdoors"], colourS: ["hall", "valge", "pruun"], feelS: ["fast", "soft"] }),
  thing("konn", "animal", 2, { isa: ["loom"], has: ["jalg"], can: ["move", "swim", "jump"], whereS: ["water", "outdoors"], colourS: ["roheline", "pruun"] }),
  thing("elevant", "animal", 8, { isa: MAMMAL, has: ["jalg", "saba"], can: ["move"], canS: ["swim"], whereS: ["outdoors"], colour: ["hall"], feelS: ["slow"] }),
  thing("liblikas", "animal", 1, { isa: ["loom", "putukas"], has: ["tiib", "jalg"], can: ["move", "fly"], whereS: ["outdoors"], colourS: ["kollane", "punane", "sinine", "valge", "must"] }),
  thing("mesilane", "animal", 1, { isa: ["loom", "putukas"], has: ["tiib", "jalg"], can: ["move", "fly"], whereS: ["outdoors"], colourS: ["kollane", "must"] }),
  thing("lõvi", "animal", 6, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["outdoors"], colourS: ["kollane", "pruun"], feelS: ["fast"] }),

  // Food
  thing("leib", "food", 3, { isa: FOOD, use: ["eat"], whereS: ["home", "kitchen"], colourS: ["pruun", "must"], feelS: ["soft", "hard"] }),
  thing("õun", "food", 2, { isa: ["toit", "puuvili"], use: ["eat"], whereS: ["kitchen", "home", "outdoors"], colourS: ["punane", "roheline", "kollane"], feelS: ["hard"] }),
  thing("banaan", "food", 2, { isa: ["toit", "puuvili"], use: ["eat"], whereS: ["kitchen", "home"], colour: ["kollane"], feelS: ["soft"] }),
  thing("juust", "food", 3, { isa: FOOD, use: ["eat"], whereS: ["kitchen", "home"], colourS: ["kollane", "valge"], feelS: ["hard", "soft"] }),
  thing("muna", "food", 2, { isa: FOOD, use: ["eat"], whereS: ["kitchen", "home"], colourS: ["valge", "pruun"], feelS: ["hard"] }),
  thing("kook", "food", 3, { isa: FOOD, use: ["eat"], whereS: ["kitchen", "home"], colourS: ["valge", "pruun", "kollane"], feelS: ["soft"] }),
  thing("jäätis", "food", 2, { isa: FOOD, use: ["eat"], whereS: ["home", "city"], colourS: ["valge", "pruun", "kollane"], feel: ["cold"], feelS: ["soft"] }),
  thing("supp", "food", 3, { isa: FOOD, use: ["eat"], whereS: ["kitchen", "home"], feelS: ["warm"] }),
  thing("kartul", "food", 2, { isa: ["toit", "köögivili"], use: ["eat"], whereS: ["kitchen", "home", "outdoors"], colourS: ["pruun", "kollane"], feel: ["hard"] }),
  thing("porgand", "food", 2, { isa: ["toit", "köögivili"], use: ["eat"], whereS: ["kitchen", "home", "outdoors"], feel: ["hard"] }),
  thing("sibul", "food", 2, { isa: ["toit", "köögivili"], use: ["eat"], whereS: ["kitchen", "home"], colourS: ["kollane", "valge", "punane"] }),
  thing("liha", "food", 3, { isa: FOOD, use: ["eat"], whereS: ["kitchen", "home"], colourS: ["punane"] }),
  thing("šokolaad", "food", 2, { isa: FOOD, use: ["eat"], whereS: ["home", "kitchen"], colour: ["pruun"], feelS: ["hard"] }),
  thing("maasikas", "food", 1, { isa: ["toit", "puuvili"], use: ["eat"], whereS: ["outdoors", "kitchen"], colour: ["punane"], feelS: ["soft"] }),
  thing("tomat", "food", 2, { isa: ["toit", "köögivili"], isaS: ["puuvili"], use: ["eat"], whereS: ["kitchen", "home"], colour: ["punane"] }),
  thing("apelsin", "food", 2, { isa: ["toit", "puuvili"], use: ["eat"], whereS: ["kitchen", "home"] }),
  thing("vorst", "food", 2, { isa: FOOD, use: ["eat"], whereS: ["kitchen", "home"], colourS: ["punane", "pruun"] }),

  // Drinks
  thing("piim", "drink", 2, { isa: ["jook"], isaS: ["toit"], use: ["drink"], whereS: ["kitchen", "home"], colour: ["valge"], feelS: ["cold"] }),
  thing("kohv", "drink", 2, { isa: ["jook"], use: ["drink"], whereS: ["home", "kitchen", "city"], colourS: ["pruun", "must"], feelS: ["warm"] }),
  thing("vesi", "drink", 2, { isa: ["jook"], use: ["drink"], whereS: ["home", "kitchen", "outdoors"], feelS: ["cold", "warm"] }),

  // Objects
  thing("raamat", "object", 3, { has: ["leht"], useS: ["read"], whereS: ["home"], colourS: PALE }),
  thing("telefon", "object", 2, { useS: ["read"], whereS: ["home", "outdoors", "city"], colourS: ["must", "valge", "sinine", "hall"], feel: ["hard"] }),
  thing("arvuti", "object", 3, { useS: ["read"], whereS: ["home"], colourS: ["must", "hall", "valge"], feel: ["hard"] }),
  thing("pliiats", "object", 2, { whereS: ["home"], colourS: PALE, feel: ["hard"] }),
  thing("laud", "object", 6, { isa: ["mööbel"], has: ["jalg"], whereS: ["home", "kitchen"], colourS: ["pruun", "valge", "must"], feel: ["hard"] }),
  thing("tool", "object", 5, { isa: ["mööbel"], has: ["jalg"], whereS: ["home", "kitchen"], colourS: ["pruun", "valge", "must"], feelS: ["hard"] }),
  thing("voodi", "object", 6, { isa: ["mööbel"], hasS: ["jalg"], whereS: ["home"], colourS: ["valge", "pruun", "sinine"], feelS: ["soft"] }),
  thing("uks", "object", 6, { whereS: ["home", "city"], colourS: ["pruun", "valge", "must"], feel: ["hard"] }),
  thing("aken", "object", 6, { whereS: ["home", "city"], feel: ["hard"] }),
  thing("kott", "object", 3, { useS: ["wear"], whereS: ["home", "city", "outdoors"], colourS: PALE, feelS: ["soft"] }),
  thing("pilet", "object", 2, { whereS: ["city"], colourS: ["valge", "kollane", "sinine"], feelS: ["soft"] }),
  thing("võti", "object", 1, { whereS: ["home"], colourS: ["hall"], feel: ["hard"] }),
  thing("lamp", "object", 4, { whereS: ["home"], colourS: PALE, feel: ["hard"] }),
  thing("prillid", "object", 2, { use: ["wear"], whereS: ["home", "city"], colourS: ["must", "pruun", "hall"], feel: ["hard"] }),

  // Clothes
  thing("king", "clothes", 3, { use: ["wear"], whereS: ["home", "city", "outdoors"], colourS: ["must", "pruun", "valge", "sinine"] }),
  thing("müts", "clothes", 3, { use: ["wear"], whereS: ["home", "city", "outdoors"], colourS: PALE, feelS: ["soft", "warm"] }),
  thing("jope", "clothes", 3, { use: ["wear"], whereS: ["home", "city", "outdoors"], colourS: PALE, feelS: ["soft", "warm"] }),
  thing("särk", "clothes", 3, { use: ["wear"], whereS: ["home", "city"], colourS: PALE, feelS: ["soft"] }),

  // Vehicles
  thing("auto", "vehicle", 7, { isa: ["sõiduk"], has: ["ratas", "uks", "aken"], can: ["move"], use: ["ride"], whereS: ["city", "outdoors"], colourS: ["punane", "sinine", "valge", "must", "hall"], feelS: ["fast"] }),
  thing("buss", "vehicle", 8, { isa: ["sõiduk"], has: ["ratas", "uks", "aken"], can: ["move"], use: ["ride"], whereS: ["city", "outdoors"], colourS: ["kollane", "sinine", "punane", "roheline"] }),
  thing("rong", "vehicle", 9, { isa: ["sõiduk"], has: ["ratas", "uks", "aken"], can: ["move"], use: ["ride"], whereS: ["city", "outdoors"], colourS: PALE, feelS: ["fast"] }),
  thing("lennuk", "vehicle", 9, { isa: ["sõiduk"], has: ["tiib", "ratas", "uks", "aken"], can: ["move", "fly"], use: ["ride"], whereS: ["outdoors"], colourS: ["valge", "hall", "sinine"], feel: ["fast"] }),
  thing("laev", "vehicle", 9, { isa: ["sõiduk"], has: ["uks", "aken"], can: ["move", "swim"], use: ["ride"], where: ["water"], colourS: ["valge", "sinine", "must", "punane"], feelS: ["slow"] }),
  thing("jalgratas", "vehicle", 6, { isa: ["sõiduk"], has: ["ratas"], can: ["move"], use: ["ride"], whereS: ["outdoors", "city", "home"], colourS: PALE }),
  thing("tramm", "vehicle", 8, { isa: ["sõiduk"], has: ["ratas", "uks", "aken"], can: ["move"], use: ["ride"], where: ["city"], colourS: ["kollane", "punane", "sinine"] }),

  // Nature and places
  thing("maja", "nature", 8, { has: ["uks", "aken"], whereS: ["city", "outdoors"], colourS: ["valge", "kollane", "punane", "pruun", "sinine"], feel: ["hard"] }),
  thing("puu", "plant", 8, { isa: ["taim"], has: ["leht"], whereS: ["outdoors", "forest", "city"], colourS: ["roheline", "pruun"], feel: ["hard"] }),
  thing("lill", "plant", 2, { isa: ["taim"], has: ["leht"], whereS: ["outdoors", "home"], colourS: ["punane", "kollane", "sinine", "valge", "roheline"], feelS: ["soft"] }),
  thing("päike", "nature", 10, { where: ["outdoors"], colour: ["kollane"], feel: ["warm"], canS: ["move"] }),
  thing("järv", "nature", 10, { where: ["outdoors", "water"], colourS: ["sinine", "roheline"], feelS: ["cold"] }),
  thing("mägi", "nature", 10, { where: ["outdoors"], colourS: ["hall", "roheline", "valge"], feel: ["hard"] }),
  thing("jõgi", "nature", 10, { where: ["outdoors", "water"], canS: ["move"], colourS: ["sinine"], feelS: ["cold", "fast"] }),
  thing("mets", "nature", 10, { isaS: ["taim"], hasS: ["leht"], where: ["outdoors", "forest"], colourS: ["roheline"] }),
];

export const THING_BY_LEMMA: ReadonlyMap<string, Thing> = new Map(THINGS.map((t) => [t.lemma, t]));

/** What kind of thing, in the words a hint uses. English, and about the category, never the word. */
export const KIND_HINT: Record<Kind, string> = {
  animal: "It is an animal.",
  plant: "It is a plant.",
  food: "It is something you can eat.",
  drink: "It is something you drink.",
  object: "It is an object, the kind you find in a home or carry about.",
  clothes: "It is something you wear.",
  vehicle: "It is something you can ride in or on.",
  nature: "It is part of nature, or a place.",
};
