import { notFound } from "next/navigation";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { LESSON_PARTS, LESSONS, lessonLabel } from "@/lib/course/lessons";
import { Braced } from "@/components/Braced";
import { LessonText } from "@/components/course/LessonText";
import { Card, Chip, Page, SectionTitle, Stack } from "@/components/ui";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return titleFor("The new lessons");
}

export const dynamic = "force-dynamic";

/**
 * THE COURSE AS LESSONS, IN PREVIEW (docs/43-lessons.md, phase P1).
 *
 * The rebuilt A1 is released whole rather than part by part (decision L6),
 * because half a new A1 beside half an old one is two courses. Until it is
 * whole, the lessons are read here by whoever reviews this deployment
 * (`ADMIN_EMAILS`, or anybody on a local install), which is also the native
 * speaker who reads every line before it reaches a learner. Everybody else is
 * shown nothing, not a page saying there is something they cannot have.
 *
 * Nothing here is recorded: a lesson in preview ticks no step and grades no
 * card, so reading it changes nobody's course.
 */
export default async function LessonsPage() {
  const [ownerId, admin] = await Promise.all([requireUserId(), isAdmin()]);
  if (!admin) notFound();
  const locale = await localeFor(ownerId);
  const t = (english: string) => tr(locale, english);

  return (
    <Page
      eyebrow={t("Preview")}
      title={t("The new lessons")}
      lead={t("A1 as lessons: each teaches a whole idea before it asks a thing. Reviewers only, for now.")}
    >
      <Stack>
        {LESSON_PARTS.map((part) => {
          const lessons = LESSONS.filter((l) => l.part === part.id);
          return (
            <section key={part.id}>
              <SectionTitle hint={<LessonText text={part.about} locale={locale} />}><Braced text={part.title} /></SectionTitle>
              <ol className="flex flex-col gap-3">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={`/course/lessons/${lesson.id}`} className="block rounded-[var(--r-xl)]">
                      <Card hover dense>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                            {lessonLabel(lesson)}. <LessonText text={lesson.title} locale={locale} />
                          </p>
                          {lesson.kind !== "lesson" && (
                            <Chip tone="accent">{lesson.kind === "checkin" ? t("Check-in") : t("End of part")}</Chip>
                          )}
                        </div>
                        <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}><LessonText text={lesson.goal} locale={locale} /></p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </Stack>
    </Page>
  );
}
