import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { ButtonLink } from "@/components/Button";
import { Card, Empty, Page, SectionTitle, Stack } from "@/components/ui";
import { STATE_LABELS } from "@/lib/srs/scheduler";
import { Diagnosis } from "@/components/Diagnosis";
import { DrillLink } from "@/components/DrillLink";
import { MasteryLists } from "@/components/MasteryLists";
import { masteryCounts, masteryFor } from "@/lib/progress/mastery";
import { counted } from "@/lib/copy/values";
import { WordsTable, type CardRow } from "./WordsTable";

export const metadata = { title: "My words" };

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
  const [cards, counts, mastery] = await Promise.all([
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
      include: { lexeme: { select: { lemma: true, cefr: true } } },
    }),
    prisma.card.groupBy({ by: ["state"], where: { ownerId }, _count: true }),
    // Where every met word stands, by the one rule in lib/srs/mastery.ts. The
    // Flash cards round and the tile on Practice read the same query, so the
    // three cannot disagree about which words are done.
    masteryFor(ownerId),
  ]);

  const rows: CardRow[] = cards.map((c) => ({
    id: c.id,
    cardType: c.cardType,
    front: c.front,
    back: c.back,
    lemma: c.lexeme?.lemma ?? null,
    cefr: c.lexeme?.cefr ?? null,
    state: c.state,
    stateLabel: STATE_LABELS[c.state] ?? "New",
    due: c.due.toISOString(),
    lapses: c.lapses,
    suspended: c.suspended,
  }));

  const byState = Object.fromEntries(counts.map((c) => [c.state, c._count]));
  const totalCards = counts.reduce((sum, c) => sum + c._count, 0);

  return (
    <Page route="/words"
      title="My words"
      lead="Everything in your deck, and how well it is sticking."
      actions={
        <>
          {/* The other reading of this page, and the one somebody comes for
              when the question is "what do I actually know". Counted in words
              rather than cards, which is what the box below is. */}
          <ButtonLink href="/words/mastery">Word by word</ButtonLink>
          <ButtonLink href="/words/decks">Decks</ButtonLink>
          <ButtonLink href="/dictionary" variant="primary">Add words</ButtonLink>
        </>
      }
    >
      {rows.length === 0 ? (
        <Empty
          title="No cards yet"
          body="Add words from the dictionary and every form and the audio come with them."
          action={<ButtonLink href="/dictionary" variant="primary">Open the dictionary</ButtonLink>}
        />
      ) : (
        <Stack>
          <Card>
            <SectionTitle hint={`${counted(totalCards, "card")}, how they are settling`}>Where your cards are</SectionTitle>
            <DeckBar
              segments={[
                { label: "New", value: byState[0] ?? 0, color: "var(--sky-ink)" },
                { label: "Learning", value: (byState[1] ?? 0) + (byState[3] ?? 0), color: "var(--butter-ink)" },
                { label: "Known", value: byState[2] ?? 0, color: "var(--mint-ink)" },
              ]}
            />
            {/*
              The weakest-case panel that used to sit beside this one has gone
              to Progress, which had the same panel drawn a third way. This page
              is the deck: what is in it and how it is settling. What the log
              says about your grammar is one link away, computed once.
            */}
            <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
              Which cases keep catching you out, and what the pattern behind them is, live on{" "}
              <Link href="/progress" className="font-semibold underline underline-offset-2" style={{ color: "var(--accent-deep)" }}>
                Progress
              </Link>.
            </p>
          </Card>

          <MasteryLists words={mastery} counts={masteryCounts(mastery)} />

          {/*
            The slice of this deck that the review queue is slowest to reach.
            Unseen cards are introduced oldest first, so a word added out of
            curiosity waits behind the course backlog, which on a deck built by
            adding a level in first run is a year long. This is the one press
            that asks about them, and it belongs on the page about the deck
            rather than on a practice menu, which is what `within` says.
          */}
          <DrillLink href="/review/lookups" />

          <Diagnosis ownerId={ownerId} />

          <WordsTable rows={rows} />
          {totalCards > rows.length && (
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              Showing the {rows.length} cards due soonest, of {totalCards}. Use the filters or the
              search box above to find the rest.
            </p>
          )}
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
function DeckBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {segments.map((s) => (
          <span key={s.label} className="flex flex-col">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tnum font-display text-2xl font-bold leading-tight" style={{ color: "var(--ink)" }}>{s.value}</span>
            <span className="tnum text-xs" style={{ color: "var(--ink-3)" }}>{Math.round((s.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Accuracy per grammatical case — the diagnostic that turns a card box into a study plan. */
