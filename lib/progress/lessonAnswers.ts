import { z } from "zod";
import { prisma } from "@/lib/db";
import type { SaidResult } from "@/lib/course/lessons/said";

/**
 * WHAT A LEARNER SAID ON A LESSON, KEPT SO A FINISHED LESSON CAN SHOW IT.
 *
 * The Say it step lists every sentence said and what was found in it
 * (`SaidList`), and that list was gone the moment the lesson was left: a
 * learner reopening a finished lesson found every step empty and no way back
 * to what they had said. The latest time through is kept, one row per lesson,
 * replaced when the lesson is finished again (`LessonAnswer`), and read back
 * when it is opened.
 *
 * It is the learner's own view of their own words, so what the screen sends
 * is kept as it came, held to a shape and a size rather than read again: a
 * forged row could only ever mislead the person who forged it. Nothing here
 * is graded, and the sound is never part of it (ADR-028).
 */

/** The most sentences one lesson's list keeps: the answers, the role-play turns and a story told back. */
export const MOST_SAID = 40;

const short = (n: number) => z.string().max(n);
const AXES = z.enum(["tense", "person", "case", "number"]);
const PERSON = z.enum(["Sg1", "Sg2", "Sg3", "Pl1", "Pl2", "Pl3"]);
const SLOT = z.object({
  tense: z.enum(["now", "past", "would", "not", "command"]).optional(),
  person: PERSON.optional(),
  case: short(20).optional(),
  plural: z.boolean().optional(),
});
const WORD = short(80);
const DIFFERENCE = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("form"), word: WORD, right: WORD.nullable(), lemma: WORD, axes: z.array(AXES).max(4), yours: SLOT, theirs: SLOT, meant: short(200).nullable(), yoursMeant: short(200).nullable() }),
  z.object({ kind: z.literal("negation"), youSaidNo: z.boolean(), no: WORD }),
  z.object({ kind: z.literal("swap"), word: WORD, right: WORD, meant: short(200).nullable(), yoursMeant: short(200).nullable() }),
  z.object({ kind: z.literal("synonym"), word: WORD, right: WORD }),
  z.object({ kind: z.literal("missing"), right: WORD, meant: short(200).nullable() }),
  z.object({ kind: z.literal("case"), word: WORD, right: WORD.nullable(), yours: short(20), theirs: short(20), model: WORD }),
  z.object({ kind: z.literal("person"), word: WORD, right: WORD, yours: PERSON, theirs: PERSON }),
]);
/** A finding's shape belongs to `sentenceCheck.ts`; it is kept as an object of short values. */
const FINDING = z.record(z.string().max(20), z.union([short(200), z.boolean(), z.null()])).refine((f) => typeof f.kind === "string");

export const SaidSchema = z.object({
  kind: z.enum(["answer", "retell"]),
  label: short(120),
  cue: short(400),
  said: short(600),
  model: short(600).nullable(),
  modelEn: short(600).nullable(),
  grade: z.enum(["right", "asked", "slip", "unclear"]).nullable(),
  note: short(200).nullable(),
  differences: z.array(DIFFERENCE).max(20),
  findings: z.array(FINDING).max(20),
});

export const SavedAnswersSchema = z.object({
  mode: z.enum(["say", "type"]),
  said: z.array(SaidSchema).max(MOST_SAID),
});
export type SavedAnswers = { readonly mode: "say" | "type"; readonly said: readonly SaidResult[] };

/**
 * A payload read as kept answers, or null where it does not read. The shape is
 * held above; a finding is held to short values rather than to each of its
 * fifteen kinds, which is enough for a list a learner reads about themselves,
 * so the parsed value is taken as `SaidResult` here, once.
 */
export function readAnswers(input: unknown): SavedAnswers | null {
  const parsed = SavedAnswersSchema.safeParse(input);
  return parsed.success ? (parsed.data as unknown as SavedAnswers) : null;
}

/** Keep the latest time through, replacing the last. */
export async function keepAnswers(ownerId: string, lessonId: string, answers: SavedAnswers): Promise<void> {
  const said = JSON.stringify(answers.said);
  await prisma.lessonAnswer.upsert({
    where: { ownerId_lessonId: { ownerId, lessonId } },
    create: { ownerId, lessonId, mode: answers.mode, said },
    update: { mode: answers.mode, said },
  });
}

/** What was kept for a lesson, or null where nothing was (or what was kept no longer reads). */
export async function answersFor(ownerId: string, lessonId: string): Promise<SavedAnswers | null> {
  const row = await prisma.lessonAnswer.findUnique({ where: { ownerId_lessonId: { ownerId, lessonId } } });
  if (!row) return null;
  try {
    return readAnswers({ mode: row.mode, said: JSON.parse(row.said) });
  } catch {
    return null;
  }
}
