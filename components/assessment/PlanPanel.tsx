import { PrefetchLink as Link } from "@/components/PrefetchLink";
import {
  CUMULATIVE_HOURS, FACTS, about, countedBySkill, foundHours, project, sustainableNewCardsPerDay,
  type MeasuredPace, type Projection, type Standing,
} from "@/lib/assessment/plan";
import { describeSituation, reasonsFor, targetByBand, weeksUntil, type Goals, type Reason } from "@/lib/assessment/goals";
import { formatDurationIn } from "@/lib/time/duration";
import { minutesForCards, minutesPerStudyDay } from "@/lib/stats/pace";
import { PRE_A1, type Band, type Level } from "@/lib/assessment/types";
import { ChevronRight } from "lucide-react";
import { Card, Note, SectionTitle, StatTile } from "@/components/ui";
import { NamedIcon } from "@/components/icons";
import { Explain } from "@/components/Explain";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";

/**
 * The honest timeline.
 *
 * This is the screen the rest of the feature exists for. A level on its own is
 * trivia; a level, a goal and a deadline together are a plan, and the useful
 * thing an app can do with them is arithmetic nobody enjoys: this many hours,
 * at your pace that is this many weeks, which is or is not before the date you
 * gave. Every number carries where it came from, and each is one figure: the
 * middle of the model's range, said as "about". Two ends read as an app that
 * does not know, and the width says nothing a learner can plan with.
 *
 * It never tells a learner they cannot do something. It tells them what the
 * published hours say, what their own pace covers, what their week already
 * holds, and what would have to change. Those are facts they can act on.
 * "Not possible" is not.
 *
 * And it is about the person in front of it. The same four tiles used to come
 * out identical for a measured B1 and a guessed one, for somebody living
 * inside the language and somebody abroad, and for a learner who said five
 * days and did two. Each of those now moves a figure, and the sentence beside
 * the figure says which.
 */

export function levelLabel(level: Level | null, locale: Locale): string {
  if (level === null) return tr(locale, "not measured");
  return level === PRE_A1 ? tr(locale, "below A1") : level;
}

/**
 * One figure, the middle of a range, with the unit left off when the tile
 * above it already says it.
 *
 * Both ends used to be printed, "880 to 1170", which a reader took as the
 * app not knowing. The model keeps the range; the screen says the middle.
 */
function central(low: number, high: number, unit: string, step = 1): string {
  const body = `${Math.round((low + high) / 2 / step) * step}`;
  return unit ? `${body} ${unit}` : body;
}

/**
 * Hours, to the nearest ten.
 *
 * The table is in tens because a finer figure would be false precision over
 * published averages, and the skill by skill mean divides by three.
 */
function hoursAbout(low: number, high: number, unit: string): string {
  return central(low, high, unit, 10);
}

/** A rounded count of hours, as a sentence says it. */
function hoursWords(low: number, high: number, locale: Locale): string {
  if (locale === "en") return hoursAbout(low, high, "hours");
  return countOf(locale, Math.round((low + high) / 2 / 10) * 10, "hour");
}

/**
 * The hours a whole deadline's worth of daily goals adds up to.
 *
 * One decimal place, and it stays a bare number because the sentence around it
 * supplies the unit: "about 43.3 of those hours". `formatDuration` is what the
 * small weekly figures get, since an hour is the wrong unit for nine minutes;
 * this one is never below an hour and a bit, so hours is what it is read in.
 *
 * The projection keeps every figure exact precisely so that a number shaped
 * for a screen never becomes a divisor. Rounding happens here, on the way out.
 */
/** A figure with one decimal, written with the comma Russian and Ukrainian use. */
function decimal(n: number, locale: Locale): string {
  return locale === "en" ? String(n) : String(n).replace(".", ",");
}

function hours1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * The headline, which leads with the hours a week rather than with a caveat.
 *
 * "It fits, but only with study outside this app" was true of nearly every
 * plan and read as a no. What somebody who has set a date wants is the
 * number: B2 in a year is about five hours a week, all in, and that is a
 * thing a person can decide to do.
 */
function verdictFor(plan: Projection, locale: Locale): { tone: "neutral" | "good" | "warn"; headline: string } {
  const t = (english: string) => tr(locale, english);
  const allIn = plan.otherHoursPerWeek
    ? formatDurationIn(plan.appHoursPerWeek + about(plan.otherHoursPerWeek), locale, "long")
    : formatDurationIn(plan.appHoursPerWeek, locale, "long");
  switch (plan.verdict) {
    case "arrived": return { tone: "good", headline: t("By this measure, you're already there.") };
    case "comfortable": return { tone: "good", headline: t("Your usual pace gets you there, with room to spare.") };
    case "tight": return { tone: "good", headline: fill(t("It fits. Plan on about {time} a week, all told."), { time: allIn }) };
    case "possible": return { tone: "neutral", headline: fill(t("It fits if you really commit: about {time} a week, all told."), { time: allIn }) };
    case "short": return { tone: "warn", headline: t("Not by that date at any normal pace. Here's what would change that.") };
    case "open": return { tone: "neutral", headline: t("There's no deadline yet, so here's how far you have to go.") };
    default: return { tone: "neutral", headline: t("That date has already passed. Pick a new one and we can plan again.") };
  }
}

export function PlanPanel({ standing, goals, dailyGoal, onCourse, pace = null, now = new Date(), compact = false, locale = "en" }: {
  /** Where the learner is, and whether a paper measured it or they guessed. */
  standing: Standing;
  goals: Goals;
  dailyGoal: number;
  /**
   * Whether the planned course is giving them an evening, which is what a day
   * in this app then is (`minutesPerStudyDay`). Required, so a caller that has
   * not thought about it does not quietly plan five minutes a night for
   * somebody who was just told fifteen.
   */
  onCourse: boolean;
  /** What the review log says they actually do. Null before there is one. */
  pace?: MeasuredPace | null;
  now?: Date;
  /**
   * The verdict and the four figures, without the working behind them.
   *
   * First run is where this panel is most useful and least readable: an essay
   * on where the hours come from and six cited facts, under the four questions
   * that produced them, is a screen nobody finishes on the evening they
   * install something. The arithmetic is the part that changes a decision, so
   * that is the part that stays; the working is on the level check screen,
   * linked from the bottom, where somebody who wants to argue with a number
   * can go and find it.
   */
  compact?: boolean;
  /**
   * The language the panel is written in. The signed-in level check hands in
   * the learner's own; first run is drawn outside the shell and in English,
   * so it passes nothing.
   */
  locale?: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  const target = goals.target ?? null;
  const from = standing.level;
  const weeks = weeksUntil(goals.deadline, now);

  if (!target) {
    return (
      <Card>
        <SectionTitle>{t("Your plan")}</SectionTitle>
        {/*
          In first run the question is directly above this card, so the card
          points at it rather than at Settings: a link out of the wizard on its
          third screen left a stranger on a page full of options with no way
          back to the step they were on, and nothing saved.
        */}
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {t(compact
            ? "Pick a level to aim for above and we'll work out how long it'll take: roughly how many hours of study, how many your evenings here cover, and how many you'll need to find elsewhere."
            : "Pick a level to aim for and we'll work out how long it'll take: roughly how many hours of study, how many your evenings here cover, and how many you'll need to find elsewhere.")}
        </p>
        {!compact && (
          <Link
            href="/settings#goals"
            className="mt-4 inline-block text-sm underline underline-offset-2"
            style={{ color: "var(--accent-deep)" }}
          >
            {t("Set a goal")}
          </Link>
        )}
      </Card>
    );
  }

  const reasons = reasonsFor(goals.reason);
  const plan = project({
    standing,
    to: target,
    minutesPerDay: minutesPerStudyDay(dailyGoal, onCourse),
    daysPerWeek: goals.daysPerWeek,
    weeksAvailable: weeks,
    /*
      What the learner's own week holds beyond this app, from the reasons they
      gave. The verdict is drawn against it and the note below quotes it, off
      the same projection, so the headline and the sentence under it are one
      claim about one figure.
    */
    found: foundHours(reasons),
    pace,
  });
  const verdict = verdictFor(plan, locale);
  const spec = targetByBand(target);
  const newCards = sustainableNewCardsPerDay(dailyGoal);
  const bySkill = countedBySkill(standing, target);
  const guessed = standing.source === "estimated" && from !== PRE_A1;

  return (
    <div className="flex flex-col gap-4" lang={locale}>
      <Card tone={verdict.tone === "good" ? "accent" : verdict.tone === "warn" ? "butter" : "sky"}>
        <p className="text-xl font-bold leading-snug" style={{ color: "var(--ink)" }}>
          {verdict.headline}
        </p>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {sentence(plan, weeks, levelLabel(from, locale), target, { guessed, bySkill, onCourse }, locale)}
        </p>
        <DistanceBar plan={plan} locale={locale} />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          value={plan.hours.high === 0 ? "0" : hoursAbout(plan.hours.low, plan.hours.high, "")}
          label={t("Study hours to go")}
          tone="accent"
          hint={t(guessed ? "from published figures, with room for a guessed level"
            : bySkill ? "from published figures, skill by skill"
              : "from published figures, not our guess")}
        />
        <StatTile
          value={formatDurationIn(plan.appHoursPerWeek, locale)}
          label={t("In this app, each week")}
          tone="sky"
          hint={paceHint(plan, goals, dailyGoal, onCourse, locale)}
        />
        {/* What the date asks for, all in, rather than how long the app alone
            would take: the second is a number nobody can act on and the first
            is the whole plan in one figure. */}
        <StatTile
          value={plan.otherHoursPerWeek
            ? formatDurationIn(plan.appHoursPerWeek + about(plan.otherHoursPerWeek), locale)
            : plan.weeksOnAppAlone.high === 0 ? "0" : central(plan.weeksOnAppAlone.low, plan.weeksOnAppAlone.high, "")}
          label={t(plan.otherHoursPerWeek ? "Each week, all told" : "Weeks with just this app")}
          tone="blush"
          hint={t(plan.otherHoursPerWeek ? "here and elsewhere, to make your date" : "set a date to see hours a week")}
        />
        <StatTile
          value={weeks === null ? t("open") : `${weeks}`}
          label={t("Weeks until your date")}
          tone="butter"
          hint={t(weeks === null ? "no deadline set" : weeks === 0 ? "that date has passed" : "from today")}
        />
      </div>

      {plan.otherHoursPerWeek && plan.otherHoursPerWeek.high > 0 && (
        <Note tone="sky">{foundNote(plan, reasons, locale)}</Note>
      )}

      {compact && (
        <Explain label={t("Where the hours come from")}>
          {t("The hours are published estimates for an English speaker, averaged over other people on other courses. We then adjust them for your level, your week and, once you have some, your reviews. The sources, and the research behind the pace, are on the")}{" "}
          <Link href="/assess" className="underline underline-offset-2" style={{ color: "var(--accent-deep)" }}>
            {t("level check screen")}
          </Link>
          .
        </Explain>
      )}

      {/*
        THE REFERENCE MATERIAL IS BEHIND A DISCLOSURE, WHICH IS WHERE A
        READER FINDS IT AND A SKIMMER DOES NOT TRIP OVER IT. This screen used
        to run to five thousand pixels on a phone: the result, then the plan,
        then three paragraphs on where the hours come from, then six cited
        facts, then a second caveat repeating the first. Somebody who has
        just been told they are below A1 wants the number, the plan and the
        way out, and the sources exactly once they ask "says who". The
        `summary` says what is inside so nobody has to open it to find out.
      */}
      {!compact && (
      <details className="group">
        <summary
          className="tap-tint flex cursor-pointer items-center gap-2 rounded-[var(--r)] px-1 py-2 text-sm font-medium"
          style={{ color: "var(--accent-deep)" }}
        >
          <ChevronRight size={15} aria-hidden className="transition-ui group-open:rotate-90" />
          {t("Where these numbers come from, and what the pace is based on")}
        </summary>
        <div className="mt-4 flex flex-col gap-6">
        <Card>
          <SectionTitle hint={t("what the numbers assume")}>{t("How we worked it out")}</SectionTitle>
        <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {fill(t("Getting to {level} from scratch takes an English speaker about {hours} of study. Estonian takes longer than French or Spanish, and most of the extra time comes in the middle: the cases and the gradation make A2 to B1 the longest step. B1 to B2 is closer to any other language, once the grammar underneath is working. These are averages from other people, on other courses."), {
            level: target, hours: hoursWords(CUMULATIVE_HOURS[target].low, CUMULATIVE_HOURS[target].high, locale),
          })}
        </p>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {t(standing.source === "measured"
            ? bySkill
              ? "Your level was measured, and your skills came out at different levels. So the distance is the average of what each skill still has to cover, not the distance from your overall level."
              : "Your level was measured, so we didn't pad the distance for a guess."
            : "Your level is your own estimate, so the figure allows for you being half a level lower than you think. Take the level check and that padding goes.")}{" "}
          {plan.paceSource === "measured"
            ? fill(t("Your pace comes from what you actually did here over the last {weeks}, not from what you said you'd do."), { weeks: weeksWord(plan.paceWeeks, locale) })
            : plan.paceSource === "lapsed"
              ? fill(t("You haven't reviewed anything here in the last {weeks}, so we're using the pace you told us. Review for a fortnight and we'll use your real one."), { weeks: weeksWord(plan.paceWeeks, locale) })
              : t("Once you've had two weeks of reviews here, the pace comes from what you actually do, not what you said you'd do.")}
        </p>
        {spec && (
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            <strong>{target}, {t(spec.label).toLowerCase()}.</strong> {t(spec.can)} {fill(t("What it still won't get you: {what}"), { what: lowerFirst(t(spec.cannot)) })}
          </p>
        )}
        {/*
          This paragraph said "setting the goal higher does not make the words
          arrive faster", and the module directly above computes the opposite:
          `sustainableNewCardsPerDay` is the goal over ten, so forty a day
          introduces four new cards where ten a day introduces one. It does make
          them arrive faster, four times over. What is true is the part that had
          been compressed out of it: a goal is a count of *reviews*, and nine in
          ten of those are words already met, so fifteen a day is not fifteen new
          words a day and a beginner who reads it that way is planning a year
          they will not have. Both halves are said now.
        */}
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {fill(t("A daily goal of {cards} means {cards} to answer, not {newOnes}. A card you learn today needs about ten more reviews in its first year. Once those reviews pile up, your daily goal works out at about {fresh} a day. A higher goal does bring new words in faster, but it also makes every day from here on longer, and that's usually where week six falls apart. Pick the goal you'd still keep on a rotten Wednesday."), {
            cards: countOf(locale, dailyGoal, "card"),
            newOnes: countOf(locale, dailyGoal, "new one"),
            fresh: countOf(locale, newCards, "brand new card"),
          })}
        </p>
        </Card>

        <div>
          <SectionTitle hint={t("each one with a source you can check")}>{t("Good to know before you start")}</SectionTitle>
        <ul className="flex flex-col gap-3">
          {FACTS.map((fact) => {
            return (
              <li key={fact.id}>
                <Card className="flex gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--raised)", color: "var(--ink-2)" }}
                  >
                    <NamedIcon name={fact.icon} size={17} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(fact.claim)}</p>
                    <p className="mt-1.5 text-xs" style={{ color: "var(--ink-3)" }}>{t(fact.source)}</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
        </div>
        </div>
      </details>
      )}
    </div>
  );
}

/**
 * Review minutes implied by a daily card goal, at the one rate the app holds.
 *
 * `lib/stats/pace.ts` owns the figure and Today reads the same one, so the
 * minutes promised on first run and the minutes promised every morning are
 * one estimate rather than two. The log replaces it once there is one.
 */
export function minutesFor(dailyGoal: number): number {
  return minutesForCards(dailyGoal);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** "3 weeks", for a pace read over a stretch of log. Never under one. */
function weeksWord(weeks: number | null, locale: Locale): string {
  const n = Math.max(1, Math.round(weeks ?? 0));
  if (locale === "en") return n === 1 ? "week" : `${n} weeks`;
  return n === 1 ? tr(locale, "a single week (span)") : countOf(locale, n, "week");
}

/** A number of weeks in a sentence: always "N weeks" in English, as it was. */
function weeksCount(n: number, locale: Locale): string {
  return locale === "en" ? `${n} weeks` : countOf(locale, n, "week");
}

/** The small print under the pace tile: what the figure is a figure of. */
function paceHint(plan: Projection, goals: Goals, dailyGoal: number, onCourse: boolean, locale: Locale): string {
  const t = (english: string) => tr(locale, english);
  if (plan.paceSource === "measured") return fill(t("measured over your last {weeks}"), { weeks: weeksWord(plan.paceWeeks, locale) });
  if (plan.paceSource === "lapsed") return t("your own estimate, as you haven't reviewed lately");
  const minutes = minutesPerStudyDay(dailyGoal, onCourse);
  return onCourse
    ? fill(t("a {minutes}-minute evening, {days} days"), { minutes, days: goals.daysPerWeek })
    : fill(t("{minutes} minutes, {days} days"), { minutes, days: goals.daysPerWeek });
}

/**
 * What a learner's reasons say their week already holds, as a clause.
 *
 * The phrases live on the reasons table beside the hours they stand for, and
 * Anu's briefing reads the same ones, so the note here and what she is told
 * cannot describe one learner two ways.
 */
function situation(reasons: readonly Reason[], locale: Locale): string | null {
  return describeSituation(reasons, locale);
}

/**
 * The way out, sized to the person.
 *
 * Both halves read the projection's own `found` and `weeksWithFound`, which
 * are the figures the verdict above was drawn against. The panel used to pass
 * a constant of its own into the arithmetic here, and the day the band and
 * the sentence read different numbers the headline said a plan fitted over a
 * note saying it was years out.
 */
function foundNote(plan: Projection, reasons: readonly Reason[], locale: Locale): string {
  const t = (english: string) => tr(locale, english);
  const other = plan.otherHoursPerWeek!;
  const need = formatDurationIn(about(other), locale, "long");
  const lands = weeksCount(plan.weeksAbout, locale);
  const where = situation(reasons, locale);
  const held = formatDurationIn(about(plan.found), locale, "long");
  if (plan.verdict === "short") {
    return fill(t("That's more than most weeks can hold on top of everything else. At {held} a week beyond this app, it's about {lands} away. Move your date to then, or raise the daily goal, and the plan works again."), { held, lands });
  }
  if (where) {
    return fill(t("Put in about {need} a week of Estonian beyond this app and you'll make your date. You {where}, which usually gives you {held} a week without booking anything, so most of it is already there."), { need, where, held });
  }
  return fill(t("Put in about {need} a week of Estonian beyond this app and you'll make your date: a class, a conversation partner, reading, a film without subtitles. A normal week has room for {held} of that, and at that pace you're about {lands} away."), { need, held, lands });
}

function sentence(
  plan: Projection,
  weeks: number | null,
  from: string,
  to: Band,
  why: { guessed: boolean; bySkill: boolean; onCourse: boolean },
  locale: Locale,
): string {
  const t = (english: string) => tr(locale, english);
  if (plan.verdict === "arrived") {
    return fill(t("You're already at {level} or above. Pick a higher target, or keep your reviews ticking over and take the check again in a couple of months."), { level: to });
  }
  const qualifier = why.guessed
    ? ` ${t("That level is your own estimate, so the figure allows for you starting half a level lower.")}`
    : why.bySkill
      ? ` ${t("Your skills came out at different levels, so we counted the distance skill by skill.")}`
      : "";
  const distance = `${fill(t("Going from {from} to {to} takes about {hours} of study."), { from, to, hours: hoursWords(plan.hours.low, plan.hours.high, locale) })}${qualifier}`;
  const pace = formatDurationIn(plan.appHoursPerWeek, locale, "long");
  const covers = plan.paceSource === "measured"
    ? fill(t("You've spent about {pace} a week here over the last {weeks}, so that's the pace we're using."), { pace, weeks: weeksWord(plan.paceWeeks, locale) })
    : plan.paceSource === "lapsed"
      ? fill(t("You haven't reviewed anything here in the last {weeks}, so this counts the {pace} a week you told us."), { pace, weeks: weeksWord(plan.paceWeeks, locale) })
      : fill(t("At the pace you told us, you'll do {pace} a week of that here."), { pace });
  if (weeks === null) {
    return `${distance} ${covers} ${t("Set a date and we'll turn the rest into a real timeline.")}`;
  }
  /*
    A date behind them divides by nothing, so it gets the distance and the pace
    and no arithmetic over the deadline at all.
  */
  if (plan.verdict === "passed") {
    return `${distance} ${covers} ${t("Pick a date that's still ahead of you and we can plan again.")}`;
  }
  const covered = hours1(plan.appHoursAvailable ?? 0);
  const whose = plan.paceSource === "measured" ? "your real pace"
    : plan.paceSource === "lapsed" ? "the pace you said"
      : why.onCourse ? "your evenings here" : "your daily goal";
  const counts = { weeks: weeksCount(weeks, locale), covered: decimal(covered, locale) };
  if (plan.verdict === "comfortable") {
    return `${distance} ${fill(t(`In {weeks} ${whose} alone ${puts(whose)} in about {covered} hours, which covers it.`), counts)}`;
  }
  const rest = t(plan.verdict === "tight"
    ? "The rest can come from a class, some reading and the Estonian around you. That fits into a normal week."
    : plan.verdict === "possible"
      ? "The rest means real work beyond this app, every week. People who put that in do get there."
      : "The rest is more than most weeks can hold on top of everything else, so either the date or the pace needs to move.");
  return `${distance} ${fill(t(`In {weeks} ${whose} ${puts(whose)} in about {covered} of those hours.`), counts)} ${rest}`;
}

/** "puts" or "put", since "your evenings" is the one plural subject. */
function puts(subject: string): string {
  return /evenings/.test(subject) ? "put" : "puts";
}

/**
 * The distance, drawn: the hours the level takes as a track, and what this
 * app and the learner's own week put into it by the date. The sentence above
 * says whether the date fits; this is the same arithmetic as a picture, so
 * the gap is something a reader sees before they have read a number. Drawn
 * only where there is a date, since without one nothing is being measured
 * against the track.
 */
function DistanceBar({ plan, locale }: { plan: Projection; locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  if (plan.weeksAvailable === null || plan.appHoursAvailable === null || plan.hours.high <= 0) return null;
  const total = about(plan.hours);
  const app = Math.min(plan.appHoursAvailable, total);
  const week = Math.min(about(plan.found) * plan.weeksAvailable, total - app);
  const share = (h: number) => `${Math.max(0, (h / total) * 100)}%`;
  const segments = [
    { key: "app", label: "In this app, by your date", hours: app, fill: "var(--accent)" },
    { key: "week", label: "The rest of your week", hours: week, fill: "var(--sky)" },
  ].filter((segment) => segment.hours > 0);
  const left = Math.max(0, total - app - week);
  return (
    <div className="mt-5">
      <div aria-hidden className="relative h-3 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
        <div className="flex h-full">
          {segments.map((segment) => (
            <span key={segment.key} className="h-full" style={{ width: share(segment.hours), minWidth: 4, background: segment.fill }} />
          ))}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: segment.fill }} />
            {t(segment.label)}
            <span className="tnum font-bold" style={{ color: "var(--ink)" }}>{formatDurationIn(segment.hours, locale)}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: "var(--ink-3)", background: "var(--surface)" }} />
          {t(left > 0 ? "Still to find" : "All covered")}
          {left > 0 && <span className="tnum font-bold" style={{ color: "var(--ink)" }}>{formatDurationIn(left, locale)}</span>}
        </li>
      </ul>
    </div>
  );
}
