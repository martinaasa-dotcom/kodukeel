import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { COMMON_BATCH, COMMON_PARTS, groupBySlug, partLemmas } from "@/lib/collections/commonGroups";
import { commonSections } from "@/lib/progress/common";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { CheckSession, type CheckWord } from "./CheckSession";

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }) {
  const group = groupBySlug((await params).group);
  const locale = await localeFor(await requireUserId());
  return { title: tr(locale, group ? `Check yourself: ${group.title.toLowerCase()}` : "Check yourself") };
}

export const dynamic = "force-dynamic";

/**
 * CHECK YOURSELF ON ONE OF THE COMMONEST-WORD LISTS.
 *
 * MOCKUP: the round the October feedback asked for, built from the app's own
 * pieces so it can be photographed. A box to type the other side of the word
 * into, in the direction the learner picks, over a part of the list whether or
 * not the words are in the deck. Nothing is graded yet.
 */
export default async function CommonCheckPage({ params }: { params: Promise<{ group: string }> }) {
  const group = groupBySlug((await params).group);
  if (!group) notFound();
  const ownerId = await requireUserId();
  const sections = await commonSections(ownerId);
  const section = sections.find((s) => s.group === group.key);
  const entries = section?.entries ?? [];

  const parts = Array.from({ length: COMMON_PARTS }, (_, i) => partLemmas(entries, i + 1))
    .map((words, i) => ({
      n: i + 1,
      first: i * COMMON_BATCH + 1,
      last: i * COMMON_BATCH + words.length,
      words: words.map((e): CheckWord => ({
        lexemeId: e.lexemeId, lemma: e.lemma, translation: e.translation, inDeck: e.inDeck,
      })),
    }))
    .filter((p) => p.words.length > 0);

  return <CheckSession title={group.title} slug={group.slug} parts={parts} />;
}
