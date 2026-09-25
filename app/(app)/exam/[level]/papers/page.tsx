import { notFound } from "next/navigation";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { numberedPapers } from "@/lib/progress/exam";
import { isExamLevel, PASS_PCT, specFor } from "@/lib/exam/spec";
import { PAPERS_PER_LEVEL } from "@/lib/exam/seed";
import { SKILLS, SKILL_LABEL } from "@/lib/exam/types";
import { ButtonLink } from "@/components/Button";
import { Card, Chip, Page } from "@/components/ui";

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

  return (
    <Page
      eyebrow={`Mock examination · ${upper}`}
      title="Numbered papers"
      lead="The same questions each time you open one, so you can sit a paper again and compare."
      actions={<ButtonLink href="/exam" variant="secondary">Back to the exam</ButtonLink>}
    >
      <p className="mb-6 max-w-[64ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
        Each part can also be sat on its own, on its own clock. A part on its own is a mark for
        that part, never a pass or a fail: the real paper marks all four together, and{" "}
        {PASS_PCT} percent of the total is the pass.
      </p>
      <ol className="grid gap-3">
        {papers.map((paper) => (
          <Card as="li" key={paper.number} className="!py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                  Paper {paper.number}
                </span>
                {paper.whole ? (
                  <Link href={`/exam/result/${paper.whole.id}`} className="underline underline-offset-4">
                    <Chip tone={paper.whole.passed ? "good" : "again"}>
                      Last sat at {paper.whole.pct} percent, {paper.whole.passed ? "a pass" : "not a pass"}
                    </Chip>
                  </Link>
                ) : (
                  <Chip tone="neutral">Not sat yet</Chip>
                )}
              </span>
              <ButtonLink href={`/exam/${upper}?paper=${paper.number}`} variant="secondary" size="sm">
                Sit the whole paper
              </ButtonLink>
            </div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm" style={{ color: "var(--ink-2)" }}>
              <span style={{ color: "var(--ink-3)" }}>One part:</span>
              {SKILLS.filter((skill) => spec.parts.some((p) => p.skill === skill)).map((skill) => {
                const done = paper.parts[skill];
                return (
                  <Link
                    key={skill}
                    href={`/exam/${upper}?paper=${paper.number}&part=${skill}`}
                    className="font-semibold underline underline-offset-4"
                  >
                    {SKILL_LABEL[skill]}
                    {done ? `, last ${done.pct} percent` : ""}
                  </Link>
                );
              })}
            </p>
          </Card>
        ))}
      </ol>
    </Page>
  );
}
