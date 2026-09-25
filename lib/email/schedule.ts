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

  NEWS BEFORE ASKS. A milestone and a spent shield report something that has
  already happened; the rest want something. Those two go first wherever both
  are owed, because somebody who has just finished A1 should be told about A1
  rather than about tonight, and the thing that can wait is the thing that
  asks. The word of the day is the other way round again and sits at the
  bottom: it asks for nothing, so it is never the thing that had to go today.

  AND TWO OF THEM ARE NOT ABOUT THE READER'S OWN EVENINGS. The register goes
  to somebody about a group they run, and the word goes to somebody who asked
  for a word. Both sit outside the weekly ceiling and both are placed against
  the coming-back branch deliberately rather than by where they happen to
  fall: see `UNCAPPED`, the classroom branch, and `worddayOwed`.

  THE GATES, IN THE ORDER THEY ARE CHEAPEST TO ASK.

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
import type { Stage } from "@/lib/ux/disclosure";

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
  /*
    ONCE A WEEK, AND IT IS THE BIGGEST ASK IN THE APP.

    Every other letter asks somebody to open a tab. This one asks them to say
    something out loud to a stranger, which for most people learning a language
    is the hardest thing on the list and the reason they are learning it. A
    daily version of it would be a daily reminder that they are not doing the
    frightening thing, which is how somebody decides an app is not on their
    side.
  */
  errand: 24 * 6,
  /*
    A DAY, AND THE GAP IS NOT WHAT KEEPS EITHER OF THESE FROM REPEATING.

    A milestone happens five times in a learner's whole time here and a shield
    covers a particular day once. What stops a second letter about the same
    news is the high-water mark each of them carries, not a clock: a gap alone
    would announce A1 again next week, and a mark alone would be fine except
    that a run which crashed between sending and writing it should not manage
    two in one morning. So both, and the day is the belt.
  */
  milestone: 24,
  shield: 24,
  /*
    A MONTH, INSIDE A WINDOW THAT IS ITSELF ONLY A COUPLE OF MONTHS WIDE.

    So at most two of these exist per deadline, which is the whole of what the
    letter is for: a decision somebody made in ninety seconds during first run,
    put back in front of them twice while every lever still works, rather than
    a countdown that arrives every week and teaches them to stop reading.
  */
  deadline: 24 * 30,
  /*
    A WEEK, AND IT IS A DIGEST RATHER THAN A REMINDER.

    Weekly is the rhythm a register is read on. A daily version would be a
    daily report on other people's homework, which is a different and worse
    thing than a weekly one.
  */
  classroom: 24 * 6,
  /*
    TWENTY HOURS, FOR THE REASON `tonight` IS TWENTY.

    A flat twenty-four on a daily letter is pushed an hour later every day by
    the run that sent yesterday's, which walks a morning word out of the
    morning inside a fortnight.
  */
  wordday: 20,
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

/**
 * The kinds the weekly ceiling is not about.
 *
 * The ceiling exists so that the letters asking somebody to study do not add
 * up into a course nagging them, and neither of these is one of those.
 * `wordday` is off by default and asks for nothing at all, so counting it
 * would let a gift somebody went and switched on crowd out the reminders they
 * never had to; `classroom` is about a group rather than about the reader's
 * own evenings, and a teacher who is also a learner should not lose their
 * register because they had a diligent week.
 *
 * Each of them still has its own gap, which is what actually bounds how often
 * either arrives.
 */
export const UNCAPPED: readonly EmailKind[] = ["wordday", "classroom"];

/** Days away before the coming-back letter is the right one. */
export const AWAY_DAYS = 6;

/**
 * Conversations in the last month at or under which the errand is worth
 * sending.
 *
 * The trigger is not "they have not done an errand", it is that the one number
 * this app says it is measured by is flat for this person. Somebody already
 * speaking Estonian to people does not need to be sent out, and a nudge to do
 * a thing they are plainly already doing is the app not looking at its own
 * data.
 *
 * Two rather than nought, because one conversation in a month is nearer to
 * none than to a habit, and the letter is written to be welcome to the person
 * who has had one.
 */
export const QUIET_CONVERSATIONS = 2;

/**
 * The window, in weeks left, where the letter about somebody's own deadline is
 * worth sending.
 *
 * Both ends are the argument. Closer than `DEADLINE_WEEKS_MIN` and there is no
 * lever left to pull, so the letter degrades into the post-mortem its own
 * header says it must not be: nobody changes a pace with a fortnight to go.
 * Further out than `DEADLINE_WEEKS_MAX` and it is a letter about something
 * that has not started mattering, which is how a reader learns that this
 * sender writes about nothing.
 *
 * A quarter wide, against a gap of a month, so at most two of these exist per
 * deadline and the second one only reaches somebody who did not act on the
 * first.
 */
export const DEADLINE_WEEKS_MIN = 4;
export const DEADLINE_WEEKS_MAX = 16;

/** What the run knows about one learner when it decides. */
export interface Candidate {
  readonly ownerId: string;
  readonly email: string | null;
  /**
   * Whether the address this run is about to write to has already bounced.
   *
   * A boolean rather than the stored value, and resolved by the run rather
   * than by the gathering, because the question is about an *address* and only
   * the run has one: `lib/email/webhook.ts` stores which address failed so
   * that somebody who changes theirs can be written to again, and comparing
   * the two needs both halves in the same place.
   */
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
  /**
   * Letters in the last seven days, counting the kinds the ceiling is about.
   *
   * `UNCAPPED` kinds are left out by the gathering rather than subtracted
   * here, because a word a day is seven of them and a count that included
   * those would spend the whole ceiling on a letter that is exempt from it,
   * silencing every reminder for anybody who switched the word on.
   */
  readonly sentThisWeek: number;
  /** When they last graded a card. Null where they never have. */
  readonly lastReviewAt: Date | null;
  /** When they finished first run, which is what a welcome answers. */
  readonly onboardedAt: Date | null;
  /**
   * Whether they have started a course to be reminded about: at least one step
   * ticked. A programme merely offered off their level is not one they chose.
   */
  readonly startedCourse: boolean;
  /**
   * Whether an evening was already finished today, on their clock, including
   * one followed by a start on the next module.
   */
  readonly finishedToday: boolean;
  /**
   * How far in they are, as `lib/ux/disclosure.ts` decides it.
   *
   * Read from there rather than compared against a number here, which is that
   * module's own rule and an invariant: a second answer to "has this learner
   * started yet" is how the first one rots. The errand letter is for `settled`
   * alone.
   */
  readonly stage: Stage;
  /** Conversations reported in the last thirty days. */
  readonly conversations: number;
  /**
   * A level whose words the scheduler has graduated and which no letter has
   * mentioned, or null.
   *
   * Resolved by the gathering rather than decided here, because "new" is a
   * comparison against a stored mark and this module reads nothing. Null is by
   * far the commonest answer: five of these exist per learner, ever.
   */
  readonly milestoneReached: string | null;
  /**
   * A day a banked shield covered that no letter has mentioned, or null.
   */
  readonly shieldSpent: string | null;
  /**
   * Whether the errand pool has anything in it for them.
   *
   * An errand is offered only over the units a deck has started, because
   * "order a coffee" to somebody who has not met the word is a dare rather
   * than a task. Two errands need only greetings, so this is false only for
   * somebody with no deck at all.
   */
  readonly hasErrand: boolean;
  /**
   * Whether they run a group with anybody in it.
   *
   * A boolean, because this module decides which letter and never which
   * group: the run resolves the group again when it gathers, and a classroom
   * id sitting on a decision is an id that could be sent to somebody by a
   * later branch that did not read this comment.
   */
  readonly runsGroup: boolean;
  /**
   * Whole weeks until the date they set themselves, or null where they set
   * none or it has already passed.
   *
   * Past is null rather than negative, because a deadline already gone is its
   * own verdict and `lib/assessment/plan.ts` says so on the screen; a letter
   * about it would be the post-mortem the letter exists not to be.
   */
  readonly deadlineWeeks: number | null;
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
 * The three gates that are the same question for every kind: do they want it,
 * has it been long enough, and is the week already full.
 *
 * One function rather than three clauses per branch, because the weekly
 * ceiling stopped being a single early return the moment two kinds were
 * exempt from it, and eleven copies of a three-part condition is where one of
 * them comes to be missing a part.
 */
function allowed(who: Candidate, kind: EmailKind, now: Date): boolean {
  if (!wants(who.prefs, kind)) return false;
  if (!UNCAPPED.includes(kind) && who.sentThisWeek >= MAX_PER_WEEK) return false;
  return gapClear(who, kind, now);
}

/**
 * The word, which is checked in two places and is the reason that is not a
 * mistake.
 *
 * It sits at the bottom of the priority order, below everything that is about
 * the course, and it is also the one letter somebody who has walked away from
 * the course may still be glad of: the coming-back branch returns rather than
 * falling through, deliberately and at length, so without this the people the
 * word letter's own header says it is for would be the one group never sent
 * one. So the away branch ends here instead of at null.
 */
function worddayOwed(who: Candidate, now: Date): Decision | null {
  return who.localHour >= 7 && who.localHour < 10 && allowed(who, "wordday", now)
    ? { kind: "wordday", because: "morning where they are, and they asked for it" }
    : null;
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
    allowed(who, "welcome", now) &&
    hoursBetween(now, who.onboardedAt) >= 1 &&
    hoursBetween(now, who.onboardedAt) <= 48
  ) {
    return { kind: "welcome", because: "finished first run and has not been welcomed" };
  }

  /*
    THE REGISTER, AND IT IS ABOVE THE COMING-BACK LETTER FOR ONE REASON.

    Every other branch below this point is about the reader's own evenings, so
    every one of them is correctly silenced by their having stepped away from
    the course. This one is not about their course at all. A teacher who has
    not opened their own deck in a fortnight is still running a class that
    met on Tuesday, and answering their Monday register with "we have not seen
    you in a while" is the app mistaking one of its readers for the other.

    Monday, because that is the morning somebody plans a week on. Sunday
    belongs to the learner's own summary, and the two arriving together is
    exactly what the weekly ceiling exists to stop, except that this one is
    not under the ceiling, so the day is what keeps them apart.
  */
  if (
    who.runsGroup &&
    who.localWeekday === 1 &&
    who.localHour >= 7 &&
    who.localHour < 11 &&
    allowed(who, "classroom", now)
  ) {
    return { kind: "classroom", because: "Monday morning, and they run a group" };
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
    return allowed(who, "comeback", now)
      ? { kind: "comeback", because: `no review in ${away} days` }
      : worddayOwed(who, now);
  }

  /*
    NEWS BEFORE HOMEWORK, AND BOTH OF THESE ARE NEWS.

    A milestone and a spent shield are the only two letters here that report
    something that has already happened rather than asking for something. They
    sit above the errand and above the Sunday summary for that reason: a
    learner who has just finished A1 and is also due a summary should be told
    about A1, and the summary keeps until next week.

    They are morning letters because they are worth reading over coffee and
    because neither is a thing to act on. The window is the errand's, and the
    gathering does the extra reads for all three at once rather than three
    times.

    THE MILESTONE FIRES ON GRADUATED WORDS, WHICH IS WHAT KEEPS IT FROM BEING A
    PARTICIPATION TROPHY. A card reaches Review state days after it was met and
    only by being recalled, so this cannot be run up by opening the app or by
    ticking evenings, and the letter says so. It also means the letter arrives
    days after the evening that earned it, which is a thing to admit rather
    than paper over.
  */
  if (
    who.milestoneReached !== null &&
    who.localHour >= 8 &&
    who.localHour < 11 &&
    allowed(who, "milestone", now)
  ) {
    return { kind: "milestone", because: `graduated the words of ${who.milestoneReached}` };
  }

  /*
    AND THE SHIELD, WHICH IS A NOTIFICATION RATHER THAN A CELEBRATION.

    This app banks a shield at seven, thirty and a hundred days and spends one
    silently to cover a missed day. Until this letter the learner had no way of
    knowing any of that happened: something they earned was used on their
    behalf and nothing said so, which is the shape of thing an app should tell
    somebody about whether or not it is good news.
  */
  if (
    who.shieldSpent !== null &&
    who.localHour >= 8 &&
    who.localHour < 11 &&
    allowed(who, "shield", now)
  ) {
    return { kind: "shield", because: `a shield covered ${who.shieldSpent}` };
  }

  /*
    THE DATE THEY SET, WHICH IS NEWS AND AN ASK AT ONCE.

    Below the two that are only news, because a milestone is worth a morning
    of its own, and above the summary and the errand, because it fires at most
    twice per deadline where those fire every week: the rarer letter is the one
    that cannot wait for next week's slot.

    Not Sunday and not the errand's morning, which is the same reason twice:
    those two already own a morning each, and this letter has a quarter of the
    year to land in and no reason at all to take one of them.
  */
  if (
    who.deadlineWeeks !== null &&
    who.deadlineWeeks >= DEADLINE_WEEKS_MIN &&
    who.deadlineWeeks <= DEADLINE_WEEKS_MAX &&
    who.localWeekday !== 0 &&
    who.localHour >= 11 &&
    who.localHour < 15 &&
    allowed(who, "deadline", now)
  ) {
    return { kind: "deadline", because: `${who.deadlineWeeks} weeks until the date they set` };
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
    allowed(who, "weekly", now)
  ) {
    return { kind: "weekly", because: "Sunday morning where they are" };
  }

  /*
    THE ERRAND, IN THE MORNING, AND ONLY WHERE THE APP'S OWN NUMBER IS FLAT.

    This is the letter the purpose rests on and the one most easily resented.
    `docs/22-real-life.md` says the app is to be left and that a conversation
    outside it is the number it is measured by; that number is collected on
    Today and acted on nowhere, so somebody who never opens Today is never
    asked to leave.

    Four conditions, and each of them is a way it would otherwise be the wrong
    letter to somebody.

    THE MORNING, because an errand is done during a day. A letter at nine in
    the evening saying to go and buy bread is a letter about tomorrow, and by
    tomorrow it is gone. The window closes at eleven for the same reason it
    opens at eight: an errand needs a day in front of it.

    NOT SUNDAY, which is the summary's morning. Two letters on one morning is
    what the weekly ceiling exists to stop, and of the two the summary is the
    one that has to land on the day it is about.

    `settled` ONLY, through `stageOf` rather than a number of our own. Somebody
    three days in has met thirty words, and "say one thing to a stranger today"
    to them is a dare rather than a task: it is the false confidence the
    readiness screen is built against, arriving by post. The errand pool is
    already narrowed to the units their deck has started, which is the same
    argument one level down, and `hasErrand` is what says the pool is not empty.

    AND THE NUMBER HAS TO BE FLAT. Somebody already speaking Estonian to people
    does not need sending out, and being told to by an app that can see they
    are already doing it is the app not reading its own data.
  */
  if (
    who.localWeekday !== 0 &&
    who.localHour >= 8 &&
    who.localHour < 11 &&
    who.stage === "settled" &&
    who.hasErrand &&
    who.conversations <= QUIET_CONVERSATIONS &&
    allowed(who, "errand", now)
  ) {
    return { kind: "errand", because: `${who.conversations} conversations in the window` };
  }

  /*
    AND THE EVENING NUDGE, WHICH IS THE ONE THE WHOLE SYSTEM IS FOR.

    Four conditions and every one of them is a way it would otherwise be
    unwelcome. There has to be a course they started, not one merely offered
    off their level: every letter is about an evening somebody chose. Tonight has to
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
    who.startedCourse &&
    !who.finishedToday &&
    who.localHour >= hour &&
    who.localHour < 22 &&
    allowed(who, "tonight", now)
  ) {
    return { kind: "tonight", because: `evening where they are, and tonight is unfinished` };
  }

  return worddayOwed(who, now);
}
