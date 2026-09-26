import type { Metadata } from "next";
import { requireUserId } from "@/lib/auth/session";
import { studyRecord } from "@/lib/progress/record";
import { NOT_A_CERTIFICATE, WHAT_PROVES_A_LEVEL } from "@/lib/stats/record";
import { formatDuration } from "@/lib/time/duration";
import { Card, Empty, Page, SectionTitle, Stack, Stat } from "@/components/ui";
import { DateText } from "@/components/DateText";
import { PrintButton } from "@/components/PrintButton";
import { ButtonLink } from "@/components/Button";
import { PrefetchLink as Link } from "@/components/PrefetchLink";

export const metadata: Metadata = { title: "Record of study" };
export const dynamic = "force-dynamic";

const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

/**
 * A record of study, to print or save as a PDF and hand to somebody.
 *
 * What it may say is decided by `lib/stats/record.ts`: hours, days and answers
 * off the log, the words the scheduler has graduated, the units finished, the
 * level checks and papers sat here, and the conversations the learner reported.
 * Each is named for what it is, and the sentence saying this is not a
 * certificate is printed on the page itself rather than behind a press,
 * because the person reading it is not the person who made it.
 */
export default async function RecordPage() {
  const ownerId = await requireUserId();
  const record = await studyRecord(ownerId);
  const { totals } = record;

  if (totals.answers === 0) {
    return (
      <Page title="Record of study">
        <Empty
          title="Nothing to record yet"
          body="Answer a few cards and this page fills itself in."
          action={<ButtonLink href="/learn" variant="primary">Start learning</ButtonLink>}
        />
      </Page>
    );
  }

  const onDay = (key: string) => <DateText iso={`${key}T12:00:00Z`} zone="UTC" options={DAY} />;

  return (
    <Page
      title="Record of study"
      lead="What this app's own log says about your time here. Print it or save it as a PDF."
      actions={<PrintButton label="Print or save as PDF" />}
    >
      <Stack>
        <Card className="record-sheet">
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>Kodukeel · record of study</p>
          <p className="mt-2 text-2xl font-bold" style={{ color: "var(--ink)" }}>
            {record.name ?? "A learner of Estonian"}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            From {onDay(totals.firstDay!)} to {onDay(totals.lastDay!)}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-5 xl:grid-cols-4">
            <Stat label="Time studied" value={formatDuration(totals.hours)} />
            <Stat label="Days studied" value={totals.activeDays.toLocaleString("en-GB")} />
            <Stat label="Answers given" value={totals.answers.toLocaleString("en-GB")} />
            <Stat label="Cards known" value={record.cardsKnown.toLocaleString("en-GB")} />
          </div>

          <p className="mt-6 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            Time is counted in sittings, from the first answer of an evening to the last. A card
            counts as known once the scheduler has brought it back days later and it was answered.
          </p>
        </Card>

        <section>
          <SectionTitle>Units finished</SectionTitle>
          {record.unitsDone.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>None yet. A unit is finished when every word in it is known.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {record.unitsDone.map((u) => (
                <li key={u.title} className="flex items-baseline justify-between gap-3 rounded-[var(--r)] border px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
                  <span className="min-w-0 text-sm font-semibold" style={{ color: "var(--ink)" }}>{u.title}</span>
                  <span className="label-xs" style={{ color: "var(--ink-3)" }}>{u.level}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>Measured here</SectionTitle>
          {record.checks.length === 0 && record.papers.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>No level check or mock paper sat yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {record.checks.map((c) => (
                <li key={`c-${c.at.toISOString()}`} className="rounded-[var(--r)] border px-4 py-3 text-sm" style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink-2)" }}>
                  <DateText iso={c.at.toISOString()} zone={record.zone} options={DAY} />: level check,
                  placed at <strong style={{ color: "var(--ink)" }}>{c.overall ?? "below A1"}</strong>
                </li>
              ))}
              {record.papers.map((p) => (
                <li key={`p-${p.level}`} className="rounded-[var(--r)] border px-4 py-3 text-sm" style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink-2)" }}>
                  Mock {p.level} paper, sat {p.sittings === 1 ? "once" : `${p.sittings} times`}, best{" "}
                  <strong style={{ color: "var(--ink)" }}>{Math.round(p.best)} percent</strong>
                  {p.passed ? ", at or above the pass mark" : ", under the pass mark"}. Latest{" "}
                  <DateText iso={p.latest.toISOString()} zone={record.zone} options={DAY} />.
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
            The level check and the mock papers are this app&rsquo;s own, marked by rule. None of them is the state examination.
          </p>
        </section>

        <section>
          <SectionTitle>Conversations outside the app</SectionTitle>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            <strong style={{ color: "var(--ink)" }}>{record.conversations.toLocaleString("en-GB")}</strong>{" "}
            reported by the learner, one answer a morning about the day before. Self reported and not checked.
          </p>
        </section>

        <Card tone="accent" className="record-note">
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{NOT_A_CERTIFICATE}</p>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
            {WHAT_PROVES_A_LEVEL}{" "}
            <Link href="/state-exam" className="font-semibold underline underline-offset-4" style={{ color: "var(--accent-deep)" }}>
              How the state examination works
            </Link>
          </p>
        </Card>
      </Stack>
    </Page>
  );
}
