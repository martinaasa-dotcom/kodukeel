import { describe, expect, it } from "vitest";
import {
  BAND_WEEKS, DEFER_WEEKS, HARD_LEARNERS,
  bandReached, deferralFor, deferralNote, inForce, offeredBand, tooHardForEveryone, weeksBetween,
} from "./defer";
import { raiseBand } from "@/lib/collections/levels";

const NOW = new Date("2026-09-14T10:00:00.000Z");
const weeksFrom = (until: Date) => Math.round((until.getTime() - NOW.getTime()) / (7 * 24 * 3600 * 1000));

/**
 * The two outcomes and the line between them, which is the whole of what this
 * button decides. A word somebody is supposed to be meeting goes back a few
 * weeks; a word that arrived early waits for the band it belongs to. Getting
 * the line wrong in one direction loses a word for months, and in the other it
 * hands it straight back to somebody who has just said it was beyond them.
 */
describe("how long a word goes away for", () => {
  it("gives a word at the learner's own level a few weeks and no band to wait for", () => {
    const put = deferralFor({ band: "B1", level: "B1", now: NOW });
    expect(put.reason).toBe("WEEKS");
    expect(put.untilLevel).toBeNull();
    expect(weeksFrom(put.untilAt)).toBe(DEFER_WEEKS);
  });

  it("treats a word below the learner the same way", () => {
    expect(deferralFor({ band: "A1", level: "B1", now: NOW }).reason).toBe("WEEKS");
  });

  it("makes a word above the learner wait for its own band", () => {
    const put = deferralFor({ band: "B2", level: "A1", now: NOW });
    expect(put.reason).toBe("BAND");
    expect(put.untilLevel).toBe("B2");
  });

  /*
    An untagged word is most of what somebody typed in, pasted or photographed
    off their own homework, and it carries no claim about difficulty at all.
    Reading a missing band as "beyond them" would put a word they went to the
    trouble of adding away for months.
  */
  it("gives an untagged word the plain few weeks", () => {
    const put = deferralFor({ band: null, level: "A1", now: NOW });
    expect(put.reason).toBe("WEEKS");
    expect(put.untilLevel).toBeNull();
  });

  /*
    The backstop has to outlast an ordinary deferral, or a word that arrived
    early comes back sooner than a word the learner was supposed to have.
  */
  it("waits longer for a word that arrived early than for a bad evening", () => {
    expect(BAND_WEEKS).toBeGreaterThan(DEFER_WEEKS);
    for (const level of ["A1", "A2", "B1", "B2", "C1"] as const) {
      for (const band of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
        const put = deferralFor({ band, level, now: NOW });
        expect(put.weeks).toBe(put.reason === "BAND" ? BAND_WEEKS : DEFER_WEEKS);
        expect(weeksFrom(put.untilAt)).toBe(put.weeks);
      }
    }
  });

  it("says which word and when, because nothing else on the screen will", () => {
    const put = deferralFor({ band: "C1", level: "A1", now: NOW });
    const note = deferralNote(put, "kestma");
    expect(note).toContain("kestma");
    expect(note).toContain("C1");
    expect(deferralNote(deferralFor({ band: "A1", level: "A1", now: NOW }), "kohv")).toContain("kohv");
  });
});

describe("whether a deferral is still holding", () => {
  const row = { untilAt: new Date("2026-10-05T10:00:00.000Z"), wokenAt: null };

  it("holds until the date", () => {
    expect(inForce(row, NOW)).toBe(true);
    expect(inForce(row, new Date("2026-10-06T10:00:00.000Z"))).toBe(false);
  });

  /*
    The other way it ends is the learner reaching the band, and that is stamped
    on the row rather than worked out on every read: a dozen read paths ask
    this and not one of them should have to fetch a level first.
  */
  it("stops holding once it has been woken", () => {
    expect(inForce({ ...row, wokenAt: NOW }, NOW)).toBe(false);
  });

  it("knows when a band has been reached", () => {
    expect(bandReached({ untilLevel: "B1" }, "B1")).toBe(true);
    expect(bandReached({ untilLevel: "B1" }, "B2")).toBe(true);
    expect(bandReached({ untilLevel: "B1" }, "A2")).toBe(false);
    expect(bandReached({ untilLevel: null }, "C1")).toBe(false);
  });
});

/**
 * And the half that moves a word for everybody. A head count on its own is not
 * evidence: five people out of the five who have the word is the course being
 * wrong, and five out of four hundred is five people having a bad week.
 */
describe("when enough people have said it", () => {
  it("needs the floor as well as the share", () => {
    expect(tooHardForEveryone({ learners: HARD_LEARNERS - 1, holders: HARD_LEARNERS - 1 })).toBe(false);
    expect(tooHardForEveryone({ learners: HARD_LEARNERS, holders: HARD_LEARNERS })).toBe(true);
  });

  it("does not move a word five people out of four hundred put aside", () => {
    expect(tooHardForEveryone({ learners: 5, holders: 400 })).toBe(false);
    expect(tooHardForEveryone({ learners: 90, holders: 400 })).toBe(true);
  });

  /* A row claiming more people put a word aside than hold it is a row to
     distrust, and dividing by nobody is not a reading. */
  it("refuses to divide by nobody", () => {
    expect(tooHardForEveryone({ learners: 50, holders: 0 })).toBe(false);
  });

  it("offers a moved word one band later, and never more than one", () => {
    expect(offeredBand("A1", true)).toBe("A2");
    expect(offeredBand("A1", false)).toBe("A1");
    expect(raiseBand(raiseBand("A1"))).toBe("B1");
  });

  /* C2 is the top of the dictionary's own ladder, and an untagged word never
     grows a band it never had. */
  it("stops at the top and leaves an untagged word alone", () => {
    expect(offeredBand("C2", true)).toBe("C2");
    expect(offeredBand(null, true)).toBeNull();
  });
});

/**
 * The sentence a second press hands back.
 *
 * `deferWord` keeps a wait that is already standing where it reaches further
 * than tonight's would, and then has to say how long that one has left. A
 * remainder floored would read "about 0 weeks" over a word that is gone for
 * four more days, which is the fault `lib/time/duration.ts` states one
 * directory over about a figure whose smaller end rounds to a zero it is not.
 */
describe("how far off a standing wait is, in words", () => {
  const days = (n: number) => new Date(NOW.getTime() + n * 24 * 3600 * 1000);

  it("reads a three week wait as three weeks", () => {
    expect(weeksBetween(NOW, days(21))).toBe(3);
  });

  it("never says a wait still running is no weeks at all", () => {
    expect(weeksBetween(NOW, days(4))).toBe(1);
    expect(weeksBetween(NOW, days(1))).toBe(1);
  });

  it("rounds rather than floors, so eleven days is two weeks", () => {
    expect(weeksBetween(NOW, days(11))).toBe(2);
  });

  it("agrees with what a fresh deferral says about itself", () => {
    const put = deferralFor({ band: "C1", level: "A1", now: NOW });
    expect(weeksBetween(NOW, put.untilAt)).toBe(put.weeks);
    expect(put.weeks).toBe(BAND_WEEKS);
  });
});

/**
 * The bands, read forwards and one step up.
 *
 * `deferralFor` compares two of them and `offeredBand` moves one, so the order
 * is load-bearing twice over: read backwards it would tell a beginner that
 * every word is beneath them, and a raise that walked past the top of the
 * course would move a word somewhere nobody is ever standing.
 */
describe("the bands", () => {
  it("climbs, so a word above the learner waits and a word at their level does not", () => {
    expect(deferralFor({ band: "C1", level: "B1", now: NOW }).reason).toBe("BAND");
    expect(deferralFor({ band: "A1", level: "B1", now: NOW }).reason).toBe("WEEKS");
    expect(deferralFor({ band: "B1", level: "B1", now: NOW }).reason).toBe("WEEKS");
  });

  it("raises by one step and stops at the top", () => {
    expect(raiseBand("A1")).toBe("A2");
    expect(raiseBand("B2")).toBe("C1");
    expect(raiseBand("C2")).toBe("C2");
  });

  it("raises nothing it cannot read, because an untagged word makes no claim", () => {
    expect(raiseBand(null)).toBeNull();
    expect(offeredBand(null, true)).toBeNull();
  });
});
