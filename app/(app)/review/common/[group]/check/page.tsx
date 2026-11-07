import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { groupBySlug } from "@/lib/collections/commonGroups";
import { commonSections } from "@/lib/progress/common";
import { starredAmong } from "@/lib/progress/stars";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { FreshRound } from "@/components/round/FreshRound";
import { checkKey, lastChecks } from "@/lib/progress/commonChecks";
import { checkRangeFrom } from "@/lib/games/commonCheck";
import { CheckSession, type CheckWord } from "./CheckSession";

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
 *
 * Every answer is also written down (`recordCommonCheck`, one `WordCheck` row
 * each), and where each word stood last time is read back here, so the next
 * check leads with the misses and can offer just those.
 */
export default async function CommonCheckPage({ params, searchParams }: {
  params: Promise<{ group: string }>;
  searchParams: Promise<{ dir?: string | string[]; words?: string | string[] }>;
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
    has to grade the same one every time. And where each word stood the last
    time it was checked, in each direction.
  */
  const [cards, starred, last] = await Promise.all([
    ids.length === 0 ? [] : prisma.card.findMany({
      where: { ownerId, suspended: false, lexemeId: { in: ids }, cardType: { in: ["RECOGNITION", "PRODUCTION"] } },
      select: { id: true, lexemeId: true, cardType: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    starredAmong(ownerId, ids),
    lastChecks(ownerId, ids),
  ]);
  const cardOf = (lexemeId: string, type: "RECOGNITION" | "PRODUCTION") =>
    cards.find((c) => c.lexemeId === lexemeId && c.cardType === type)?.id ?? null;

  const words: CheckWord[] = entries.map((e) => ({
    lexemeId: e.lexemeId,
    lemma: e.lemma,
    translation: e.translation,
    inDeck: e.inDeck,
    starred: starred.has(e.lexemeId),
    recognitionCard: cardOf(e.lexemeId, "RECOGNITION"),
    productionCard: cardOf(e.lexemeId, "PRODUCTION"),
    last: {
      EN_ET: last.get(checkKey(e.lexemeId, "EN_ET")) ?? null,
      ET_EN: last.get(checkKey(e.lexemeId, "ET_EN")) ?? null,
    },
  }));

  return (
    <FreshRound>
      <CheckSession
        title={group.title}
        group={group.key}
        words={words}
        direction={query.dir === "et-en" ? "et-en" : "en-et"}
        range={checkRangeFrom(query.words)}
      />
    </FreshRound>
  );
}
