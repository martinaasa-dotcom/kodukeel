import { lessonById, lessonLabel, LESSON_PARTS, LESSONS, type LessonSpec } from "@/lib/course/lessons";
import { PREVIEW_LESSONS, PREVIEW_PARTS } from "@/lib/course/lessons/preview";
import { lessonListStates } from "@/lib/progress/course";
import { acceptedSentences, withOrders, type PracticeItem } from "@/lib/course/lessons/practice";
import { orderContextFor } from "@/lib/dict/wordOrder";
import { lessonWordsWorthAsking } from "@/lib/estonian/wordOrder";
import { sayableName } from "@/lib/course/lessons/ownAnswer";
import { lessonPlan, ledgerTonight } from "@/lib/progress/lessonPlan";
import { glossSentences, type GlossedToken } from "@/lib/dict/glossed";
import { onlyUntaught, readUntaught } from "@/lib/course/lessons/read";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { checksPassedFor } from "@/lib/progress/checks";
import { reviewQueue } from "@/lib/progress/dailyQueue";
import { prisma } from "@/lib/db";
import { confusions } from "@/lib/stats/confusions";
import { multiplierFor, roundPaceFrom } from "@/lib/ux/roundClock";
import type { LessonWorksheet } from "@/lib/course/lessonWorksheet";

/**
 * How far back a lesson looks for the learner's own mix-ups: the newest
 * answers that reached for another form, which is plenty to rank a few pairs
 * and bounds the read for somebody with years of reviews.
 */
const MIXUPS_READ = 1000;

/**
 * WHAT ONE LESSON'S SCREEN IS HANDED, BUILT ONCE FOR BOTH DOORS.
 *
 * The lesson page hands this to `LessonRunner` and `GET /api/v1/lessons/{id}`
 * answers with it (ADR-029, D2), so a phone and a browser opening one lesson
 * are asked the same questions in the same order. Moved out of the page and
 * otherwise unchanged: the page keeps its markup and the one thing only a
 * browser has, the way back from the lesson's own conversation.
 */
export interface LessonView {
  lesson: LessonSpec;
  practice: readonly PracticeItem[];
  review: readonly PracticeItem[];
  next: { id: string; title: string } | null;
  scene: string | null;
  /** A conversation out there the lesson rehearses, from the catalog, offered on its finish (`lessonSituations.ts`). */
  situation: { id: string; title: string } | null;
  /** From B1, a worksheet page on what the lessons have taught, offered on the finish (`lessonWorksheet.ts`); a lesson in preview is on no evening and offers none. */
  worksheet: LessonWorksheet | null;
  place: { at: number; of: number };
  name: string | null;
  due: number;
  check: { id: string; final: boolean; passed: boolean } | null;
  /** The part this lesson is in, lesson by lesson, for "4 of 8" and the track on the finish. */
  part: { title: string; lessons: readonly { id: string; label: string; title: string; done: boolean }[] };
  /** Which part of its level the lesson is in, counted from 1: the fade starts harder from the fourth (`fade.ts`). */
  partAt: number;
  /** How many times the standard a timed go runs for this learner (`lib/ux/roundClock.ts`). */
  timeMultiplier: number;
  /**
   * The lesson's text to read (B2 on, `LessonSpec.read`), a line at a time,
   * with the dictionary under each word the lessons have not taught by now
   * and nothing under the ones they have; null where there is no text.
   */
  read: readonly (readonly GlossedToken[])[] | null;
}

/**
 * How many distinct words a text to read may ask the dictionary about: a
 * notice or a school message is a few sentences, so this is the ceiling a
 * whole page of one would reach, stated so it cannot grow quietly.
 */
const READ_WORD_BUDGET = 200;

/**
 * The dictionary under a lesson's text, the untaught words only. Glossed
 * whatever the learner's underline setting, as reading mode is: on a text the
 * course knows runs ahead of them, the underlines are the point.
 */
async function readTokens(lesson: LessonSpec): Promise<GlossedToken[][] | null> {
  if (!lesson.read || lesson.read.lines.length === 0) return null;
  const untaught = readUntaught(lesson, ledgerTonight(lesson));
  const glossed = await glossSentences(lesson.read.lines.map((l) => ({ et: l.et, form: null })), READ_WORD_BUDGET);
  return glossed.map((tokens, i) => onlyUntaught(tokens, untaught[i] ?? new Set()));
}

/**
 * One lesson's view for a learner, or null where there is no such lesson.
 *
 * Besides the plan, the three facts about the learner the finished screen
 * reads: their own name, so a model answer about them says it rather than
 * Tom's; the cards now due, since a lesson is learned by reviewing it
 * afterwards and a learner reported going through all 49 without ever opening
 * Review; and whether the check that closes the part is passed.
 */
export async function lessonView(
  ownerId: string, lessonId: string, now: Date = new Date(),
  /** Whether a lesson in preview may be opened: a reviewer on the website, never the native door. */
  allowPreview = false,
): Promise<LessonView | null> {
  const lesson = lessonById(lessonId) ?? (allowPreview ? PREVIEW_LESSONS.find((l) => l.id === lessonId) ?? null : null);
  if (!lesson) return null;
  // Every read at once: none of them needs another's answer, and each is a round trip.
  const [mixups, nameSetting, pace, queue, passed, states, read] = await Promise.all([
    lesson.fixes?.length
      ? prisma.review.findMany({
        where: { ownerId, reachedSlot: { not: null } },
        select: { slot: true, reachedSlot: true },
        orderBy: [{ reviewedAt: "desc" }, { id: "asc" }],
        take: MIXUPS_READ,
      })
      : Promise.resolve([]),
    readSetting(ownerId, SETTING_KEYS.displayName),
    readSetting(ownerId, SETTING_KEYS.roundPace),
    reviewQueue(ownerId, null, now),
    // Whether the part's check is passed is asked whatever the lesson, since knowing which lesson closes a part needs the plan.
    checksPassedFor(ownerId),
    lessonListStates(ownerId),
    readTokens(lesson),
  ]);
  const { closes, after, ...built } = lessonPlan(lesson, confusions(mixups).map((c) => c.pair));
  /*
    THE OTHER ORDERS OF A REWORK'S SENTENCES THE DICTIONARY VOUCHES FOR, which
    the marker calls right and which it cannot work out alone, since which
    words are verbs is the dictionary's to say and the lesson marks in the
    browser. One read, bounded by the sentences the lesson counts.
  */
  const dict = await orderContextFor(acceptedSentences([...built.practice, ...built.review]), lessonWordsWorthAsking);
  const plan = { ...built, practice: withOrders(built.practice, dict), review: withOrders(built.review, dict) };
  /*
    THE PART THIS LESSON IS IN, lesson by lesson, so the screen can say "4 of
    8 in First words" and the finish can light the one just done. A lesson
    opened from the list ahead of the course reads the same; what it records
    is `finishLesson`'s decision.
  */
  const partSpec = [...LESSON_PARTS, ...PREVIEW_PARTS].find((p) => p.id === lesson.part)!;
  const part = {
    title: partSpec.title,
    lessons: [...LESSONS, ...PREVIEW_LESSONS].filter((l) => l.part === lesson.part).map((l) => ({
      id: l.id, label: lessonLabel(l), title: l.title, done: states.get(l.id) === "done",
    })),
  };
  /* Across a part's end the way on is its check, so "Next:" stops there until it is passed. */
  const pastTheCheck = !closes || passed.has(closes.id);
  return {
    ...plan,
    next: after && (!after.crossesPart || pastTheCheck) ? { id: after.id, title: after.title } : null,
    part,
    name: sayableName(nameSetting),
    due: queue.due.length,
    check: closes ? { id: closes.id, final: closes.final, passed: passed.has(closes.id) } : null,
    partAt: Math.max(1, [...LESSON_PARTS, ...PREVIEW_PARTS].filter((p) => p.level === lesson.level).findIndex((p) => p.id === lesson.part) + 1),
    timeMultiplier: multiplierFor(roundPaceFrom(pace)),
    read,
  };
}
