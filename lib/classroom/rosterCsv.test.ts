import { describe, expect, it } from "vitest";
import { tr, type Locale } from "@/lib/copy/locale";
import { cell, rosterCsv, rosterFilename } from "./rosterCsv";
import type { ClassSummary, RosterEntry } from "./roster";
import type { CohortSummary } from "./cohort";

function entry(over: Partial<RosterEntry>): RosterEntry {
  return {
    ownerId: "o1",
    displayName: "Kadri",
    role: "STUDENT",
    joinedAt: new Date("2026-09-01T10:00:00Z"),
    reviewsThisWeek: 40,
    spokenThisWeek: 0,
    streak: 3,
    wordsKnown: 120,
    daysSinceLastReview: 1,
    weakestCase: null,
    ...over,
  };
}

function classSummary(entries: RosterEntry[]): ClassSummary {
  return {
    entries,
    weakestCases: [{ grammCase: "PARTITIVE", accuracy: 54, total: 120 }],
  } as unknown as ClassSummary;
}

const workplace: CohortSummary = {
  level: "B1",
  members: [
    { ownerId: "w1", displayName: "Mari", band: "likely", evidence: "good", practicedRecently: true },
    { ownerId: "w2", displayName: "Jaan", band: "close", evidence: "fair", practicedRecently: false },
  ],
  counts: { likely: 1, close: 1, far: 0, unknown: 0 },
  active: 1,
  evidence: "fair",
};

const say = (locale: Locale) => (english: string) => tr(locale, english);

function rowsOf(text: string): string[] {
  return text.replace(/^\uFEFF/, "").split("\r\n").filter((l) => l && !l.startsWith("#"));
}

describe("the roster file", () => {
  it("opens with a byte order mark and ends every line with CRLF", () => {
    const text = rosterCsv({ kind: "CLASS", className: "A2", date: "2026-10-14", say: say("en"), summary: classSummary([entry({})]) });
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text.endsWith("\r\n")).toBe(true);
    expect(text.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("writes its headers in the teacher's language", () => {
    for (const locale of ["en", "ru", "uk"] as const) {
      const text = rosterCsv({ kind: "CLASS", className: "A2", date: "2026-10-14", say: say(locale), summary: classSummary([entry({})]) });
      const header = rowsOf(text)[0]!;
      expect(header.split(",")).toHaveLength(11);
      expect(header).toContain(tr(locale, "Weakest case"));
      if (locale !== "en") expect(header).not.toContain("Weakest case");
    }
  });

  it("names a case in Estonian and leaves three empty cells where there is none", () => {
    const text = rosterCsv({
      kind: "CLASS", className: "A2", date: "2026-10-14", say: say("en"),
      summary: classSummary([
        entry({ weakestCase: { grammCase: "PARTITIVE", accuracy: 61, total: 18 } }),
        entry({ ownerId: "o2", displayName: "Peeter", weakestCase: null, daysSinceLastReview: null }),
      ]),
    });
    const [, first, second] = rowsOf(text);
    expect(first).toBe("Kadri,student,2026-09-01,40,0,3,120,1,osastav,61,18");
    expect(second).toBe("Peeter,student,2026-09-01,40,0,3,120,,,,");
    expect(text).toContain("# What the class is weakest at: osastav 54%");
  });

  it("defuses a name that would run as a formula and quotes one that would break the row", () => {
    const names = ['=HYPERLINK("x")', "+1", "@a", "-1+1", 'a, "b"\nc'];
    const text = rosterCsv({
      kind: "CLASS", className: "A2", date: "2026-10-14", say: say("en"),
      summary: classSummary(names.map((displayName, i) => entry({ ownerId: `o${i}`, displayName }))),
    });
    const rows = rowsOf(text.replace('"\nc', "XX")).slice(1);
    expect(rows).toHaveLength(names.length);
    expect(cell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(cell("+1")).toBe("'+1");
    expect(cell("@a")).toBe("'@a");
    expect(cell("-1+1")).toBe("'-1+1");
    expect(cell('a, "b"\nc')).toBe('"a, ""b""\nc"');
    for (const name of names) expect(text).toContain(cell(name));
  });

  it("gives a workplace group no column and no cell a case could go in", () => {
    const text = rosterCsv({ kind: "WORKPLACE", className: "Work", date: "2026-10-14", say: say("en"), summary: workplace });
    const [header, mari, jaan] = rowsOf(text);
    expect(header).toBe("Name,Practiced in the last 7 days,Band");
    expect(mari).toBe("Mari,yes,On track");
    expect(jaan).toBe("Jaan,no,Close to passing");
    expect(text).not.toMatch(/case/i);
    expect(text).toContain("# The bands are about the exam at B1");
    expect(text).toContain("# What the bands rest on: a rough estimate");
  });

  it("carries whether a colleague practiced, never how much or how long ago", () => {
    const text = rosterCsv({ kind: "WORKPLACE", className: "Work", date: "2026-10-14", say: say("en"), summary: workplace });
    expect(text).not.toMatch(/Reviews this week|Days since/);
    for (const row of rowsOf(text).slice(1)) expect(row).not.toMatch(/,\d+,/);
  });

  it("lists only who was in an archived group", () => {
    const klass = { ...classSummary([entry({}), entry({ ownerId: "t", displayName: "Õpetaja", role: "TEACHER" })]), archived: true } as ClassSummary;
    const text = rosterCsv({ kind: "CLASS", className: "A2", date: "2026-10-14", say: say("en"), summary: klass });
    expect(rowsOf(text)).toEqual(["Name,Role,Joined", "Kadri,student,2026-09-01", "Õpetaja,teacher,2026-09-01"]);
    expect(text).toContain("archived");
    expect(text).not.toContain("osastav");

    const group = rosterCsv({ kind: "WORKPLACE", className: "Work", date: "2026-10-14", say: say("en"), summary: { ...workplace, archived: true } });
    expect(rowsOf(group)).toEqual(["Name", "Mari", "Jaan"]);
  });
});

describe("rosterFilename", () => {
  it("keeps plain letters and digits and dates the file", () => {
    expect(rosterFilename("Eesti keel A2, teisipäev", "2026-10-14")).toBe("kodukeel-eestikeela2teisipaev-roster-2026-10-14.csv");
    expect(rosterFilename("Группа", "2026-10-14")).toBe("kodukeel-class-roster-2026-10-14.csv");
  });
});
