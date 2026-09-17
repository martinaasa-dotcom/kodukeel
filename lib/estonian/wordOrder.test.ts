import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { isKnownForm } from "../dict/forms";
import { sentenceTiles } from "./cloze";
import {
  acceptedOrders, alsoRightOrders, BOUND_PARTICLES, CLAUSE_JOINERS, FREE_PARTICLES,
  orderContextFrom, readOrder, sentenceClauses,
} from "./wordOrder";

const ROWS = dictionaryRows();
const DICT = orderContextFrom(ROWS);

const tiles = (s: string) => sentenceTiles(s);

describe("readOrder", () => {
  const reported = "Muidugi tuleb ette näpukaid.";

  it("takes the order the writer chose", () => {
    const v = readOrder(tiles(reported), reported, alsoRightOrders(reported, DICT));
    expect(v.reading).toBe("exact");
  });

  /*
    The report this module was written for. A learner rebuilt the app's own
    first-unit sentence the way anybody says it and was told it was not the
    order Estonian uses.
  */
  it("takes the particle at the end of the clause", () => {
    const v = readOrder(tiles("Muidugi tuleb näpukaid ette"), reported, alsoRightOrders(reported, DICT));
    expect(v.reading).toBe("variant");
    // The particle that moved, not the word that shifted into its place.
    expect(v.moved).toBe("ette");
  });

  it("still refuses an order Estonian does not use", () => {
    const v = readOrder(tiles("Näpukaid ette tuleb muidugi"), reported, alsoRightOrders(reported, DICT));
    expect(v.reading).toBe("wrong");
  });

  it("ignores case and punctuation, as the exact reading always did", () => {
    const v = readOrder(tiles("muidugi tuleb ette näpukaid"), reported, alsoRightOrders(reported, DICT));
    expect(v.reading).toBe("exact");
  });

  it("refuses a sentence that is short of a word", () => {
    expect(readOrder(tiles("Muidugi tuleb ette"), reported, alsoRightOrders(reported, DICT)).reading)
      .toBe("wrong");
  });
});

describe("what it refuses", () => {
  /*
    Every one of these was accepted by a version of this rule, and each is why
    one of its conditions exists. They are the whole argument for the module
    being this narrow, so they are asserted rather than described.
  */
  const refused: [string, string][] = [
    // A postposition and its complement, with the verb at the front because
    // Estonian drops a pronoun subject.
    ["Pühkisin otsa eest higi.", "Pühkisin otsa higi eest"],
    ["Olen võidu üle uhke.", "Olen võidu uhke üle"],
    ["Ta määris leiva peale võid.", "Ta määris leiva võid peale"],
    // A spelling that is a verb and a noun at once.
    ["Heaolutunne kadus, kui maiasmokk kaalu peale astus.", "Heaolutunne kadus kui maiasmokk kaalu astus peale"],
    // Past a joiner, which is a second clause or a second adjective and this
    // cannot tell those apart.
    ["Nad kõndisid edasi ja jõudsid järveni.", "Nad kõndisid ja jõudsid järveni edasi"],
    ["Mees nägi välja rõõsa ja ümarik.", "Mees nägi rõõsa välja ja ümarik"],
    // Past a participle standing in front of its noun.
    ["Vältida tuleks lahti kirjutamata akronüümide kasutamist.", "Vältida tuleks kirjutamata akronüümide lahti kasutamist"],
    // A particle the writer put at the end stays there: the stated residual.
    ["Ta pani raamatu ära.", "Ta pani ära raamatu"],
  ];

  for (const [original, built] of refused) {
    it(`refuses ${built}`, () => {
      expect(readOrder(tiles(built), original, alsoRightOrders(original, DICT)).reading).toBe("wrong");
    });
  }
});

describe("what it accepts", () => {
  const accepted: [string, string][] = [
    ["Muidugi tuleb ette näpukaid.", "Muidugi tuleb näpukaid ette"],
    ["President kuulutas välja sõjaseisukorra.", "President kuulutas sõjaseisukorra välja"],
    ["Paraadi võtab vastu president.", "Paraadi võtab president vastu"],
    ["Rong sõidab mööda raudteed.", "Rong sõidab raudteed mööda"],
    ["Kella tuleb tagasi keerata.", "Kella tuleb keerata tagasi"],
  ];
  for (const [original, built] of accepted) {
    it(`accepts ${built}`, () => {
      expect(readOrder(tiles(built), original, alsoRightOrders(original, DICT)).reading).toBe("variant");
    });
  }
});

describe("sentenceClauses", () => {
  it("splits on a comma and nowhere else", () => {
    expect(sentenceClauses("Söö korralikult, ära näkitse toitu."))
      .toEqual([["Söö", "korralikult"], ["ära", "näkitse", "toitu"]]);
  });

  it("keeps a joiner inside the clause it joins", () => {
    expect(sentenceClauses("Nad kõndisid edasi ja jõudsid järveni.")).toHaveLength(1);
  });
});

describe("the word lists", () => {
  /*
    EVERY WORD NAMED HERE IS A REQUEST, NOT A FACT, which is the rule the
    syllabus states about its own word lists. These are uninflected adverbs
    and conjunctions, so the lemma is the spelling and there is no morphology
    to invent; what a typo would do is switch a rule off in silence, so each
    one is asked of `prisma/data/forms/`, the accept list, which is read here
    for exactly the question it exists to answer: is that a word.
  */
  for (const word of [...FREE_PARTICLES, ...BOUND_PARTICLES, ...CLAUSE_JOINERS]) {
    it(`${word} is a word Estonian has`, async () => {
      expect(await isKnownForm(word)).toBe(true);
    });
  }

  it("names no word twice", () => {
    const all = [...FREE_PARTICLES, ...BOUND_PARTICLES];
    expect(new Set(all).size).toBe(all.length);
  });

  it("holds no Estonian beyond those lists", () => {
    const source = readFileSync(join(import.meta.dirname, "wordOrder.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const named = new Set([...FREE_PARTICLES, ...BOUND_PARTICLES, ...CLAUSE_JOINERS]);
    const estonian = [...code.matchAll(/"([a-zõäöüšž]+)"/g)]
      .map((m) => m[1]!)
      .filter((w) => /[õäöüšž]/.test(w) && !named.has(w));
    expect(estonian).toEqual([]);
  });
});

describe("over the shipped dictionary", () => {
  /*
    THE NUMBER IS READ RATHER THAN ASSERTED AT, which is `eval:scene`'s own
    discipline: what matters is that a person has read the list of orders this
    accepts, and `npm run audit:order` is how they do it. The floor here is
    that it still fires at all and that it has not quietly become a rule that
    accepts anything.
  */
  it("offers an alternative for a few sentences and not for most", () => {
    let sentences = 0;
    let variants = 0;
    for (const row of ROWS) {
      for (const example of row.examples) {
        sentences++;
        variants += alsoRightOrders(example.et, DICT).length;
      }
    }
    expect(sentences).toBeGreaterThan(5_000);
    expect(variants).toBeGreaterThan(20);
    expect(variants).toBeLessThan(sentences / 20);
  });

  it("never offers an order that is not read back as a variant", () => {
    for (const row of ROWS) {
      for (const example of row.examples) {
        const alts = alsoRightOrders(example.et, DICT);
        for (const alt of alts) {
          expect(readOrder(sentenceTiles(alt), example.et, alts).reading).toBe("variant");
        }
      }
    }
  });

  it("offers at most one alternative per sentence", () => {
    for (const row of ROWS) {
      for (const example of row.examples) {
        expect(acceptedOrders(example.et, DICT).length).toBeLessThanOrEqual(2);
      }
    }
  });
});
