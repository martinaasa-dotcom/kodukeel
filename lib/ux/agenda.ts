/**
 * WHAT IS DUE, GROUPED BY WHEN.
 *
 * Today's task panel was a list of four, ordered by date, with the date printed
 * small on each row. That is a correct list and it is not an answer to the
 * question somebody opens this page with, which is "what do I have to do
 * today". Reading it meant reading four dates and doing the arithmetic on each,
 * and the one that was already late looked exactly like the one due on Friday.
 *
 * So the arithmetic is done here, once, and the panel prints headings. Overdue
 * first, because an overdue thing is the only kind that gets worse while you
 * look at it.
 *
 * IT TAKES A CLOCK, IT DOES NOT CALL ONE. "Due today" is a question about the
 * learner's own midnight, and every day-shaped figure in this app that reached
 * for the process's own clock has been wrong for anybody outside the
 * deployment's zone. See `lib/time/day.ts` for what that cost the streak.
 *
 * Pure: rows and a clock in, groups out. No React, no Prisma, no clock of its
 * own.
 */

import type { DayClock } from "@/lib/time/day";

export type Bucket = "overdue" | "today" | "tomorrow" | "week" | "later" | "undated";

/** The heading each bucket prints, and the order they print in. */
export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "Late",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
  undated: "No date",
};

const ORDER: readonly Bucket[] = ["overdue", "today", "tomorrow", "week", "later", "undated"];

/**
 * WHAT KIND OF WORK A TASK IS, AND THERE ARE TWO.
 *
 * This was written down in four places and no two agreed. The schema's comment
 * said `HOMEWORK | VOCABULARY`; `docs/04-data-model.md` said the same;
 * `components/TaskRow.tsx` kept a label table of five, adding GRAMMAR,
 * LISTENING and SPEAKING; and `scripts/demo-data.ts` wrote three of those five.
 * Two of the app's own actions write a tag and between them they write exactly
 * two values, so the other three were a kind of task a deployment cannot
 * produce, shown in the fixture that every screenshot and every browser suite
 * renders.
 *
 * They are the remains of the `/tasks` page, which was cut in the eighteenth
 * pass along with the calendar beside it. What stays is one card on Today for
 * work a teacher assigns, and a teacher assigns homework or a unit's words.
 *
 * One table, read by the row that draws it and by the fixture that seeds it, so
 * a third kind cannot arrive in one and not the other.
 */
export const TASK_TAGS: Readonly<Record<string, string>> = {
  HOMEWORK: "Homework",
  VOCABULARY: "Vocabulary",
};

export interface AgendaGroup<T> {
  bucket: Bucket;
  label: string;
  items: T[];
}

/**
 * A due date that is a date rather than a moment.
 *
 * Every writer stores a date-only due date at midnight UTC: `<input
 * type="date">` gives a day, and both the reminder form and a teacher's
 * homework write it as `YYYY-MM-DDT00:00:00Z`. Read as an instant, that is the
 * evening before anywhere west of Greenwich, so a learner in Toronto saw
 * homework due the 25th filed under today on the 24th, read "Late" all of the
 * 25th, and printed as the 24th, while the calendar, which reads the date off
 * the key, put it on the 25th. No single instant fixes it: noon UTC is still
 * the 24th at UTC-12 and already the 26th in Auckland. So a value at midnight
 * UTC to the millisecond is read as the day it names, and anything else is a
 * genuine instant and is read as one.
 */
export function isDateOnly(dueAt: Date): boolean {
  return dueAt.getUTCHours() === 0 && dueAt.getUTCMinutes() === 0
    && dueAt.getUTCSeconds() === 0 && dueAt.getUTCMilliseconds() === 0;
}

/**
 * How to print a due date: the day it names for a date-only value, which is
 * that day in UTC whatever zone the reader is in, and the reader's own day for
 * an instant.
 */
export function dueDateOptions(dueAt: Date): Intl.DateTimeFormatOptions {
  return isDateOnly(dueAt)
    ? { day: "numeric", month: "short", timeZone: "UTC" }
    : { day: "numeric", month: "short" };
}

/** Whole days from the learner's today to the day a task is due. */
function daysUntil(dueAt: Date, clock: DayClock, now: Date): number {
  if (!isDateOnly(dueAt)) return clock.daysBetween(now, dueAt);
  const [y, m, d] = clock.dayKey(now).split("-").map(Number);
  const today = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return Math.round((dueAt.getTime() - today) / 86_400_000);
}


/** Which heading one due date belongs under. */
export function bucketFor(dueAt: Date | null, clock: DayClock, now: Date): Bucket {
  if (!dueAt) return "undated";
  const days = daysUntil(dueAt, clock, now);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  // Seven days rather than "until Sunday": somebody opening this on a Saturday
  // is asking about the week in front of them, not the two days left of the one
  // behind them.
  if (days <= 7) return "week";
  return "later";
}

/** How a caller gets a due date out of whatever it is holding. */
export type DueOf<T> = (item: T) => Date | null;

/**
 * Rows under headings, in reading order, with the empty headings left out.
 *
 * It takes an accessor rather than insisting on a `dueAt` field, because the
 * one caller that matters is holding `TaskView`, whose `dueAt` is the ISO
 * string a client component can be handed. Making the row fit the function
 * meant carrying the same date twice under two names.
 *
 * `limit` caps the rows rather than the groups, because a panel with room for
 * five rows should spend them on the five most urgent things and not on one row
 * from each of five headings.
 */
export function agenda<T>(
  items: readonly T[],
  due: DueOf<T>,
  clock: DayClock,
  now: Date,
  limit = Number.POSITIVE_INFINITY,
): AgendaGroup<T>[] {
  const sorted = [...items].sort((a, b) => {
    const rank = ORDER.indexOf(bucketFor(due(a), clock, now)) - ORDER.indexOf(bucketFor(due(b), clock, now));
    if (rank !== 0) return rank;
    const [x, y] = [due(a), due(b)];
    return x && y ? x.getTime() - y.getTime() : 0;
  });

  const groups = new Map<Bucket, T[]>();
  for (const item of sorted.slice(0, limit)) {
    const bucket = bucketFor(due(item), clock, now);
    groups.set(bucket, [...(groups.get(bucket) ?? []), item]);
  }

  return ORDER.flatMap((bucket) => {
    const found = groups.get(bucket);
    return found?.length ? [{ bucket, label: BUCKET_LABEL[bucket], items: found }] : [];
  });
}

/** How many of these are already late. The one count a panel heading is worth spending. */
export function overdueCount<T>(items: readonly T[], due: DueOf<T>, clock: DayClock, now: Date): number {
  return items.filter((i) => bucketFor(due(i), clock, now) === "overdue").length;
}
