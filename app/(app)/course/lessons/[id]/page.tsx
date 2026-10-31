import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { lessonById } from "@/lib/course/lessons";
import { titleFor } from "@/lib/progress/locale";
import { conversationFrom } from "@/lib/scenes/lessonReturn";
import { LessonRunner } from "./LessonRunner";
import { lessonView } from "@/lib/progress/lessonView";
import { isAdmin } from "@/lib/auth/admin";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const lesson = lessonById((await params).id);
  return titleFor(lesson ? lesson.title : "A lesson");
}

export const dynamic = "force-dynamic";

/**
 * ONE LESSON, IN ITS STEPS (docs/43-lessons.md §1).
 *
 * Listen, Words, How it works, Practice, Say it, Review, with Write on a
 * part's writing evening. The page works out
 * what the lesson may ask from what the lessons before it taught, and hands the
 * screen the questions already built, so nothing on the client decides what a
 * learner is asked. A1 is the lessons (phase P3): each one is an evening of the
 * planned course, and finishing it records the evening (`finishLesson`).
 */
export default async function LessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ conversation?: string | string[] }> }) {
  const [ownerId, { id }, query, reviewer] = await Promise.all([requireUserId(), params, searchParams, isAdmin()]);
  // Built in `lessonView`, which `GET /api/v1/lessons/{id}` answers with too; only a reviewer here opens a lesson in preview.
  const view = await lessonView(ownerId, id, new Date(), reviewer);
  if (!view) notFound();
  return (
    <LessonRunner
      lesson={view.lesson}
      practice={view.practice}
      review={view.review}
      next={view.next}
      scene={view.scene}
      situation={view.situation}
      worksheet={view.worksheet}
      part={view.part}
      /* The lesson's own conversation sends the learner back here, finished or left partway (`lessonReturn.ts`). */
      conversation={conversationFrom(query.conversation)}
      place={view.place}
      name={view.name}
      due={view.due}
      check={view.check}
      timeMultiplier={view.timeMultiplier}
      partAt={view.partAt}
    />
  );
}
