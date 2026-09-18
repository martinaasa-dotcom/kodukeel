/*
  WHO IS OWED A LETTER, AND THE FOUR THINGS THAT STOP ONE.

  Pure, and separate from the run that sends, because this is the part with the
  judgment in it and the part that has to be driveable over a year of made-up
  days without a database. A decision about somebody's inbox that can only be
  tested by sending them something is a decision nobody tests.

  THE ORDER IS A PRIORITY, NOT A LIST. At most one letter goes out per learner
  per run, and where two are owed the more specific one wins. Somebody who has
  been away a fortnight and whose Sunday summary is also due gets the one about
  coming back, because two letters on one morning from an app they have not
  opened is how a sender becomes spam.

  THE FOUR GATES, IN THE ORDER THEY ARE CHEAPEST TO ASK.

  Do they want it. The stored preference, and `system` is not reachable here at
  all: nothing in this module sends one.

  Is there an address to send to, and has it bounced. An address that hard
  bounced is one a deployment must stop mailing, because continuing to is what
  a mailbox provider reads as not caring, and it costs the sign-in links too.

  Have they had this one recently. Every kind carries its own minimum gap, and
  the run reads the send log rather than a counter. This is the gate that
  survives two cron runs overlapping, a retry after a timeout, and a deployment
  whose schedule somebody set to hourly.

  And is it the right moment, which is the only one with any thought in it.

  NOTHING HERE READS A CLOCK OR A DATABASE. Everything arrives as an argument,
  including `now`, which is the same discipline `grade()` takes for the same
  reason: a decision that reads the wall clock is a decision that behaves
  differently at 23:59 and cannot be driven over a fortnight in a unit test.
*/
import type { EmailKind } from "./letter";
import { wants, type EmailPrefs } from "./prefs";

/**
 * The least time between two letters of one kind, in hours.
 *
 * `tonight` is 20 rather than 24 so that an evening reminder is not pushed an
 * hour later every day by the run that sent yesterday's, which is what a flat
 * 24 does to a daily letter and which walks it out of the evening inside a
 * fortnight.
 *
 * `comeback` is a fortnight. It is the letter most likely to be the last one
 * somebody reads before deciding they are done with an app, so it is the one
 * that must not arrive twice in a month.
 */
export const MIN_GAP_HOURS: Readonly<Record<EmailKind, number>> = {
  system: 0,
  welcome: 24 * 365,
  tonight: 20,
  comeback: 24 * 14,
  weekly: 24 * 6,
};

/**
 * The most letters one learner gets in a week, whatever is owed.
 *
 * A ceiling over the per-kind gaps rather than a replacement for them: the
 * gaps stop one kind repeating and this stops the kinds adding up. Five is a
 * daily reminder on the weekdays somebody has missed, plus the Sunday
 * summary, and there is no week in which more than that is anybody's idea of
 * a course reminding them of itself.
 */
export const MAX_PER_WEEK = 5;

/** Days away before the coming-back letter is the right one. */
export const AWAY_DAYS = 6;

/** What the run knows about one learner when it decides. */
export interface Candidate {
  readonly ownerId: string;
  readonly email: string | null;
  /** Set where the address has hard bounced or the person marked one as spam. */
  readonly undeliverable: boolean;
  readonly prefs: EmailPrefs;
  /** Their own clock, since "already had one today" is their today. */
  readonly dayKey: string;
  /** The hour where they are, 0 to 23, for the evening letter. */
  readonly localHour: number;
  /** The hour they asked to be reminded at, or null where they never said. */
  readonly reminderHour: number | null;
  /** 0 is Sunday, matching `Date.getUTCDay`, read on their clock. */
  readonly localWeekday: number;
  /** When each kind last went out. Absent means never. */
  readonly lastSent: ReadonlyMap<EmailKind, Date>;
  /** Letters in the last seven days, all kinds. */
  readonly sentThisWeek: number;
  /** When they last graded a card. Null where they never have. */
  readonly lastReviewAt: Date | null;
  /** When they finished first run, which is what a welcome answers. */
  readonly onboardedAt: Date | null;
  /** Whether they have a course to be reminded about at all. */
  readonly hasProgramme: boolean;
  /** Whether tonight's evening is already finished, on their clock. */
  readonly finishedToday: boolean;
}

export interface Decision {
  readonly kind: EmailKind;
  /** Why, in one line, for the run's own log. Never sent to anybody. */
  readonly because: string;
}

const hoursBetween = (a: Date, b: Date): number => Math.abs(a.getTime() - b.getTime()) / 3_600_000;

const daysSince = (from: Date | null, now: Date): number | null =>
  from === null ? null : Math.floor((now.getTime() - from.getTime()) / 86_400_000);

/** Whether this kind is far enough from the last one of its kind. */
function gapClear(who: Candidate, kind: EmailKind, now: Date): boolean {
  const last = who.lastSent.get(kind);
  return last === undefined || hoursBetween(now, last) >= MIN_GAP_HOURS[kind];
}

/**
 * The one letter this learner is owed, or null.
 *
 * `null` is the ordinary answer and by a long way the commonest one. Most
 * learners on most runs are owed nothing, because they studied, or they
 * already had today's, or it is the wrong hour where they are.
 */
export function letterOwed(who: Candidate, now: Date): Decision | null {
  if (!who.email || who.undeliverable) return null;
  if (who.sentThisWeek >= MAX_PER_WEEK) return null;

  /*
    THE WELCOME, FIRST AND ONCE.

    Held back a little rather than sent the instant first run ends, because
    somebody who has just finished the wizard is looking at the app and does
    not need a letter about it; what they need is the letter that arrives
    after they have closed the tab. An hour is enough for that and short
    enough that it is still plainly about the thing they just did.
  */
  if (
    who.onboardedAt &&
    wants(who.prefs, "welcome") &&
    gapClear(who, "welcome", now) &&
    hoursBetween(now, who.onboardedAt) >= 1 &&
    hoursBetween(now, who.onboardedAt) <= 48
  ) {
    return { kind: "welcome", because: "finished first run and has not been welcomed" };
  }

  /*
    COMING BACK, WHICH OUTRANKS BOTH OF THE ROUTINE LETTERS.

    Somebody this far away is not going to read a summary of a week they were
    not in, and a nudge about tonight's evening assumes a course they have
    stepped out of. Whichever of the two was owed, this is the one to send.
  */
  const away = daysSince(who.lastReviewAt, now);
  if (away !== null && away >= AWAY_DAYS) {
    /*
      AND BEING AWAY IS A STATE, NOT A MOMENT, WHICH IS THE HALF THIS GOT
      WRONG FIRST.

      Written as one more branch above the others, it sent the comeback and
      then, once its fortnight gap had closed, fell straight through to the
      evening nudge: somebody three weeks gone who had already ignored one
      letter got "Tonight is five new words" every evening after it. That is
      the nagging this whole module is written not to do, the content is a lie
      besides, since it describes an evening in a course they stepped out of,
      and it is precisely the pattern a mailbox provider reads as a sender who
      is not listening.

      So the branch returns either way. Somebody who is away gets the one
      letter about coming back, and then silence until they do. The silence is
      the respectful answer and it is also the one that keeps the sign-in links
      landing in an inbox rather than in a spam folder.
    */
    return wants(who.prefs, "comeback") && gapClear(who, "comeback", now)
      ? { kind: "comeback", because: `no review in ${away} days` }
      : null;
  }

  /*
    THE SUNDAY SUMMARY.

    Read on the learner's own weekday and sent in the morning where they are,
    because a week's summary arriving on Sunday night is a summary of a week
    that has ended, handed to somebody who cannot act on it until Monday.
  */
  if (
    who.localWeekday === 0 &&
    who.localHour >= 9 &&
    who.localHour < 12 &&
    who.lastReviewAt !== null &&
    wants(who.prefs, "weekly") &&
    gapClear(who, "weekly", now)
  ) {
    return { kind: "weekly", because: "Sunday morning where they are" };
  }

  /*
    AND THE EVENING NUDGE, WHICH IS THE ONE THE WHOLE SYSTEM IS FOR.

    Four conditions and every one of them is a way it would otherwise be
    unwelcome. There has to be a course to be reminded about. Tonight has to
    be unfinished, or the letter is congratulating somebody on work it is
    asking them to do. It has to be their evening rather than the server's,
    which is the whole argument `lib/time/reminder.ts` makes at length about
    the calendar file. And it waits until the hour they picked: somebody who
    asked for 18:00 and hears from us at 14:00 has been reminded at a moment
    they cannot act on, which is the reminder teaching them to ignore it.

    The window closes at 22:00 rather than running to midnight. A study
    reminder that arrives at half past eleven is asking somebody to start a
    course at half past eleven, and the honest answer at that hour is to say
    nothing and let tomorrow's letter ask properly.
  */
  const hour = who.reminderHour ?? 18;
  if (
    who.hasProgramme &&
    !who.finishedToday &&
    who.localHour >= hour &&
    who.localHour < 22 &&
    wants(who.prefs, "tonight") &&
    gapClear(who, "tonight", now)
  ) {
    return { kind: "tonight", because: `evening where they are, and tonight is unfinished` };
  }

  return null;
}
