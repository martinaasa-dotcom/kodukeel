import { meaningPrefsFor } from "@/lib/progress/meaningPrefs";
import { meaningShown, type Equivalents, type MeaningPrefs, type ShownMeaning } from "@/lib/collections/glossLanguage";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { readableFront } from "@/lib/copy/caseHint";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { ButtonLink } from "@/components/Button";
import { Card, Empty, Page, SectionTitle, Stack } from "@/components/ui";
import { STATE_LABELS } from "@/lib/srs/scheduler";
import { Diagnosis } from "@/components/Diagnosis";
import { DrillLink } from "@/components/DrillLink";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
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
          <Card tone="night">
            <SectionTitle hint={fill(t("{cards} in all"), { cards: countOf(locale, totalCards, "card") })}>{t("How your cards are doing")}</SectionTitle>
            <DeckBar
              locale={locale}
              segments={[
                { label: "New", value: byState[0] ?? 0, fill: "var(--sky)" },
                { label: "Learning", value: (byState[1] ?? 0) + (byState[3] ?? 0), fill: "var(--cta)" },
                { label: "Known", value: byState[2] ?? 0, fill: "var(--sky)" },
              ]}
            />
            {/* Word by word is the header's other button; which cases keep
                catching somebody out is Progress's, one link away. */}
            <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
              {t("Want to see which case endings keep catching you out? They’re on")}{" "}
              <Link href="/progress" className="font-semibold underline underline-offset-2" style={{ color: "var(--cta)" }}>
                {t("Progress")}
              </Link>.
            </p>
          </Card>

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

/**
 * One bar showing how the deck splits between new, learning and known.
 *
 * The shape of the deck, whether it is mostly still ahead of you or mostly
 * behind you, with each part's count and share written under it. It used to
 * sit under four tiles of the same counts, which said the deck three times.
 */
function DeckBar({ segments, locale }: { segments: { label: string; value: number; fill: string }[]; locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  /* Drawn on the night panel: each state a lit bar as wide as its share, the
     figure large under its own colour, so the deck reads at a glance. */
  return (
    <div>
      <div className="flex h-3.5 gap-1">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div
            key={s.label}
            className="rounded-full"
            style={{ flexGrow: s.value, background: s.fill }}
            title={`${t(s.label)}: ${s.value}`}
          />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {segments.map((s) => (
          <span key={s.label} className="flex min-w-0 flex-col">
            {/* The label takes the height the row leaves, so a label that wraps
                does not drop its figure below the ones beside it. */}
            <span className="flex flex-1 items-start gap-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
              <span aria-hidden className="mt-[0.4em] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.fill }} />
              {t(s.label)}
            </span>
            <span data-figure className="tnum font-display mt-1 text-4xl font-bold leading-none md:text-5xl" style={{ color: "var(--ink)" }}>{s.value}</span>
            <span className="tnum mt-1 text-sm" style={{ color: "var(--ink-3)" }}>{Math.round((s.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
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
