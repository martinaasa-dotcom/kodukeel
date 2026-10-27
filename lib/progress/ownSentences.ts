/**
 * THE LEARNER'S OWN SENTENCES, WRITTEN AS REVIEW CARDS (B1 on).
 *
 * The writing evening's last press. Each sentence the learner wrote that holds
 * a word the course taught, spelled as it taught it, becomes one gap card in
 * their own deck: the front is their sentence with that word taken out, the
 * back is the word, the cue is its headword (`ownCardFor`). Filed `WRITTEN`,
 * so it is in the export and the erasure with every card, and review asks it
 * whatever the module has reached, since the learner can read their own line.
 *
 * Under the deck lock, for the reason `addCardsFor` gives: "is it already
 * there" is check-then-act, and a writing screen is pressed twice. A sentence
 * already kept is not kept again.
 */
import { prisma } from "@/lib/db";
import { lockDeck } from "@/lib/srs/deck";
import { emptyScheduling } from "@/lib/srs/scheduler";
import { ledgerThrough, LESSONS as COURSE_LESSONS, type LessonSpec } from "@/lib/course/lessons";
import { PREVIEW_LESSONS } from "@/lib/course/lessons/preview";
import { MOST_KEPT, ownCardFor, sentencesOf, type OwnCard } from "@/lib/course/lessons/own";

const LESSONS: readonly LessonSpec[] = [...COURSE_LESSONS, ...PREVIEW_LESSONS];

/** The cards a draft would earn, before anything is written. Pure apart from the lesson list. */
export function ownCardsFrom(lessonId: string, text: string): OwnCard[] {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return [];
  const taught = ledgerThrough(LESSONS, lesson.id);
  if (!taught) return [];
  const course = LESSONS.slice(0, LESSONS.indexOf(lesson) + 1);
  const seen = new Set<string>();
  const out: OwnCard[] = [];
  for (const sentence of sentencesOf(text)) {
    const card = ownCardFor(sentence, lesson, taught, course);
    if (!card || seen.has(card.front)) continue;
    seen.add(card.front);
    out.push(card);
    if (out.length >= MOST_KEPT) break;
  }
  return out;
}

export async function keepOwnSentences(ownerId: string, lessonId: string, text: string): Promise<{ kept: number; already: number }> {
  const cards = ownCardsFrom(lessonId, text);
  if (cards.length === 0) return { kept: 0, already: 0 };
  const lemmas = [...new Set(cards.map((c) => c.lemma))];
  const lexemes = await prisma.lexeme.findMany({
    where: { lemma: { in: lemmas } },
    select: { id: true, lemma: true, translation: true },
    orderBy: { id: "asc" },
  });
  const byLemma = new Map<string, { id: string; translation: string }>();
  for (const l of lexemes) if (!byLemma.has(l.lemma)) byLemma.set(l.lemma, l);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await lockDeck(tx, ownerId);
    const existing = await tx.card.findMany({
      where: { ownerId, source: "WRITTEN", front: { in: cards.map((c) => c.front) } },
      select: { front: true },
    });
    const have = new Set(existing.map((c) => c.front));
    const fresh = cards.filter((c) => !have.has(c.front));
    if (fresh.length > 0) {
      await tx.card.createMany({
        data: fresh.map((c) => {
          const lexeme = byLemma.get(c.lemma);
          return {
            ownerId,
            lexemeId: lexeme?.id ?? null,
            cardType: "CLOZE",
            front: c.front,
            back: c.answer,
            hint: lexeme ? `${c.lemma}, ${lexeme.translation}` : c.lemma,
            source: "WRITTEN",
            ...emptyScheduling(now),
          };
        }),
      });
    }
    return { kept: fresh.length, already: cards.length - fresh.length };
  });
}
