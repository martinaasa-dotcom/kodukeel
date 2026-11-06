import type { LessonSpec } from "./types";

/**
 * ONE SCREEN, ONE THING TO DO (Martin's call, 2026-11-04).
 *
 * A step of a lesson used to be one long page with everything the step held
 * stacked down it. On a B2 evening, Listen was the conversation played with
 * its questions, then the transcript, then a whole text to read under it, and
 * a learner who had answered the questions and pressed on scrolled into the
 * text without having been told it was there, read it as one more wall of
 * words and scrolled past it. His words: a single page with several things
 * competing for attention gets none of them; every page does one thing, and
 * the next page does the next.
 *
 * So a step is a sequence of screens, and this module is the one answer to
 * which screens, in what order. Each screen is one task: hear it and answer,
 * read the conversation, read the text, meet the new words, read the idea,
 * hear the sounds, and so on. The steps that were already one card at a time
 * (Practice, Write, Say it, Review) are one screen each, because their card
 * is the screen. The steps listed at the top of the lesson do not change; a
 * screen is a page inside a step, and "Continue" walks them.
 *
 * Pure, so the runner and the invariant read one list.
 */
export type ListenScreen = "news" | "hear" | "conversation" | "notes" | "read";
export type WordsScreen = "words" | "forms";
export type HowScreen = "idea" | "sounds" | "pairs" | "spell" | "examples";
/** A step whose own card already walks one task at a time. */
export type TaskScreen = "task";
export type LessonScreen = ListenScreen | WordsScreen | HowScreen | TaskScreen;

export type LessonStepId = "listen" | "words" | "how" | "practise" | "write" | "say" | "review";

/** What the screens depend on beyond the lesson itself. */
export interface ScreenFacts {
  /** The level's "what's new" is said on this lesson (`levelNewsFor`). */
  readonly news: boolean;
  /** The conversation has been heard (or shown on purpose), so it is no longer heard first. */
  readonly heard: boolean;
  /** C1: a table of the past and polite command of the lesson's verbs sits after the words. */
  readonly forms: boolean;
}

/** The lines of the conversation the How step plays back as "where you heard it". */
export function howExamples(lesson: Pick<LessonSpec, "how" | "conversation">): number[] {
  return (lesson.how.examples ?? []).filter((i) => Boolean(lesson.conversation[i]?.et));
}

/**
 * The screens of one step, in order. Never empty: a step with nothing of its
 * own still has the one screen that says so.
 */
export function screensOf(step: LessonStepId, lesson: Pick<LessonSpec, "conversation" | "listenFor" | "notes" | "read" | "how">, facts: ScreenFacts): LessonScreen[] {
  if (step === "listen") {
    const out: ListenScreen[] = [];
    if (facts.news) out.push("news");
    // Heard first (B1 on), and gone once it has been: coming back to reread is not a reason to hide the words again.
    if (!facts.heard && (lesson.listenFor?.length ?? 0) > 0) out.push("hear");
    if (lesson.conversation.some((l) => l.et)) out.push("conversation");
    if (lesson.notes) out.push("notes");
    if (lesson.read) out.push("read");
    // A lesson with no line to read still opens on its conversation screen, which says what it has.
    if (!out.some((s) => s !== "news")) out.push("conversation");
    return out;
  }
  if (step === "words") return facts.forms ? ["words", "forms"] : ["words"];
  if (step === "how") {
    const { how } = lesson;
    const out: HowScreen[] = ["idea"];
    if (how.sounds && how.sounds.length > 0) out.push("sounds");
    if (how.listen && how.listen.length > 0) out.push("pairs");
    if (how.spell) out.push("spell");
    if (howExamples(lesson).length > 0) out.push("examples");
    return out;
  }
  return ["task"];
}

/**
 * THE END OF A LESSON IS A SEQUENCE TOO. The finished page held the
 * celebration, the words said once more, the conversation, a worksheet, a
 * situation out there, the cards waiting in Review, the check and the next
 * lesson, eight things on one page and seven buttons. Each is a screen of its
 * own now, in the order they matter, with "Not now" stepping past an offer and
 * the way on as the last screen.
 */
export type FinishScreen = "done" | "again" | "conversation" | "check" | "worksheet" | "situation" | "review" | "next";

export interface FinishFacts {
  /** Words the lesson taught, to say once more. */
  readonly taught: number;
  /** The lesson has a conversation of its own not yet had. */
  readonly conversation: boolean;
  /** The check that closes the part, not passed yet. */
  readonly check: boolean;
  readonly worksheet: boolean;
  /** A situation out there, offered outside a module. */
  readonly situation: boolean;
  /** Cards waiting in Review. */
  readonly due: number;
}

export function finishScreens(facts: FinishFacts): FinishScreen[] {
  const out: FinishScreen[] = ["done"];
  if (facts.taught > 0) out.push("again");
  if (facts.conversation) out.push("conversation");
  if (facts.check) out.push("check");
  if (facts.worksheet) out.push("worksheet");
  if (facts.situation) out.push("situation");
  if (facts.due > 0) out.push("review");
  out.push("next");
  return out;
}
