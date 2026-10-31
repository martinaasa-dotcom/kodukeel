import { describe, expect, it } from "vitest";
import { EMPTY_LEDGER, estonianIn, lessonProblems, teach, uncovered } from "./ledger";
import { itemEstonian, markRework, practiceFor } from "./practice";
import { B_PATTERNS, type LessonSpec } from "./types";

const lesson = (over: Partial<LessonSpec>): LessonSpec => ({
  id: "t-1", n: 1, level: "A1", part: "t", kind: "lesson", title: "t", goal: "t",
  cast: { Mari: "mari" },
  conversation: [{ who: "Mari", et: "Tere!", en: "Hello!" }],
  teaches: [{ kind: "phrase", et: "Tere!", en: "Hello!" }],
  how: { point: "p", watchOut: "w" },
  answers: [{ cue: "c", model: { et: "Tere!", en: "Hello!" } }],
  ...over,
});

describe("what counts as taught", () => {
  it("covers a word and a form by their spelling, whatever the case", () => {
    const l = teach(EMPTY_LEDGER, [{ kind: "word", et: "nimi", en: "name" }, { kind: "form", et: "on", of: "olema", en: "is" }], 1);
    expect(uncovered("Nimi on.", l)).toEqual([]);
    expect(uncovered("Nimi on minu.", l)).toEqual(["minu"]);
  });

  it("covers a phrase's words only where they stand together", () => {
    const l = teach(EMPTY_LEDGER, [{ kind: "phrase", et: "Ma ei saa aru.", en: "I don't understand." }], 1);
    expect(uncovered("Vabandust, ma ei saa aru!", l)).toEqual(["Vabandust"]);
    // `saa` on its own is not taught: it was only ever part of the phrase.
    expect(uncovered("Ma saa.", l)).toEqual(["Ma", "saa"]);
  });

  it("lets a name through and nothing else", () => {
    expect(uncovered("Tere, Mari!", teach(EMPTY_LEDGER, [{ kind: "phrase", et: "Tere!", en: "Hello!" }], 1))).toEqual([]);
    expect(uncovered("Tere, Malle!", teach(EMPTY_LEDGER, [{ kind: "phrase", et: "Tere!", en: "Hello!" }], 1))).toEqual(["Malle"]);
  });

  it("reads Estonian out of an English sentence by its braces", () => {
    expect(estonianIn("Say {Tere} back, or {Tere õhtust}.")).toEqual(["Tere", "Tere õhtust"]);
  });
});

describe("the check over a level", () => {
  it("passes a lesson that shows only what it teaches", () => {
    expect(lessonProblems([lesson({})])).toEqual([]);
  });

  it("fails a conversation line holding a word taught a lesson later", () => {
    const first = lesson({ conversation: [{ who: "Mari", et: "Tere! Kes see on?", en: "Hello! Who's this?" }] });
    const problems = lessonProblems([first]);
    expect(problems.join("\n")).toMatch(/line 1.*Kes, see, on/);
  });

  it("fails a word in braces in the rule, and in a model answer", () => {
    const problems = lessonProblems([
      lesson({ how: { point: "Say {aitäh}.", watchOut: "w" }, answers: [{ cue: "c", model: { et: "Aitäh!", en: "Thanks!" } }] }),
    ]);
    expect(problems.some((p) => p.includes("the point"))).toBe(true);
    expect(problems.some((p) => p.includes("question 1, model"))).toBe(true);
  });

  it("fails a fix whose pair names no case or verb slot", () => {
    const fixed = (pair: readonly [string, string]) => lessonProblems([lesson({
      fixes: [{ line: { et: "Tere!", en: "Hello!" }, right: "Tere", wrong: "Tere", pair, why: "w" }],
    })]).filter((p) => p.includes("names no case"));
    expect(fixed(["IndPrSg9", "PARTITIVE"])).toHaveLength(1);
    expect(fixed(["IndIpfIps", "PARTITIVE"])).toEqual([]);
  });

  it("fails a fix whose slip and correction differ only in the letters with marks", () => {
    const marks = (wrong: string) => lessonProblems([lesson({
      fixes: [{ line: { et: "Head ööd!", en: "Good night!" }, right: "ööd", wrong, pair: ["IndIpfIps", "PARTITIVE"], why: "w" }],
    })]).filter((p) => p.includes("differ only in the letters with marks"));
    expect(marks("ood")).toHaveLength(1);
    expect(marks("ÖÖD")).toHaveLength(1);
    expect(marks("öö")).toEqual([]);
  });

  it("fails a check-in that teaches, and one with no role-play", () => {
    const problems = lessonProblems([lesson({}), lesson({ id: "t-2", n: 2, kind: "checkin" })]);
    expect(problems.some((p) => p.includes("teaches nothing new"))).toBe(true);
    expect(problems.some((p) => p.includes("role-play"))).toBe(true);
  });

  it("fails teaching a thing twice, a stray speaker and a broken number", () => {
    const problems = lessonProblems([
      lesson({}),
      lesson({ id: "t-2", n: 3, conversation: [{ who: "Jaan", et: "Tere!", en: "Hello!" }] }),
    ]);
    expect(problems.some((p) => p.includes("taught already"))).toBe(true);
    expect(problems.some((p) => p.includes("not in the cast"))).toBe(true);
    expect(problems.some((p) => p.includes("numbered 3 where the core lessons are at 2"))).toBe(true);
  });

  it("letters a vocabulary lesson after the core lesson before it, and keeps the core numbers", () => {
    const hi = { kind: "phrase", et: "Tere!", en: "Hello!" } as const;
    const bye = { kind: "phrase", et: "Head aega!", en: "Goodbye!" } as const;
    const ok = [
      lesson({}),
      lesson({ id: "t-1a", n: 1, extra: "a", teaches: [bye], conversation: [{ who: "Mari", et: "Head aega!", en: "Goodbye!" }], answers: [{ cue: "c", model: { et: "Head aega!", en: "Goodbye!" } }] }),
      lesson({ id: "t-2", n: 2, teaches: [], kind: "checkin", roleplay: { scene: "s", turns: [] } }),
    ];
    expect(lessonProblems(ok)).toEqual([]);
    const skipped = lessonProblems([lesson({ teaches: [hi] }), lesson({ id: "t-1b", n: 1, extra: "b", teaches: [bye] })]);
    expect(skipped.some((p) => p.includes("lettered 1b where 1a comes next"))).toBe(true);
    const first = lessonProblems([lesson({ id: "t-0a", n: 0, extra: "a" })]);
    expect(first.some((p) => p.includes("lettered 0a"))).toBe(true);
  });

  it("covers a verb's persons once the present has been explained, and its no once that has", () => {
    const go = { kind: "verb", et: "minema", first: "lähen", en: "to go", firstEn: "I go" } as const;
    const plain = teach(EMPTY_LEDGER, [go], 1);
    expect(uncovered("Ma lähen", plain)).toEqual(["Ma"]);
    expect(uncovered("lähed", plain)).toEqual(["lähed"]);
    const present = teach(plain, [], 2, ["present"]);
    expect(uncovered("lähed läheb lähevad", present)).toEqual([]);
    expect(uncovered("lähe", present)).toEqual(["lähe"]);
    expect(uncovered("lähe", teach(present, [], 3, ["negative"]))).toEqual([]);
    // A verb taught after the pattern gets its persons straight away.
    const later = teach(present, [{ kind: "verb", et: "tulema", first: "tulen", en: "to come", firstEn: "I come" }], 4);
    expect(uncovered("tuled tulevad", later)).toEqual([]);
  });

  it("covers a verb's command to one person once that has been explained, and never minema's", () => {
    const verbs = [
      { kind: "verb", et: "ootama", first: "ootan", en: "to wait", firstEn: "I wait" },
      { kind: "verb", et: "minema", first: "lähen", en: "to go", firstEn: "I go" },
    ] as const;
    const before = teach(EMPTY_LEDGER, verbs, 1);
    expect(uncovered("oota", before)).toEqual(["oota"]);
    const after = teach(before, [], 2, ["imperative"]);
    expect(uncovered("oota", after)).toEqual([]);
    expect(uncovered("mine lähe", after)).toEqual(["mine", "lähe"]);
  });

  it("covers the endings a pattern explains on a taught stem, and no other", () => {
    const linn = [
      { kind: "word", et: "linn", en: "town" },
      { kind: "form", et: "linna", of: "linn", en: "of the town", stem: true },
    ] as const;
    const before = teach(EMPTY_LEDGER, linn, 1);
    expect(uncovered("linnas linnast", before)).toEqual(["linnas", "linnast"]);
    const inside = teach(before, [], 2, ["inside"]);
    expect(uncovered("linnas linnast linnasse", inside)).toEqual([]);
    expect(uncovered("linnal", inside)).toEqual(["linnal"]);
    expect(uncovered("linnal linnale linnalt", teach(inside, [], 3, ["outside"]))).toEqual([]);
    // A stem taught after the pattern gets its endings straight away.
    const later = teach(inside, [{ kind: "form", et: "kooli", of: "kool", en: "of the school", stem: true }], 4);
    expect(uncovered("koolis koolist", later)).toEqual([]);
  });

  it("lets a stem be spelled like the word it is the stem of, and nothing else twice", () => {
    const maja = lesson({
      teaches: [{ kind: "word", et: "maja", en: "house" }],
      conversation: [{ who: "Mari", et: "Maja.", en: "A house." }],
      answers: [{ cue: "c", model: { et: "Maja.", en: "A house." } }],
    });
    const stem = lesson({
      id: "t-2", n: 2,
      teaches: [{ kind: "form", et: "maja", of: "maja", en: "of the house", stem: true }],
      conversation: [{ who: "Mari", et: "Maja.", en: "A house." }],
      answers: [{ cue: "c", model: { et: "Maja.", en: "A house." } }],
    });
    expect(lessonProblems([maja, stem])).toEqual([]);
    expect(lessonProblems([maja, stem, { ...stem, id: "t-3", n: 3 }]).join(" ")).toMatch(/taught already/);
  });

  it("covers the past's persons off its I form once the pattern is explained, and never the third", () => {
    const past = [{ kind: "form", et: "elasin", of: "elama", en: "I lived", past: true }] as const;
    const before = teach(EMPTY_LEDGER, past, 1);
    expect(uncovered("elasid", before)).toEqual(["elasid"]);
    const after = teach(before, [], 2, ["past"]);
    expect(uncovered("elasid elasime elasite", after)).toEqual([]);
    expect(uncovered("elas", after)).toEqual(["elas"]);
  });

  it("covers the conditional of every taught verb once it is explained", () => {
    const want = teach(EMPTY_LEDGER, [{ kind: "verb", et: "tahtma", first: "tahan", en: "to want", firstEn: "I want" }], 1);
    expect(uncovered("tahaksin", want)).toEqual(["tahaksin"]);
    expect(uncovered("tahaksin tahaksid tahaks", teach(want, [], 2, ["conditional"]))).toEqual([]);
  });

  it("builds no spelling off a B1 pattern, which is a rule about choosing", () => {
    const items = [
      { kind: "verb", et: "lugema", first: "loen", en: "to read", firstEn: "I read" },
      { kind: "form", et: "raamatu", of: "raamat", en: "of the book", stem: true },
    ] as const;
    const plain = teach(EMPTY_LEDGER, items, 1, ["present"]);
    const withB = teach(EMPTY_LEDGER, items, 1, ["present", ...B_PATTERNS]);
    expect(B_PATTERNS.length).toBeGreaterThan(0);
    expect([...withB.spellings].sort()).toEqual([...plain.spellings].sort());
    for (const p of B_PATTERNS) expect(withB.patterns.has(p), p).toBe(true);
  });

  it("numbers each level from 1, and keeps the levels in order", () => {
    const a2 = lesson({ id: "t-a2", n: 1, level: "A2", teaches: [], how: { point: "p", watchOut: "w" } });
    expect(lessonProblems([lesson({}), a2])).toEqual([]);
    expect(lessonProblems([lesson({}), { ...a2, n: 2 }]).join(" ")).toMatch(/numbered 2 where the core lessons are at 1/);
    expect(lessonProblems([a2, lesson({ id: "t-a1", teaches: [] })]).join(" ")).toMatch(/A1 comes after A2/);
  });
});

describe("a sentence to change (Rework)", () => {
  const read = { kind: "phrase", et: "Ma lugesin raamatut.", en: "I was reading the book." } as const;
  const finished = { kind: "phrase", et: "Ma lugesin raamatu läbi.", en: "I read the book through." } as const;
  const rework = {
    from: { et: read.et, en: read.en }, ask: "Say you finished it.",
    to: { et: finished.et, en: finished.en }, pattern: "object",
  } as const;
  const conversation = [{ who: "Mari", et: read.et, en: read.en }, { who: "Mari", et: finished.et, en: finished.en }];
  const answers = [{ cue: "c", model: { et: read.et, en: read.en } }];

  it("passes a rework whose pattern the lesson explains and whose words are taught", () => {
    expect(lessonProblems([lesson({ conversation, answers, teaches: [read, finished], patterns: ["object"], reworks: [rework] })])).toEqual([]);
  });

  it("fails a rework asking for a pattern nobody has explained", () => {
    const problems = lessonProblems([lesson({ conversation, answers, teaches: [read, finished], reworks: [rework] })]);
    expect(problems.some((p) => p.includes("asks for the object pattern before it is explained"))).toBe(true);
  });

  it("fails a rework whose sentence holds a word not taught by now", () => {
    const problems = lessonProblems([lesson({ conversation, answers, teaches: [read, finished], patterns: ["object"],
      reworks: [{ ...rework, to: { et: "Ma lugesin raamatu kiiresti läbi.", en: "I read it quickly." } }] })]);
    expect(problems.some((p) => p.includes("rework 1, to") && p.includes("kiiresti"))).toBe(true);
  });

  it("fails a rework that asks for the sentence it starts from", () => {
    const problems = lessonProblems([lesson({ conversation, answers, teaches: [read, finished], patterns: ["object"],
      reworks: [{ ...rework, to: rework.from }] })]);
    expect(problems.some((p) => p.includes("the one it starts from"))).toBe(true);
  });

  it("fails a rework that accepts its own starting sentence, lists one twice, or strays from the start it names", () => {
    const at = (r: object) => lessonProblems([lesson({ conversation, answers, teaches: [read, finished], patterns: ["object"], reworks: [{ ...rework, ...r }] })]).join(" ");
    expect(at({ also: [read.et] })).toMatch(/accepted sentence is the one it starts from/);
    expect(at({ also: [finished.et] })).toMatch(/listed twice/);
    expect(at({ ask: "Say you finished it. Start with {Raamatu}." })).toMatch(/start with "Raamatu"/);
    expect(at({ ask: "Say you finished it. You can start with {Raamatu}." })).not.toMatch(/start with/);
  });

  it("puts the lesson's reworks in its practice, and marks them by comparison", () => {
    const spec = lesson({ conversation, answers, teaches: [read, finished], patterns: ["object"], reworks: [rework] });
    const items = practiceFor(spec, EMPTY_LEDGER);
    const item = items.find((i) => i.kind === "rework");
    expect(item).toBeDefined();
    if (item?.kind !== "rework") return;
    expect(item.accept).toEqual([finished.et]);
    expect(markRework("ma lugesin raamatu läbi", item).verdict).toBe("right");
    expect(markRework("Ma lugesin raamatu labi.", item).verdict).toBe("nearly");
    // One letter apart is the whole point of the object rule, so it is wrong, never a slip.
    expect(markRework("Ma lugesin raamatut läbi.", item).verdict).toBe("wrong");
    const unchanged = markRework(read.et, item);
    expect(unchanged.verdict).toBe("wrong");
    expect(unchanged.note).toContain("as it was");
    expect(markRework("", item).note).toBe("Nothing typed.");
    // The right words in another order are nearly, and say so; the full table is practice.test.ts.
    expect(markRework("Raamatu lugesin ma läbi.", item).verdict).toBe("nearly");
    expect(markRework("Raamatu lugesin ma läbi.", item).note).toContain("another order");
    // But another ending in another order is still the wrong word.
    expect(markRework("Raamatut lugesin ma läbi.", item).verdict).toBe("wrong");
  });
});

describe("a slip to put right (Fix)", () => {
  const teaches = [
    { kind: "phrase", et: "Ma lugesin", en: "I read" },
    { kind: "word", et: "raamat", en: "book" },
    { kind: "form", et: "raamatut", of: "raamat", en: "some of the book" },
    { kind: "form", et: "raamatu", of: "raamat", en: "the whole book" },
    { kind: "word", et: "kass", en: "cat" },
  ] as const;
  const line = { et: "Ma lugesin raamatut.", en: "I was reading the book." };
  const fix = { line, right: "raamatut", wrong: "raamatu", pair: ["PARTITIVE", "GENITIVE"], why: "Still reading: some of it." } as const;
  const base = {
    conversation: [{ who: "Mari", et: line.et, en: line.en }],
    answers: [{ cue: "c", model: { et: line.et, en: line.en } }],
    teaches, patterns: ["object"] as const,
  };

  it("passes a slip that is another taught form of the same word", () => {
    expect(lessonProblems([lesson({ ...base, fixes: [fix] })])).toEqual([]);
  });

  it("fails a slip that is a different word, and a word not in the line", () => {
    const other = lessonProblems([lesson({ ...base, fixes: [{ ...fix, wrong: "kass" }] })]);
    expect(other.some((p) => p.includes("is not another taught form"))).toBe(true);
    const missing = lessonProblems([lesson({ ...base, fixes: [{ ...fix, right: "raamatu", wrong: "raamatut" }] })]);
    expect(missing.some((p) => p.includes("is not in the line once"))).toBe(true);
  });

  it("puts the learner's own mix-up first, and marks the line typed back unchanged", () => {
    const other = { ...fix, line: { et: "Ma lugesin raamatu.", en: "I read the book." }, right: "raamatu", wrong: "raamatut", pair: ["INESSIVE", "ELATIVE"] } as const;
    const spec = lesson({ ...base, conversation: [...base.conversation, { who: "Mari", et: other.line.et, en: other.line.en }], fixes: [other, fix] });
    const plain = practiceFor(spec, EMPTY_LEDGER).filter((i) => i.kind === "fix");
    expect(plain.map((i) => i.kind === "fix" && i.answer)).toEqual([other.line.et, line.et]);
    const mine = practiceFor(spec, EMPTY_LEDGER, [], [["GENITIVE", "PARTITIVE"]]).filter((i) => i.kind === "fix");
    expect(mine.map((i) => i.kind === "fix" && i.answer)).toEqual([line.et, other.line.et]);
    const item = mine[0]!;
    if (item.kind !== "fix") return;
    expect(item.shown).toBe("Ma lugesin raamatu.");
    expect(markRework("Ma lugesin raamatut.", item).verdict).toBe("right");
    expect(markRework(item.shown, item).note).toContain("slip still in it");
  });

  it("does not forgive another word that is a letter out under the slip floor", () => {
    const item = practiceFor(lesson({ ...base, fixes: [fix] }), EMPTY_LEDGER).find((i) => i.kind === "fix");
    expect(item?.kind).toBe("fix");
    if (item?.kind !== "fix") return;
    // A letter out on a word under eight letters is another word as far as the marker can tell, as `sina` is for `mina`.
    expect(markRework("Ma lugeisn raamatut.", item).verdict).toBe("wrong");
    expect(markRework("Ma lugeisn raamatut.", item).close).toBe(false);
    // The slip itself still in it is wrong however the rest is spelled.
    expect(markRework("Ma lugeisn raamatu.", item).verdict).toBe("wrong");
  });
});

/**
 * B2'S ADDITIONS TO WHAT A LESSON SHOWS: a text to read, which may run ahead
 * of the course, and a sentence with one word to work out, which is held to
 * the ledger but for that word. And the race's own windows.
 */
describe("the B2 fields", () => {
  const derived = [
    { kind: "phrase" as const, et: "Tere!", en: "Hello!" },
    { kind: "word" as const, et: "laps", en: "child" },
    { kind: "form" as const, et: "laste", of: "laps", en: "of the children" },
    { kind: "word" as const, et: "koht", en: "place" },
    { kind: "word" as const, et: "on", en: "is" },
    { kind: "word" as const, et: "hea", en: "good" },
  ];
  const b2 = (over: Partial<LessonSpec>) => lesson({ teaches: derived, patterns: ["derivation"], ...over });
  const work = {
    sentence: { et: "Lastekoht on hea.", en: "The children's place is good." },
    word: "Lastekoht", parts: ["laste", "koht"], means: "a place for children",
    options: ["a place for children", "a school bag", "a teacher"],
  };

  it("lets a text to read run ahead of the course, and still asks that it says what it is", () => {
    const read = { genre: "a notice in the stairwell", lines: [{ et: "Homme remonditakse lifti.", en: "The lift is repaired tomorrow." }] };
    expect(lessonProblems([b2({ read })])).toEqual([]);
    expect(lessonProblems([b2({ read: { ...read, genre: " " } })]).join(" ")).toMatch(/a text to read says what it is/);
    expect(lessonProblems([b2({ read: { genre: "x", lines: [] } })]).join(" ")).toMatch(/has no lines/);
    expect(lessonProblems([b2({ read: { genre: "x", lines: [{ et: "Tere!", en: "" }] } })]).join(" ")).toMatch(/Estonian or English and not both/);
    // Its English is held to braces like every line of English.
    expect(lessonProblems([b2({ read: { genre: "x", lines: [{ et: "Tere!", en: "Hi, {kallis}." }] } })]).join(" ")).toMatch(/kallis, not taught/);
  });

  it("holds a work-it-out sentence to the ledger but for its one word, and the word to its own split", () => {
    expect(lessonProblems([b2({ workOut: [work] })])).toEqual([]);
    expect(lessonProblems([b2({ workOut: [{ ...work, sentence: { ...work.sentence, et: "Lastekoht on väga hea." } }] })]).join(" ")).toMatch(/väga/);
    expect(lessonProblems([b2({ workOut: [{ ...work, parts: ["lapse", "koht"] }] })]).join(" ")).toMatch(/work it out 1: its parts lapse \+ koht are not/);
    expect(lessonProblems([lesson({ teaches: derived, workOut: [work] })]).join(" ")).toMatch(/before the derivation pattern/);
  });

  it("holds the race's windows to one to three goes, each shorter than the last, and a sane preparation", () => {
    const faster = { ask: { et: "Tere!", en: "Hello!" }, cue: "c", model: { et: "Tere!", en: "Hello!" } };
    expect(lessonProblems([b2({ faster: { ...faster, seconds: [60, 45, 30] } })])).toEqual([]);
    expect(lessonProblems([b2({ faster: { ...faster, seconds: [60], prepare: 120 } })])).toEqual([]);
    expect(lessonProblems([b2({ faster: { ...faster, seconds: [45, 60] } })]).join(" ")).toMatch(/not each shorter than the last/);
    expect(lessonProblems([b2({ faster: { ...faster, seconds: [] } })]).join(" ")).toMatch(/0 goes/);
    expect(lessonProblems([b2({ faster: { ...faster, seconds: [600] } })]).join(" ")).toMatch(/outside 15 to 180/);
    expect(lessonProblems([b2({ faster: { ...faster, prepare: 1000 } })]).join(" ")).toMatch(/prepares for 1000 seconds/);
  });

  it("puts a work-it-out question in practice, its sentence held to the ledger but for the word", () => {
    const l = b2({ workOut: [work] });
    const items = practiceFor(l, EMPTY_LEDGER).filter((i) => i.kind === "workOut");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.kind === "workOut" && [...item.options].sort()).toEqual([...work.options].sort());
    expect(item.kind === "workOut" && item.answer).toBe(work.means);
    expect(itemEstonian(item)).toEqual(["on hea."]);
  });
});
