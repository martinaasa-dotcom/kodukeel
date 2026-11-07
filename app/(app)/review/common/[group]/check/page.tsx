import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { COMMON_BATCH, COMMON_PARTS, groupBySlug, partLemmas, readPart } from "@/lib/collections/commonGroups";
import { commonSections } from "@/lib/progress/common";
import { starredAmong } from "@/lib/progress/stars";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { FreshRound } from "@/components/round/FreshRound";
import { CheckSession, type CheckPart, type CheckWord } from "./CheckSession";

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }) {
  const group = groupBySlug((await params).group);
  const locale = await localeFor(await requireUserId());
  return { title: tr(locale, "Check yourself") + (group ? `: ${tr(locale, group.title).toLowerCase()}` : "") };
}

export const dynamic = "force-dynamic";

/**
 * CHECK YOURSELF ON ONE OF THE COMMONEST-WORD LISTS.
 *
 * Reported as missing off `/dictionary/common`: flash cards do not say whether
 * somebody actually knows a word, and a learner who already does wants to test
 * that rather than be taught it. So this is a typed check over one part of a
 * list, in the direction the learner picks, English shown and Estonian typed or
 * the other way round, whether or not the words are in their deck.
 *
 * The marking is `checkAnswer` in both directions, the same marker every typed
 * card uses, against the dictionary's own lemma or every meaning its gloss
 * lists. There is no "I meant the same thing": a fair answer the gloss does not
 * list is marked wrong and the screen shows every meaning that counts, which is
 * the operator's call rather than a self-graded score.
 *
 * A word already in the deck grades the card the direction asks, the
 * recognition card for Estonian shown and the production card for English
 * shown, through `gradeCard` like every round (ADR-016). A word that is not in
 * the deck writes nothing, and the end of the round offers to keep the ones
 * that did not come out right.
 */
export default async function CommonCheckPage({ params, searchParams }: {
  params: Promise<{ group: string }>;
  searchParams: Promise<{ dir?: string | string[]; part?: string | string[] }>;
}) {
  const [{ group: slug }, query] = await Promise.all([params, searchParams]);
  const group = groupBySlug(slug);
  if (!group) notFound();
  const ownerId = await requireUserId();
  const sections = await commonSections(ownerId);
  const entries = sections.find((s) => s.group === group.key)?.entries ?? [];
  const ids = entries.map((e) => e.lexemeId);

  /*
    The two cards a direction can grade, read once for the whole list. Ordered,
    because a learner can hold two cards of one type for a word and the round
    has to grade the same one every time.
  */
  const [cards, starred] = await Promise.all([
    ids.length === 0 ? [] : prisma.card.findMany({
      where: { ownerId, suspended: false, lexemeId: { in: ids }, cardType: { in: ["RECOGNITION", "PRODUCTION"] } },
      select: { id: true, lexemeId: true, cardType: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    starredAmong(ownerId, ids),
  ]);
  const cardOf = (lexemeId: string, type: "RECOGNITION" | "PRODUCTION") =>
    cards.find((c) => c.lexemeId === lexemeId && c.cardType === type)?.id ?? null;

  const parts: CheckPart[] = Array.from({ length: COMMON_PARTS }, (_, i) => partLemmas(entries, i + 1))
    .map((words, i) => ({
      n: i + 1,
      first: i * COMMON_BATCH + 1,
      last: i * COMMON_BATCH + words.length,
      words: words.map((e): CheckWord => ({
        lexemeId: e.lexemeId,
        lemma: e.lemma,
        translation: e.translation,
        inDeck: e.inDeck,
        starred: starred.has(e.lexemeId),
        recognitionCard: cardOf(e.lexemeId, "RECOGNITION"),
        productionCard: cardOf(e.lexemeId, "PRODUCTION"),
      })),
    }))
    .filter((p) => p.words.length > 0);

  return (
    <FreshRound>
      <CheckSession
        title={group.title}
        group={group.key}
        parts={parts}
        direction={query.dir === "et-en" ? "et-en" : "en-et"}
        part={query.part === "all" ? "all" : readPart(query.part) ?? 1}
      />
    </FreshRound>
  );
}
