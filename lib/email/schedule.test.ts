/*
  THE DECISION, DRIVEN OVER THE SITUATIONS A LEARNER IS ACTUALLY IN.

  Every one of these is a real state somebody reaches: the holiday, the person
  who studies at lunchtime, the address that bounced, the two cron runs that
  overlapped. None of them is reachable by sending mail and looking, which is
  why the judgment lives in a pure function and this file drives it.
*/
import { describe, expect, it } from "vitest";

import {
  AWAY_DAYS, DEADLINE_WEEKS_MAX, DEADLINE_WEEKS_MIN, letterOwed, MAX_PER_WEEK, MIN_GAP_HOURS,
  QUIET_CONVERSATIONS, type Candidate,
} from "./schedule";
import { emailPrefsFrom } from "./prefs";
import type { EmailKind } from "./letter";

const NOW = new Date("2026-09-16T18:30:00Z");
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/** A learner mid-course whose evening has come round and who has not studied. */
function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    ownerId: "owner-1",
    email: "mari@example.ee",
    undeliverable: false,
    prefs: emailPrefsFrom(null),
    dayKey: "2026-09-16",
    localHour: 19,
    reminderHour: 18,
    localWeekday: 3,
    lastSent: new Map(),
    sentThisWeek: 0,
    lastReviewAt: daysAgo(1),
    onboardedAt: daysAgo(30),
    hasProgramme: true,
    finishedToday: false,
    stage: "settled",
    conversations: 0,
    hasErrand: true,
    milestoneReached: null,
    shieldSpent: null,
    runsGroup: false,
    deadlineWeeks: null,
    ...over,
  };
}

describe("the evening nudge", () => {
  it("goes out in the evening, to somebody with an unfinished evening", () => {
    expect(letterOwed(candidate(), NOW)?.kind).toBe("tonight");
  });

  it("waits for the hour they picked", () => {
    /*
      A reminder at an hour somebody cannot act on is a reminder teaching them
      to ignore the sender. Somebody who asked for 18:00 hears nothing at 14:00.
    */
    expect(letterOwed(candidate({ localHour: 14 }), NOW)).toBeNull();
    expect(letterOwed(candidate({ localHour: 18 }), NOW)?.kind).toBe("tonight");
  });

  it("stops at ten at night rather than running to midnight", () => {
    expect(letterOwed(candidate({ localHour: 21 }), NOW)?.kind).toBe("tonight");
    expect(letterOwed(candidate({ localHour: 23 }), NOW)).toBeNull();
  });

  it("says nothing to somebody who already did tonight", () => {
    expect(letterOwed(candidate({ finishedToday: true }), NOW)).toBeNull();
  });

  it("says nothing to somebody with no course to be reminded about", () => {
    expect(letterOwed(candidate({ hasProgramme: false }), NOW)).toBeNull();
  });

  it("does not send twice when two runs overlap", () => {
    // The gate that matters most in practice: a cron that fires twice, a retry
    // after a timeout, or an operator who set the schedule to hourly.
    const sent = new Map<EmailKind, Date>([["tonight", hoursAgo(1)]]);
    expect(letterOwed(candidate({ lastSent: sent }), NOW)).toBeNull();
  });

  it("comes round again the next evening rather than drifting an hour later", () => {
    /*
      A flat 24 hours pushes a daily letter later every day, because each one
      is sent a little after the last, and inside a fortnight it has walked out
      of the evening entirely. The gap is deliberately under a day.
    */
    expect(MIN_GAP_HOURS.tonight).toBeLessThan(24);
    const sent = new Map<EmailKind, Date>([["tonight", hoursAgo(23)]]);
    expect(letterOwed(candidate({ lastSent: sent }), NOW)?.kind).toBe("tonight");
  });
});

describe("the letter after a gap", () => {
  it("goes out once somebody has been away long enough", () => {
    const away = candidate({ lastReviewAt: daysAgo(AWAY_DAYS + 1) });
    expect(letterOwed(away, NOW)?.kind).toBe("comeback");
  });

  it("outranks both routine letters, so nobody gets two in a morning", () => {
    /*
      Somebody back from a fortnight away whose Sunday summary is also due.
      A summary of a week they were not in is not the letter to send, and two
      letters on one morning from an app they have not opened is how a sender
      becomes spam.
    */
    const both = candidate({
      lastReviewAt: daysAgo(14),
      localWeekday: 0,
      localHour: 10,
    });
    // The summary is not sent that morning, and the comeback is the evening's.
    expect(letterOwed(both, NOW)).toBeNull();
    expect(letterOwed({ ...both, localHour: 19 }, NOW)?.kind).toBe("comeback");
  });

  it("arrives in their evening, never in the night an hourly run would reach", () => {
    /*
      It had no hour of its own while the run fired once a day, at 18:00 or
      19:00 in Tallinn. Hourly, the first run past the fortnight would send it,
      which is as often as not three in the morning.
    */
    const away = candidate({ lastReviewAt: daysAgo(AWAY_DAYS + 1) });
    expect(letterOwed({ ...away, localHour: 3 }, NOW)).toBeNull();
    expect(letterOwed({ ...away, localHour: 17 }, NOW)).toBeNull();
    expect(letterOwed({ ...away, localHour: 18 }, NOW)?.kind).toBe("comeback");
    expect(letterOwed({ ...away, localHour: 22 }, NOW)).toBeNull();
  });

  it("is the only letter somebody away ever gets, so nobody is nagged nightly", () => {
    /*
      Found by driving this rather than by reading it. Written as one more
      branch, the comeback went out and then, once its gap had closed, the
      evening nudge took over: somebody three weeks gone got "Tonight is five
      new words" every evening, describing a course they had stepped out of.
      Being away is a state, so the branch returns either way and the answer
      after the one letter is silence.
    */
    const sent = new Map<EmailKind, Date>([["comeback", daysAgo(10)]]);
    const away = candidate({ lastReviewAt: daysAgo(20), lastSent: sent, localHour: 19 });
    expect(letterOwed(away, NOW)).toBeNull();
  });

  it("does not arrive twice in a month", () => {
    const sent = new Map<EmailKind, Date>([["comeback", daysAgo(10)]]);
    const away = candidate({ lastReviewAt: daysAgo(20), lastSent: sent });
    expect(letterOwed(away, NOW)).toBeNull();
    expect(MIN_GAP_HOURS.comeback).toBeGreaterThanOrEqual(24 * 14);
  });

  it("goes once per absence, however long the absence runs", () => {
    /*
      The gap alone let it out again every fortnight, so somebody who stayed
      away got it on day 6, day 20 and day 34 of one absence. What decides it
      is whether one already went out since their last review.
    */
    const sent = new Map<EmailKind, Date>([["comeback", daysAgo(30)]]);
    const stillAway = candidate({ lastReviewAt: daysAgo(40), lastSent: sent });
    expect(letterOwed(stillAway, NOW)).toBeNull();
  });

  it("goes again after they came back and then left again", () => {
    const sent = new Map<EmailKind, Date>([["comeback", daysAgo(60)]]);
    const awayAgain = candidate({ lastReviewAt: daysAgo(AWAY_DAYS + 1), lastSent: sent });
    expect(letterOwed(awayAgain, NOW)?.kind).toBe("comeback");
  });

  it("is sent at most once over a whole absence, driven hour by hour", () => {
    let sent = new Map<EmailKind, Date>();
    let count = 0;
    const lastReviewAt = daysAgo(60);
    for (let h = 0; h < 60 * 24; h++) {
      const now = new Date(lastReviewAt.getTime() + h * 3_600_000);
      const decision = letterOwed(candidate({ lastReviewAt, lastSent: sent, localHour: now.getUTCHours() }), now);
      if (decision?.kind === "comeback") {
        count++;
        sent = new Map(sent).set("comeback", now);
      }
    }
    expect(count).toBe(1);
  });
});

describe("the Sunday summary", () => {
  it("goes out on a Sunday morning where they are, not where the server is", () => {
    const sunday = candidate({ localWeekday: 0, localHour: 10 });
    expect(letterOwed(sunday, NOW)?.kind).toBe("weekly");
    expect(letterOwed(candidate({ localWeekday: 0, localHour: 20 }), NOW)?.kind).not.toBe("weekly");
    expect(letterOwed(candidate({ localWeekday: 1, localHour: 10 }), NOW)?.kind).not.toBe("weekly");
  });

  it("is not sent to somebody who has never reviewed anything", () => {
    const never = candidate({ localWeekday: 0, localHour: 10, lastReviewAt: null });
    expect(letterOwed(never, NOW)).toBeNull();
  });
});

describe("the welcome", () => {
  it("waits an hour, so it lands after they have closed the tab", () => {
    expect(letterOwed(candidate({ onboardedAt: hoursAgo(0.2) }), NOW)?.kind).not.toBe("welcome");
    expect(letterOwed(candidate({ onboardedAt: hoursAgo(2) }), NOW)?.kind).toBe("welcome");
  });

  it("is never sent to somebody who signed up months ago", () => {
    // Otherwise switching this feature on mails a welcome to every existing
    // learner, telling each of them their deck has just been built.
    expect(letterOwed(candidate({ onboardedAt: daysAgo(30) }), NOW)?.kind).not.toBe("welcome");
  });
});

describe("news before asks", () => {
  const morning = (over: Partial<Candidate> = {}) =>
    candidate({ localHour: 9, localWeekday: 3, ...over });

  it("announces a level whose words the scheduler has graduated", () => {
    expect(letterOwed(morning({ milestoneReached: "A1" }), NOW)?.kind).toBe("milestone");
  });

  it("tells somebody a shield covered a day", () => {
    expect(letterOwed(morning({ shieldSpent: "2026-09-17" }), NOW)?.kind).toBe("shield");
  });

  it("puts a milestone above the errand, the summary and the evening", () => {
    /*
      Somebody who has just finished A1 should be told about A1 rather than
      about tonight, and the thing that can wait is the thing that asks. Driven
      against each of the three it has to outrank rather than against one.
    */
    expect(letterOwed(morning({ milestoneReached: "A1" }), NOW)?.kind).toBe("milestone");
    expect(
      letterOwed(morning({ milestoneReached: "A1", localWeekday: 0, localHour: 10 }), NOW)?.kind,
    ).toBe("milestone");
    expect(
      letterOwed(candidate({ milestoneReached: "A1", localHour: 9, localWeekday: 3, finishedToday: false }), NOW)?.kind,
    ).toBe("milestone");
  });

  it("puts a milestone above a shield, where both landed", () => {
    // Finishing a level is the bigger of the two, and two letters in one
    // morning is what the weekly ceiling exists to stop.
    const both = morning({ milestoneReached: "A1", shieldSpent: "2026-09-17" });
    expect(letterOwed(both, NOW)?.kind).toBe("milestone");
  });

  it("says nothing where there is no news", () => {
    // The commonest answer by a long way: five milestones exist per learner
    // ever, and a shield covers a particular day once.
    expect(letterOwed(morning(), NOW)?.kind).not.toBe("milestone");
    expect(letterOwed(morning(), NOW)?.kind).not.toBe("shield");
  });

  it("does not wake anybody up with news", () => {
    // Neither is a thing to act on, so neither is worth an evening or a
    // six-in-the-morning delivery.
    expect(letterOwed(morning({ milestoneReached: "A1", localHour: 6 }), NOW)?.kind).not.toBe("milestone");
    expect(letterOwed(morning({ milestoneReached: "A1", localHour: 20 }), NOW)?.kind).not.toBe("milestone");
  });

  it("is switched off on its own without taking the others", () => {
    const off = morning({ milestoneReached: "A1", prefs: emailPrefsFrom("milestone") });
    expect(letterOwed(off, NOW)?.kind).not.toBe("milestone");
    expect(letterOwed({ ...off, localHour: 19 }, NOW)?.kind).toBe("tonight");
  });

  it("still never reaches somebody who has stopped studying", () => {
    /*
      Being away returns either way, so even news waits. Somebody a fortnight
      gone gets the one letter about coming back, and a milestone earned
      before they stopped is not the thing to open with.
    */
    const away = morning({ milestoneReached: "A1", lastReviewAt: daysAgo(20) });
    // Nothing that morning, and the comeback is the evening's letter.
    expect(letterOwed(away, NOW)).toBeNull();
    expect(letterOwed({ ...away, localHour: 19 }, NOW)?.kind).toBe("comeback");
  });

  it("does not repeat the same news twice in a morning", () => {
    // The high-water mark is what stops it repeating at all; the gap is the
    // belt for a run that crashed between sending and writing the mark.
    const sent = new Map<EmailKind, Date>([["milestone", hoursAgo(2)]]);
    expect(letterOwed(morning({ milestoneReached: "A1", lastSent: sent }), NOW)?.kind).not.toBe("milestone");
  });
});

describe("the errand", () => {
  /** A weekday morning where they are, which is the errand's own window. */
  const morning = (over: Partial<Candidate> = {}) =>
    candidate({ localHour: 9, localWeekday: 3, ...over });

  it("goes out on a weekday morning, to somebody the number is flat for", () => {
    expect(letterOwed(morning(), NOW)?.kind).toBe("errand");
  });

  it("is a morning letter, because an errand needs a day in front of it", () => {
    /*
      "Go and buy bread" at nine in the evening is a letter about tomorrow, and
      by tomorrow it is gone.
    */
    expect(letterOwed(morning({ localHour: 7 }), NOW)?.kind).not.toBe("errand");
    expect(letterOwed(morning({ localHour: 12 }), NOW)?.kind).not.toBe("errand");
  });

  it("leaves Sunday morning to the summary", () => {
    // Two letters on one morning is what the weekly ceiling exists to stop,
    // and of the two the summary has to land on the day it is about.
    expect(letterOwed(morning({ localWeekday: 0, localHour: 10 }), NOW)?.kind).toBe("weekly");
  });

  it("is never sent to somebody three days in", () => {
    /*
      "Say one thing to a stranger today" to somebody who has met thirty words
      is a dare rather than a task, which is the false confidence the readiness
      screen is built against arriving by post. The stage comes from
      `stageOf` rather than from a number here.
    */
    expect(letterOwed(morning({ stage: "arriving" }), NOW)).toBeNull();
    expect(letterOwed(morning({ stage: "starting" }), NOW)).toBeNull();
  });

  it("is never sent to somebody with no deck to draw an errand from", () => {
    expect(letterOwed(morning({ hasErrand: false }), NOW)).toBeNull();
  });

  it("stops once somebody is actually having conversations", () => {
    /*
      The trigger is that the one number this app says it is measured by is
      flat for this person. Telling somebody to go and speak Estonian when the
      app can see they already are is the app not reading its own data.
    */
    expect(letterOwed(morning({ conversations: QUIET_CONVERSATIONS }), NOW)?.kind).toBe("errand");
    expect(letterOwed(morning({ conversations: QUIET_CONVERSATIONS + 1 }), NOW)).toBeNull();
  });

  it("comes at most once a week, because it is the biggest ask in the app", () => {
    const sent = new Map<EmailKind, Date>([["errand", daysAgo(3)]]);
    expect(letterOwed(morning({ lastSent: sent }), NOW)).toBeNull();
    expect(MIN_GAP_HOURS.errand).toBeGreaterThanOrEqual(24 * 6);
  });

  it("is switched off on its own, without taking the evening letter with it", () => {
    const off = morning({ prefs: emailPrefsFrom("errand") });
    expect(letterOwed(off, NOW)).toBeNull();
    // And the evening one still reaches them that evening.
    expect(letterOwed({ ...off, localHour: 19 }, NOW)?.kind).toBe("tonight");
  });

  it("never outranks the letter to somebody who has stopped studying", () => {
    // Somebody a fortnight away gets the one letter about coming back. Being
    // sent out to talk to a stranger is not what that person needs first.
    const away = morning({ lastReviewAt: daysAgo(20) });
    expect(letterOwed(away, NOW)).toBeNull();
    expect(letterOwed({ ...away, localHour: 19 }, NOW)?.kind).toBe("comeback");
  });
});

describe("the four gates", () => {
  it("sends nothing to somebody with no address", () => {
    expect(letterOwed(candidate({ email: null }), NOW)).toBeNull();
  });

  it("sends nothing to an address that has bounced", () => {
    /*
      Continuing to mail a dead address is what a mailbox provider reads as a
      sender who is not paying attention, and the cost lands on the sign-in
      links too.
    */
    expect(letterOwed(candidate({ undeliverable: true }), NOW)).toBeNull();
  });

  it("respects what they switched off, kind by kind", () => {
    const off = candidate({ prefs: emailPrefsFrom("tonight") });
    expect(letterOwed(off, NOW)).toBeNull();
    // And the others still reach them, which is what per-kind means.
    const sunday = candidate({ prefs: emailPrefsFrom("tonight"), localWeekday: 0, localHour: 10 });
    expect(letterOwed(sunday, NOW)?.kind).toBe("weekly");
  });

  it("sends nothing at all to somebody who pressed the client's own button", () => {
    for (const state of [
      candidate({ prefs: emailPrefsFrom("all") }),
      candidate({ prefs: emailPrefsFrom("all"), localWeekday: 0, localHour: 10 }),
      candidate({ prefs: emailPrefsFrom("all"), lastReviewAt: daysAgo(30) }),
      candidate({ prefs: emailPrefsFrom("all"), onboardedAt: hoursAgo(2) }),
    ]) {
      expect(letterOwed(state, NOW)).toBeNull();
    }
  });

  it("stops at the weekly ceiling however much is owed", () => {
    expect(letterOwed(candidate({ sentThisWeek: MAX_PER_WEEK }), NOW)).toBeNull();
    expect(letterOwed(candidate({ sentThisWeek: MAX_PER_WEEK - 1 }), NOW)?.kind).toBe("tonight");
  });
});

describe("the ordinary answer is nothing", () => {
  it("says nothing to somebody who studied tonight and is up to date", () => {
    /*
      Worth asserting rather than assuming: on any real run most learners are
      owed nothing, and a scheduler whose commonest answer was a letter would
      be a scheduler nobody stays subscribed to.
    */
    const settled = candidate({ finishedToday: true, lastReviewAt: hoursAgo(2) });
    expect(letterOwed(settled, NOW)).toBeNull();
  });
});

describe("the register", () => {
  /** Monday morning where the owner is, with a group under them. */
  const owner = (over: Partial<Candidate> = {}) =>
    candidate({ runsGroup: true, localWeekday: 1, localHour: 8, ...over });

  it("goes out on Monday morning to somebody who runs a group", () => {
    expect(letterOwed(owner(), NOW)?.kind).toBe("classroom");
  });

  it("does not go to somebody who runs nothing", () => {
    expect(letterOwed(owner({ runsGroup: false }), NOW)?.kind).not.toBe("classroom");
  });

  it("outranks the coming-back letter, because it is not about their own course", () => {
    /*
      The one that had to be a test rather than a comment. Every other branch
      below the away check is about the reader's own evenings and is correctly
      silenced by their having stepped away; this one is about a class that met
      on Tuesday. Written as one more branch under the away check, a teacher a
      fortnight out of their own deck would have been answered with "we have
      not seen you in a while" on the morning they wanted their register.
    */
    const away = owner({ lastReviewAt: daysAgo(AWAY_DAYS + 8) });
    expect(letterOwed(away, NOW)?.kind).toBe("classroom");
  });

  it("is not stopped by a full week of their own letters", () => {
    expect(letterOwed(owner({ sentThisWeek: MAX_PER_WEEK + 3 }), NOW)?.kind).toBe("classroom");
  });
});

describe("the word of the day", () => {
  /** Morning, with the word asked for. Off by default, so it has to be switched on. */
  const asked = (over: Partial<Candidate> = {}) =>
    candidate({
      localHour: 8,
      prefs: emailPrefsFrom(null, "wordday"),
      ...over,
    });

  it("does not go to somebody who never asked for it", () => {
    expect(letterOwed(candidate({ localHour: 8, hasErrand: false }), NOW)?.kind).not.toBe("wordday");
  });

  it("goes in the morning once it has been asked for", () => {
    // `hasErrand: false` closes the errand branch, which owns the same window.
    expect(letterOwed(asked({ hasErrand: false }), NOW)?.kind).toBe("wordday");
  });

  it("still reaches somebody who has walked away from the course", () => {
    /*
      The reason `worddayOwed` is called in two places. The away branch returns
      rather than falling through, deliberately and at length, so without the
      second call the people the letter is actually for, somebody who stopped
      the course and still likes the language, would be the one group never
      sent one.
    */
    const gone = asked({ lastReviewAt: daysAgo(90), lastSent: new Map([["comeback", hoursAgo(4)]]) });
    expect(letterOwed(gone, NOW)?.kind).toBe("wordday");
  });

  it("gives way to anything that is actually about the course", () => {
    const both = asked({ milestoneReached: "A1", localHour: 9 });
    expect(letterOwed(both, NOW)?.kind).toBe("milestone");
  });

  it("does not spend the weekly ceiling and is not stopped by it", () => {
    expect(letterOwed(asked({ hasErrand: false, sentThisWeek: MAX_PER_WEEK + 2 }), NOW)?.kind)
      .toBe("wordday");
  });
});

describe("the date they set", () => {
  /** Early afternoon, mid-window on a deadline they gave. */
  const facing = (over: Partial<Candidate> = {}) =>
    candidate({ localHour: 12, deadlineWeeks: 9, ...over });

  it("goes out inside the window", () => {
    expect(letterOwed(facing(), NOW)?.kind).toBe("deadline");
  });

  it("says nothing with no date set", () => {
    expect(letterOwed(facing({ deadlineWeeks: null }), NOW)?.kind).not.toBe("deadline");
  });

  it("says nothing once there is no lever left to pull", () => {
    /*
      Both ends of the window are the argument rather than a tidy range.
      Nobody changes a pace with a fortnight to go, so a letter that arrives
      there is the post-mortem the letter exists not to be.
    */
    expect(letterOwed(facing({ deadlineWeeks: DEADLINE_WEEKS_MIN - 1 }), NOW)?.kind).not.toBe("deadline");
    expect(letterOwed(facing({ deadlineWeeks: DEADLINE_WEEKS_MAX + 1 }), NOW)?.kind).not.toBe("deadline");
    // Unrounded at both edges: 24.6 days is not four weeks, and 16.4 weeks is past sixteen.
    expect(letterOwed(facing({ deadlineWeeks: 24.6 / 7 }), NOW)?.kind).not.toBe("deadline");
    expect(letterOwed(facing({ deadlineWeeks: 16.4 }), NOW)?.kind).not.toBe("deadline");
  });

  it("gives way to news, which is what the order says", () => {
    expect(letterOwed(facing({ shieldSpent: "2026-09-14", localHour: 9 }), NOW)?.kind).toBe("shield");
  });
});
