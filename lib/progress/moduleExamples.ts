import { prisma } from "@/lib/db";
import { sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { parseExamples, usableExamples } from "@/lib/dict/examples";
import { examplesFor } from "@/lib/estonian/grammarExamples";
import { TOPIC_NOTES } from "@/lib/estonian/grammar";
import { FILLS_BY_SLOT, fillPoints, keepMet, slotFamily, type MetVerb, type PointToFill } from "@/lib/course/pointExamples";
import type { ModuleScope } from "@/lib/course/scope";
import { moduleSpellings } from "@/lib/progress/moduleScope";
import { conjugatedForms } from "@/lib/progress/verbExamples";
import type { ResolvedExample } from "@/lib/progress/grammarExamples";

/**
 * THE SENTENCES UNDER A TOPIC PAGE'S POINTS, FOR SOMEBODY READING IT AS A STEP
 * OF THE MODULE: ABOUT WORDS THEY HAVE MET.
 *
 * `pinnedExamples` is the reference's answer and is the right one for somebody
 * who opened the page themselves. A learner on the fourth evening of A1 was
 * shown the present tense on `alustama` and `sööma`, with the verb marked, and
 * had met neither. So inside a module the pins are held to the taught words
 * and what that leaves short is filled from the learner's own verbs: see
 * `lib/course/pointExamples.ts` for the rules, which are pure.
 *
 * One read beyond the pins, and only when a point is left short: the verbs the
 * ladder has taught, with their forms and their own recorded sentences. It is
 * bounded by the course rather than by the dictionary, and it is the same
 * shape `verbExamples` reads for the table on the same page.
 *
 * Sentences come off `Lexeme.examples` through the one reader
 * (`parseExamples`, then `usableExamples`), so a sentence somebody has refused
 * never arrives, and every one carries the English the dictionary holds. The
 * sentences written for a beginner (`lib/dict/authored.ts`) are not read:
 * that list of readers is closed on purpose, and this page is not on it.
 *
 * Nothing here is written and nothing is stored.
 */
export async function moduleTopicExamples(
  topicId: string,
  scope: ModuleScope,
  pinned: ReadonlyMap<string, ResolvedExample[]>,
): Promise<Map<string, ResolvedExample[]>> {
  const points = TOPIC_NOTES.find((t) => t.id === topicId)?.points ?? [];
  const spellings = await moduleSpellings(scope);
  if (!spellings) return new Map();

  const toFill: PointToFill[] = [];
  for (const point of points) {
    const pins = examplesFor("topic", topicId, point);
    // The slot a point shows is read off its pins, and only a point whose claim
    // is about the slot alone may be filled by it (`FILLS_BY_SLOT`).
    const family = FILLS_BY_SLOT[topicId]?.includes(point)
      ? pins.map((p) => slotFamily(p.slot)).find((f): f is string => f !== null) ?? null
      : null;
    toFill.push({ point, kept: keepMet(pinned.get(point) ?? [], spellings), family });
  }

  const needsVerbs = toFill.some((p) => p.family !== null && p.kept.length < 2);
  const met = needsVerbs ? await metVerbs(scope) : [];

  const filled = fillPoints(toFill, met, spellings);
  return new Map(
    [...filled].map(([point, lines]) => [point, lines.map((l) => ({ ...l }))]),
  );
}

/**
 * The verbs the evenings have taught, in teaching order, with what a sentence
 * can be matched against.
 *
 * `oneEntryPerLemma` answers both of the questions a list of lemmas raises: a
 * lemma can hold two entries, and the rows come back in the order the lemmas
 * were asked for, which here is the order the ladder taught them in. Each
 * verb's sentences are ranked plainest first where it is a beginner's word,
 * like every other screen that leads with one of a word's sentences.
 */
async function metVerbs(scope: ModuleScope): Promise<MetVerb[]> {
  const [rows, reach] = await Promise.all([
    prisma.lexeme.findMany({
      where: { pos: "VERB", lemma: { in: [...scope.lemmas] } },
      select: {
        id: true,
        lemma: true,
        pos: true,
        provenance: true,
        cefr: true,
        examples: true,
        forms: { select: { formType: true, value: true, morphCode: true }, orderBy: { orderIndex: "asc" } },
      },
      orderBy: { id: "asc" },
    }),
    sentenceReach(),
  ]);
  return oneEntryPerLemma(rows, scope.lemmas).map((row) => ({
    lexemeId: row.id,
    lemma: row.lemma,
    forms: conjugatedForms(row.lemma, row.forms).map((f) => ({ code: f.code, value: f.value })),
    sentences: usableExamples(parseExamples(row.examples), plainerFirst(row.cefr, reach))
      .map((e) => ({ et: e.et, en: e.en ?? null })),
  }));
}
