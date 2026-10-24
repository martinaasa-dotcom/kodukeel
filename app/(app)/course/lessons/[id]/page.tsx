import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { lessonById, lessonLabel, ledgersBefore, LESSON_PARTS, LESSONS, practiceFor, reviewFor } from "@/lib/course/lessons";
import { lessonListStates } from "@/lib/progress/course";
import { titleFor } from "@/lib/progress/locale";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { sayableName } from "@/lib/course/lessons/ownAnswer";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { conversationFrom } from "@/lib/scenes/lessonReturn";
import { LessonRunner } from "./LessonRunner";
import { PROGRAMMES, lessonDayFor } from "@/lib/course";
import { checkAfter } from "@/lib/course/checks";
import { checksPassedFor } from "@/lib/progress/checks";
import { reviewQueue } from "../../../review/queue";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const lesson = lessonById((await params).id);
  return titleFor(lesson ? lesson.title : "A lesson");
}

export const dynamic = "force-dynamic";

/**
 * ONE LESSON, IN ITS SIX STEPS (docs/43-lessons.md §1).
 *
 * Listen, Words, How it works, Practice, Say it, Review. The page works out
 * what the lesson may ask from what the lessons before it taught, and hands the
 * screen the questions already built, so nothing on the client decides what a
 * learner is asked. A1 is the lessons (phase P3): each one is an evening of the
 * planned course, and finishing it records the evening (`finishLesson`).
 */
export default async function LessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ conversation?: string | string[] }> }) {
  const [ownerId, { id }, query] = await Promise.all([requireUserId(), params, searchParams]);
  const lesson = lessonById(id);
  if (!lesson) notFound();
  const before = ledgersBefore(LESSONS).get(lesson.id)!;
  // The one after it in teaching order, which after lesson 26 may be 26a; never into another level.
  const after = LESSONS[LESSONS.indexOf(lesson) + 1];
  const next = after && after.level === lesson.level ? after : null;
  const ofLevel = LESSONS.filter((l) => l.level === lesson.level);
  /*
    What the finished screen points at next, besides the next lesson: the
    cards now due, since a lesson is learned by reviewing it afterwards and a
    learner reported going through all 49 without ever opening Review; and, on
    the last lesson of a part, the check that closes it (`lib/course/checks.ts`).
  */
  const placed = lessonDayFor(lesson.id);
  const check = placed && placed.programme.days[placed.programme.days.length - 1]?.lesson === lesson.id
    ? checkAfter(PROGRAMMES, placed.programme.id) ?? null
    : null;
  // The learner's own name, so a model answer about them says it rather than Tom's.
  const [nameSetting, queue, passed, states] = await Promise.all([
    readSetting(ownerId, SETTING_KEYS.displayName),
    reviewQueue(ownerId, null, new Date()),
    check ? checksPassedFor(ownerId) : Promise.resolve(new Set<string>()),
    lessonListStates(ownerId),
  ]);
  const name = sayableName(nameSetting);
  /*
    THE PART THIS LESSON IS IN, lesson by lesson, so the screen can say "4 of
    8 in First words" and the finish can light the one just done. A lesson
    opened from the list ahead of the course reads the same; what it records
    is `finishLesson`'s decision.
  */
  const partSpec = LESSON_PARTS.find((p) => p.id === lesson.part)!;
  const part = {
    title: partSpec.title,
    lessons: LESSONS.filter((l) => l.part === lesson.part).map((l) => ({
      id: l.id, label: lessonLabel(l), title: l.title, done: states.get(l.id) === "done",
    })),
  };
  /* Across a part's end the way on is its check, so "Next:" stops there until it is passed. */
  const pastTheCheck = !check || passed.has(check.id);
  return (
    <LessonRunner
      lesson={lesson}
      practice={practiceFor(lesson, before, LESSONS.slice(0, LESSONS.indexOf(lesson)))}
      review={reviewFor(lesson, before, LESSONS.slice(0, LESSONS.indexOf(lesson)))}
      next={next && (next.part === lesson.part || pastTheCheck) ? { id: next.id, title: next.title } : null}
      part={part}
      scene={sceneForLesson(lesson.id)?.id ?? null}
      /* The lesson's own conversation sends the learner back here, finished or left partway (`lessonReturn.ts`). */
      conversation={conversationFrom(query.conversation)}
      place={{ at: ofLevel.indexOf(lesson) + 1, of: ofLevel.length }}
      name={name}
      due={queue.due.length}
      check={check ? { id: check.id, final: check.final, passed: passed.has(check.id) } : null}
    />
  );
}
