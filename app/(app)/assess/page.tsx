import { Compass, History } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { goalsFor, historyFor, latestFor, paperFor } from "@/lib/progress/assessment";
import { PRE_A1, type Confidence, type Placement, type SkillResult } from "@/lib/assessment/types";
import { ButtonLink } from "@/components/Button";
import { Card, Chip, Empty, Page, SectionTitle, Stack } from "@/components/ui";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { PlanPanel, levelLabel } from "@/components/assessment/PlanPanel";
import { ResultPanel } from "@/components/assessment/ResultPanel";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { measuredPaceFor, standingFor } from "@/lib/progress/plan";
import { programmeFor } from "@/lib/progress/course";
import { DATE_AND_TIME, DateText } from "@/components/DateText";
import { Explain } from "@/components/Explain";
import { firstParams } from "@/lib/ux/queryParam";
import { localeFor } from "@/lib/progress/locale";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { fillNodes } from "@/components/fillNodes";

export const metadata = { title: "Level check" };

export const dynamic = "force-dynamic";

/**
 * The level check: where you are, measured rather than guessed.
 *
 * Two screens behind one route. Without `?take=1` it is the hub: your last
 * result, what it means for the goal you set, and every previous result so the
 * line can be seen moving. With it, the paper is built and sat.
 *
 * Building the paper is the expensive half, so it happens only when a check is
 * actually being taken. The hub reads three small rows.
 */
export default async function AssessPage({
  searchParams,
}: {
  searchParams: Promise<{ take?: string | string[] }>;
}) {
  const ownerId = await requireUserId();
  const [{ take }, locale] = await Promise.all([firstParams(await searchParams), localeFor(ownerId)]);
  const t = (english: string) => tr(locale, english);

  if (take) {
    // A different seed every sitting, so a second attempt is a second test
    // rather than the same paper with the answers remembered.
    const paper = await paperFor(ownerId, Date.now() % 1_000_000);
    if (paper.items.length === 0) {
      return (
        <Page route="/assess" title={t("Level check")} lead={t("A short test of your reading, listening and writing, so we know where to start you.")}>
          <Empty
            title={t("We couldn't put a check together")}
            body={t("Every question is built from the dictionary, and it has no words with a level on them yet.")}
            action={<ButtonLink href="/dictionary" variant="primary">{t("Open the dictionary")}</ButtonLink>}
          />
        </Page>
      );
    }
    return (
      <AssessmentRunner items={paper.items} missing={paper.missing} seed={paper.seed} builtAt={paper.builtAt} />
    );
  }

  /*
    The plan is built on the answer the course goes on, not on the last
    sitting: a level the learner corrected in Settings this morning outranks a
    check sat in March (`currentLevelAnswer`), and the panel says which it was
    handed. The pace is what the log says they do, read once here rather than
    inside the panel, which stays free of the database.
  */
  const [latest, history, goals, clock, standing, pace, programme] = await Promise.all([
    latestFor(ownerId),
    historyFor(ownerId, 10),
    goalsFor(ownerId),
    learnerDayClock(ownerId),
    standingFor(ownerId),
    measuredPaceFor(ownerId),
    // Whether an evening of the course is what a day here is (`minutesPerStudyDay`).
    programmeFor(ownerId),
  ]);

  const result: Placement | null = latest
    ? {
        skills: latest.skills as SkillResult[],
        overall: (latest.overall ?? null) as Placement["overall"],
        // Read by today's rule, not the one in force when the row was written.
        // `latestFor` does that; this only carries it through. See `readOverall`.
        nearly: latest.nearly,
        ceiling: (latest.ceiling ?? null) as Placement["ceiling"],
        confidence: latest.confidence as Confidence,
        itemsAnswered: latest.answered,
        /*
          A stored sitting knows how many questions it asked and not how many
          of them settled the boundary, and `Assessment` is append-only, so a
          row written before that number existed cannot grow one. Nought is the
          honest value and the panel reads it as "say nothing", the same way
          `parseDetail` reads an old row's missing breakdown as no breakdown.
          Rebuilding it here would mean recomputing a level from responses this
          row does not keep.
        */
        decisive: 0,
      }
    : null;

  return (
    <Page route="/assess"
      title={t("Level check")}
      lead={t("A short test of your reading, listening and writing, so we know where to start you.")}
      actions={result ? (
        <ButtonLink href="/assess?take=1" variant="primary" size="lg">
          <Compass size={16} aria-hidden /> {t("Take it again")}
        </ButtonLink>
      ) : undefined}
    >
      <Stack>
        {result ? (
          <ResultPanel
            result={result}
            locale={locale}
            heading={latest ? (
              <>
                {fillNodes(t("Measured {date}"), { date: <DateText iso={latest.takenAt.toISOString()} zone={clock.zone} options={DATE_AND_TIME} /> })}
              </>
            ) : "Where you are"}
          />
        ) : (
          <Empty
            title={t("You haven't taken a check yet")}
            body={t("It starts easy and gets harder until it finds your level. For speaking, you judge yourself.")}
            action={<ButtonLink href="/assess?take=1" variant="primary" size="lg">{t("Start the check")}</ButtonLink>}
          />
        )}

        <div>
          <SectionTitle hint={t("counted in hours of study")}>{t("What this means for your goal")}</SectionTitle>
          <PlanPanel
            locale={locale}
            standing={standing}
            goals={goals}
            dailyGoal={goals.dailyGoal}
            onCourse={programme !== null}
            pace={pace}
          />
        </div>

        {history.length > 1 && (
          <div>
            <SectionTitle hint={countOf(locale, history.length, "sitting")}>
              <History size={13} className="mr-1.5 inline" aria-hidden />
              {t("Every check you've taken")}
            </SectionTitle>
            <Card>
              <ul className="flex flex-col">
                {history.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-baseline justify-between gap-3 border-t py-3 first:border-t-0"
                    style={{ borderColor: "var(--rule)" }}
                  >
                    <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                      <DateText iso={row.takenAt.toISOString()} zone={clock.zone} options={DATE_AND_TIME} />
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Chip tone="accent">
                        {row.overall === PRE_A1 ? t("below A1") : (row.overall ?? t("not measured"))}
                      </Chip>
                      <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                        {fill(t("reading {reading}, listening {listening}, writing {writing}"), {
                          reading: levelLabel(row.reading as Placement["overall"], locale),
                          listening: levelLabel(row.listening as Placement["overall"], locale),
                          writing: levelLabel(row.writing as Placement["overall"], locale),
                        })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Explain label={t("How often to take it")}>
                {t("We keep every result just as it was, so you can see how far you've come. Leave a couple of months between checks. Two weeks later, it mostly tests whether you remember the questions.")}
              </Explain>
            </Card>
          </div>
        )}

      </Stack>
    </Page>
  );
}
