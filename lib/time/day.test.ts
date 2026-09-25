import { describe, expect, it } from "vitest";

import {
  canonicalZone, dayClock, earliestStartOf, isTimeZone, nextCardLine, normaliseZone, partsIn, slowPartsIn, zoneToSend,
} from "./day";

/*
  The bug these exist for, stated once.

  Every screen that leads with a day boundary is rendered on the server, and
  the server's day boundary is the deployment's, not the learner's. On Vercel
  that is UTC. A learner in Tallinn who studied on Monday morning, at one in
  the morning on Tuesday and again on Wednesday morning kept a three-day
  streak; in UTC days that is Monday, Monday and Wednesday, which is a broken
  streak with a hole in it.

  So these tests are written against real instants and real zone names rather
  than against offsets, and every one of them would have passed before the
  change if the machine running it happened to sit in the right zone. That is
  the whole point: `dayClock` takes the zone as an argument, so the answer is a
  property of the code rather than of the box.
*/

const TALLINN = "Europe/Tallinn";
const NEW_YORK = "America/New_York";

describe("a day key belongs to a zone, not to the process", () => {
  it("puts one in the morning in Tallinn on the local day, not the UTC one", () => {
    // 22:30 UTC on the 24th is 01:30 on the 25th in Tallinn (UTC+3 in August).
    const at = new Date("2026-08-24T22:30:00.000Z");
    expect(dayClock(TALLINN).dayKey(at)).toBe("2026-08-25");
    expect(dayClock("UTC").dayKey(at)).toBe("2026-08-24");
  });

  it("puts eight in the evening in New York on the local day, not tomorrow", () => {
    // 00:00 UTC on the 25th is 20:00 on the 24th in New York.
    const at = new Date("2026-08-25T00:00:00.000Z");
    expect(dayClock(NEW_YORK).dayKey(at)).toBe("2026-08-24");
    expect(dayClock("UTC").dayKey(at)).toBe("2026-08-25");
  });

  it("gives three consecutive local days for the sittings that read as two UTC ones", () => {
    const sittings = [
      new Date("2026-08-24T06:00:00.000Z"), // Mon 09:00 Tallinn
      new Date("2026-08-24T22:00:00.000Z"), // Tue 01:00 Tallinn
      new Date("2026-08-26T06:00:00.000Z"), // Wed 09:00 Tallinn
    ];
    const local = dayClock(TALLINN);
    expect(new Set(sittings.map((d) => local.dayKey(d))).size).toBe(3);
    expect(new Set(sittings.map((d) => dayClock("UTC").dayKey(d))).size).toBe(2);
  });
});

describe("midnight is the zone's midnight", () => {
  it("starts the day at local midnight, whatever the offset", () => {
    const clock = dayClock(TALLINN);
    // 21:00 UTC on the 23rd is midnight on the 24th in Tallinn.
    expect(clock.startOfDay(new Date("2026-08-24T06:00:00.000Z")).toISOString())
      .toBe("2026-08-23T21:00:00.000Z");
  });

  it("is idempotent: midnight is already the start of its own day", () => {
    const clock = dayClock(NEW_YORK);
    const once = clock.startOfDay(new Date("2026-08-24T18:00:00.000Z"));
    expect(clock.startOfDay(once).getTime()).toBe(once.getTime());
  });

  it("keeps the day key it was asked about", () => {
    const clock = dayClock(TALLINN);
    for (const iso of [
      "2026-08-24T21:00:00.000Z", "2026-08-25T00:00:00.000Z", "2026-08-25T20:59:59.999Z",
    ]) {
      const at = new Date(iso);
      expect(clock.dayKey(clock.startOfDay(at))).toBe(clock.dayKey(at));
    }
  });
});

describe("stepping days survives a clock change", () => {
  /*
    Europe/Tallinn moves off summer time at 04:00 local on 25 October 2026, so
    that day is 25 hours long. Adding 86,400,000 milliseconds to its midnight
    lands at 23:00 the same day, which is how a day goes missing from a
    heatmap.
  */
  it("steps one calendar day across the autumn change, not 24 hours", () => {
    const clock = dayClock(TALLINN);
    const sunday = new Date("2026-10-25T09:00:00.000Z");
    expect(clock.dayKey(sunday)).toBe("2026-10-25");
    expect(clock.dayKey(clock.shiftDay(sunday, 1))).toBe("2026-10-24");
    expect(clock.dayKey(clock.shiftDay(sunday, -1))).toBe("2026-10-26");
  });

  it("steps across the spring change too", () => {
    // Tallinn springs forward at 03:00 local on 29 March 2026: a 23-hour day.
    const clock = dayClock(TALLINN);
    const sunday = new Date("2026-03-29T12:00:00.000Z");
    expect(clock.dayKey(sunday)).toBe("2026-03-29");
    expect(clock.dayKey(clock.shiftDay(sunday, 1))).toBe("2026-03-28");
    expect(clock.dayKey(clock.shiftDay(sunday, -1))).toBe("2026-03-30");
  });

  it("names every day in a run that spans a clock change, with no repeat and no hole", () => {
    const keys = dayClock(TALLINN).recentDayKeys(5, new Date("2026-10-27T09:00:00.000Z"));
    expect(keys).toEqual([
      "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27",
    ]);
  });

  /*
    The day after a change is where it went wrong, because stepping onto the
    change day asked for its midnight and got one read in the wrong offset:
    23:00 on the 28th in spring, 01:00 on the 25th in autumn. A run of days
    across the spring change then named the 28th twice and skipped the 29th,
    and a streak over the 29th and the 30th read 1.
  */
  it("finds midnight on the day the clocks change, in both directions", () => {
    const clock = dayClock(TALLINN);
    expect(clock.startOfDay(new Date("2026-03-29T09:00:00.000Z")).toISOString()).toBe("2026-03-28T22:00:00.000Z");
    expect(clock.startOfDay(new Date("2026-10-25T10:00:00.000Z")).toISOString()).toBe("2026-10-24T21:00:00.000Z");
    expect(clock.dayKey(clock.shiftDay(new Date("2026-03-30T09:00:00.000Z"), 1))).toBe("2026-03-29");
    expect(clock.recentDayKeys(4, new Date("2026-03-30T09:00:00.000Z"))).toEqual([
      "2026-03-27", "2026-03-28", "2026-03-29", "2026-03-30",
    ]);
    expect(dayClock("America/New_York").recentDayKeys(3, new Date("2026-03-09T17:00:00.000Z"))).toEqual([
      "2026-03-07", "2026-03-08", "2026-03-09",
    ]);
  });

  it("keeps the first instant of a day whose midnight does not exist", () => {
    // Havana springs from 00:00 straight to 01:00 on 8 March 2026.
    const clock = dayClock("America/Havana");
    const start = clock.startOfDay(new Date("2026-03-08T18:00:00.000Z"));
    expect(clock.dayKey(start)).toBe("2026-03-08");
    expect(start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
  });

  it("counts whole calendar days between instants, not 24-hour blocks", () => {
    const clock = dayClock(TALLINN);
    // 23:00 on the 24th to 01:00 on the 25th is two hours and one day.
    expect(clock.daysBetween(
      new Date("2026-08-24T20:00:00.000Z"), new Date("2026-08-24T22:00:00.000Z"),
    )).toBe(1);
    expect(clock.daysBetween(
      new Date("2026-10-24T09:00:00.000Z"), new Date("2026-10-26T09:00:00.000Z"),
    )).toBe(2);
  });
});

describe("a stored zone is never trusted blind", () => {
  it("accepts a real IANA name", () => {
    expect(isTimeZone(TALLINN)).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
  });

  it("rejects anything Intl will not take, including the shapes an attacker sends", () => {
    for (const bad of [
      "", "Mars/Olympus", "'; DROP TABLE \"Review\"; --", "Europe/Tallinn'", 42, null, undefined,
      "A".repeat(200),
    ]) {
      expect(isTimeZone(bad)).toBe(false);
    }
  });

  it("falls back to the process rather than throwing on a zone that stopped existing", () => {
    const clock = dayClock("Mars/Olympus");
    expect(clock.zone).toBeUndefined();
    expect(clock.dayKey(new Date("2026-08-24T12:00:00.000Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(normaliseZone("Mars/Olympus")).toBeUndefined();
    expect(normaliseZone(TALLINN)).toBe(TALLINN);
  });
});

/*
  The caught-up screen's one sentence.

  Every case is a day count rather than a clock reading, because FSRS schedules
  in days: a card due at 04:12 on Thursday is a card due on Thursday. The zone
  is the part that decides which day, which is why the last of these is here at
  all: 23:30 UTC is already tomorrow in Tallinn, and a learner there is told
  "tomorrow" for a card an hour away while a learner in London is told "later
  today" for the same card.
*/
describe("nextCardLine", () => {
  const clock = dayClock(TALLINN);
  const now = new Date("2026-09-02T09:00:00Z"); // Wednesday, 12:00 in Tallinn

  it("names the rest of today when the card is hours away", () => {
    expect(nextCardLine(new Date("2026-09-02T18:00:00Z"), now, clock))
      .toBe("The next card comes back later today.");
  });

  it("says tomorrow rather than naming a weekday for it", () => {
    expect(nextCardLine(new Date("2026-09-03T05:00:00Z"), now, clock))
      .toBe("The next card comes back tomorrow.");
  });

  it("names the weekday inside a week", () => {
    expect(nextCardLine(new Date("2026-09-05T05:00:00Z"), now, clock))
      .toBe("The next card comes back on Saturday.");
  });

  it("counts the days once a weekday would be ambiguous", () => {
    expect(nextCardLine(new Date("2026-09-14T05:00:00Z"), now, clock))
      .toBe("The next card comes back in 12 days.");
  });

  it("reads the learner's zone rather than the server's", () => {
    // 23:00 in Tallinn, 21:00 in London, on the same Wednesday evening.
    const evening = new Date("2026-09-02T20:00:00Z");
    // Two and a half hours on: past midnight in Tallinn, not in London.
    const soon = new Date("2026-09-02T22:30:00Z");
    expect(nextCardLine(soon, evening, dayClock(TALLINN)))
      .toBe("The next card comes back tomorrow.");
    expect(nextCardLine(soon, evening, dayClock("Europe/London")))
      .toBe("The next card comes back later today.");
  });
});

describe("canonicalZone", () => {
  it("stores one spelling of a zone whatever casing arrives", () => {
    expect(canonicalZone("europe/tallinn")).toBe("Europe/Tallinn");
    expect(canonicalZone("EUROPE/TALLINN")).toBe("Europe/Tallinn");
    expect(normaliseZone("europe/tallinn")).toBe("Europe/Tallinn");
    expect(canonicalZone("utc")).toBe("UTC");
  });

  /*
    Intl reads "+05:30" as east of Greenwich and Postgres reads it in
    AT TIME ZONE as west, eleven hours apart (measured on Postgres 16), and
    a stored zone reaches both. So an offset is not a zone here.
  */
  it("refuses a bare offset, which Intl and Postgres read with opposite signs", () => {
    for (const offset of ["+05:30", "-08:00", "+00:00"]) {
      expect(canonicalZone(offset)).toBeUndefined();
      expect(isTimeZone(offset)).toBe(false);
      expect(normaliseZone(offset)).toBeUndefined();
    }
  });

  it("stores the zone database's current name, which every Postgres build carries", () => {
    expect(canonicalZone("Europe/Kiev")).toBe("Europe/Kyiv");
    expect(canonicalZone("Europe/Kyiv")).toBe("Europe/Kyiv");
    expect(canonicalZone("Asia/Calcutta")).toBe("Asia/Kolkata");
    expect(dayClock("Europe/Kiev").zoneName).toBe("Europe/Kyiv");
  });

  it("keeps a named zone whose own name carries a sign, since the database names it", () => {
    expect(canonicalZone("Etc/GMT+5")).toBe("Etc/GMT+5");
  });
});

describe("zoneToSend", () => {
  it("sends nothing when a browser reports the retired name of the zone already stored", () => {
    // What Chrome reports in Kyiv and Kolkata, against what the server stores.
    expect(zoneToSend("Europe/Kiev", "Europe/Kyiv")).toBeNull();
    expect(zoneToSend("Asia/Calcutta", "Asia/Kolkata")).toBeNull();
  });

  it("sends the canonical name when the stored zone is missing or different", () => {
    expect(zoneToSend("Europe/Kiev", null)).toBe("Europe/Kyiv");
    expect(zoneToSend("Europe/Tallinn", "Europe/Helsinki")).toBe("Europe/Tallinn");
  });

  it("never sends an offset or something that is not a zone", () => {
    expect(zoneToSend("+05:30", null)).toBeNull();
    expect(zoneToSend("Not/AZone", null)).toBeNull();
    expect(zoneToSend(undefined, null)).toBeNull();
  });
});

describe("the wall clock is the formatter's answer, whatever the cache holds", () => {
  /*
    `partsIn` remembers each zone's offset per UTC quarter hour and does the
    rest by arithmetic, which took `dayKey` and `hourOf` from most of /progress
    to a rounding error. Only worth having if it is the same answer, so it is
    held to `formatToParts` minute by minute around every transition these
    zones had in three years, which is where an offset cached one quarter too
    long would show, and at a spread of ordinary instants besides. The zones
    are chosen for their offsets: whole hours, a half-hour summer time
    (Lord Howe), quarter hours (Chatham, Kathmandu), a half hour behind UTC
    (St John's), and the process's own.
  */
  const ZONES = [
    "Europe/Tallinn", "America/Los_Angeles", "Pacific/Chatham", "Australia/Lord_Howe",
    "Asia/Kathmandu", "America/St_Johns", undefined,
  ] as const;
  const from = Date.UTC(2025, 0, 1);
  const to = Date.UTC(2028, 0, 1);
  const offsetOf = (ms: number, zone: string | undefined) => {
    const p = slowPartsIn(new Date(ms), zone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  };

  it("agrees minute by minute across every transition, in every zone", () => {
    let transitions = 0;
    let compared = 0;
    for (const zone of ZONES) {
      let before = offsetOf(from, zone);
      for (let ms = from + 3_600_000; ms < to; ms += 3_600_000) {
        const now = offsetOf(ms, zone);
        if (now === before) continue;
        before = now;
        transitions += 1;
        for (let m = ms - 2 * 3_600_000; m <= ms + 2 * 3_600_000; m += 60_000) {
          for (const at of [m, m + 999, m + 30_000]) {
            expect(partsIn(new Date(at), zone)).toEqual(slowPartsIn(new Date(at), zone));
            compared += 1;
          }
        }
      }
    }
    // Five of the six named zones keep a summer time, twice a year for three
    // years; a count that fell would mean the scan stopped finding them.
    expect(transitions).toBeGreaterThanOrEqual(24);
    expect(compared).toBeGreaterThan(10_000);
  });

  it("agrees at ordinary instants across the range", () => {
    for (const zone of ZONES) {
      for (let ms = from; ms < to; ms += 7_777_777) {
        expect(partsIn(new Date(ms), zone)).toEqual(slowPartsIn(new Date(ms), zone));
      }
    }
  });

  it("hands a date that is not one to the formatter rather than inventing parts for it", () => {
    // Which throws, exactly as it did before there was a cache in front of it.
    expect(() => slowPartsIn(new Date(Number.NaN), "Europe/Tallinn")).toThrow(RangeError);
    expect(() => partsIn(new Date(Number.NaN), "Europe/Tallinn")).toThrow(RangeError);
  });
});

describe("earliestStartOf", () => {
  it("is midnight at UTC+14, which no zone's day begins before", () => {
    expect(earliestStartOf("2026-09-25").toISOString()).toBe("2026-09-24T10:00:00.000Z");
    for (const zone of ["Pacific/Kiritimati", "Europe/Tallinn", "UTC", "Pacific/Pago_Pago"]) {
      const midnight = dayClock(zone).startOfDay(new Date("2026-09-25T12:00:00Z"));
      expect(midnight.getTime()).toBeGreaterThanOrEqual(earliestStartOf("2026-09-25").getTime());
    }
  });
});
