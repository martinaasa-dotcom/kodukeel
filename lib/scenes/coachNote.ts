/**
 * ANU'S NOTE ON A CONVERSATION: WHAT WENT WELL, AND ONE THING TO PRACTISE.
 *
 * `lib/scenes/recap.ts` says what happened, counted off the run. This is the
 * part a count cannot say: a teacher who read the whole exchange telling the
 * learner, in plain English, what they did well in their own words and the one
 * thing worth practising next. It is the note a good teacher writes at the end
 * of a role-play, and it is written by a model on the grader's chain.
 *
 * THREE BOUNDARIES, AND ALL THREE ARE THE APP'S OWN.
 *
 * It carries no mark. Nothing here decides whether a beat was met, what was
 * graded or what goes into the review log: that was settled by the dictionary
 * before this runs (ADR-025), and the prompt says so.
 *
 * It writes no Estonian of its own. The route checks every Estonian word in the
 * reply against the conversation itself and the dictionary's own recasts
 * (`verifyVerdict`, which is how the exam composition note is held), and a note
 * that reaches for a form nobody in the conversation used is withheld whole
 * (ADR-005). So the note can quote the learner and the other side, and point at
 * a form the dictionary supplied, and nothing else.
 *
 * It is kind first. The module's promise is that nobody leaves a conversation
 * feeling stupid, and the one paragraph a learner reads last decides whether
 * they open the next one.
 */

import { clip } from "@/lib/copy/clip";
import { VOICE_RULES } from "@/lib/copy/voice";
import type { Locale } from "@/lib/copy/locale";

export interface CoachNoteInput {
  readonly title: string;
  readonly place: string;
  /** The conversation, both sides, in order. */
  readonly turns: readonly { readonly who: "them" | "you"; readonly text: string }[];
  /** Words that came out differently, beside the dictionary's form. */
  readonly fixes: readonly { readonly said: string; readonly form: string }[];
  /** What the learner went in to get done, and whether they did. */
  readonly goals: readonly { readonly goal: string; readonly met: boolean }[];
}

export interface CoachNote {
  /** Two or three sentences on what went well, in the learner's language. `comment` so the verifier reads it. */
  readonly comment: string;
  /** One concrete thing to practise, in the learner's language. `rule` so the verifier reads it. */
  readonly rule: string;
}

/** How long a note may be, so a model that runs on cannot fill the screen. */
export const COACH_NOTE_CHARS = 700;

export function buildCoachNoteSystem(language: Locale = "en"): string {
  return [
    "You are Anu, a warm and experienced teacher of Estonian. A beginner has just finished a practice role-play conversation in Estonian, and you write them a short note about it.",
    `Write in plain, friendly ${NOTE_LANGUAGE[language]}, as one person to another. No lists, no headings, no markdown, no emoji.`,
    ...(language === "en" ? [] : [inTheirLanguage(language)]),
    "comment: two or three sentences on what they did well, quoting their own words where it helps (in quotation marks, exactly as they wrote them). Be specific and honest: praise something real, never the generic 'great job'.",
    "rule: one sentence with one concrete thing to practise next time, the most useful one. If a word came out differently, you may point at the form given in the list of fixes. Never correct anything else and never mark or grade them.",
    "Never write an Estonian word or sentence that does not appear in the conversation or in the fixes: quote, never invent. Never mention scores, mistakes counts, or the app.",
    ...VOICE_RULES,
    "Reply with JSON only: {\"comment\": \"...\", \"rule\": \"...\"}.",
  ].join("\n");
}

/** The language the note is written in, named for the model. */
const NOTE_LANGUAGE: Readonly<Record<Locale, string>> = { en: "English", ru: "Russian", uk: "Ukrainian" };

/**
 * THE NOTE IN THE LANGUAGE THE LEARNER READS THE APP IN.
 *
 * A note about their Estonian, written in their third language, is the one
 * paragraph on the screen they have to work hardest to read, and it is the
 * last thing they read before deciding whether to open the next conversation.
 * Only the language of the note moves: the Estonian is quoted exactly, in the
 * straight quotes `verifyVerdict` reads as a form presented, and their own
 * language goes in «ёлочки», which the verifier never mistakes for one.
 */
function inTheirLanguage(language: Exclude<Locale, "en">): string {
  const name = NOTE_LANGUAGE[language];
  return `The learner reads ${name} better than English, so the note is in ${name}: natural, warm ${name}, addressing them as ${language === "ru" ? "вы" : "ви"}, never a translation of English sentences.${language === "uk" ? " Real Ukrainian, never Russian spelled with Ukrainian letters." : ""} Quote their Estonian in straight double quotes exactly as written, and put any ${name} words in «» quotes.`;
}

export function buildCoachNoteUser(input: CoachNoteInput): string {
  const lines = input.turns.map((turn) => `${turn.who === "you" ? "Learner" : "Other person"}: ${turn.text}`);
  return [
    `The situation: ${input.title}. ${input.place}.`,
    `What the learner went in to do: ${input.goals.map((g) => `${g.goal} (${g.met ? "done" : "not done"})`).join(" ")}`,
    input.fixes.length > 0
      ? `Fixes the dictionary gave: ${input.fixes.map((f) => `"${f.said}" is said "${f.form}"`).join("; ")}.`
      : "Fixes the dictionary gave: none.",
    "The conversation:",
    ...lines,
  ].join("\n");
}

/** The note, or null where the reply is not the JSON asked for. */
export function parseCoachNote(raw: string): CoachNote | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { comment?: unknown; rule?: unknown };
    if (typeof parsed.comment !== "string" || !parsed.comment.trim()) return null;
    return {
      comment: clip(parsed.comment.trim(), COACH_NOTE_CHARS),
      rule: typeof parsed.rule === "string" ? clip(parsed.rule.trim(), COACH_NOTE_CHARS) : "",
    };
  } catch {
    return null;
  }
}

/**
 * The note with every sentence carrying an unverified Estonian word taken out,
 * or null where nothing of the comment is left.
 *
 * The exam composition note is withheld whole, because there every sentence is
 * about the one piece of writing. Here the note is two or three independent
 * remarks, so one sentence reaching for a form nobody said costs that sentence
 * and not the other two: the learner still gets the note, and not one word of
 * unverified Estonian reaches them either way (ADR-005).
 */
export function withoutUnverified(note: CoachNote, unverified: readonly string[]): CoachNote | null {
  if (unverified.length === 0) return note;
  const bad = unverified.map((word) => word.toLocaleLowerCase("et"));
  const keep = (text: string) => (text.match(/[^.!?]+[.!?]*["”]?\s*/g) ?? [])
    .filter((sentence) => !bad.some((word) => sentence.toLocaleLowerCase("et").includes(word)))
    .join("")
    .trim();
  const comment = keep(note.comment);
  if (!comment) return null;
  return { comment, rule: keep(note.rule) };
}
