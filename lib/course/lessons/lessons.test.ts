import { describe, expect, it } from "vitest";
import { isExactForm } from "@/lib/dict/forms";
import { VOICES } from "@/lib/audio/voice";
import { A1_LESSON_PARTS, A1_LESSONS } from "./a1";
import { PLACE_SPELLINGS, estonianOf, ledgersBefore, lessonProblems, namesOf, teach, uncovered, wordsOf } from "./ledger";
import { markPhrase, meaningShows, practiceFor, reviewFor } from "./practice";
import { estonianIn } from "./ledger";
import { LESSONS } from "./index";

/**
 * THE LESSONS THEMSELVES, AGAINST THE TWO MECHANICAL CHECKS (ADR-005
 * amendment 6). Neither says a line is good Estonian; the native speaker who
 * reads the pull request says that. These catch the rest.
 */

const ESTONIAN_LETTER = /[õäöüšž]/i;

describe("A1 lessons", () => {
  it("never show a word before it is taught", () => {
    expect(lessonProblems(A1_LESSONS)).toEqual([]);
  });

  it("write only spellings the forms list knows", async () => {
    const unknown: string[] = [];
    for (const lesson of A1_LESSONS) {
      const names = namesOf(lesson);
      const texts = [...estonianOf(lesson).map((e) => e.et), ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.et, t.first] : [t.et]))];
      for (const text of texts) {
        for (const w of wordsOf(text)) {
          if (names.has(w.raw) || PLACE_SPELLINGS.has(w.raw)) continue;
          if (!(await isExactForm(w.low))) unknown.push(`${lesson.id}: ${w.raw} in "${text}"`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it("keep Estonian out of the English, except in braces", () => {
    const leaks: string[] = [];
    for (const lesson of A1_LESSONS) {
      const english = [
        lesson.title, lesson.goal,
        ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.firstEn] : [])),
        ...lesson.conversation.flatMap((l) => [l.en ?? "", l.stage ?? ""]),
        ...[...lesson.answers, ...(lesson.roleplay?.turns ?? [])].flatMap((p) => [p.ask?.en ?? "", p.model.en]),
      ];
      for (const e of english) if (ESTONIAN_LETTER.test(e)) leaks.push(`${lesson.id}: ${e}`);
    }
    expect(leaks).toEqual([]);
  });

  it("read every speaker in a voice the app has", () => {
    const voices = new Set(VOICES.map((v) => v.id));
    for (const lesson of A1_LESSONS) for (const voice of Object.values(lesson.cast)) expect(voices.has(voice)).toBe(true);
  });

  it("belong to a part that exists", () => {
    const parts = new Set(A1_LESSON_PARTS.map((p) => p.id));
    for (const lesson of A1_LESSONS) expect(parts.has(lesson.part)).toBe(true);
  });

  it("practise and review only what has been taught", () => {
    const before = ledgersBefore(LESSONS);
    let asked = 0;
    for (const lesson of A1_LESSONS) {
      const ledger = before.get(lesson.id)!;
      const tonight = teach(ledger, lesson.teaches, lesson.n, lesson.patterns);
      const items = [...practiceFor(lesson, ledger), ...reviewFor(lesson, ledger)];
      for (const item of items) {
        const et = item.kind === "type" ? item.answer : item.et;
        expect(uncovered(et, tonight), `${lesson.id}: ${et}`).toEqual([]);
        if (item.kind !== "type") {
          expect(item.options).toContain(item.answer);
          expect(new Set(item.options.map((o) => o.toLowerCase())).size).toBe(item.options.length);
        }
        asked++;
      }
      // The review step goes over older lessons only.
      for (const item of reviewFor(lesson, ledger)) {
        const et = item.kind === "type" ? item.answer : item.et;
        expect(uncovered(et, ledger), `${lesson.id} review: ${et}`).toEqual([]);
      }
    }
    expect(asked).toBeGreaterThan(A1_LESSONS.length * 5);
  });

  it("never print the answer in the question or in an option", () => {
    const before = ledgersBefore(LESSONS);
    let looked = 0;
    for (const lesson of A1_LESSONS) {
      const ledger = before.get(lesson.id)!;
      for (const item of [...practiceFor(lesson, ledger), ...reviewFor(lesson, ledger)]) {
        const answer = new Set(wordsOf(item.kind === "type" ? item.answer : item.et).map((w) => w.low));
        const shown = item.kind === "type" ? [item.en] : item.options;
        for (const text of shown) {
          const quoted = estonianIn(text).flatMap((et) => wordsOf(et).map((w) => w.low));
          expect(quoted.filter((w) => answer.has(w)), `${lesson.id}: ${text}`).toEqual([]);
          looked++;
        }
      }
    }
    expect(looked).toBeGreaterThan(A1_LESSONS.length * 10);
  });

  it("knows a meaning that quotes its own word", () => {
    expect(meaningShows({ kind: "form", et: "ole", of: "olema", en: "be: {ei ole} is not" })).toBe(true);
    expect(meaningShows({ kind: "form", et: "mul", of: "mina", en: "at me; with {on}, I have" })).toBe(false);
  });

  it("give every lesson something to practise, and nothing on the first lesson's review", () => {
    const before = ledgersBefore(LESSONS);
    for (const lesson of A1_LESSONS) expect(practiceFor(lesson, before.get(lesson.id)!).length).toBeGreaterThan(3);
    expect(reviewFor(A1_LESSONS[0]!, before.get(A1_LESSONS[0]!.id)!)).toEqual([]);
  });
});

describe("marking a typed phrase", () => {
  it("takes it whatever the case and punctuation", () => {
    expect(markPhrase("tere hommikust", ["Tere hommikust!"]).verdict).toBe("right");
  });
  it("takes a second spelling with the same meaning", () => {
    expect(markPhrase("ma", ["mina", "ma"]).verdict).toBe("right");
  });
  it("calls a dropped mark nearly", () => {
    expect(markPhrase("aitah", ["Aitäh!"]).verdict).toBe("nearly");
  });
  it("does not take one half of a phrase with a comma in it", () => {
    expect(markPhrase("palun", ["Aeglasemalt, palun."]).verdict).toBe("wrong");
  });
  it("does not call another short word a slip", () => {
    expect(markPhrase("sina", ["mina"]).verdict).toBe("wrong");
  });
});
