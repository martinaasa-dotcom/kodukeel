import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { checkView } from "@/lib/progress/lessons";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { Page } from "@/components/ui";
import { LEVEL_INFO } from "@/lib/collections/syllabus";
import { LESSON_PARTS, LESSONS, isLessonLevel } from "@/lib/course/lessons";
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
  const { check, attempt, paper, needed, part, next } = view;
  /*
    WHAT THE NEXT PART IS CALLED, by its name rather than its id: "Where you
    live" says where the learner is going, `A1.2` says where it is filed. A
    new level is named by its level, since its first part is not the point.
  */
  const nextName = !next ? null
    : next.level !== part.level ? next.level
    : isLessonLevel(next.level) ? tr(locale, next.title) : next.id.toUpperCase();
  /*
    THE END OF A LEVEL IS A THING THAT HAPPENED. Passing the last check of a
    level used to read "B1.1 is open", the same sentence a part's check gets,
    so the screen a learner reaches after a hundred evenings said less than
    the screen after one. A final check carries what the level was (its parts
    and what somebody can now do) and what the next one is, including that
    from B1 on an evening is built differently.
  */
  const level = check.final ? {
    level: part.level,
    arrival: tr(locale, LEVEL_INFO[part.level].arrival),
    parts: LESSON_PARTS.filter((p) => p.level === part.level).map((p) => tr(locale, p.title)),
    lessons: LESSONS.filter((l) => l.level === part.level).length,
    next: next ? {
      level: next.level,
      title: tr(locale, LEVEL_INFO[next.level].titleEn),
      summary: tr(locale, LEVEL_INFO[next.level].summary),
      lessons: isLessonLevel(next.level),
    } : null,
  } : null;

  return (
    <Page
      eyebrow={<span>{part.level}, {isLessonLevel(part.level) ? tr(locale, part.title) : part.id.toUpperCase()}</span>}
      title={check.final ? fill(tr(locale, "The {level} check"), { level: part.level }) : fill(tr(locale, "Check: {part}"), { part: tr(locale, part.title) })}
      lead={fill(
        tr(locale, check.final
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
        next={next && nextName ? { id: next.id, label: nextName } : null}
        level={level}
      />
    </Page>
  );
}
