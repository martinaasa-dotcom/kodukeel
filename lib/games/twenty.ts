/**
 * KAKSKÜMMEND KÜSIMUST: twenty questions, in Estonian, against the dictionary.
 *
 * The classic game, as it is played against a machine: the machine holds a
 * thing in mind, the player asks yes or no questions, the machine answers yes,
 * no or "sometimes" (and where nothing can honestly be said, that it does not
 * know), and the player has twenty questions to name the thing. A guess is a
 * question and uses one up; a thing that is a kind of something is "yes" to the
 * kind, so a duck is a yes to "bird" and a win only to "duck"; a hint exists and
 * costs a question.
 *
 * WHAT THIS IS FOR. A learner types a whole question in Estonian, with the form
 * of the words it needs, and is told how it could have been put better. So the
 * answer is not the only output: every question comes back with what the game
 * understood, in English, and up to a few plain grammar tips about the sentence
 * as typed.
 *
 * HOW A QUESTION IS READ, IN LAYERS.
 *   1. Words. Each typed word is read against the dictionary (`Lookup`), and a
 *      word the dictionary does not hold is repaired to the one spelling a
 *      letter away that it does (`repair`), which is how `suuur` and `lendap`
 *      are understood and the learner is told the spelling.
 *   2. Roles. Every word is given what it does in the question: the frame
 *      (`kas`, `see`, `on`, `saab`), a negation, a place in an ending
 *      (`metsas`), a part (`sellel on tiivad`), a material (`puidust`), a
 *      describing word, a verb, a number, a comparison, or a thing or kind of
 *      thing named.
 *   3. Meaning. The roles are put together into one or more conditions on the
 *      thing, and several are read as all of them at once, so "kas see on suur
 *      loom" is big and an animal, and "kas sellel on pikk kael" is a neck that
 *      is notably long.
 *   4. Answer. Each condition is checked against the facts
 *      (`lib/games/twentyThings.ts`), with the inferences a person makes for
 *      free: a mammal is an animal and alive, an animal eats and sleeps, a thing
 *      on sale can be bought. The answer carries the check itself (`check`), so
 *      a screen can ask the same question of every other thing and say how many
 *      still fit, which is what the suggestions are built on.
 *
 * WHO MAY WRITE ESTONIAN HERE. Nobody who is not a person. The machine reads the
 * learner's question word by word against the dictionary, built off stored forms
 * and the two derivations ADR-005 amendment 1 allows, plus the accept-only forms
 * list where a spelling the dictionary cannot derive still has to be recognised.
 * No model is asked anything, nothing is generated, and the game works with no
 * key. The Estonian a learner reads back is the dictionary's own headwords, the
 * four answer words (all taught by the course), and a short closed list of
 * question shapes for the tips and suggestions, authored and proofread by a
 * native speaker in the pull request, the standing `lib/estonian/openers.ts` has.
 *
 * NO GRADE. Asking a good question is not recalling a card, and a guess that
 * names the word names it because the clues led there. Nothing goes in the
 * review log, which is the answer `lib/games/picture.ts` gives about the same
 * situation.
 *
 * Pure: no React, no Prisma.
 */

import {
  CATEGORIES, COLOURS, KIND_HINT, PARTS, THINGS, THING_BY_LEMMA,
  type Colour, type Kind, type Part, type Thing, type Where,
} from "./twentyThings";

export const QUESTION_LIMIT = 20;

export type Answer = "yes" | "no" | "sometimes" | "unknown";

/** The four things the machine says. Every one is a word the course teaches. */
export const ANSWER_ET: Record<Answer, string> = {
  yes: "Jah",
  no: "Ei",
  sometimes: "Mõnikord",
  unknown: "Ei tea",
};

export const ANSWER_EN: Record<Answer, string> = {
  yes: "Yes",
  no: "No",
  sometimes: "Sometimes",
  unknown: "I don’t know",
};

/** One way a spelling can be read. `base` is the plain dictionary shape (nominative). */
export interface Reading {
  lemma: string;
  base: boolean;
  /** A `CaseKey` where the dictionary can name the case, else null. */
  case: string | null;
}

/** The dictionary, as the game reads it: a spelling to the words it could be. */
export type Lookup = (token: string) => readonly Reading[];

/** A spelling the dictionary does not hold, to the one it does that is a slip away, or null. */
export type Repair = (token: string) => string | null;

export interface Tip {
  id: string;
  /** What to do, in English. */
  en: string;
  /** The sentence put the way a person would, in the learner's own words where there are any. */
  example?: string;
}

/**
 * What the game took a question to mean, put so a screen in another language
 * can say it in its own words. `en` is a template: `{word}` is an English word
 * a screen translates under the same `context`, and `{thing}` is a headword the
 * screen glosses itself, with `text` as the English to fall back on. `all` is a
 * question read as several conditions at once, each said in turn.
 */
export interface Said {
  en: string;
  context?: string;
  word?: string;
  thing?: { lemma: string | null; text: string };
  all?: readonly Said[];
}

export type Refusal = "empty" | "wh" | "or" | "compare" | "unknown";

export type Reply =
  | { kind: "refused"; why: Refusal; tips: Tip[]; unknownWords?: string[] }
  | {
      kind: "answer";
      answer: Answer;
      /** What the game took the question to mean, in English. */
      reading: string;
      /** The same, as a template a screen can put into the reader's language. */
      said: Said;
      /** The question named a thing (or a kind of thing) rather than describing one. */
      guess: boolean;
      won: boolean;
      /** False where the game could only say it does not know, which costs no question. */
      counts: boolean;
      tips: Tip[];
      /**
       * The same question, asked of any thing: what the answer would have been. A
       * screen keeps this to say which things still fit everything said so far.
       */
      check?: (t: Thing) => Answer;
      /** A guess at a word the game knows but could never be thinking of. */
      outside?: boolean;
    };

export const REFUSAL_EN: Record<Refusal, string> = {
  empty: "Type a question first.",
  wh: "This game wants a yes or no question. Start with kas, and ask about one thing.",
  or: "A yes or no question can’t hold a choice. Ask about one thing at a time.",
  compare: "A comparison needs something to compare with. Try: bigger than a thing you know.",
  unknown: "The game didn’t catch what you want to know. Try one of the ideas below.",
};

/* ------------------------------------------------------------------ */
/* Answers                                                              */
/* ------------------------------------------------------------------ */

const yes = (on: boolean, maybe = false): Answer => (on ? "yes" : maybe ? "sometimes" : "no");
const listed = <T>(list: readonly T[], maybe: readonly T[], x: T): Answer => yes(list.includes(x), maybe.includes(x));

/** Several conditions at once: no if any is no, yes only if all are, and otherwise "sometimes". */
export function allOf(answers: readonly Answer[]): Answer {
  if (answers.includes("no")) return "no";
  if (answers.every((a) => a === "yes")) return "yes";
  if (answers.includes("unknown")) return "unknown";
  return "sometimes";
}

const flipped = (a: Answer): Answer => (a === "yes" ? "no" : a === "no" ? "yes" : a);

const living = (t: Thing) => t.kind === "animal" || t.kind === "plant" || t.isa.includes("elusolend");
const buyable = (t: Thing) => t.does.includes("buy") || t.doesS.includes("buy");

/*
  DEGREES. A property with an opposite is answered through the pair: the thing says it
  is long, so short is a plain no, and the other way round. Where it says neither, a shape
  word answers "sometimes" (a dog is neither long nor short as a rule, and some dogs are),
  and wet and dry are answered off what the thing is: a liquid is wet, an animal or a plant
  is sometimes either, and everything else is dry.
*/
const PAIRS: readonly (readonly [string, string])[] = [
  ["long", "short"], ["wide", "narrow"], ["thick", "thin"], ["wet", "dry"], ["cold", "warm"],
  ["fast", "slow"], ["hard", "soft"], ["old", "new"], ["bright", "dark"], ["cheap", "expensive"],
  ["strong", "weak"], ["tall", "low"], ["loud", "quiet"], ["heavy", "light"], ["fun", "boring"], ["good", "bad"],
];
const OPPOSITE = new Map<string, string>(PAIRS.flatMap(([a, b]) => [[a, b], [b, a]] as [string, string][]));
const SHAPES = new Set(["long", "short", "wide", "narrow", "thick", "thin"]);

function level(t: Thing, key: string): "yes" | "sometimes" | null {
  if (t.trait.includes(key) || (t.feel as readonly string[]).includes(key)) return "yes";
  if (t.traitS.includes(key) || (t.feelS as readonly string[]).includes(key)) return "sometimes";
  return null;
}

/** What a degree word says where the thing has no fact either way. */
function unsaid(t: Thing, key: string): Answer {
  if (SHAPES.has(key)) return t.kind === "nature" && t.isa.includes("ilm") ? "no" : "sometimes";
  if (key === "wet") return living(t) ? "sometimes" : "no";
  if (key === "dry") return living(t) ? "sometimes" : "yes";
  return "no";
}

function degree(t: Thing, key: string): Answer {
  if (t.traitNo.includes(key)) return "no";
  const own = level(t, key);
  if (own === "yes") return "yes";
  const other = OPPOSITE.get(key);
  const opp = other ? level(t, other) : null;
  if (opp === "yes") return "no";
  if (own === "sometimes" || opp === "sometimes") return "sometimes";
  return unsaid(t, key);
}

/*
  Size, on the one-to-ten scale. What you have a serving or a heap of (a cup of milk, a
  bag of sugar, a pile of sand) has no size of its own and answers Ei tea, and weather
  is as big as it is that day, so it answers Mõnikord.
*/
const SIZELESS = new Set([
  "supp", "kohv", "liha", "piim", "vesi", "mahl", "õlu", "vein", "limonaad", "õli", "äädikas", "kaste", "mesi", "moos", "jogurt",
  "suhkur", "sool", "pipar", "riis", "puder", "liiv", "muld",
]);
const SIZE_VARIES = new Set(["vihm", "lumi", "tuul", "udu", "pilv"]);

function bySize(t: Thing, rule: (size: number) => Answer): Answer {
  return SIZELESS.has(t.lemma) ? "unknown" : SIZE_VARIES.has(t.lemma) ? "sometimes" : rule(t.size);
}

const big = (t: Thing) => bySize(t, (n) => (n >= 7 ? "yes" : n >= 5 ? "sometimes" : "no"));
const small = (t: Thing) => bySize(t, (n) => (n <= 2 ? "yes" : n <= 4 ? "sometimes" : "no"));
// A liquid weighs what there is of it: a cup is light and a bucket is not.
const heavy = (t: Thing): Answer => (t.trait.includes("heavy") ? "yes" : t.trait.includes("light") ? "no" : SIZELESS.has(t.lemma) ? "sometimes" : big(t));
const light = (t: Thing): Answer => (t.trait.includes("light") ? "yes" : t.trait.includes("heavy") ? "no" : SIZELESS.has(t.lemma) ? "sometimes" : small(t));
const tall = (t: Thing): Answer => (t.trait.includes("tall") ? "yes" : t.traitS.includes("tall") ? "sometimes"
  : SIZELESS.has(t.lemma) ? "no" : bySize(t, (n) => (n >= 8 ? "sometimes" : "no")));
const low = (t: Thing): Answer => (t.trait.includes("tall") ? "no" : SIZELESS.has(t.lemma) ? "sometimes" : bySize(t, (n) => (n <= 3 ? "yes" : n <= 6 ? "sometimes" : "no")));
// What can be held, lifted or carried does not wait on a size for a liquid: you hold a
// cup of it and lift a pot of it, it never goes in a pocket, and in a bag only bottled.
const sizelessOr = (t: Thing, liquid: Answer, rule: (n: number) => Answer): Answer =>
  SIZELESS.has(t.lemma) ? liquid : bySize(t, rule);
const holdable = (t: Thing) => sizelessOr(t, "sometimes", (n) => (n <= 3 ? "yes" : n === 4 ? "sometimes" : "no"));
const liftable = (t: Thing) => sizelessOr(t, "sometimes", (n) => (n <= 4 ? "yes" : n <= 6 ? "sometimes" : "no"));
const pocket = (t: Thing) => sizelessOr(t, "no", (n) => (n <= 1 ? "yes" : n === 2 ? "sometimes" : "no"));
const bag = (t: Thing) => sizelessOr(t, "sometimes", (n) => (n <= 3 ? "yes" : n === 4 ? "sometimes" : "no"));

const alive = (t: Thing): Answer =>
  t.kind === "animal" || t.kind === "plant" || t.isa.includes("seen") ? "yes"
  // A forest is a living thing, an apple or a carrot was one, and a heart is part of one.
  : t.lemma === "mets" || t.isa.includes("puuvili") || t.isa.includes("köögivili") || t.isa.includes("mari") || t.kind === "body" ? "sometimes" : "no";

/** Kinds of thing, as the categories a question names. */
function isaTest(cat: string): (t: Thing) => Answer {
  return (t) => {
    if (t.lemma === cat) return "yes";
    if (t.isa.includes(cat)) return "yes";
    if (t.isaS.includes(cat)) return "sometimes";
    switch (cat) {
      case "asi": return t.kind === "object" || t.kind === "clothes" || t.kind === "vehicle" ? "yes"
        : t.kind === "food" || t.kind === "drink" || t.kind === "building" ? "sometimes" : "no";
      case "ese": return t.kind === "vehicle" ? "sometimes" : "no";
      case "elusolend": case "olend": return t.kind === "animal" ? "yes" : t.kind === "plant" && cat === "elusolend" ? "yes" : "no";
      case "loodus": {
        const n = level(t, "natural");
        return t.kind === "nature" || t.kind === "plant" || (t.kind === "animal" && n === "yes") ? "yes" : n === "sometimes" ? "sometimes" : "no";
      }
      case "vedelik": return t.isa.includes("jook") || SIZELESS.has(t.lemma) && t.trait.includes("wet") ? "yes" : "no";
      case "koht": return t.kind === "building" || (t.kind === "nature" && t.isa.includes("koht")) ? "yes" : "no";
      case "masin": return t.isa.includes("seade") ? "sometimes" : "no";
      case "seade": return t.isa.includes("masin") ? "yes" : "no";
      case "rõivas": return t.isa.includes("riideese") ? "yes" : "no";
      case "riideese": return t.isa.includes("rõivas") ? "yes" : "no";
      case "toit": return t.use.includes("eat") ? "sometimes" : "no";
      default: return "no";
    }
  };
}

/* Opinions are answered by what a thing is, since "is it tasty?" means nothing of a car. */
function opinion(key: string): (t: Thing) => Answer {
  return (t) => {
    if (t.traitNo.includes(key)) return "no";
    const own = level(t, key);
    if (own) return own;
    const opp = OPPOSITE.get(key);
    if (opp && level(t, opp) === "yes") return "no";
    const edible = t.use.includes("eat") || t.use.includes("drink") || t.useS.includes("eat");
    switch (key) {
      case "tasty": case "healthy": return edible ? "sometimes" : "no";
      case "cute": return t.kind === "animal" || t.isa.includes("mänguasi") ? "sometimes" : "no";
      case "scary": return t.trait.includes("dangerous") ? "yes" : t.kind === "animal" || t.isa.includes("ilm") ? "sometimes" : "no";
      case "boring": return t.isa.includes("mänguasi") || t.isa.includes("pill") ? "no" : "sometimes";
      case "fun": return t.isa.includes("mänguasi") || t.isa.includes("pill") || t.kind === "vehicle" || t.kind === "animal" ? "sometimes" : "no";
      case "expensive": case "cheap": return buyable(t) ? "sometimes" : "no";
      case "quiet": return t.trait.includes("loud") ? "no" : t.does.includes("sound") ? "sometimes" : "yes";
      case "bright": return t.does.includes("shine") ? "yes" : t.colour.includes("valge") || t.colour.includes("kollane") ? "sometimes" : t.colour.includes("must") ? "no" : "sometimes";
      case "dark": return t.does.includes("shine") ? "no" : t.colour.includes("must") ? "yes" : t.colour.includes("valge") || t.colour.includes("kollane") ? "no" : "sometimes";
      case "useful": return t.kind === "object" || t.kind === "vehicle" || t.kind === "clothes" || t.kind === "building" ? "yes" : "sometimes";
      default: return "sometimes";
    }
  };
}

function colourful(t: Thing): Answer {
  const n = t.colour.length + t.colourS.length;
  return t.colour.length >= 3 ? "yes" : n >= 3 || t.colour.length >= 2 ? "sometimes" : "no";
}

function does(key: string): (t: Thing) => Answer {
  return (t) => {
    if (key === "smell") {
      return t.does.includes("smell") || t.trait.includes("smelly") ? "yes"
        : t.doesS.includes("smell") || t.traitS.includes("smelly") ? "sometimes" : "no";
    }
    if (key === "die") return living(t) ? "yes" : listed(t.does, t.doesS, key);
    if (key === "sleep" && t.kind === "animal") return "yes";
    if (key === "sound" && t.trait.includes("loud")) return "yes";
    return listed(t.does, t.doesS, key);
  };
}

const eats = (t: Thing): Answer => (t.kind === "animal" ? "yes" : "no");
const needsWater = (t: Thing): Answer =>
  living(t) || t.lemma === "pesumasin" || t.lemma === "nõudepesumasin" || t.lemma === "veekeetja" ? "yes" : "no";
const electric = (t: Thing): Answer => degree(t, "electric");

function where(w: Where): (t: Thing) => Answer {
  return (t) => listed(t.where, t.whereS, w);
}

/** Places a question names that are a reading of the facts rather than a fact of their own. */
const everywhere = (t: Thing): Answer => (t.where.length + t.whereS.length >= 8 ? "sometimes" : "no");
const highUp = (t: Thing): Answer => (t.where.includes("sky") || t.where.includes("space") ? "yes"
  : t.whereS.includes("sky") || t.can.includes("fly") || t.trait.includes("tall") ? "sometimes" : "no");
/** Domestic: an animal people keep is, a wild one is not, and a thing at home is in a way. */
const domestic = (t: Thing): Answer => (t.kind === "animal"
  ? (t.isa.includes("koduloom") || t.isa.includes("lemmikloom") ? "yes" : t.isaS.includes("koduloom") || t.isaS.includes("lemmikloom") ? "sometimes" : "no")
  : t.where.includes("home") ? "sometimes" : "no");
/** Wild is the other side of domestic, for an animal; a plant growing on its own is wild too. */
const wild = (t: Thing): Answer => (t.kind === "animal"
  ? (t.isa.includes("lemmikloom") || t.isa.includes("koduloom") ? (t.isaS.includes("metsloom") ? "sometimes" : "no") : "yes")
  : t.kind === "plant" ? (t.where.includes("forest") || t.where.includes("nature") ? "yes" : "sometimes") : "no");
/** What a hand can reach: not the sky, and a hot or dangerous thing only with care. */
const touchable = (t: Thing): Answer => (t.where.includes("space") || t.isa.includes("taevakeha") || t.lemma === "pilv" || t.lemma === "vikerkaar" ? "no"
  : t.trait.includes("hot") || t.trait.includes("dangerous") || t.does.includes("burn") ? "sometimes" : "yes");
const onFarm = (t: Thing): Answer => (t.kind === "animal"
  ? (t.isa.includes("koduloom") && !t.isa.includes("lemmikloom") ? "yes" : t.isa.includes("lemmikloom") || t.isaS.includes("koduloom") || t.where.includes("country") || t.whereS.includes("country") ? "sometimes" : "no")
  : t.isa.includes("köögivili") || t.lemma === "traktor" || t.lemma === "heinamaa" ? "yes"
  : t.where.includes("country") || t.where.includes("field") || t.isa.includes("puuvili") ? "sometimes" : "no");
/** A zoo keeps the animals people travel to see, and some they could see at home. */
const inZoo = (t: Thing): Answer => (t.kind !== "animal" ? "no"
  : t.where.includes("africa") || t.isa.includes("kiskja") || t.isa.includes("roomaja") ? "yes"
  : t.isa.includes("lemmikloom") ? "no" : "sometimes");
const ON_WALL = new Set(["kell", "peegel", "pilt", "kalender", "maal", "lamp", "riiul", "aken", "uks", "kardin", "telekas", "televiisor"]);
const onWall = (t: Thing): Answer => (ON_WALL.has(t.lemma) ? "yes"
  : t.kind === "animal" && (t.can.includes("climb") || t.can.includes("fly")) && t.size <= 2 ? "sometimes" : "no");
const onFloor = (t: Thing): Answer => (t.isa.includes("mööbel") || t.lemma === "vaip" ? "yes"
  : (t.where.includes("home") || t.whereS.includes("home")) && t.size <= 6 && t.kind !== "nature" ? "sometimes" : "no");
const inAir = (t: Thing): Answer => (t.where.includes("sky") ? "yes" : t.can.includes("fly") || t.canS.includes("fly") || t.whereS.includes("sky") ? "sometimes" : "no");
const UNDERGROUND = new Set(["uss", "muld", "kartul", "porgand", "peet", "juur", "küüslauk"]);
const underground = (t: Thing): Answer => (UNDERGROUND.has(t.lemma) ? "yes"
  : t.lemma === "sibul" || t.lemma === "kivi" || t.lemma === "liiv" || t.isa.includes("puu") ? "sometimes" : "no");
const onEarth = (t: Thing): Answer => (t.where.includes("space") || t.isa.includes("taevakeha") ? "no"
  : t.where.includes("sea") && !t.where.includes("outdoors") ? "no"
  : t.kind === "nature" && t.isa.includes("ilm") && t.where.includes("sky") ? "sometimes"
  : t.can.includes("fly") ? "sometimes" : "yes");
const onTable = (t: Thing): Answer => (t.where.includes("table") ? "yes" : t.whereS.includes("table") ? "sometimes"
  : (t.kind === "object" || t.kind === "food" || t.kind === "drink") && t.size <= 3 && (t.where.includes("home") || t.where.includes("kitchen")) ? "sometimes" : "no");
const withPeople = (t: Thing): Answer => (t.isa.includes("lemmikloom") || t.isa.includes("koduloom") ? "yes" : t.where.includes("home") || t.whereS.includes("home") ? "sometimes" : "no");

function part(p: Part): (t: Thing) => Answer {
  return (t) => listed(t.has, t.hasS, p);
}

/** A part that is notably like something: a giraffe's neck is long, a dog's is not worth saying. */
function notablePart(adjective: string, p: Part): (t: Thing) => Answer {
  return (t) => {
    const has = listed(t.has, t.hasS, p);
    if (has === "no") return "no";
    if (t.notable.includes(`${adjective}:${p}`)) return has;
    // "~pikk:kael": notable on some of them, as a horse's neck is.
    if (t.notable.includes(`~${adjective}:${p}`)) return "sometimes";
    const same = NOTABLE_SAME[adjective];
    if (same && t.notable.includes(`${same}:${p}`)) return has;
    return "no";
  };
}
/** A long trunk is a big one; a large ear is a big one. */
const NOTABLE_SAME: Record<string, string> = { suur: "pikk", pikk: "suur" };

function legCount(n: number): (t: Thing) => Answer {
  return (t) => {
    const has = listed(t.has, t.hasS, "jalg");
    if (n === 0) return has === "no" ? "yes" : has === "sometimes" ? "sometimes" : "no";
    if (has === "no") return "no";
    if (t.legs === null) return "sometimes";
    return t.legs === n ? has : "no";
  };
}

/*
  Comparing two things. Size reads the one-to-ten steps a learner can see on the board,
  and two things on the same step are not bigger than each other. Only where the steps
  are equal and one thing is many times the other (the sun and a mountain are both a
  ten) does the longest dimension decide. Speed reads what the things are.
*/
type Measure = "size" | "speed";
const speedOf = (t: Thing) => (t.feel.includes("fast") ? 2 : t.feel.includes("slow") ? 0 : t.can.includes("move") ? 1 : -1);

function compared(measure: Measure, more: boolean, ref: { metres: number | null; thing: Thing | null }): (t: Thing) => Answer {
  return (t) => {
    if (measure === "speed") {
      if (!ref.thing) return "unknown";
      const a = speedOf(t), b = speedOf(ref.thing);
      if (a === b) return "no";
      return (more ? a > b : a < b) ? "yes" : "no";
    }
    if (SIZELESS.has(t.lemma) || (ref.thing && SIZELESS.has(ref.thing.lemma)) || ref.metres === null) return "unknown";
    if (SIZE_VARIES.has(t.lemma) || (ref.thing && SIZE_VARIES.has(ref.thing.lemma))) return "sometimes";
    if (ref.thing && t.size !== ref.thing.size) return (more ? t.size > ref.thing.size : t.size < ref.thing.size) ? "yes" : "no";
    const ratio = t.metres / ref.metres;
    // On the same step, or measured against a length rather than a thing: within a factor
    // of four (with a thing) or a quarter (with a length) is the same size, and not bigger.
    const same = ref.thing ? 4 : 1.25;
    if (ratio < same && ratio > 1 / same) return "no";
    return (more ? ratio > 1 : ratio < 1) ? "yes" : "no";
  };
}

/* ------------------------------------------------------------------ */
/* The words the game reads                                            */
/* ------------------------------------------------------------------ */

interface Meaning {
  id: string;
  en: string;
  said?: Said;
  test: (t: Thing) => Answer;
  /** Needs "on" (is) in front of it to be a sentence: "kas see on suur". */
  copula: boolean;
}

const fixed = (id: string, en: string, test: (t: Thing) => Answer, copula: boolean): Meaning => ({ id, en, test, copula });

/** Describing words, read with "on": "kas see on suur". */
const DESCRIBING: Record<string, Meaning> = {
  suur: fixed("big", "Is it big?", big, true),
  väike: fixed("small", "Is it small?", small, true),
  raske: fixed("heavy", "Is it heavy?", heavy, true),
  kerge: fixed("light", "Is it light?", light, true),
  kõrge: fixed("tall", "Is it tall?", tall, true),
  madal: fixed("low", "Is it low?", low, true),
  kiire: fixed("fast", "Is it fast?", (t) => degree(t, "fast"), true),
  aeglane: fixed("slow", "Is it slow?", (t) => degree(t, "slow"), true),
  kõva: fixed("hard", "Is it hard?", (t) => degree(t, "hard"), true),
  pehme: fixed("soft", "Is it soft?", (t) => degree(t, "soft"), true),
  külm: fixed("cold", "Is it cold?", (t) => degree(t, "cold"), true),
  soe: fixed("warm", "Is it warm?", (t) => degree(t, "warm"), true),
  kuum: fixed("hot", "Is it hot?", (t) => (t.trait.includes("hot") ? "yes" : t.feel.includes("warm") || t.feelS.includes("warm") ? "sometimes" : "no"), true),
  elus: fixed("alive", "Is it alive?", alive, true),
  elav: fixed("alive", "Is it alive?", alive, true),
  märg: fixed("wet", "Is it wet?", (t) => degree(t, "wet"), true),
  kuiv: fixed("dry", "Is it dry?", (t) => degree(t, "dry"), true),
  magus: fixed("sweet", "Is it sweet?", (t) => degree(t, "sweet"), true),
  soolane: fixed("salty", "Is it salty?", (t) => degree(t, "salty"), true),
  hapu: fixed("sour", "Is it sour?", (t) => degree(t, "sour"), true),
  mõru: fixed("bitter", "Is it bitter?", (t) => degree(t, "bitter"), true),
  terav: fixed("sharp", "Is it sharp?", (t) => degree(t, "sharp"), true),
  ümar: fixed("round", "Is it round?", (t) => degree(t, "round"), true),
  ümmargune: fixed("round", "Is it round?", (t) => degree(t, "round"), true),
  kandiline: fixed("square", "Is it square?", (t) => (degree(t, "round") === "yes" ? "no" : degree(t, "square") === "yes" ? "yes" : t.kind === "object" || t.kind === "building" ? "sometimes" : "no"), true),
  pikk: fixed("long", "Is it long?", (t) => degree(t, "long"), true),
  lühike: fixed("short", "Is it short?", (t) => degree(t, "short"), true),
  lai: fixed("wide", "Is it wide?", (t) => degree(t, "wide"), true),
  kitsas: fixed("narrow", "Is it narrow?", (t) => degree(t, "narrow"), true),
  paks: fixed("thick", "Is it thick?", (t) => degree(t, "thick"), true),
  õhuke: fixed("thin", "Is it thin?", (t) => degree(t, "thin"), true),
  ohtlik: fixed("dangerous", "Is it dangerous?", (t) => degree(t, "dangerous"), true),
  mürgine: fixed("poisonous", "Is it poisonous?", (t) => degree(t, "poisonous"), true),
  tugev: fixed("strong", "Is it strong?", (t) => degree(t, "strong"), true),
  nõrk: fixed("weak", "Is it weak?", (t) => degree(t, "weak"), true),
  looduslik: fixed("natural", "Is it a natural thing, not made by people?", (t) => degree(t, "natural"), true),
  elektriline: fixed("electric", "Does it run on electricity?", electric, true),
  läbipaistev: fixed("transparent", "Can you see through it?", (t) => degree(t, "transparent"), true),
  vali: fixed("loud", "Is it loud?", (t) => (t.trait.includes("loud") ? "yes" : t.does.includes("sound") ? "sometimes" : "no"), true),
  lärmakas: fixed("loud", "Is it loud?", (t) => (t.trait.includes("loud") ? "yes" : t.does.includes("sound") ? "sometimes" : "no"), true),
  karvane: fixed("hairy", "Is it hairy?", part("karv"), true),
  värviline: fixed("colourful", "Is it colourful?", colourful, true),
  mitmevärviline: fixed("colourful", "Is it colourful?", colourful, true),
  kirju: fixed("colourful", "Is it colourful?", colourful, true),
  söödav: fixed("edible", "Can you eat it?", (t) => listed(t.use, t.useS, "eat"), true),
  vana: fixed("old", "Is it old?", opinion("old"), true),
  uus: fixed("new", "Is it new?", opinion("new"), true),
  kallis: fixed("expensive", "Is it expensive?", opinion("expensive"), true),
  odav: fixed("cheap", "Is it cheap?", opinion("cheap"), true),
  ilus: fixed("pretty", "Is it pretty?", opinion("pretty"), true),
  kasulik: fixed("useful", "Is it useful?", opinion("useful"), true),
  haruldane: fixed("rare", "Is it rare?", opinion("rare"), true),
  vaikne: fixed("quiet", "Is it quiet?", opinion("quiet"), true),
  puhas: fixed("clean", "Is it clean?", opinion("clean"), true),
  räpane: fixed("dirty", "Is it dirty?", opinion("dirty"), true),
  tume: fixed("dark", "Is it dark?", opinion("dark"), true),
  hele: fixed("bright", "Is it bright?", opinion("bright"), true),
  maitsev: fixed("tasty", "Is it tasty?", opinion("tasty"), true),
  tervislik: fixed("healthy", "Is it healthy?", opinion("healthy"), true),
  armas: fixed("cute", "Is it cute?", opinion("cute"), true),
  hirmus: fixed("scary", "Is it scary?", opinion("scary"), true),
  lõbus: fixed("fun", "Is it fun?", opinion("fun"), true),
  igav: fixed("boring", "Is it boring?", opinion("boring"), true),
  hea: fixed("good", "Is it good?", opinion("good"), true),
  kodune: fixed("domestic", "Is it domestic?", domestic, true),
  metsik: fixed("wild", "Is it wild?", wild, true),
  halb: fixed("bad", "Is it bad?", opinion("bad"), true),
};

const COLOUR_EN: Record<Colour, string> = {
  punane: "red", sinine: "blue", kollane: "yellow", roheline: "green",
  valge: "white", must: "black", pruun: "brown", hall: "grey", roosa: "pink", oranž: "orange", lilla: "purple",
};

for (const c of COLOURS) {
  DESCRIBING[c] = {
    id: `colour:${c}`, en: `Is it ${COLOUR_EN[c]}?`, copula: true,
    said: { en: "Is it {word}?", context: "colour", word: COLOUR_EN[c] },
    test: (t) => listed(t.colour, t.colourS, c),
  };
}

const SPINY = new Set(["kuusk", "mänd", "kaktus", "roos", "siil", "kibuvits", "nõges"]);
const DERIVED_PARTS: Record<string, { en: string; test: (t: Thing) => Answer }> = {
  kroon: { en: "a crown", test: (t) => (t.isa.includes("puu") ? "yes" : "no") },
  okas: { en: "spines or needles", test: (t) => (SPINY.has(t.lemma) ? "yes" : "no") },
};

const PART_EN: Record<Part, string> = {
  jalg: "legs", tiib: "wings", saba: "a tail", ratas: "wheels", uks: "a door",
  aken: "a window", sulg: "feathers", karv: "fur", leht: "leaves or pages", nokk: "a beak",
  silm: "eyes", kõrv: "ears", nina: "a nose", suu: "a mouth", pea: "a head", hammas: "teeth", kõht: "a belly",
  selg: "a back", sarv: "horns", nahk: "skin", koor: "a peel, bark or crust", seeme: "seeds", juur: "roots",
  oks: "branches", rool: "a steering wheel or handlebars", ekraan: "a screen", nupp: "buttons",
  klaviatuur: "a keyboard", kaas: "a cover", uim: "fins", käpp: "paws", kabi: "hooves",
  kael: "a neck", küünis: "claws", soomus: "scales", õis: "blossoms", tüvi: "a trunk", lont: "a trunk",
  mootor: "an engine", katus: "a roof", käepide: "a handle", keel: "a tongue or strings", kest: "a shell",
  tasku: "pockets", varrukas: "sleeves", tera: "a blade", juhe: "a cable", luu: "bones", süda: "a heart",
  sõrm: "fingers", vars: "a stalk",
};

/** Part words that are also things: "uks" is a door you can have and a door you can guess. */
const PART_IS_ALSO_A_THING = new Set<string>(PARTS.filter((p) => THING_BY_LEMMA.has(p)));

/** What an adjective in front of a part means: "pikk kael", "suured kõrvad". */
const PART_ADJECTIVES = new Set(["pikk", "lühike", "suur", "väike"]);

type Active = Meaning;
interface Verb { active: Active; passive?: Meaning }
const both = (m: Meaning): Verb => ({ active: m });

const canDo = (a: "fly" | "swim" | "jump" | "move" | "run" | "climb" | "crawl" | "walk") =>
  (t: Thing): Answer => {
    if (a === "walk" || a === "run") {
      const own = listed(t.can, t.canS, a);
      if (own !== "no") return own;
      return a === "walk" ? listed(t.does, t.doesS, "walk") : "no";
    }
    return listed(t.can, t.canS, a);
  };
const usedFor = (u: Parameters<typeof listed<string>>[2]) => (t: Thing): Answer => listed(t.use as readonly string[], t.useS as readonly string[], u);
/*
  "Kas seda saab kanda?" is wearing or carrying about: yes for what is worn or carried on
  you (clothes, a bag, a ring, a wallet), sometimes for the small things carried in a hand.
*/
const CARRIED_IN_HAND = new Set(["raamat", "pliiats", "telefon", "võti", "pilet"]);
const carried = (t: Thing): Answer => {
  if (CARRIED_IN_HAND.has(t.lemma)) return "sometimes";
  return usedFor("wear")(t);
};

/** Verbs, read active ("it flies") and, where it differs, passive ("you can eat it"). */
const VERBS: Record<string, Verb> = {
  lendama: both(fixed("fly", "Does it fly?", canDo("fly"), false)),
  ujuma: both(fixed("swim", "Does it swim?", canDo("swim"), false)),
  hüppama: both(fixed("jump", "Does it jump?", canDo("jump"), false)),
  liikuma: both(fixed("move", "Does it move?", canDo("move"), false)),
  // A four-legged mammal that runs at all runs. A bird runs only if it is said to: a hen
  // and a goose do, a sparrow hops and a swallow does not land to run.
  jooksma: both(fixed("run", "Does it run?", (t) => (t.isa.includes("imetaja") && t.legs === 4 && t.canS.includes("run") ? "yes" : canDo("run")(t)), false)),
  kõndima: both(fixed("walk", "Does it walk?", canDo("walk"), false)),
  ronima: both(fixed("climb", "Does it climb?", canDo("climb"), false)),
  roomama: both(fixed("crawl", "Does it crawl?", canDo("crawl"), false)),
  sõitma: {
    active: fixed("drives", "Does it drive along?", (t) => (t.kind === "vehicle" ? listed(t.can, t.canS, "move") : "no"), false),
    passive: fixed("ride", "Can you ride it?", usedFor("ride"), false),
  },
  // Riding an animal is ratsutama, so a horse is plainly ridden even where "sõita" is only sometimes.
  ratsutama: both(fixed("ride", "Can you ride it?", (t) => (t.kind === "animal" && usedFor("ride")(t) !== "no" ? "yes" : usedFor("ride")(t)), false)),
  kandma: both(fixed("wear", "Can you wear or carry it?", carried, false)),
  lugema: both(fixed("read", "Can you read it?", usedFor("read"), false)),
  kirjutama: both(fixed("write", "Can you write with it?", usedFor("write"), false)),
  lõikama: both(fixed("cut", "Can you cut with it?", usedFor("cut"), false)),
  helistama: both(fixed("call", "Can you make a phone call with it?", usedFor("call"), false)),
  kuulama: both(fixed("listen", "Can you listen to it?", (t) => (usedFor("listen")(t) !== "no" ? usedFor("listen")(t) : t.isa.includes("pill") ? "yes" : "no"), false)),
  vaatama: both(fixed("watch", "Can you watch it?", usedFor("watch"), false)),
  istuma: {
    active: fixed("sits", "Does it sit?", (t) => (t.kind === "animal" && t.legs === 4 ? "sometimes" : "no"), false),
    passive: fixed("sit", "Can you sit on it?", usedFor("sit"), false),
  },
  magama: {
    active: fixed("sleeps", "Does it sleep?", does("sleep"), false),
    passive: fixed("sleep-on", "Can you sleep on it?", usedFor("sleep"), false),
  },
  mängima: {
    active: fixed("plays", "Does it play?", does("play"), false),
    passive: fixed("play", "Can you play with it?", (t) => (usedFor("play")(t) !== "no" ? usedFor("play")(t) : does("play")(t) !== "no" ? "sometimes" : "no"), false),
  },
  hoidma: both(fixed("hold", "Can you hold it in your hand?", holdable, false)),
  tõstma: both(fixed("lift", "Can you lift it?", liftable, false)),
  sööma: {
    active: fixed("eats", "Does it eat?", eats, false),
    passive: fixed("edible", "Can you eat it?", usedFor("eat"), false),
  },
  jooma: {
    active: fixed("drinks", "Does it drink?", eats, false),
    passive: fixed("drinkable", "Can you drink it?", usedFor("drink"), false),
  },
  haukuma: both(fixed("bark", "Does it bark?", does("bark"), false)),
  kasvama: both(fixed("grow", "Does it grow?", does("grow"), false)),
  laulma: both(fixed("sing", "Does it sing?", does("sing"), false)),
  töötama: both(fixed("work", "Does it work, or run?", does("work"), false)),
  ostma: both(fixed("buy", "Can you buy it?", does("buy"), false)),
  müüma: both(fixed("sell", "Can you sell it?", does("sell"), false)),
  kinkima: both(fixed("gift", "Can you give it as a present?", (t) => (buyable(t) ? "sometimes" : "no"), false)),
  põlema: both(fixed("burn", "Does it burn?", does("burn"), false)),
  helisema: both(fixed("ring", "Does it ring?", does("ring"), false)),
  sündima: both(fixed("born", "Is it born?", does("born"), false)),
  surema: both(fixed("die", "Does it die?", does("die"), false)),
  kasutama: both(fixed("use", "Do people use it?", (t) => (t.kind === "object" || t.kind === "vehicle" || t.kind === "clothes" ? "yes" : does("use")(t)), false)),
  pesema: both(fixed("wash", "Can you wash it?", does("wash"), false)),
  kriipima: both(fixed("scratch", "Does it scratch?", does("scratch"), false)),
  paistma: both(fixed("shine", "Does it shine?", does("shine"), false)),
  helendama: both(fixed("shine", "Does it shine?", does("shine"), false)),
  haisema: both(fixed("smell", "Does it smell?", does("smell"), false)),
  lõhnama: both(fixed("smell", "Does it smell?", does("smell"), false)),
  hammustama: both(fixed("bite", "Does it bite?", does("bite"), false)),
  puudutama: both(fixed("touch", "Can you touch it?", touchable, false)),
  nõelama: both(fixed("sting", "Does it sting?", does("sting"), false)),
  munema: both(fixed("eggs", "Does it lay eggs?", does("eggs"), false)),
  õitsema: both(fixed("bloom", "Does it bloom?", does("bloom"), false)),
  sulama: both(fixed("melt", "Does it melt?", does("melt"), false)),
};

/** Verbs that say only that it is, or is somewhere: dropped when a place says the rest. */
const FRAME_VERBS = new Set(["olema", "elama", "asuma", "leiduma", "esinema", "kasvama", "saama", "võima", "oskama", "liikuma", "käima"]);

/** The places a question names, in an ending: "metsas", "kodus", "Eestis". */
const PLACES: Record<string, { at: (t: Thing) => Answer; id: string; en: string; cases: readonly string[] }> = {
  kodu: { id: "home", at: where("home"), en: "Is it at home?", cases: ["INESSIVE"] },
  maja: { id: "home", at: where("home"), en: "Is it at home?", cases: ["INESSIVE"] },
  tuba: { id: "home", at: where("home"), en: "Is it at home?", cases: ["INESSIVE"] },
  korter: { id: "home", at: where("home"), en: "Is it at home?", cases: ["INESSIVE"] },
  köök: { id: "kitchen", at: where("kitchen"), en: "Is it in the kitchen?", cases: ["INESSIVE"] },
  õu: { id: "outdoors", at: where("outdoors"), en: "Is it outdoors?", cases: ["INESSIVE"] },
  õues: { id: "outdoors", at: where("outdoors"), en: "Is it outdoors?", cases: ["INESSIVE", "BASE"] },
  mets: { id: "forest", at: where("forest"), en: "Is it in the forest?", cases: ["INESSIVE"] },
  vesi: { id: "water", at: where("water"), en: "Is it in the water?", cases: ["INESSIVE"] },
  järv: { id: "water", at: where("water"), en: "Is it in the water?", cases: ["INESSIVE"] },
  jõgi: { id: "water", at: where("water"), en: "Is it in the water?", cases: ["INESSIVE"] },
  meri: { id: "sea", at: where("sea"), en: "Is it in the sea?", cases: ["INESSIVE"] },
  ookean: { id: "sea", at: where("sea"), en: "Is it in the sea?", cases: ["INESSIVE"] },
  linn: { id: "city", at: where("city"), en: "Is it in the city?", cases: ["INESSIVE"] },
  maa: { id: "country", at: where("country"), en: "Is it in the countryside?", cases: ["ADESSIVE"] },
  küla: { id: "country", at: where("country"), en: "Is it in the countryside?", cases: ["INESSIVE"] },
  aed: { id: "garden", at: where("garden"), en: "Is it in the garden?", cases: ["INESSIVE"] },
  taevas: { id: "sky", at: where("sky"), en: "Is it in the sky?", cases: ["INESSIVE", "BASE"] },
  õhk: { id: "air", at: inAir, en: "Is it in the air?", cases: ["INESSIVE"] },
  kool: { id: "school", at: where("school"), en: "Is it at school?", cases: ["INESSIVE"] },
  pood: { id: "shop", at: where("shop"), en: "Is it in a shop?", cases: ["INESSIVE"] },
  kauplus: { id: "shop", at: where("shop"), en: "Is it in a shop?", cases: ["INESSIVE"] },
  tänav: { id: "street", at: where("street"), en: "Is it on the street?", cases: ["ADESSIVE", "INESSIVE"] },
  külmkapp: { id: "fridge", at: where("fridge"), en: "Is it in the fridge?", cases: ["INESSIVE"] },
  voodi: { id: "bed", at: where("bed"), en: "Is it in a bed?", cases: ["INESSIVE"] },
  loodus: { id: "nature", at: (t) => isaTest("loodus")(t) === "yes" || t.where.includes("nature") ? "yes" : where("nature")(t), en: "Is it found in nature?", cases: ["INESSIVE"] },
  kosmos: { id: "space", at: where("space"), en: "Is it in space?", cases: ["INESSIVE"] },
  eesti: { id: "estonia", at: where("estonia"), en: "Is it in Estonia?", cases: ["INESSIVE"] },
  aafrika: { id: "africa", at: where("africa"), en: "Is it in Africa?", cases: ["INESSIVE"] },
  põld: { id: "field", at: where("field"), en: "Is it in a field?", cases: ["ADESSIVE", "INESSIVE"] },
  rand: { id: "beach", at: where("beach"), en: "Is it on the beach?", cases: ["ADESSIVE", "INESSIVE"] },
  mägi: { id: "mountains", at: where("mountains"), en: "Is it in the mountains?", cases: ["INESSIVE", "ADESSIVE"] },
  laud: { id: "table", at: onTable, en: "Is it on the table?", cases: ["ADESSIVE"] },
  kõikjal: { id: "everywhere", at: everywhere, en: "Is it everywhere?", cases: ["BASE"] },
  talu: { id: "farm", at: onFarm, en: "Is it on a farm?", cases: ["INESSIVE", "ADESSIVE"] },
  loomaaed: { id: "zoo", at: inZoo, en: "Is it in a zoo?", cases: ["INESSIVE"] },
  sein: { id: "wall", at: onWall, en: "Is it on the wall?", cases: ["ADESSIVE"] },
  põrand: { id: "floor", at: onFloor, en: "Is it on the floor?", cases: ["ADESSIVE"] },
};

/** Where a postposition says it is: "maa all", "laua peal", "inimese juures". */
const POSTPOSITIONS: Record<string, Record<string, { id: string; at: (t: Thing) => Answer; en: string }>> = {
  all: { maa: { id: "underground", at: underground, en: "Is it underground?" } },
  peal: {
    maa: { id: "on-earth", at: onEarth, en: "Is it on the ground, on Earth?" },
    laud: { id: "table", at: onTable, en: "Is it on the table?" },
  },
  juures: { inimene: { id: "with-people", at: withPeople, en: "Does it live with people?" } },
};

/** "kõrgel": high up. A place word with no noun behind it. */
const HIGH_UP = { id: "high", at: highUp, en: "Is it high up?" };

/** What things are made of, named in the elative: "puidust", "kivist". Two of them under another name. */
const MATERIAL_EN: Record<string, string> = {
  puit: "wood", metall: "metal", klaas: "glass", paber: "paper", kivi: "stone", raud: "iron",
  kuld: "gold", kumm: "rubber", vill: "wool", puuvill: "cotton", plast: "plastic", kangas: "fabric", nahk: "leather",
};
const MATERIAL_ALIAS: Record<string, string> = { puu: "puit", plastik: "plast", riie: "kangas" };

const COMPARATIVES: Record<string, { measure: Measure; more: boolean; en: string }> = {
  suurem: { measure: "size", more: true, en: "bigger" },
  väiksem: { measure: "size", more: false, en: "smaller" },
  pikem: { measure: "size", more: true, en: "longer" },
  lühem: { measure: "size", more: false, en: "shorter" },
  raskem: { measure: "size", more: true, en: "heavier" },
  kergem: { measure: "size", more: false, en: "lighter" },
  kõrgem: { measure: "size", more: true, en: "taller" },
  kiirem: { measure: "speed", more: true, en: "faster" },
  aeglasem: { measure: "speed", more: false, en: "slower" },
};

/**
 * Words a learner compares with that the game is never thinking of, with their
 * longest dimension: a person, a country, Everest. A kind of thing is taken at
 * an ordinary member of it.
 */
const REFERENCE_METRES: Record<string, number> = {
  inimene: 1.7, laps: 1.1, beebi: 0.5, mees: 1.8, naine: 1.7, riik: 300000, eesti: 350000,
  aafrika: 8000000, euroopa: 4000000, ookean: 10000000, maailm: 40000000, küla: 1000, linn: 10000,
  everest: 8848, lind: 0.3, loom: 1, putukas: 0.01, imetaja: 1, sõiduk: 4, hoone: 15, mööbel: 1.2,
  puuvili: 0.08, köögivili: 0.1, mari: 0.01, roomaja: 1, taevakeha: 1e7,
};

/** Words that are names rather than headwords, read as they are typed. */
const NAMES: Record<string, string> = { everest: "everest" };

/** Words a question carries that say nothing about the thing: "ka", "väga", "mingi". */
const FILLERS = new Set([
  "ka", "väga", "tõesti", "üldse", "tavaliselt", "enamasti", "mingi", "ikka", "siis", "nüüd", "ju", "vist",
  "kindlasti", "peamiselt", "ise", "päris", "eriti", "veel", "just", "küll", "äkki", "üks", "igas", "iga",
  "tehtud", "valmistatud", "inimesed", "inimene", "osa",
]);

const NUMBERS: Record<string, number> = {
  null: 0, üks: 1, kaks: 2, kolm: 3, neli: 4, viis: 5, kuus: 6, seitse: 7, kaheksa: 8, üheksa: 9, kümme: 10,
};

const WH = new Set(["kes", "mis", "kus", "kuhu", "millal", "miks", "kuidas", "milline", "mitu", "palju", "kui", "mitmes"]);
const IT = new Set(["see", "tema", "need", "nemad"]);
const YOU = new Set(["sina", "teie"]);
const NEGATION = new Set(["ei", "pole", "mitte", "polnud"]);
const MODAL = new Set(["saama", "võima", "oskama"]);

/**
 * Spellings the tables above name that are forms rather than headwords, read off
 * the question as typed (`igas`, `tehtud`), or a place written in lower case where
 * the dictionary heads it with a capital. Not asked of the dictionary.
 */
const SPELLINGS_NOT_HEADWORDS = new Set(["mitmes", "peamiselt", "igas", "tehtud", "valmistatud", "inimesed", "eesti", "aafrika", "euroopa"]);

/** Every lemma the game has to be able to read, so the page can fetch exactly these. */
export const NEEDED_LEMMAS: readonly string[] = [...new Set([
  "kas", "see", "tema", "olema", "ei", "mitte", "kui", "või", "ja", "saama", "võima", "oskama", "käsi",
  "sina", "teie", "mina", "osa", "keha", "tegema", "hääl", "elekter", "vajama", "mahtuma", "tasku", "kott",
  "liha", "rohi", "taim", "elama", "asuma", "leiduma", "esinema", "käima", "all", "peal", "juures", "inimene",
  "valmistama", "iga", "kroon", "okas", "talu", "loomaaed", "sein", "põrand",
  ...WH, ...FILLERS, ...Object.keys(NUMBERS),
  ...Object.keys(DESCRIBING), ...Object.keys(VERBS), ...Object.keys(PLACES),
  ...Object.keys(MATERIAL_EN), ...Object.keys(MATERIAL_ALIAS),
  ...Object.keys(REFERENCE_METRES).filter((l) => !NAMES[l]), "Eesti", "Aafrika", "Euroopa",
  ...PARTS, ...CATEGORIES, ...THINGS.map((t) => t.lemma),
  "jah", "teadma", "mõnikord",
])].filter((l) => !SPELLINGS_NOT_HEADWORDS.has(l));

/* ------------------------------------------------------------------ */
/* Reading a question                                                   */
/* ------------------------------------------------------------------ */

export function tokensOf(text: string): string[] {
  return text.toLowerCase().normalize("NFC").split(/[^\p{L}\p{M}]+/u).filter(Boolean);
}

interface Word {
  raw: string;
  /** The spelling read, which is `raw` unless it was repaired. */
  read: string;
  readings: readonly Reading[];
}

const hasLemma = (w: Word, lemma: string) => w.readings.some((r) => r.lemma.toLowerCase() === lemma);
const lemmasOf = (w: Word) => w.readings.map((r) => r.lemma.toLowerCase());

/** One condition the question puts on the thing, and the word it came from. */
interface Found {
  meaning: Meaning;
  raw: string;
  /** What kind of word it was, for the tips. */
  role: "describing" | "verb" | "part" | "place" | "material" | "compare" | "name" | "count";
}

export interface AskOptions {
  /** The dictionary's English for a headword, used to say back what a guess was taken to mean. */
  glossOf?: (lemma: string) => string | undefined;
  /** A spelling to the one a slip away, for a word the dictionary does not hold. */
  repair?: Repair;
  /**
   * Spellings known to be real Estonian words, which are never repaired into
   * another one: `halb` is "bad" and not a slip for `hall`, grey. The forms list
   * says so (`realSpellings`); with no answer from it, every unknown word may be
   * repaired, which is the right side to err on offline.
   */
  real?: ReadonlySet<string>;
}

/**
 * Read one question and answer it about `secret`.
 *
 * `glossOf` may be passed alone, for the callers written before `AskOptions`.
 */
export function ask(
  question: string,
  secret: Thing,
  lookup: Lookup,
  options: AskOptions | ((lemma: string) => string | undefined) = {},
): Reply {
  const opts: AskOptions = typeof options === "function" ? { glossOf: options } : options;
  const glossOf = opts.glossOf ?? (() => undefined);
  const raws = tokensOf(question);
  if (raws.length === 0) return { kind: "refused", why: "empty", tips: [] };

  const tips: Tip[] = [];
  const repaired: { from: string; to: string }[] = [];
  const words: Word[] = raws.map((raw) => {
    const readings = lookup(raw);
    if (readings.length > 0 || NAMES[raw] || raw in COMPARATIVES || NEGATION.has(raw) || raw === "kõrgel") return { raw, read: raw, readings };
    const fix = opts.real?.has(raw) ? null : opts.repair?.(raw) ?? null;
    if (fix) {
      repaired.push({ from: raw, to: fix });
      return { raw, read: fix, readings: lookup(fix) };
    }
    return { raw, read: raw, readings };
  });
  const has = (lemma: string) => words.some((w) => hasLemma(w, lemma));
  const asked = question.trim();

  const first = words[0]!;
  const startsWithKas = hasLemma(first, "kas");
  if (!startsWithKas && first.readings.some((r) => WH.has(r.lemma))) {
    return { kind: "refused", why: "wh", tips: [whTip()] };
  }
  if (has("või") && !has("mitte")) return { kind: "refused", why: "or", tips: [orTip()] };

  const negated = words.some((w) => NEGATION.has(w.raw) || hasLemma(w, "ei") || hasLemma(w, "mitte") || w.raw === "pole");
  const addressed = words.some((w) => w.readings.some((r) => YOU.has(r.lemma)) || w.raw === "sa" || w.raw === "te");
  const possessive = words.some((w) => w.readings.some((r) => IT.has(r.lemma) && (r.case === "ADESSIVE")) || ["sel", "tal", "sellel", "temal", "neil", "nendel", "sul", "teil"].includes(w.raw));
  const object = words.some((w) => w.readings.some((r) => r.lemma === "see" && r.case === "PARTITIVE") || w.raw === "seda");
  const impersonal = words.some((w) => /(?:t|d)?akse$|kse$/.test(w.read) && w.readings.length > 0 && w.readings.every((r) => !r.base));
  const modal = words.some((w) => w.readings.some((r) => MODAL.has(r.lemma)));
  const passive = impersonal || (modal && !words.some((w) => w.raw === "see" || w.raw === "ta")) || object;

  const used = new Set<number>();
  const found: Found[] = [];
  let guess: { lemma: string; raw: string; base: boolean; outside: boolean } | null = null;
  let unknownCompare = false;

  // A comparison is read first, because its reference word must not be read as a guess.
  words.forEach((w, i) => {
    const cmp = COMPARATIVES[w.read];
    if (!cmp) return;
    used.add(i);
    const kuiAt = words.findIndex((x, j) => j > i && hasLemma(x, "kui"));
    if (kuiAt === -1) {
      tips.push({ id: "kui", en: "Put kui (than) before the thing you compare with." });
    } else used.add(kuiAt);
    // The thing compared with is the next word that names something, up to two words on.
    let refAt = -1;
    for (let j = (kuiAt === -1 ? i : kuiAt) + 1; j < words.length; j++) {
      const x = words[j]!;
      if (FILLERS.has(x.read) && !(x.read in REFERENCE_METRES) || x.readings.some((r) => FILLERS.has(r.lemma) && !THING_BY_LEMMA.has(r.lemma) && !(r.lemma in REFERENCE_METRES))) { used.add(j); continue; }
      refAt = j;
      break;
    }
    if (refAt === -1) { unknownCompare = true; return; }
    used.add(refAt);
    const ref = words[refAt]!;
    const reading = ref.readings.find((r) => THING_BY_LEMMA.has(r.lemma)) ?? ref.readings.find((r) => r.lemma.toLowerCase() in REFERENCE_METRES);
    const name = NAMES[ref.read];
    const lemma = reading?.lemma ?? name ?? null;
    const refThing = lemma ? THING_BY_LEMMA.get(lemma) ?? null : null;
    const metres = refThing ? refThing.metres : lemma ? REFERENCE_METRES[lemma.toLowerCase()] ?? null : null;
    if (reading && !reading.base) {
      tips.push({
        id: "kui-form",
        en: "After kui, the thing you compare with stays in its plain dictionary form.",
        example: `Kas see on ${w.read} kui ${reading.lemma}?`,
      });
    }
    // Something compared with that is not a thing at all ("suurem kui elektriline asi") is not
    // a comparison the game can make, and is said so rather than guessed at.
    if (lemma === null || (metres === null && cmp.measure === "size")) { unknownCompare = true; return; }
    const label = refThing ? glossOf(refThing.lemma) ?? refThing.lemma : glossOf(lemma) ?? lemma;
    const en = `Is it ${cmp.en} than “${label}”?`;
    found.push({
      raw: w.raw, role: "compare",
      meaning: {
        id: `compare:${cmp.en}:${lemma}`, en, copula: true,
        said: { en: `Is it ${cmp.en} than “{thing}”?`, thing: { lemma: refThing?.lemma ?? lemma, text: label } },
        test: compared(cmp.measure, cmp.more, { metres, thing: refThing }),
      },
    });
  });
  if (unknownCompare && found.length === 0) {
    return { kind: "refused", why: "compare", tips: dedupe([...tips, compareTip()]) };
  }

  // Postpositions: "maa all", "laua peal", "inimese juures".
  words.forEach((w, i) => {
    if (used.has(i) || i === 0) return;
    const table = POSTPOSITIONS[w.read];
    if (!table) return;
    const before = words[i - 1]!;
    for (const lemma of lemmasOf(before)) {
      const at = table[lemma];
      if (!at) continue;
      used.add(i); used.add(i - 1);
      found.push({ raw: `${before.raw} ${w.raw}`, role: "place", meaning: fixed(`where:${at.id}`, at.en, at.at, false) });
      return;
    }
  });

  // "osa kehast", "osa loodusest": a part of something is a kind of it.
  words.forEach((w, i) => {
    if (used.has(i) || !hasLemma(w, "osa")) return;
    const next = words[i + 1];
    if (!next) return;
    if (hasLemma(next, "keha")) {
      used.add(i); used.add(i + 1);
      found.push({ raw: `${w.raw} ${next.raw}`, role: "name", meaning: fixed("isa:kehaosa", "Is it a part of the body?", isaTest("kehaosa"), true) });
    } else if (hasLemma(next, "loodus")) {
      used.add(i); used.add(i + 1);
      found.push({ raw: `${w.raw} ${next.raw}`, role: "name", meaning: fixed("isa:loodus", "Is it part of nature?", isaTest("loodus"), true) });
    }
  });

  // "teeb häält": it makes a sound. "vajab elektrit", "töötab elektriga": it is electric.
  // "vajab vett": it needs water. "mahub taskusse", "mahub kotti": it fits.
  // "sööb liha", "sööb rohtu": what it eats.
  words.forEach((w, i) => {
    if (used.has(i)) return;
    const next = (k: number) => words[i + k];
    const isLemma = (x: Word | undefined, l: string) => x !== undefined && hasLemma(x, l);
    if (hasLemma(w, "tegema") && isLemma(next(1), "hääl")) {
      used.add(i); used.add(i + 1);
      found.push({ raw: w.raw, role: "verb", meaning: fixed("sound", "Does it make a sound?", does("sound"), false) });
    } else if ((hasLemma(w, "vajama") || hasLemma(w, "töötama")) && isLemma(next(1), "elekter")) {
      used.add(i); used.add(i + 1);
      found.push({ raw: w.raw, role: "verb", meaning: fixed("electric", "Does it run on electricity?", electric, false) });
    } else if (hasLemma(w, "vajama") && isLemma(next(1), "vesi")) {
      used.add(i); used.add(i + 1);
      found.push({ raw: w.raw, role: "verb", meaning: fixed("needs-water", "Does it need water?", needsWater, false) });
    } else if (hasLemma(w, "mahtuma") && next(1)) {
      const into = next(1)!;
      used.add(i); used.add(i + 1);
      const inPocket = hasLemma(into, "tasku");
      found.push({ raw: w.raw, role: "verb", meaning: inPocket
        ? fixed("pocket", "Does it fit in a pocket?", pocket, false)
        : fixed("bag", "Does it fit in a bag?", bag, false) });
    } else if (hasLemma(w, "sööma") && next(1) && (isLemma(next(1), "liha") || isLemma(next(1), "rohi") || isLemma(next(1), "taim"))) {
      used.add(i); used.add(i + 1);
      const meat = isLemma(next(1), "liha");
      found.push({ raw: w.raw, role: "verb", meaning: meat
        ? fixed("eats-meat", "Does it eat meat?", does("meat"), false)
        : fixed("eats-plants", "Does it eat plants?", does("plants"), false) });
    }
  });

  // Numbers before a part: "neli jalga".
  words.forEach((w, i) => {
    if (used.has(i)) return;
    const n = NUMBERS[w.read] ?? w.readings.map((r) => NUMBERS[r.lemma]).find((x) => x !== undefined);
    const next = words[i + 1];
    if (n === undefined || !next) return;
    if (hasLemma(next, "jalg")) {
      used.add(i); used.add(i + 1);
      found.push({ raw: `${w.raw} ${next.raw}`, role: "count", meaning: {
        id: `legs:${n}`, en: `Does it have ${n} legs?`, copula: false,
        said: { en: "Does it have {word} legs?", context: "count", word: String(n) },
        test: legCount(n),
      } });
    } else if (PARTS.some((p) => hasLemma(next, p))) {
      // "kaks silma": the number is about the part, which is what is asked.
      used.add(i);
    }
  });

  // An adjective in front of a part: "pikk kael", "suured kõrvad".
  words.forEach((w, i) => {
    if (used.has(i)) return;
    const next = words[i + 1];
    if (!next) return;
    const adjective = lemmasOf(w).find((l) => PART_ADJECTIVES.has(l));
    const p = lemmasOf(next).find((l) => (PARTS as readonly string[]).includes(l)) as Part | undefined;
    if (!adjective || !p) return;
    if (PART_IS_ALSO_A_THING.has(p) && !possessive) return;
    used.add(i); used.add(i + 1);
    found.push({ raw: `${w.raw} ${next.raw}`, role: "part", meaning: {
      id: `notable:${adjective}:${p}`, en: `Does it have ${PART_EN[p]} that stand out (${adjective})?`, copula: false,
      said: { en: "Does it have {word} that stand out?", context: "part", word: PART_EN[p] },
      test: notablePart(adjective, p),
    } });
  });

  // Everything else, word by word.
  const unknownWords: string[] = [];
  words.forEach((w, i) => {
    if (used.has(i)) return;
    const readings = w.readings;
    const lemmas = lemmasOf(w);
    // "kõrgel" is an adverb, high up, whatever else the forms list says it could be.
    if (w.read === "kõrgel") { found.push({ raw: w.raw, role: "place", meaning: fixed(`where:${HIGH_UP.id}`, HIGH_UP.en, HIGH_UP.at, true) }); return; }
    if (lemmas.length === 0) {
      if (NAMES[w.read]) {
        guess = guess ?? { lemma: NAMES[w.read]!, raw: w.raw, base: true, outside: true };
        return;
      }
      if (w.read === "kõrgel") { found.push({ raw: w.raw, role: "place", meaning: fixed(`where:${HIGH_UP.id}`, HIGH_UP.en, HIGH_UP.at, true) }); return; }
      if (NEGATION.has(w.read)) return;
      if (w.raw === "sa" || w.raw === "te") return;
      unknownWords.push(w.raw);
      return;
    }
    // The frame of the question says nothing about the thing.
    // `must` is also the elative of `mina`, so a frame word only frames where no reading of it says more.
    const says = (l: string) => (THING_BY_LEMMA.has(l) && !IT.has(l)) || l in DESCRIBING || l in VERBS
      || (PARTS as readonly string[]).includes(l) || l in PLACES;
    if (lemmas.some((l) => l === "kas" || IT.has(l) || YOU.has(l) || l === "mina" || NEGATION.has(l) || l === "kui")) {
      if (!lemmas.some(says)) return;
    }
    // "inimene" frames "do people eat it" and is a guess in "is it a person".
    const personNamed = lemmas.includes("inimene") && w.readings.some((r) => r.base) && has("olema");
    if (!personNamed && lemmas.some((l) => FILLERS.has(l)) && !lemmas.some((l) => l in DESCRIBING || THING_BY_LEMMA.has(l) || PLACES[l])) return;

    // Where it is: a place word in an ending, or the adverb "õues".
    const place = readings.find((r) => {
      const at = PLACES[r.lemma.toLowerCase()];
      return at !== undefined && (at.cases.includes(r.case ?? "") || (at.cases.includes("BASE") && r.base) || (r.case === null && !r.base && /(?:s|l)$/.test(w.read)));
    });
    if (place) {
      const site = PLACES[place.lemma.toLowerCase()]!;
      found.push({ raw: w.raw, role: "place", meaning: fixed(`where:${site.id}`, site.en, site.at, true) });
      return;
    }

    // What it is made of: a material in the elative ("puidust").
    const material = readings.find((r) => {
      const m = MATERIAL_ALIAS[r.lemma] ?? r.lemma;
      return m in MATERIAL_EN && (r.case === "ELATIVE" || (r.case === null && /st$/.test(w.read)));
    });
    if (material) {
      const key = MATERIAL_ALIAS[material.lemma] ?? material.lemma;
      found.push({ raw: w.raw, role: "material", meaning: {
        id: `made:${key}`, en: `Is it made of ${MATERIAL_EN[key]}?`, copula: true,
        said: { en: "Is it made of {word}?", context: "material", word: MATERIAL_EN[key] },
        test: (t) => listed(t.made, t.madeS, key),
      } });
      return;
    }

    // A part no thing records, worked out from what the thing is: a tree has a crown,
    // and needles or spines are on the few things listed.
    const derived = readings.find((r) => r.lemma in DERIVED_PARTS);
    if (derived) {
      const d = DERIVED_PARTS[derived.lemma]!;
      found.push({ raw: w.raw, role: "part", meaning: {
        id: `has:${derived.lemma}`, en: `Does it have ${d.en}?`, copula: false,
        said: { en: "Does it have {word}?", context: "part", word: d.en },
        test: d.test,
      } });
      return;
    }

    // What it has.
    const partReading = readings.find((r) => (PARTS as readonly string[]).includes(r.lemma));
    if (partReading && (!PART_IS_ALSO_A_THING.has(partReading.lemma) || possessive || !partReading.base)) {
      const p = partReading.lemma as Part;
      found.push({ raw: w.raw, role: "part", meaning: {
        id: `has:${p}`, en: `Does it have ${PART_EN[p]}?`, copula: false,
        said: { en: "Does it have {word}?", context: "part", word: PART_EN[p] },
        test: part(p),
      } });
      return;
    }

    // What it is like.
    for (const r of readings) {
      const m = DESCRIBING[r.lemma];
      if (m && !(THING_BY_LEMMA.has(r.lemma) && r.base && !DESCRIBING[r.lemma])) { found.push({ raw: w.raw, role: "describing", meaning: m }); return; }
    }

    // What it does.
    for (const r of readings) {
      const v = VERBS[r.lemma];
      if (!v) continue;
      found.push({ raw: w.raw, role: "verb", meaning: passive && v.passive ? v.passive : v.active });
      return;
    }

    // A thing, or a kind of thing, named.
    const named = readings.find((r) => THING_BY_LEMMA.has(r.lemma) || (CATEGORIES as readonly string[]).includes(r.lemma))
      ?? readings.find((r) => r.lemma.toLowerCase() in REFERENCE_METRES);
    if (named) {
      if (THING_BY_LEMMA.has(named.lemma) || !(CATEGORIES as readonly string[]).includes(named.lemma) && !(named.lemma.toLowerCase() in REFERENCE_METRES)) {
        guess = guess ?? { lemma: named.lemma, raw: w.raw, base: named.base, outside: false };
        return;
      }
      if ((CATEGORIES as readonly string[]).includes(named.lemma)) {
        found.push({ raw: w.raw, role: "name", meaning: {
          id: `isa:${named.lemma}`, en: `Is it “${glossOf(named.lemma) ?? named.lemma}”?`, copula: true,
          said: { en: "Is it “{thing}”?", thing: { lemma: named.lemma, text: glossOf(named.lemma) ?? named.lemma } },
          test: isaTest(named.lemma),
        } });
        if (!named.base) tips.push(baseTip(named.lemma));
        return;
      }
      // A word the game knows and could never be thinking of: a person, a country.
      guess = guess ?? { lemma: named.lemma, raw: w.raw, base: named.base, outside: true };
      return;
    }

    // A verb that only frames the question.
    if (lemmas.some((l) => FRAME_VERBS.has(l) || MODAL.has(l))) return;
    // A word the dictionary knows, and the game has nothing to say about.
    unknownWords.push(w.raw);
  });

  for (const { from, to } of repaired) {
    if (!unknownWords.includes(from)) tips.push({ id: `spell:${from}`, en: "Check the spelling. I read your word as:", example: to });
  }
  if (addressed) {
    tips.push({ id: "see", en: "Ask about the thing, see (it), rather than sa (you).", example: exampleFrom(raws) });
  }

  const negate = (a: Answer) => (negated ? flipped(a) : a);

  // A guess on its own, or a guess with something said about it.
  if (guess && found.length === 0) {
    const g = guess as { lemma: string; raw: string; base: boolean; outside: boolean };
    const gloss = glossOf(g.lemma) ?? g.lemma;
    const reading = `Is it “${gloss}”?`;
    if (!g.base) tips.push(baseTip(g.lemma));
    if (!has("olema") && words.length > 1) {
      tips.push({ id: "on", en: "Say on (is) before the word.", example: `Kas ${subjectFor(g.lemma)} on ${g.lemma}?` });
    }
    const test = (t: Thing): Answer => (t.lemma === g.lemma ? "yes" : t.isa.includes(g.lemma) ? "yes" : t.isaS.includes(g.lemma) ? "sometimes" : "no");
    const answer = test(secret);
    const won = g.lemma === secret.lemma && !negated;
    const said: Said = { en: "Is it “{thing}”?", thing: { lemma: g.lemma, text: gloss } };
    return finish({
      kind: "answer", answer: negate(answer), reading, said, guess: true, won, counts: true, tips: [],
      check: (t) => negate(test(t)), outside: g.outside && !THING_BY_LEMMA.has(g.lemma),
    }, tips);
  }

  if (guess) {
    // "Kas see on suur koer?": the thing named is one more condition.
    const g = guess as { lemma: string; raw: string; base: boolean; outside: boolean };
    const gloss = glossOf(g.lemma) ?? g.lemma;
    found.push({ raw: g.raw, role: "name", meaning: {
      id: `is:${g.lemma}`, en: `Is it “${gloss}”?`, copula: true,
      said: { en: "Is it “{thing}”?", thing: { lemma: g.lemma, text: gloss } },
      test: (t) => (t.lemma === g.lemma || t.isa.includes(g.lemma) ? "yes" : t.isaS.includes(g.lemma) ? "sometimes" : "no"),
    } });
  }

  // "Kas see elab?", "Kas see kasvab?" with nothing after: is it alive.
  if (found.length === 0 && !guess && (has("elama") || has("kasvama"))) {
    found.push({ raw: "elab", role: "describing", meaning: DESCRIBING.elus! });
  }

  const distinct = [...new Map(found.map((f) => [f.meaning.id, f])).values()];

  if (distinct.length === 0) {
    // A well-formed question made of words the dictionary knows, about something the game has no
    // facts for: say so, as the classic game does, and do not charge a question for it.
    const known = words.filter((w) => w.readings.length > 0).length;
    if (startsWithKas && words.length >= 3 && known * 2 >= words.length && unknownWords.length <= 1) {
      const reading = "Taken as a yes or no question I have no facts for.";
      return finish({ kind: "answer", answer: "unknown", reading, said: { en: reading }, guess: false, won: false, counts: false, tips: [] }, tips);
    }
    return { kind: "refused", why: "unknown", tips: dedupe(startsWithKas ? tips : [kasTip(), ...tips]), unknownWords };
  }

  // Tips about the sentence, for the one condition a short question puts.
  if (distinct.length === 1) {
    const { meaning, raw, role } = distinct[0]!;
    if (role === "part" && !possessive) {
      tips.push({ id: "sellel", en: "To ask whether it has a part, put sellel on (it has) before the part. For an animal you can say tal on.", example: `Kas sellel on ${raw}?` });
    }
    if (meaning.copula && role === "describing" && !has("olema")) {
      tips.push({ id: "on", en: "Say on (is) before the describing word.", example: `Kas see on ${raw}?` });
    }
    const rest = startsWithKas ? words.slice(1) : words;
    const adjectiveAt = rest.findIndex((w) => w.raw === raw);
    const seeAt = rest.findIndex((w) => hasLemma(w, "see") || hasLemma(w, "tema"));
    if (meaning.copula && role === "describing" && adjectiveAt !== -1 && seeAt !== -1 && adjectiveAt < seeAt) {
      tips.push({ id: "order", en: "Put see (it) straight after kas, then on, then the describing word.", example: `Kas see on ${raw}?` });
    }
  }

  // "Kas see elab Eestis?" asks where it lives, and only a living thing lives anywhere:
  // a book is in Estonia and does not live there.
  const lives = has("elama");
  const parts = distinct.map((f) => (lives && f.role === "place"
    ? { ...f.meaning, test: (t: Thing): Answer => (living(t) ? f.meaning.test(t) : "no") }
    : f.meaning));
  const test = (t: Thing): Answer => allOf(parts.map((m) => m.test(t)));
  const answer = test(secret);
  const reading = parts.map((m) => m.en).join(" ");
  const said: Said = parts.length === 1 ? parts[0]!.said ?? { en: parts[0]!.en } : { en: reading, all: parts.map((m) => m.said ?? { en: m.en }) };
  const named = guess as { lemma: string } | null;
  const won = named !== null && named.lemma === secret.lemma && answer === "yes" && !negated;
  // "Ei tea" costs nothing: the game could not say, and the learner should not pay for that.
  return finish({
    kind: "answer", answer: negate(answer), reading, said, guess: named !== null, won,
    counts: answer !== "unknown", tips: [], check: (t) => negate(test(t)),
  }, tips);

  function finish(reply: Reply, extra: Tip[]): Reply {
    const all = [...extra];
    if (!startsWithKas) all.unshift(kasTip());
    if (!/[?]\s*$/.test(asked)) all.push({ id: "mark", en: "End a question with a question mark." });
    return { ...reply, tips: dedupe(all) };
  }

  function kasTip(): Tip {
    return {
      id: "kas",
      en: "A yes or no question usually starts with kas.",
      example: `Kas ${raws.join(" ")}?`,
    };
  }
}

/** Words with no singular take "need" (these), not "see" (it): a pair of glasses is "need on prillid". */
const PLURAL_ONLY = new Set(["prillid", "käärid", "püksid"]);
const subjectFor = (lemma: string) => (PLURAL_ONLY.has(lemma) ? "need" : "see");

function baseTip(lemma: string): Tip {
  return { id: "base", en: "After on, name the thing in its plain dictionary form.", example: `Kas ${subjectFor(lemma)} on ${lemma}?` };
}

function whTip(): Tip {
  return {
    id: "wh",
    en: "A question word (who, what, where, how) asks for more than yes or no. Turn it into one thing you can say yes or no to.",
    example: "Kas see on suur?",
  };
}

function orTip(): Tip {
  return { id: "or", en: "Ask the two halves as two questions.", example: "Kas see on suur?" };
}

function compareTip(): Tip {
  return { id: "compare", en: "Compare with a thing: kui, then the thing.", example: "Kas see on suurem kui leib?" };
}

/** The learner's question, put about "see" rather than "sa". Only the subject is changed. */
function exampleFrom(raws: readonly string[]): string {
  const out = raws.map((w) => (w === "sa" || w === "sina" || w === "te" || w === "teie" ? "see" : w));
  if (out[0] !== "kas") out.unshift("kas");
  const s = out.join(" ");
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}?`;
}

function dedupe(tips: Tip[]): Tip[] {
  const seen = new Set<string>();
  return tips.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
}

/* ------------------------------------------------------------------ */
/* Ideas, and the next good question                                   */
/* ------------------------------------------------------------------ */

export interface Idea {
  /** The question, in Estonian. Authored, one shape per row, proofread by a native speaker. */
  et: string;
  en: string;
}

export interface IdeaGroup {
  title: string;
  ideas: readonly Idea[];
}

export const IDEAS: readonly IdeaGroup[] = [
  { title: "What it is", ideas: [
    { et: "Kas see on loom?", en: "Is it an animal?" },
    { et: "Kas see on toit?", en: "Is it food?" },
    { et: "Kas see on sõiduk?", en: "Is it a vehicle?" },
    { et: "Kas see on taim?", en: "Is it a plant?" },
  ] },
  { title: "What it is like", ideas: [
    { et: "Kas see on suur?", en: "Is it big?" },
    { et: "Kas see on suurem kui leib?", en: "Is it bigger than a loaf of bread?" },
    { et: "Kas see on punane?", en: "Is it red?" },
    { et: "Kas see on külm?", en: "Is it cold?" },
  ] },
  { title: "What it does", ideas: [
    { et: "Kas see lendab?", en: "Does it fly?" },
    { et: "Kas see ujub?", en: "Does it swim?" },
    { et: "Kas seda saab süüa?", en: "Can you eat it?" },
    { et: "Kas sellega saab sõita?", en: "Can you ride it?" },
  ] },
  { title: "What it has, and where it is", ideas: [
    { et: "Kas sellel on jalad?", en: "Does it have legs?" },
    { et: "Kas sellel on tiivad?", en: "Does it have wings?" },
    { et: "Kas see on kodus?", en: "Is it at home?" },
    { et: "Kas see on õues?", en: "Is it outdoors?" },
  ] },
];

/**
 * The questions the game can offer next, each with the check it stands for, so
 * the offer can be the one that splits what still fits most evenly. Authored
 * Estonian, a closed list of shapes, every one a question `ask` answers cleanly:
 * `twenty.test.ts` asks each one of every thing and fails on a tip or an "Ei tea".
 */
export interface Suggestion extends Idea {
  test: (t: Thing) => Answer;
}

const sugg = (et: string, en: string, test: (t: Thing) => Answer): Suggestion => ({ et, en, test });

export const SUGGESTIONS: readonly Suggestion[] = [
  sugg("Kas see on loom?", "Is it an animal?", isaTest("loom")),
  sugg("Kas see on lind?", "Is it a bird?", isaTest("lind")),
  sugg("Kas see on putukas?", "Is it an insect?", isaTest("putukas")),
  sugg("Kas see on kala?", "Is it a fish?", isaTest("kala")),
  sugg("Kas see on imetaja?", "Is it a mammal?", isaTest("imetaja")),
  sugg("Kas see on koduloom?", "Is it a farm or house animal?", isaTest("koduloom")),
  sugg("Kas see on taim?", "Is it a plant?", isaTest("taim")),
  sugg("Kas see on puu?", "Is it a tree?", isaTest("puu")),
  sugg("Kas see on toit?", "Is it food?", isaTest("toit")),
  sugg("Kas see on puuvili?", "Is it a fruit?", isaTest("puuvili")),
  sugg("Kas see on köögivili?", "Is it a vegetable?", isaTest("köögivili")),
  sugg("Kas see on jook?", "Is it a drink?", isaTest("jook")),
  sugg("Kas see on sõiduk?", "Is it a vehicle?", isaTest("sõiduk")),
  sugg("Kas see on hoone?", "Is it a building?", isaTest("hoone")),
  sugg("Kas see on mööbel?", "Is it furniture?", isaTest("mööbel")),
  sugg("Kas see on riideese?", "Is it something you wear?", isaTest("riideese")),
  sugg("Kas see on tööriist?", "Is it a tool?", isaTest("tööriist")),
  sugg("Kas see on mänguasi?", "Is it a toy?", isaTest("mänguasi")),
  sugg("Kas see on pill?", "Is it a musical instrument?", isaTest("pill")),
  sugg("Kas see on kehaosa?", "Is it a part of the body?", isaTest("kehaosa")),
  sugg("Kas see on ilm?", "Is it weather?", isaTest("ilm")),
  sugg("Kas see on elus?", "Is it alive?", alive),
  sugg("Kas see on suur?", "Is it big?", big),
  sugg("Kas see on väike?", "Is it small?", small),
  sugg("Kas see on suurem kui leib?", "Is it bigger than a loaf of bread?", (t) => compared("size", true, { metres: THING_BY_LEMMA.get("leib")?.metres ?? 0.28, thing: THING_BY_LEMMA.get("leib") ?? null })(t)),
  sugg("Kas see on suurem kui auto?", "Is it bigger than a car?", (t) => compared("size", true, { metres: THING_BY_LEMMA.get("auto")?.metres ?? 4.4, thing: THING_BY_LEMMA.get("auto") ?? null })(t)),
  sugg("Kas see lendab?", "Does it fly?", canDo("fly")),
  sugg("Kas see ujub?", "Does it swim?", canDo("swim")),
  sugg("Kas see liigub?", "Does it move?", canDo("move")),
  sugg("Kas seda saab süüa?", "Can you eat it?", usedFor("eat")),
  sugg("Kas sellega saab sõita?", "Can you ride it?", usedFor("ride")),
  sugg("Kas seda saab kanda?", "Can you wear or carry it?", carried),
  sugg("Kas sellel on jalad?", "Does it have legs?", part("jalg")),
  sugg("Kas sellel on neli jalga?", "Does it have four legs?", legCount(4)),
  sugg("Kas sellel on tiivad?", "Does it have wings?", part("tiib")),
  sugg("Kas sellel on rattad?", "Does it have wheels?", part("ratas")),
  sugg("Kas see on karvane?", "Is it furry?", part("karv")),
  sugg("Kas sellel on lehed?", "Does it have leaves or pages?", part("leht")),
  sugg("Kas see on kodus?", "Is it at home?", where("home")),
  sugg("Kas see on köögis?", "Is it in the kitchen?", where("kitchen")),
  sugg("Kas see on metsas?", "Is it in the forest?", where("forest")),
  sugg("Kas see on vees?", "Is it in the water?", where("water")),
  sugg("Kas see on taevas?", "Is it in the sky?", where("sky")),
  sugg("Kas see elab Eestis?", "Does it live in Estonia?", (t) => (living(t) ? where("estonia")(t) : "no")),
  sugg("Kas see on elektriline?", "Does it run on electricity?", electric),
  sugg("Kas see on puidust?", "Is it made of wood?", (t) => listed(t.made, t.madeS, "puit")),
  sugg("Kas see on metallist?", "Is it made of metal?", (t) => listed(t.made, t.madeS, "metall")),
  sugg("Kas see on magus?", "Is it sweet?", (t) => degree(t, "sweet")),
  sugg("Kas see on ohtlik?", "Is it dangerous?", (t) => degree(t, "dangerous")),
  sugg("Kas see on kõva?", "Is it hard?", (t) => degree(t, "hard")),
  sugg("Kas see on külm?", "Is it cold?", (t) => degree(t, "cold")),
  sugg("Kas see on punane?", "Is it red?", (t) => listed(t.colour, t.colourS, "punane")),
  sugg("Kas see on roheline?", "Is it green?", (t) => listed(t.colour, t.colourS, "roheline")),
  sugg("Kas see on valge?", "Is it white?", (t) => listed(t.colour, t.colourS, "valge")),
  sugg("Kas see on kollane?", "Is it yellow?", (t) => listed(t.colour, t.colourS, "kollane")),
  sugg("Kas see on pruun?", "Is it brown?", (t) => listed(t.colour, t.colourS, "pruun")),
  sugg("Kas see teeb häält?", "Does it make a sound?", does("sound")),
  sugg("Kas see kasvab?", "Does it grow?", does("grow")),
  sugg("Kas see sööb liha?", "Does it eat meat?", does("meat")),
  sugg("Kas see on soolane?", "Is it salty?", (t) => degree(t, "salty")),
  sugg("Kas see on hapu?", "Is it sour?", (t) => degree(t, "sour")),
  sugg("Kas see on pehme?", "Is it soft?", (t) => degree(t, "soft")),
  sugg("Kas see on ümmargune?", "Is it round?", (t) => degree(t, "round")),
  sugg("Kas see on terav?", "Is it sharp?", (t) => degree(t, "sharp")),
  sugg("Kas see on sinine?", "Is it blue?", (t) => listed(t.colour, t.colourS, "sinine")),
  sugg("Kas see on must?", "Is it black?", (t) => listed(t.colour, t.colourS, "must")),
  sugg("Kas see on oranž?", "Is it orange?", (t) => listed(t.colour, t.colourS, "oranž")),
  sugg("Kas see helendab?", "Does it shine?", does("shine")),
  sugg("Kas see muneb?", "Does it lay eggs?", does("eggs")),
  sugg("Kas see on külmkapis?", "Is it in the fridge?", where("fridge")),
  sugg("Kas see on õues?", "Is it outdoors?", where("outdoors")),
  sugg("Kas see on linnas?", "Is it in the city?", where("city")),
  sugg("Kas see on meres?", "Is it in the sea?", where("sea")),
  sugg("Kas see on klaasist?", "Is it made of glass?", (t) => listed(t.made, t.madeS, "klaas")),
  sugg("Kas see on riidest?", "Is it made of cloth?", (t) => listed(t.made, t.madeS, "kangas")),
  sugg("Kas see on maiustus?", "Is it a sweet?", isaTest("maiustus")),
  sugg("Kas see on mari?", "Is it a berry?", isaTest("mari")),
  sugg("Kas see on lill?", "Is it a flower?", isaTest("lill")),
  sugg("Kas see on metsloom?", "Is it a wild animal?", isaTest("metsloom")),
  sugg("Kas see on lemmikloom?", "Is it a pet?", isaTest("lemmikloom")),
  sugg("Kas see on kiskja?", "Is it a predator?", isaTest("kiskja")),
  sugg("Kas see on vedelik?", "Is it a liquid?", isaTest("vedelik")),
  sugg("Kas see on taevakeha?", "Is it a body in the sky?", isaTest("taevakeha")),
  sugg("Kas sellel on saba?", "Does it have a tail?", part("saba")),
  sugg("Kas sellel on sarved?", "Does it have horns?", part("sarv")),
  sugg("Kas sellel on ekraan?", "Does it have a screen?", part("ekraan")),
  sugg("Kas sellel on uks?", "Does it have a door?", part("uks")),
  sugg("Kas sellel on mootor?", "Does it have an engine?", part("mootor")),
  sugg("Kas sellel on käepide?", "Does it have a handle?", part("käepide")),
  sugg("Kas sellel on varrukad?", "Does it have sleeves?", part("varrukas")),
  sugg("Kas sellel on pikk kael?", "Does it have a long neck?", notablePart("pikk", "kael")),
  sugg("Kas sellel saab istuda?", "Can you sit on it?", VERBS.istuma!.passive!.test),
  sugg("Kas sellega saab mängida?", "Can you play with it?", VERBS.mängima!.passive!.test),
  sugg("Kas sellega saab helistada?", "Can you call with it?", usedFor("call")),
  sugg("Kas seda saab juua?", "Can you drink it?", usedFor("drink")),
  sugg("Kas see jookseb?", "Does it run?", VERBS.jooksma!.active.test),
  sugg("Kas see ronib?", "Does it climb?", canDo("climb")),
];

/** A turn that said something about the thing, with the check that says it of any thing. */
export interface Asked {
  answer: Answer;
  check: (t: Thing) => Answer;
}

/** Two answers that a thing can both have given: equal, or either of them a "sometimes" or an "Ei tea". */
const agrees = (said: Answer, would: Answer) =>
  said === would || said === "sometimes" || would === "sometimes" || said === "unknown" || would === "unknown";

/** The things in `pool` that fit everything said so far. */
export function stillFitting(pool: readonly Thing[], asked: readonly Asked[]): Thing[] {
  return pool.filter((t) => asked.every((a) => agrees(a.answer, a.check(t))));
}

/**
 * The questions most worth asking next: the ones whose yes and no split what
 * still fits most evenly, never one already asked, and never one that every
 * fitting thing would answer the same way. Nothing here looks at the secret,
 * so a suggestion cannot give it away.
 */
export function nextQuestions(fitting: readonly Thing[], askedEt: ReadonlySet<string>, howMany = 3): Suggestion[] {
  if (fitting.length <= 1) return [];
  const scored = SUGGESTIONS.filter((s) => !askedEt.has(s.et)).map((s) => {
    let y = 0, n = 0;
    for (const t of fitting) {
      const a = s.test(t);
      if (a === "yes") y++;
      else if (a === "no") n++;
    }
    return { s, score: Math.min(y, n) };
  }).filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score || a.s.et.localeCompare(b.s.et));
  return scored.slice(0, howMany).map((x) => x.s);
}

/** The kind every fitting thing shares, once the answers have settled it. */
export function settledKind(fitting: readonly Thing[]): Kind | null {
  const first = fitting[0];
  if (!first) return null;
  return fitting.every((t) => t.kind === first.kind) ? first.kind : null;
}

/* ------------------------------------------------------------------ */
/* A round                                                              */
/* ------------------------------------------------------------------ */

export type Outcome = "playing" | "won" | "lost" | "gave-up";

export interface Turn {
  question: string;
  reply: Reply;
}

/** How many of the learner's turns spent a question. Turned-away ones did not. */
export function spent(turns: readonly { reply: Reply | { kind: "hint" } }[]): number {
  return turns.filter((t) => (t.reply.kind === "answer" && t.reply.counts) || t.reply.kind === "hint").length;
}

export function hintFor(secret: Thing): string {
  return KIND_HINT[secret.kind];
}
