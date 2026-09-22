import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { plainPhrase } from "@/lib/copy/values";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { uiText } from "@/lib/copy/uiLanguage";
import { LEVELS, checkpointFor, wordsAtLevel, type Level } from "@/lib/collections/syllabus";
import { buildCheckpoint, type CheckpointWord } from "@/lib/collections/checkpoint";
import { parseExamples, teachableSentences } from "@/lib/dict/examples";
import { nominalOpener } from "@/lib/estonian/cloze";
import { isPrincipalFormType } from "@/lib/estonian/types";
import { CheckpointSession } from "./CheckpointSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { oneEntryPerLemma } from "@/lib/dict/search";

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const upper = level.toUpperCase();
  return { title: (LEVELS as readonly string[]).includes(upper) ? `${upper} checkpoint` : "Checkpoint" };
}

export const dynamic = "force-dynamic";

/**
 * The exam at the end of a level.
 *
 * Its words are drawn from the whole level rather than one unit, which is the
 * point: a checkpoint asks whether the level holds together, not whether the
 * last thing studied is still fresh.
 */
export default async function CheckpointPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level: raw } = await params;
  const level = raw.toUpperCase() as Level;
  if (!(LEVELS as readonly string[]).includes(level)) notFound();

  const ownerId = await requireUserId();
  const checkpoint = checkpointFor(level);
  const placement = await courseLevelFor(ownerId);

  const lemmas = wordsAtLevel(level).map((w) => w.lemma);
  const found = await prisma.lexeme.findMany({
    where: { lemma: { in: lemmas } },
    select: {
      id: true, lemma: true, translation: true, pos: true, provenance: true, examples: true,
      forms: { select: { formType: true, value: true } },
    },
  });
  // One row per lemma: a lemma can hold two entries and both were being asked.
  const rows = oneEntryPerLemma(found, lemmas);

  const words: CheckpointWord[] = rows.map((row) => ({
    lemma: plainPhrase(row.lemma, row.pos),
    gloss: plainPhrase(row.translation, row.pos),
    pos: row.pos,
    /*
      THE SAME NARROWING THE GUIDED LESSON'S PAGE DOES, which this one did not
      do at all. It handed the planner every recorded usage raw, so a
      checkpoint could set `Vanemametnikud on: ... 9) insener;` or
      `Esimene tingimus on, et ..` as a gap question, with no length rule, no
      deduplication, no cap on how much of a shared word one learner's own
      sentences may occupy, and no test of whether the thing is a sentence at
      all. Passing this moves the learner up a level.

      `teachableSentences` is the two rules in one place, for the reason the
      drift itself gives: the two pages resolve the same kind of row for the
      same kind of exercise and had come a rule apart.
    */
    examples: teachableSentences(
      parseExamples(row.examples),
      nominalOpener(row.pos, [row.lemma, ...row.forms.map((f) => f.value)]),
    ).map((e) => e.et),
    parts: Object.fromEntries(
      row.forms.filter((f) => isPrincipalFormType(f.formType)).map((f) => [f.formType, f.value]),
    ),
  }));

  // A fresh paper each attempt, so retaking a checkpoint is another exam rather
  // than a second run at the same twenty questions.
  const questions = buildCheckpoint(words, checkpoint.questions, Date.now() % 100_000);

  return (
    <BeforeYouStart id="checkpoint" ready={questions.length > 0}>
      <CheckpointSession
        level={level}
        title={uiText(placement, checkpoint.title, checkpoint.titleEn)}
        blurb={checkpoint.blurb}
        passMark={checkpoint.passMark}
        initialQuestions={questions}
      />
    </BeforeYouStart>
  );
}
