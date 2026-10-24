import { describe, expect, it } from "vitest";
import { isExactForm } from "@/lib/dict/forms";
import { VOICES } from "@/lib/audio/voice";
import { A1_LESSON_PARTS, A1_LESSONS } from "./a1";
import { PLACE_SPELLINGS, estonianOf, ledgersBefore, lessonProblems, namesOf, teach, uncovered, wordsOf } from "./ledger";
import { markPhrase, meaningShows, practiceFor, reviewFor } from "./practice";
import { estonianIn } from "./ledger";
import { LESSONS } from "./index";
import { CASES, caseNameWithNumber, casePlainName, shortIllativeName } from "@/lib/estonian/cases";
import { PERSON_HINTS, VERB_FORM_NAMES, verbFormName, type Person, type VerbForm } from "@/lib/estonian/verbNames";

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

  it("introduce the four letters of their own together, on the first evening", () => {
    const first = A1_LESSONS[0]!;
    expect((first.how.sounds ?? []).map((r) => r.glyph).filter((g) => /^[õäöü]$/u.test(g)).sort()).toEqual(["ä", "õ", "ö", "ü"]);
  });

  it("let a sound's example word run ahead of the course only with its meaning beside it", () => {
    const first = A1_LESSONS[0]!;
    const row = (en?: string) => ({ ...first, how: { ...first.how, sounds: [{ sound: "sound-ue", glyph: "ü", like: "an i said with rounded lips", word: "number-ueks", mark: "ü", ...(en ? { en } : {}) }] } });
    expect(lessonProblems([row("one")])).toEqual([]);
    expect(lessonProblems([row()]).join(" ")).toMatch(/üks/);
    // The meaning is English and is held to the English rule like any other.
    expect(estonianOf(row("{öö}")).map((e) => e.et)).toContain("öö");
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
    // It reads a forms-list shard per word off disk, which under the whole suite's load
    // runs past the default twenty seconds; jokes.test.ts gives the same read a minute.
  }, 60_000);

  it("keep Estonian out of the English, except in braces", () => {
    const leaks: string[] = [];
    for (const lesson of A1_LESSONS) {
      const english = [
        lesson.title, lesson.goal,
        ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.firstEn] : [])),
        ...lesson.conversation.flatMap((l) => [l.en ?? "", l.stage ?? ""]),
        ...[...lesson.answers, ...(lesson.roleplay?.turns ?? [])].flatMap((p) => [p.ask?.en ?? "", p.model.en]),
      ];
      // Braced Estonian is marked as such on screen and held to the ledger, and
      // a grammar name in square brackets is drawn as Estonian; anything else is a leak.
      for (const e of english) if (ESTONIAN_LETTER.test(e.replace(/\{[^{}]*\}/g, "").replace(/\[[^[\]]*\]/g, ""))) leaks.push(`${lesson.id}: ${e}`);
    }
    expect(leaks).toEqual([]);
  });

  it("name a form only by a name the app knows, with its agreed hint right after it", () => {
    // The operator's list (`casePlainName`, `verbFormName`): a lesson writes
    // `[osastav] (3rd form)`, and the bracket and the hint together have to be
    // exactly one of the names every other screen prints.
    const names = new Set<string>([
      ...CASES.flatMap((spec) => [casePlainName(spec), caseNameWithNumber(spec, "mitmus"), caseNameWithNumber(spec, "ainsus")]),
      shortIllativeName(),
      ...(Object.keys(VERB_FORM_NAMES) as VerbForm[]).flatMap((form) => [
        verbFormName(form),
        ...(Object.keys(PERSON_HINTS) as Person[]).map((person) => verbFormName(form, "en", person)),
      ]),
    ]);
    const strings: string[] = [];
    const walk = (value: unknown): void => {
      if (typeof value === "string") strings.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") Object.values(value).forEach(walk);
    };
    walk(A1_LESSONS);
    const bad: string[] = [];
    let named = 0;
    for (const text of strings) {
      for (const m of text.matchAll(/\[([^[\]]+)\]( \([^()]*\))?/g)) {
        named += 1;
        const full = `${m[1]}${m[2] ?? ""}`;
        if (!names.has(full)) bad.push(`${full}  in  ${text.slice(0, 80)}`);
      }
    }
    expect(named).toBeGreaterThan(40);
    expect(bad).toEqual([]);
  });

  it("read every speaker in a voice the app has", () => {
    const voices = new Set(VOICES.map((v) => v.id));
    for (const lesson of A1_LESSONS) for (const voice of Object.values(lesson.cast)) expect(voices.has(voice)).toBe(true);
  });

  it("belong to a part that exists", () => {
    const parts = new Set(A1_LESSON_PARTS.map((p) => p.id));
    for (const lesson of A1_LESSONS) expect(parts.has(lesson.part)).toBe(true);
  });

  it("practice and review only what has been taught", () => {
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

  it("accept the pronoun in front of a person ending, since Estonian may drop it", () => {
    const before = ledgersBefore(LESSONS);
    let found = 0;
    for (const lesson of A1_LESSONS) {
      for (const item of practiceFor(lesson, before.get(lesson.id)!)) {
        if (item.kind !== "type" || item.answer !== "oleme") continue;
        found++;
        expect(markPhrase("oleme", item.accept).verdict).toBe("right");
        expect(markPhrase("me oleme", item.accept).verdict).toBe("right");
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it("give every lesson something to practice, and nothing on the first lesson's review", () => {
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
