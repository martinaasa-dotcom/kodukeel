import { describe, expect, it } from "vitest";
import { TRY_IT_ASKS, caseAsks, verbAsks, type TryItCaseWord, type TryItVerb } from "./tryIt";

/*
  Structural rows in the shape the reference pages hand over. The values are
  the shape of a table and not a claim about Estonian: the builder holds no
  Estonian and neither does this test, which is why they are nonsense
  spellings rather than real verbs.
*/
const verb = (lemma: string, forms: Record<string, string>): TryItVerb => ({
  lemma, translation: `to ${lemma}`,
  forms: Object.entries(forms).map(([code, value]) => ({ code, value })),
});

const persons = (stem: string): Record<string, string> => ({
  IndPrSg1: `${stem}n`, IndPrSg2: `${stem}d`, IndPrSg3: `${stem}b`,
  IndPrPl1: `${stem}me`, IndPrPl2: `${stem}te`, IndPrPl3: `${stem}vad`,
  IndPrPs_: stem, ImpPrSg2: stem, IndIpfSg1: `${stem}sin`, IndIpfSg3: `${stem}s`,
});

const fixed = () => 0.42;

describe("the reading asks back", () => {
  const table = [verb("xa", persons("xa")), verb("yo", persons("yo")), verb("zu", persons("zu"))];

  it("asks three questions on a persons table, each answerable from its own options", () => {
    const asks = verbAsks(table, "present", fixed);
    expect(asks).toHaveLength(TRY_IT_ASKS);
    for (const ask of asks) {
      expect(ask.options).toContain(ask.answer);
      expect(new Set(ask.options).size).toBe(ask.options.length);
      expect(ask.prompt).toContain(ask.about);
      expect(ask.yes).toContain(ask.answer);
      expect(ask.no).toContain(ask.answer);
    }
  });

  it("walks across the verbs rather than asking one three times", () => {
    const asks = verbAsks(table, "present", fixed);
    expect(new Set(asks.map((a) => a.about)).size).toBe(3);
  });

  it("asks one verb three different persons where the page holds one verb", () => {
    let i = 0;
    const walk = () => [0.1, 0.5, 0.9, 0.3, 0.7][i++ % 5]!;
    const asks = verbAsks([verb("xa", persons("xa"))], "present", walk);
    expect(asks).toHaveLength(TRY_IT_ASKS);
    expect(new Set(asks.map((a) => a.answer)).size).toBe(3);
  });

  it("says out loud when two persons share a form, so the right pick is still one answer", () => {
    const olema = verb("ol", { ...persons("ol"), IndPrSg3: "on", IndPrPl3: "on" });
    const asks = verbAsks([olema], "present", () => 0.4);
    const shared = asks.find((a) => a.answer === "on");
    expect(shared).toBeDefined();
    expect(shared!.options.filter((o) => o === "on")).toHaveLength(1);
    expect(shared!.yes).toMatch(/for (ta|nad), and for (nad|ta) too/);
    expect(shared!.no).toMatch(/and so does (ta|nad)\./);
  });

  it("asks the no-form and the do-it form across the verbs on the page", () => {
    const no = verbAsks(table, "negative", fixed);
    expect(no[0]!.options.every((o) => o.startsWith("ei "))).toBe(true);
    expect(no[0]!.no).toMatch(/^Not that one\. The no-form of/);
    const doIt = verbAsks(table, "imperative", fixed);
    expect(doIt[0]!.options.every((o) => o.endsWith("!"))).toBe(true);
  });

  it("asks the past as which of three forms of one verb, and which person", () => {
    const asks = verbAsks(table, "past", fixed);
    expect(asks[0]!.options).toHaveLength(3);
    expect(asks[0]!.answer.endsWith("sin") || asks[0]!.answer.endsWith("s")).toBe(true);
  });

  it("asks nothing where there is nothing to ask", () => {
    expect(verbAsks([verb("xa", { IndPrSg1: "xan" })], "present", fixed)).toEqual([]);
    expect(verbAsks([verb("xa", { IndPrSg1: "xan" })], "past", fixed)).toEqual([]);
    expect(verbAsks([], "negative", fixed)).toEqual([]);
  });
});

describe("the case table asks back", () => {
  const rows: TryItCaseWord[] = [
    { lemma: "xa", translation: "a", genitive: "xo", form: "xos" },
    { lemma: "yb", translation: "b", genitive: "yb", form: "ybs" },
    { lemma: "zc", translation: "c", genitive: "zi", form: "zis" },
    { lemma: "wd", translation: "d", genitive: "wd", form: "wds" },
  ];

  it("asks which of the words on the page is this one, and names the stem", () => {
    const asks = caseAsks(rows, "seesütlev", "s", fixed);
    expect(asks).toHaveLength(TRY_IT_ASKS);
    for (const ask of asks) {
      expect(ask.options).toContain(ask.answer);
      expect(ask.options.length).toBeGreaterThanOrEqual(3);
      expect(ask.prompt).toContain("seesütlev");
    }
    const stemmed = asks.find((a) => a.answer === "xos");
    if (stemmed) expect(stemmed.yes).toContain("The stem is xo, then s.");
  });

  it("never asks about a form spelled like the word itself, and asks nothing on a thin table", () => {
    const thin = [{ lemma: "xa", translation: "a", genitive: "xa", form: "xa" }, ...rows.slice(0, 2)];
    expect(caseAsks(thin, "nimetav", "", fixed)).toEqual([]);
    expect(caseAsks(rows.slice(0, 2), "seesütlev", "s", fixed)).toEqual([]);
  });
});
