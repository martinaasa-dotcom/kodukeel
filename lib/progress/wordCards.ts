import { prisma } from "@/lib/db";
import { buildCaseTable, stemsFrom } from "@/lib/estonian/derive";
import { oneEntryPerLemma, VOUCHED_ROW } from "@/lib/dict/search";
import type { HeadInfo } from "@/lib/course/lessons/wordCards";
import type { LessonSpec } from "@/lib/course/lessons/types";

/** The parts of speech whose case table a word card draws. */
const DECLINES = new Set(["NOUN", "ADJECTIVE", "PRONOUN", "NUMERAL"]);

/**
 * WHAT THE DICTIONARY SAYS ABOUT EACH WORD A LESSON TEACHES FORMS OF, for the
 * Words step's cards (`lib/course/lessons/wordCards.ts`).
 *
 * One read for the whole lesson, the seed's and Ekilex's entries only (a word
 * somebody typed in is theirs, not the course's), one entry per lemma by the
 * rule the search leads with. A declining word's table comes off
 * `buildCaseTable`, the one every case table in the app is built with, so a
 * card and the dictionary entry cannot disagree about a form.
 */
export async function lessonHeads(lesson: LessonSpec): Promise<HeadInfo[]> {
  const lemmas = [...new Set(lesson.teaches.flatMap((t) => (t.kind === "form" ? [t.of] : [])))];
  if (lemmas.length === 0) return [];
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: lemmas }, ...VOUCHED_ROW },
    select: {
      id: true, lemma: true, pos: true, provenance: true, translation: true, translationRu: true, translationUk: true,
      forms: { select: { formType: true, value: true, morphCode: true }, orderBy: { orderIndex: "asc" } },
    },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  return oneEntryPerLemma(rows, lemmas).map((row) => ({
    lemma: row.lemma,
    pos: row.pos,
    en: row.translation || null,
    ru: row.translationRu ?? null,
    uk: row.translationUk ?? null,
    cases: DECLINES.has(row.pos)
      ? buildCaseTable(stemsFrom(row.forms)).map((d) => ({ key: d.spec.key, sg: d.singular ?? null, pl: d.plural ?? null, sgAll: d.accepted }))
      : [],
  }));
}

/**
 * THE STAR ON A PRACTICE QUESTION: each spelling the lesson teaches, mapped to
 * its headword's dictionary entry and whether this learner has starred it.
 * Keyed by the spelling in lower case, since that is what a question shows.
 */
export async function lessonStars(ownerId: string, lesson: LessonSpec): Promise<Record<string, { id: string; starred: boolean }>> {
  const headOf = new Map<string, string>();
  for (const t of lesson.teaches) {
    const head = t.kind === "form" ? t.of : t.et;
    headOf.set(t.et.toLocaleLowerCase("et"), head);
    if (t.kind === "verb") headOf.set(t.first.toLocaleLowerCase("et"), head);
  }
  const lemmas = [...new Set(headOf.values())];
  if (lemmas.length === 0) return {};
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: lemmas }, ...VOUCHED_ROW },
    select: { id: true, lemma: true, pos: true, provenance: true, forms: { select: { formType: true } } },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  const best = new Map(oneEntryPerLemma(rows, lemmas).map((r) => [r.lemma, r.id]));
  const starred = new Set(
    (await prisma.starredWord.findMany({ where: { ownerId, lexemeId: { in: [...best.values()] } }, select: { lexemeId: true } }))
      .map((s) => s.lexemeId),
  );
  const out: Record<string, { id: string; starred: boolean }> = {};
  for (const [spelling, head] of headOf) {
    const id = best.get(head);
    if (id) out[spelling] = { id, starred: starred.has(id) };
  }
  return out;
}
