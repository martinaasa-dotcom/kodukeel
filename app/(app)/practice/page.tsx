import { HeroFan } from "@/components/HeroFan";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { deckSnapshot } from "@/lib/progress/summary";
import { listDecks } from "@/lib/progress/decks";
import { masteryCounts, masteryFor } from "@/lib/progress/mastery";
import { parseExamples, usableExamples } from "@/lib/dict/examples";
import { isOrderable } from "@/lib/estonian/orderTiles";
import { dictationWords } from "@/lib/estonian/dictation";
import { numberSetting, readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { GAMES, QUICK_MODES, modeAt, type PracticeMode } from "@/lib/ux/modes";
import { COMMON_GROUPS } from "@/lib/collections/commonGroups";
import { ButtonLink } from "@/components/Button";
import { NamedIcon } from "@/components/icons";
import { Empty, Page, SectionTitle, Stack, toneInk } from "@/components/ui";
import { courseLevelFor } from "@/lib/progress/level";
import { BUILD_FROM, maySortWords } from "@/lib/collections/levels";

export async function generateMetadata() {
  return titleFor("Practice");
}

export const dynamic = "force-dynamic";

/**
 * Every way to practice, in one place, with the state that decides whether each
 * one is worth doing right now: how many cards are due, your
 * fastest match. A hub that just lists modes makes you guess; this one answers
 * "what should I do with the next five minutes".
 */
export default async function PracticePage() {
  const ownerId = await requireUserId();
  const [snapshot, settings, sentenceReady, words, decks, level, locale] = await Promise.all([
    deckSnapshot(ownerId),
    readSettings(ownerId, [SETTING_KEYS.matchBest]),
    /*
      The learner's own words, asked for as words.

      This was a `findMany` over their cards with `distinct: ["lexemeId"]` and
      `take: 300`, which is the page's heaviest read and only looked bounded.
      Prisma deduplicates in the client, so a `LIMIT` would cut rows before the
      deduplication and it emits none: the SQL was every card this learner
      owns, and then `examples`, the longest column in the schema, fetched once
      per card rather than once per word. A word with five card types was read
      five times.

      Asking Lexeme instead is one row per word by construction, so the cap is
      a real `LIMIT` and the join happens once. Two thousand is past any deck
      somebody has actually built, and ordered, so a learner who does get there
      is told the same number twice rather than a different one each load.

      Ordered to the end, since the lemma is not what identifies a row here:
      `Lexeme` is unique on `(lemma, pos)`, so two entries sharing a lemma tie,
      and past the cap it is the tie at the two thousandth row that decides
      which words the count is built from. That is the sentence above being
      true rather than nearly true.
    */
    prisma.lexeme.findMany({
      where: { cards: { some: { ownerId, suspended: false } } },
      orderBy: [{ lemma: "asc" }, { id: "asc" }],
      take: 2000,
      select: { examples: true },
    }),
    // Where every met word stands. The same read the Flash cards round makes,
    // so the count on its tile and the round behind it are one answer.
    masteryFor(ownerId),
    // The learner's own named shelves, so a deck built anywhere in the app is
    // reachable as a round right here rather than only from `/words/decks`.
    listDecks(ownerId),
    // The band the sentences round itself asks, so the tile cannot count
    // sentences ready on a round that will open on "from A2".
    courseLevelFor(ownerId),
    localeFor(ownerId),
  ]);

  /*
    Parsed once and asked twice. Each of these used to call `parseExamples` for
    itself, which is a `JSON.parse` per word per question, and the cap above is
    now a real one at two thousand rather than a number that was not in the SQL.
    Two thousand words is four thousand parses for two integers.

    Sentence building wants a sentence worth rebuilding; dictation is stricter,
    since it has to be short enough to hold in your head.
  */
  const usable = sentenceReady.map((w) => usableExamples(parseExamples(w.examples)));
  const sentenceCount = usable.filter((es) => es.some((e) => isOrderable(e.et))).length;
  const dictationCount = usable.filter((es) => es.some((e) => {
    const count = dictationWords(e.et).length;
    return count >= 3 && count <= 9 && e.et.length <= 80;
  })).length;
  const matchBest = numberSetting(settings[SETTING_KEYS.matchBest], 0);

  /*
    What Review would put in front of them right now: due cards plus the unseen
    ones it trickles in, drawn the same way Today draws it. A tile saying
    "Nothing due" over a session with ten cards in it is the sort of small
    inconsistency a reader catches once and then stops trusting.
  */
  const ready = Math.min(snapshot.dueCount + Math.min(snapshot.newForPractice, 10), 60);

  const counts = masteryCounts(words);
  const unfinished = counts.struggling + counts.almost + counts.learning;
  const flashMeta = unfinished > 0
    ? fill(tr(locale, "{n} to work on"), { n: unfinished })
    : words.length > 0 ? tr(locale, "All mastered") : tr(locale, "No words yet");

  /*
    What is ready right now, per round, where there is a figure worth saying.
    A round with no live figure says only what it is: the standing notes ("No
    score yet", "Eight words") were a second line of grey on every tile that
    told nobody anything they needed in order to choose.
  */
  const live: Record<string, string | undefined> = {
    "/review/match": matchBest > 0 ? fill(tr(locale, "best {n}s"), { n: matchBest }) : undefined,
    /* "34 ready" on a round that answers an A1 learner with "word order
       starts at A2" is the tile and the round disagreeing about one press. */
    "/review/sentences": !maySortWords(level) ? fill(tr(locale, "from {level}"), { level: BUILD_FROM }) : sentenceCount > 0 ? fill(tr(locale, "{n} ready"), { n: sentenceCount }) : undefined,
    "/review/dictation": dictationCount > 0 ? fill(tr(locale, "{n} ready"), { n: dictationCount }) : undefined,
  };
  const lineFor = (mode: PracticeMode) => {
    const what = tr(locale, mode.subtitle);
    const now = live[mode.href];
    return now ? `${what}, ${now}` : what;
  };
  const stocked = decks.filter((d) => d.wordCount > 0);
  const flash = modeAt("/review/flashcards");
  const common = modeAt("/review/common");

  return (
    <Page route="/practice" title={tr(locale, "Practice")} lead={tr(locale, "The words you've met, asked every which way until they stick.")}>
      {snapshot.totalCards === 0 ? (
        <Empty
          title={tr(locale, "Nothing to practice yet")}
          body={tr(locale, "Every round here uses words from your own deck, so meet a few first.")}
          action={<ButtonLink href="/learn" variant="primary">{tr(locale, "Learn some words first")}</ButtonLink>}
        />
      ) : (
        <Stack>
          {/*
            THREE THINGS, IN THE ORDER THEY ARE WORTH DOING.

            This page used to be eight sections and some twenty doors: the
            schedule, Situations, Flash cards, the frequency lists, the decks,
            a mastery strip, six rounds, six games, the mock paper and a
            weakest-case panel. Every one of them was worth having and together
            they were a page somebody landed on and did not know where to
            press. It was reported in exactly those words.

            So it answers one question in three steps. What is due, which is
            the schedule and is the one loud thing here. Then Flash cards,
            which is one round pointed at different sets of words, so the sets
            are choices inside one card rather than four cards. Then every
            other round, in one grid drawn one way. Situations has its own row
            in the rail, the mock paper and the weakest cases live under
            Progress, and where each word stands is a link inside the card
            whose round moves it.
          */}
          <HeroFan
            eyebrow={tr(locale, "Review")}
            title={ready > 0
              ? fill(tr(locale, ready === 1 ? "{cards} is ready" : "{cards} are ready"), { cards: countOf(locale, ready, "card") })
              : tr(locale, "Nothing is due right now")}
            text={tr(locale, "Each word comes back just before you'd forget it.")}
            cardsLabel={tr(locale, "Where your cards stand")}
            cards={[
              { figure: String(snapshot.dueCount), label: tr(locale, "Due now"), icon: "Clock" },
              { figure: String(Math.min(snapshot.newForPractice, 10)), label: tr(locale, "New to meet"), icon: "Sparkles" },
              { figure: String(unfinished), label: tr(locale, "To work on"), icon: "Target" },
            ]}
            action={
              <ButtonLink href="/review" variant={ready > 0 ? "primary" : "secondary"} size="lg" className="whitespace-nowrap">
                {ready > 0 ? tr(locale, "Review now") : tr(locale, "Nothing due, open it anyway")} <ArrowRight size={17} aria-hidden />
              </ButtonLink>
            }
          />

          {flash && common && (
            <section
              aria-labelledby="practice-flash"
              className="flex flex-col gap-5 rounded-[var(--r-lg)] border p-5 md:p-6"
              style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="practice-flash" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{tr(locale, flash.title)}</h2>
                <Link
                  href="/words/mastery"
                  className="text-sm font-semibold underline-offset-4 hover:underline"
                  style={{ color: "var(--accent-deep)" }}
                >
                  {tr(locale, "Where your words stand")}
                </Link>
              </div>
              <p className="-mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
                {tr(locale, "Your words, asked a new way each time: typed, heard in a sentence, or used in one you write. Pick which words.")}
              </p>

              <ChoiceGroup label={tr(locale, "Your words")}>
                <Choice href={flash.href} title={tr(locale, "All your words")} meta={flashMeta} />
                {stocked.map((deck) => (
                  <Choice
                    key={deck.id}
                    href={`/review/deck/${deck.id}`}
                    title={deck.name}
                    meta={countOf(locale, deck.wordCount, "word")}
                  />
                ))}
              </ChoiceGroup>

              <ChoiceGroup label={tr(locale, common.title)} href={common.href}>
                {COMMON_GROUPS.map((group) => (
                  <Choice
                    key={group.key}
                    href={`/review/common/${group.slug}`}
                    title={tr(locale, group.title)}
                    meta={countOf(locale, 100, "word")}
                    label={fill(tr(locale, "{round}: {list}, {group}"), {
                      round: tr(locale, flash.title),
                      list: tr(locale, common.title).toLowerCase(),
                      group: tr(locale, group.title).toLowerCase(),
                    })}
                  />
                ))}
              </ChoiceGroup>
            </section>
          )}

          {/*
            EVERY OTHER ROUND, IN ONE GRID DRAWN ONE WAY.

            The six rounds and the six games were two sections, each cycling
            the whole palette, stacked on top of each other: the same six
            colours twice in a row with two headings over them. What separates
            a round from a game is not a decision anybody makes before pressing
            one, so they are one shelf, rounds first. Drawn from the table
            rather than listed here, so a round added to `lib/ux/modes.ts` with
            `within: "/practice"` appears without anybody remembering this file.
          */}
          <section aria-labelledby="practice-rounds">
            <SectionTitle hint={tr(locale, "a few minutes each")}>
              <span id="practice-rounds">{tr(locale, "Rounds and games")}</span>
            </SectionTitle>
            {/* Columns by the room the page has rather than by the window:
                at 768 the rail takes a column and a viewport breakpoint laid
                out three tiles where two fit. */}
            <div className="@container"><div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @3xl:grid-cols-3">
              {/* A conversation is one more way of using a word, so it is on
                  this shelf rather than a row in the rail (`lib/ux/nav.ts`),
                  drawn like the rounds under it and across the whole row, so the
                  twelve under it still fill their rows. */}
              <div className="@lg:col-span-2 @3xl:col-span-3">
                <ModeTile
                  mode={{ href: "/situations", tone: "sky", icon: "MessagesSquare", title: tr(locale, "Situations") }}
                  line={tr(locale, "Talk your way through a real moment, at a café, a ticket window or the doctor's. Five to eight minutes.")}
                />
              </div>
              {QUICK_MODES.map((m) => (
                <ModeTile key={m.href} mode={{ ...m, title: tr(locale, m.title) }} line={lineFor(m)} />
              ))}
              {GAMES.map((m) => (
                <ModeTile key={m.href} mode={{ ...m, title: tr(locale, m.title) }} line={lineFor(m)} />
              ))}
            </div></div>
          </section>
        </Stack>
      )}
    </Page>
  );
}

/**
 * One round, drawn exactly like every other one.
 *
 * The icon sits against the title's line rather than the middle of the tile,
 * so a tile whose second line wraps puts its icon where every other tile puts
 * it; `items-center` left the icon level with the middle of a three-line block
 * on one tile and a two-line block on its neighbour, and the row read uneven.
 * One line under the title, never two: what the round is, and a live figure
 * after it where there is one.
 */
function ModeTile({ mode, line }: { mode: Pick<PracticeMode, "href" | "tone" | "icon" | "title">; line: string }) {
  return (
    <Link
      href={mode.href}
      className="lift flex h-full items-start gap-3 rounded-[var(--r-lg)] border p-4"
      style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: `var(--${mode.tone}-soft)`, color: toneInk(mode.tone) }}
      >
        <NamedIcon name={mode.icon} size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block text-base font-bold leading-snug" style={{ color: "var(--ink)" }}>{mode.title}</span>
        <span className="mt-0.5 block text-sm" style={{ color: "var(--ink-3)" }}>{line}</span>
      </span>
    </Link>
  );
}

/**
 * A labelled set of word sets inside the Flash cards card.
 *
 * The label is small and quiet and says what the buttons under it have in
 * common; where the set has a page of its own the label goes there.
 */
function ChoiceGroup({ label, href, children }: { label: string; href?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {href ? (
        <Link href={href} className="label-xs self-start underline-offset-4 hover:underline" style={{ color: "var(--ink-3)" }}>
          {label}
        </Link>
      ) : (
        <p className="label-xs" style={{ color: "var(--ink-3)" }}>{label}</p>
      )}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 11rem), 1fr))" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * One set of words to practise, as a button.
 *
 * Every one is the same shape: a name and one quiet line under it, no dot, no
 * icon. The four frequency lists used to carry a dot apiece and one of them,
 * "Describing words", wrapped its name under its dot at every width, which
 * is the fault `scripts/test-containment.mjs` now asks about on every page.
 */
function Choice({ href, title, meta, label }: { href: string; title: string; meta: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label ? `${label}, ${meta}` : undefined}
      className="tap-tint flex min-h-11 flex-col justify-center rounded-[var(--r)] border px-3.5 py-2.5"
      style={{ borderColor: "var(--rule-soft)", background: "var(--raised)" }}
    >
      <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</span>
      <span className="text-xs" style={{ color: "var(--ink-3)" }}>{meta}</span>
    </Link>
  );
}
