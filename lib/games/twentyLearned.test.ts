import { describe, expect, it } from "vitest";
import { learnedBySpelling, learnPrompt, readLearned, reportable, type LearnedWord } from "./twentyLearned";

const things = ["õun", "kivi", "koer", "sidrun", "mesi"];

describe("what is reported", () => {
  it("keeps one plain word per spelling, lower case, and nothing else", () => {
    expect(reportable(["Mahlane", "mahlane", "  kleepuv ", "a", "x1", "kas see", "ÕUN"])).toEqual(["mahlane", "kleepuv", "õun"]);
  });
  it("reports a handful at most", () => {
    expect(reportable(["aaa", "bbb", "ccc", "ddd", "eee", "fff"])).toHaveLength(4);
  });
});

describe("what comes back from the model", () => {
  const reply = (body: unknown) => `Here you go:\n${JSON.stringify(body)}\n`;
  it("reads a sorted reply", () => {
    const got = readLearned(reply({ en: "Is it juicy?", ru: "Он сочный?", uk: "Він соковитий?", yes: ["õun", "sidrun"], no: ["kivi", "koer"], sometimes: ["mesi"] }), things);
    expect(got?.en).toBe("Is it juicy?");
    expect(got?.ru).toBe("Он сочный?");
    expect(got?.answers).toEqual({ õun: "yes", sidrun: "yes", kivi: "no", koer: "no", mesi: "sometimes" });
  });
  it("refuses a model that says it does not know, or answers too few", () => {
    expect(readLearned(reply({ unknown: true }), things)).toBeNull();
    expect(readLearned(reply({ en: "Is it juicy?", yes: ["õun"] }), things)).toBeNull();
    expect(readLearned("not json", things)).toBeNull();
  });
  it("refuses an English line that is not one short question, or carries Estonian", () => {
    const sorted = { yes: ["õun", "sidrun", "mesi"], no: ["kivi", "koer"] };
    expect(readLearned(reply({ ...sorted, en: "Juicy" }), things)).toBeNull();
    expect(readLearned(reply({ ...sorted, en: "Is it mahlane?" }), things)?.en).toBe("Is it mahlane?");
    expect(readLearned(reply({ ...sorted, en: "Kas see on mahlane?" }), things)).toBeNull();
  });
  it("drops a thing named under two answers, and a name that is not a thing", () => {
    const got = readLearned(reply({ en: "Is it juicy?", yes: ["õun", "sidrun", "kass"], no: ["kivi", "koer", "õun"], sometimes: ["mesi"] }), things);
    expect(got?.answers).toEqual({ sidrun: "yes", kivi: "no", koer: "no", mesi: "sometimes" });
    // Two dropped of five is under the four in five a reply has to sort.
    expect(readLearned(reply({ en: "Is it juicy?", yes: ["õun", "sidrun"], no: ["kivi", "koer", "õun"], sometimes: ["mesi", "koer"] }), things)).toBeNull();
  });
  it("keeps a Russian or Ukrainian line only where it is one", () => {
    const got = readLearned(reply({ en: "Is it juicy?", ru: "Is it juicy?", uk: "Він соковитий?", yes: ["õun", "sidrun", "mesi"], no: ["kivi", "koer"] }), things);
    expect(got?.ru).toBeNull();
    expect(got?.uk).toBe("Він соковитий?");
  });
});

describe("the prompt", () => {
  it("names every thing with its English and never asks for Estonian", () => {
    const p = learnPrompt({ lemma: "mahlane", gloss: null, pos: null }, [{ lemma: "õun", en: "apple" }]);
    expect(p).toContain("õun (apple)");
    expect(p).toContain("\"mahlane\"");
  });
});

describe("a learned word is found by any of its spellings", () => {
  it("maps the headword and every spelling to it", () => {
    const w: LearnedWord = { lemma: "mahlane", spellings: ["mahlane", "mahlased"], en: "Is it juicy?", ru: null, uk: null, answers: {} };
    const map = learnedBySpelling([w]);
    expect(map.get("mahlased")).toBe(w);
    expect(map.get("mahlane")).toBe(w);
    expect(learnedBySpelling(undefined).size).toBe(0);
  });
});
