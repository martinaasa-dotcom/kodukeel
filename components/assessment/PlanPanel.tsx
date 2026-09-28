import { PrefetchLink as Link } from "@/components/PrefetchLink";
import {
  CUMULATIVE_HOURS, FACTS, countedBySkill, foundHours, project, sustainableNewCardsPerDay,
  type MeasuredPace, type Projection, type Standing,
} from "@/lib/assessment/plan";
import { describeSituation, reasonsFor, targetByBand, weeksUntil, type Goals, type Reason } from "@/lib/assessment/goals";
import { formatDuration, formatDurationRange } from "@/lib/time/duration";
import { minutesForCards } from "@/lib/stats/pace";
import { PRE_A1, type Band, type Level } from "@/lib/assessment/types";
import { ChevronRight } from "lucide-react";
import { Card, Note, SectionTitle, StatTile } from "@/components/ui";
import { NamedIcon } from "@/components/icons";
import { Explain } from "@/components/Explain";

/**
 * The honest timeline.
 *
 * This is the screen the rest of the feature exists for. A level on its own is
 * trivia; a level, a goal and a deadline together are a plan, and the useful
 * thing an app can do with them is arithmetic nobody enjoys: this many hours,
 * at your pace that is this many weeks, which is or is not before the date you
 * gave. Every number carries where it came from, and the ranges stay ranges.
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

export function levelLabel(level: Level | null): string {
  if (level === null) return "not measured";
  return level === PRE_A1 ? "below A1" : level;
}

/**
 * A range, with the unit left off when the tile above it already says it.
 *
 * The unit used to be interpolated unconditionally, so the two tiles that pass
 * an empty one rendered "880 to 1170 " with a space hanging off the end of the
 * number.
 */
function range(low: number, high: number, unit: string, step = 1): string {
  const a = Math.round(low / step) * step;
  const b = Math.round(high / step) * step;
  const body = a === b ? `${a}` : `${a} to ${b}`;
  return unit ? `${body} ${unit}` : body;
}

/**
 * Hours, to the nearest ten.
 *
 * The table is in tens because a finer figure would be false precision over
 * published averages, and the skill by skill mean divides by three, so a
 * measured learner was shown "667 to 953 hours": the same claim, dressed as
 * a measurement. The tens are put back on the way to the screen.
 */
function hoursRange(low: number, high: number, unit: string): string {
  return range(low, high, unit, 10);
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
function verdictFor(plan: Projection): { tone: "neutral" | "good" | "warn"; headline: string } {
  const allIn = plan.otherHoursPerWeek
    ? formatDurationRange(plan.appHoursPerWeek + plan.otherHoursPerWeek.low, plan.appHoursPerWeek + plan.otherHoursPerWeek.high, "long")
    : formatDuration(plan.appHoursPerWeek, "long");
  switch (plan.verdict) {
    case "arrived": return { tone: "good", headline: "By this measure, you're already there." };
    case "comfortable": return { tone: "good", headline: "Your usual pace gets you there, with room to spare." };
    case "tight": return { tone: "good", headline: `It fits. Plan on about ${allIn} a week, all told.` };
    case "possible": return { tone: "neutral", headline: `It fits if you really commit: about ${allIn} a week, all told.` };
    case "short": return { tone: "warn", headline: "Not by that date at any normal pace. Here's what would change that." };
    case "open": return { tone: "neutral", headline: "There's no deadline yet, so here's how far you have to go." };
    default: return { tone: "neutral", headline: "That date has already passed. Pick a new one and we can plan again." };
  }
}

export function PlanPanel({ standing, goals, dailyGoal, pace = null, now = new Date(), compact = false }: {
  /** Where the learner is, and whether a paper measured it or they guessed. */
  standing: Standing;
  goals: Goals;
  dailyGoal: number;
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
}) {
  const target = goals.target ?? null;
  const from = standing.level;
  const weeks = weeksUntil(goals.deadline, now);

  if (!target) {
    return (
      <Card>
        <SectionTitle>Your plan</SectionTitle>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          Pick a level to aim for and we&apos;ll turn this into a timeline: roughly how many hours it
          takes to get there, how many your daily goal covers, and how many are left over.
        </p>
        <Link
          href="/settings#goals"
          className="mt-4 inline-block text-sm underline underline-offset-2"
          style={{ color: "var(--accent-deep)" }}
        >
          Set a goal
        </Link>
      </Card>
    );
  }

  const reasons = reasonsFor(goals.reason);
  const plan = project({
    standing,
    to: target,
    minutesPerDay: minutesFor(dailyGoal),
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
  const verdict = verdictFor(plan);
  const spec = targetByBand(target);
  const newCards = sustainableNewCardsPerDay(dailyGoal);
  const bySkill = countedBySkill(standing, target);
  const guessed = standing.source === "estimated" && from !== PRE_A1;

  return (
    <div className="flex flex-col gap-4">
      <Card tone={verdict.tone === "good" ? "accent" : verdict.tone === "warn" ? "butter" : "sky"}>
        <p className="text-xl font-bold leading-snug" style={{ color: "var(--ink)" }}>
          {verdict.headline}
        </p>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {sentence(plan, weeks, levelLabel(from), target, { guessed, bySkill })}
        </p>
        <DistanceBar plan={plan} />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          value={plan.hours.low === 0 ? "0" : hoursRange(plan.hours.low, plan.hours.high, "")}
          label="Study hours to go"
          tone="accent"
          hint={guessed ? "published estimates, stretched for a guessed level"
            : bySkill ? "published estimates, counted skill by skill"
              : "published estimates, not our own"}
        />
        <StatTile
          value={formatDuration(plan.appHoursPerWeek)}
          label="In this app, each week"
          tone="sky"
          hint={paceHint(plan, goals, dailyGoal)}
        />
        {/* What the date asks for, all in, rather than how long the app alone
            would take: the second is a number nobody can act on and the first
            is the whole plan in one figure. */}
        <StatTile
          value={plan.otherHoursPerWeek
            ? formatDurationRange(plan.appHoursPerWeek + plan.otherHoursPerWeek.low, plan.appHoursPerWeek + plan.otherHoursPerWeek.high)
            : plan.weeksOnAppAlone.low === 0 ? "0" : range(plan.weeksOnAppAlone.low, plan.weeksOnAppAlone.high, "")}
          label={plan.otherHoursPerWeek ? "Each week, all told" : "Weeks with just this app"}
          tone="blush"
          hint={plan.otherHoursPerWeek ? "this app plus everything else, to make your date" : "set a date to see hours a week"}
        />
        <StatTile
          value={weeks === null ? "open" : `${weeks}`}
          label="Weeks until your date"
          tone="butter"
          hint={weeks === null ? "no deadline set" : weeks === 0 ? "that date has passed" : "from today"}
        />
      </div>

      {plan.otherHoursPerWeek && plan.otherHoursPerWeek.high > 0 && (
        <Note tone="sky">{foundNote(plan, reasons)}</Note>
      )}

      {compact && (
        <Explain label="Where the hours come from">
          The hours are published estimates for an English speaker, averaged over other people on
          other courses. We then adjust them for your level, your week and, once you have some,
          your reviews.{" "}
          <Link href="/assess" className="underline underline-offset-2" style={{ color: "var(--accent-deep)" }}>
            Where the numbers come from
          </Link>
          , along with the research behind the pace, are on the level check screen.
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
          Where these numbers come from, and what the pace is based on
        </summary>
        <div className="mt-4 flex flex-col gap-6">
        <Card>
          <SectionTitle hint="what the numbers assume">How we worked it out</SectionTitle>
        <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          Getting to {target} from scratch takes an English speaker roughly {range(CUMULATIVE_HOURS[target].low, CUMULATIVE_HOURS[target].high, "hours")} of
          study. Estonian takes longer than French or Spanish, and most of the extra time comes in
          the middle: the cases and the gradation make A2 to B1 the longest step. B1 to B2 is closer
          to any other language, once the grammar underneath is working. These are averages from
          other people, on other courses.
        </p>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {standing.source === "measured"
            ? bySkill
              ? "Your level was measured, and your skills came out at different levels. So the distance is the average of what each skill still has to cover, not the distance from your overall level."
              : "Your level was measured, so we didn't pad the distance for a guess."
            : "Your level is your own estimate, so the far end of the range allows for you being half a level lower than you think. Take the level check and that padding goes."}{" "}
          {plan.paceSource === "measured"
            ? `Your pace comes from what you actually did here over the last ${weeksWord(plan.paceWeeks)}, not from what you said you'd do.`
            : plan.paceSource === "lapsed"
              ? `You haven't reviewed anything here in the last ${weeksWord(plan.paceWeeks)}, so we're using the pace you told us. Review for a fortnight and we'll use your real one.`
              : "Once you've had two weeks of reviews here, the pace comes from what you actually do, not what you said you'd do."}
        </p>
        {spec && (
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            <strong>{target}, {spec.label.toLowerCase()}.</strong> {spec.can} What it still won&apos;t
            get you: {lowerFirst(spec.cannot)}
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
          A daily goal of {dailyGoal} cards means {dailyGoal} cards to answer, not {dailyGoal} new
          ones. A card you learn today needs about ten more reviews in its first year. Once those
          reviews pile up, your daily goal works out at about {newCards} brand new{" "}
          {newCards === 1 ? "card" : "cards"} a day. A higher goal does bring new words in faster,
          but it also makes every day from here on longer, and that&apos;s usually where week six
          falls apart. Pick the goal you&apos;d still keep on a rotten Wednesday.
        </p>
        </Card>

        <div>
          <SectionTitle hint="things you can check, not pep talk">Good to know before you start</SectionTitle>
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
                    <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{fact.claim}</p>
                    <p className="mt-1.5 text-xs" style={{ color: "var(--ink-3)" }}>{fact.source}</p>
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
function weeksWord(weeks: number | null): string {
  const n = Math.max(1, Math.round(weeks ?? 0));
  return n === 1 ? "week" : `${n} weeks`;
}

/** The small print under the pace tile: what the figure is a figure of. */
function paceHint(plan: Projection, goals: Goals, dailyGoal: number): string {
  if (plan.paceSource === "measured") return `measured over your last ${weeksWord(plan.paceWeeks)}`;
  if (plan.paceSource === "lapsed") return `what you told us. Nothing here in ${weeksWord(plan.paceWeeks)}`;
  return `${minutesFor(dailyGoal)} minutes, ${goals.daysPerWeek} days`;
}

/**
 * What a learner's reasons say their week already holds, as a clause.
 *
 * The phrases live on the reasons table beside the hours they stand for, and
 * Anu's briefing reads the same ones, so the note here and what she is told
 * cannot describe one learner two ways.
 */
function situation(reasons: readonly Reason[]): string | null {
  return describeSituation(reasons);
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
function foundNote(plan: Projection, reasons: readonly Reason[]): string {
  const other = plan.otherHoursPerWeek!;
  const need = formatDurationRange(other.low, other.high, "long");
  const lands = range(plan.weeksWithFound.low, plan.weeksWithFound.high, "weeks");
  const where = situation(reasons);
  const held = formatDurationRange(plan.found.low, plan.found.high, "long");
  if (plan.verdict === "short") {
    return `That's more than most weeks can hold alongside everything else. At ${held} a week beyond this app, it's about ${lands} away. Move your date to then, or raise the daily goal, and the plan works again.`;
  }
  if (where) {
    return `Put in roughly ${need} a week of Estonian beyond this app and you'll make your date. You ${where}, which usually gives you ${held} a week without booking anything, so most of it is already there.`;
  }
  return `Put in roughly ${need} a week of Estonian beyond this app and you'll make your date: a class, a conversation partner, reading, a film without subtitles. A normal week has room for ${held} of that, and at that pace you're about ${lands} away.`;
}

function sentence(
  plan: Projection,
  weeks: number | null,
  from: string,
  to: Band,
  why: { guessed: boolean; bySkill: boolean },
): string {
  if (plan.verdict === "arrived") {
    return `You're already at ${to} or above. Pick a higher target, or keep your reviews ticking over and take the check again in a couple of months.`;
  }
  const qualifier = why.guessed
    ? " That level is your own estimate, so the far end allows for you starting half a level lower."
    : why.bySkill
      ? " Your skills came out at different levels, so we counted the distance skill by skill."
      : "";
  const distance = `Going from ${from} to ${to} usually takes ${hoursRange(plan.hours.low, plan.hours.high, "hours")} of study.${qualifier}`;
  const pace = formatDuration(plan.appHoursPerWeek, "long");
  const covers = plan.paceSource === "measured"
    ? `Over your last ${weeksWord(plan.paceWeeks)} you've spent ${pace} a week here, so that's what this is built on`
    : plan.paceSource === "lapsed"
      ? `You haven't reviewed anything here in the last ${weeksWord(plan.paceWeeks)}, so this counts the ${pace} a week you told us`
      : `At the pace you told us, this app covers ${pace} a week of that`;
  if (weeks === null) {
    return `${distance} ${covers}. Set a date and we'll turn the rest into a real timeline.`;
  }
  /*
    A date behind them divides by nothing, so it gets the distance and the pace
    and no arithmetic over the deadline at all.
  */
  if (plan.verdict === "passed") {
    return `${distance} ${covers}. Pick a date that's still ahead of you and we can plan again.`;
  }
  const covered = hours1(plan.appHoursAvailable ?? 0);
  const whose = plan.paceSource === "measured" ? "your real pace" : plan.paceSource === "lapsed" ? "the pace you said" : "your daily goal";
  if (plan.verdict === "comfortable") {
    return `${distance} In ${weeks} weeks ${whose} alone puts in about ${covered} hours, which covers it.`;
  }
  const rest = plan.verdict === "tight"
    ? "The rest can come from a class, some reading and the Estonian around you, which fits in a normal week."
    : plan.verdict === "possible"
      ? "The rest means real work beyond this app, every week. People who put that in do get there."
      : "The rest is more than most weeks can hold alongside everything else, so the date or the pace has to move.";
  return `${distance} In ${weeks} weeks ${whose} puts in about ${covered} of those hours. ${rest}`;
}

/**
 * The distance, drawn: the hours the level takes as a track, and what this
 * app and the learner's own week put into it by the date. The sentence above
 * says whether the date fits; this is the same arithmetic as a picture, so
 * the gap is something a reader sees before they have read a number. Drawn
 * only where there is a date, since without one nothing is being measured
 * against the track.
 */
function DistanceBar({ plan }: { plan: Projection }) {
  if (plan.weeksAvailable === null || plan.appHoursAvailable === null || plan.hours.high <= 0) return null;
  const total = plan.hours.high;
  const app = Math.min(plan.appHoursAvailable, total);
  const week = Math.min(plan.found.low * plan.weeksAvailable, total - app);
  const share = (h: number) => `${Math.max(0, (h / total) * 100)}%`;
  const nearEnd = (plan.hours.low / total) * 100;
  const segments = [
    { key: "app", label: "In this app, by your date", hours: app, fill: "var(--accent)" },
    { key: "week", label: "The rest of your week", hours: week, fill: "var(--sky)" },
  ].filter((segment) => segment.hours > 0);
  const left = Math.max(0, plan.hours.low - app - week);
  return (
    <div className="mt-5">
      <div aria-hidden className="relative h-3 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
        <div className="flex h-full">
          {segments.map((segment) => (
            <span key={segment.key} className="h-full" style={{ width: share(segment.hours), minWidth: 4, background: segment.fill }} />
          ))}
        </div>
        {/* Where the level starts to be within reach: the near end of the range. */}
        <span className="absolute inset-y-0 w-0.5" style={{ left: `${nearEnd}%`, background: "var(--ink-3)" }} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: segment.fill }} />
            {segment.label}
            <span className="tnum font-bold" style={{ color: "var(--ink)" }}>{formatDuration(segment.hours)}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: "var(--ink-3)", background: "var(--surface)" }} />
          {left > 0 ? "Still to find" : "All covered"}
          {left > 0 && <span className="tnum font-bold" style={{ color: "var(--ink)" }}>{formatDuration(left)}</span>}
        </li>
      </ul>
    </div>
  );
}
