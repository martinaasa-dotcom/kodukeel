import { prisma } from "@/lib/db";
import { LESSON_STEP, PROGRAMMES, lessonDayFor, programmeAfter, programmeById, type Programme } from "@/lib/course";
import { checkById, checkPaper, type CourseCheck } from "@/lib/course/checks";
import { CHECK_PASS, markCheck, type CheckResult, type PracticeItem } from "@/lib/course/lessons/practice";
import { dayIsInPlay, programmeFor } from "@/lib/progress/course";
import { checksPassedFor, recordCheckPassed } from "@/lib/progress/checks";
import { addPlanToDeck, planLemmas } from "@/lib/srs/deck";

/**
 * A LESSON FINISHED AND A CHECK MARKED, FOR AN OWNER ALREADY RESOLVED.
 *
 * The bodies of `finishLesson` and `submitCheck`, moved out of `app/actions.ts`
 * so the web's actions and the v1 routes a native app calls are one body each
 * (ADR-029, D2). Each door resolves its owner, keeps its own throttle and its
 * own refresh of the web's pages, and calls these; nothing about what they do
 * changed in the move.
 */

/**
 * The cards a day's words arrive with.
 *
 * Recognition and production and no more, which is the same trade the
 * frequency page makes for the same reason: a day is eight words, a case card
 * apiece would be sixty-odd cards for one press, and the day's own rounds are
 * where the forms get asked. The unit those words came from is still there on
 * `/learn` for anybody who wants the whole thing.
 */
export const COURSE_DAY_CARDS = ["RECOGNITION", "PRODUCTION"] as const;

export type FinishLessonResult =
  | { ok: true; recorded: boolean }
  | { ok: false; reason: "not_found"; error: string };

/**
 * A LESSON, FINISHED: ITS EVENING TICKED AND ITS WORDS IN THE DECK.
 *
 * A1 is the lessons (docs/43-lessons.md, phase P3), and an evening of A1 is
 * one lesson with one step. The step is ticked, which is what moves the course
 * on (`dayReached`), and the lesson's words go into the deck as recognition and
 * production, so Review and Practice repeat what the lesson taught and nothing
 * it did not.
 *
 * The lesson is named by id and resolved here, so a caller cannot name an
 * evening it is not on: a lesson ahead of the learner's evening is still a
 * lesson they may read, and finishing it records nothing and builds nothing,
 * since the course reaches it when the course reaches it. A learner who has
 * turned the planned course off is not on any evening, so their deck gets the
 * words and nothing is ticked.
 */
export async function finishLessonFor(ownerId: string, lessonId: string): Promise<FinishLessonResult> {
  const found = lessonDayFor(lessonId);
  if (!found) return { ok: false, reason: "not_found", error: "That lesson isn't part of the course." };
  const { programme, day } = found;
  const [following, inPlay] = await Promise.all([
    programmeFor(ownerId),
    dayIsInPlay(ownerId, programme, day),
  ]);
  if (!inPlay && following) return { ok: true, recorded: false };

  await addPlanToDeck(ownerId, planLemmas(day.words, COURSE_DAY_CARDS), "COURSE");
  if (inPlay) {
    await prisma.courseStep.upsert({
      where: {
        ownerId_programmeId_dayId_stepId: {
          ownerId, programmeId: programme.id, dayId: day.id, stepId: LESSON_STEP,
        },
      },
      update: {},
      create: { ownerId, programmeId: programme.id, dayId: day.id, stepId: LESSON_STEP },
    });
  }
  return { ok: true, recorded: inPlay };
}

export type SubmitCheckResult =
  | ({ ok: true } & CheckResult)
  | { ok: false; reason: "not_found" | "invalid"; error: string };

/**
 * MARKS A CHECK AT THE END OF A PART OF A1, AND RECORDS A PASS.
 *
 * The caller sends which check, which attempt and what was picked or typed for
 * each question, never a mark: the server builds the same paper from the check
 * and the attempt (`checkPaper`) and marks it itself (`markCheck`), which is
 * ADR-022's rule for the mock exam. A pass is stored as a setting, since
 * nothing in the review log can say a check was passed; a fail stores nothing,
 * and the next attempt asks a different selection.
 *
 * The three arguments are checked by the door that took them off the wire, the
 * action with its own schema and the route with the contract's.
 */
export async function submitCheckFor(
  ownerId: string, checkId: string, attempt: number, responses: readonly (string | null)[],
): Promise<SubmitCheckResult> {
  const check = checkById(PROGRAMMES, checkId);
  if (!check) return { ok: false, reason: "not_found", error: "We couldn't find that check." };
  const paper = checkPaper(check, attempt);
  if (paper.length === 0 || responses.length !== paper.length) {
    return { ok: false, reason: "invalid", error: "That check didn't match the questions, so it wasn't saved. Reload and try again." };
  }
  const result = markCheck(paper, responses);
  if (result.passed) await recordCheckPassed(ownerId, check.id);
  return { ok: true, ...result };
}

export interface CheckView {
  check: CourseCheck;
  attempt: number;
  /** The attempt's questions, built here and built again to mark them. */
  paper: PracticeItem[];
  /** How many marks a pass takes. */
  needed: number;
  alreadyPassed: boolean;
  /** The part this check closes, and the part a pass opens. */
  part: Programme;
  next: Programme | null;
}

/**
 * ONE ATTEMPT'S PAPER AT A PART'S CHECK, FOR BOTH DOORS.
 *
 * What the check page hands `CheckRunner` and `GET /api/v1/checks/{id}`
 * answers with. The attempt is held to the range the page always allowed, so
 * another go is a new attempt that asks a different selection, and the same
 * pair is what `submitCheckFor` rebuilds to mark it.
 */
export async function checkView(ownerId: string, checkId: string, attempt: number): Promise<CheckView | null> {
  const check = checkById(PROGRAMMES, checkId);
  if (!check) return null;
  const at = Math.min(10_000, Math.max(1, Number.isFinite(attempt) ? Math.trunc(attempt) : 1));
  const passed = await checksPassedFor(ownerId);
  const part = programmeById(check.programmeId)!;
  const paper = checkPaper(check, at);
  return {
    check,
    attempt: at,
    paper,
    needed: Math.ceil(paper.length * CHECK_PASS),
    alreadyPassed: passed.has(check.id),
    part,
    next: programmeAfter(part) ?? null,
  };
}
