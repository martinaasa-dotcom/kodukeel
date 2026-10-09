/**
 * THE WIDE WORLD OF KAKSKÜMMEND KÜSIMUST.
 *
 * `twentyThings.ts` holds the 72 things the audited factbase researched, one
 * hand-written row each. This is everything past them: some two hundred and
 * thirty more things to be thinking of, built the way a field guide is, out of
 * what is true of the class (every bird has feathers and a beak, every tool has
 * a handle, every garment is worn) and then what is true of the one thing (a
 * penguin does not fly, a swan has a long neck, a hammer is not sharp).
 *
 * WHAT IS A CLASS FACT. Only what is true by definition or of every ordinary
 * member: a bird has a beak, a fruit can be eaten, a building has a door. Where
 * a member really can go either way it is "sometimes" in the class, and where
 * one member is the exception the row says so. Nothing is guessed: a fact the
 * class cannot vouch for and the row does not state is a plain no, which is the
 * closed-world rule the whole game rests on.
 *
 * THE SAME RULES AS THE TABLE BESIDE IT. A row names a headword the dictionary
 * holds, the facts are keys and never sentences, and nothing in this file is
 * Estonian beyond the headwords it names.
 *
 * Two numbers per thing. `size` is the one-to-ten scale big and small are read
 * on (`twentyThings.ts` explains it). `metres` is the thing's longest
 * dimension, roughly and typically, so "bigger than" can tell the sun from a
 * mountain where both are a ten.
 *
 * Pure: no React, no Prisma.
 */

/** One family of facts, as space-separated keys. `S` is "sometimes", `N` is "plainly not". */
export interface Facts {
  isa?: string; isaS?: string;
  has?: string; hasS?: string;
  can?: string; canS?: string;
  use?: string; useS?: string;
  w?: string; wS?: string;
  col?: string; colS?: string;
  feel?: string; feelS?: string;
  t?: string; tS?: string; tN?: string;
  d?: string; dS?: string;
  mat?: string; matS?: string;
  /** Things notable about a part, as `adjective:part`: a giraffe's `pikk:kael`. */
  notable?: string;
}

export type WorldKind =
  | "animal" | "plant" | "food" | "drink" | "object" | "clothes" | "vehicle" | "building" | "nature" | "body";

export interface ClassSpec extends Facts {
  kind: WorldKind;
  /** How many legs a member has, where the class says. */
  legs?: number;
}

/*
  Places every class shares: a thing on sale is in Estonia and in Africa, and
  `estonia` and `africa` on an animal or a plant is said by its class or its row.
*/
const EVERYWHERE = "estonia africa";

export const CLASSES = {
  /* ---------------- Animals ---------------- */
  wildMammal: {
    kind: "animal", legs: 4,
    isa: "loom imetaja metsloom elusolend olend",
    has: "jalg saba karv kael luu süda keel", hasS: "küünis",
    can: "move run", canS: "swim jump",
    d: "walk die sound", w: "outdoors nature", wS: "forest country field",
  },
  farmMammal: {
    kind: "animal", legs: 4,
    isa: "loom imetaja koduloom elusolend olend",
    has: "jalg saba karv kael luu süda keel kabi",
    can: "move run", canS: "jump swim",
    d: "walk die plants sound", w: "country estonia africa outdoors", wS: "field",
    useS: "eat",
  },
  pet: {
    kind: "animal", legs: 4,
    isa: "loom imetaja koduloom lemmikloom elusolend olend",
    has: "jalg saba karv kael luu süda keel käpp",
    can: "move run", canS: "jump swim climb",
    d: "walk die sound", w: "home estonia africa", wS: "outdoors garden city country",
  },
  exoticMammal: {
    kind: "animal", legs: 4,
    isa: "loom imetaja metsloom elusolend olend",
    has: "jalg saba karv kael luu süda keel",
    can: "move run", canS: "swim",
    d: "walk die sound", w: "outdoors nature africa", wS: "forest field",
  },
  seaMammal: {
    kind: "animal",
    isa: "loom imetaja metsloom elusolend olend",
    has: "saba luu süda keel uim",
    can: "move swim",
    d: "die meat sound", w: "water sea nature outdoors",
  },
  bird: {
    kind: "animal", legs: 2,
    isa: "loom lind elusolend olend",
    has: "jalg tiib saba sulg nokk kael luu süda keel küünis",
    can: "move fly", canS: "run jump",
    d: "walk die eggs sound", dS: "sing", w: "outdoors nature sky", wS: "forest country garden city",
  },
  fish: {
    kind: "animal",
    isa: "loom kala elusolend olend",
    has: "uim saba soomus luu süda",
    can: "move swim",
    d: "die", dS: "eggs", w: "water nature sea", t: "wet",
  },
  seaCreature: {
    kind: "animal",
    isa: "loom elusolend olend",
    can: "move swim",
    d: "die eggs", w: "water nature sea", t: "wet",
  },
  insect: {
    kind: "animal", legs: 6,
    isa: "loom putukas elusolend olend",
    has: "jalg",
    can: "move walk", canS: "fly",
    d: "walk die eggs", w: "outdoors nature", wS: "garden forest country home",
  },
  reptile: {
    kind: "animal",
    isa: "loom roomaja elusolend olend",
    has: "soomus saba luu süda keel",
    can: "move", canS: "swim crawl",
    d: "die eggs meat", w: "outdoors nature", wS: "water",
  },
  amphibian: {
    kind: "animal", legs: 4,
    isa: "loom elusolend olend",
    has: "jalg luu süda keel",
    can: "move jump swim",
    d: "die eggs meat", w: "outdoors nature", wS: "water garden forest", t: "wet",
  },
  crawler: {
    kind: "animal",
    isa: "loom elusolend olend",
    can: "move crawl",
    d: "die", w: "outdoors nature garden", wS: "forest field",
  },

  /* ---------------- Plants and fungi ---------------- */
  tree: {
    kind: "plant",
    isa: "taim puu elusolend",
    has: "tüvi oks juur koor", hasS: "seeme õis",
    d: "grow die", dS: "burn bloom",
    w: "outdoors nature", wS: "forest city garden country",
    mat: "puit", col: "roheline pruun", feel: "hard", t: "tall",
  },
  flower: {
    kind: "plant",
    isa: "taim lill elusolend",
    has: "õis vars leht juur", hasS: "seeme",
    d: "grow die bloom", w: "outdoors nature", wS: "garden home field",
    feel: "soft", t: "thin",
  },
  plant: {
    kind: "plant",
    isa: "taim elusolend",
    has: "juur", hasS: "leht vars seeme",
    d: "grow die", w: "outdoors nature", wS: "garden forest field",
  },
  fungus: {
    kind: "nature",
    isa: "seen elusolend", isaS: "toit",
    has: "vars", d: "grow die", useS: "eat",
    w: "outdoors nature forest", wS: "shop kitchen",
    feel: "soft", tS: "poisonous",
  },

  /* ---------------- Food and drink ---------------- */
  fruit: {
    kind: "food",
    isa: "toit puuvili",
    has: "koor", hasS: "seeme",
    use: "eat", d: "grow buy sell", t: "sweet",
    w: EVERYWHERE, wS: "kitchen home fridge shop garden table",
  },
  berry: {
    kind: "food",
    isa: "toit mari", isaS: "puuvili",
    hasS: "seeme",
    use: "eat", d: "grow buy sell", t: "sweet round",
    w: EVERYWHERE, wS: "forest garden kitchen fridge shop", feel: "soft",
  },
  vegetable: {
    kind: "food",
    isa: "toit köögivili",
    use: "eat", d: "grow buy sell",
    w: EVERYWHERE, wS: "kitchen home fridge shop garden field", feel: "hard",
  },
  dish: {
    kind: "food",
    isa: "toit",
    use: "eat", d: "buy sell",
    w: EVERYWHERE, wS: "kitchen home fridge shop table",
  },
  sweet: {
    kind: "food",
    isa: "toit maiustus",
    use: "eat", d: "buy sell", t: "sweet",
    w: EVERYWHERE, wS: "kitchen home shop table",
  },
  pantry: {
    kind: "food",
    isaS: "toit",
    use: "eat", d: "buy sell",
    w: EVERYWHERE, wS: "kitchen home shop table",
  },
  drink: {
    kind: "drink",
    isa: "jook vedelik",
    use: "drink", d: "buy sell", t: "wet",
    w: EVERYWHERE, wS: "kitchen home fridge shop table",
  },

  /* ---------------- Objects ---------------- */
  furniture: {
    kind: "object",
    isa: "mööbel ese asi",
    hasS: "jalg",
    w: `home ${EVERYWHERE}`, wS: "kitchen school",
    mat: "puit", matS: "metall plast kangas", feel: "hard",
  },
  kitchenware: {
    kind: "object",
    isa: "nõu ese asi",
    d: "wash", w: `kitchen home ${EVERYWHERE}`, wS: "table shop",
    feel: "hard",
  },
  appliance: {
    kind: "object",
    isa: "masin seade ese asi",
    has: "nupp", hasS: "juhe",
    d: "work sound", w: `home kitchen ${EVERYWHERE}`, wS: "shop",
    mat: "metall plast", feel: "hard", t: "electric",
  },
  electronics: {
    kind: "object",
    isa: "seade ese asi", isaS: "masin",
    has: "nupp", hasS: "juhe ekraan",
    d: "work", dS: "sound", w: `home ${EVERYWHERE}`, wS: "school shop table",
    mat: "plast metall", matS: "klaas", feel: "hard", t: "electric",
  },
  stationery: {
    kind: "object",
    isa: "ese asi",
    w: `home school ${EVERYWHERE}`, wS: "shop table",
  },
  tool: {
    kind: "object",
    isa: "tööriist ese asi",
    has: "käepide",
    w: `home ${EVERYWHERE}`, wS: "garden shop",
    mat: "metall", matS: "puit plast", feel: "hard",
  },
  toy: {
    kind: "object",
    isa: "mänguasi ese asi",
    use: "play", w: `home ${EVERYWHERE}`, wS: "garden shop school",
  },
  instrument: {
    kind: "object",
    isa: "pill ese asi",
    use: "play", d: "sound", w: `home ${EVERYWHERE}`, wS: "school shop",
    t: "loud", feel: "hard",
  },
  accessory: {
    kind: "object",
    isa: "ese asi",
    use: "wear", w: `home ${EVERYWHERE}`, wS: "shop city",
  },
  household: {
    kind: "object",
    isa: "ese asi",
    w: `home ${EVERYWHERE}`, wS: "shop",
  },

  /* ---------------- Clothes ---------------- */
  garment: {
    kind: "clothes",
    isa: "riideese rõivas ese asi",
    use: "wear", w: `home ${EVERYWHERE}`, wS: "city outdoors shop",
    mat: "kangas", matS: "puuvill vill", feel: "soft",
  },

  /* ---------------- Vehicles ---------------- */
  roadVehicle: {
    kind: "vehicle",
    isa: "sõiduk", isaS: "masin",
    has: "ratas uks aken mootor rool",
    can: "move", use: "ride", d: "sound",
    w: `street city outdoors ${EVERYWHERE}`, wS: "country",
    mat: "metall", matS: "klaas kumm plast", feel: "hard fast",
  },
  pushVehicle: {
    kind: "vehicle",
    isa: "sõiduk",
    can: "move", use: "ride",
    w: `outdoors ${EVERYWHERE}`, wS: "street city home",
    feel: "hard",
  },

  /* ---------------- Buildings and places ---------------- */
  building: {
    kind: "building",
    isa: "hoone koht",
    has: "uks aken katus",
    w: `city outdoors ${EVERYWHERE}`, wS: "country",
    mat: "kivi", matS: "puit klaas metall", feel: "hard", t: "tall",
  },

  /* ---------------- Nature ---------------- */
  weather: {
    kind: "nature",
    isa: "ilm loodus",
    w: "outdoors sky nature estonia", wS: "africa",
  },
  sky: {
    kind: "nature",
    isa: "taevakeha loodus",
    w: "sky space nature", t: "round",
  },
  landform: {
    kind: "nature",
    isa: "loodus koht",
    w: "outdoors nature estonia africa",
  },
  substance: {
    kind: "nature",
    isa: "loodus", isaS: "materjal",
    w: "outdoors nature estonia africa",
  },

  /* ---------------- The body ---------------- */
  bodyPart: {
    kind: "body",
    isa: "kehaosa",
    t: "natural",
  },
} as const satisfies Record<string, ClassSpec>;

export type ClassId = keyof typeof CLASSES;

/**
 * One thing past the 72. `size` is the one-to-ten scale, `metres` its longest
 * dimension, and `facts` what is true of it beyond its class: a key in a yes
 * list adds it, a key in an `S` list makes it "sometimes", and a key written
 * with a minus (`-fly`) takes it out of both.
 */
export interface Row {
  lemma: string;
  cls: ClassId;
  size: number;
  metres: number;
  facts?: Facts;
  legs?: number;
}

const r = (lemma: string, cls: ClassId, size: number, metres: number, facts?: Facts, legs?: number): Row =>
  ({ lemma, cls, size, metres, facts, legs });

export const ROWS: readonly Row[] = [
  /* Wild mammals */
  r("põder", "wildMammal", 8, 2.8, { has: "kabi", hasS: "sarv", d: "plants", w: "forest estonia", col: "pruun", feel: "fast", notable: "pikk:jalg suur:sarv" }),
  r("hirv", "wildMammal", 7, 2, { has: "kabi", hasS: "sarv", d: "plants", w: "forest estonia", col: "pruun", feel: "fast", notable: "suur:sarv" }),
  r("metssiga", "wildMammal", 6, 1.5, { has: "kabi hammas", d: "plants meat", w: "forest estonia", col: "pruun", colS: "must hall", t: "dangerous strong", tS: "smelly" }),
  r("ilves", "wildMammal", 5, 1.1, { isa: "kiskja", has: "käpp küünis", d: "meat bite", w: "forest estonia", col: "pruun", colS: "kollane hall", canS: "climb", t: "dangerous", feel: "fast", notable: "lühike:saba" }),
  r("orav", "wildMammal", 2, 0.4, { has: "käpp küünis", can: "climb jump", d: "plants", w: "forest estonia", wS: "garden city", col: "pruun", colS: "hall", feel: "fast", notable: "suur:saba" }),
  r("siil", "wildMammal", 2, 0.25, { has: "käpp küünis", d: "meat plants", w: "estonia garden", wS: "forest", col: "pruun", colS: "hall", t: "sharp", feel: "slow" }),
  r("rott", "wildMammal", 2, 0.4, { has: "käpp küünis", can: "climb", d: "meat plants bite", w: "estonia city", wS: "home", col: "hall", colS: "pruun must", feel: "fast", notable: "pikk:saba" }),
  r("ahv", "exoticMammal", 5, 0.8, { has: "käpp sõrm", can: "climb jump", d: "plants play", dS: "meat", w: "forest", col: "pruun", colS: "must hall" }),
  r("tiiger", "exoticMammal", 7, 2.7, { isa: "kiskja", has: "käpp küünis hammas", d: "meat bite", w: "forest", col: "oranž must valge", t: "dangerous strong", feel: "fast" }),
  r("kaamel", "exoticMammal", 8, 3, { has: "kabi", d: "plants", wS: "field", col: "pruun", colS: "kollane", t: "strong", feel: "slow", notable: "pikk:kael pikk:jalg" }),
  r("jõehobu", "exoticMammal", 8, 4, { has: "hammas", can: "swim", d: "plants bite", w: "water", col: "hall", colS: "pruun roosa", t: "dangerous strong thick", feel: "slow", notable: "suur:suu" }),
  r("ninasarvik", "exoticMammal", 8, 3.5, { has: "sarv kabi", d: "plants", col: "hall", t: "dangerous strong thick", notable: "suur:sarv" }),
  r("kaelkirjak", "exoticMammal", 9, 5, { has: "kabi", hasS: "sarv", d: "plants", wS: "field", col: "kollane pruun", t: "tall", notable: "pikk:kael pikk:jalg" }),

  /* Farm animals and pets */
  r("kits", "farmMammal", 5, 1.2, { hasS: "sarv", canS: "climb", col: "valge", colS: "pruun must hall" }),
  r("küülik", "pet", 2, 0.4, { can: "jump", d: "plants", w: "country", wS: "forest", col: "valge", colS: "pruun hall must", feel: "soft fast", notable: "pikk:kõrv" }),
  r("kukk", "bird", 3, 0.6, { isa: "koduloom", w: "country estonia africa", d: "plants", dS: "meat", canS: "fly", col: "punane", colS: "valge pruun must kollane", useS: "eat" }),
  r("hani", "bird", 4, 0.9, { isa: "koduloom", w: "country estonia water", d: "plants", can: "swim", col: "valge", colS: "hall", useS: "eat", notable: "pikk:kael" }),
  r("kalkun", "bird", 4, 1, { isa: "koduloom", w: "country estonia", d: "plants", canS: "fly", col: "pruun", colS: "must valge", useS: "eat" }),

  /* Sea mammals and fish */
  r("vaal", "seaMammal", 9, 20, { col: "hall", colS: "sinine must", t: "strong", feel: "slow" }),
  r("delfiin", "seaMammal", 6, 2.5, { has: "hammas", col: "hall", colS: "sinine", feel: "fast", d: "play" }),
  r("hüljes", "seaMammal", 6, 1.8, { has: "karv küünis", can: "move", w: "estonia", col: "hall", colS: "pruun" }),
  r("hai", "fish", 7, 4, { isa: "kiskja", has: "hammas", d: "meat bite", col: "hall", colS: "sinine valge", t: "dangerous strong", feel: "fast" }),
  r("kalmaar", "seaCreature", 4, 0.6, { d: "meat", col: "roosa", colS: "valge punane", feel: "soft", useS: "eat" }),
  r("krabi", "seaCreature", 3, 0.2, { has: "jalg kest küünis", can: "walk", d: "meat", w: "beach", col: "punane", colS: "pruun", feel: "hard", useS: "eat" }, 10),
  r("meduus", "seaCreature", 3, 0.4, { d: "sting meat", col: "valge", colS: "roosa sinine", t: "transparent", tS: "dangerous poisonous", feel: "soft" }),

  /* Birds */
  r("tuvi", "bird", 2, 0.33, { w: "city estonia africa", wS: "street", d: "plants", col: "hall", colS: "valge" }),
  r("vares", "bird", 3, 0.5, { w: "city estonia country", d: "plants meat", col: "must hall" }),
  r("kajakas", "bird", 3, 0.6, { can: "swim", w: "sea water estonia beach", wS: "city", d: "meat", col: "valge hall" }),
  r("öökull", "bird", 3, 0.5, { isa: "kiskja", w: "forest estonia", d: "meat", col: "pruun", colS: "hall valge", notable: "suur:silm" }),
  r("kotkas", "bird", 4, 0.9, { isa: "kiskja", w: "estonia", wS: "mountains", d: "meat", col: "pruun", colS: "valge", t: "strong", feel: "fast" }),
  r("pääsuke", "bird", 1, 0.18, { w: "estonia country", d: "meat", col: "must valge", colS: "sinine punane", feel: "fast" }),
  r("rähn", "bird", 2, 0.25, { w: "forest estonia", d: "meat", col: "must valge punane", dS: "-sing" }),
  r("varblane", "bird", 1, 0.15, { w: "city estonia country", d: "plants", dS: "meat", col: "pruun hall" }),
  r("tihane", "bird", 1, 0.14, { w: "forest garden estonia", d: "plants meat", col: "kollane", colS: "must valge roheline sinine" }),
  r("toonekurg", "bird", 5, 1.1, { w: "country estonia africa field", d: "meat", col: "valge must", colS: "punane", notable: "pikk:jalg pikk:nokk" }),
  r("luik", "bird", 5, 1.5, { can: "swim", w: "water estonia", d: "plants", col: "valge", colS: "must", notable: "pikk:kael" }),
  r("pingviin", "bird", 4, 1, { can: "-fly swim", w: "water sea", d: "meat", col: "must valge", colS: "kollane" }),
  r("papagoi", "bird", 2, 0.4, { isa: "lemmikloom", w: "forest africa", wS: "home", d: "plants", col: "roheline", colS: "punane sinine kollane", t: "loud" }),

  /* Insects and small creatures */
  r("herilane", "insect", 1, 0.02, { has: "tiib", can: "fly", d: "sting", w: "garden estonia", col: "kollane must", t: "dangerous" }),
  r("sipelgas", "insect", 1, 0.008, { hasS: "tiib", d: "bite", w: "forest garden estonia", col: "must", colS: "pruun punane", t: "strong" }),
  r("kärbes", "insect", 1, 0.008, { has: "tiib", can: "fly", w: "home estonia africa", col: "must", colS: "hall", feel: "fast", d: "sound" }),
  r("sääsk", "insect", 1, 0.006, { has: "tiib", can: "fly", d: "bite sting sound", w: "estonia africa water", col: "hall", colS: "pruun must" }),
  r("lepatriinu", "insect", 1, 0.008, { has: "tiib", can: "fly", w: "garden estonia", d: "meat", col: "punane must", t: "round" }),
  r("kiil", "insect", 1, 0.07, { has: "tiib", can: "fly", w: "water estonia", d: "meat", col: "sinine roheline", colS: "punane", feel: "fast" }),
  r("ämblik", "crawler", 1, 0.02, { has: "jalg", can: "walk climb", d: "meat bite eggs", w: "home garden estonia africa", col: "must", colS: "pruun hall", tS: "poisonous dangerous" }, 8),
  r("uss", "crawler", 1, 0.15, { w: "estonia field", d: "plants", col: "roosa pruun", t: "long thin wet", feel: "soft slow", wS: "garden" }),
  r("tigu", "crawler", 1, 0.05, { has: "kest", w: "garden estonia", d: "plants", col: "pruun", colS: "hall", feel: "slow soft", t: "wet" }),

  /* Reptiles */
  r("madu", "reptile", 4, 1.5, { can: "crawl", canS: "climb", d: "bite", w: "estonia africa", wS: "forest", col: "roheline", colS: "pruun must hall", t: "long thin", tS: "dangerous poisonous" }, 0),
  r("sisalik", "reptile", 2, 0.2, { has: "jalg", can: "run climb", w: "estonia africa", col: "roheline", colS: "pruun hall", feel: "fast" }, 4),
  r("kilpkonn", "reptile", 3, 0.5, { has: "jalg kest", can: "swim walk", w: "water africa", col: "roheline", colS: "pruun", feel: "slow hard", d: "plants" }, 4),
  r("krokodill", "reptile", 7, 4.5, { isa: "kiskja", has: "jalg hammas", can: "swim", d: "bite", w: "water africa", col: "roheline", colS: "pruun hall", t: "dangerous strong long", notable: "suur:suu pikk:saba" }, 4),

  /* Trees and plants */
  r("kask", "tree", 8, 20, { has: "leht", w: "estonia", col: "valge", colS: "kollane must" }),
  r("kuusk", "tree", 9, 30, { hasS: "leht", w: "estonia", tS: "sharp" }),
  r("mänd", "tree", 9, 25, { hasS: "leht", w: "estonia" }),
  r("tamm", "tree", 9, 25, { has: "leht seeme", w: "estonia", t: "strong", tS: "old" }),
  r("roos", "flower", 2, 0.6, { w: "estonia", wS: "shop", col: "punane", colS: "roosa valge kollane", t: "sharp" }),
  r("tulp", "flower", 2, 0.4, { w: "estonia", wS: "shop", col: "punane", colS: "kollane roosa valge lilla" }),
  r("rohi", "plant", 1, 0.3, { has: "leht", w: "estonia africa field garden", col: "roheline", feel: "soft", t: "thin" }),
  r("põõsas", "plant", 6, 2, { has: "leht oks", hasS: "õis seeme", w: "estonia africa garden", col: "roheline", colS: "pruun" }),
  r("sammal", "plant", 1, 0.05, { has: "-juur", w: "forest estonia", col: "roheline", feel: "soft", t: "wet" }),
  r("kaktus", "plant", 3, 0.5, { hasS: "õis", w: "africa home", col: "roheline", t: "sharp", tN: "wet" }),
  r("seen", "fungus", 2, 0.1, { w: "estonia", col: "pruun", colS: "valge punane kollane" }),

  /* Fruit and berries */
  r("pirn", "fruit", 2, 0.1, { col: "roheline kollane", colS: "pruun punane", feel: "hard", w: "estonia" }),
  r("ploom", "fruit", 1, 0.05, { col: "lilla", colS: "punane kollane sinine", has: "seeme", t: "round", feel: "soft" }),
  r("kirss", "fruit", 1, 0.02, { col: "punane", has: "seeme", t: "round", feel: "soft" }),
  r("sidrun", "fruit", 2, 0.08, { col: "kollane", has: "seeme", t: "sour", tN: "sweet" }),
  r("ananass", "fruit", 3, 0.3, { col: "kollane pruun", colS: "roheline", has: "leht", t: "sweet", tS: "sour", feel: "hard", w: "africa" }),
  r("arbuus", "fruit", 4, 0.35, { col: "roheline punane", has: "seeme", t: "round sweet wet", feel: "hard" }),
  r("melon", "fruit", 3, 0.25, { col: "kollane", colS: "roheline", has: "seeme", t: "round sweet", feel: "hard" }),
  r("viinamari", "berry", 1, 0.02, { isaS: "puuvili", col: "roheline", colS: "lilla punane", hasS: "seeme" }),
  r("mustikas", "berry", 1, 0.008, { col: "sinine", colS: "must lilla", w: "forest" }),
  r("vaarikas", "berry", 1, 0.015, { col: "punane", colS: "roosa kollane" }),
  r("sõstar", "berry", 1, 0.01, { col: "punane must", colS: "valge", tS: "sour" }),

  /* Vegetables */
  r("kapsas", "vegetable", 3, 0.2, { has: "leht", col: "roheline", colS: "valge lilla", t: "round" }),
  r("kõrvits", "vegetable", 4, 0.4, { has: "koor seeme", col: "oranž", colS: "kollane roheline", t: "round" }),
  r("peet", "vegetable", 2, 0.08, { has: "koor juur", col: "punane", colS: "lilla", t: "round", tS: "sweet" }),
  r("hernes", "vegetable", 1, 0.008, { col: "roheline", t: "round", tS: "sweet", feel: "soft" }),
  r("uba", "vegetable", 1, 0.015, { col: "pruun", colS: "valge roheline punane must", feel: "hard" }),
  r("küüslauk", "vegetable", 1, 0.05, { has: "koor", col: "valge", t: "smelly", tS: "sharp" }),
  r("mais", "vegetable", 2, 0.2, { has: "leht", col: "kollane", t: "long", tS: "sweet" }),

  /* Dishes and staples */
  r("sai", "dish", 3, 0.3, { has: "koor", col: "valge", colS: "pruun", feel: "soft", t: "dry" }),
  r("salat", "dish", 2, 0.2, { isaS: "köögivili", col: "roheline", colS: "punane", feel: "soft", tS: "wet salty", w: "fridge" }),
  r("pannkook", "dish", 2, 0.25, { col: "kollane", colS: "pruun", t: "round thin", tS: "sweet", feel: "soft warm" }),
  r("puder", "dish", 2, 0.15, { col: "valge", colS: "pruun kollane", feelS: "warm", tS: "sweet salty wet" }),
  r("võileib", "dish", 2, 0.15, { col: "pruun", colS: "valge", tS: "salty" }),
  r("pitsa", "dish", 3, 0.35, { col: "punane kollane", t: "round thin salty", feelS: "warm" }),
  r("küpsis", "sweet", 1, 0.06, { col: "pruun", colS: "kollane", t: "round dry", feel: "hard" }),
  r("komm", "sweet", 1, 0.03, { colS: "punane pruun kollane roheline valge roosa" }),
  r("jogurt", "dish", 2, 0.1, { col: "valge", colS: "roosa", feel: "cold soft", tS: "sweet sour", w: "fridge" }),
  r("sink", "dish", 2, 0.2, { col: "roosa", t: "salty", w: "fridge" }),
  r("riis", "pantry", 1, 0.006, { isa: "toit", col: "valge", colS: "pruun", t: "dry", feel: "hard" }),
  r("suhkur", "pantry", 1, 0.002, { col: "valge", colS: "pruun", t: "sweet dry" }),
  r("sool", "pantry", 1, 0.001, { col: "valge", t: "salty dry" }),
  r("pipar", "pantry", 1, 0.004, { col: "must", colS: "valge punane", t: "sharp dry" }),
  r("mesi", "pantry", 2, 0.1, { col: "kollane", colS: "pruun", t: "sweet", tS: "wet" }),
  r("moos", "pantry", 2, 0.1, { col: "punane", colS: "lilla oranž", t: "sweet", tS: "wet" }),
  r("õli", "pantry", 2, 0.25, { col: "kollane", t: "wet", tN: "dry" }),
  r("äädikas", "pantry", 2, 0.25, { t: "sour wet" }),
  r("kaste", "pantry", 2, 0.1, { colS: "pruun valge punane", t: "wet", tS: "salty" }),
  r("pähkel", "pantry", 1, 0.03, { isa: "toit", has: "koor", col: "pruun", t: "round dry", feel: "hard", d: "grow", wS: "forest" }),

  /* Drinks */
  r("mahl", "drink", 2, 0.12, { colS: "oranž kollane punane roheline", t: "sweet", feelS: "cold" }),
  r("õlu", "drink", 2, 0.15, { col: "kollane", colS: "pruun must", tS: "bitter", feelS: "cold" }),
  r("vein", "drink", 2, 0.25, { col: "punane", colS: "valge", tS: "sour sweet" }),
  r("limonaad", "drink", 2, 0.25, { colS: "kollane oranž roosa", t: "sweet", feel: "cold" }),

  /* Furniture and the home */
  r("diivan", "furniture", 7, 2.1, { use: "sit", useS: "sleep", w: "home", mat: "kangas", feel: "soft", t: "wide" }),
  r("kapp", "furniture", 6, 1.8, { has: "uks", w: "home kitchen", col: "valge pruun", t: "tall" }),
  r("riiul", "furniture", 5, 1.5, { w: "home", col: "valge pruun" }),
  r("peegel", "household", 4, 0.8, { mat: "klaas", w: "home", feel: "hard", t: "thin", tS: "round" }),
  r("vaip", "household", 5, 2.5, { mat: "kangas vill", w: "home", feel: "soft", t: "thin wide" }),
  r("kardin", "household", 6, 2.2, { mat: "kangas", w: "home", feel: "soft", t: "thin long" }),
  r("padi", "household", 3, 0.6, { mat: "kangas", w: "home bed", feel: "soft", use: "sleep" }),
  r("tekk", "household", 5, 2, { mat: "kangas", w: "home bed", feel: "soft warm", t: "wide" }),
  r("rätik", "household", 3, 1, { mat: "kangas puuvill", d: "wash", w: "home", feel: "soft" }),
  r("hambahari", "household", 2, 0.18, { has: "käepide", mat: "plast", w: "home", t: "thin" }),
  r("kamm", "household", 2, 0.15, { mat: "plast", w: "home", t: "thin" }),
  r("seep", "household", 1, 0.08, { w: "home", tS: "smelly wet", d: "smell" }),

  /* Kitchenware and appliances */
  r("nuga", "kitchenware", 2, 0.2, { has: "käepide tera", use: "cut", mat: "metall", t: "sharp", tS: "dangerous" }),
  r("kahvel", "kitchenware", 2, 0.2, { mat: "metall", t: "sharp thin" }),
  r("lusikas", "kitchenware", 2, 0.18, { mat: "metall", t: "thin" }),
  r("taldrik", "kitchenware", 2, 0.25, { mat: "klaas", matS: "plast", col: "valge", t: "round thin" }),
  r("kauss", "kitchenware", 2, 0.18, { matS: "klaas plast puit", t: "round" }),
  r("tass", "kitchenware", 2, 0.1, { has: "käepide", matS: "klaas", col: "valge", t: "round" }),
  r("pudel", "kitchenware", 2, 0.3, { mat: "klaas", matS: "plast", tS: "transparent" }),
  r("pann", "kitchenware", 3, 0.45, { has: "käepide", mat: "metall", t: "round", feelS: "warm" }),
  r("pott", "kitchenware", 3, 0.3, { has: "käepide kaas", mat: "metall", t: "round", feelS: "warm" }),
  r("veekeetja", "appliance", 2, 0.25, { has: "käepide kaas", d: "work", w: "kitchen", feelS: "warm" }),
  r("pliit", "appliance", 6, 0.6, { w: "kitchen", feelS: "warm" }),
  r("ahi", "appliance", 6, 0.6, { has: "uks", w: "kitchen", feelS: "warm" }),
  r("mikrolaineahi", "appliance", 4, 0.5, { has: "uks", w: "kitchen", feelS: "warm" }),
  r("külmkapp", "appliance", 7, 1.8, { has: "uks", w: "kitchen", feel: "cold", col: "valge", t: "tall" }),
  r("nõudepesumasin", "appliance", 6, 0.85, { has: "uks", w: "kitchen", d: "wash" }),
  r("pesumasin", "appliance", 6, 0.85, { has: "uks", w: "home", d: "wash", col: "valge" }),
  r("tolmuimeja", "appliance", 4, 1, { w: "home", t: "loud" }),
  r("triikraud", "appliance", 2, 0.25, { has: "käepide", w: "home", feelS: "warm", t: "heavy" }),

  /* Electronics */
  r("televiisor", "electronics", 5, 1.2, { has: "ekraan", use: "watch", w: "home", d: "sound", col: "must", t: "thin" }),
  r("raadio", "electronics", 3, 0.3, { use: "listen", w: "home", d: "sound" }),
  r("kell", "electronics", 2, 0.3, { w: "home", wS: "school", t: "round", d: "ring" }),
  r("äratuskell", "electronics", 2, 0.15, { w: "home bed", d: "ring sound" }),
  r("kaamera", "electronics", 2, 0.15, { has: "ekraan", w: "home", col: "must" }),
  r("tahvelarvuti", "electronics", 2, 0.25, { has: "ekraan", use: "watch read", useS: "write listen call", w: "home", t: "thin" }),

  /* Stationery and reading */
  r("vihik", "stationery", 2, 0.25, { has: "leht kaas", use: "write", mat: "paber", t: "thin" }),
  r("pastakas", "stationery", 2, 0.14, { use: "write", mat: "plast", t: "thin long" }),
  r("joonlaud", "stationery", 2, 0.3, { mat: "plast", matS: "puit metall", t: "long thin" }),
  r("käärid", "stationery", 2, 0.18, { has: "tera", use: "cut", mat: "metall", t: "sharp" }),
  r("ajaleht", "stationery", 2, 0.5, { has: "leht", use: "read", mat: "paber", t: "thin", w: "home", wS: "-school", feel: "soft" }),
  r("ajakiri", "stationery", 2, 0.3, { has: "leht kaas", use: "read", mat: "paber", t: "thin", colS: "punane sinine kollane valge must" }),

  /* Tools */
  r("haamer", "tool", 2, 0.3, { mat: "metall puit", t: "heavy" }),
  r("saag", "tool", 3, 0.6, { has: "tera", use: "cut", t: "sharp", tS: "dangerous" }),
  r("kirves", "tool", 3, 0.6, { has: "tera", use: "cut", mat: "metall puit", t: "sharp dangerous" }),
  r("labidas", "tool", 5, 1.2, { mat: "metall puit", w: "garden", t: "long" }),
  r("reha", "tool", 5, 1.5, { mat: "puit metall", w: "garden", t: "long" }),
  r("kruvikeeraja", "tool", 2, 0.2, { t: "thin" }),
  r("nael", "tool", 1, 0.05, { has: "-käepide", isaS: "-tööriist", mat: "metall", t: "sharp thin" }),
  r("kruvi", "tool", 1, 0.04, { has: "-käepide", isaS: "-tööriist", mat: "metall", t: "sharp thin" }),

  /* Toys and instruments */
  r("pall", "toy", 3, 0.22, { mat: "kumm", matS: "plast nahk", t: "round", colS: "punane sinine kollane valge must roheline" }),
  r("nukk", "toy", 2, 0.3, { has: "pea jalg silm", matS: "plast kangas", feel: "soft" }),
  r("kaisukaru", "toy", 3, 0.3, { has: "pea jalg silm kõrv", mat: "kangas", col: "pruun", feel: "soft", use: "sleep" }),
  r("pusle", "toy", 2, 0.4, { mat: "paber", matS: "puit", t: "thin" }),
  r("kitarr", "instrument", 4, 1, { has: "keel", mat: "puit", colS: "pruun must punane" }),
  r("klaver", "instrument", 7, 1.6, { has: "keel", mat: "puit", col: "must", colS: "valge pruun", t: "heavy" }),
  r("viiul", "instrument", 3, 0.6, { has: "keel", mat: "puit", col: "pruun" }),
  r("flööt", "instrument", 2, 0.65, { mat: "metall", matS: "puit", t: "long thin" }),
  r("trumm", "instrument", 4, 0.5, { t: "round" }),
  r("trompet", "instrument", 3, 0.5, { mat: "metall", col: "kollane" }),

  /* Accessories */
  r("vihmavari", "accessory", 3, 1, { has: "käepide", mat: "kangas", matS: "metall", colS: "must punane sinine" }),
  r("käekell", "accessory", 1, 0.05, { t: "round", mat: "metall", matS: "nahk plast" }),
  r("sõrmus", "accessory", 1, 0.02, { mat: "kuld metall", t: "round", feel: "hard" }),
  r("kaelakee", "accessory", 1, 0.4, { mat: "kuld metall", t: "thin", feel: "hard" }),
  r("rahakott", "accessory", 2, 0.12, { use: "-wear", useS: "wear", mat: "nahk", matS: "kangas plast", col: "must", colS: "pruun punane" }),
  r("seljakott", "accessory", 3, 0.5, { mat: "kangas", has: "tasku", colS: "must sinine punane roheline" }),

  /* Clothes */
  r("sall", "garment", 3, 1.5, { mat: "vill", feel: "soft warm", t: "long thin" }),
  r("kinnas", "garment", 1, 0.25, { matS: "nahk vill", feel: "soft warm" }),
  r("sokk", "garment", 1, 0.25, { matS: "vill puuvill", feel: "soft" }),
  r("saabas", "garment", 3, 0.4, { mat: "kumm nahk", matS: "kangas", feel: "hard", w: "outdoors" }),
  r("mantel", "garment", 4, 1.1, { has: "tasku varrukas nupp", matS: "vill", feel: "warm", t: "long" }),
  r("kleit", "garment", 3, 1, { colS: "punane sinine must valge roosa roheline kollane" }),
  r("seelik", "garment", 3, 0.6, { colS: "punane sinine must valge roosa" }),
  r("püksid", "garment", 3, 1, { has: "tasku", col: "sinine", colS: "must hall pruun" }),
  r("kampsun", "garment", 3, 0.7, { has: "varrukas", mat: "vill", feel: "warm soft" }),
  r("lips", "garment", 2, 1.4, { t: "long thin", colS: "punane sinine must" }),
  r("vöö", "garment", 2, 1, { mat: "nahk", t: "long thin", col: "must", colS: "pruun" }),
  r("ülikond", "garment", 4, 1, { has: "tasku varrukas nupp", col: "must", colS: "hall sinine" }),
  r("pidžaama", "garment", 3, 1, { has: "varrukas", mat: "puuvill", w: "bed", use: "sleep", feel: "soft" }),

  /* Vehicles */
  r("veoauto", "roadVehicle", 9, 12, { t: "heavy strong", feel: "-fast", feelS: "fast", colS: "valge punane sinine must" }),
  r("takso", "roadVehicle", 7, 4.5, { colS: "kollane valge must" }),
  r("traktor", "roadVehicle", 8, 4, { w: "country field", t: "heavy strong", feel: "slow", colS: "roheline punane sinine" }),
  r("mootorratas", "roadVehicle", 6, 2.1, { has: "-uks -aken", feel: "fast", t: "loud" }),
  r("troll", "roadVehicle", 9, 12, { t: "electric", feel: "-fast", colS: "punane sinine valge" }),
  r("paat", "pushVehicle", 7, 5, { can: "swim", w: "water sea", wS: "-street", mat: "puit", matS: "metall plast" }),
  r("helikopter", "roadVehicle", 9, 15, { has: "-ratas", can: "fly", w: "sky", t: "loud", feel: "fast" }),
  r("rakett", "roadVehicle", 10, 60, { has: "-ratas -rool", can: "fly", w: "sky space", t: "loud", feel: "fast", tS: "dangerous" }),
  r("tõukeratas", "pushVehicle", 4, 1, { has: "ratas käepide", w: "street", mat: "metall" }),
  r("kelk", "pushVehicle", 3, 1, { w: "estonia", mat: "puit", matS: "metall plast", feel: "fast" }),
  r("suusk", "pushVehicle", 5, 1.8, { isaS: "-sõiduk", w: "estonia", t: "long thin", matS: "puit plast" }),

  /* Buildings and places */
  r("korter", "building", 7, 12, { isa: "-hoone", has: "-katus", w: "city", wS: "-country", t: "-tall" }),
  r("kirik", "building", 9, 40, { d: "ring", t: "old", tS: "tall" }),
  r("haigla", "building", 9, 100, {}),
  r("kauplus", "building", 8, 30, {}),
  r("raamatukogu", "building", 8, 40, {}),
  r("muuseum", "building", 8, 50, { tS: "old" }),
  r("teater", "building", 9, 50, {}),
  r("kino", "building", 8, 40, {}),
  r("hotell", "building", 9, 50, {}),
  r("restoran", "building", 8, 20, {}),
  r("kohvik", "building", 7, 15, {}),
  r("jaam", "building", 8, 60, {}),
  r("sild", "building", 9, 200, { isa: "-hoone", has: "-uks -aken -katus", w: "water", mat: "metall kivi", matS: "puit", t: "long" }),
  r("torn", "building", 9, 50, { t: "tall thin", tN: "wide" }),
  r("loss", "building", 9, 100, { t: "old", tS: "tall" }),
  r("tehas", "building", 9, 200, { t: "loud", tS: "smelly" }),
  r("laut", "building", 8, 30, { w: "country", wS: "-city", mat: "puit", matS: "kivi" }),
  r("saun", "building", 6, 5, { w: "country", mat: "puit", feel: "warm", t: "hot" }),

  /* Nature */
  r("kuu", "sky", 10, 3.5e6, { col: "valge", colS: "kollane hall", d: "shine" }),
  r("täht", "sky", 10, 1e9, { d: "shine", t: "bright", feel: "warm" }),
  r("planeet", "sky", 10, 1.2e7, { colS: "sinine punane hall pruun" }),
  r("pilv", "weather", 10, 1000, { col: "valge hall", feel: "soft", tS: "wet" }),
  r("vikerkaar", "weather", 10, 2000, { col: "punane oranž kollane roheline sinine lilla", t: "bright" }),
  r("vihm", "weather", 10, 1000, { t: "wet", feelS: "cold", d: "sound" }),
  r("lumi", "weather", 10, 1000, { t: "wet", col: "valge", feel: "cold soft", d: "melt" }),
  r("tuul", "weather", 10, 1000, { d: "sound", feelS: "cold fast" }),
  r("torm", "weather", 10, 10000, { d: "sound", t: "dangerous strong loud", tS: "wet", feel: "fast" }),
  r("äike", "weather", 10, 10000, { d: "sound shine", t: "dangerous loud" }),
  r("udu", "weather", 10, 1000, { col: "hall valge", t: "wet", feel: "cold" }),
  r("orkaan", "weather", 10, 1e5, { d: "sound", w: "-estonia", t: "dangerous strong loud wet", feel: "fast" }),
  r("jää", "substance", 4, 1, { col: "valge", t: "transparent", feel: "cold hard", d: "melt", wS: "water" }),
  r("kivi", "substance", 2, 0.2, { colS: "hall must valge pruun", feel: "hard", t: "heavy" }),
  r("liiv", "substance", 1, 0.001, { col: "kollane", colS: "pruun valge hall", t: "dry", w: "beach", wS: "water" }),
  r("muld", "substance", 1, 0.001, { col: "pruun must", wS: "garden field" }),
  r("tuli", "substance", 4, 1, { col: "kollane punane oranž", feel: "warm", t: "hot bright dangerous", d: "burn shine" }),
  r("suits", "substance", 5, 5, { col: "hall", colS: "valge must", t: "smelly", w: "sky" }),
  r("oja", "landform", 9, 1000, { w: "water forest", t: "wet long", feelS: "cold" }),
  r("saar", "landform", 10, 5000, { w: "water sea" }),
  r("org", "landform", 10, 2000, { wS: "mountains" }),
  r("meri", "landform", 10, 1e6, { w: "water", t: "wet salty wide", col: "sinine", colS: "hall roheline", feelS: "cold" }),

  /* The body */
  r("pea", "bodyPart", 3, 0.25, { has: "silm kõrv nina suu", t: "round" }),
  r("silm", "bodyPart", 1, 0.025, { t: "round wet" }),
  r("nina", "bodyPart", 1, 0.05, {}),
  r("suu", "bodyPart", 1, 0.05, { has: "hammas keel" }),
  r("kõrv", "bodyPart", 1, 0.06, {}),
  r("käsi", "bodyPart", 3, 0.7, { has: "sõrm", t: "long" }),
  r("jalg", "bodyPart", 5, 1, { t: "long", d: "walk" }),
  r("sõrm", "bodyPart", 1, 0.08, { t: "long thin" }),
  r("süda", "bodyPart", 2, 0.12, { d: "work", feel: "warm" }),
  r("hammas", "bodyPart", 1, 0.02, { col: "valge", feel: "hard", t: "sharp" }),
];

/**
 * The 72 researched things, each given the class it belongs to. The class adds
 * only facts in families the research never asked about (a long neck, where on
 * Earth it lives, whether it is electric); everything the research covered is
 * left as the research said.
 */
export const BASE_CLASS: Readonly<Record<string, ClassId>> = {
  koer: "pet", kass: "pet", part: "bird", kana: "bird", kala: "fish", hobune: "farmMammal",
  lehm: "farmMammal", siga: "farmMammal", jänes: "wildMammal", karu: "wildMammal", hunt: "wildMammal",
  rebane: "wildMammal", lammas: "farmMammal", hiir: "wildMammal", konn: "amphibian", elevant: "exoticMammal",
  liblikas: "insect", mesilane: "insect", lõvi: "exoticMammal",
  leib: "dish", õun: "fruit", banaan: "fruit", juust: "dish", muna: "dish", kook: "sweet", jäätis: "sweet",
  supp: "dish", kartul: "vegetable", porgand: "vegetable", sibul: "vegetable", liha: "dish",
  šokolaad: "sweet", maasikas: "berry", tomat: "vegetable", apelsin: "fruit", vorst: "dish",
  piim: "drink", vesi: "drink", kohv: "drink",
  raamat: "stationery", telefon: "electronics", arvuti: "electronics", pliiats: "stationery",
  laud: "furniture", tool: "furniture", voodi: "furniture", uks: "household", aken: "household",
  kott: "accessory", pilet: "stationery", võti: "household", lamp: "electronics", prillid: "accessory",
  king: "garment", müts: "garment", jope: "garment", särk: "garment",
  auto: "roadVehicle", buss: "roadVehicle", rong: "roadVehicle", lennuk: "roadVehicle", laev: "pushVehicle",
  jalgratas: "pushVehicle", tramm: "roadVehicle",
  maja: "building", puu: "tree", lill: "flower", päike: "sky", järv: "landform", mägi: "landform",
  jõgi: "landform", mets: "landform",
};

/**
 * The 72 things' longest dimension in metres, typical rather than extreme,
 * read off the factbase's researched ranges and rounded to a figure a person
 * would recognise. A dog is taken at a middling dog rather than at the
 * geometric middle of a chihuahua and a mastiff.
 */
export const BASE_METRES: Readonly<Record<string, number>> = {
  hobune: 2.2, kass: 0.45, koer: 0.8, lammas: 1.2, lehm: 2.3, siga: 1.4, elevant: 6, hiir: 0.09,
  hunt: 1.4, jänes: 0.55, karu: 2, lõvi: 2.4, rebane: 0.9, kala: 0.3, kana: 0.45, konn: 0.08,
  liblikas: 0.06, mesilane: 0.013, part: 0.55, banaan: 0.18, juust: 0.15, jäätis: 0.12, kartul: 0.08,
  kook: 0.25, leib: 0.28, muna: 0.06, supp: 0.2, õun: 0.08, apelsin: 0.08, kohv: 0.09, liha: 0.15,
  maasikas: 0.03, piim: 0.2, porgand: 0.18, sibul: 0.08, šokolaad: 0.15, tomat: 0.07, vesi: 0.15,
  vorst: 0.2, arvuti: 0.4, laud: 1.5, pliiats: 0.17, raamat: 0.23, telefon: 0.15, tool: 0.9,
  voodi: 2, aken: 1.2, kott: 0.45, lamp: 0.5, maja: 12, pilet: 0.12, prillid: 0.14, uks: 2.1,
  võti: 0.06, jope: 0.7, särk: 0.7, puu: 15, lill: 0.3, päike: 1.39e9, järv: 3000, mägi: 2500,
  jõgi: 80000, mets: 10000, king: 0.28, müts: 0.25, auto: 4.4, buss: 12, jalgratas: 1.7, laev: 120,
  lennuk: 45, rong: 150, tramm: 25,
};

/**
 * Facts past the research for the 72, in families it never asked about: where on
 * Earth, a notable part, the new parts and uses. Keyed on the lemma.
 */
export const BASE_EXTRA: Readonly<Record<string, Facts>> = {
  koer: { d: "bark bite", w: "estonia" },
  kass: { has: "küünis", can: "climb", d: "meat", w: "estonia" },
  part: { isa: "koduloom", w: "estonia water", d: "plants" },
  kana: { isa: "koduloom", w: "estonia country" , d: "plants" },
  kala: { w: "estonia" , d: "meat" },
  hobune: { use: "ride", notable: "pikk:saba pikk:kael" },
  lehm: { notable: "suur:kõht" },
  siga: { notable: "lühike:saba" },
  jänes: { d: "plants", w: "estonia", notable: "pikk:kõrv lühike:saba" },
  karu: { isa: "kiskja", d: "meat plants", w: "estonia", canS: "climb", has: "küünis käpp" },
  hunt: { isa: "kiskja", d: "meat bite", w: "estonia", has: "küünis käpp" },
  rebane: { isa: "kiskja", d: "meat", w: "estonia", has: "küünis käpp", notable: "suur:saba" },
  hiir: { d: "plants", w: "estonia home", notable: "pikk:saba" },
  konn: { w: "estonia" },
  elevant: { d: "plants", w: "africa", notable: "suur:kõrv pikk:nina pikk:lont" },
  liblikas: { has: "tiib", can: "fly", w: "estonia africa" },
  mesilane: { has: "tiib", can: "fly", d: "sting", w: "estonia africa" },
  lõvi: { isa: "kiskja", d: "meat bite", w: "africa" },
  päike: { isa: "täht", w: "-estonia -africa", d: "shine", t: "hot" },
  järv: { w: "estonia africa" },
  mägi: { w: "-estonia africa", wS: "estonia" },
  jõgi: { w: "estonia africa" },
  mets: { w: "estonia africa" },
};
