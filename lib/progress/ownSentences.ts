/**
 * THE LEARNER'S OWN SENTENCES, WRITTEN AS REVIEW CARDS (B1 on).
 *
 * The writing evening's last press. Each sentence the learner ticked, that the
 * dictionary read with nothing to say about it and that holds a word the
 * course taught, spelled as it taught it, becomes one gap card in their own
 * deck: the front is their sentence with that word taken out, the back is the
 * word, the cue is the gap card's ladder (`ownCardFor`, `ownCue`). Filed
 * `WRITTEN`, so it is in the export and the erasure with every card, and
 * review asks it whatever the module has reached, since the learner can read
 * their own line.
 *
 * Which sentences may be kept is decided by the caller, `keepLessonSentences`,
 * which reads each one against the dictionary again rather than trusting the
 * screen: a sentence with a finding never becomes a card (ADR-005).
 *
 * Under the deck lock, for the reason `addCardsFor` gives: "is it already
 * there" is check-then-act, and a writing screen is pressed twice. A sentence
 * already kept is not kept again.
 */
import { prisma } from "@/lib/db";
import { lockDeck } from "@/lib/srs/deck";
import { emptyScheduling } from "@/lib/srs/scheduler";
import { deferredDues } from "@/lib/progress/deferrals";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { ledgerThrough, LESSONS as COURSE_LESSONS, type Ledger, type LessonSpec } from "@/lib/course/lessons";
import { PREVIEW_LESSONS } from "@/lib/course/lessons/preview";
import { headwordsOf, MOST_KEPT, ownCardFor, ownCue, sentencesOf, type Headwords, type OwnCard } from "@/lib/course/lessons/own";

const LESSONS: readonly LessonSpec[] = [...COURSE_LESSONS, ...PREVIEW_LESSONS];

/*
  What a lesson's cards are cut against, worked out once per lesson per
  process. The headwords walk every item of every lesson up to this one and
  were rebuilt for every sentence, about ninety milliseconds each.
*/
const READY = new Map<string, { lesson: LessonSpec; taught: Ledger; heads: Headwords } | null>();

function readyFor(lessonId: string) {
  if (READY.has(lessonId)) return READY.get(lessonId)!;
  const lesson = LESSONS.find((l) => l.id === lessonId);
  const taught = lesson ? ledgerThrough(LESSONS, lesson.id) : null;
  const ready = lesson && taught
    ? { lesson, taught, heads: headwordsOf(LESSONS.slice(0, LESSONS.indexOf(lesson) + 1), taught) }
    : null;
  READY.set(lessonId, ready);
  return ready;
}

/** The cards some sentences would earn, before anything is written. Pure apart from the lesson list. */
export function ownCardsFrom(lessonId: string, sentences: readonly string[]): OwnCard[] {
  const ready = readyFor(lessonId);
  if (!ready) return [];
  const seen = new Set<string>();
  const out: OwnCard[] = [];
  for (const sentence of sentences.flatMap(sentencesOf)) {
    const card = ownCardFor(sentence, ready.lesson, ready.taught, ready.heads);
    if (!card || seen.has(card.front)) continue;
    seen.add(card.front);
    out.push(card);
    if (out.length >= MOST_KEPT) break;
  }
  return out;
}

export async function keepOwnSentences(
  ownerId: string, lessonId: string, sentences: readonly string[],
): Promise<{ kept: number; already: number }> {
  const cards = ownCardsFrom(lessonId, sentences);
  if (cards.length === 0) return { kept: 0, already: 0 };
  const lemmas = [...new Set(cards.map((c) => c.lemma))];
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: lemmas } },
    select: { id: true, lemma: true, pos: true, provenance: true, translation: true, forms: { select: { id: true } } },
    orderBy: { id: "asc" },
  });
  // One entry per lemma, the one with the most behind it, which is the rule the search and the course screens read.
  const byLemma = new Map(oneEntryPerLemma(rows, lemmas).map((l) => [l.lemma, l] as const));
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await lockDeck(tx, ownerId);
    const [existing, held] = await Promise.all([
      tx.card.findMany({
        where: { ownerId, source: "WRITTEN", front: { in: cards.map((c) => c.front) } },
        select: { front: true },
      }),
      // A word put aside stays aside: its card is built with the date the deferral wrote.
      deferredDues(tx, ownerId, [...byLemma.values()].map((l) => l.id), now),
    ]);
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
            hint: ownCue(c.answer, c.lemma, lexeme?.translation ?? null),
            source: "WRITTEN",
            ...emptyScheduling(now),
            ...(lexeme && held.has(lexeme.id) ? { due: held.get(lexeme.id)! } : {}),
          };
        }),
      });
    }
    return { kept: fresh.length, already: cards.length - fresh.length };
  });
}
