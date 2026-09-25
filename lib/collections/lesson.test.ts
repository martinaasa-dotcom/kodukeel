import { describe, expect, it } from "vitest";
import {
  answerableCount, isAnswerable, planLesson, splitIntoLessons,
  type LessonWord, type LessonStep,
} from "./lesson";
import { orderContextFrom } from "@/lib/estonian/wordOrder";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { PARTS } from "@/lib/copy/values";
import { checkAnswer } from "@/lib/estonian/answer";

/*
  A lesson built with no dictionary behind it: every sentence keeps the one
  order the writer chose, which is what the build step did before
  `lib/estonian/wordOrder.ts` existed. What the reading changes is asserted in
  `lib/estonian/wordOrder.test.ts`, against the shipped dictionary.
*/
const wordOrder = orderContextFrom([]);

const unit = {
  id: "kodu",
  title: "Kodu",
  canDo: "Describe your home and say where things are in it.",
  blurb: "Things you can point at.",
  grammar: ["inessive"],
  // The real unit's own band and declaration, because what a lesson may ask is
  // read off both and a fixture that quietly says A2 measures a lesson nobody
  // is given.
  level: "A1",
  cardTypes: ["RECOGNITION", "PRODUCTION", "CASE_FORM", "CLOZE"],
} as const;

/*
  EVERY WORD THE FIXTURE'S OWN SENTENCES ARE MADE OF.

  At A1 a sentence exercise is only offered where the course has taught every
  word in it, so a fixture that hands in nothing gets no gap-fill and every
  test about one passes by having nothing to look at. These are the words of
  the two sentences the fixtures carry, which is what a unit that had taught
  them would hold.
*/
const TAUGHT = new Set([
  "maja", "on", "suur", "ja", "valge",
  "oleme", "ikka", "sõbrad", "sõber", "sõbra", "sõpra", "edasi",
  "koosolek", "toimub", "kindlasti",
  "ta", "istub", "toas", "tuba", "toa", "loeb",
]);

const noun = (lemma: string, gloss: string, extra: Partial<LessonWord> = {}): LessonWord => ({
  lexemeId: `lex-${lemma}`,
  lemma,
  gloss,
  pos: "NOUN",
  examples: [],
  parts: { NOM_SG: lemma, GEN_SG: `${lemma}i`, PART_SG: `${lemma}it` },
  government: null,
  semanticTypes: null,
  alsoSaid: null,
  ...extra,
});

const WORDS: LessonWord[] = [
  noun("maja", "house", { examples: [{ et: "Maja on suur ja valge.", en: "The house is big and white." }], parts: { NOM_SG: "maja", GEN_SG: "maja", PART_SG: "maja" } }),
  noun("tuba", "room", { parts: { NOM_SG: "tuba", GEN_SG: "toa", PART_SG: "tuba" } }),
  noun("uks", "door", { parts: { NOM_SG: "uks", GEN_SG: "ukse", PART_SG: "ust" } }),
  noun("aken", "window", { parts: { NOM_SG: "aken", GEN_SG: "akna", PART_SG: "akent" } }),
  noun("laud", "table", { parts: { NOM_SG: "laud", GEN_SG: "laua", PART_SG: "lauda" } }),
  noun("tool", "chair", { parts: { NOM_SG: "tool", GEN_SG: "tooli", PART_SG: "tooli" } }),
];

const DISTRACTORS: LessonWord[] = [
  noun("koer", "dog"), noun("kass", "cat"), noun("lind", "bird"), noun("puu", "tree"),
];

const plan = (words = WORDS, seed = 7) =>
  planLesson({ unit, words, distractors: DISTRACTORS, taughtWords: TAUGHT, seed, wordOrder });

describe("planLesson", () => {
  it("opens with the teaching step and closes with the recap", () => {
    const steps = plan();
    expect(steps[0]?.kind).toBe("intro");
    expect(steps.at(-1)?.kind).toBe("recap");
  });

  it("is deterministic, so a refresh cannot change the question mid-answer", () => {
    // gradeCard is a Server Action and Next re-runs the page after every one. A
    // plan that re-shuffled would swap the question out from under the answer.
    const a = plan().map((s) => `${s.kind}:${s.lemma ?? ""}`);
    const b = plan().map((s) => `${s.kind}:${s.lemma ?? ""}`);
    expect(a).toEqual(b);
  });

  it("gives a different lesson for a different seed", () => {
    // The ladder's shape is fixed by design, so what a seed varies is the
    // content of the questions: which options a multiple choice offers and in
    // what order, and which case a word gets asked for.
    const content = (seed: number) =>
      plan(WORDS, seed).flatMap((s) =>
        s.kind === "choose" || s.kind === "produce" || s.kind === "listen" ? [s.options.join("/")] : []);
    expect(content(1)).not.toEqual(content(2));
  });

  it("teaches a word before it asks anything about it", () => {
    // The rule that stops production becoming a guessing game.
    const steps = plan();
    const met = new Set<string>();
    for (const step of steps) {
      if (step.kind === "meet") { met.add(step.lemma); continue; }
      if (!isAnswerable(step) || !step.lemma) continue;
      expect(met.has(step.lemma), `${step.kind} asked about ${step.lemma} before it was met`).toBe(true);
    }
  });

  it("asks for recognition before it asks for production", () => {
    const steps = plan();
    const recognised = new Set<string>();
    for (const step of steps) {
      if (step.kind === "choose") recognised.add(step.lemma);
      if (step.kind === "type") {
        expect(recognised.has(step.lemma), `${step.lemma} was typed before it was recognised`).toBe(true);
      }
    }
  });

  it("never asks two questions of the same kind in a row", () => {
    // Six multiple-choice questions back to back is the exact texture of tedium.
    // Teaching cards are exempt: meeting three new words in a row is a
    // presentation, not a grind.
    for (const seed of [1, 2, 3, 7, 42, 99]) {
      const asked = plan(WORDS, seed).filter(isAnswerable);
      const clashes = asked
        .map((s, i) => (i > 0 && asked[i - 1]!.kind === s.kind ? `${i}:${s.kind}` : null))
        .filter(Boolean);
      expect(clashes, `seed ${seed}`).toEqual([]);
    }
  });

  it("brings words back inside the lesson rather than leaving it all to tomorrow", () => {
    const steps = plan();
    const asked = new Map<string, number>();
    for (const step of steps) {
      if (!isAnswerable(step) || !step.lemma) continue;
      asked.set(step.lemma, (asked.get(step.lemma) ?? 0) + 1);
    }
    for (const word of WORDS) {
      expect(asked.get(word.lemma) ?? 0, `${word.lemma} was asked only once`).toBeGreaterThanOrEqual(2);
    }
  });

  it("every word ends up produced, not just recognised", () => {
    const typed = new Set(plan().filter((s) => s.kind === "type").map((s) => s.lemma));
    for (const word of WORDS) expect(typed.has(word.lemma), word.lemma).toBe(true);
  });

  it("stays one sitting however big the unit is", () => {
    // A 24-word unit is several lessons, not one long one: splitIntoLessons is
    // what keeps every word getting the full ladder instead of the last few
    // silently losing a rung when the step budget runs out.
    const many = Array.from({ length: 24 }, (_, i) => noun(`s\u00f5na${i}`, `word ${i}`));
    const lessons = splitIntoLessons(many);
    expect(lessons.length).toBeGreaterThan(1);
    for (const words of lessons) {
      const steps = planLesson({ unit, words, distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 3, wordOrder });
      expect(steps.length).toBeLessThanOrEqual(40);
      expect(steps.at(-1)?.kind).toBe("recap");
    }
  });

  it("never leaves a lesson of one or two words dangling at the end", () => {
    const lessons = splitIntoLessons(Array.from({ length: 13 }, (_, i) => noun(`s\u00f5na${i}`, `w${i}`)));
    for (const l of lessons) expect(l.length).toBeGreaterThan(2);
  });

  it("has nothing to plan for an empty unit, and says so by returning nothing", () => {
    expect(planLesson({ unit, words: [], taughtWords: TAUGHT, seed: 1, wordOrder })).toEqual([]);
  });
});

describe("what a step is built from", () => {
  it("only builds a gap-fill from an attested sentence", () => {
    const gaps = plan().filter((s): s is Extract<LessonStep, { kind: "gap" }> => s.kind === "gap");
    for (const gap of gaps) {
      const source = WORDS.find((w) => w.lemma === gap.lemma);
      expect(source?.examples.map((e) => e.et)).toContain(gap.full);
      // The blank really removed something, and the answer really was in it.
      expect(gap.text).not.toEqual(gap.full);
      expect(gap.full).toContain(gap.answer);
    }
  });

  it("has no gap-fill at all when the unit carries no sentences", () => {
    // An honest absence. The alternative is inventing a sentence to blank.
    const bare = WORDS.map((w) => ({ ...w, examples: [] }));
    const steps = planLesson({ unit, words: bare, distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 5, wordOrder });
    expect(steps.some((s) => s.kind === "gap")).toBe(false);
  });

  /*
    NOTHING IS ASKED BEFORE IT IS TAUGHT, AND THE PLURAL IS NEVER TAUGHT AT
    ALL. meetLane shows a word's lemma and gloss; no unit teaches how Estonian
    forms a plural. A gap that hid `sõbrad` for a word just met as `sõber`
    asked a form nothing in the lesson, or anywhere else in the course, had
    shown.
  */
  it("never gaps a plural, even where the unit's own sentence carries one", () => {
    const friend = noun("sõber", "friend", {
      examples: [{ et: "Oleme ikka sõbrad edasi!", en: null }],
      parts: { NOM_SG: "sõber", GEN_SG: "sõbra", PART_SG: "sõpra", NOM_PL: "sõbrad" },
    });
    const steps = planLesson({
      unit, words: [friend], distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 5, wordOrder,
    });
    const gaps = steps.filter((s): s is Extract<LessonStep, { kind: "gap" }> => s.kind === "gap");
    for (const gap of gaps) expect(gap.answer.toLowerCase()).not.toBe("sõbrad");
  });

  /*
    A STEP MAY NOT PRINT ITS OWN ANSWER, which is the rule `lib/srs/cards.ts`
    and the flash round already hold and the lesson did not. The screen read
    "The word is kindlasti (definitely), in the form the sentence needs" over
    a gap wanting `kindlasti`: true of every adverb, and of the 616 course
    words out of 1,354 whose own sentence carries them in the nominative.
  */
  it("never names the word in a gap's cue when the gap wants the word itself", () => {
    // An adverb is the flat case: it has one spelling, so the cue can only be
    // the meaning, and where the meaning spells it too the cue says nothing.
    const surely: LessonWord = {
      lexemeId: "lex-kindlasti", lemma: "kindlasti", gloss: "definitely", pos: "ADVERB",
      examples: [{ et: "Koosolek toimub kindlasti.", en: null }], parts: { NOM_SG: "kindlasti" },
      government: null, semanticTypes: null, alsoSaid: null,
    };
    const steps = planLesson({
      unit, words: [surely], distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 5, wordOrder,
    });
    const gaps = steps.filter((s): s is Extract<LessonStep, { kind: "gap" }> => s.kind === "gap");
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(gap.answer.toLowerCase()).toBe("kindlasti");
      expect(gap.cue).toBe("meaning");
    }
  });

  it("keeps the word in the cue where the gap wants an inflected form", () => {
    // The lemma is given deliberately: the question is the form, and the
    // vocabulary is what the meet and choose steps already asked.
    const room = noun("tuba", "room", {
      examples: [{ et: "Ta istub toas ja loeb.", en: null }],
      parts: { NOM_SG: "tuba", GEN_SG: "toa", PART_SG: "tuba" },
    });
    const steps = planLesson({
      unit, words: [room], distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 5, wordOrder,
    });
    const gaps = steps.filter((s): s is Extract<LessonStep, { kind: "gap" }> => s.kind === "gap");
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) expect(gap.cue).toBe("word-and-meaning");
  });

  it("never asks for a case this word spells like its own lemma", () => {
    // `kalli` plus `s` is `kallis` again, and the step prints `kallis` above
    // the box. The next case along is free, so the word keeps its step.
    const dear: LessonWord = {
      lexemeId: "lex-kallis", lemma: "kallis", gloss: "dear, expensive", pos: "ADJECTIVE",
      examples: [], parts: { NOM_SG: "kallis", GEN_SG: "kalli", PART_SG: "kallist" },
      government: null, semanticTypes: null, alsoSaid: null,
    };
    // Every seed from 1 to 30, because which case the step draws is a roll:
    // with these distractors 17 and 30 are the two that reach the seesütlev,
    // and a check that picked its own five seeds would have been green on the
    // code this was written against.
    for (let seed = 1; seed <= 30; seed++) {
      const steps = planLesson({
        unit, words: [dear], distractors: DISTRACTORS, taughtWords: TAUGHT, seed, wordOrder,
      });
      for (const step of steps) {
        if (step.kind !== "case") continue;
        for (const form of step.answer.split(PARTS)) {
          expect(form.trim().toLowerCase(), `${seed}`).not.toBe("kallis");
        }
      }
    }
  });

  it("offers real words as wrong answers, never invented ones", () => {
    const real = new Set([...WORDS, ...DISTRACTORS].flatMap((w) => [w.lemma, w.gloss]));
    for (const step of plan()) {
      if (step.kind === "choose" || step.kind === "produce" || step.kind === "listen") {
        for (const option of step.options) expect(real.has(option), option).toBe(true);
      }
    }
  });

  it("always marks exactly one option correct", () => {
    for (const seed of [1, 4, 11]) {
      for (const step of plan(WORDS, seed)) {
        if (step.kind !== "choose" && step.kind !== "produce" && step.kind !== "listen") continue;
        expect(step.options.length).toBe(4);
        expect(new Set(step.options).size).toBe(4);
        expect(step.answer).toBeGreaterThanOrEqual(0);
        expect(step.answer).toBeLessThan(step.options.length);
      }
    }
  });

  it("derives a case question from the genitive, never from thin air", () => {
    const cases = plan().filter((s): s is Extract<LessonStep, { kind: "case" }> => s.kind === "case");
    for (const step of cases) {
      const source = WORDS.find((w) => w.lemma === step.lemma)!;
      expect(step.answer.startsWith(source.parts.GEN_SG!)).toBe(true);
    }
  });

  /*
    ANOTHER ENDING ONE KEYSTROKE AWAY IS THE WRONG FORM, NOT A SLIP. Typed
    steps are marked by `checkAnswer`, whose typo rule forgives one added or
    dropped letter; without the word's other forms `toast` for `toas` read
    as "One letter out." and was logged as a recall.
  */
  it("carries the word's other forms onto every typed step, and never a right answer among them", () => {
    const typed = plan().filter((s): s is Extract<LessonStep, { kind: "case" | "gap" }> =>
      s.kind === "case" || s.kind === "gap");
    expect(typed.length).toBeGreaterThan(0);
    for (const step of typed) {
      expect(step.rivals.length, step.lemma).toBeGreaterThan(0);
      for (const right of step.answer.split(PARTS)) {
        expect(checkAnswer(right, step.answer, "et", step.rivals).verdict).toBe("correct");
      }
      for (const rival of step.rivals) {
        expect(checkAnswer(rival, step.answer, "et", step.rivals).verdict, rival).toBe("wrong");
      }
    }
  });

  it("reaches for the same part of speech before any other wrong answer", () => {
    // A phrase like "Tere!" mixed with a noun's bare "salt" or a verb's "to
    // put" is not a real question: the phrase is the only option shaped like
    // an answer to "What does this mean?" and it gives itself away before a
    // learner reads a word of it. With enough phrases in the pool, the wrong
    // options should be other phrases, not the noun distractors sitting
    // right beside them.
    const greeting: LessonWord = {
      lexemeId: "lex-tere", lemma: "tere", gloss: "Hello!", pos: "PHRASE", semanticTypes: null, alsoSaid: null, examples: [], parts: {}, government: null,
    };
    const otherPhrases: LessonWord[] = [
      { lexemeId: "lex-aitäh", lemma: "aitäh", gloss: "Thank you!", pos: "PHRASE", semanticTypes: null, alsoSaid: null, examples: [], parts: {}, government: null },
      { lexemeId: "lex-palun", lemma: "palun", gloss: "Please!", pos: "PHRASE", semanticTypes: null, alsoSaid: null, examples: [], parts: {}, government: null },
      { lexemeId: "lex-vabandust", lemma: "vabandust", gloss: "Sorry!", pos: "PHRASE", semanticTypes: null, alsoSaid: null, examples: [], parts: {}, government: null },
    ];
    const steps = planLesson({
      unit, words: [greeting], distractors: [...otherPhrases, ...DISTRACTORS],
      taughtWords: TAUGHT, seed: 9, wordOrder,
    });
    const asked = steps.filter(
      (s): s is Extract<LessonStep, { kind: "choose" | "listen" }> =>
        (s.kind === "choose" || s.kind === "listen") && s.lemma === "tere",
    );
    expect(asked.length).toBeGreaterThan(0);
    const phraseGlosses = new Set(otherPhrases.map((w) => w.gloss));
    for (const step of asked) {
      for (const option of step.options) {
        if (option === greeting.gloss) continue;
        expect(phraseGlosses.has(option), option).toBe(true);
      }
    }
  });

  /*
    WORD ORDER IS A2 AND ABOVE.

    Ordering a sentence is a question about syntax, and the first units of the
    course teach words said alone: `vastused` says so in its own blurb and was
    handed `Palun võta veel üks komm. – Aitäh!` as a six-tile puzzle anyway.
  */
  it("never asks a beginner to put a sentence back in order", () => {
    // Second in its block, so the builder rotation reaches word order first:
    // at A1 it has to be refused and something else offered instead.
    const words = [noun("tool", "chair"), WORDS[0]!];
    const atA1 = planLesson({ unit, words, distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 4, wordOrder });
    expect(atA1.some((step) => step.kind === "build")).toBe(false);

    const atA2 = planLesson({
      unit: { ...unit, level: "A2" }, words, distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 4, wordOrder });
    expect(atA2.some((step) => step.kind === "build")).toBe(true);
  });

  /*
    NOTHING ON AN A1 SCREEN IS A WORD THE COURSE HAS NOT TAUGHT.

    A usage is written to illustrate a headword rather than to be a beginner's
    first reading, so most of them carry words from further up the course. The
    sentence below is one of `sõber`'s own and holds `oleme`, `ikka` and
    `edasi`; drop those from what the course has taught and it may not be used.
  */
  it("builds a sentence exercise at A1 only from words the course has taught", () => {
    const house = [WORDS[0]!];
    const known = planLesson({
      unit, words: house, distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 5, wordOrder });
    expect(known.some((step) => step.kind === "gap")).toBe(true);

    const untaught = new Set([...TAUGHT].filter((w) => w !== "valge"));
    const steps = planLesson({
      unit, words: house, distractors: DISTRACTORS, taughtWords: untaught, seed: 5, wordOrder });
    expect(steps.some((step) => step.kind === "gap" || step.kind === "build")).toBe(false);
  });

  /*
    A caller that could not say what the course has taught gets no sentence
    exercise at A1 rather than every sentence: the rule fails closed, because
    the alternative is the fault it exists for coming back in silence.
  */
  it("asks no sentence at A1 when nothing says what has been taught", () => {
    const steps = planLesson({
      unit, words: WORDS, distractors: DISTRACTORS, taughtWords: null, seed: 7, wordOrder });
    expect(steps.some((step) => step.kind === "gap" || step.kind === "build")).toBe(false);
  });

  /*
    Above A1 an unfamiliar word inside a sentence is how reading grows, so the
    same word and the same sentence are fine a band up. The rule is about a
    beginner with thirteen words, not about sentences.
  */
  it("lets a sentence carry an unfamiliar word above A1", () => {
    const steps = planLesson({
      unit: { ...unit, level: "B1" }, words: [WORDS[0]!], distractors: DISTRACTORS,
      taughtWords: new Set<string>(), seed: 5, wordOrder });
    expect(steps.some((step) => step.kind === "gap")).toBe(true);
  });

  /*
    A LESSON ASKS ONLY WHAT ITS UNIT SAYS IT TEACHES.

    `cardTypes` is the unit author's own declaration and the flashcard builder
    has read it for as long as it has existed. Four units in the course declare
    no `CLOZE`, all of them at A1, and every one of them was getting gap-fills.
  */
  it("asks no sentence of a unit that says it teaches none", () => {
    const quiet = { ...unit, level: "A2", cardTypes: ["RECOGNITION", "PRODUCTION"] } as const;
    const steps = planLesson({
      unit: quiet, words: WORDS, distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 7, wordOrder });
    expect(steps.some((step) => step.kind === "gap" || step.kind === "build")).toBe(false);
  });

  it("asks a beginner for a case only where the unit declares one", () => {
    const steps = planLesson({
      unit: { ...unit, cardTypes: ["RECOGNITION", "PRODUCTION"] },
      words: WORDS, distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 7, wordOrder });
    expect(steps.some((step) => step.kind === "case")).toBe(false);
    // And it still asks: the practice lane falls back rather than going quiet.
    expect(answerableCount(steps)).toBeGreaterThan(0);
  });

  it("asks about government only where Ekilex recorded one", () => {
    const verbs: LessonWord[] = [
      { lexemeId: "lex-aitama", lemma: "aitama", gloss: "to help", pos: "VERB", semanticTypes: null, alsoSaid: null, examples: [], parts: { INF_MA: "aitama", GEN_SG: "" }, government: "keda" },
      { lexemeId: "lex-jooksma", lemma: "jooksma", gloss: "to run", pos: "VERB", semanticTypes: null, alsoSaid: null, examples: [], parts: { INF_MA: "jooksma" }, government: null },
    ];
    const steps = planLesson({
      unit: { ...unit, cardTypes: [...unit.cardTypes, "GOVERNMENT"] },
      words: verbs, distractors: DISTRACTORS, taughtWords: TAUGHT, seed: 2, wordOrder,
    });
    const govern = steps.filter((s) => s.kind === "govern");
    for (const step of govern) expect(step.lemma).toBe("aitama");
  });
});

describe("answerableCount", () => {
  it("counts the questions, not the reading", () => {
    const steps = plan();
    const total = answerableCount(steps);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(steps.length);
    expect(steps.filter((s) => s.kind === "intro" || s.kind === "recap" || s.kind === "meet")
      .every((s) => !isAnswerable(s))).toBe(true);
  });
});

describe("the build step carries the orders Estonian allows", () => {
  /*
    The step is marked in the browser, so what the dictionary decided has to
    travel with it. Everything above runs with no dictionary behind it, which
    is how `alsoRight` could have shipped empty on every step with every test
    still green: an empty list is exactly what an unreadable sentence gives.
    So one step is built through a real reading, on the sentence the report
    this was written for names.
  */
  const reported = "Muidugi tuleb ette näpukaid.";
  const word: LessonWord = {
    lexemeId: "lex-tulema",
    lemma: "tulema",
    gloss: "to come",
    pos: "VERB",
    semanticTypes: null, alsoSaid: null,
    examples: [{ et: reported, en: null }],
    /*
      No stored first person, so no gap can be cut and the practice lane falls
      through to the build step. `planLesson` offers one practice step per
      word and the rotation starts at the gap for the first of a block.
    */
    parts: { INF_MA: "tulema" },
    government: null,
  };

  /*
    At A2, because `BUILD_FROM` is where word ordering starts: there is no
    syntax to order at A1, and it is the one exercise where every word has to
    be handled rather than read past. The band is the fixture's rather than
    the rule's to choose, so it is named here and not worked around.
  */
  const ordering = { ...unit, level: "A2" } as const;

  const buildSteps = (order: Parameters<typeof planLesson>[0]["wordOrder"]) =>
    planLesson({
      unit: ordering, words: [word], distractors: DISTRACTORS, seed: 4,
      wordOrder: order, taughtWords: TAUGHT,
    })
      .filter((s): s is Extract<LessonStep, { kind: "build" }> => s.kind === "build");

  it("offers the order a learner actually says", () => {
    const steps = buildSteps(orderContextFrom(dictionaryRows()));
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(step.sentence).toBe(reported);
      expect(step.alsoRight).toEqual(["Muidugi tuleb näpukaid ette"]);
    }
  });

  it("offers nothing when there is no dictionary to read", () => {
    for (const step of buildSteps(orderContextFrom([]))) expect(step.alsoRight).toEqual([]);
  });
});
