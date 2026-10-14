import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { BLANK } from "@/lib/estonian/cloze";
import type { FlashWord } from "./flash";
import {
  MIN_LINES, OUTCOME_RATING, composeSheet, indexFor, lineSentence, linesFor, markLine, outcomeAfter,
  pageReading, parseTheme, preferredThemes, slotsFor, themesOf, verbSlot, whoFor, type SheetItem,
} from "./workbook";
import { PRONOUN_LEMMAS } from "@/lib/estonian/pronouns";

/** A course word exactly as the seed would hold it, read off the shipped harvest. */
function shipped(lemma: string, extra: { et: string }[] = []): FlashWord {
  const entry = HARVESTED.find((w) => w.lemma === lemma);
  if (!entry) throw new Error(`${lemma} is not in the harvest`);
  return {
    lexemeId: `lex-${lemma}`,
    lemma: entry.lemma,
    translation: entry.gloss,
    pos: entry.pos,
    semanticTypes: null,
    forms: [
      ...Object.entries(entry.parts).map(([formType, value]) => ({ formType, value: value as string })),
      ...entry.extraForms.map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value })),
    ],
    examples: [...extra, ...entry.usages.map((et) => ({ et }))].map((e) => ({ et: e.et, source: "EKILEX" as const })),
  };
}

const TUBA: FlashWord = {
  lexemeId: "lex-tuba",
  lemma: "tuba",
  translation: "room",
  pos: "NOUN",
  semanticTypes: null,
  forms: [
    { formType: "NOM_SG", value: "tuba" },
    { formType: "GEN_SG", value: "toa" },
    { formType: "PART_SG", value: "tuba" },
    { formType: "ILL_SG_SHORT", value: "tuppa" },
  ],
  examples: [
    { et: "Ma olen praegu toas.", source: "EKILEX" },
    { et: "Lapsed jooksid toast välja.", source: "EKILEX" },
    { et: "Tuba on suur ja valge.", source: "EKILEX" },
    { et: "Ta tuli tuppa ja istus maha.", source: "EKILEX" },
  ],
};

const LUGEMA: FlashWord = {
  lexemeId: "lex-lugema",
  lemma: "lugema",
  translation: "to read",
  pos: "VERB",
  semanticTypes: null,
  forms: [
    { formType: "INF_MA", value: "lugema" },
    { formType: "INF_DA", value: "lugeda" },
    { formType: "PRES_1SG", value: "loen" },
    { formType: "PAST_1SG", value: "lugesin" },
  ],
  examples: [
    { et: "Ta loeb igal õhtul raamatut.", source: "EKILEX" },
    { et: "Me loeme koos ajalehte.", source: "EKILEX" },
    { et: "Ma ei loe ajalehti üldse.", source: "EKILEX" },
    { et: "Loe see kiri kohe läbi!", source: "EKILEX" },
  ],
};

describe("slotsFor", () => {
  it("asks a noun its cases and never the form spelled like the bracket", () => {
    const slots = slotsFor(TUBA).map((s) => s.slot);
    expect(slots).toContain("INESSIVE");
    expect(slots).toContain("ELATIVE");
    expect(slots).not.toContain("NOMINATIVE");
    for (const s of slotsFor(TUBA)) expect(s.accepted.map((a) => a.toLowerCase())).not.toContain("tuba");
  });

  it("asks a verb every present person, not only the three a card drills", () => {
    const slots = slotsFor(LUGEMA).map((s) => s.slot);
    for (const code of ["IndPrSg1", "IndPrSg2", "IndPrSg3", "IndPrPl1", "IndPrPl2", "IndPrPl3"]) {
      expect(slots, code).toContain(code);
    }
    // The negative is two words and a bracket gives no reason for the `ei`.
    expect(slots.some((s) => s.startsWith("IndPrPs"))).toBe(false);
  });

  it("reads the plural pronouns off their stored forms, which no singular stem reaches", () => {
    const teie = slotsFor(shipped("teie"));
    const allative = teie.find((s) => s.slot === "ALLATIVE");
    expect(allative?.accepted).toContain("teile");
    expect(teie.find((s) => s.slot === "ABLATIVE")?.accepted).toContain("teilt");
    // And both spellings of a singular pronoun's case, long and short.
    expect(slotsFor(shipped("mina")).find((s) => s.slot === "ALLATIVE")?.accepted).toEqual(
      expect.arrayContaining(["minule", "mulle"]),
    );
    expect(teie.some((s) => s.slot === "NOMINATIVE")).toBe(false);
  });
});

describe("verbSlot", () => {
  it("reads a tense and a person off a finite code, and refuses the negative", () => {
    expect(verbSlot("IndPrPl3")).toEqual({ tense: "present", person: "they" });
    expect(verbSlot("IndIpfSg1")).toEqual({ tense: "past", person: "I" });
    expect(verbSlot("KndPrPs")).toEqual({ tense: "conditional", person: "he or she" });
    expect(verbSlot("ImpPrPl2")).toEqual({ tense: "imperative", person: "you all" });
    expect(verbSlot("IndPrPs_")).toBeNull();
    expect(verbSlot("PtsPstPs")).toBeNull();
  });
});

describe("linesFor", () => {
  it("cuts a line out of a recorded sentence, with the gap where the form was", () => {
    const lines = linesFor(TUBA);
    const inessive = lines.find((l) => l.slot === "INESSIVE")!;
    expect(inessive.sentence).toBe("Ma olen praegu toas.");
    expect(inessive.before + inessive.answer + inessive.after).toBe(inessive.sentence);
    expect(inessive.answer).toBe("toas");
    expect(inessive.cue).toBe("tuba");
    expect(inessive.themes).toEqual(["case:INESSIVE", "mixed"]);
  });

  it("never makes a line whose answer is the word in the bracket", () => {
    for (const line of linesFor(TUBA)) expect(line.answer.toLowerCase()).not.toBe("tuba");
  });

  it("gives every line a sentence it was actually recorded in", () => {
    let walked = 0;
    for (const word of [TUBA, LUGEMA, shipped("mina"), shipped("teie"), shipped("nemad")]) {
      for (const line of linesFor(word)) {
        walked += 1;
        expect(word.examples.map((e) => e.et)).toContain(line.sentence);
        expect(line.sentence.includes(BLANK)).toBe(false);
      }
    }
    expect(walked).toBeGreaterThan(3);
  });

  it("asks a command where no `ei` stands in front of it, and no verb after one", () => {
    const lines = linesFor(LUGEMA);
    expect(lines.find((l) => l.slot === "ImpPrSg2")?.answer).toBe("Loe");
    expect(lines.some((l) => l.sentence.startsWith("Ma ei loe"))).toBe(false);
    expect(lines.find((l) => l.slot === "IndPrSg3")?.answer).toBe("loeb");
  });

  it("never reuses a sentence the page already holds", () => {
    const used = new Set(["Ma olen praegu toas."]);
    expect(linesFor(TUBA, undefined, used).some((l) => l.sentence === "Ma olen praegu toas.")).toBe(false);
  });

  it("holds to the module's gates when it is handed them", () => {
    const lines = linesFor(TUBA, {
      slotOk: (slot) => slot === "ELATIVE", sentenceOk: () => true, themeOk: () => true,
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.slot === "ELATIVE")).toBe(true);
    expect(linesFor(TUBA, { slotOk: () => true, sentenceOk: () => false, themeOk: () => true })).toEqual([]);
  });

  it("refuses a sentence that is not whole or too long to read", () => {
    expect(lineSentence("Uuringud näitavad, et ..")).toBe(false);
    expect(lineSentence(`${"Väga pikk lause ".repeat(12)}lõpp.`)).toBe(false);
    expect(lineSentence("Ma olen praegu toas.")).toBe(true);
  });

  it("gives a case line a hint that uncovers the ending and not the stem", () => {
    const line = linesFor(TUBA).find((l) => l.slot === "INESSIVE")!;
    expect(line.hint?.kind).toBe("ending");
    expect(line.hint?.shown.replace(/[\s_]/g, "")).toBe("s");
  });
});

describe("indexFor", () => {
  it("names a pronoun's spelling only where one case claims it", () => {
    const tema = indexFor(shipped("tema"));
    expect(tema.talle).toEqual(["ALLATIVE"]);
    // `tema` is its own nominative and genitive, and so is `ta`: neither can be named.
    expect(tema.ta!.length).toBeGreaterThan(1);
  });
});

describe("markLine", () => {
  const line = linesFor(TUBA).find((l) => l.slot === "INESSIVE")!;

  it("takes the form the dictionary vouches for", () => {
    expect(markLine(line, "toas")).toMatchObject({ right: true, slip: false });
    expect(markLine(line, " Toas ")).toMatchObject({ right: true });
  });

  it("names the case the learner reached for instead of calling it a typo", () => {
    const mark = markLine(line, "toast");
    expect(mark.right).toBe(false);
    expect(mark.reached).toBe("ELATIVE");
    expect(mark.note).toEqual({ kind: "otherCase", got: "ELATIVE", wanted: "INESSIVE" });
  });

  it("names the person of a verb in English", () => {
    const loeb = linesFor(LUGEMA).find((l) => l.slot === "IndPrSg3")!;
    const mark = markLine(loeb, "loeme");
    expect(mark.note).toEqual({ kind: "otherPerson", got: "we", wanted: "he or she" });
  });

  it("says an empty line is empty", () => {
    expect(markLine(line, "  ").note).toEqual({ kind: "blank" });
  });
});

describe("outcomes", () => {
  it("settles a first-pass hit, opens a miss for a second go, and settles everything on the second", () => {
    const right = { right: true, slip: false, reached: null, note: { kind: "none" as const } };
    const slip = { ...right, slip: true };
    const wrong = { right: false, slip: false, reached: null, note: { kind: "wrong" as const } };
    expect(outcomeAfter(1, right)).toBe("right");
    expect(outcomeAfter(1, slip)).toBe("slip");
    expect(outcomeAfter(1, wrong)).toBeNull();
    expect(outcomeAfter(2, right)).toBe("second");
    expect(outcomeAfter(2, wrong)).toBe("missed");
  });

  it("never rates a page Easy, and charges for the second go", () => {
    expect(Math.max(...Object.values(OUTCOME_RATING))).toBe(3);
    expect(OUTCOME_RATING.second).toBeLessThan(OUTCOME_RATING.right);
    expect(OUTCOME_RATING.missed).toBe(1);
  });

  it("names a confusion only where it came back twice", () => {
    const once = pageReading([{ slot: "INESSIVE", outcome: "missed", reached: "ELATIVE" }]);
    expect(once.confusion).toBeNull();
    const twice = pageReading([
      { slot: "INESSIVE", outcome: "missed", reached: "ELATIVE" },
      { slot: "INESSIVE", outcome: "second", reached: "ELATIVE" },
      { slot: "ADESSIVE", outcome: "right", reached: null },
    ]);
    expect(twice.confusion).toEqual({ got: "ELATIVE", wanted: "INESSIVE", times: 2 });
    expect(twice.firstTime).toBe(1);
    expect(twice.settled).toBe(2);
  });
});

/** A line with nothing but what composing a page reads. */
function fake(n: number, slot: string, lexeme = `w${n}`): SheetItem {
  const base = {
    id: `${lexeme}:${slot}`, lexemeId: lexeme, cue: lexeme, translation: "x", pos: "NOUN", slot,
    kind: "case" as const, caseKey: slot as never, tense: null, person: null, pronoun: false,
    before: "A ", after: " b.", sentence: `Sentence number ${n} for ${slot}.`, sentenceEn: null,
    answer: "x", accepted: ["x"], index: {}, hint: null, who: null,
  };
  return { ...base, themes: themesOf(base) };
}

describe("composeSheet", () => {
  const items = [
    ...Array.from({ length: 9 }, (_, i) => fake(i, "PARTITIVE")),
    ...Array.from({ length: 6 }, (_, i) => fake(i + 20, "INESSIVE")),
    ...Array.from({ length: 2 }, (_, i) => fake(i + 40, "ELATIVE")),
  ];

  it("heads each exercise with the first theme that has enough, and never the same theme twice", () => {
    const sheet = composeSheet(items, ["case:ELATIVE", "case:PARTITIVE", "case:INESSIVE"], [{ lines: 6 }, { lines: 4 }]);
    expect(sheet.exercises.map((e) => e.theme)).toEqual(["case:PARTITIVE", "case:INESSIVE"]);
    expect(sheet.exercises[0]!.lines).toHaveLength(6);
    expect(sheet.exercises[0]!.example).not.toBeNull();
  });

  it("puts one word on a page once, and one sentence once", () => {
    const twice = [...items, fake(1, "INESSIVE", "w1")];
    const sheet = composeSheet(twice, ["mixed"], [{ lines: 12 }]);
    const words = [sheet.exercises[0]!.example!, ...sheet.exercises[0]!.lines].map((l) => l.lexemeId);
    expect(new Set(words).size).toBe(words.length);
  });

  it("moves between endings on a mixed page", () => {
    const sheet = composeSheet(items, ["mixed"], [{ lines: 8 }]);
    const slots = sheet.exercises[0]!.lines.map((l) => l.slot);
    let runs = 0;
    for (let i = 1; i < slots.length; i++) if (slots[i] === slots[i - 1]) runs += 1;
    expect(runs).toBeLessThan(slots.length - 1);
  });

  it("sets nothing where no theme has enough lines", () => {
    expect(composeSheet(items.slice(-2), ["case:ELATIVE"], [{ lines: 6 }]).exercises).toEqual([]);
  });
});

describe("preferredThemes", () => {
  it("leads with what was asked for, then tonight's case, then the weakest", () => {
    const order = preferredThemes({ requested: "past", tonight: "ELATIVE", weakest: ["PARTITIVE"] });
    expect(order.slice(0, 4)).toEqual(["past", "case:ELATIVE", "case:PARTITIVE", "pronouns"]);
    expect(order.at(-1)).toBe("mixed");
    expect(new Set(order).size).toBe(order.length);
  });

  it("asks no case where the level asks none", () => {
    const order = preferredThemes({ themeOk: (t) => !t.startsWith("case:") && t !== "pronouns" });
    expect(order.some((t) => t.startsWith("case:") || t === "pronouns")).toBe(false);
    expect(order).toContain("present");
  });

  it("reads a theme off an address and nothing that is not one", () => {
    expect(parseTheme("case:ELATIVE")).toBe("case:ELATIVE");
    expect(parseTheme("pronouns")).toBe("pronouns");
    expect(parseTheme("case:LATIN")).toBeNull();
    expect(parseTheme("<script>")).toBeNull();
  });
});

describe("the partitive and the pronoun page", () => {
  it("asks a stored partitive where the spelling is that case and no other", () => {
    const raamat: FlashWord = {
      lexemeId: "lex-raamat", lemma: "raamat", translation: "book", pos: "NOUN", semanticTypes: null,
      forms: [
        { formType: "NOM_SG", value: "raamat" }, { formType: "GEN_SG", value: "raamatu" },
        { formType: "PART_SG", value: "raamatut" },
      ],
      examples: [{ et: "Ma loen igal õhtul raamatut.", source: "EKILEX" }],
    };
    expect(linesFor(raamat).map((l) => l.slot)).toContain("PARTITIVE");
    // `tuba` is its own partitive, so it can never be a partitive line.
    expect(linesFor(TUBA).some((l) => l.slot === "PARTITIVE")).toBe(false);
  });

  it("lets one pronoun stand on its page in several cases, never twice in one case", () => {
    const lines = ["mina", "sina", "tema", "meie", "teie", "nemad"].flatMap((p) => linesFor(shipped(p)));
    const sheet = composeSheet(lines, ["pronouns"], [{ lines: 8 }]);
    const set = sheet.exercises[0];
    expect(set?.theme).toBe("pronouns");
    const ids = [set!.example!, ...set!.lines].map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(set!.lines.length).toBeGreaterThanOrEqual(MIN_LINES);
  });
});

describe("markLine, against what a learner actually types", () => {
  const lines = linesFor(TUBA).concat(linesFor(LUGEMA));
  const asked = lines.filter((l) => l.answer.length > 2);

  it("takes the answer however the keyboard sent it", () => {
    expect(asked.length).toBeGreaterThan(0);
    for (const line of asked) {
      const a = line.answer;
      for (const typed of [a, a.toLocaleLowerCase("et"), a.toLocaleUpperCase("et"), a.normalize("NFD"), `${a}.`, `  ${a}  `, `"${a}"`]) {
        expect(markLine(line, typed).right, `${typed} for ${a}`).toBe(true);
      }
    }
  });

  it("names the bracket copied out as it stands, ahead of any other reading", () => {
    expect(asked.length).toBeGreaterThan(0);
    for (const line of asked) {
      expect(markLine(line, line.cue).note).toEqual({ kind: "unchanged" });
      expect(markLine(line, line.cue.toLocaleUpperCase("et")).note).toEqual({ kind: "unchanged" });
    }
  });
});

describe("whoFor", () => {
  const nominatives = new Map([[PRONOUN_LEMMAS[0]!, ["ma"]], [PRONOUN_LEMMAS[3]!, ["me"]]]);
  const verb = (person: SheetItem["person"], tense: SheetItem["tense"], before: string, after: string) => ({
    kind: "verb" as const, person, tense, before, after, sentence: `${before}x${after}`,
  });

  it("names the person where the sentence drops the pronoun", () => {
    expect(whoFor(verb("I", "present", "Homme ", " dieeti."), nominatives)).toBe(PRONOUN_LEMMAS[0]);
    expect(whoFor(verb("we", "past", "Eile ", " kinno."), nominatives)).toBe(PRONOUN_LEMMAS[3]);
  });

  it("says nothing where the sentence names the subject, in either spelling", () => {
    expect(whoFor(verb("I", "present", "Homme ", " ma dieeti."), nominatives)).toBeNull();
    expect(whoFor(verb("I", "present", "Nii ", ` ${PRONOUN_LEMMAS[0]}.`), nominatives)).toBeNull();
  });

  it("always names who a command is to, and never a third person", () => {
    expect(whoFor(verb("you", "imperative", "", " mulle raamat."), nominatives)).toBe(PRONOUN_LEMMAS[1]);
    expect(whoFor(verb("you all", "imperative", "", " mulle raamat."), nominatives)).toBe(PRONOUN_LEMMAS[4]);
    expect(whoFor(verb("he or she", "present", "Kontsert ", " kell 18."), nominatives)).toBeNull();
    expect(whoFor(verb("they", "past", "Lapsed ", " õues."), nominatives)).toBeNull();
  });

  it("asks nothing of a case line", () => {
    expect(whoFor({ kind: "case", person: null, tense: null, before: "Ma olen ", after: ".", sentence: "" }, nominatives)).toBeNull();
  });
});

describe("composeSheet keeps a word to one page of a sitting", () => {
  it("never deals the same word on two pages", () => {
    const both = Array.from({ length: 10 }, (_, i) => i + 1).flatMap((n) => [fake(n, "INESSIVE"), fake(n + 100, "ELATIVE", `w${n}`)]);
    const sheet = composeSheet(both, ["case:INESSIVE", "case:ELATIVE"], [{ lines: 4 }, { lines: 4 }]);
    const pages = sheet.exercises.map((e) => new Set([e.example, ...e.lines].filter(Boolean).map((l) => l!.lexemeId)));
    expect(pages).toHaveLength(2);
    for (const w of pages[0]!) expect(pages[1]!.has(w)).toBe(false);
  });
});
