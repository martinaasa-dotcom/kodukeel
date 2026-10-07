import { describe, expect, it } from "vitest";
import { SCENES } from "@/lib/collections/scenes";
import { orderContextFrom } from "@/lib/estonian/wordOrder";
import { sayEnglish, sayIn, type Said } from "@/lib/copy/said";
import { tr, type Locale } from "@/lib/copy/locale";
import { shippedPool } from "../../scripts/lib/examPool";
import {
  AGREE, ARGUMENTS, CARD_HOURS, CARD_PEOPLE, CARD_CITIES, DATASETS, DEBATES, DESCRIPTIONS, DISCUSSIONS,
  IDEA_CARDS, LETTERS, NOTES, OPINIONS, PHONE, PICTURE_QUESTIONS, PRESENTATIONS, TALKS, TOPICS,
} from "./briefs";
import {
  BRIEF_CONTEXT, GENRE_LABEL, buildPaper, cardFor, speakPrompt, writtenSaid,
  type SpeakCard, type SpokenBrief, type WrittenBrief,
} from "./paper";
import { markPaper } from "./score";
import { specFor, type ExamLevel } from "./spec";

/*
  EVERY BRIEF THE TABLES CAN PRODUCE, SAID IN RUSSIAN AND IN UKRAINIAN.

  A brief is English assembled out of `./briefs`; the paper keeps each one as
  a template and its fragments (`promptSaid`, `coverSaid`) so the exam screens
  can say it in the learner's language through
  `lib/copy/i18n/areas/exam.ts`. This walks every combination the tables
  allow, every genre and every speaking shape at every level the specification
  sets it, and holds the template and each fragment to a translation. So a
  scenario, a topic or a phone call added to the tables later in English fails
  here until somebody has translated it, rather than turning up in English on
  a Russian or Ukrainian screen.
*/

const LEVELS: readonly ExamLevel[] = ["A1", "A2", "B1", "B2", "C1"];
const LOCALES: readonly Exclude<Locale, "en">[] = ["ru", "uk"];
const B = BRIEF_CONTEXT.brief;

/** A line with nothing to translate: placeholders, digits and punctuation. */
function neutral(english: string): boolean {
  return !/[A-Za-z]/.test(english.replace(/\{\w+\}/g, ""));
}

function lineIn(locale: Exclude<Locale, "en">, english: string, context?: string): string | null {
  if (neutral(english)) return english;
  const out = tr(locale, english, context);
  return out === english ? null : out;
}

/** The values a said carries as they are, nested lists included. */
function rawValues(said: Said): string[] {
  return [
    ...Object.values(said.values ?? {}).map(String),
    ...Object.values(said.lists ?? {}).flatMap((list) => list.flatMap(rawValues)),
  ];
}

/** Every untranslated piece of a said, named, and the said itself filled. */
function gaps(locale: Exclude<Locale, "en">, said: Said): string[] {
  const missing: string[] = [];
  if (lineIn(locale, said.en, said.context) === null) missing.push(`template "${said.en}"${said.context ? `@${said.context}` : ""}`);
  for (const [slot, word] of Object.entries(said.words ?? {})) {
    const context = said.contexts?.[slot];
    if (lineIn(locale, word, context) === null) missing.push(`fragment "${word}"${context ? `@${context}` : ""}`);
  }
  for (const list of Object.values(said.lists ?? {})) for (const inner of list) missing.push(...gaps(locale, inner));
  if (missing.length === 0) {
    // Filled, the line holds no English but the values a template carries as they are (a name).
    const raw = rawValues(said);
    let filled = sayIn(locale, said);
    for (const value of raw) filled = filled.split(value).join("");
    if (/[A-Za-z]/.test(filled) || /\{\w+\}/.test(filled)) missing.push(`filled "${sayIn(locale, said)}"`);
  }
  return missing;
}

/** Every written brief the tables can make. */
function everyWrittenBrief(): { brief: WrittenBrief; asNote: boolean }[] {
  const out: { brief: WrittenBrief; asNote: boolean }[] = [];
  for (const person of CARD_PEOPLE) for (const fallback of NOTES) {
    const card: WrittenBrief = { genre: "card", topic: "work", person, city: CARD_CITIES[0]!, hours: CARD_HOURS[0]!, fallback };
    out.push({ brief: card, asNote: false }, { brief: card, asNote: true });
  }
  for (const note of NOTES) out.push({ brief: { genre: "note", topic: note.topic, note }, asNote: false });
  for (const description of DESCRIPTIONS) out.push({ brief: { genre: "description", topic: description.topic, description }, asNote: false });
  for (const topic of TOPICS) {
    out.push({ brief: { genre: "story", topic: topic.key }, asNote: false });
    out.push({ brief: { genre: "personal-letter", topic: topic.key }, asNote: false });
  }
  for (const letter of LETTERS) {
    out.push({ brief: { genre: "letter-semiformal", topic: letter.topic, letter }, asNote: false });
    out.push({ brief: { genre: "letter-informal", topic: letter.topic, letter }, asNote: false });
  }
  for (const dataset of DATASETS) {
    out.push({ brief: { genre: "data-comment", topic: dataset.topic, dataset }, asNote: false });
    out.push({ brief: { genre: "data-summary", topic: dataset.topic, dataset }, asNote: false });
  }
  for (const argument of ARGUMENTS) out.push({ brief: { genre: "argument", topic: argument.topic, argument }, asNote: false });
  for (const opinion of OPINIONS) out.push({ brief: { genre: "opinion", topic: opinion.topic, opinion }, asNote: false });
  return out;
}

/** Every spoken brief the tables can make, by shape. */
function everySpokenBrief(): SpokenBrief[] {
  return [
    ...SCENES.map((scene): SpokenBrief => ({ shape: "picture", scene })),
    ...IDEA_CARDS.map((card): SpokenBrief => ({ shape: "idea-card", topic: card.topic, card })),
    ...AGREE.map((brief): SpokenBrief => ({ shape: "agree", topic: brief.topic, brief })),
    ...PHONE.map((brief): SpokenBrief => ({ shape: "phone", topic: brief.topic, brief })),
    ...TALKS.map((brief, i): SpokenBrief => ({ shape: "talk", topic: brief.topic, brief, swap: TALKS[(i + 1) % TALKS.length]! })),
    ...DEBATES.map((brief): SpokenBrief => ({ shape: "debate", topic: brief.topic, brief })),
    ...PRESENTATIONS.map((brief): SpokenBrief => ({ shape: "presentation", topic: brief.topic, brief })),
    ...DISCUSSIONS.map((brief): SpokenBrief => ({ shape: "discussion", topic: brief.topic, brief })),
  ];
}

/** Every line a speaking card prints, with the context the exam screen looks it up under. */
function cardLines(card: SpeakCard): [string, string][] {
  const b = (lines: readonly string[]) => lines.map((l): [string, string] => [l, B]);
  switch (card.shape) {
    case "picture": return b([card.situation, ...card.questions]);
    case "idea-card": return b([card.about, ...card.ask]);
    case "agree": return b([...card.questions, card.situation, ...card.alternatives]);
    case "phone": return [[card.call, BRIEF_CONTEXT.ring], ...b([...card.find, card.answerAs, ...card.facts])];
    case "talk": return b([card.task, card.followUp, ...(card.swap ? [card.swap.task, card.swap.followUp] : [])]);
    case "debate": return b([...card.questions, card.situation, ...card.sides.flatMap((s) => [s.label, ...s.points])]);
    case "presentation": return b([...card.topics, ...card.followUps]);
    case "discussion": return b([card.question, ...card.thoughts]);
  }
}

describe("the mock exam's briefs in Russian and Ukrainian", () => {
  const written = everyWrittenBrief();
  const spoken = everySpokenBrief();
  // Every timing the specification sets a speaking task at, for each shape.
  const timings = LEVELS.flatMap((level) => specFor(level).parts.flatMap((p) => p.tasks))
    .filter((t) => t.kind === "speak")
    .map((t) => ({ shape: t.shape, seconds: t.seconds ?? 60, prep: t.prepSeconds ?? 0 }));

  it("walks something on every table", () => {
    expect(written.length).toBeGreaterThan(150);
    expect(spoken.length).toBeGreaterThan(100);
    expect(timings.length).toBeGreaterThanOrEqual(LEVELS.length * 2);
  });

  for (const locale of LOCALES) {
    it(`${locale}: says every written brief, its task and every point to cover`, () => {
      const missing = new Set<string>();
      let walked = 0;
      for (const { brief, asNote } of written) {
        const { promptSaid, coverSaid } = writtenSaid(brief, asNote);
        for (const said of [promptSaid, ...coverSaid]) {
          walked += 1;
          for (const gap of gaps(locale, said)) missing.add(gap);
        }
      }
      expect(walked).toBeGreaterThan(500);
      expect([...missing]).toEqual([]);
    });

    it(`${locale}: says every spoken brief at every timing the specification sets`, () => {
      const missing = new Set<string>();
      let walked = 0;
      for (const brief of spoken) {
        const card = cardFor(brief);
        const times = timings.filter((t) => t.shape === card.shape);
        // A shape no level sets is still said, at a minute, so nothing in a table goes unread.
        for (const { seconds, prep } of times.length > 0 ? times : [{ seconds: 60, prep: 0 }]) {
          walked += 1;
          for (const gap of gaps(locale, speakPrompt(card, seconds, prep))) missing.add(gap);
        }
        for (const [line, context] of cardLines(card)) {
          if (lineIn(locale, line, context) === null) missing.add(`card "${line}"@${context}`);
        }
      }
      expect(walked).toBeGreaterThan(100);
      expect([...missing]).toEqual([]);
    });

    it(`${locale}: says every label, opening time and figure table`, () => {
      const lines: [string, string][] = [
        ...Object.values(GENRE_LABEL).map((l): [string, string] => [l, B]),
        ...CARD_HOURS.map((h): [string, string] => [h, B]),
        ...DATASETS.flatMap((d) => [d.title, d.unit, ...d.columns, ...d.rows.map((r) => r.label)].map((l): [string, string] => [l, B])),
        ...PICTURE_QUESTIONS.map((q): [string, string] => [q, B]),
      ];
      expect(lines.filter(([l, c]) => lineIn(locale, l, c) === null)).toEqual([]);
    });
  }

  it("keeps the English a brief prints the English of its template, byte for byte", () => {
    for (const { brief, asNote } of written) {
      const { promptSaid } = writtenSaid(brief, asNote);
      expect(sayEnglish(promptSaid)).not.toMatch(/\{\w+\}/);
    }
    for (const level of LEVELS) {
      const paper = buildPaper(level, shippedPool(level, "i18n"), "i18n", orderContextFrom([]));
      const items = paper.parts.flatMap((p) => p.tasks).flatMap((t) => t.items);
      let briefs = 0;
      for (const item of items) {
        if (item.kind === "message" || item.kind === "compose") {
          for (const v of item.variants) {
            briefs += 1;
            expect(sayEnglish(v.promptSaid)).toBe(v.prompt);
            expect(v.coverSaid.map(sayEnglish)).toEqual(v.cover);
            for (const locale of LOCALES) expect(gaps(locale, v.promptSaid)).toEqual([]);
          }
        }
        if (item.kind === "speak") {
          briefs += 1;
          expect(sayEnglish(item.promptSaid)).toBe(item.prompt);
        }
      }
      expect(briefs, level).toBeGreaterThan(0);

      // And the result page's prompt, off the marks, says the same brief.
      const marks = markPaper(paper, new Map()).parts.flatMap((p) => p.tasks).flatMap((t) => t.marks);
      const told = marks.filter((m) => m.promptLanguage === "en");
      expect(told.length, level).toBeGreaterThan(0);
      for (const mark of told) {
        expect(mark.promptSaid, mark.itemId).toBeDefined();
        expect(sayEnglish(mark.promptSaid!)).toBe(mark.prompt);
        for (const locale of LOCALES) expect(gaps(locale, mark.promptSaid!), mark.itemId).toEqual([]);
      }
    }
  });

  it("is a check that can fail", () => {
    expect(gaps("ru", { en: "Write {scenario}.", words: { scenario: "a scenario nobody translated" }, contexts: { scenario: B } }))
      .toEqual(['fragment "a scenario nobody translated"@brief']);
    expect(gaps("uk", { en: "A template nobody translated" })).toEqual(['template "A template nobody translated"']);
  });
});
