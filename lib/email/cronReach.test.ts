/*
  EVERY LETTER HAS TO BE ONE THE SCHEDULE CAN ACTUALLY SEND.

  `letterOwed` decides on the learner's own hour, and each kind has a window:
  the word and the milestone in the morning, the deadline at midday, the
  evening nudge from the hour they picked. The decision is unit tested at the
  hour each test chose. What nothing asked is whether the deployment ever runs
  at that hour, and for a long while it did not: `vercel.json` fired once a day
  at 16:00 UTC, which is 19:00 in Tallinn in summer and 18:00 in winter, so the
  word of the day, the Monday register, the milestone, the shield, the
  deadline, the Sunday summary and the errand were decided correctly, rendered
  correctly, tested thoroughly, and never sent to anybody. So was the evening
  reminder at 20:30, which Settings offered.

  So this reads the schedule the deployment has, off `vercel.json`, and drives
  a learner in Tallinn who qualifies for each kind through a week in January
  and a week in July, asking whether any run lands in a window. Tallinn is where
  nearly every learner is, and both halves of the year matter because the
  offset moves by an hour. A Hobby job fires anywhere inside its hour, and a
  whole-hour offset keeps the local hour the same for the whole of it.
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { EMAIL_KINDS, type EmailKind } from "./letter";
import { emailPrefsFrom, switchOn } from "./prefs";
import { letterOwed, REMINDER_CHOICES, type Candidate } from "./schedule";

const ZONE = "Europe/Tallinn";

/** Every hour of the UTC day at which the mail run is scheduled. */
function fireHours(): number[] {
  const config = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as {
    crons?: { path: string; schedule: string }[];
  };
  const hours = new Set<number>();
  for (const cron of config.crons ?? []) {
    if (cron.path !== "/api/email/send") continue;
    const [minute, hour, dom, month, dow] = cron.schedule.trim().split(/\s+/);
    // Only the shape a Hobby plan accepts is read: one fixed time a day.
    expect(minute, cron.schedule).toMatch(/^\d+$/);
    expect(hour, cron.schedule).toMatch(/^\d+$/);
    expect([dom, month, dow], cron.schedule).toEqual(["*", "*", "*"]);
    hours.add(Number(hour));
  }
  return [...hours];
}

function local(at: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE, hour: "numeric", hourCycle: "h23", weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    hour: Number(get("hour")),
    weekday: weekdays.indexOf(get("weekday")),
    dayKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

const daysBefore = (now: Date, n: number) => new Date(now.getTime() - n * 86_400_000);

/** A learner at `now` who qualifies for `kind` whatever the hour. */
function qualifying(kind: EmailKind, now: Date, reminderHour = 18): Candidate {
  const here = local(now);
  const base: Candidate = {
    ownerId: "owner-1",
    email: "mari@example.ee",
    undeliverable: false,
    prefs: emailPrefsFrom(null),
    dayKey: here.dayKey,
    localHour: here.hour,
    reminderHour,
    localWeekday: here.weekday,
    lastSent: new Map(),
    sentThisWeek: 0,
    lastReviewAt: daysBefore(now, 1),
    onboardedAt: daysBefore(now, 60),
    hasProgramme: false,
    finishedToday: true,
    stage: "starting",
    conversations: 10,
    hasErrand: false,
    milestoneReached: null,
    shieldSpent: null,
    runsGroup: false,
    deadlineWeeks: null,
  };
  switch (kind) {
    case "welcome": return { ...base, onboardedAt: new Date(now.getTime() - 2 * 3_600_000) };
    case "tonight": return { ...base, hasProgramme: true, finishedToday: false };
    case "comeback": return { ...base, lastReviewAt: daysBefore(now, 30) };
    case "classroom": return { ...base, runsGroup: true };
    case "milestone": return { ...base, milestoneReached: "A1" };
    case "shield": return { ...base, shieldSpent: "2026-01-01" };
    case "deadline": return { ...base, deadlineWeeks: 8 };
    case "weekly": return base;
    case "errand": return { ...base, stage: "settled", hasErrand: true, conversations: 0 };
    case "wordday": return { ...base, prefs: switchOn(base.prefs, "wordday") };
    default: return base;
  }
}

/** Every run in a fortnight of the given month, at the scheduled hours. */
function runs(month: string): Date[] {
  const out: Date[] = [];
  for (let day = 1; day <= 14; day += 1) {
    for (const hour of fireHours()) {
      out.push(new Date(`2026-${month}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:30:00Z`));
    }
  }
  return out;
}

const SEASONS = { winter: "01", summer: "07" } as const;
const SENT_BY_SCHEDULE = EMAIL_KINDS.filter((k) => k !== "system");

describe("the mail run reaches every letter", () => {
  it("is scheduled at all", () => {
    expect(fireHours().length).toBeGreaterThan(0);
  });

  for (const [season, month] of Object.entries(SEASONS)) {
    for (const kind of SENT_BY_SCHEDULE) {
      it(`can send ${kind} in Tallinn in ${season}`, () => {
        const reached = runs(month).some((now) => letterOwed(qualifying(kind, now), now)?.kind === kind);
        expect(reached, `no scheduled run lands in the ${kind} window`).toBe(true);
      });
    }

    for (const choice of REMINDER_CHOICES) {
      it(`can remind somebody who asked for ${choice}, in ${season}, within the hour`, () => {
        const hour = Number(choice.slice(0, 2));
        /*
          Reached is not enough for a reminder: one that arrives three hours after
          the hour somebody picked is not the one they asked for. Within the hour
          is what an hourly run gives and what a Hobby job's own imprecision allows.
        */
        const onTime = runs(month).some((now) => {
          const at = local(now).hour;
          return at <= hour + 1 && letterOwed(qualifying("tonight", now, hour), now)?.kind === "tonight";
        });
        expect(onTime, `a reminder picked for ${choice} never arrives near ${choice}`).toBe(true);
      });
    }
  }
});
