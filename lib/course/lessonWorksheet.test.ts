import { describe, expect, it } from "vitest";
import { PROGRAMMES } from "@/lib/course";
import { parseTheme } from "@/lib/games/workbook";
import { TOPIC_THEME, WORKSHEET_HREF, offersWorksheet, worksheetFor, worksheetLink, worksheetTheme } from "./lessonWorksheet";

const worksheetHref = (day: Parameters<typeof worksheetFor>[0]) => { const w = worksheetFor(day); return w ? worksheetLink(w) : null; };

/*
  B1 HAS THE WORKSHEET. When B1 became lessons its evenings stopped dealing
  one, and the operator asked for it back: every finished lesson from B1 on
  offers a page, and none below it does, since A1 and A2 practice inside the
  lesson itself. `npm run measure:workbook` is where the page is shown to fill.
*/
const LESSON_DAYS = PROGRAMMES.flatMap((p) => p.days.filter((d) => d.lesson));

describe("the worksheet a finished lesson offers", () => {
  it("is offered after every B1 lesson and after no A1 or A2 lesson", () => {
    const b1 = LESSON_DAYS.filter((d) => d.level === "B1");
    expect(b1.length).toBeGreaterThan(40);
    expect(LESSON_DAYS.length).toBeGreaterThan(b1.length);
    for (const day of LESSON_DAYS) {
      const href = worksheetHref(day);
      if (day.level === "A1" || day.level === "A2") expect(href, day.id).toBeNull();
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

  it("starts at B1", () => {
    expect(offersWorksheet("A2")).toBe(false);
    expect(offersWorksheet("B1")).toBe(true);
    expect(offersWorksheet("C1")).toBe(true);
  });
});
