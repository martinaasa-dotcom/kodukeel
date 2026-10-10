import { describe, expect, it } from "vitest";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { TWIN_GROUPS, guessable, twinGroup } from "@/lib/collections/twins";
import { BLANK, mentions } from "@/lib/estonian/cloze";
import { guessQuestionFor, sameSlot, sentenceQuestionsFor, slotIndex, splitAtGap, type TwinRow } from "./twinQuestions";

const ROWS = new Map<string, TwinRow>(
  dictionaryRows().map((r) => [`${r.lemma}|${r.pos}`, {
    id: `${r.lemma}|${r.pos}`, lemma: r.lemma, pos: r.pos, cefr: r.cefr, translation: r.translation,
    examples: JSON.stringify(r.examples), forms: r.forms,
  }]),
);
const none = () => [];
const noRank = () => undefined;

const built = TWIN_GROUPS.map((g) => ({
  group: g,
  questions: g.words.flatMap((w) => sentenceQuestionsFor(g, w, ROWS, none, noRank, null, 4)),
}));

describe("the sentence a twin question is cut from", () => {
  it("reaches most of the groups from their own recorded sentences", () => {
    const reached = built.filter((b) => b.questions.length > 0).length;
    // Measured at all 71 over the shipped dictionary with no borrowed
    // sentences, which the app adds on top. A floor rather than an equality,
    // since a re-harvest moves it.
    expect(reached).toBeGreaterThanOrEqual(66);
  });

  it("reaches every pair the learner who asked for this named", () => {
    for (const id of ["ostma-otsima", "algama-alustama-hakkama", "kuulma-kuulama", "kasvama-kasvatama", "muutma-muutuma"]) {
      expect(built.find((b) => b.group.id === id)!.questions.length, id).toBeGreaterThan(0);
    }
  });

  it("never prints its own answer, and always says what the sentence means", () => {
    let asked = 0;
    for (const { questions } of built) {
      for (const q of questions) {
        asked += 1;
        expect(q.gapped).toContain(BLANK);
        expect(q.en.trim().length, q.sentence).toBeGreaterThan(0);
        expect(q.options[q.answer]!.lemma).toBe(q.lemma);
        expect(q.options[q.answer]!.text).toBe(q.form);
        for (const o of q.options) expect(mentions(q.gapped, o.text), `${q.gapped} / ${o.text}`).toBe(false);
        const texts = q.options.map((o) => o.text.toLowerCase());
        expect(new Set(texts).size).toBe(texts.length);
        const [before, after] = splitAtGap(q.gapped);
        expect(`${before}${q.form}${after}`).toBe(q.sentence);
      }
    }
    expect(asked).toBeGreaterThan(150);
  });

  it("offers a stand-in only where the table says Estonian allows one", () => {
    const begin = built.find((b) => b.group.id === "algama-alustama-hakkama")!.questions;
    for (const q of begin) {
      for (const i of q.standIns) expect(q.options[i]!.lemma === "hakkama" || q.lemma === "hakkama").toBe(true);
    }
    for (const q of built.find((b) => b.group.id === "ostma-otsima")!.questions) expect(q.standIns).toEqual([]);
  });
});

describe("putting the twin into the gap's slot", () => {
  it("finds the same person of the other verb", () => {
    const osta = slotIndex(ROWS.get("ostma|VERB")!);
    const otsi = slotIndex(ROWS.get("otsima|VERB")!);
    expect(sameSlot(otsi, osta.get("ostan")!)).toBe("otsin");
  });

  it("finds the same case of the other noun", () => {
    const kala = slotIndex(ROWS.get("kala|NOUN")!);
    const kana = slotIndex(ROWS.get("kana|NOUN")!);
    expect(sameSlot(kana, kala.get("kalas")!)).toBe("kanas");
  });
});

describe("guessing the other half of a pair", () => {
  it("asks what the long word means, with the short word's meaning among the wrong answers", () => {
    const q = guessQuestionFor(twinGroup("muutma-muutuma")!, ROWS, true, "to bring (here)")!;
    expect(q.asked.lemma).toBe("muutuma");
    expect(q.options[q.answer]).toBe("to change, to become different");
    expect(q.options).toContain("to change something");
    expect(q.options).toHaveLength(3);
  });

  it("can be asked of every pair the rule kept", () => {
    for (const g of TWIN_GROUPS.filter(guessable)) {
      expect(guessQuestionFor(g, ROWS, true, "a decoy nobody wrote"), g.id).not.toBeNull();
    }
  });
});
