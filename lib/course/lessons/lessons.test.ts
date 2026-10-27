import { describe, expect, it } from "vitest";
import { isExactForm } from "@/lib/dict/forms";
import { shardKey } from "@/lib/dict/formsLayout";
import { fold } from "@/lib/estonian/fold";
import { VOICES } from "@/lib/audio/voice";
import { A1_LESSONS } from "./a1";
import { NAMES, PLACE_SPELLINGS, estonianOf, familiesOf, ledgersBefore, lessonProblems, lessonRank, namesOf, teach, uncovered, wordsOf } from "./ledger";
import { everyTypedQuestion, itemEstonian, markPhrase, meaningShows, practiceFor, reviewFor } from "./practice";
import { estonianIn } from "./ledger";
import { LESSONS, LESSON_PARTS } from "./index";
import { CASES, caseNameWithNumber, casePlainName, shortIllativeName } from "@/lib/estonian/cases";
import { PERSON_ENDINGS, VERB_FORM_NAMES, verbFormName, type Person, type VerbForm } from "@/lib/estonian/verbNames";

/**
 * THE LESSONS THEMSELVES, AGAINST THE TWO MECHANICAL CHECKS (ADR-005
 * amendment 6). Neither says a line is good Estonian; the native speaker who
 * reads the pull request says that. These catch the rest.
 */

const ESTONIAN_LETTER = /[õäöüšž]/i;
/** The capitalized words a lesson teaches as words of their own: places, by their name. */
const TAUGHT_NAMES = new Set(LESSONS.flatMap((l) => l.teaches.map((t) => t.et)).filter((et) => /^\p{Lu}\p{Ll}+$/u.test(et)));

describe("the lessons, A1 and on", () => {
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
    /*
      Each distinct spelling is asked once, in the order of the shard it lives
      in. Asked word by word in lesson order it took 43 seconds alone: the
      forms list holds 48 parsed shards and the lessons visit hundreds, so a
      shard was unzipped and parsed again every time its word came round.
    */
    const where = new Map<string, string>();
    for (const lesson of LESSONS) {
      const names = namesOf(lesson);
      const texts = [...estonianOf(lesson).map((e) => e.et), ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.et, t.first] : [t.et]))];
      for (const text of texts) {
        for (const w of wordsOf(text)) {
          if (names.has(w.raw) || PLACE_SPELLINGS.has(w.raw)) continue;
          if (!where.has(w.low)) where.set(w.low, `${lesson.id}: ${w.raw} in "${text}"`);
        }
      }
    }
    const unknown: string[] = [];
    const byShard = [...where.keys()].sort((a, b) => shardKey(fold(a)).localeCompare(shardKey(fold(b))) || a.localeCompare(b));
    for (const word of byShard) if (!(await isExactForm(word))) unknown.push(where.get(word)!);
    expect(unknown).toEqual([]);
    expect(where.size).toBeGreaterThan(500);
  });

  it("keep Estonian out of the English, except in braces", () => {
    const leaks: string[] = [];
    for (const lesson of LESSONS) {
      const english = [
        lesson.title, lesson.goal,
        ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.firstEn] : [])),
        ...lesson.conversation.flatMap((l) => [l.en ?? "", l.stage ?? ""]),
        ...[...lesson.answers, ...(lesson.roleplay?.turns ?? [])].flatMap((p) => [p.ask?.en ?? "", p.model.en]),
      ];
      // Braced Estonian is marked as such on screen and held to the ledger, and
      // a grammar name in square brackets is drawn as Estonian; anything else is a leak.
      // A place a lesson teaches by name keeps its spelling in English too: Pärnu is Pärnu.
      const bare = (e: string) => e.replace(/\{[^{}]*\}/g, "").replace(/\[[^[\]]*\]/g, "").split(/\s+/).filter((w) => !TAUGHT_NAMES.has(w.replace(/[^\p{L}-]/gu, ""))).join(" ");
      for (const e of english) if (ESTONIAN_LETTER.test(bare(e))) leaks.push(`${lesson.id}: ${e}`);
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
        ...(Object.keys(PERSON_ENDINGS) as Person[]).map((person) => verbFormName(form, "en", person)),
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
    for (const lesson of LESSONS) for (const voice of Object.values(lesson.cast)) expect(voices.has(voice), lesson.id).toBe(true);
  });

  it("belong to a part that exists", () => {
    const parts = new Set(LESSON_PARTS.map((p) => p.id));
    for (const lesson of LESSONS) expect(parts.has(lesson.part), lesson.id).toBe(true);
  });

  it("practice and review only what has been taught, at every level", () => {
    const before = ledgersBefore(LESSONS);
    let asked = 0;
    LESSONS.forEach((lesson, at) => {
      const ledger = before.get(lesson.id)!;
      const history = LESSONS.slice(0, at);
      const tonight = teach(ledger, lesson.teaches, lessonRank(lesson), lesson.patterns);
      const names = namesOf(lesson);
      const items = [...practiceFor(lesson, ledger, history), ...reviewFor(lesson, ledger, history)];
      for (const item of items) {
        for (const et of itemEstonian(item)) {
          expect(uncovered(et, tonight, names), `${lesson.id}: ${et}`).toEqual([]);
        }
        if (item.kind !== "type" && item.kind !== "match" && item.kind !== "rework" && item.kind !== "fix") {
          expect(item.options).toContain(item.answer);
          expect(new Set(item.options.map((o) => o.toLowerCase())).size).toBe(item.options.length);
        }
        asked++;
      }
      // The review step goes over older lessons only.
      for (const item of reviewFor(lesson, ledger, history)) {
        for (const et of itemEstonian(item)) expect(uncovered(et, ledger, NAMES), `${lesson.id} review: ${et}`).toEqual([]);
      }
    });
    expect(asked).toBeGreaterThan(LESSONS.length * 5);
  });

  it("never print the answer in the question or in an option", () => {
    const before = ledgersBefore(LESSONS);
    let looked = 0;
    LESSONS.forEach((lesson, at) => {
      const ledger = before.get(lesson.id)!;
      const history = LESSONS.slice(0, at);
      for (const item of [...practiceFor(lesson, ledger, history), ...reviewFor(lesson, ledger, history)]) {
        // A gap and a reply put their answer among Estonian options on purpose; the English beside them is what may not give it away.
        const pairs: [string, readonly string[]][] = item.kind === "type" ? [[item.answer, [item.en]]]
          : item.kind === "match" ? item.pairs.map((p) => [p.et, [p.en]])
          : item.kind === "gap" ? [[item.answer, [item.en]]]
          : item.kind === "reply" ? [[item.answer, [item.ask.en]]]
          : item.kind === "rework" ? [[item.answer, [item.from.en]]]
          : item.kind === "fix" ? [[item.right, [item.en]]]
          : [[item.et, item.options]];
        for (const [et, shown] of pairs) {
          const answer = new Set(wordsOf(et).map((w) => w.low));
          for (const text of shown) {
            const quoted = estonianIn(text).flatMap((q) => wordsOf(q).map((w) => w.low));
            expect(quoted.filter((w) => answer.has(w)), `${lesson.id}: ${text}`).toEqual([]);
            looked++;
          }
        }
      }
    });
    expect(looked).toBeGreaterThan(LESSONS.length * 10);
  });

  it("vary the questions: most lessons ask in at least four shapes, and many put the pattern to work in a gap", () => {
    const before = ledgersBefore(LESSONS);
    let varied = 0;
    let gapped = 0;
    LESSONS.forEach((lesson, at) => {
      const kinds = new Set(practiceFor(lesson, before.get(lesson.id)!, LESSONS.slice(0, at)).map((i) => i.kind));
      if (kinds.size >= 4) varied++;
      if (kinds.has("gap")) gapped++;
    });
    expect(varied / LESSONS.length).toBeGreaterThan(0.6);
    expect(gapped / LESSONS.length).toBeGreaterThan(0.5);
  });

  it("offers in a gap only forms of the word the line holds, never two that mean the same", () => {
    const before = ledgersBefore(LESSONS);
    let gaps = 0;
    LESSONS.forEach((lesson, at) => {
      const ledger = teach(before.get(lesson.id)!, lesson.teaches, lessonRank(lesson), lesson.patterns);
      const families = familiesOf(ledger);
      for (const item of practiceFor(lesson, before.get(lesson.id)!, LESSONS.slice(0, at))) {
        if (item.kind !== "gap") continue;
        gaps++;
        const lemma = families.of.get(item.answer.toLocaleLowerCase("et"));
        expect(lemma, `${lesson.id}: ${item.answer}`).toBeDefined();
        for (const option of item.options) expect(families.of.get(option.toLocaleLowerCase("et")), `${lesson.id}: ${option}`).toBe(lemma);
        expect(item.options.some((o) => o.toLocaleLowerCase("et").endsWith("sse") && o !== item.answer), `${lesson.id}`).toBe(false);
        const line = lesson.conversation.find((l) => l.et?.includes(`${item.before}${item.answer}${item.after}`));
        expect(line, `${lesson.id}: ${item.before}_${item.after}`).toBeDefined();
      }
    });
    expect(gaps).toBeGreaterThan(LESSONS.length);
  });

  it("asks what was said back only among answers to other questions", () => {
    const before = ledgersBefore(LESSONS);
    let replies = 0;
    LESSONS.forEach((lesson, at) => {
      for (const item of practiceFor(lesson, before.get(lesson.id)!, LESSONS.slice(0, at))) {
        if (item.kind !== "reply") continue;
        replies++;
        expect(item.options.length).toBeGreaterThanOrEqual(3);
        const asked = new Set(wordsOf(item.ask.et).map((w) => w.low));
        for (const option of item.options) {
          if (option === item.answer) continue;
          expect(wordsOf(option).some((w) => asked.has(w.low)), `${lesson.id}: ${option} against ${item.ask.et}`).toBe(false);
        }
      }
    });
    expect(replies).toBeGreaterThan(LESSONS.length / 2);
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

  it("accept the whole phrase for a form said with on", () => {
    const before = ledgersBefore(LESSONS);
    let found = 0;
    for (const lesson of A1_LESSONS) {
      for (const item of practiceFor(lesson, before.get(lesson.id)!)) {
        if (item.kind !== "type" || !/^with \{on\}:/.test(item.en)) continue;
        found++;
        expect(markPhrase(item.answer, item.accept).verdict).toBe("right");
        expect(markPhrase(`${item.answer} on`, item.accept).verdict).toBe("right");
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it("accepts the shared spelling alone or with each pronoun, however it is joined", () => {
    const before = ledgersBefore(LESSONS);
    let found = 0;
    for (const lesson of A1_LESSONS) {
      for (const item of everyTypedQuestion(lesson, before.get(lesson.id)!)) {
        if (item.kind !== "type" || item.en !== "you were, they were") continue;
        found++;
        expect(item.note).toMatch(/one spelling for both/);
        for (const typed of ["olid", "sa olid, nad olid", "sa olid ja nad olid", "nad olid ja sina olid", "Sa olid ning nemad olid."]) {
          expect(markPhrase(typed, item.accept).verdict, typed).toBe("right");
        }
        expect(markPhrase("te olid, nad olid", item.accept).verdict).not.toBe("right");
        expect(item.accept.filter((a) => a.split(" ").length === 4).every((a) => /^(sa|sina) olid (nad|nemad) olid$|^(nad|nemad) olid (sa|sina) olid$/.test(a))).toBe(true);
        expect(markPhrase("sa olid, nad on", item.accept).verdict).toBe("nearly");
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it("puts the one-spelling note only on a prompt of two different persons", () => {
    const before = ledgersBefore(LESSONS);
    const noted = new Set<string>();
    for (const lesson of A1_LESSONS) {
      for (const item of practiceFor(lesson, before.get(lesson.id)!)) {
        if (item.kind === "type" && item.note?.startsWith("It's the one spelling")) noted.add(item.en);
      }
    }
    // Which prompts a lesson asks is a seeded selection; what may not happen is the note on anything but two persons.
    expect(noted.size).toBeGreaterThan(0);
    for (const en of noted) expect(en).toMatch(/^you \w+, they \w+$/);
  });

  it("takes either outside word for either outside prompt", () => {
    const before = ledgersBefore(LESSONS);
    const seen: string[][] = [];
    for (const lesson of A1_LESSONS) {
      for (const item of everyTypedQuestion(lesson, before.get(lesson.id)!)) {
        if (item.kind === "type" && item.en.startsWith("outside/")) seen.push([...item.accept]);
      }
    }
    // `õues` is taught after `väljas`, so only its own question can take both.
    const asked = seen.filter((accept) => accept.includes("õues"));
    expect(asked.length).toBeGreaterThan(0);
    for (const accept of asked) expect(accept).toContain("väljas");
  });

  it("says half right when the word is there with more beside it", () => {
    const m = markPhrase("sa olid, nad on", ["olid"]);
    expect(m.verdict).toBe("nearly");
    expect(m.note).toMatch(/^Half right/);
    expect(markPhrase("olid", ["olid"]).verdict).toBe("right");
    expect(markPhrase("nad on", ["olid"]).verdict).toBe("wrong");
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
