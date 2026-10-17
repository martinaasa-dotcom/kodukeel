import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { lessonById, ledgersBefore, LESSONS, practiceFor, reviewFor } from "@/lib/course/lessons";
import { titleFor } from "@/lib/progress/locale";
import { LessonRunner } from "./LessonRunner";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const lesson = lessonById((await params).id);
  return titleFor(lesson ? lesson.title : "A lesson");
}

export const dynamic = "force-dynamic";

/**
 * ONE LESSON, IN ITS SIX STEPS (docs/43-lessons.md §1), IN PREVIEW.
 *
 * Listen, Words, How it works, Practise, Say it, Review. The page works out
 * what the lesson may ask from what the lessons before it taught, and hands the
 * screen the questions already built, so nothing on the client decides what a
 * learner is asked. Reviewers only until A1 is whole (decision L6), and it
 * records nothing.
 */
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const [, admin, { id }] = await Promise.all([requireUserId(), isAdmin(), params]);
  const lesson = admin ? lessonById(id) : null;
  if (!lesson) notFound();
  const before = ledgersBefore(LESSONS).get(lesson.id)!;
  // The one after it in teaching order, which after lesson 26 may be 26a; never into another level.
  const after = LESSONS[LESSONS.indexOf(lesson) + 1];
  const next = after && after.level === lesson.level ? after : null;
  return (
    <LessonRunner
      lesson={lesson}
      practice={practiceFor(lesson, before)}
      review={reviewFor(lesson, before)}
      next={next ? { id: next.id, title: next.title } : null}
    />
  );
}
