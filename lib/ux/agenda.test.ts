import { describe, expect, it } from "vitest";
import { dayClock } from "@/lib/time/day";
import { DUE_DATE_FORMAT, agenda, bucketFor, dueDayKey, overdueCount } from "./agenda";

// Tallinn, because the whole point of taking a clock is that the answer is the
// learner's and not the process's. In August that is UTC+3.
const clock = dayClock("Europe/Tallinn");
/** Tuesday 1 September 2026, 09:00 in Tallinn. */
const now = new Date("2026-09-01T06:00:00Z");
const at = (iso: string) => new Date(iso);
const byDue = (row: { dueAt: Date | null }) => row.dueAt;

describe("bucketFor", () => {
  it("reads today against the learner's midnight, not the server's", () => {
    /*
      22:00 UTC on the first is already the second in Tallinn, so a task due on
      the second is due today for the person reading it and tomorrow for a
      server running in UTC. That difference is why this function takes a clock.
    */
    const late = new Date("2026-09-01T22:00:00Z");
    expect(bucketFor(at("2026-09-02T00:00:00Z"), clock, late)).toBe("today");
    expect(bucketFor(at("2026-09-02T00:00:00Z"), dayClock("UTC"), late)).toBe("tomorrow");
  });

  it("reads a due date as the day it names, west of Greenwich too", () => {
    /*
      Stored at midnight UTC, which in Los Angeles is five in the afternoon of
      the day before. Read as an instant, homework due on the first was "Late"
      all of the first and printed as due on the thirty-first.
    */
    const la = dayClock("America/Los_Angeles");
    const morning = new Date("2026-09-01T16:00:00Z"); // 09:00 on the first
    expect(bucketFor(at("2026-09-01T00:00:00Z"), la, morning)).toBe("today");
    expect(bucketFor(at("2026-09-02T00:00:00Z"), la, morning)).toBe("tomorrow");
    expect(bucketFor(at("2026-08-31T00:00:00Z"), la, morning)).toBe("overdue");
    expect(dueDayKey(at("2026-09-01T00:00:00Z"))).toBe("2026-09-01");
    expect(new Intl.DateTimeFormat("en-GB", DUE_DATE_FORMAT).format(at("2026-09-01T00:00:00Z"))).toBe("1 Sept");
  });

  it("sorts the near future into headings somebody would use", () => {
    expect(bucketFor(at("2026-08-30T09:00:00Z"), clock, now)).toBe("overdue");
    expect(bucketFor(at("2026-09-01T15:00:00Z"), clock, now)).toBe("today");
    expect(bucketFor(at("2026-09-02T09:00:00Z"), clock, now)).toBe("tomorrow");
    expect(bucketFor(at("2026-09-06T09:00:00Z"), clock, now)).toBe("week");
    expect(bucketFor(at("2026-09-08T09:00:00Z"), clock, now)).toBe("week");
    expect(bucketFor(at("2026-09-20T09:00:00Z"), clock, now)).toBe("later");
    expect(bucketFor(null, clock, now)).toBe("undated");
  });

  it("does not call a task late for having a time earlier than now", () => {
    /*
      A due date is typed into `<input type="date">`, so it is stored at
      midnight UTC of that day. Comparing it against the clock rather than
      against the day would mark everything due today as overdue before
      breakfast, which is what `TaskRow` used to do: a task due on the first
      read "Overdue" from three in the morning in Tallinn onwards.
    */
    expect(bucketFor(at("2026-09-01T00:00:00Z"), clock, now)).toBe("today");
    expect(bucketFor(at("2026-09-01T00:00:00Z"), clock, new Date("2026-09-01T20:59:00Z"))).toBe("today");
  });
});

describe("agenda", () => {
  const rows = [
    { id: "later", dueAt: at("2026-09-20T09:00:00Z") },
    { id: "late-1", dueAt: at("2026-08-25T09:00:00Z") },
    { id: "none", dueAt: null },
    { id: "today", dueAt: at("2026-09-01T15:00:00Z") },
    { id: "late-2", dueAt: at("2026-08-30T09:00:00Z") },
  ];

  it("puts the late work first and the undated work last", () => {
    expect(agenda(rows, byDue, clock, now).map((g) => g.bucket)).toEqual(["overdue", "today", "later", "undated"]);
  });

  it("orders inside a heading by date, oldest first", () => {
    const overdue = agenda(rows, byDue, clock, now)[0];
    expect(overdue?.items.map((i) => i.id)).toEqual(["late-1", "late-2"]);
  });

  it("leaves out a heading with nothing under it", () => {
    expect(agenda(rows, byDue, clock, now).map((g) => g.bucket)).not.toContain("tomorrow");
  });

  it("spends a limit on the most urgent rows rather than one per heading", () => {
    const groups = agenda(rows, byDue, clock, now, 2);
    expect(groups.map((g) => g.bucket)).toEqual(["overdue"]);
    expect(groups[0]?.items).toHaveLength(2);
  });

  it("says nothing when there is nothing", () => {
    expect(agenda([], byDue, clock, now)).toEqual([]);
  });
});

describe("overdueCount", () => {
  it("counts only what is actually late", () => {
    const rows = [
      { dueAt: at("2026-08-25T09:00:00Z") },
      { dueAt: at("2026-09-01T15:00:00Z") },
      { dueAt: null },
    ];
    expect(overdueCount(rows, byDue, clock, now)).toBe(1);
  });
});
