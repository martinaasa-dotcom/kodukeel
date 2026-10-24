import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { checkView } from "@/lib/progress/lessons";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { Page } from "@/components/ui";
import { CheckRunner } from "./CheckRunner";

export async function generateMetadata() {
  return titleFor("A check");
}

export const dynamic = "force-dynamic";

/**
 * THE CHECK AT THE END OF A PART OF A1 (`lib/course/checks.ts`).
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

  return (
    <Page
      eyebrow={<span>{part.id.toUpperCase()}</span>}
      title={check.final ? fill(tr(locale, "The {level} check"), { level: part.level }) : fill(tr(locale, "Check: {part}"), { part: tr(locale, part.title) })}
      lead={fill(
        tr(locale, check.final
          ? "{n} questions on all of {level}. Get {needed} right to open {next}. Try as often as you like."
          : "{n} questions on this part. Get {needed} right to open {next}. Try as often as you like."),
        { n: paper.length, needed, level: part.level, next: next ? next.id.toUpperCase() : tr(locale, "the next part") },
      )}
    >
      <CheckRunner
        key={attempt}
        checkId={check.id}
        attempt={attempt}
        items={paper}
        needed={needed}
        alreadyPassed={view.alreadyPassed}
        next={next ? { id: next.id, label: next.id.toUpperCase() } : null}
      />
    </Page>
  );
}
