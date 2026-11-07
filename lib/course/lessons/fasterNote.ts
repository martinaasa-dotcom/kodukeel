/**
 * ANU'S NOTE ON THE FIRST GO OF AGAIN, FASTER (`app/api/course/faster/note`).
 *
 * The checklist under a go (`fasterChecks.ts`) says, keyless and at once,
 * which of today's pattern came across. This is the one thing it cannot say:
 * a teacher who heard the first go telling the learner, in a sentence or
 * three, what went well and the one thing to change before the second, while
 * there is still a second to change it in. So it is asked after the first go
 * only; goes two and three get the checklist alone.
 *
 * The boundaries are the scene note's (`lib/scenes/coachNote.ts`), and for its
 * reasons. It carries no mark and changes nothing: nothing here is graded and
 * nothing reaches the review log. It writes no Estonian of its own: the route
 * holds every Estonian word in the reply to the transcript, the lesson's model
 * answer and words, and the dictionary, and a sentence reaching past them is
 * dropped (`withoutUnverified`, ADR-005). And it says nothing about how the go
 * sounded, since what it is handed is a transcript and an ending a recognizer
 * misheard is not the learner's mistake (ADR-018).
 *
 * Pure: no React, no Prisma, no network.
 */
import { clip } from "@/lib/copy/clip";
import { VOICE_RULES } from "@/lib/copy/voice";
import type { Locale } from "@/lib/copy/locale";
import { verifyComment } from "@/lib/tutor/verify";
import { withoutUnverified } from "@/lib/scenes/coachNote";

export interface FasterNoteInput {
  /** The question asked, in Estonian, and what it means. */
  readonly ask: { readonly et: string; readonly en: string };
  /** What the learner was asked to cover, in English. */
  readonly cue: string;
  /** Today's point, the rule in one line, in English with Estonian in braces. */
  readonly point: string;
  /** One way to answer, from the lesson. */
  readonly model: string;
  /** Today's pattern, each with whether this go met it. */
  readonly checks: readonly { readonly en: string; readonly met: boolean }[];
  /** What came across, as written down. */
  readonly said: string;
  /** Whether it was said rather than typed. */
  readonly spoken: boolean;
}

/** How long the note may run, so a model that runs on cannot fill the go. */
export const FASTER_NOTE_CHARS = 420;

const LANGUAGE: Readonly<Record<Locale, string>> = { en: "English", ru: "Russian", uk: "Ukrainian" };

export function buildFasterNoteSystem(language: Locale = "en"): string {
  const name = LANGUAGE[language];
  return [
    "You are Anu, a warm and experienced teacher of Estonian. A learner has just answered one question aloud or in writing, the first of three goes at the same answer, each quicker than the last. You write them a note to read before the second go.",
    `Write one to three short sentences of plain, friendly ${name}, as one person to another: first one real thing that went well, then the one thing to change in the next go, the most useful one, ideally about today's point. No lists, no headings, no markdown, no emoji.`,
    ...(language === "en" ? [] : [`The learner reads ${name} better than English, so the note is in natural ${name}, addressing them as ${language === "ru" ? "ты" : "ти"}.${language === "uk" ? " Standard literary Ukrainian only, and never mention Russia or the Russian language." : " Standard literary Russian only, and never mention Ukraine or the Ukrainian language."}`]),
    "Quote Estonian only in straight double quotes, and only words that appear in what the learner said or in the model answer. Never write any other Estonian word or sentence: quote, never invent. Where a change needs a form neither holds, describe it in plain words, for example that the noun needs its partial form after the no.",
    "When you name a grammar point, name the word it is about, as in \"the noun (\\\"leiba\\\" here)\". Never call it \"the thing\".",
    "What you are given is a transcript. If the answer was spoken, a missing or odd ending may be the recognizer mishearing, so never say how anything sounded and never comment on pronunciation or accent. Never mark, grade or count mistakes, and never mention the app.",
    ...VOICE_RULES,
    "Reply with JSON only: {\"comment\": \"...\"}.",
  ].join("\n");
}

export function buildFasterNoteUser(input: FasterNoteInput): string {
  return [
    `The question: "${input.ask.et}" (${input.ask.en})`,
    `What they were asked to cover: ${input.cue}`,
    `Today's point: ${input.point}`,
    `One way to answer: "${input.model}"`,
    `Today's pattern: ${input.checks.map((check) => `${check.en} (${check.met ? "came across" : "not this time"})`).join(" ")}`,
    `${input.spoken ? "What the recognizer heard them say" : "What they typed"}: "${input.said}"`,
  ].join("\n");
}

/** The note's text, or null where the reply is not the JSON asked for. */
export function parseFasterNote(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { comment?: unknown };
    if (typeof parsed.comment !== "string" || !parsed.comment.trim()) return null;
    return clip(parsed.comment.trim(), FASTER_NOTE_CHARS);
  } catch {
    return null;
  }
}

/**
 * The Estonian words in a note that nothing vouches for: not the transcript,
 * the model answer or the question (`text`), not the lesson's own words
 * (`forms`), and not the dictionary (`vouched`, what the route found for the
 * words left over). The same reading the writing grader and the scene note
 * make (`verifyComment`).
 */
export function unverifiedIn(comment: string, forms: readonly string[], text: string, vouched: readonly string[] = []): string[] {
  return verifyComment(comment, [...forms, ...vouched], text).unverified;
}

/**
 * The note with every sentence carrying an unverified word taken out, or null
 * where nothing is left: one sentence reaching for a form nobody said costs
 * that sentence and not the others, and no unverified word reaches the
 * learner either way (ADR-005, `withoutUnverified`).
 */
export function heldNote(comment: string, forms: readonly string[], text: string, vouched: readonly string[] = []): string | null {
  const unverified = unverifiedIn(comment, forms, text, vouched);
  if (unverified.length === 0) return comment;
  return withoutUnverified({ comment, rule: "", improve: [] }, unverified)?.comment ?? null;
}
