"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button } from "@/components/Button";
import { Card, SectionTitle } from "@/components/ui";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { addReminder, addStudyEvent, deleteReminder, deleteStudyEvent } from "@/app/actions";
import {
  EVENT_KINDS, KIND_LABEL, KIND_TONE, WEEKDAY_LONG, WEEKDAY_SHORT,
  eventsOn, repeatLabelIn, spanIn, weekdayOf, type EventKind, type StudyEvent,
} from "@/lib/ux/schedule";
import { NOT_REACHED } from "@/lib/copy/values";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill, type Locale } from "@/lib/copy/locale";

export interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  dueKey: string | null;
  completed: boolean;
  mine: boolean;
}

/**
 * A week, one column per day, with a form under it.
 *
 * A WEEK RATHER THAN A MONTH, and that is the whole layout decision. What a
 * learner asked this for is "class on Monday and Wednesday, homework on Tuesday
 * and Thursday", which is a question about a week; a month grid answers "what
 * is the 14th" instead, and it cannot show a time without a cell so small
 * nothing fits in it. A week also survives a phone, where a month does not: the
 * columns stack.
 *
 * Times are minutes from midnight and are drawn as written text rather than as
 * a positioned grid of hours. An hour grid is what a desktop calendar draws and
 * it needs the height of a screen to be readable; this is a list per day, which
 * says the same thing in the space a phone has.
 */
export function CalendarWeek({
  days, today, offset, events, reminders,
}: {
  days: string[];
  today: string;
  offset: number;
  events: StudyEvent[];
  reminders: Reminder[];
}) {
  /*
    WHICH BUTTON OPENED IT, NOT WHETHER ONE DID.

    The panel is one form for both shapes and that is still the right call: a
    learner adding "class, Mondays, six o'clock" and one adding "hand in the
    essay on Friday" are doing the same thing. What was wrong was the door.
    There was one button and it said "Add to this week", so somebody looking
    for a task or a reminder saw neither word anywhere on the screen and
    reported the calendar as having no way to add one. Both words are on the
    second button, because they are the same row (`Task`) under two names and
    which one somebody reaches for is not ours to decide.

    So two buttons onto one form, each landing it on the right kind. `null`
    means the form is closed.
  */
  const t = useT();
  const locale = useLocale();
  const [adding, setAdding] = useState<EventKind | "REMINDER" | null>(null);

  return (
    <>
      <Card tone="night">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle hint={weekLabel(days, offset, locale, t)}>{t("This week")}</SectionTitle>
          <div className="flex items-center gap-2">
            <WeekStep to={offset - 1} label={t("Previous week")}><ChevronLeft size={16} aria-hidden /></WeekStep>
            {offset !== 0 && (
              <Link href="/calendar" className="tap-tint rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ color: "var(--accent-deep)" }}>
                {t("Today")}
              </Link>
            )}
            <WeekStep to={offset + 1} label={t("Next week")}><ChevronRight size={16} aria-hidden /></WeekStep>
          </div>
        </div>

        {/*
        SEVEN COLUMNS NEED THE WIDTH FOR SEVEN COLUMNS, and at 768 they do not
        have it. Measured: the week grid there gives each day card so little
        room that an event row comes out **17 pixels wide**, and the delete
        button inside it is 44, which is the tap-target floor and not
        negotiable, so the icon was drawn 13px outside the row it belongs to.
        `scripts/test-containment.mjs` failed on it four times over, at 768 in
        both passes and at 360 in both themes.

        A week is a list of days before it is a grid of them, so below the
        width where the grid is honest it stays a list, which is what a phone
        already showed. 1280 is where seven columns first leave room for a
        title beside the control: at 1024 the row is 55px and the button and
        its gap take 50 of them.
      */}
      {/*
        AND THE WIDTH THAT DECIDES IT IS THE CARD'S, NOT THE WINDOW'S. At 1280
        the window is wide and the column this card sits in is not: seven
        columns there were about a hundred pixels each and a two-word event
        wrapped down four lines. So the grid asks its own container, and a week
        in a normal column is a list of days, each a row with its date on the
        left and its events flowing beside it, which reads at every width.
      */}
      <div className="@container mt-4">
      <div className="grid gap-2 @min-[64rem]:grid-cols-7 @min-[64rem]:gap-1.5">
          {days.map((key) => (
            <DayColumn
              key={key}
              dayKey={key}
              isToday={key === today}
              events={eventsOn(events, key)}
              reminders={reminders.filter((r) => r.dueKey === key)}
            />
          ))}
        </div>
      </div>
      </Card>

      {adding ? (
        <AddPanel days={days} opensAs={adding} onDone={() => setAdding(null)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => setAdding("REMINDER")}>
            <BellPlus size={16} aria-hidden /> {t("Add a task or reminder")}
          </Button>
          {/*
            A reminder is a `Task`, which is the row Today already draws and
            `lib/ux/agenda.ts` already buckets, so a note written here lands
            where a teacher's assignment does rather than in a second list
            beside it. Which is exactly why it needs its own button: the two
            are one form and two different things to want.
          */}
          <Button variant="primary" size="lg" onClick={() => setAdding("CLASS")}>
            <CalendarPlus size={16} aria-hidden /> {t("Add a class or study slot")}
          </Button>
        </div>
      )}
    </>
  );
}

function WeekStep({ to, label, children }: { to: number; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={to === 0 ? "/calendar" : `/calendar?w=${to}`}
      aria-label={label}
      className="tap-tint flex min-h-11 min-w-11 items-center justify-center rounded-full"
      style={{ color: "var(--ink-2)" }}
    >
      {children}
    </Link>
  );
}

function DayColumn({ dayKey, isToday, events, reminders }: {
  dayKey: string; isToday: boolean; events: StudyEvent[]; reminders: Reminder[];
}) {
  const t = useT();
  const weekday = weekdayOf(dayKey);
  const empty = events.length === 0 && reminders.length === 0;
  const quiet = empty && !isToday;

  return (
    <div
      // A stable hook for the suite, because "the third div in the grid" is a
      // fact about today's markup and this page has several grids on it.
      data-day={dayKey}
      /*
        `min-w-0`, because a grid item's automatic minimum is its min-content
        and this card's min-content is the longest event title on it: a
        `truncate` paragraph is `white-space: nowrap`, and `overflow: hidden`
        clips what is drawn without reducing what the box asks for. So one long
        title made every day in the week 382px wide inside a 360px phone, and
        the `min-w-0` already on the text block could not help, since that
        floors a flex item rather than capping what the column is sized to.
        The same fault the shell had against `main`, one container in.
      */
      className={`flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-2 rounded-[var(--r)] border @min-[64rem]:block ${quiet ? "border-transparent px-3 py-1.5 @min-[64rem]:border-[var(--rule-soft)] @min-[64rem]:bg-[var(--surface)] @min-[64rem]:px-2 @min-[64rem]:py-2" : "p-3 @min-[64rem]:p-2"}`}
      style={{
        // An empty day in a list is a date and nothing else, so on a phone it
        // loses its box: seven boxes, five of them empty, read as a form.
        ...(quiet ? {} : {
          borderColor: isToday ? "var(--cta)" : "var(--rule-soft)",
          background: isToday ? "color-mix(in srgb, var(--cta) 12%, var(--surface))" : "var(--surface)",
          boxShadow: isToday ? "0 0 0 1px var(--cta), 0 12px 28px -16px var(--cta)" : undefined,
        }),
      }}
    >
      <p className="label-xs w-32 shrink-0 @min-[64rem]:w-auto" style={{ color: isToday ? "var(--cta)" : "var(--ink-3)" }}>
        {/* The short name is for a column, so it arrives with the columns. */}
        <span className="@min-[64rem]:hidden">{t(WEEKDAY_LONG[weekday] ?? "")}</span>
        <span className="hidden @min-[64rem]:inline">{t(WEEKDAY_SHORT[weekday] ?? "")}</span>{" "}
        {Number(dayKey.slice(8, 10))}
      </p>

      {!empty && (
        <ul
          className="grid min-w-[12rem] flex-1 gap-1.5 @min-[64rem]:mt-2"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 13rem), 1fr))" }}
        >
          {events.map((e) => <EventRow key={e.id} event={e} />)}
          {reminders.map((r) => <ReminderRow key={r.id} reminder={r} />)}
        </ul>
      )}

      {/* Said plainly rather than left blank: an empty column and a column that
          failed to load look the same, and on a phone the difference matters. */}
      {/* An empty day is a line with its date on it in a list, and an empty
          slot only where the week is drawn as columns. */}
      {empty && (
        <p className="mt-2 hidden h-6 rounded-[var(--r-sm)] border border-dashed @min-[64rem]:block" style={{ borderColor: "var(--rule-soft)" }} aria-hidden />
      )}
      {empty && <span className="sr-only">{t("Nothing")}</span>}
    </div>
  );
}

function EventRow({ event }: { event: StudyEvent }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <li
      className="rounded-[var(--r-sm)] px-2.5 py-2 @min-[64rem]:px-1.5 @min-[64rem]:py-1.5"
      style={{ background: `var(--${KIND_TONE[event.kind]}-soft)` }}
    >
      <p className="text-sm font-semibold leading-snug @min-[64rem]:text-xs" style={{ color: "var(--ink)" }}>{event.title}</p>
      {/* The remove button sits on the line under the title, so the title has
          the whole width of a column that is about ninety pixels wide. */}
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-2xs" style={{ color: "var(--ink-2)" }}>
          {spanIn(locale, event.startMinute, event.durationMinutes)}
        </p>
        <button
          type="button"
          aria-label={fill(t("Remove {title}"), { title: event.title })}
          disabled={pending}
          onClick={() => start(async () => {
            const landed = await deleteStudyEvent(event.id).then(() => true).catch(() => false);
            if (landed) router.refresh();
          })}
          className="tap-tint shrink-0 rounded-full p-1"
          style={{ color: "var(--ink-3)" }}
        >
          <Trash2 size={12} aria-hidden />
        </button>
      </div>
      {event.notes && <p className="mt-0.5 text-2xs" style={{ color: "var(--ink-3)" }}>{event.notes}</p>}
    </li>
  );
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const t = useT();
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <li className="rounded-[var(--r-sm)] px-2.5 py-2 @min-[64rem]:px-1.5 @min-[64rem]:py-1.5" style={{ background: "var(--raised)" }}>
      <p
        className="text-sm font-semibold leading-snug @min-[64rem]:text-xs"
        style={{
          color: reminder.completed ? "var(--ink-3)" : "var(--ink)",
          textDecoration: reminder.completed ? "line-through" : undefined,
        }}
      >
        {reminder.title}
      </p>
      <div className="flex items-center justify-between gap-1.5">
        {/*
          Plain text rather than a `Chip`, which the containment sweep caught
          bleeding 11px out of this row at 768px. A week column at that width
          is about ninety pixels and a chip is a padded inline-flex box with
          an intrinsic minimum: it cannot shrink into the space, so it hangs
          out of it. The row already says what it is by where it sits.

          Block rather than inline, and without the uppercase tracking the
          first attempt kept: an inline run still measured 2px over, because
          `min-w-0` lets the column shrink and does nothing about the text
          inside it. It wraps at its space rather than being cut off, since
          text a reader cannot see is not an answer to text that does not fit.
        */}
        <span
          className="block min-w-0 text-2xs font-semibold"
          style={{ color: reminder.completed ? "var(--good-ink)" : "var(--hard-ink)" }}
        >
          {t(reminder.completed ? "Done" : "To do")}
        </span>
        {reminder.mine && (
          <button
            type="button"
            aria-label={fill(t("Remove {title}"), { title: reminder.title })}
            disabled={pending}
            onClick={() => start(async () => {
              const landed = await deleteReminder(reminder.id).then(() => true).catch(() => false);
              if (landed) router.refresh();
            })}
            className="tap-tint shrink-0 rounded-full p-1"
            style={{ color: "var(--ink-3)" }}
          >
            <Trash2 size={12} aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * One form for both shapes, because a learner adding "class, Mondays, six
 * o'clock" and one adding "hand in the essay on Friday" are doing the same
 * thing and should not have to find two buttons for it.
 *
 * What tells them apart is whether any weekday is ticked: repeat days make it
 * an event, and no repeat days plus a date makes it a reminder unless a time
 * was given, in which case it is a one-off event. That is stated on the screen
 * rather than inferred silently.
 */
function AddPanel({ days, opensAs, onDone }: {
  days: string[];
  /** Which button opened it, so the form lands on what was asked for. */
  opensAs: EventKind | "REMINDER";
  onDone: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [kind, setKind] = useState<EventKind | "REMINDER">(opensAs);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("18:00");
  const [minutes, setMinutes] = useState(90);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [date, setDate] = useState(days[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const isReminder = kind === "REMINDER";

  const submit = () => {
    setError(null);
    start(async () => {
      const result = isReminder
        ? await addReminder({ title, dueAt: date }).catch(() => null)
        : await addStudyEvent({
            title,
            kind,
            startMinute: minuteOf(time),
            durationMinutes: minutes,
            weekdays,
            onDate: weekdays.length > 0 ? null : date,
          }).catch(() => null);
      if (!result) { setError(t(NOT_REACHED)); return; }
      if (!result.ok) {
        setError(t(("error" in result && result.error) || "That didn't save. Try again?"));
        return;
      }
      setTitle("");
      setWeekdays([]);
      router.refresh();
      onDone();
    });
  };

  return (
    <Card>
      <SectionTitle hint={t("classes, study slots, things due")}>
        {t(isReminder ? "Add a task or reminder" : "Add to your week")}
      </SectionTitle>

      <ChoiceGroup ariaLabel={t("What kind of thing")} className="mt-3 flex flex-wrap gap-2">
        {EVENT_KINDS.map((k) => (
          <ChoiceChip key={k} selected={kind === k} onSelect={() => setKind(k)}>
            {t(KIND_LABEL[k])}
          </ChoiceChip>
        ))}
        <ChoiceChip selected={isReminder} onSelect={() => setKind("REMINDER")}>{t("Task or reminder")}</ChoiceChip>
      </ChoiceGroup>

      <label className="mt-4 block">
        <span className="label-xs" style={{ color: "var(--ink-3)" }}>{t("What is it?")}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isReminder ? t("Hand in the essay") : "Eesti keel B1"}
          className="field mt-1 w-full text-base"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
        />
      </label>

      {!isReminder && (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Starts")}</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="field mt-1 w-full text-base"
                style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
              />
            </label>
            <label className="block">
              <span className="label-xs" style={{ color: "var(--ink-3)" }}>{t("For how long")}</span>
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="field mt-1 w-full text-base"
                style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
              >
                {[30, 45, 60, 90, 120, 180].map((m) => (
                  <option key={m} value={m}>{lengthOf(locale, m)}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-4 label-xs" style={{ color: "var(--ink-3)" }}>{t("Repeats on")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={weekdays.includes(d)}
                onClick={() => setWeekdays((w) => w.includes(d) ? w.filter((x) => x !== d) : [...w, d])}
                className="choice-btn min-h-11 rounded-full px-3 text-sm font-semibold"
                style={weekdays.includes(d)
                  ? { ["--choice-bg" as string]: "var(--accent-soft)", color: "var(--accent-deep)" }
                  : undefined}
              >
                {t(WEEKDAY_SHORT[d] ?? "")}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs" style={{ color: "var(--ink-3)" }}>
            {weekdays.length > 0 ? repeatLabelIn(locale, weekdays) : t("For a one-off, leave these blank and pick a date.")}
          </p>
        </>
      )}

      {(isReminder || weekdays.length === 0) && (
        <label className="mt-3 block">
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>
            {t(isReminder ? "Due" : "On")}
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field mt-1 w-full max-w-full text-base"
            style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
          />
        </label>
      )}

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--again-ink)" }} role="status">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onDone} disabled={pending}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={submit} disabled={pending || !title.trim()}>
          {t(pending ? "Saving" : "Add it")}
        </Button>
      </div>
    </Card>
  );
}

/** "18:30" to minutes from midnight. Anything else is six in the evening. */
function minuteOf(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 18 * 60;
  return Math.min(1439, Math.max(0, (h ?? 0) * 60 + (m ?? 0)));
}

/** "1 to 7 September", the week a column of days covers. */
/** "90 minutes" is "1.5 hours" in English and «90 минут» in the other two, which say a half hour in minutes. */
function lengthOf(locale: Locale, minutes: number): string {
  if (minutes < 60 || (locale !== "en" && minutes % 60 !== 0)) return countOf(locale, minutes, "minute");
  return countOf(locale, minutes / 60, "hour");
}

function weekLabel(days: string[], offset: number, locale: Locale, t: (english: string, context?: string) => string): string {
  const first = days[0];
  const last = days[6];
  if (!first || !last) return "";
  // A number of weeks is said with its noun outside English, where "2 back" is not a phrase.
  const weeks = (n: number) => (locale === "en" ? String(n) : countOf(locale, n, "week, as a span"));
  const when = offset === 0 ? t("this week") : offset < 0 ? fill(t("{n} back", "time"), { n: weeks(-offset) }) : fill(t("{n} ahead"), { n: weeks(offset) });
  const d = (key: string) => Number(key.slice(8, 10));
  if (locale !== "en") {
    // The month in the case a date takes, «7 марта», from the browser's own table.
    const dated = (key: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
    const sameMonth = first.slice(0, 7) === last.slice(0, 7);
    return `${fill(t("{from} to {to}"), { from: sameMonth ? String(d(first)) : dated(first), to: dated(last) })}, ${when}`;
  }
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const m = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1] ?? "";
  const range = m(first) === m(last) ? `${d(first)} to ${d(last)} ${m(last)}` : `${d(first)} ${m(first)} to ${d(last)} ${m(last)}`;
  return `${range}, ${when}`;
}
