import { meaningPrefsFor } from "@/lib/progress/meaningPrefs";
import { requireUserId } from "@/lib/auth/session";
import { ButtonLink } from "@/components/Button";
import { Empty, Page, Stack } from "@/components/ui";
import { Favorites } from "@/components/Favorites";
import { PutAside } from "@/components/PutAside";
import { MasteryBoard } from "@/components/MasteryBoard";
import { masteryCounts, masteryFor } from "@/lib/progress/mastery";
import { favoriteCount, favorites } from "@/lib/progress/stars";
import { deferredFor } from "@/lib/progress/deferrals";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return titleFor("Where your words stand");
}

export const dynamic = "force-dynamic";

/**
 * The mastered list, and the two lists either side of it.
 *
 * Asked for directly, twice: which words are known, which are nearly there,
 * and which keep going wrong. It was answered the first time by a panel on
 * `/words`, three cards down a page about the deck, which is a list somebody
 * has to find. This is the page it belongs on, and `lib/ux/nav.ts` carries a
 * row for it so the palette goes here too.
 *
 * One query behind this, the round on `/review/flashcards` and the tile on
 * `/practice`, for the reason `lib/progress/cases.ts` gives at length: a
 * shared calculation over an unshared input is not a shared answer, and three
 * screens telling one learner three different things about one word is how a
 * number stops being believed.
 *
 * THE FAVORITES LIVE HERE TOO, AND THEY LEAD.
 *
 * Starring a word has existed since the dictionary did and could be done on
 * one screen and read back on that same screen, which is the screen a learner
 * is least often on: the word worth keeping turns up on a review card. The
 * star is on every card that teaches a word now, and this is where the list
 * of them is, because "which words are mine" and "how are my words going" are
 * the same question asked twice and two pages for them is one page nobody
 * finds. It is the only list here somebody wrote themselves, so it is first.
 */
export default async function MasteryPage() {
  const ownerId = await requireUserId();
  /*
    Three reads that do not need each other, so they go together: on the
    deployment's own pooler each `await` is a round trip. The count is separate
    from the list because the list is capped and a cap cannot say how many
    there are.
  */
  const [words, kept, keptTotal, aside, locale, prefs] = await Promise.all([
    masteryFor(ownerId),
    favorites(ownerId),
    favoriteCount(ownerId),
    /*
      And the words put aside, which is the other list on this page somebody
      wrote themselves. It is here rather than on a page of its own because
      "too complicated" has to have a visible way back, and a second page for
      a handful of words is a page nobody finds.
    */
    deferredFor(ownerId),
    localeFor(ownerId),
    meaningPrefsFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);

  return (
    <Page route="/words/mastery"
      title={t("Where your words stand")}
      lead={t("Your favorites, and how well every other word is sticking.")}
      actions={<ButtonLink href="/review/flashcards" variant="primary">{t("Practise with flash cards")}</ButtonLink>}
    >
      {words.length === 0 && kept.length === 0 && aside.length === 0 ? (
        <Empty
          title={t("Nothing answered yet")}
          body={t("A word shows up here once you've answered it, or as soon as you star it.")}
          action={<ButtonLink href="/review" variant="primary">{t("Start reviewing")}</ButtonLink>}
        />
      ) : (
        <Stack>
          <Favorites words={kept} total={keptTotal} locale={locale} />
          <PutAside words={aside} />
          {words.length > 0 && <MasteryBoard words={words} counts={masteryCounts(words)} locale={locale} prefs={prefs} />}
        </Stack>
      )}
    </Page>
  );
}
