import { describe, expect, it } from "vitest";
import {
  CHECKPOINTS, LEVELS, SYLLABUS, checkpointFor, courseWords, isUnitOpen, levelIndex,
  courseAsksFor, nextUnit, unitById, unitProgress, unitsAtLevel, wordsAtLevel,
  type Level, type SyllabusUnit,
} from "./index";
import { HARVESTED, type HarvestedWord } from "@/prisma/data/harvested";
import { generateCards, type LexemeForCards } from "@/lib/srs/cards";

/** A harvested word in the shape the card builder reads, exactly as the seed lays it down. */
function asLexeme(w: HarvestedWord): LexemeForCards {
  return {
    lemma: w.lemma, translation: w.gloss, pos: w.pos, gradation: "NONE", gradationNote: null,
    government: w.government, semanticTypes: w.semanticTypes.join(" ") || null,
    examples: JSON.stringify(w.usages.map((et) => ({ et }))),
    forms: [
      ...Object.entries(w.parts).map(([formType, value]) => ({ formType, value })),
      ...w.extraForms.map((e) => ({ formType: `EKILEX:${e.code}`, value: e.value })),
    ],
  };
}
import { RETIRED_WORDS } from "./retired";
import { inferPos } from "./types";
import { PHRASES } from "@/prisma/data/other";
import { grammarPoint } from "@/lib/estonian/grammar";
import { PRINCIPAL_FORM_TYPES } from "@/lib/estonian/types";

/**
 * The course references the dictionary by lemma, and a typo would silently
 * shrink a unit rather than fail loudly. So the words are checked here against
 * the data the seed actually writes — the harvested set for everything Ekilex
 * has forms for, and the hand-checked phrase list for the greetings, which
 * are not headwords and so cannot be harvested.
 *
 * This is the test that makes the no-Estonian rule mechanical rather than
 * aspirational. A lemma invented in a unit file has nowhere to come from: the
 * harvest would have dropped it, so it is missing here, so this fails.
 */
const SEEDED = new Set<string>([
  ...HARVESTED.map((w) => `${w.lemma}|${w.pos}`),
  ...PHRASES.map((p) => `${p[0]}|PHRASE`),
]);

describe("the course", () => {
  it("runs A1 to C1 with every level populated", () => {
    for (const level of LEVELS) {
      expect(unitsAtLevel(level).length, `${level} has no units`).toBeGreaterThan(0);
    }
  });

  it("has unique unit ids", () => {
    const ids = SYLLABUS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only names words the dictionary actually carries", () => {
    const missing: string[] = [];
    for (const u of SYLLABUS) {
      for (const v of u.vocabulary) {
        if (!SEEDED.has(`${v.lemma}|${v.pos}`)) missing.push(`${u.id}: ${v.lemma} (${v.pos})`);
      }
    }
    expect(missing).toEqual([]);
  });

  /*
    AND CARRIES THE GLOSS THE UNIT WROTE, WHICH IS THE ONE AUTHORED COLUMN.

    `harvestWord` reads the English off the syllabus entry and returns it
    untouched, so `prisma/data/harvested.ts` is generated from these files and
    the gloss cannot come apart from them the way a parsed one can. What
    nothing checked is whether the generated file had been *regenerated*: the
    test above keys on `lemma|pos` and never looks at the English, so a pass
    over the syllabus that changed a gloss and did not re-run the harvest left
    the two disagreeing in silence, and the seed writes the harvest's copy.

    That had happened. Eight glosses were rewritten from British to American
    spelling in the syllabus and the harvest still held the old ones, so the
    shipped dictionary taught `hall` as "grey" while the course file said
    "gray" and `korrus` as "storey" against "story". It is invisible on screen
    and it is not harmless: `lib/collections/senses.ts` groups a production
    card's prompt by the gloss, so two spellings of one English word are two
    prompts, and the shared-prompt count moved by five when the harvest was
    re-run.

    Fails with the command that fixes it, because the fix is never to edit the
    generated file.
  */
  it("carries the gloss the unit that introduces a word wrote", () => {
    /*
      The introducing unit, which is the first in course order to name the
      word: a later unit may drill it again with a shorter gloss for its own
      word list, and the harvest keeps one entry per `lemma|pos`, so the first
      is the one the dictionary gets. Comparing against every unit reports
      those two dozen re-drills as drift and would make this a check people
      waive.
    */
    const harvested = new Map(HARVESTED.map((w) => [`${w.lemma}|${w.pos}`, w]));
    const introduced = new Map<string, { unit: string; gloss: string }>();
    for (const u of SYLLABUS) {
      for (const v of u.vocabulary) {
        const key = `${v.lemma}|${v.pos}`;
        if (!introduced.has(key)) introduced.set(key, { unit: u.id, gloss: v.gloss });
      }
    }
    const drifted: string[] = [];
    for (const [key, first] of introduced) {
      const word = harvested.get(key);
      if (word && word.gloss !== first.gloss) {
        drifted.push(`${first.unit}: ${key.split("|")[0]} is "${word.gloss}" in the harvest and "${first.gloss}" here`);
      }
    }
    expect(drifted, "the harvest is out of date with the syllabus: run `npm run harvest`").toEqual([]);
  });

  it("never repeats a word inside one unit", () => {
    for (const u of SYLLABUS) {
      const keys = u.vocabulary.map((v) => `${v.lemma}|${v.pos}`);
      expect(new Set(keys).size, u.id).toBe(keys.length);
    }
  });

  /*
    TWO UNITS ARE UNDER THE FLOOR AND BOTH ARE ARGUED FOR BY NAME, because an
    exemption with no reason beside it is the parking space this repository
    keeps recording a list becoming. `vastused` is five so that the pronouns
    are the second evening of the module rather than the fourth, and
    `asesonad` is six because six is the whole of the Estonian verb's persons
    and a seventh word would be one it does not teach. Every other unit keeps
    the floor.
  */
  const SHORT_UNITS: Record<string, number> = { vastused: 5, asesonad: 6 };

  it("keeps every unit to a sitting", () => {
    for (const u of SYLLABUS) {
      expect(u.words.length, u.id).toBeGreaterThanOrEqual(SHORT_UNITS[u.id] ?? 8);
      expect(u.words.length, u.id).toBeLessThanOrEqual(24);
    }
  });

  /*
    A DECLARED SPLIT IS A PARTITION OF THE UNIT, NOT A HINT.

    `UnitSpec.evenings` exists because the even slice broke a paradigm in
    half: six persons at a five-word budget came out four and four, and the
    module's second evening taught `mina, sina, tema, meie` under a heading
    promising all six. A unit that names its own evenings has to name all of
    its words and no others, in its own order, or the builder falls back to
    the slice and the declaration is a decision that quietly stopped
    happening. Both directions, since either alone passes on the broken
    shape.
  */
  it("declares evenings that are a partition of the unit, in its own order", () => {
    for (const u of SYLLABUS) {
      if (!u.evenings) continue;
      const flat = u.evenings.flat();
      expect(flat, `${u.id} declares evenings that are not its own words in order`)
        .toEqual(u.lemmas);
      for (const group of u.evenings) {
        expect(group.length, `${u.id} declares an empty evening`).toBeGreaterThan(0);
      }
      /* How long a declared evening may be is the course builder's ceiling
         rather than the syllabus's, so `course.test.ts` holds it beside
         `MAX_DAY_WORDS` and the fifteen-minute clock. */
    }
  });

  /*
    THE SIX PERSONS ARE ONE EVENING, which is the fault that produced the
    declaration and the one thing no general rule above would catch: a
    partition of four and four passes every check on this page.
  */
  it("teaches the six persons of the verb on one evening", () => {
    const pronouns = unitById("asesonad")!;
    expect(pronouns.lemmas).toEqual(["mina", "sina", "tema", "meie", "teie", "nemad"]);
    expect(pronouns.evenings, "the six are one evening or the budget splits them")
      .toEqual([["mina", "sina", "tema", "meie", "teie", "nemad"]]);
  });

  /*
    A1 IS VOCABULARY AND PHRASES, AND ASKS FOR NO CASE AND NO GAP.

    The operator drew this line off a screenshot of the module's second
    evening: `Ta ei kõlba ____.` for `õpetaja` in the closing review, a case
    card cut from a sentence a beginner cannot read, before anybody had been
    taught a pronoun. A case card at A1 was already held to a sentence; a gap
    card at A1 was already mostly unreadable (`npm run audit:readable`). Both
    go, so an A1 deck is what a word means and how it is said, plus the verb
    table for the units of verbs, and the cases arrive with A2.
  */
  it("asks for no case and no gap anywhere in A1", () => {
    for (const u of unitsAtLevel("A1")) {
      expect(u.cardTypes, u.id).not.toContain("CASE_FORM");
      expect(u.cardTypes, u.id).not.toContain("GRADATION");
      expect(u.cardTypes, u.id).not.toContain("CLOZE");
    }
  });

  /*
    AND THE RULE ABOVE IS ASKED OF A WORD RATHER THAN OF A UNIT, because the
    one door that builds cards with no unit in its hands needs it that way.

    `backfillClozeCards` adds a gap-fill to a word already in the deck once
    Ekilex has sent sentences for it, on a dictionary page render. It had no
    idea what the course had asked for, so opening the entry for `sina` on the
    second evening of A1 wrote `Olen ______ nõus.` into a beginner's deck: a
    word the course teaches, in an exercise every unit teaching it refuses,
    inside a sentence holding two words nobody had shown her.

    A word the course does not teach is the learner's own and is not refused:
    they looked it up, photographed it or pasted it in, and the gap-fill is
    what the dictionary's own button would have offered them.
  */
  it("says which cards the course ever asks for about a word", () => {
    // A pronoun: taught at A1, and no unit teaching it wants a gap or a case.
    expect(courseAsksFor("sina", "CLOZE")).toBe(false);
    expect(courseAsksFor("sina", "CASE_FORM")).toBe(false);
    expect(courseAsksFor("sina", "PRODUCTION")).toBe(true);

    // Every A1 word, since no A1 unit asks for either. A word an A2 unit also
    // teaches is excluded: the union is the point, and it is tested below.
    const laterToo = new Set(
      SYLLABUS.filter((u) => u.level !== "A1").flatMap((u) => [...u.lemmas]),
    );
    const a1Only = unitsAtLevel("A1")
      .flatMap((u) => [...u.lemmas])
      .filter((l) => !laterToo.has(l));
    expect(a1Only.length).toBeGreaterThan(200);
    for (const lemma of a1Only) {
      expect(courseAsksFor(lemma, "CLOZE"), lemma).toBe(false);
      expect(courseAsksFor(lemma, "CASE_FORM"), lemma).toBe(false);
    }

    // THE UNION, NOT THE FIRST UNIT. A word an A1 unit introduces and a later
    // unit drills was asked for twice, and `unitIntroducing` would answer for
    // the first of them alone.
    const gapped = SYLLABUS.find((u) => u.cardTypes.includes("CLOZE"))!;
    for (const lemma of gapped.lemmas) expect(courseAsksFor(lemma, "CLOZE"), lemma).toBe(true);

    // A word the course does not teach at all is the learner's own.
    expect(courseAsksFor("kodukeel-ei-ole-sona", "CLOZE")).toBe(true);
  });

  it("teaches the pronouns second and the verb to be third", () => {
    const ids = unitsAtLevel("A1").map((u) => u.id);
    expect(ids.slice(0, 3)).toEqual(["vastused", "asesonad", "esimesed-verbid"]);
    const be = unitById("esimesed-verbid")!;
    expect(be.lemmas[0]).toBe("olema");
    expect(be.cardTypes).toContain("CONJUGATION");
  });

  it("runs from easiest to hardest", () => {
    const levels = SYLLABUS.map((u) => levelIndex(u.level));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it("only ever requires a unit that comes earlier", () => {
    // A prerequisite later in the course than the unit needing it is a deadlock:
    // the learner can never open either one first.
    const position = new Map(SYLLABUS.map((u, i) => [u.id, i]));
    for (const [i, u] of SYLLABUS.entries()) {
      for (const req of u.requires) {
        expect(position.has(req), `${u.id} requires unknown unit ${req}`).toBe(true);
        expect(position.get(req)!, `${u.id} requires the later unit ${req}`).toBeLessThan(i);
      }
    }
  });

  it("gives every unit a can-do statement and a grammar point", () => {
    for (const u of SYLLABUS) {
      expect(u.canDo.length, u.id).toBeGreaterThan(20);
      expect(u.grammar.length, u.id).toBeGreaterThan(0);
      expect(u.module.length, u.id).toBeGreaterThan(0);
    }
  });

  it("teaches enough words at every level to be worth the name", () => {
    // The old path had one B2 unit and one C1 unit, 14 words each, and still
    // called itself A1 to C1. A level with a token unit in it is the failure
    // this asserts against.
    for (const level of LEVELS) {
      expect(wordsAtLevel(level).length, `${level} is too thin`).toBeGreaterThanOrEqual(80);
    }
  });

  it("introduces every word exactly once, however many units drill it", () => {
    // A grammar unit reusing vocabulary from an earlier one is deliberate — the
    // object unit teaches a rule with verbs the learner already has. What must
    // not happen is two units both claiming to introduce the same word.
    const introductions = courseWords().map((w) => `${w.lemma}|${w.pos}`);
    expect(new Set(introductions).size).toBe(introductions.length);
  });
  /*
    THE ONE CARD THE COURSE NEVER BUILT.

    Nothing else in the deck asks for the genitive: production wants the
    nominative, a gap-fill wants whatever the sentence has, and every case card
    is the genitive stem plus an ending. So the form the others are all built on
    was the one nobody was asked to produce, and consonant gradation, which is
    where it gets hard, went undrilled for the whole course. Not one of the 79
    units named the type, while the landing page promised it.
  */
  it("drills the genitive wherever it asks a learner to produce a case", () => {
    const producing = SYLLABUS.filter((u) => u.cardTypes.includes("CASE_FORM"));
    // Twenty-eight, all of them from A2 up, since A1 asks for no case at all.
    expect(producing.length).toBeGreaterThan(20);
    for (const unit of producing) {
      expect(unit.cardTypes, unit.id).toContain("GRADATION");
    }
  });

  it("does not ask for it where there is no genitive to ask for", () => {
    // A unit of greetings teaches phrases and a unit of verbs teaches persons.
    // The card takes the genitive, and neither has one.
    for (const unit of SYLLABUS) {
      if (unit.cardTypes.includes("CASE_FORM")) continue;
      expect(unit.cardTypes, unit.id).not.toContain("GRADATION");
    }
  });
  /*
    A UNIT DOES NOT ASK FOR A CARD ITS OWN WORDS CANNOT MAKE.

    `cardTypes` is a request against the generator, which builds only what a
    word supports, so a mismatch is silent: the unit page lists the type, no
    card appears, and nothing says why. `objekt`, the B1 unit whose subject is
    the single hardest thing in Estonian grammar, asked for `CASE_FORM` over
    twelve verbs. A case card needs a genitive stem and a verb has none, so it
    built nothing at all, for as long as the unit had existed.

    `GRADATION` is exempt because nobody declares it: `unit()` adds it wherever
    a unit asks for a case, since the genitive is what every case is built on,
    and the unit page drops it again where no word in the unit gradates. What
    is checked here is what a person typed.

    The words come from the harvest rather than the built expansion, because
    the harvest is what the course is checked against everywhere else in this
    file and it is the file that carries the course's own forms.
  */
  it("never asks for a card type not one of its words can make", () => {
    const harvested = new Map(HARVESTED.map((w) => [`${w.lemma}|${w.pos}`, w]));
    const dead: string[] = [];

    for (const unit of SYLLABUS) {
      const words = unit.vocabulary
        .map((v) => harvested.get(`${v.lemma}|${v.pos}`))
        .filter((w): w is NonNullable<typeof w> => !!w);
      if (words.length === 0) continue;

      for (const type of unit.cardTypes) {
        if (type === "GRADATION") continue;
        /*
          THE BUILDER, NOT A STAND-IN FOR IT. This read "has a genitive stem"
          for a case card and "has a first person" for a conjugation card,
          which were what those cards needed once and are not what they need
          now: both are built out of a sentence a lexicographer recorded using
          the form, so a stem is what builds the answer and a sentence is what
          decides whether to ask. A stand-in is a copy of the builder's rule
          that rots the day the rule moves, and both of these had.
        */
        const buildable = words.some((w) => {
          if (type === "CASE_FORM" || type === "CONJUGATION") {
            return generateCards(asLexeme(w), [type]).length > 0;
          }
          if (type === "GOVERNMENT") return !!w.government;
          if (type === "CLOZE") return w.usages.length > 0;
          return true;
        });
        if (!buildable) dead.push(`${unit.id} asks for ${type}`);
      }
    }
    expect(dead).toEqual([]);
  });
});

describe("checkpoints", () => {
  it("has one for every level", () => {
    expect(CHECKPOINTS.map((c) => c.level)).toEqual([...LEVELS]);
    for (const level of LEVELS) expect(checkpointFor(level).level).toBe(level);
  });

  it("asks for reliability rather than perfection", () => {
    for (const c of CHECKPOINTS) {
      expect(c.passMark).toBeGreaterThanOrEqual(70);
      expect(c.passMark).toBeLessThan(100);
      expect(c.questions).toBeGreaterThan(5);
    }
  });
});

describe("unitProgress", () => {
  it("is done only when every word has graduated", () => {
    const p = unitProgress({
      availableLemmas: ["a", "b"],
      startedLemmas: ["a", "b"],
      knownLemmas: ["a", "b"],
    });
    expect(p.state).toBe("done");
    expect(p.pct).toBe(100);
  });

  it("counts a started word as half learned", () => {
    const p = unitProgress({ availableLemmas: ["a", "b"], startedLemmas: ["a"], knownLemmas: [] });
    expect(p.pct).toBe(25);
    expect(p.state).toBe("learning");
  });

  it("locks a unit the dictionary cannot supply", () => {
    const p = unitProgress({ availableLemmas: [], startedLemmas: [], knownLemmas: [] });
    expect(p.state).toBe("locked");
  });
});

const unitOf = (id: string): SyllabusUnit => {
  const u = unitById(id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};

describe("what is open to a learner", () => {
  it("never locks anything at or below their own level", () => {
    // The whole point of the placement test: a B1 learner is not made to walk
    // back through eleven A1 units before the app will show them anything.
    const a1 = unitOf("tervitused");
    const b1 = SYLLABUS.find((u) => u.level === "B1" && u.requires.length > 0)!;
    for (const unit of [a1, b1]) {
      expect(isUnitOpen({ unit, doneUnitIds: new Set(), placement: "B1" })).toBe(true);
    }
  });

  it("locks a unit above their level whose prerequisites are unmet", () => {
    const c1 = SYLLABUS.find((u) => u.level === "C1" && u.requires.length > 0)!;
    expect(isUnitOpen({ unit: c1, doneUnitIds: new Set(), placement: "A1" })).toBe(false);
  });

  it("opens it once the prerequisites are done", () => {
    const c1 = SYLLABUS.find((u) => u.level === "C1" && u.requires.length > 0)!;
    const done = new Set(c1.requires);
    expect(isUnitOpen({ unit: c1, doneUnitIds: done, placement: "A1" })).toBe(true);
  });
});

describe("nextUnit", () => {
  const empty = new Set<string>();

  it("starts a beginner at the very beginning", () => {
    expect(nextUnit({ doneUnitIds: empty, startedUnitIds: empty, placement: "A1" })?.id)
      .toBe(SYLLABUS[0]!.id);
  });

  it("starts a placed learner at their own level, not at greetings", () => {
    for (const placement of ["A2", "B1", "B2", "C1"] as Level[]) {
      const next = nextUnit({ doneUnitIds: empty, startedUnitIds: empty, placement });
      expect(next, placement).toBeTruthy();
      expect(levelIndex(next!.level), placement).toBeGreaterThanOrEqual(levelIndex(placement));
    }
  });

  it("prefers finishing something already started over opening something new", () => {
    const started = new Set([unitOf("kodu").id]);
    const next = nextUnit({ doneUnitIds: empty, startedUnitIds: started, placement: "B1" });
    expect(next?.id).toBe("kodu");
  });

  it("runs out honestly when the whole course is done", () => {
    const all = new Set(SYLLABUS.map((u) => u.id));
    expect(nextUnit({ doneUnitIds: all, startedUnitIds: empty, placement: "C1" })).toBeUndefined();
  });
});

describe("the vocabulary the course no longer teaches", () => {
  it("is still in the harvest, every word of it", () => {
    // The ten C2 units were cut with the promise that their words stay in the
    // dictionary, and the harvest reads the syllabus, so the first re-run after
    // the cut took them out. retired.ts is the list that keeps them, and this
    // is what notices a harvest that forgot to read it.
    const held = new Set(HARVESTED.map((w) => `${w.lemma}|${w.pos}`));
    const missing = RETIRED_WORDS
      .map((w) => `${w[0]}|${inferPos(w[0], w[2])}`)
      .filter((key) => !held.has(key));
    expect(missing).toEqual([]);
    expect(RETIRED_WORDS.length).toBeGreaterThan(100);
  });

  it("names no word a unit already teaches", () => {
    const taught = new Set(courseWords().map((w) => `${w.lemma}|${w.pos}`));
    const both = RETIRED_WORDS.map((w) => `${w[0]}|${inferPos(w[0], w[2])}`).filter((k) => taught.has(k));
    expect(both).toEqual([]);
  });
});

describe("the harvested dictionary behind the course", () => {
  it("carries attested sentences for the overwhelming majority of words", () => {
    // The gap-fill, dictation and sentence-building modes are built entirely
    // from these. When this ratio falls, those modes quietly empty out.
    const withUsages = HARVESTED.filter((w) => w.usages.length > 0).length;
    expect(withUsages / HARVESTED.length).toBeGreaterThan(0.9);
  });

  it("holds principal parts, never a derived case", () => {
    // Storing a derived case would create the second source of truth the schema
    // notes forbid. Only the unpredictable forms belong here.
    //
    // Read off `PRINCIPAL_FORM_TYPES` rather than retyped, because a copy here
    // is a copy that falls behind: this test failed on `NOM_PL` the day the
    // nominative plural stopped being derivable, correctly reporting a form the
    // harvest was right to have started storing.
    const allowed = new Set<string>(PRINCIPAL_FORM_TYPES);
    for (const w of HARVESTED) {
      for (const formType of Object.keys(w.parts)) {
        expect(allowed.has(formType), `${w.lemma}: ${formType}`).toBe(true);
      }
    }
  });

  it("gives every inflecting word the parts its other forms are derived from", () => {
    for (const w of HARVESTED) {
      if (w.pos === "VERB") {
        for (const p of ["INF_MA", "INF_DA", "PRES_1SG", "PAST_1SG"]) {
          expect(w.parts[p], `${w.lemma} is missing ${p}`).toBeTruthy();
        }
      } else if (w.pos === "PRONOUN" && Object.keys(w.parts).length === 0) {
        // A plural-only pronoun (`meie`, `nemad`) has no singular to store and
        // is kept the way an adverb is: attested by Ekilex, with no parts.
        expect(w.usages.length + (w.cefr ? 1 : 0), `${w.lemma} arrived with nothing at all`).toBeGreaterThan(0);
      } else if (w.pos !== "ADVERB") {
        for (const p of ["NOM_SG", "GEN_SG", "PART_SG"]) {
          expect(w.parts[p], `${w.lemma} is missing ${p}`).toBeTruthy();
        }
      }
    }
  });
});

describe("the grammar the course promises", () => {
  it("names only grammar points the reference can actually explain", () => {
    // Before the topic notes existed, a B2 unit could say it taught the
    // impersonal while the app had no page saying what the impersonal was. A
    // course that can only mark an answer wrong is a test with a syllabus
    // attached, so every id a unit names has to resolve to something a learner
    // can go and read.
    const missing: string[] = [];
    for (const u of SYLLABUS) {
      for (const id of u.grammar) {
        if (!grammarPoint(id)) missing.push(`${u.id}: ${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("introduces the grammar of a level somewhere in that level", () => {
    // A unit may revisit an earlier point, but a level whose grammar is all
    // borrowed from below is not teaching anything new.
    for (const level of LEVELS) {
      const units = unitsAtLevel(level);
      const points = new Set(units.flatMap((u) => [...u.grammar]));
      expect(points.size, `${level} teaches too little grammar`).toBeGreaterThanOrEqual(4);
    }
  });
});
