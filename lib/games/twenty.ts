/**
 * KAKSKÜMMEND KÜSIMUST: twenty questions, in Estonian, against the dictionary.
 *
 * The classic game, as it is played against a machine: the machine holds a
 * thing in mind, the player asks yes or no questions, the machine answers yes,
 * no or "sometimes" (and where it cannot say, that it does not know), and the
 * player has twenty questions to name the thing. Standard rules carried over:
 * a guess is a question and uses one up; a question that is not a yes or no
 * question, or that asks two things at once ("is it big or small", "is it big
 * and red"), is turned away and does not cost one, because the machine cannot
 * answer it; a thing that is a kind of something is "yes" to the kind, so a duck
 * is a yes to "bird" and a win only to "duck"; and where two things are the same
 * size, "bigger than" is "sometimes" rather than a made-up no. A hint exists and
 * costs a question.
 *
 * WHAT THIS IS FOR. A learner types a whole question in Estonian, with the form
 * of the words it needs, and is told how it could have been put better. So the
 * answer is not the only output: every question comes back with what the game
 * understood, in English, and up to a few plain grammar tips about the sentence
 * as typed.
 *
 * WHO MAY WRITE ESTONIAN HERE. Nobody who is not a person. The machine reads the
 * learner's question word by word against the dictionary (`Lookup`, built off
 * stored forms and the two derivations ADR-005 amendment 1 allows), matches the
 * lemmas it finds against a closed table of things it can answer about, and
 * answers from facts about the thing (`lib/games/twentyThings.ts`). No model is
 * asked anything, nothing is generated, and the game works with no key. The
 * Estonian a learner reads back is the dictionary's own headwords, the four
 * answer words (all taught by the course), and a short closed list of question
 * shapes for the tips, which is authored and proofread by a native speaker in
 * the pull request, the standing `lib/estonian/openers.ts` has.
 *
 * NO GRADE. Asking a good question is not recalling a card, and a guess that
 * names the word names it because the clues led there. Nothing goes in the
 * review log, which is the answer `lib/games/picture.ts` gives about the same
 * situation.
 *
 * Pure: no React, no Prisma.
 */

import {
  CATEGORIES, COLOURS, DOES, KIND_HINT, MATERIALS, OPINIONS, PARTS, THINGS, THING_BY_LEMMA, TRAITS,
  type Colour, type Part, type Thing, type Where,
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

export interface Tip {
  id: string;
  /** What to do, in English. */
  en: string;
  /** The sentence put the way a person would, in the learner's own words where there are any. */
  example?: string;
}

export type Refusal = "empty" | "wh" | "or" | "many" | "compare" | "unknown";

export type Reply =
  | { kind: "refused"; why: Refusal; tips: Tip[] }
  | {
      kind: "answer";
      answer: Answer;
      /** What the game took the question to mean, in English. */
      reading: string;
      /** The question named a thing (or a kind of thing) rather than describing one. */
      guess: boolean;
      won: boolean;
      /** False where the game could only say it does not know, which costs no question. */
      counts: boolean;
      tips: Tip[];
    };

export const REFUSAL_EN: Record<Refusal, string> = {
  empty: "Type a question first.",
  wh: "This game wants a yes or no question. Start with kas, and ask about one thing.",
  or: "A yes or no question can’t hold a choice. Ask about one thing at a time.",
  many: "That asks more than one thing, or something the game can’t check. Try one thing at a time.",
  compare: "A comparison needs something to compare with. Try: bigger than a thing you know.",
  unknown: "The game didn’t catch what you want to know. Try one of the ideas below.",
};

/* ------------------------------------------------------------------ */
/* What a question can be about                                        */
/* ------------------------------------------------------------------ */

const yes = (on: boolean, maybe = false): Answer => (on ? "yes" : maybe ? "sometimes" : "no");
const listed = <T>(list: readonly T[], maybe: readonly T[], x: T): Answer => yes(list.includes(x), maybe.includes(x));

interface Intent {
  id: string;
  en: string;
  test: (t: Thing) => Answer;
  /** Needs "on" (is) in front of it to be a sentence: "kas see on suur". */
  copula: boolean;
}

const alive = (t: Thing): Answer => yes(t.kind === "animal" || t.kind === "plant");

const ADJECTIVES: Record<string, Intent> = {
  suur: { id: "big", en: "Is it big?", copula: true, test: (t) => (t.size >= 6 ? "yes" : t.size === 5 ? "sometimes" : "no") },
  väike: { id: "small", en: "Is it small?", copula: true, test: (t) => (t.size <= 3 ? "yes" : t.size === 4 ? "sometimes" : "no") },
  kiire: { id: "fast", en: "Is it fast?", copula: true, test: (t) => listed(t.feel, t.feelS, "fast") },
  aeglane: { id: "slow", en: "Is it slow?", copula: true, test: (t) => listed(t.feel, t.feelS, "slow") },
  kõva: { id: "hard", en: "Is it hard?", copula: true, test: (t) => listed(t.feel, t.feelS, "hard") },
  pehme: { id: "soft", en: "Is it soft?", copula: true, test: (t) => listed(t.feel, t.feelS, "soft") },
  külm: { id: "cold", en: "Is it cold?", copula: true, test: (t) => listed(t.feel, t.feelS, "cold") },
  soe: { id: "warm", en: "Is it warm?", copula: true, test: (t) => listed(t.feel, t.feelS, "warm") },
  elus: { id: "alive", en: "Is it alive?", copula: true, test: alive },
  elav: { id: "alive", en: "Is it alive?", copula: true, test: alive },
  elama: { id: "alive", en: "Is it alive?", copula: false, test: alive },
  raske: { id: "heavy", en: "Is it heavy?", copula: true, test: (t) => (t.size >= 7 ? "yes" : t.size >= 5 ? "sometimes" : "no") },
  kerge: { id: "light", en: "Is it light?", copula: true, test: (t) => (t.size <= 2 ? "yes" : t.size === 3 ? "sometimes" : "no") },
};

const COLOUR_EN: Record<Colour, string> = {
  punane: "red", sinine: "blue", kollane: "yellow", roheline: "green",
  valge: "white", must: "black", pruun: "brown", hall: "grey", roosa: "pink", oranž: "orange", lilla: "purple",
};

for (const c of COLOURS) {
  ADJECTIVES[c] = {
    id: `colour:${c}`, en: `Is it ${COLOUR_EN[c]}?`, copula: true,
    test: (t) => listed(t.colour, t.colourS, c),
  };
}

const PART_EN: Record<Part, string> = {
  jalg: "legs", tiib: "wings", saba: "a tail", ratas: "wheels", uks: "a door",
  aken: "a window", sulg: "feathers", karv: "fur", leht: "leaves or pages", nokk: "a beak",
  silm: "eyes", kõrv: "ears", nina: "a nose", suu: "a mouth", pea: "a head", hammas: "teeth", kõht: "a belly",
  selg: "a back", sarv: "horns", nahk: "skin", koor: "a peel, bark or crust", seeme: "seeds", juur: "roots",
  oks: "branches", rool: "a steering wheel or handlebars", ekraan: "a screen", nupp: "buttons",
  klaviatuur: "a keyboard", kaas: "a cover",
};

/** Part words that are also things: "uks" is a door you can have and a door you can guess. */
const PART_IS_ALSO_A_THING = new Set<string>(PARTS.filter((p) => THING_BY_LEMMA.has(p)));

const ACTIONS: Record<string, Intent> = {
  lendama: { id: "fly", en: "Can it fly?", copula: false, test: (t) => listed(t.can, t.canS, "fly") },
  ujuma: { id: "swim", en: "Can it swim?", copula: false, test: (t) => listed(t.can, t.canS, "swim") },
  hüppama: { id: "jump", en: "Can it jump?", copula: false, test: (t) => listed(t.can, t.canS, "jump") },
  liikuma: { id: "move", en: "Does it move?", copula: false, test: (t) => listed(t.can, t.canS, "move") },
  sõitma: { id: "ride", en: "Can you ride it?", copula: false, test: (t) => listed(t.use, t.useS, "ride") },
  kandma: { id: "wear", en: "Can you wear or carry it?", copula: false, test: (t) => listed(t.use, t.useS, "wear") },
  lugema: { id: "read", en: "Can you read it?", copula: false, test: (t) => listed(t.use, t.useS, "read") },
  hoidma: { id: "hold", en: "Can you hold it in your hand?", copula: false, test: (t) => (t.size <= 3 ? "yes" : t.size === 4 ? "sometimes" : "no") },
};

/** Eating and drinking read two ways: "it eats" and "you can eat it". */
const EAT: Record<"eat" | "drink", { active: Intent; passive: Intent }> = {
  eat: {
    active: { id: "eats", en: "Does it eat?", copula: false, test: (t) => yes(t.kind === "animal") },
    passive: { id: "edible", en: "Can you eat it?", copula: false, test: (t) => listed(t.use, t.useS, "eat") },
  },
  drink: {
    active: { id: "drinks", en: "Does it drink?", copula: false, test: (t) => yes(t.kind === "animal") },
    passive: { id: "drinkable", en: "Can you drink it?", copula: false, test: (t) => listed(t.use, t.useS, "drink") },
  },
};

const PLACES: Record<string, { where: Where; en: string; cases: readonly string[] }> = {
  kodu: { where: "home", en: "Is it at home?", cases: ["INESSIVE"] },
  maja: { where: "home", en: "Is it at home?", cases: ["INESSIVE"] },
  tuba: { where: "home", en: "Is it at home?", cases: ["INESSIVE"] },
  köök: { where: "kitchen", en: "Is it in the kitchen?", cases: ["INESSIVE"] },
  õu: { where: "outdoors", en: "Is it outdoors?", cases: ["INESSIVE"] },
  õues: { where: "outdoors", en: "Is it outdoors?", cases: ["INESSIVE", "BASE"] },
  mets: { where: "forest", en: "Is it in the forest?", cases: ["INESSIVE"] },
  vesi: { where: "water", en: "Is it in the water?", cases: ["INESSIVE"] },
  linn: { where: "city", en: "Is it in the city?", cases: ["INESSIVE"] },
  maa: { where: "country", en: "Is it in the countryside?", cases: ["ADESSIVE", "INESSIVE"] },
  aed: { where: "garden", en: "Is it in the garden?", cases: ["INESSIVE"] },
  taevas: { where: "sky", en: "Is it in the sky?", cases: ["INESSIVE", "BASE"] },
  meri: { where: "sea", en: "Is it in the sea?", cases: ["INESSIVE"] },
  kool: { where: "school", en: "Is it at school?", cases: ["INESSIVE"] },
  pood: { where: "shop", en: "Is it in a shop?", cases: ["INESSIVE"] },
  tänav: { where: "street", en: "Is it on the street?", cases: ["ADESSIVE", "INESSIVE"] },
  külmkapp: { where: "fridge", en: "Is it in the fridge?", cases: ["INESSIVE"] },
  voodi: { where: "bed", en: "Is it in a bed?", cases: ["INESSIVE"] },
};

const COMPARATIVES: Record<string, "bigger" | "smaller"> = {
  suurem: "bigger",
  väiksem: "smaller",
};


/* Objective traits: the lemma that asks for each, and the plain English of the question. */
const TRAIT_TERMS: Record<string, { key: (typeof TRAITS)[number]; en: string }> = {
  märg: { key: "wet", en: "Is it wet?" },
  kuiv: { key: "dry", en: "Is it dry?" },
  magus: { key: "sweet", en: "Is it sweet?" },
  soolane: { key: "salty", en: "Is it salty?" },
  hapu: { key: "sour", en: "Is it sour?" },
  terav: { key: "sharp", en: "Is it sharp?" },
  ümar: { key: "round", en: "Is it round?" },
  pikk: { key: "long", en: "Is it long?" },
  lühike: { key: "short", en: "Is it short?" },
  lai: { key: "wide", en: "Is it wide?" },
  kitsas: { key: "narrow", en: "Is it narrow?" },
  paks: { key: "thick", en: "Is it thick?" },
  õhuke: { key: "thin", en: "Is it thin?" },
  ohtlik: { key: "dangerous", en: "Is it dangerous?" },
  tugev: { key: "strong", en: "Is it strong?" },
};

/* Opinions: "sometimes" unless the thing says yes, or says plainly no. */
const OPINION_TERMS: Record<string, { key: (typeof OPINIONS)[number]; en: string }> = {
  vana: { key: "old", en: "Is it old?" },
  uus: { key: "new", en: "Is it new?" },
  kallis: { key: "expensive", en: "Is it expensive?" },
  odav: { key: "cheap", en: "Is it cheap?" },
  ilus: { key: "pretty", en: "Is it pretty?" },
  kasulik: { key: "useful", en: "Is it useful?" },
  haruldane: { key: "rare", en: "Is it rare?" },
  vaikne: { key: "quiet", en: "Is it quiet?" },
  puhas: { key: "clean", en: "Is it clean?" },
  tume: { key: "dark", en: "Is it dark?" },
  hele: { key: "bright", en: "Is it bright?" },
  nõrk: { key: "weak", en: "Is it weak?" },
};

const DOES_TERMS: Record<string, { key: (typeof DOES)[number]; en: string }> = {
  haukuma: { key: "bark", en: "Does it bark?" },
  kasvama: { key: "grow", en: "Does it grow?" },
  magama: { key: "sleep", en: "Does it sleep?" },
  laulma: { key: "sing", en: "Does it sing?" },
  kõndima: { key: "walk", en: "Does it walk?" },
  mängima: { key: "play", en: "Does it play?" },
  töötama: { key: "work", en: "Does it work, or run?" },
  ostma: { key: "buy", en: "Can you buy it?" },
  müüma: { key: "sell", en: "Can you sell it?" },
  põlema: { key: "burn", en: "Does it burn?" },
  helisema: { key: "ring", en: "Does it ring?" },
  sündima: { key: "born", en: "Is it born?" },
  kasutama: { key: "use", en: "Do people use it?" },
  pesema: { key: "wash", en: "Can you wash it?" },
  kriipima: { key: "scratch", en: "Does it scratch?" },
  lõhnama: { key: "smell", en: "Does it smell?" },
};

const MATERIAL_EN: Record<(typeof MATERIALS)[number], string> = {
  puit: "wood", metall: "metal", klaas: "glass", paber: "paper", kivi: "stone", raud: "iron",
  kuld: "gold", kumm: "rubber", vill: "wool", puuvill: "cotton",
};

const WH = new Set(["kes", "mis", "kus", "kuhu", "millal", "miks", "kuidas", "milline", "mitu", "palju", "kui"]);

/** Every lemma the game has to be able to read, so the page can fetch exactly these. */
export const NEEDED_LEMMAS: readonly string[] = [...new Set([
  "kas", "see", "tema", "olema", "ei", "kui", "või", "ja", "saama", "käsi",
  ...WH,
  ...Object.keys(ADJECTIVES), ...Object.keys(ACTIONS), "sööma", "jooma", ...Object.keys(PLACES),
  ...Object.keys(TRAIT_TERMS), ...Object.keys(OPINION_TERMS), ...Object.keys(DOES_TERMS), ...MATERIALS,
  "raske", "kerge",
  ...PARTS, ...CATEGORIES, ...THINGS.map((t) => t.lemma),
  "jah", "teadma", "mõnikord",
])];

/* ------------------------------------------------------------------ */
/* Reading a question                                                   */
/* ------------------------------------------------------------------ */

export function tokensOf(text: string): string[] {
  return text.toLowerCase().normalize("NFC").split(/[^\p{L}\p{M}]+/u).filter(Boolean);
}

interface Word {
  raw: string;
  readings: readonly Reading[];
}

const hasLemma = (w: Word, lemma: string) => w.readings.some((r) => r.lemma === lemma);

/** The learner named a thing or a kind, as a headword they typed. */
interface Name {
  raw: string;
  lemma: string;
  base: boolean;
}

interface Found {
  intent: Intent;
  /** The word the learner typed for it. */
  raw: string;
}

/**
 * Read one question and answer it about `secret`.
 *
 * `glossOf` is the dictionary's English for a headword, used only to say back
 * what a comparison or a guess was taken to mean.
 */
export function ask(
  question: string,
  secret: Thing,
  lookup: Lookup,
  glossOf: (lemma: string) => string | undefined = () => undefined,
): Reply {
  const raws = tokensOf(question);
  if (raws.length === 0) return { kind: "refused", why: "empty", tips: [] };
  const words: Word[] = raws.map((raw) => ({ raw, readings: lookup(raw) }));
  const has = (lemma: string) => words.some((w) => hasLemma(w, lemma));
  const tips: Tip[] = [];
  const asked = question.trim();

  const first = words[0]!;
  if (first.readings.some((r) => WH.has(r.lemma))) {
    return { kind: "refused", why: "wh", tips: [whTip()] };
  }
  if (has("või")) return { kind: "refused", why: "or", tips: [] };
  if (has("ja")) return { kind: "refused", why: "many", tips: [] };

  const startsWithKas = hasLemma(first, "kas");
  const rest = startsWithKas ? words.slice(1) : words;

  // A comparison is read first, because its reference word must not be read as a guess.
  const cmpAt = words.findIndex((w) => w.raw in COMPARATIVES);
  const taken = new Set<number>();
  let comparison: { reply: Reply; tips: Tip[] } | null = null;
  if (cmpAt !== -1) {
    taken.add(cmpAt);
    const direction = COMPARATIVES[words[cmpAt]!.raw]!;
    const kuiAt = words.findIndex((w, i) => i > cmpAt && hasLemma(w, "kui"));
    const refAt = kuiAt === -1 ? -1 : kuiAt + 1;
    const ref = refAt !== -1 && refAt < words.length ? words[refAt]! : null;
    if (!ref) return { kind: "refused", why: "compare", tips: [] };
    taken.add(kuiAt);
    taken.add(refAt);
    const reading = ref.readings.find((r) => THING_BY_LEMMA.has(r.lemma));
    const refThing = reading ? THING_BY_LEMMA.get(reading.lemma) : undefined;
    const sentence: Tip[] = [];
    if (reading && !reading.base) {
      sentence.push({
        id: "kui-form",
        en: "After kui, the thing you compare with stays in its plain dictionary form.",
        example: `Kas see on ${words[cmpAt]!.raw} kui ${reading.lemma}?`,
      });
    }
    const label = (refThing ? glossOf(refThing.lemma) ?? refThing.lemma : ref.raw);
    const en = `Is it ${direction} than “${label}”?`;
    if (!refThing) {
      comparison = { reply: { kind: "answer", answer: "unknown", reading: en, guess: false, won: false, counts: true, tips: [] }, tips: sentence };
    } else {
      const diff = secret.size - refThing.size;
      const answer: Answer = diff === 0 ? "sometimes" : (direction === "bigger" ? diff > 0 : diff < 0) ? "yes" : "no";
      comparison = { reply: { kind: "answer", answer, reading: en, guess: false, won: false, counts: true, tips: [] }, tips: sentence };
    }
  }

  // Everything else, word by word.
  const subject = words.some((w) => w.readings.some((r) => (r.lemma === "see" || r.lemma === "tema") && r.case === "ADESSIVE"));
  const passive = words.some((w) => w.readings.some((r) => r.lemma === "see" && !r.base && r.case !== "ADESSIVE" && r.case !== "COMITATIVE"));
  const found: Found[] = [];
  const names: Name[] = [];

  words.forEach((w, i) => {
    if (taken.has(i)) return;
    const readings = w.readings;

    // Where it is. An inessive of a place word, or the adverb "õues".
    const place = readings.find((r) => {
      const at = PLACES[r.lemma];
      return at !== undefined && (at.cases.includes(r.case ?? "") || (at.cases.includes("BASE") && r.base));
    });
    if (place) {
      const site = PLACES[place.lemma]!;
      found.push({ raw: w.raw, intent: {
        id: `where:${site.where}`, en: site.en, copula: true, test: (t) => listed(t.where, t.whereS, site.where),
      } });
      return;
    }

    // What it has.
    const part = readings.find((r) => (PARTS as readonly string[]).includes(r.lemma));
    if (part && (!PART_IS_ALSO_A_THING.has(part.lemma) || subject)) {
      const p = part.lemma as Part;
      found.push({ raw: w.raw, intent: {
        id: `has:${p}`, en: `Does it have ${PART_EN[p]}?`, copula: false,
        test: (t) => listed(t.has, t.hasS, p),
      } });
      return;
    }

    // What it is like, or what it does.
    for (const r of readings) {
      const adjective = ADJECTIVES[r.lemma];
      if (adjective) { found.push({ raw: w.raw, intent: adjective }); return; }
      const action = ACTIONS[r.lemma];
      if (action) { found.push({ raw: w.raw, intent: action }); return; }
      if (r.lemma === "sööma" || r.lemma === "jooma") {
        const which = EAT[r.lemma === "sööma" ? "eat" : "drink"];
        found.push({ raw: w.raw, intent: passive && has("saama") ? which.passive : which.active });
        return;
      }
    }

    // The wide layer: traits, opinions, things it does, what it is made of.
    for (const r of readings) {
      const trait = TRAIT_TERMS[r.lemma];
      if (trait) {
        found.push({ raw: w.raw, intent: {
          id: `trait:${trait.key}`, en: trait.en, copula: true, test: (t) => listed(t.trait, t.traitS, trait.key),
        } });
        return;
      }
      const opinion = OPINION_TERMS[r.lemma];
      if (opinion) {
        found.push({ raw: w.raw, intent: {
          id: `opinion:${opinion.key}`, en: opinion.en, copula: true,
          test: (t) => (t.traitNo.includes(opinion.key) ? "no" : t.trait.includes(opinion.key) ? "yes" : "sometimes"),
        } });
        return;
      }
      const does = DOES_TERMS[r.lemma];
      if (does) {
        found.push({ raw: w.raw, intent: {
          id: `does:${does.key}`, en: does.en, copula: false,
          test: (t) => (does.key === "smell"
            ? (t.does.includes("smell") || t.trait.includes("smelly") ? "yes"
              : t.doesS.includes("smell") || t.traitS.includes("smelly") ? "sometimes" : "no")
            : listed(t.does, t.doesS, does.key)),
        } });
        return;
      }
      if ((MATERIALS as readonly string[]).includes(r.lemma)) {
        const key = r.lemma as (typeof MATERIALS)[number];
        found.push({ raw: w.raw, intent: {
          id: `made:${key}`, en: `Is it made of ${MATERIAL_EN[key]}?`, copula: false, test: (t) => listed(t.made, t.madeS, key),
        } });
        return;
      }
    }

    // A thing, or a kind of thing, named.
    const named = readings.find((r) => THING_BY_LEMMA.has(r.lemma) || (CATEGORIES as readonly string[]).includes(r.lemma));
    if (named) names.push({ raw: w.raw, lemma: named.lemma, base: named.base });
  });

  if (comparison) {
    if (found.length > 0 || names.length > 0) return { kind: "refused", why: "many", tips: [] };
    return finish(comparison.reply, comparison.tips);
  }

  const distinct = [...new Map(found.map((f) => [f.intent.id, f])).values()];
  if (distinct.length + (names.length > 0 ? 1 : 0) > 1 || names.length > 1) {
    return { kind: "refused", why: "many", tips: [] };
  }
  if (distinct.length === 0 && names.length === 0) {
    // A well-formed question made of words the dictionary knows, about something the game has no
    // facts for: say so, as the classic game does, and do not charge a question for it.
    const known = words.filter((w, i) => !taken.has(i) && w.readings.length > 0).length;
    if (startsWithKas && words.length >= 3 && known * 2 >= words.length) {
      const reading = "Taken as a yes or no question I have no facts for.";
      return finish({ kind: "answer", answer: "unknown", reading, guess: false, won: false, counts: false, tips: [] }, []);
    }
    return { kind: "refused", why: "unknown", tips: startsWithKas ? [] : [kasTip()] };
  }

  const negated = has("ei");
  const flip = (a: Answer): Answer => (!negated ? a : a === "yes" ? "no" : a === "no" ? "yes" : a);

  if (distinct.length === 1) {
    const { intent, raw } = distinct[0]!;
    const base = intent.id.startsWith("has:") && !subject
      ? { id: "sellel", en: "To ask whether it has a part, put sellel on (it has) before the part. For an animal you can say tal on.", example: `Kas sellel on ${raw}?` }
      : null;
    if (base) tips.push(base);
    if (intent.copula && !has("olema")) {
      tips.push({ id: "on", en: "Say on (is) before the describing word.", example: `Kas see on ${raw}?` });
    }
    const adjectiveAt = rest.findIndex((w) => w.raw === raw);
    const seeAt = rest.findIndex((w) => hasLemma(w, "see") || hasLemma(w, "tema"));
    if (intent.copula && adjectiveAt !== -1 && seeAt !== -1 && adjectiveAt < seeAt) {
      tips.push({ id: "order", en: "Put see (it) straight after kas, then on, then the describing word.", example: `Kas see on ${raw}?` });
    }
    return finish({ kind: "answer", answer: flip(intent.test(secret)), reading: intent.en, guess: false, won: false, counts: true, tips: [] }, tips);
  }

  // A guess: one thing or kind, named.
  const name = names[0]!;
  const gloss = glossOf(name.lemma) ?? name.lemma;
  const reading = `Is it “${gloss}”?`;
  if (!name.base) {
    tips.push({ id: "base", en: "After on, name the thing in its plain dictionary form.", example: `Kas see on ${name.lemma}?` });
  }
  if (!has("olema")) {
    tips.push({ id: "on", en: "Say on (is) before the word.", example: `Kas see on ${name.raw}?` });
  }
  const answer: Answer = name.lemma === secret.lemma ? "yes"
    : secret.isa.includes(name.lemma) ? "yes"
    : secret.isaS.includes(name.lemma) ? "sometimes" : "no";
  const won = name.lemma === secret.lemma && !negated;
  return finish({ kind: "answer", answer: flip(answer), reading, guess: true, won, counts: true, tips: [] }, tips);

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

function whTip(): Tip {
  return {
    id: "wh",
    en: "A question word (who, what, where, how) asks for more than yes or no. Turn it into one thing you can say yes or no to.",
    example: "Kas see on suur?",
  };
}

function dedupe(tips: Tip[]): Tip[] {
  const seen = new Set<string>();
  return tips.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
}

/* ------------------------------------------------------------------ */
/* Ideas to start from                                                  */
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
    { et: "Kas see lendab?", en: "Can it fly?" },
    { et: "Kas see ujub?", en: "Can it swim?" },
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
