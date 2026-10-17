import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { LESSON_PARTS, LESSONS, lessonLabel } from "@/lib/course/lessons";
import { Braced } from "@/components/Braced";
import { LessonText } from "@/components/course/LessonText";
import { Card, Chip, Page, SectionTitle, Stack } from "@/components/ui";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return titleFor("The A1 lessons");
}

export const dynamic = "force-dynamic";

/**
 * EVERY A1 LESSON, IN THE ORDER THEY ARE TAUGHT (docs/43-lessons.md).
 *
 * A1 is the lessons (phase P3): the planned course walks them one evening at a
 * time, and this is the whole list, for somebody who wants to look back at one
 * or read ahead. Reading ahead records nothing, since the course reaches a
 * lesson when the course reaches it (`finishLesson`).
 */
export default async function LessonsPage() {
  const ownerId = await requireUserId();
  const locale = await localeFor(ownerId);
  const t = (english: string) => tr(locale, english);

  return (
    <Page
      title={t("The A1 lessons")}
      lead={t("Each lesson teaches a whole idea before it asks you anything.")}
    >
      <Stack>
        {LESSON_PARTS.map((part) => {
          const lessons = LESSONS.filter((l) => l.part === part.id);
          return (
            <section key={part.id} id={part.id} className="scroll-mt-20">
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
