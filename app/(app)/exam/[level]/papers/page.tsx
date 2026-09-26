import { notFound } from "next/navigation";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { numberedPapers } from "@/lib/progress/exam";
import { isExamLevel, PASS_PCT, specFor } from "@/lib/exam/spec";
import { PAPERS_PER_LEVEL } from "@/lib/exam/seed";
import { SKILLS, SKILL_LABEL } from "@/lib/exam/types";
import { ButtonLink } from "@/components/Button";
import { Page } from "@/components/ui";
import { Explain } from "@/components/Explain";

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const upper = level.toUpperCase();
  return { title: isExamLevel(upper) ? `${upper} numbered papers` : "Numbered papers" };
}

export const dynamic = "force-dynamic";

/**
 * The numbered papers at one level.
 *
 * A random paper is right for the question "could I pass today", and wrong for
 * working through a set the way a workbook is worked through: sitting paper 7,
 * reading the answers, and sitting it again next week to see whether the work
 * moved anything. These are that set. The same number gives the same questions
 * whoever sits it and whenever (`lib/exam/seed.ts`), and each part can be sat
 * on its own for the evening that only has room for the reading.
 *
 * What the list shows is read off the sittings, never stored.
 */
export default async function NumberedPapersPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const upper = level.toUpperCase();
  if (!isExamLevel(upper)) notFound();
  const ownerId = await requireUserId();
  const papers = await numberedPapers(ownerId, upper, PAPERS_PER_LEVEL);
  const spec = specFor(upper);
  // One loud action on the shelf: the next paper nobody has sat.
  const nextUp = papers.find((p) => !p.whole)?.number;

  return (
    <Page
      eyebrow={`Mock examination · ${upper}`}
      title="Numbered papers"
      lead="The same questions each time you open one, so you can sit a paper again and compare."
      actions={<ButtonLink href="/exam" variant="secondary">Back to the exam</ButtonLink>}
    >
      <Explain label="Sitting one part on its own">
        Each part can also be sat on its own, on its own clock. A part on its own is a mark for
        that part, never a pass or a fail: the real paper marks all four together, and{" "}
        {PASS_PCT} percent of the total is the pass.
      </Explain>
      {/*
        A shelf of papers rather than a column of identical cards. Twenty-five
        rows each repeating "Not sat yet" and the same four links read as a
        form to fill in; a grid of numbered tiles reads as a set to work
        through, and the one sat last is the one that stands out.
      */}
      <div className="@container mt-6">
      <ol className="grid grid-cols-2 gap-3 @xl:grid-cols-3 @3xl:grid-cols-4">
        {papers.map((paper) => {
          const open = paper.number === nextUp || !!paper.whole || Object.values(paper.parts).some(Boolean);
          return (
          <li
            key={paper.number}
            // A paper with its parts on show takes the row; a plain one is half
            // of it, so twenty-five papers are a shelf rather than a scroll.
            className={`flex flex-col gap-3 rounded-[var(--r-lg)] border px-4 py-3 ${open ? "col-span-2" : ""}`}
            style={{
              borderColor: paper.whole ? (paper.whole.passed ? "var(--mint)" : "var(--peach)") : "var(--rule-soft)",
              background: "var(--surface)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-lg font-bold" style={{ color: "var(--ink)" }}>
                  Paper {paper.number}
                </span>
                {paper.whole ? (
                  <Link href={`/exam/result/${paper.whole.id}`} className="text-sm font-semibold underline underline-offset-4" style={{ color: paper.whole.passed ? "var(--good-ink)" : "var(--again-ink)" }}>
                    {paper.whole.pct} percent, {paper.whole.passed ? "a pass" : "not a pass"}
                  </Link>
                ) : (
                  <span className="block text-sm" style={{ color: "var(--ink-3)" }}>Not sat yet</span>
                )}
              </span>
              <ButtonLink href={`/exam/${upper}?paper=${paper.number}`} variant={paper.number === nextUp ? "primary" : "secondary"} size="sm">
                {paper.whole ? "Sit again" : "Sit it"}
              </ButtonLink>
            </div>
            {/* One part at a time is offered where it is likely to be wanted, on
                the paper up next and on a paper already started. Four part
                buttons on each of twenty-five cards was a hundred buttons
                saying the same four words. */}
            {open && (
            <p className="flex flex-wrap gap-1.5" aria-label={`Paper ${paper.number}, one part on its own`}>
              {SKILLS.filter((skill) => spec.parts.some((p) => p.skill === skill)).map((skill) => {
                const done = paper.parts[skill];
                return (
                  <Link
                    key={skill}
                    href={`/exam/${upper}?paper=${paper.number}&part=${skill}`}
                    className="choice-btn press inline-flex min-h-8 items-center gap-1 rounded-full border px-2 text-xs pointer-coarse:min-h-11 font-semibold"
                  >
                    {SKILL_LABEL[skill]}
                    {done ? <span className="tnum" style={{ color: "var(--ink-3)" }}>{done.pct}%</span> : null}
                  </Link>
                );
              })}
            </p>
            )}
          </li>
          );
        })}
      </ol>
      </div>
    </Page>
  );
}
