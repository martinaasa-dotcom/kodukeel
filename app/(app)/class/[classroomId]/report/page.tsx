import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { CaseQuestion } from "@/components/CaseQuestion";
import { PrintButton } from "@/components/PrintButton";
import { Button } from "@/components/Button";
import { Wordmark } from "@/components/brand";
import { DateText } from "@/components/DateText";
import { rich } from "@/components/Rich";
import { requireUserId } from "@/lib/auth/session";
import { BAND_LABEL, cohortKind, type ReadinessBand } from "@/lib/classroom/cohort";
import { rosterClassFor } from "@/lib/classroom/poster";
import { workplaceRoster } from "@/lib/classroom/roster";
import { termRange, TERM_MAX_WEEKS, type TermFigures } from "@/lib/classroom/term";
import { countOf, fill, grouped, tr, type Locale } from "@/lib/copy/locale";
import { caseByKey } from "@/lib/estonian/cases";
import type { CaseKey } from "@/lib/estonian/types";
import type { ExamLevel } from "@/lib/exam/spec";
import { EVIDENCE_NOTE, type Evidence } from "@/lib/exam/readiness";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { localeFor } from "@/lib/progress/locale";
import { classTermFigures } from "@/lib/progress/term";

export const dynamic = "force-dynamic";

type Params = Promise<{ classroomId: string }>;
type Search = Promise<{ from?: string | string[]; to?: string | string[] }>;

async function ownClass(classroomId: string) {
  const ownerId = await requireUserId();
  const classroom = await rosterClassFor(ownerId, classroomId);
  return classroom ? { classroom, ownerId } : null;
}

export async function generateMetadata({ params }: { params: Params }) {
  const { classroomId } = await params;
  const own = await ownClass(classroomId);
  if (!own) return { title: "Class" };
  const locale = await localeFor(own.ownerId);
  return { title: fill(tr(locale, "{class}, term report"), { class: own.classroom.name }) };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const DAY = { day: "numeric", month: "long", year: "numeric" } as const;

/**
 * ONE PRINTED PAGE ABOUT A CLASS OVER A TERM, WITH NOBODY'S NAME ON IT.
 *
 * Owner only, through `rosterClassFor`, which is the poster's ownership check
 * without the archived refusal: the records of a class that has ended are
 * still the teacher's to print. A member, a stranger and a guessed id meet the
 * not-found a stranger meets.
 *
 * What is on it is class totals and the class's weakest cases, and nothing
 * about one learner (docs/38-third-batch.md, D4). The names live in the roster
 * file, which is a download the teacher chose. A workplace group carries its
 * readiness bands, as its screen does, and no case at all.
 */
export default async function TermReportPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { classroomId } = await params;
  const own = await ownClass(classroomId);
  if (!own) notFound();
  const { classroom, ownerId } = own;
  const search = await searchParams;
  const [locale, clock] = await Promise.all([localeFor(ownerId), learnerDayClock(ownerId)]);
  const t = (english: string) => tr(locale, english);
  const range = termRange(one(search.from), one(search.to), clock);
  const workplace = cohortKind(classroom.kind) === "WORKPLACE";
  const level = classroom.targetLevel as ExamLevel;
  const [figures, cohort] = await Promise.all([
    classTermFigures(classroom.id, ownerId, range, clock, { cases: !workplace }),
    workplace ? workplaceRoster(classroom.id, level) : Promise.resolve(null),
  ]);
  const fromKey = clock.dayKey(range.from);
  const lastKey = clock.dayKey(clock.shiftDay(range.until, 1));
  /*
    A day key is a calendar date rather than an instant, so it is drawn at noon
    UTC in UTC: the reader's browser then writes it in their own shape.
  */
  const date = (key: string) => <DateText iso={`${key}T12:00:00Z`} zone="UTC" options={DAY} />;

  return (
    <div className="term-report mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12 print:max-w-none print:p-0">
      <div className="no-print mb-8 flex flex-col gap-5">
        <Link href={`/class/${classroom.id}`} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-deep)" }}>
          <ArrowLeft size={14} aria-hidden /> {t("Back to the class")}
        </Link>
        <form method="get" className="flex flex-wrap items-end gap-3" aria-label={t("Choose the dates")}>
          <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {t("From the day")}
            <input type="date" name="from" defaultValue={fromKey} className="field" />
          </label>
          <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {t("To the day")}
            <input type="date" name="to" defaultValue={lastKey} max={clock.dayKey()} className="field" />
          </label>
          <Button type="submit" variant="secondary">{t("Show these dates")}</Button>
          <PrintButton label={t("Print the report")} />
        </form>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {fill(t("A report covers whole weeks, up to {weeks}. Nobody in the class is named on it."), { weeks: TERM_MAX_WEEKS })}
        </p>
      </div>

      <section
        className="rounded-[var(--r-xl)] border p-6 md:p-8 print:rounded-none print:border-0 print:p-0"
        style={{ background: "var(--surface)", borderColor: "var(--rule)" }}
        data-term-report
      >
        <Wordmark size={24} />
        <h1 className="mt-4 text-2xl font-bold" style={{ color: "var(--ink)" }}>{classroom.name}</h1>
        <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
          {rich(t("{from} to {to}, {weeks}"), { from: date(fromKey), to: date(lastKey), weeks: countOf(locale, range.weeks, "week, as a span") })}
        </p>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Figure label={t("Practised at least once")} value={figures.everActive} />
          <Figure label={t("Most in one week")} value={figures.peakActive} />
          <Figure label={t("Answers in all")} value={grouped(locale, figures.totalReviews)} />
        </dl>

        <h2 id="term-periods" className="mt-8 text-lg font-bold" style={{ color: "var(--ink)" }}>
          {t(figures.periods.length < range.weeks ? "Fortnight by fortnight" : "Week by week")}
        </h2>
        {/* A scroller a keyboard can reach, named by the heading over it. */}
        <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-labelledby="term-periods">
          <table className="w-full text-sm" style={{ color: "var(--ink-2)" }}>
            <thead>
              <tr className="text-left" style={{ color: "var(--ink)" }}>
                <th scope="col" className="py-1.5 pr-4 font-semibold">{t("Starting")}</th>
                <th scope="col" className="py-1.5 pr-4 text-right font-semibold">{t("Practised")}</th>
                <th scope="col" className="py-1.5 text-right font-semibold">{t("Answers given")}</th>
              </tr>
            </thead>
            <tbody>
              {figures.periods.map((p) => (
                <tr key={p.start} className="border-t" style={{ borderColor: "var(--rule)" }}>
                  <td className="py-1.5 pr-4 whitespace-nowrap">{date(p.start)}</td>
                  <td className="tnum py-1.5 pr-4 text-right">{p.active}</td>
                  <td className="tnum py-1.5 text-right">{p.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {workplace ? (
          cohort && <Bands counts={cohort.counts} level={cohort.level} evidence={cohort.evidence} locale={locale} />
        ) : (
          <Cases figures={figures} locale={locale} />
        )}
      </section>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string | number }) {
  // The label and the figure are two rows every figure in the line shares, so
  // a label that wraps (four across at a tablet's width) does not push its own
  // figure below the ones beside it: a reader compares the numbers across.
  // The label starts at the top of its row, so the labels line up as well.
  return (
    <div className="row-span-2 grid grid-rows-subgrid gap-0.5">
      <dt className="self-start text-sm" style={{ color: "var(--ink-2)" }}>{label}</dt>
      <dd className="tnum font-display text-2xl font-bold" style={{ color: "var(--ink)" }}>{value}</dd>
    </div>
  );
}

function Cases({ figures, locale }: { figures: TermFigures; locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  return (
    <>
      <h2 className="mt-8 text-lg font-bold" style={{ color: "var(--ink)" }}>{t("What the class found hardest")}</h2>
      {figures.cases.length === 0 ? (
        <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
          {t("No case had enough answers from enough students to call it the class’s.")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
            {t("Right answers at the start of the range and at the end, for cases at least three students answered.")}
          </p>
          <ul className="mt-3 flex flex-col gap-2" data-term-cases>
            {figures.cases.map((c) => {
              const spec = caseByKey(c.grammCase as CaseKey);
              const pct = (n: number | null) => (n === null ? t("too few answers") : `${n}%`);
              return (
                <li key={c.grammCase} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm" style={{ color: "var(--ink-2)" }}>
                  <span className="font-semibold" lang="et" style={{ color: "var(--ink)" }}>{spec?.et ?? c.grammCase.toLowerCase()}</span>
                  {spec && <CaseQuestion question={spec.question} inline />}
                  <span className="tnum">{fill(t("{start} then {end}"), { start: pct(c.start), end: pct(c.end) })}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

function Bands({ counts, level, evidence, locale }: {
  counts: Record<ReadinessBand, number>; level: ExamLevel; evidence: Evidence; locale: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  const bands: ReadinessBand[] = ["likely", "close", "far", "unknown"];
  return (
    <>
      <h2 className="mt-8 text-lg font-bold" style={{ color: "var(--ink)" }}>
        {fill(t("Where the group stands for {level} today"), { level })}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {bands.map((band) => (
          <Figure key={band} label={band === "close" && locale !== "en" ? t("Close to passing") : t(BAND_LABEL[band])} value={counts[band]} />
        ))}
      </dl>
      {/* What the bands rest on, as the group's own screen says it: the weakest tier behind any of them. */}
      <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>{t(EVIDENCE_NOTE[evidence])}</p>
    </>
  );
}
