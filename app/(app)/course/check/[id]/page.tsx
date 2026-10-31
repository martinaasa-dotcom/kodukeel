import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { checkView } from "@/lib/progress/lessons";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { Page } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { isLessonLevel } from "@/lib/course/lessons";
import { courseFinishedFigures } from "@/lib/progress/courseFinished";
import { CheckRunner } from "./CheckRunner";

export async function generateMetadata() {
  return titleFor("A check");
}

export const dynamic = "force-dynamic";

/**
 * THE CHECK AT THE END OF A PART OF THE LESSONS (`lib/course/checks.ts`).
 *
 * The paper is built here from the check and the attempt, and the same pair
 * is what the action rebuilds to mark it, so nothing the browser sends decides
 * a question or a mark. `?try=` is the attempt: another go is a new address,
 * which asks a different selection and mounts a fresh runner.
 */
export default async function CheckPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ try?: string | string[] }>;
}) {
  const [ownerId, { id }, query] = await Promise.all([requireUserId(), params, searchParams]);
  const raw = Array.isArray(query.try) ? query.try[0] : query.try;
  // Built in `checkView`, which `GET /api/v1/checks/{id}` answers with too.
  const [view, locale] = await Promise.all([
    checkView(ownerId, id, Number.parseInt(raw ?? "1", 10) || 1),
    localeFor(ownerId),
  ]);
  if (!view) notFound();
  const { check, attempt, paper, needed, part, next, levelDone } = view;
  /* The check after the course's last part finishes the course, so its pass draws the course-finished screen, with what the course took. */
  const endsCourse = check.final && !next;
  const finished = endsCourse && view.open ? await courseFinishedFigures(ownerId) : null;
  // Where a pass leads is `checkView`'s, so the app's check says the same.
  const nextName = view.nextLabel === null ? null : tr(locale, view.nextLabel);
  const level = levelDone && {
    ...levelDone,
    arrival: tr(locale, levelDone.arrival),
    parts: levelDone.parts.map((p) => tr(locale, p)),
    next: levelDone.next && {
      ...levelDone.next,
      title: tr(locale, levelDone.next.title),
      summary: tr(locale, levelDone.next.summary),
    },
  };

  const eyebrow = <span>{part.level}, {isLessonLevel(part.level) ? tr(locale, part.title) : part.id.toUpperCase()}</span>;
  const title = check.final ? fill(tr(locale, "The {level} check"), { level: part.level }) : fill(tr(locale, "Check: {part}"), { part: tr(locale, part.title) });
  /*
    NOT YET, SAID BEFORE THE PAPER RATHER THAN AFTER IT. A check further up
    than the part the learner stands on is refused when it is handed in
    (`submitCheckFor`), so drawing its questions would ask thirty answers of
    somebody and then tell them none of it counted.
  */
  if (!view.open) {
    return (
      <Page eyebrow={eyebrow} title={title} lead={tr(locale, "This check opens once you reach this part of the lessons.")}>
        <div>
          <ButtonLink href="/course/lessons" variant="primary">{tr(locale, "Back to the lessons")}</ButtonLink>
        </div>
      </Page>
    );
  }

  return (
    <Page
      eyebrow={eyebrow}
      title={title}
      lead={fill(
        tr(locale, endsCourse
          ? "{n} questions on all of {level}. Get {needed} right to finish the course."
          : check.final
          ? "{n} questions on all of {level}. Get {needed} right to open {next}. Try as often as you like."
          : "{n} questions on this part. Get {needed} right to open {next}. Try as often as you like."),
        { n: paper.length, needed, level: part.level, next: nextName ?? tr(locale, "the next part") },
      )}
    >
      <CheckRunner
        key={attempt}
        checkId={check.id}
        attempt={attempt}
        items={paper}
        needed={needed}
        alreadyPassed={view.alreadyPassed}
        pastNext={view.pastNext}
        next={next && nextName ? { id: next.id, label: nextName } : null}
        level={level}
        finished={finished}
      />
    </Page>
  );
}
