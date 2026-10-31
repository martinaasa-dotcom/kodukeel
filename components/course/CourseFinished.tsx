"use client";

import { ArrowRight } from "lucide-react";
import { useT } from "@/components/Locale";
import { ButtonLink } from "@/components/Button";
import { Card, SectionTitle } from "@/components/ui";
import { fillNodes } from "@/components/fillNodes";
import { ADVICE, FINALE } from "@/lib/copy/finale";

/** What the course took, read on the server (`lib/progress/courseFinished.ts`). */
export interface CourseFinishedFigures {
  readonly lessons: number;
  readonly days: number;
  readonly conversations: number;
}

/**
 * THE END OF THE COURSE, SAID BACK, AND WHAT KEEPS ESTONIAN ALIVE FROM HERE.
 *
 * One drawing for both places it is reached: the C1 level-done screen, in
 * place of the "Next" card there is no next level for, and `/course` once the
 * C1 check is passed, which is where Today's card sends somebody afterwards.
 * The copy is `lib/copy/finale.ts`; every claim in it was checked against the
 * app. A figure that cannot be read leaves its sentence out rather than
 * printing a nought: a learner placed straight into C1 has few days in the
 * log and may never have told Today about a conversation.
 *
 * `Palju õnne!` and `Aitäh!` are the two phrases A1 teaches for this moment
 * (`a1-eile`, `a1-01-hello`), set in Estonian and marked so.
 */
export function CourseFinished({ figures, heading = "h2", exam = true }: {
  figures: CourseFinishedFigures;
  /** h1 where the screen is the page (`/course`), h2 inside the level-done screen. */
  heading?: "h1" | "h2";
  /** Whether to offer the mock exam here; the level-done screen offers it in a card of its own above. */
  exam?: boolean;
}) {
  const t = useT();
  const Heading = heading;
  const sub = heading === "h1" ? 2 : 3;
  const tere = <span lang="et">Tere</span>;
  return (
    <section aria-labelledby="course-finished" className="flex flex-col gap-4" data-course-finished>
      <Card tone="accent" className="text-center">
        <p lang="et" className="font-display text-4xl font-bold leading-tight tracking-tight" style={{ color: "var(--accent-deep)" }}>
          Palju õnne!
        </p>
        <Heading id="course-finished" tabIndex={-1} className="font-display outline-none mt-3 text-2xl font-bold leading-tight tracking-tight md:text-3xl" style={{ color: "var(--ink)", textWrap: "balance" }}>
          {t(FINALE.heading)}
        </Heading>
        <p className="mx-auto mt-3 max-w-[52ch] text-lg" style={{ color: "var(--ink-2)", textWrap: "pretty" }} data-course-figures>
          {figures.days >= 2
            ? fillNodes(t(FINALE.figures), { Tere: tere, lessons: figures.lessons, days: figures.days })
            : fillNodes(t(FINALE.figuresNoDays), { Tere: tere, lessons: figures.lessons })}
        </p>
        {figures.conversations > 0 && (
          <p className="mx-auto mt-2 max-w-[52ch] text-base" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>
            {figures.conversations === 1
              ? t(FINALE.conversation)
              : fillNodes(t(FINALE.conversations), { conversations: figures.conversations })}
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle level={sub}>{t(FINALE.meansTitle)}</SectionTitle>
        <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(FINALE.means)}</p>
      </Card>

      <Card>
        <SectionTitle level={sub}>{t(FINALE.betterTitle)}</SectionTitle>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>{t(FINALE.betterLead)}</p>
        <ol className="mt-3 flex flex-col gap-3" data-course-advice>
          {ADVICE.map((advice, at) => (
            <li key={advice.lead} className="flex gap-3">
              <span aria-hidden className="font-display text-lg font-bold" style={{ color: "var(--accent-deep)" }}>{at + 1}.</span>
              <div className="min-w-0">
                <p className="text-base" style={{ color: "var(--ink)" }}>
                  <b>{t(advice.lead)}</b> {t(advice.text)}
                </p>
                {advice.app && <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>{t(advice.app)}</p>}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-base" style={{ color: "var(--ink-2)" }}>{t(FINALE.certificate)}</p>
      </Card>

      <Card>
        <SectionTitle level={sub}>{t(FINALE.kindTitle)}</SectionTitle>
        <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(FINALE.kind)}</p>
      </Card>

      <Card>
        <SectionTitle level={sub}>{t(FINALE.fromHereTitle)}</SectionTitle>
        <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(FINALE.fromHere)}</p>
      </Card>

      <Card>
        <SectionTitle level={sub}>{t(FINALE.openTitle)}</SectionTitle>
        <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(FINALE.open)}</p>
      </Card>

      <Card tone="accent" className="text-center">
        <p lang="et" className="font-display text-4xl font-bold leading-tight tracking-tight" style={{ color: "var(--accent-deep)" }}>
          Aitäh!
        </p>
        <p className="mt-2 text-lg" style={{ color: "var(--ink)" }}>{t(FINALE.thanks)}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2" data-course-finished-actions>
          <ButtonLink href="/course/lessons">{t(FINALE.lessons)}</ButtonLink>
          {exam && <ButtonLink href="/exam/C1">{t(FINALE.exam)}</ButtonLink>}
          <ButtonLink href="/" variant="primary">{t(FINALE.today)} <ArrowRight size={15} aria-hidden /></ButtonLink>
        </div>
      </Card>
    </section>
  );
}
