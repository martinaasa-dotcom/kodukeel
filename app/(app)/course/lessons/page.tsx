import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { LESSON_PARTS, LESSONS, lessonLabel } from "@/lib/course/lessons";
import { LessonText } from "@/components/course/LessonText";
import { Card, Chip, Meter, Page, Stack } from "@/components/ui";
import { LEVEL_INFO } from "@/lib/collections/syllabus";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { lessonListStates, movedBackFrom } from "@/lib/progress/course";
import { fill, tr } from "@/lib/copy/locale";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { PROGRAMMES } from "@/lib/course";
import { lessonPartId } from "@/lib/course/lessonCourse";
import { levelAfter } from "@/lib/course/placement";
import { courseChecks } from "@/lib/course/checks";
import { checksPassedFor } from "@/lib/progress/checks";
import { ButtonLink } from "@/components/Button";

export async function generateMetadata() {
  return titleFor("The lessons");
}

export const dynamic = "force-dynamic";

/**
 * EVERY LESSON, IN THE ORDER THEY ARE TAUGHT (docs/43-lessons.md).
 *
 * A1, A2 and B1 are the lessons: the planned course walks them one evening at a
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
  const [locale, states, passed, moved] = await Promise.all([localeFor(ownerId), lessonListStates(ownerId), checksPassedFor(ownerId), movedBackFrom(ownerId)]);
  const checks = courseChecks(PROGRAMMES);
  const t = (english: string) => tr(locale, english);
  const current = LESSONS.find((l) => states.get(l.id) === "current");
  const checkOf = (part: (typeof LESSON_PARTS)[number]) => checks.find((c) => c.programmeId === lessonPartId(part));
  const doneIn = (part: (typeof LESSON_PARTS)[number]) => LESSONS.filter((l) => l.part === part.id && states.get(l.id) === "done").length;
  const sizeOf = (part: (typeof LESSON_PARTS)[number]) => LESSONS.filter((l) => l.part === part.id).length;
  /*
    WHAT TO PRESS NEXT, FROM THE TOP OF THE PAGE. A lesson to continue where
    there is one; a part whose lessons are all done and whose check is still
    open, which used to exist only as the last row of a part somebody had
    already scrolled past; and once the last lesson level's check is passed,
    the course itself, which is where B1 lives.
  */
  const openCheck = LESSON_PARTS.map((part) => ({ part, check: checkOf(part) }))
    .find(({ part, check }) => check && !passed.has(check.id) && doneIn(part) === sizeOf(part));
  const levels = [...new Set(LESSON_PARTS.map((p) => p.level))];
  const lastFinal = checks.filter((c) => c.final).at(-1);
  const allPassed = lastFinal ? passed.has(lastFinal.id) : false;
  const started = LESSONS.some((l) => states.get(l.id) === "done");
  /*
    ONE PART OPEN: the one the learner is in. A hundred lessons in a column is
    a list nobody reads; a level of closed chapters with the current one open
    is a book with a bookmark in it, and every other part is one press away.
  */
  const partHere = LESSON_PARTS.find((part) =>
    LESSONS.some((l) => l.part === part.id && states.get(l.id) === "current") || openCheck?.part.id === part.id)
    ?? LESSON_PARTS.find((part) => doneIn(part) < sizeOf(part));

  return (
    <Page
      title={t("The lessons")}
      lead={t("Each lesson teaches a whole idea before it asks you anything.")}
      actions={openCheck?.check ? (
        <ButtonLink href={`/course/check/${openCheck.check.id}`} variant="primary">
          {t("Take the check")}
        </ButtonLink>
      ) : current ? (
        <ButtonLink href={`/course/lessons/${current.id}`} variant="primary">
          {fill(t(started ? "Continue with lesson {n}" : "Start with lesson {n}"), { n: lessonLabel(current) })}
        </ButtonLink>
      ) : allPassed ? (
        <ButtonLink href="/course" variant="primary">
          {fill(t("Go on to {level}"), { level: levelAfter(lastFinal!.level) ?? lastFinal!.level })}
        </ButtonLink>
      ) : undefined}
    >
      <Stack>
        {/* Somebody who was part way through the old B1 is told why they are on an earlier part, once it is the case. */}
        {moved && (
          <Card tone="butter" data-moved-back={moved.from.id}>
            <p className="text-base" style={{ color: "var(--ink)" }}>
              {fill(t("{level} is built as lessons now, so you pick it up from {part}. The evenings you did before still count, and the words you learned are still in your review."), { level: moved.from.level, part: moved.to.id.toUpperCase() })}
            </p>
          </Card>
        )}
        {levels.map((level) => {
          const parts = LESSON_PARTS.filter((p) => p.level === level);
          const ofLevel = LESSONS.filter((l) => l.level === level);
          const done = ofLevel.filter((l) => states.get(l.id) === "done").length;
          const final = checks.find((c) => c.final && c.level === level);
          const finished = final ? passed.has(final.id) : false;
          const info = LEVEL_INFO[level];
          return (
            <section key={level} aria-labelledby={`level-${level}`} className="flex flex-col gap-4" data-lesson-level={level}>
              {/*
                THE LEVEL, AS ONE THING WITH AN END. Every part used to follow
                the last in one long column, so nothing said that A1 is a
                thing a person finishes, or how far into it they are.
              */}
              <div className="rounded-[var(--r-xl)] border px-5 py-5" style={{ background: finished ? "var(--accent-soft)" : "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth-sm)" }}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 id={`level-${level}`} className="font-display text-2xl font-bold" style={{ color: "var(--ink)" }}>
                    {level}: {t(info.titleEn)}
                  </h2>
                  {finished
                    ? <Chip tone="accent">{t("Finished")}</Chip>
                    : <span className="text-base font-semibold" style={{ color: "var(--ink-2)" }}>{fill(t("{done} of {total} lessons"), { done, total: ofLevel.length })}</span>}
                </div>
                <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>{t(finished ? info.arrival : info.summary)}</p>
                <div className="mt-3">
                  <Meter pct={(done / Math.max(1, ofLevel.length)) * 100} label={fill(t("{level}: {done} of {total} lessons done"), { level, done, total: ofLevel.length })} />
                </div>
              </div>
              {parts.map((part) => {
                const lessons = LESSONS.filter((l) => l.part === part.id);
                // The course's own spelling of the part (`lessonProgrammes`), which is what a check names.
                const check = checkOf(part);
                const partDone = doneIn(part);
                const closed = partDone === lessons.length && (!check || passed.has(check.id));
                return (
                  <details key={part.id} id={part.id} open={partHere?.id === part.id} className="group scroll-mt-20 rounded-[var(--r-xl)]" data-lesson-part={part.id}>
                    <summary className="tap-tint flex cursor-pointer list-none flex-col gap-2 rounded-[var(--r-xl)] px-1 py-2">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="flex items-baseline gap-2 text-xl font-bold" style={{ color: "var(--ink)" }}>
                          {closed && <CheckCircle2 size={18} aria-hidden className="self-center" style={{ color: "var(--accent-deep)" }} />}
                          <LessonText text={part.title} locale={locale} />
                          <ChevronDown size={18} aria-hidden className="self-center transition-transform group-open:rotate-180" style={{ color: "var(--ink-3)" }} />
                        </span>
                        <span className="text-sm font-semibold" style={{ color: closed ? "var(--accent-deep)" : "var(--ink-3)" }}>
                          {closed ? t("All done") : fill(t("{done} of {total} done"), { done: partDone, total: lessons.length })}
                        </span>
                      </span>
                      <span className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={part.about} locale={locale} /></span>
                      <Meter pct={(partDone / lessons.length) * 100} label={fill(t("{done} of {total} done"), { done: partDone, total: lessons.length })} height={6} />
                    </summary>
                    <ol className="mt-3 flex flex-col gap-3">
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
                {/*
                  THE CHECK THAT CLOSES THE PART, as the last row of it: a
                  learner who started in the lessons moves up by passing
                  (`lib/course/checks.ts`), so the list says where each one is.
                */}
                {check && (
                  <li>
                    <Link href={`/course/check/${check.id}`} className="block rounded-[var(--r-xl)]" data-check-row={passed.has(check.id) ? "passed" : "open"}>
                      <Card hover dense tone={passed.has(check.id) ? "accent" : "plain"}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="flex min-w-0 items-baseline gap-2 text-lg font-bold" style={{ color: "var(--ink)" }}>
                            {passed.has(check.id) && (
                              <CheckCircle2 size={18} aria-hidden className="self-center" style={{ color: "var(--accent-deep)" }} />
                            )}
                            <span>{check.final ? fill(t("The {level} check"), { level: part.level }) : t("The check for this part")}</span>
                          </p>
                          <Chip tone={passed.has(check.id) ? "accent" : "neutral"}>{passed.has(check.id) ? t("Passed") : t("Check")}</Chip>
                        </div>
                        <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
                          {check.final
                            ? fill(t("Everything {level} taught. Pass it to open {next}."), { level: part.level, next: levelAfter(part.level) ?? part.level })
                            : t("What this part taught. Pass it to open the next part.")}
                        </p>
                      </Card>
                    </Link>
                  </li>
                )}
                    </ol>
                  </details>
                );
              })}
            </section>
          );
        })}
      </Stack>
    </Page>
  );
}
