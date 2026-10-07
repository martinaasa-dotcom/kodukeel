import { Page } from "@/components/ui";
import { requireUserId } from "@/lib/auth/session";
import { commonSections } from "@/lib/progress/common";
import { CommonWords } from "./CommonWords";
import { Empty } from "@/components/ui";
import { SuggestFix } from "@/components/SuggestFix";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return titleFor("The words you'll hear most");
}

export const dynamic = "force-dynamic";

/**
 * WHICH WORDS ARE WORTH LEARNING FIRST, ANSWERED BY COUNTING RATHER THAN BY
 * OPINION.
 *
 * The course teaches in themes and the dictionary holds six thousand words,
 * and neither answers the question somebody asks in their first week. This
 * does, out of a published count over a corpus of film and television
 * subtitles, gated through the dictionary so every word on the page is one the
 * app can teach. `scripts/build-frequency.ts` is the whole of how, including
 * why the source is the one with a share-alike license rather than the better
 * corpus with a non-commercial one.
 *
 * The page says which corpus, in the lead, because "the most common words in
 * Estonian" is a claim this cannot make: subtitles are dialogue, so `tere` and
 * `aitäh` rank high and the vocabulary of a newspaper leader does not. That is
 * the right corpus for somebody learning to talk to people and the page has to
 * say so rather than let a reader assume otherwise.
 */
export default async function CommonWordsPage() {
  const ownerId = await requireUserId();
  const [sections, locale] = await Promise.all([commonSections(ownerId), localeFor(ownerId)]);
  const found = sections.reduce((sum, s) => sum + s.found, 0);

  return (
    <Page route="/dictionary/common"
      title={tr(locale, "The words you'll hear most")}
      lead={tr(locale, "Counted from film and TV subtitles, so this is how people actually talk.")}
    >
      {found === 0 ? (
        <div className="flex flex-col gap-4">
          {/*
            A deployment seeded before the course harvest holds a few hundred
            words and can answer for almost none of these. That is a real
            state, it is fixed by a reseed, and saying so is more use than an
            empty page.
          */}
          <Empty
            title={tr(locale, "The dictionary isn't loaded yet")}
            body={tr(locale, "These lists are built from the dictionary, so there's nothing to show until it's set up.")}
          />
          <SuggestFix category="BROKEN" trigger="/dictionary/common found no entries in the dictionary" />
        </div>
      ) : (
        <CommonWords sections={sections} />
      )}
    </Page>
  );
}
