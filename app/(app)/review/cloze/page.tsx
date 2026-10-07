import { prisma } from "@/lib/db";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { requireUserId } from "@/lib/auth/session";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { ClozeSession } from "./ClozeSession";
import { BeforeYouStart } from "@/components/round/Briefing";

export async function generateMetadata() {
  return titleFor("From your reading");
}

export const dynamic = "force-dynamic";

/**
 * Gap-fill from the learner's own reading.
 *
 * The importer has always accepted pasted text and always thrown the sentences
 * away, keeping only word pairs. This keeps the sentences, which are the more
 * valuable half: a real inflected form in a real context, written by someone who
 * speaks the language.
 */
export default async function ClozePage() {
  const ownerId = await requireUserId();
  const [locale, deckSize] = await Promise.all([
    localeFor(ownerId),
    prisma.card.count({ where: { ownerId, lexemeId: { not: null } } }),
  ]);

  if (deckSize === 0) {
    return (
      <Page title={tr(locale, "From your reading")} lead={tr(locale, "Paste in some real Estonian and practise the words you're learning inside it.")}>
        <Empty
          title={tr(locale, "Your deck is empty")}
          body={tr(locale, "It turns the words you're learning into gaps, so add a few from the dictionary first.")}
          action={<ButtonLink href="/dictionary" variant="primary">{tr(locale, "Open the dictionary")}</ButtonLink>}
        />
      </Page>
    );
  }

  return (
    <BeforeYouStart id="cloze">
      <ClozeSession />
    </BeforeYouStart>
  );
}
