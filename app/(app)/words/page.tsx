import { HeroFan } from "@/components/HeroFan";
import { meaningPrefsFor } from "@/lib/progress/meaningPrefs";
import { meaningShown, type Equivalents, type MeaningPrefs, type ShownMeaning } from "@/lib/collections/glossLanguage";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { readableFront } from "@/lib/copy/caseHint";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { ButtonLink } from "@/components/Button";
import { Empty, Page, Stack } from "@/components/ui";
import { STATE_LABELS } from "@/lib/srs/scheduler";
import { Diagnosis } from "@/components/Diagnosis";
import { DrillLink } from "@/components/DrillLink";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { WordsTable, type CardRow } from "./WordsTable";

export async function generateMetadata() {
  return titleFor("My words");
}

export const dynamic = "force-dynamic";

export default async function WordsPage() {
  const ownerId = await requireUserId();
  /*
    Three queries, not four. The third read five thousand reviews to tally case
    accuracy for a panel Progress already draws from the same log, with its own
    copy of the arithmetic: the same learner could read two different numbers
    for one case and nothing here would disagree with either.

    The total is the per-state counts added up: `state` is a column no card
    is without, so the grouped read over the same rows already holds it, and a
    separate `count` was the same scan asked twice.
  */
  const [cards, counts, locale, prefs] = await Promise.all([
    prisma.card.findMany({
      where: { ownerId },
      /*
        Ending on the id, because `(suspended, due)` is not a total order and
        the tie here is the whole deck rather than a corner of it: every card
        in one `addUnitsToDeck` call is written with the same `due`, so first
        run leaves 982 cards sharing both keys. Which 400 of them this table
        listed was the query plan's answer and could differ between two
        identical requests. The rows are the same rows; what changes is that
        they are the same rows twice.
      */
      orderBy: [{ suspended: "asc" }, { due: "asc" }, { id: "asc" }],
      take: 400,
      // The equivalents ride in the read that already loads the word.
      include: { lexeme: { select: { lemma: true, cefr: true, translationRu: true, translationUk: true } } },
    }),
    prisma.card.groupBy({ by: ["state"], where: { ownerId }, _count: true }),
    localeFor(ownerId),
    meaningPrefsFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);

  const rows: CardRow[] = cards.map((c) => ({
    id: c.id,
    cardType: c.cardType,
    front: readableFront(c.front),
    back: c.back,
    lemma: c.lexeme?.lemma ?? null,
    cefr: c.lexeme?.cefr ?? null,
    state: c.state,
    stateLabel: STATE_LABELS[c.state] ?? "New",
    due: c.due.toISOString(),
    lapses: c.lapses,
    suspended: c.suspended,
    meaning: meaningOfCard(c, prefs),
  }));

  const byState = Object.fromEntries(counts.map((c) => [c.state, c._count]));
  const totalCards = counts.reduce((sum, c) => sum + c._count, 0);
  const known = byState[2] ?? 0;
  const learning = (byState[1] ?? 0) + (byState[3] ?? 0);

  return (
    <Page route="/words"
      title={t("My words")}
      lead={t("Everything in your deck, and how well it's sticking.")}
      actions={
        <>
          {/* The other reading of this page, and the one somebody comes for
              when the question is "what do I actually know". Counted in words
              rather than cards, which is what the box below is. */}
          <ButtonLink href="/words/mastery">{t("How well you know each word")}</ButtonLink>
          <ButtonLink href="/words/decks">{t("Decks")}</ButtonLink>
          <ButtonLink href="/dictionary" variant="primary">{t("Add words")}</ButtonLink>
        </>
      }
    >
      {rows.length === 0 ? (
        <Empty
          title={t("No cards yet")}
          body={t("Add words from the dictionary, and each one comes with all its forms and audio.")}
          action={<ButtonLink href="/dictionary" variant="primary">{t("Open the dictionary")}</ButtonLink>}
        />
      ) : (
        <Stack>
          <HeroFan
            eyebrow={t("How your cards are doing")}
            title={known > 0
              ? fill(t("{cards}, and {known} of them stick"), { cards: countOf(locale, totalCards, "card"), known })
              : fill(t("{cards}, all still settling"), { cards: countOf(locale, totalCards, "card") })}
            text={t("Known means you got it right days after you last saw it.")}
            cardsLabel={t("Your cards by how well they stick")}
            cards={[
              { figure: String(known), label: t("Known"), icon: "Layers" },
              { figure: String(learning), label: t("Learning"), icon: "Leaf" },
              { figure: String(byState[0] ?? 0), label: t("New"), icon: "Sparkles" },
            ]}
          />
          {/* Word by word is the header's other button; which cases keep
              catching somebody out is Progress's, one link away. */}
          <p className="text-base" style={{ color: "var(--ink-2)" }}>
            {t("Want to see which case endings keep catching you out? They’re on")}{" "}
            <Link href="/progress" className="font-semibold underline underline-offset-2" style={{ color: "var(--accent-deep)" }}>
              {t("Progress")}
            </Link>.
          </p>

          <WordsTable rows={rows} total={totalCards} />

          {/*
            What the log says about the deck, and the one press that asks about
            the words added out of curiosity, which the review queue is slowest
            to reach. Both sit under the list rather than above it: the list is
            what somebody opened this page for.
          */}
          <Diagnosis ownerId={ownerId} />
          <DrillLink href="/review/lookups" />
        </Stack>
      )}
    </Page>
  );
}

/** Accuracy per grammatical case — the diagnostic that turns a card box into a study plan. */

/** A recognition back or a production front is the word's meaning; nothing else on a card is. */
function meaningOfCard(
  c: { cardType: string; front: string; back: string; lexeme: Equivalents | null },
  prefs: MeaningPrefs,
): ShownMeaning | null {
  if (!c.lexeme || prefs.lead === "en") return null;
  const english = c.cardType === "RECOGNITION" ? c.back : c.cardType === "PRODUCTION" ? c.front : null;
  if (english === null) return null;
  const shown = meaningShown(english, c.lexeme, prefs);
  return shown.english ? shown : null;
}
