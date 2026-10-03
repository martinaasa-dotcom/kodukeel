import { describe, expect, it } from "vitest";
import {
  AGREE, ARGUMENTS, CARD_JOBS, DATASETS, DEBATES, DESCRIPTIONS, DISCUSSIONS, IDEA_CARDS, LETTERS,
  NOTES, OPINIONS, PHONE, PICTURE_QUESTIONS, PRESENTATIONS, TALKS, TOPICS, topicFits, unfitForExam,
} from "./briefs";
import { unitById } from "@/lib/collections/syllabus";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import type { ExamLevel } from "./spec";

const LEVELS: readonly ExamLevel[] = ["A1", "A2", "B1", "B2", "C1"];

describe("the briefs a paper is set from", () => {
  it("names course units that exist", () => {
    let named = 0;
    for (const topic of TOPICS) {
      for (const unit of topic.units) {
        named++;
        expect(unitById(unit), `${topic.key} names ${unit}`).toBeDefined();
      }
    }
    expect(named).toBeGreaterThan(TOPICS.length);
  });

  it("sets every topic at one level at least", () => {
    for (const topic of TOPICS) {
      expect(LEVELS.some((level) => topicFits(topic, level)), topic.key).toBe(true);
    }
  });

  it("names a job and a workplace the shipped dictionary holds as nouns a paper may show", () => {
    // A request rather than a form, so it is asked of the dictionary: a pair it
    // does not hold is a card the paper can never set, silently.
    const nouns = new Map(dictionaryRows().filter((r) => r.pos === "NOUN").map((r) => [r.lemma, r]));
    for (const { job, place } of CARD_JOBS) {
      for (const lemma of [job, place]) {
        const row = nouns.get(lemma);
        expect(row, `${lemma} is in the shipped dictionary`).toBeDefined();
        expect(unfitForExam(row!.translation), lemma).toBe(false);
      }
    }
    expect(CARD_JOBS.length).toBeGreaterThanOrEqual(6);
  });

  it("writes no Estonian outside the one table that names lemmas", () => {
    // Every prompt is English, so a letter only Estonian has is the app writing
    // Estonian where a learner will copy it. CARD_JOBS names lemmas, the way a
    // unit does, and is checked against the dictionary above.
    const english = JSON.stringify({
      TOPICS, NOTES, DESCRIPTIONS, LETTERS, DATASETS, ARGUMENTS, OPINIONS, PICTURE_QUESTIONS,
      IDEA_CARDS, AGREE, PHONE, TALKS, DEBATES, PRESENTATIONS, DISCUSSIONS,
    }).replace(/"units":\[[^\]]*\]/g, "");
    expect(english.length).toBeGreaterThan(5000);
    expect(english).not.toMatch(/[õäöüšž]/i);
  });

  it("refuses a word by its sense, never by a substring", () => {
    expect(unfitForExam("puke, vomit")).toBe(true);
    expect(unfitForExam("a homosexual male")).toBe(false);
    expect(unfitForExam("darkness")).toBe(false);
    expect(unfitForExam("scumbag, rat")).toBe(true);
  });

  it("gives every brief a topic the paper can set", () => {
    const keys = new Set(TOPICS.map((t) => t.key));
    const briefs = [
      ...NOTES, ...DESCRIPTIONS, ...LETTERS, ...DATASETS, ...ARGUMENTS, ...OPINIONS, ...IDEA_CARDS,
      ...AGREE, ...PHONE, ...TALKS, ...DEBATES, ...PRESENTATIONS, ...DISCUSSIONS,
    ];
    expect(briefs.length).toBeGreaterThan(80);
    for (const brief of briefs) expect(keys.has(brief.topic), brief.topic).toBe(true);
  });
});
