import { describe, expect, it } from "vitest";
import { PROGRAMMES } from "@/lib/course";
import { parseTheme } from "@/lib/games/workbook";
import { TOPIC_THEME, WORKSHEET_HREF, offersWorksheet, worksheetFor, worksheetLink, worksheetTheme } from "./lessonWorksheet";

const worksheetHref = (day: Parameters<typeof worksheetFor>[0]) => { const w = worksheetFor(day); return w ? worksheetLink(w) : null; };

/*
  A2 ON HAS THE WORKSHEET. When B1 became lessons its evenings stopped dealing
  one, and the operator asked for it back, then for A2 to have what B1 has:
  every finished lesson from A2 on offers a page, and no A1 lesson does, since
  A1 asks for no case and no gap. `npm run measure:workbook` is where the page
  is shown to fill.
*/
const LESSON_DAYS = PROGRAMMES.flatMap((p) => p.days.filter((d) => d.lesson));

describe("the worksheet a finished lesson offers", () => {
  it("is offered after every lesson from A2 on and after no A1 lesson", () => {
    const a2 = LESSON_DAYS.filter((d) => d.level === "A2");
    const a1 = LESSON_DAYS.filter((d) => d.level === "A1");
    expect(a2.length).toBeGreaterThan(50);
    expect(a1.length).toBeGreaterThan(40);
    for (const day of LESSON_DAYS) {
      const href = worksheetHref(day);
      if (day.level === "A1") expect(href, day.id).toBeNull();
      else expect(href?.startsWith(WORKSHEET_HREF), day.id).toBe(true);
    }
  });

  it("opens on themes the worksheet knows", () => {
    for (const theme of Object.values(TOPIC_THEME)) expect(parseTheme(theme), theme).toBe(theme);
    expect(LESSON_DAYS.length).toBeGreaterThan(0);
    let themed = 0;
    for (const day of LESSON_DAYS) {
      const theme = worksheetTheme(day);
      if (!theme) continue;
      themed += 1;
      expect(parseTheme(theme), day.id).toBe(theme);
      expect(worksheetHref({ ...day, level: "B1" })).toBe(`${WORKSHEET_HREF}?theme=${encodeURIComponent(theme)}`);
    }
    expect(themed).toBeGreaterThan(0);
  });

  it("leads the object rule's lesson with the osastav", () => {
    const done = LESSON_DAYS.find((d) => d.lesson === "b1-01-done");
    expect(done && worksheetTheme(done)).toBe("case:PARTITIVE");
  });

  it("lets the page choose where the lesson explains no one rule", () => {
    expect(worksheetTheme({ cases: [], topics: ["relative-clause"] })).toBeNull();
    expect(worksheetHref({ level: "B2", cases: undefined, topics: undefined })).toBe(WORKSHEET_HREF);
  });

  it("starts at A2", () => {
    expect(offersWorksheet("A1")).toBe(false);
    expect(offersWorksheet("A2")).toBe(true);
    expect(offersWorksheet("B1")).toBe(true);
    expect(offersWorksheet("C1")).toBe(true);
  });
});

describe("a page of one lesson's own", () => {
  it("links to the lesson's page, with its theme where it has one", async () => {
    const { worksheetLink } = await import("./lessonWorksheet");
    expect(worksheetLink({ theme: "case:PARTITIVE", lesson: "b1-01-done" })).toBe("/review/workbook?lesson=b1-01-done&theme=case%3APARTITIVE");
    expect(worksheetLink({ theme: null, lesson: "b1-01-done" })).toBe("/review/workbook?lesson=b1-01-done");
    expect(worksheetLink({ theme: null })).toBe("/review/workbook");
  });

  it("asks the lesson's own words and reads its own sentences, each with its English", async () => {
    const { lessonSentences, lessonWorksheetLemmas } = await import("./lessonWorksheet");
    const { lessonById } = await import("./lessons");
    const lesson = lessonById("b1-01-done")!;
    expect(lessonWorksheetLemmas(lesson)).toEqual(expect.arrayContaining(["raamat", "auto", "parandama", "koristama", "köök", "läbi"]));
    const sentences = lessonSentences(lesson);
    expect(sentences.map((s) => s.et)).toEqual(expect.arrayContaining(["Aga ma lugesin raamatu läbi!", "Ma ei koristanud kööki."]));
    for (const s of sentences) expect(s.en.length).toBeGreaterThan(0);
    expect(new Set(sentences.map((s) => s.et)).size).toBe(sentences.length);
  });
});
