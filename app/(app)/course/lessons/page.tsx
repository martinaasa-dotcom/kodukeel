import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { LESSON_PARTS, LESSONS, lessonLabel } from "@/lib/course/lessons";
import { LessonText } from "@/components/course/LessonText";
import { Card, Chip, Page, SectionTitle, Stack } from "@/components/ui";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { lessonListStates } from "@/lib/progress/course";
import { fill, tr } from "@/lib/copy/locale";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/Button";

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
 *
 * AND IT SAYS WHERE YOU ARE IN IT. A learner reported scrolling the list with
 * no idea which lessons were behind them: a finished lesson is drawn on the
 * accent tint with a tick, the one to do next carries an accent edge and
 * "You are here", and each part counts how many of its lessons are done. The
 * tint is never the only signal: the tick, the chip and the words say it too.
 */
export default async function LessonsPage() {
  const ownerId = await requireUserId();
  const [locale, states] = await Promise.all([localeFor(ownerId), lessonListStates(ownerId)]);
  const t = (english: string) => tr(locale, english);
  const current = LESSONS.find((l) => states.get(l.id) === "current");

  return (
    <Page
      title={t("The A1 lessons")}
      lead={t("Each lesson teaches a whole idea before it asks you anything.")}
      actions={current ? (
        <ButtonLink href={`/course/lessons/${current.id}`} variant="primary">
          {fill(t("Continue with lesson {n}"), { n: lessonLabel(current) })}
        </ButtonLink>
      ) : undefined}
    >
      <Stack>
        {LESSON_PARTS.map((part) => {
          const lessons = LESSONS.filter((l) => l.part === part.id);
          const done = lessons.filter((l) => states.get(l.id) === "done").length;
          return (
            <section key={part.id} id={part.id} className="scroll-mt-20">
              <SectionTitle hint={<LessonText text={part.about} locale={locale} />}><LessonText text={part.title} locale={locale} /></SectionTitle>
              {done > 0 && (
                <p className="-mt-1 mb-3 text-sm font-semibold" style={{ color: "var(--accent-deep)" }}>
                  {done === lessons.length ? t("All done") : fill(t("{done} of {total} done"), { done, total: lessons.length })}
                </p>
              )}
              <ol className="flex flex-col gap-3">
                {lessons.map((lesson) => {
                  const state = states.get(lesson.id) ?? "ahead";
                  return (
                    <li key={lesson.id} id={state === "current" ? "current-lesson" : undefined} className="scroll-mt-24">
                      <Link
                        href={`/course/lessons/${lesson.id}`}
                        className="block rounded-[var(--r-xl)]"
                        aria-current={state === "current" ? "step" : undefined}
                        data-lesson-state={state}
                      >
                        <Card
                          hover
                          dense
                          tone={state === "done" ? "accent" : "plain"}
                          style={state === "current" ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent), var(--depth)" } : undefined}
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <p className="flex min-w-0 items-baseline gap-2 text-lg font-bold" style={{ color: "var(--ink)" }}>
                              {state === "done" && (
                                <CheckCircle2 size={18} aria-hidden className="self-center" style={{ color: "var(--accent-deep)" }} />
                              )}
                              <span>{lessonLabel(lesson)}. <LessonText text={lesson.title} locale={locale} /></span>
                            </p>
                            <span className="flex flex-wrap items-center gap-1.5">
                              {state === "done" && <Chip tone="accent">{t("Done")}</Chip>}
                              {state === "current" && <Chip tone="accent">{t("You are here")}</Chip>}
                              {lesson.kind !== "lesson" && (
                                <Chip tone="neutral">{lesson.kind === "checkin" ? t("Check-in") : t("End of part")}</Chip>
                              )}
                            </span>
                          </div>
                          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}><LessonText text={lesson.goal} locale={locale} /></p>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </Stack>
    </Page>
  );
}
