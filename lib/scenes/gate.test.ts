import { describe, expect, it } from "vitest";
import { buildLexicon, subjectsIn, type DictEntry } from "./lexicon";
import { NEW_WORDS, disagrees, governmentSuspect, passes, runGate, type GateContext } from "./gate";
import type { BeatSpec } from "./types";
import type { CaseKey } from "@/lib/estonian/types";

/**
 * The four checks, against a fixture that is the dictionary in miniature.
 *
 * Every form here is one `lib/estonian/derive.ts` builds from those principal
 * parts, so nothing in this file is Estonian anybody typed: it is the same
 * knowledge the gate reads at run time, small enough to reason about.
 */
const ENTRIES: DictEntry[] = [
  {
    lemma: "tuba", pos: "NOUN", cefr: "A1",
    parts: {
      NOM_SG: "tuba", GEN_SG: "toa", PART_SG: "tuba",
      ILL_SG_SHORT: "tuppa", NOM_PL: "toad", PART_PL: "tube", GEN_PL: "tubade",
    },
    usages: [],
  },
  {
    lemma: "valu", pos: "NOUN", cefr: "A2",
    parts: {
      NOM_SG: "valu", GEN_SG: "valu", PART_SG: "valu",
      NOM_PL: "valud", PART_PL: "valusid", GEN_PL: "valude",
    },
    usages: [],
  },
  {
    lemma: "olema", pos: "VERB", cefr: "A1",
    parts: { INF_MA: "olema", INF_DA: "olla", PRES_1SG: "olen", PAST_1SG: "olin" },
    extraForms: [{ code: "IndPrSg2", value: "oled" }, { code: "IndPrSg3", value: "on" }],
    usages: [],
  },
  {
    lemma: "tulema", pos: "VERB", cefr: "A1",
    parts: { INF_MA: "tulema", INF_DA: "tulla", PRES_1SG: "tulen", PAST_1SG: "tulin" },
    usages: [],
  },
  // The pronouns whose nominative is the one thing that spelling can be, which
  // is what `subjectsIn` reads and all it reads.
  {
    lemma: "sina", pos: "PRONOUN", cefr: "A1",
    parts: { NOM_SG: "sina", GEN_SG: "sinu", PART_SG: "sind" },
    extraForms: [{ code: "SgN", value: "sina" }, { code: "SgN", value: "sa" }],
    usages: [],
  },
  {
    lemma: "mina", pos: "PRONOUN", cefr: "A1",
    parts: { NOM_SG: "mina", GEN_SG: "minu", PART_SG: "mind" },
    extraForms: [{ code: "SgN", value: "mina" }, { code: "SgN", value: "ma" }],
    usages: [],
  },
];

const LEX = buildLexicon(ENTRIES);
// `teil` and `mul` are the short pronoun forms a sentence is actually made of,
// and no rule over a genitive stem reaches them, so the fixture lends them the
// way the harvest stores them.
const EXTRA = new Set(["teil", "mul", "kus", "kas"]);
const LEXICON = { ...LEX, forms: new Set([...LEX.forms, ...EXTRA]) };

function context(over: Partial<GateContext> = {}): GateContext {
  return {
    lexicon: LEXICON,
    wrongRegister: new Set(["sul", "sinul"]),
    governed: [],
    caseOf: new Map(),
    ...over,
  };
}

function beat(over: Partial<BeatSpec> = {}): BeatSpec {
  return {
    id: "reason", goal: "Ask what is wrong.", they: "They say something.", move: "ask",
    topic: ["valu"], needs: [{ kind: "any" }],
    required: true, patience: 2, shape: "sentence",
    ...over,
  };
}

describe("the gate", () => {
  it("passes a line the scene's own list can account for", () => {
    const verdict = runGate("Kas teil on valu?", beat(), context());
    expect(verdict.failed).toEqual([]);
    expect(passes(verdict)).toBe(true);
  });

  it("withholds a line reaching outside the scene's list, and names the words", () => {
    /*
      Vouching is against the scene's list rather than the dictionary, and that
      distinction is the whole constraint: against the dictionary this would
      pass, because these are ordinary Estonian words. Against a few hundred
      lemmas the model is choosing inside a box.
    */
    const verdict = runGate("Kas teil on peavalu?", beat(), context());
    expect(verdict.failed).toContain("vouching");
    expect(verdict.unknown).toContain("peavalu");
  });

  it("wants a question where the move asks one, and forbids one where it does not", () => {
    expect(runGate("Teil on valu.", beat(), context()).failed).toContain("shape");
    expect(runGate("Kas teil on valu?", beat({ move: "instruct" }), context()).failed)
      .toContain("shape");
  });

  it("refuses two sentences, no punctuation, markdown, and a line that runs on", () => {
    const ctx = context();
    expect(runGate("Kas teil on valu? Kus?", beat(), ctx).failed).toContain("shape");
    expect(runGate("Kas teil on valu", beat(), ctx).failed).toContain("shape");
    expect(runGate("**Kas** teil on valu?", beat(), ctx).failed).toContain("shape");
    expect(runGate(`${"valu ".repeat(20)}?`, beat(), ctx).failed).toContain("shape");
    expect(runGate("", beat(), ctx).failed).toContain("shape");
  });

  it("refuses the register the scene did not ask for", () => {
    // The model error a learner would find most jarring, and one lookup.
    const verdict = runGate("Kas sul on valu?", beat(), context());
    expect(verdict.failed).toContain("register");
  });

  it("reports every failure rather than the first", () => {
    /*
      §6 allows one retry with the failing words named, and a retry told about
      one problem out of two comes back with the other.
    */
    const verdict = runGate("Kas sul on peavalu", beat(), context());
    expect(verdict.failed).toEqual(expect.arrayContaining(["shape", "vouching", "register"]));
  });
});

describe("the government check", () => {
  /*
    Drawn as weakly as it can be and still be a check: a line holding a governed
    word has to hold at least one nominal in a case that word governs. There is
    no parser here, so the strict reading fires on any sentence with an adjunct
    in it, which is most of them.
  */
  const ctx = context({
    governed: [{
      lemma: "aitama",
      forms: new Set(["aitama", "aitan", "aitab"]),
      cases: new Set(["PARTITIVE"]),
    }],
    caseOf: new Map<string, ReadonlySet<CaseKey>>([
      ["tuba", new Set(["NOMINATIVE", "PARTITIVE"])],
      ["toas", new Set(["INESSIVE"])],
      ["toa", new Set(["GENITIVE"])],
    ]),
  });

  it("lets through a line whose nominal is in a case the word governs", () => {
    expect(governmentSuspect(["ta", "aitab", "tuba"], ctx)).toBe(false);
  });

  it("flags a line whose only nominal is in a case it does not", () => {
    expect(governmentSuspect(["ta", "aitab", "toas"], ctx)).toBe(true);
  });

  it("says nothing about a line with no governed word, or with no nominal", () => {
    expect(governmentSuspect(["ta", "on", "toas"], ctx)).toBe(false);
    expect(governmentSuspect(["ta", "aitab"], ctx)).toBe(false);
  });

  it("needs only one nominal to be right, because it cannot find the complement", () => {
    // `toas` is an adjunct and `tuba` is the object. A stricter reading would
    // fire on this, which is most sentences.
    expect(governmentSuspect(["ta", "aitab", "tuba", "toas"], ctx)).toBe(false);
  });
});

/**
 * THE FIFTH CHECK: A NUMBER IN THE LINE IS A CLAIM ABOUT THE RUN.
 *
 * The other four are about words, and a number is not a word: the tokenizer
 * drops it and the lexicon never held one, so "Kas kell 14:00 sobib?" on a card
 * that dealt 15:30 passed all four. That was survivable while a beat naming a
 * dealt value was answered off the card before a model was asked, and it stops
 * being survivable the moment the model is asked first on every beat, because
 * the learner is then being invited to agree to an appointment nobody offered.
 */
describe("a number nobody dealt", () => {
  it("is withheld, and the value that was dealt is not", () => {
    const dealt = new Set(["15:30", "15.30"]);
    expect(runGate("Kas kell 15:30 on valu?", beat(), context({ dealt })).failed).not.toContain("facts");
    expect(runGate("Kas kell 14:00 on valu?", beat(), context({ dealt })).failed).toContain("facts");
  });

  it("is compared as a whole run, so an hour inside another number is not the hour", () => {
    const dealt = new Set(["15:30"]);
    expect(runGate("Kas 15 on valu?", beat(), context({ dealt })).failed).toContain("facts");
  });

  /*
    A NUMBER SAID IN WORDS IS STILL A NUMBER. `dealtNumbers` reads digits, and
    a card dealing 16:00 was answered `Teil on kohtumine homme kell kolm`: an
    appointment nobody offered, in words the course teaches, past every check.
  */
  it("is withheld when the hour is told in words, and the hour that was dealt is not", () => {
    const times = { clock: new Set(["kell"]), hours: new Set(["kolm", "neli"]), dealt: new Set(["neli"]) };
    expect(runGate("Kas kell neli on valu?", beat(), context({ times })).failed).not.toContain("facts");
    expect(runGate("Kas kell kolm on valu?", beat(), context({ times })).failed).toContain("facts");
  });

  it("says nothing about a count, because only a line telling the time is a claim", () => {
    const times = { clock: new Set(["kell"]), hours: new Set(["kolm"]), dealt: new Set(["neli"]) };
    // `kolm minutit` is three minutes. Without the clock word there is no appointment in it.
    expect(runGate("Kas kolm on valu?", beat(), context({ times })).failed).not.toContain("facts");
  });

  it("says nothing about a line with no number in it", () => {
    expect(runGate("Kas teil on valu?", beat(), context({ dealt: new Set() })).failed).not.toContain("facts");
  });

  /*
    A run that dealt no numbers is the ordinary case, and there any digit at all
    is invented. Absent rather than empty is the same answer, so a caller that
    has not been given the card cannot silently switch the check off.
  */
  it("treats a run that dealt nothing as having dealt nothing", () => {
    expect(runGate("Kas kell 14:00 on valu?", beat(), context()).failed).toContain("facts");
  });
});

/**
 * THE SIXTH CHECK: THE SUBJECT AND THE VERB ARE THE SAME PERSON.
 *
 * `Kust sina nüüd tuleb?` reached a learner. Every word of it is in the
 * scene's own list, the register is right, nothing is governed and no number
 * is claimed, so all five checks above passed a line that is not Estonian.
 * Vouching asks whether a spelling is a form of a word the scene may use, and
 * cannot ask whether it is the right form, which is the one thing a beginner
 * reading the other side's line cannot check for themselves.
 */
describe("a verb that does not agree with its subject", () => {
  const ctx = context({ subjects: subjectsIn(LEXICON) });

  it("knows the pronouns off the dictionary rather than off a list", () => {
    expect(ctx.subjects?.get("sina")).toBe("IndPrSg2");
    expect(ctx.subjects?.get("sa")).toBe("IndPrSg2");
    expect(ctx.subjects?.get("ma")).toBe("IndPrSg1");
    // An oblique form is not a subject, or `Kas ma aitan sind?` would be read as one.
    expect(ctx.subjects?.has("sind")).toBe(false);
  });

  it("withholds the line that reached a learner", () => {
    expect(runGate("Kust sina nüüd tuleb?", beat(), ctx).failed).toContain("agreement");
    expect(runGate("Kust sina nüüd tuled?", beat(), ctx).failed).not.toContain("agreement");
  });

  it("reads the persons the dictionary stores as well as the ones a rule reaches", () => {
    // `olema` is the verb no rule conjugates and the one every other line holds.
    expect(runGate("Kas sa on toas?", beat(), ctx).failed).toContain("agreement");
    expect(runGate("Kas sa oled toas?", beat(), ctx).failed).not.toContain("agreement");
  });

  it("says nothing about a clause whose verb belongs to another one", () => {
    /*
      `Ma ei tea, kus see on.` is a first person beside a third and is right:
      the verb is the other clause's, whose subject is `see`. Estonian writes
      that comma, which is the weakest clause boundary available without a
      parser.
    */
    expect(runGate("Ma tulen, kus see on.", beat({ move: "confirm" }), ctx).failed)
      .not.toContain("agreement");
  });

  it("says nothing where a clause holds two subjects, or none, or no person at all", () => {
    expect(runGate("Kas sa tead, mida ma tulen?", beat(), ctx).failed).not.toContain("agreement");
    expect(runGate("Kas toas on valu?", beat(), ctx).failed).not.toContain("agreement");
    expect(runGate("Kas sina tuled?", beat(), ctx).failed).not.toContain("agreement");
  });

  it("passes a line where one verb agrees and another does not, because it cannot say which is whose", () => {
    expect(disagrees("Kas sina oled see, kes tuleb?", ctx)).toBe(false);
  });
});

/**
 * AND THE SEVENTH: A LINE FOR A BEAT IS ABOUT THE BEAT.
 *
 * Retrieval has asked this of a recorded sentence since it was written
 * (`onTopic`); nothing asked it of a composed one. So a model told "they ask
 * where you are now" wrote `Kuhu sa ikka lähed?`, which is real Estonian
 * inside the list and is the question the learner answered two turns before.
 */
describe("a line that is not about its beat", () => {
  const ctx = context({ topic: new Set(["valu", "valud", "valus"]) });

  it("is withheld, and a line naming the beat's own word is not", () => {
    expect(runGate("Kas teil on valu?", beat(), ctx).failed).not.toContain("topic");
    expect(runGate("Kas teil on tuba?", beat(), ctx).failed).toContain("topic");
  });

  /*
    The marker reads `bussipileti` as `pilet` and the gate refused `kellaaeg`
    on a beat about `aeg`: the app would not say a word it praises the learner
    for using. Same rule, same guard, both directions.
  */
  it("reads a compound as the word it is a compound of", () => {
    const wide = context({ topic: new Set(["valu", "valud"]), vouched: () => true });
    expect(runGate("Kas teil on peavalu?", beat(), wide).failed).not.toContain("topic");
    // And not by accident: the whole spelling still has to be vouched.
    expect(runGate("Kas teil on xyzvalu?", beat(), context({ topic: new Set(["valu"]) })).failed)
      .toContain("topic");
  });

  it("says nothing where the caller named no topic, which is how an aside is gated", () => {
    expect(runGate("Kas teil on tuba?", beat(), context()).failed).not.toContain("topic");
    expect(runGate("Kas teil on tuba?", beat(), context({ topic: new Set() })).failed)
      .not.toContain("topic");
  });
});

/**
 * AND THE EIGHTH: A LINE MAY NOT HAND OVER WHAT IT IS ABOUT TO ASK FOR.
 *
 * The bank has been held to this since it was drafted, and nothing asked it of
 * a line composed live: a real run answered the beat whose whole job is
 * getting the learner to say `poes` with `Kas sa juba oled poes?`. They copy
 * it out, retrieve nothing, and the scheduler writes down a recall.
 */
describe("a line that gives the answer away", () => {
  const asks = beat({ needs: [{ kind: "case", lemma: "tuba", grammCase: "INESSIVE" }], topic: ["tuba"] });

  it("is withheld, and the same question without the form is not", () => {
    const answers = new Set(["toas"]);
    expect(runGate("Kas sa oled toas?", asks, context({ answers })).failed).toContain("giveaway");
    expect(runGate("Kas sa oled tuba?", asks, context({ answers })).failed).not.toContain("giveaway");
  });

  it("says nothing where the caller named no answer, which is how an aside is gated", () => {
    expect(runGate("Kas sa oled toas?", asks, context()).failed).not.toContain("giveaway");
  });
});

/**
 * BEING ESTONIAN AND BEING TAUGHT HERE ARE TWO QUESTIONS.
 *
 * One membership test against the scene's few hundred lemmas was asked as
 * both, so the only way for a model to say the natural thing was to have the
 * line withheld: seventeen of the twenty-five lines the gate withheld across
 * the fourteen scenes were real Estonian refused for one word a person would
 * obviously have said. `vouching` is now the hard one, against whatever the
 * caller can account for; `stretch` is the readable one, and it is a budget.
 */
describe("a line that reaches past the scene's own list", () => {
  /* What the forms list answers: everything here is Estonian but `blorp`. */
  const language = context({ vouched: (word: string) => word !== "blorp" });

  it("passes where the language can vouch for the word, and says which words were new", () => {
    const verdict = runGate("Kas teil on peavalu?", beat(), language);
    expect(verdict.failed).not.toContain("vouching");
    expect(verdict.stretched).toEqual(["peavalu"]);
  });

  it("is withheld where nothing can vouch for it, which is a word nobody has written down", () => {
    expect(runGate("Kas teil on blorp?", beat(), language).failed).toContain("vouching");
  });

  it("is withheld once it reaches further than a learner can read in one line", () => {
    const verdict = runGate("Kas teil peavalu kestab kaua?", beat(), language);
    expect(verdict.failed).toContain("stretch");
    expect(verdict.stretched.length).toBeGreaterThan(NEW_WORDS);
  });

  it("holds a caller that cannot vouch to the scene's own list, exactly as before", () => {
    expect(runGate("Kas teil on peavalu?", beat(), context()).failed).toContain("vouching");
  });
});

/**
 * AND THE NINTH: A RUN OF WORDS IS NOT A CLAUSE UNTIL IT HOLDS A VERB.
 *
 * The bank has been held to this since it was drafted and the live path never
 * was. Read off a real transcript: `Mis teie pilet tahta?` at a ticket window
 * and `Kas te maksete sularaha või kaardiga?` are both inside the word list,
 * in the right register, and neither is a sentence anybody says.
 */
describe("a line with no verb in it", () => {
  const finite = context({ hasFiniteVerb: (word: string) => word === "on" });

  it("is withheld once it is long enough to have needed one", () => {
    expect(runGate("Kas teil valu olema?", beat(), finite).failed).toContain("clause");
    expect(runGate("Kas teil on valu?", beat(), finite).failed).not.toContain("clause");
  });

  it("says nothing about a short elliptical question, which anybody asks", () => {
    expect(runGate("Kus valu?", beat(), finite).failed).not.toContain("clause");
  });

  it("says nothing about a greeting, which is a phrase with no verb in it", () => {
    expect(runGate("Kas teil valu olema?", beat({ move: "greet" }), finite).failed)
      .not.toContain("clause");
  });

  /*
    And it stands down on a line that reached past the scene's list, because
    the predicate is built from the scene's own verbs: reading a stretched verb
    form as "no verb" would withhold the natural line for being natural.
  */
  it("says nothing about a line holding a word the scene does not teach", () => {
    const wide = context({ hasFiniteVerb: (word: string) => word === "on", vouched: () => true });
    expect(runGate("Kas teil peavalu olema?", beat(), wide).failed).not.toContain("clause");
  });
});
