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

export type Kind = "animal" | "plant" | "food" | "drink" | "object" | "clothes" | "vehicle" | "building" | "nature";

/** Parts a thing can have. A lemma, because the learner asks for one by its name. */
export const PARTS = [
  "jalg", "tiib", "saba", "ratas", "uks", "aken", "sulg", "karv", "leht", "nokk",
  "silm", "kõrv", "nina", "suu", "pea", "hammas", "kõht", "selg", "sarv", "nahk", "koor",
  "seeme", "juur", "oks", "rool", "ekraan", "nupp", "klaviatuur", "kaas", "uim",
] as const;
export type Part = (typeof PARTS)[number];

export type Action = "fly" | "swim" | "move" | "jump";
export type Use = "eat" | "drink" | "wear" | "read" | "ride" | "write";
export type Where =
  | "home" | "kitchen" | "outdoors" | "forest" | "water" | "city"
  | "country" | "garden" | "sky" | "sea" | "school" | "shop" | "street" | "fridge" | "bed";
export type Feel = "fast" | "slow" | "hard" | "soft" | "cold" | "warm";

/** The eight colours the course teaches, as lemmas. */
export const COLOURS = [
  "punane", "sinine", "kollane", "roheline", "valge", "must", "pruun", "hall", "roosa", "oranž", "lilla",
] as const;
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
  /** Plain traits (see `TRAITS`), "sometimes" ones, and ones that are plainly not so. */
  trait: readonly string[];
  traitS: readonly string[];
  traitNo: readonly string[];
  /** Things it does (see `DOES`) and sometimes does. */
  does: readonly string[];
  doesS: readonly string[];
  /** What it is made of, and sometimes made of (see `MATERIALS`). */
  made: readonly string[];
  madeS: readonly string[];
}

/** Category headwords a question can name besides a thing. */
export const CATEGORIES = [
  "loom", "lind", "imetaja", "putukas", "taim", "toit", "jook", "puuvili", "köögivili", "sõiduk", "mööbel",
  "hoone", "ese", "rõivas",
] as const;

type Rest = Partial<Omit<Thing, "lemma" | "kind" | "size">>;

function thing(lemma: string, kind: Kind, size: number, rest: Rest = {}): Thing {
  return {
    lemma, kind, size,
    isa: [], isaS: [], has: [], hasS: [], can: [], canS: [], use: [], useS: [],
    where: [], whereS: [], colour: [], colourS: [], feel: [], feelS: [],
    trait: [], traitS: [], traitNo: [], does: [], doesS: [], made: [], madeS: [],
    ...rest,
  };
}

/** Objective traits: not listed means no. The lemma that asks for each is in `lib/games/twenty.ts`. */
export const TRAITS = [
  "wet", "dry", "sweet", "salty", "sour", "sharp", "round", "long", "short", "wide", "narrow", "thick", "thin",
  "smelly", "dangerous", "strong", "natural",
] as const;

/** Subjective ones. Not listed means "sometimes", unless the thing says it is plainly not so (`traitNo`). */
export const OPINIONS = [
  "old", "new", "expensive", "cheap", "pretty", "useful", "rare", "common", "quiet", "clean", "dark", "bright", "weak",
] as const;

export const DOES = [
  "bark", "grow", "sleep", "sing", "walk", "play", "work", "buy", "sell", "burn", "ring", "born", "use", "wash", "scratch", "smell", "shine",
] as const;

export const MATERIALS = ["puit", "metall", "klaas", "paber", "kivi", "raud", "kuld", "kumm", "vill", "puuvill"] as const;

const MAMMAL = ["loom", "imetaja"] as const;
const BIRD = ["loom", "lind"] as const;
const FOOD = ["toit"] as const;
const PALE: readonly Colour[] = ["punane", "sinine", "kollane", "roheline", "valge", "must", "pruun", "hall"];

const BASE: readonly Thing[] = [
  // Animals
  thing("koer", "animal", 5, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], canS: ["swim", "jump"], whereS: ["home", "outdoors"], colourS: ["pruun", "must", "valge", "hall"], feelS: ["fast"] }),
  thing("kass", "animal", 4, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move", "jump"], canS: ["swim"], whereS: ["home", "outdoors"], colourS: ["must", "valge", "hall", "pruun"], feelS: ["soft", "fast"] }),
  thing("part", "animal", 4, { useS: ["eat"], isa: BIRD, has: ["jalg", "tiib", "sulg", "nokk", "saba"], can: ["move", "swim", "fly"], whereS: ["water", "outdoors"], colourS: ["pruun", "valge", "kollane", "roheline"] }),
  thing("kana", "animal", 4, { isa: BIRD, has: ["jalg", "tiib", "sulg", "nokk", "saba"], can: ["move"], canS: ["fly"], useS: ["eat"], whereS: ["outdoors"], colourS: ["valge", "pruun", "must"] }),
  thing("kala", "animal", 4, { isa: ["loom"], has: ["saba"], can: ["move", "swim"], use: ["eat"], where: ["water"], colourS: ["hall", "sinine", "punane", "must"] }),
  thing("hobune", "animal", 7, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move", "jump"], canS: ["swim"], useS: ["ride"], whereS: ["outdoors"], colourS: ["pruun", "must", "valge", "hall"], feelS: ["fast"] }),
  thing("lehm", "animal", 7, { useS: ["eat"], isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["outdoors"], colourS: ["valge", "must", "pruun"] }),
  thing("siga", "animal", 6, { useS: ["eat"], isa: MAMMAL, has: ["jalg", "saba"], can: ["move"], whereS: ["outdoors"], colourS: ["valge", "must"] }),
  thing("jänes", "animal", 4, { useS: ["eat"], isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move", "jump"], whereS: ["outdoors", "forest"], colourS: ["hall", "pruun", "valge"], feel: ["fast"] }),
  thing("karu", "animal", 7, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], canS: ["swim"], whereS: ["forest", "outdoors"], colourS: ["pruun", "must", "valge"] }),
  thing("hunt", "animal", 6, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["forest", "outdoors"], colourS: ["hall", "must", "valge"], feelS: ["fast"] }),
  thing("rebane", "animal", 5, { isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["forest", "outdoors"], colourS: ["punane", "pruun"] }),
  thing("lammas", "animal", 6, { useS: ["eat"], isa: MAMMAL, has: ["jalg", "saba", "karv"], can: ["move"], whereS: ["outdoors"], colourS: ["valge", "must"], feelS: ["soft"] }),
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
  thing("raamat", "object", 3, { has: ["leht"], use: ["read"], useS: ["write"], whereS: ["home"], colourS: PALE }),
  thing("telefon", "object", 2, { useS: ["read", "write"], whereS: ["home", "outdoors", "city"], colourS: ["must", "valge", "sinine", "hall"], feel: ["hard"] }),
  thing("arvuti", "object", 3, { useS: ["read", "write"], whereS: ["home"], colourS: ["must", "hall", "valge"], feel: ["hard"] }),
  thing("pliiats", "object", 2, { use: ["write"], whereS: ["home"], colourS: PALE, feel: ["hard"] }),
  thing("laud", "object", 6, { isa: ["mööbel"], has: ["jalg"], whereS: ["home", "kitchen"], colourS: ["pruun", "valge", "must"], feel: ["hard"] }),
  thing("tool", "object", 5, { isa: ["mööbel"], has: ["jalg"], whereS: ["home", "kitchen"], colourS: ["pruun", "valge", "must"], feelS: ["hard"] }),
  thing("voodi", "object", 6, { isa: ["mööbel"], hasS: ["jalg"], whereS: ["home"], colourS: ["valge", "pruun", "sinine"], feelS: ["soft"] }),
  thing("uks", "object", 6, { whereS: ["home", "city"], colourS: ["pruun", "valge", "must"], feel: ["hard"] }),
  thing("aken", "object", 6, { whereS: ["home", "city"], feel: ["hard"] }),
  thing("kott", "object", 3, { use: ["wear"], whereS: ["home", "city", "outdoors"], colourS: PALE, feelS: ["soft"] }),
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
  thing("maja", "building", 8, { isa: ["hoone"], has: ["uks", "aken"], whereS: ["city", "outdoors"], colourS: ["valge", "kollane", "punane", "pruun", "sinine"], feel: ["hard"] }),
  thing("puu", "plant", 8, { isa: ["taim"], has: ["leht"], whereS: ["outdoors", "forest", "city"], colourS: ["roheline", "pruun"], feel: ["hard"] }),
  thing("lill", "plant", 2, { isa: ["taim"], has: ["leht"], whereS: ["outdoors", "home"], colourS: ["punane", "kollane", "sinine", "valge", "roheline"], feelS: ["soft"] }),
  thing("päike", "nature", 10, { where: ["outdoors"], colour: ["kollane"], feel: ["warm"], canS: ["move"] }),
  thing("järv", "nature", 10, { where: ["outdoors", "water"], colourS: ["sinine", "roheline"], feelS: ["cold"] }),
  thing("mägi", "nature", 10, { where: ["outdoors"], colourS: ["hall", "roheline", "valge"], feel: ["hard"] }),
  thing("jõgi", "nature", 10, { where: ["outdoors", "water"], canS: ["move"], colourS: ["sinine"], feelS: ["cold", "fast"] }),
  thing("mets", "nature", 10, { isaS: ["taim"], hasS: ["leht"], where: ["outdoors", "forest"], colourS: ["roheline"] }),
];

/*
  THE WIDE LAYER. Every thing gets what is true of its kind (an animal has eyes
  and sleeps, you can buy and use an object), and then the facts that are its own,
  written as space-separated keys so a row stays one line. A fact in the "yes"
  list is never also in the "sometimes" list.
*/
interface Extra {
  p?: string; ps?: string;
  w?: string; ws?: string;
  t?: string; ts?: string; tn?: string;
  d?: string; ds?: string;
  m?: string; ms?: string;
  c?: string; cs?: string;
}

const words = (s: string | undefined): string[] => (s ? s.split(" ").filter(Boolean) : []);

const KIND_DEFAULT: Record<Kind, Extra> = {
  animal: { t: "natural", p: "silm pea suu selg kõht nahk", d: "sleep born", ds: "buy sell smell" },
  plant: { p: "juur", ps: "seeme", d: "grow", t: "natural" },
  food: { d: "buy sell", ws: "shop" },
  drink: { d: "buy sell", ws: "shop" },
  object: { d: "buy sell use", ws: "shop" },
  clothes: { d: "buy sell use wash", ws: "shop" },
  vehicle: { d: "buy sell use wash work" },
  building: { d: "buy sell use" },
  nature: { t: "natural" },
};

const EXTRA: Record<string, Extra> = {
  koer: { d: "bark walk play", ds: "scratch", ts: "strong dangerous smelly", ws: "country garden street bed" },
  kass: { d: "walk play scratch", ts: "smelly", ws: "garden street bed country" },
  part: { d: "walk", ws: "country sky sea" },
  kana: { d: "walk", w: "country", ws: "garden" },
  kala: { ds: "", ts: "smelly", ws: "sea", p: "", ps: "" },
  hobune: { d: "walk", ds: "work play", t: "strong", w: "country", ws: "street" },
  lehm: { d: "walk", ts: "smelly strong", w: "country", ps: "sarv" },
  siga: { d: "walk", ts: "smelly", w: "country", cs: "roosa" },
  jänes: { d: "walk", ws: "country garden" },
  karu: { d: "walk", t: "strong dangerous", ws: "country" },
  hunt: { d: "walk", t: "dangerous strong", ws: "country" },
  rebane: { d: "walk", ws: "country garden", cs: "oranž" },
  lammas: { d: "walk", ts: "smelly", w: "country" },
  hiir: { d: "walk", ws: "garden country bed" },
  konn: { ds: "walk", ts: "wet", ws: "garden country" },
  elevant: { d: "walk", t: "strong thick", ts: "dangerous" },
  liblikas: { ds: "walk", t: "thin", ws: "garden sky" },
  mesilane: { ds: "walk", ts: "dangerous sharp", ws: "garden sky country" },
  lõvi: { d: "walk", t: "strong dangerous" },

  leib: { p: "koor", ts: "dry", d: "smell", ws: "fridge" },
  õun: { p: "koor seeme", t: "round", ts: "sweet sour wet", d: "grow", ds: "smell", ws: "garden fridge country" },
  banaan: { p: "koor", t: "long sweet", d: "grow", ds: "smell", ws: "fridge" },
  juust: { t: "smelly", ts: "salty dry sour", d: "smell", w: "fridge" },
  muna: { p: "koor", ts: "round", w: "fridge" },
  kook: { t: "sweet", ts: "round dry", d: "smell", ws: "fridge" },
  jäätis: { t: "sweet", ts: "wet round", ws: "fridge" },
  supp: { t: "wet", ts: "salty", d: "smell", ws: "fridge" },
  kartul: { p: "koor", ts: "round dry", d: "grow", ws: "garden country fridge" },
  porgand: { p: "koor", t: "long", ts: "sweet", d: "grow", c: "oranž", ws: "garden country fridge" },
  sibul: { p: "koor", t: "round smelly", ts: "sharp", d: "grow", ws: "garden country fridge" },
  liha: { ts: "salty smelly wet", w: "fridge" },
  šokolaad: { t: "sweet", ts: "dry thin", d: "smell", ws: "fridge" },
  maasikas: { p: "seeme", t: "sweet", ts: "sour round", d: "grow", ds: "smell", ws: "garden country fridge" },
  tomat: { p: "koor seeme", t: "round wet", ts: "sour sweet", d: "grow", ws: "garden fridge" },
  apelsin: { p: "koor seeme", t: "round sweet wet", ts: "sour", d: "grow", ds: "smell", c: "oranž", ws: "fridge" },
  vorst: { t: "salty long", ts: "smelly thick", w: "fridge" },

  piim: { t: "wet", ts: "sweet", d: "smell", w: "fridge" },
  vesi: { t: "wet", ws: "fridge" },
  kohv: { t: "wet", ts: "sweet", d: "smell", ws: "fridge" },

  raamat: { p: "kaas", m: "paber", ts: "thick thin", ds: "burn", ws: "school bed" },
  telefon: { p: "ekraan nupp", m: "klaas", ms: "metall", d: "ring work", ts: "thin", ws: "bed school" },
  arvuti: { p: "ekraan klaviatuur nupp", m: "metall", ms: "klaas", d: "work", ws: "school" },
  pliiats: { m: "puit", t: "thin long", ts: "sharp", ws: "school" },
  laud: { m: "puit", ms: "metall klaas", ts: "wide long", ds: "burn", ws: "school" },
  tool: { m: "puit", ms: "metall", ds: "burn", ws: "school" },
  voodi: { ms: "puit metall", ts: "wide", ds: "burn" },
  uks: { p: "nupp", m: "puit", ms: "metall klaas", ts: "wide thick", ds: "burn", ws: "school" },
  aken: { m: "klaas", ms: "puit", ts: "wide", ws: "school" },
  kott: { ms: "puuvill vill", ws: "school bed" },
  pilet: { m: "paber", t: "thin", ds: "burn" },
  võti: { m: "metall", ms: "raud", t: "thin", ts: "sharp" },
  lamp: { p: "nupp", ms: "metall klaas", d: "burn work shine", ws: "school bed" },
  prillid: { m: "klaas", ms: "metall", ts: "thin", ws: "bed school" },

  king: { ms: "kumm vill" },
  müts: { ms: "vill puuvill" },
  jope: { ms: "puuvill vill" },
  särk: { m: "puuvill", ms: "vill" },

  auto: { p: "rool nupp", m: "metall raud", ms: "klaas kumm", ds: "ring", w: "street" },
  buss: { m: "metall", ms: "klaas", ds: "ring", w: "street" },
  rong: { m: "metall raud", ds: "ring" },
  lennuk: { m: "metall", w: "sky", ws: "" },
  laev: { m: "metall", ms: "puit", ds: "ring", ws: "sea" },
  jalgratas: { p: "rool", m: "metall", ms: "kumm", d: "ring", ws: "street" },
  tramm: { m: "metall", d: "ring", w: "street" },

  maja: { ms: "puit kivi klaas", ds: "burn", ts: "wide" },
  puu: { m: "puit", p: "oks juur koor seeme", d: "grow", ds: "burn", ws: "garden country" },
  lill: { d: "smell", ws: "garden country", cs: "roosa lilla" },
  päike: { w: "sky", t: "round bright", d: "shine", ds: "burn", tn: "dark weak" },
  järv: { t: "wet wide", w: "country" },
  mägi: { t: "old", ws: "country" },
  jõgi: { t: "wet long", w: "country" },
  mets: { t: "wide", d: "grow", w: "country" },
};

/** The same, as one list without repeats, and with nothing in both the "yes" and the "sometimes" list. */
function merge<T extends string>(base: readonly T[], extra: string[]): T[] {
  return [...new Set([...base, ...(extra as T[])])];
}

function widen(t: Thing): Thing {
  const kind = KIND_DEFAULT[t.kind];
  const own = EXTRA[t.lemma] ?? {};
  const mammal = t.isa.includes("imetaja");
  const pick = (key: keyof Extra): string[] => [...words(kind[key]), ...words(own[key])];

  const bird = t.isa.includes("lind");
  const insect = t.isa.includes("putukas");
  const fish = t.lemma === "kala";
  const parts = [...pick("p"), ...(mammal ? ["kõrv", "nina", "hammas"] : []), ...(fish ? ["uim"] : [])]
    // A bird has a beak and not a mouth, and an insect has neither skin nor a back.
    .filter((x) => !(bird && x === "suu") && !(insect && (x === "nahk" || x === "selg"))
      // An elephant has a trunk, which is not quite a nose.
      && !(t.lemma === "elevant" && x === "nina"));
  const has = merge(t.has, parts) as Part[];
  const hasS = merge(t.hasS, [...pick("ps"), ...(t.lemma === "elevant" ? ["nina"] : [])]).filter((x) => !has.includes(x as Part)) as Part[];
  const where = merge(t.where, pick("w")) as Where[];
  const whereS = merge(t.whereS, pick("ws")).filter((x) => !where.includes(x as Where)) as Where[];
  const colour = merge(t.colour, pick("c")) as Colour[];
  const colourS = merge(t.colourS, pick("cs")).filter((x) => !colour.includes(x as Colour)) as Colour[];
  const trait = merge(t.trait, pick("t"));
  const traitS = merge(t.traitS, pick("ts")).filter((x) => !trait.includes(x));
  const does = merge(t.does, pick("d"));
  const doesS = merge(t.doesS, pick("ds")).filter((x) => !does.includes(x));
  const made = merge(t.made, pick("m"));
  const madeS = merge(t.madeS, pick("ms")).filter((x) => !made.includes(x));
  // The categories a learner can name for what is not an animal, a plant or food.
  const kindIsa: Record<string, string[]> = { clothes: ["rõivas", "ese"], object: ["ese"] };
  const isa = merge(t.isa, kindIsa[t.kind] ?? []);
  return {
    ...t, isa, has, hasS, where, whereS, colour, colourS, trait, traitS, traitNo: merge(t.traitNo, words(own.tn)),
    does, doesS, made, madeS,
  };
}

export const THINGS: readonly Thing[] = BASE.map(widen);

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
  building: "It is a building.",
  nature: "It is part of nature, or a place.",
};
