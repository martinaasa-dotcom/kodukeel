import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight, Check, ChevronRight, Compass, Flag, Lock } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { deckSnapshot, pathWithProgress } from "@/lib/progress/summary";
import { courseLevelFor } from "@/lib/progress/level";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";
import {
  CHECKPOINTS, LEVELS, LEVEL_INFO, isUnitOpen, nextUnit,
} from "@/lib/collections/syllabus";
import { ButtonLink } from "@/components/Button";
import { NamedIcon } from "@/components/icons";
import { Chip, Meter, Page, SectionTitle } from "@/components/ui";
import { learnCounts } from "@/lib/progress/learn";
import { learnerModuleScope } from "@/lib/progress/moduleScope";
import { LEARN_BATCH } from "@/lib/learn/ladder";
import { Explain } from "@/components/Explain";

export const metadata = { title: "Learn" };

export const dynamic = "force-dynamic";

/** Units of the open level drawn before the rest go behind a press. */
const UNITS_SHOWN = 6;

/**
 * The course.
 *
 * Eighty-two units is far too many for one list, so the page is the five CEFR
 * levels and each one opens. The learner's own level is open on arrival and the
 * rest are shut. That is also the honest shape of the thing, because a level is
 * the unit of progress a learner actually cares about. "Four units into B1"
 * means something; "unit 31 of 82" does not.
 *
 * Progress is computed from the deck (lib/progress/summary.ts), so a unit fills
 * up as its words are genuinely learned rather than as they are clicked on.
 */
export default async function LearnPage() {
  const ownerId = await requireUserId();
  /*
    The counts are the ones on the button that opens the round, so they are
    read through the same narrowing the round applies (`learnWithin`): a card
    promising twelve words waiting, over a round the module then holds back,
    reads as a counting fault rather than as a rule.
  */
  const [[snapshot, units], placement, counts] = await Promise.all([
    /*
      Each chain waits only on the answer it needs: the path is read off the
      deck, and the counts off where the module has taken the learner. They
      were two batches, so the counts waited on the deck for nothing.
    */
    deckSnapshot(ownerId).then(async (snap) => [snap, await pathWithProgress(ownerId, snap)] as const),
    courseLevelFor(ownerId),
    learnerModuleScope(ownerId).then((taught) => learnCounts(ownerId, undefined, taught?.lemmas ?? null)),
  ]);

  const doneIds = new Set(units.filter((u) => u.state === "done").map((u) => u.unit.id));
  const startedIds = new Set(units.filter((u) => u.state === "learning").map((u) => u.unit.id));
  const next = nextUnit({ doneUnitIds: doneIds, startedUnitIds: startedIds, placement });

  // Counted over distinct lemmas rather than summed across units. A grammar unit
  // deliberately drills vocabulary an earlier unit introduced — the object unit
  // teaches its rule with verbs from A1 — so adding up per-unit totals counted
  // those words twice and told the learner the course was about seventy words
  // bigger than it is.
  const countWords = (rows: typeof units) => {
    const lemmas = new Set(rows.flatMap((u) => u.lemmas));
    return {
      words: lemmas.size,
      known: [...lemmas].filter((l) => snapshot.knownLemmas.has(l)).length,
    };
  };

  const { words: totalWords, known: knownWords } = countWords(units);

  const byLevel = LEVELS.map((level) => {
    const rows = units.filter((u) => u.unit.level === level);
    const { words, known } = countWords(rows);
    return {
      level,
      rows,
      words,
      known,
      pct: words > 0 ? Math.round((known / words) * 100) : 0,
      finished: rows.length > 0 && rows.every((u) => u.state === "done"),
    };
  });

  return (
    <Page route="/learn"
      title="Learn"
      lead="New words, one small round at a time, and the course they come out of."
    >
      {/*
        WHAT THIS PAGE LEADS WITH IS THE NEXT FIVE WORDS, NOT THE MAP.

        The course is eighty-two units and answers "where am I going". It is
        the wrong first thing on a screen somebody opened to study, because
        choosing a unit is a decision and the honest answer to it at any given
        level is "the next one". So the ladder is the card at the top and the
        map is under it: a learner who wants to pick reads on, and one who
        wants to learn presses the button.
      */}
      <LearnCard waiting={counts.waiting} started={counts.started} phrases={counts.phrases} />

      {/*
        THE COURSE IS A LIST, AND THE LIST IS ALL IT NEEDS.

        A card sat between the heading and the list with a ring, the level,
        the words known, a disclosure about what counts as known, a link to
        the level check and a button to continue the next unit, which is the
        same button the next unit carries two inches lower. Six things before
        the list, one of them a second copy of the list's own primary. The
        level and the count are the heading's hint now; the level check and
        the explanation are at the foot of the page, where somebody who wants
        them goes looking.
      */}
      <SectionTitle hint={`${placement}, ${knownWords} of ${totalWords} words known`}>The course</SectionTitle>

      <div className="flex flex-col gap-3">
        {byLevel.map(({ level, rows, words, known, pct, finished }) => {
          const info = LEVEL_INFO[level];
          const checkpoint = CHECKPOINTS.find((c) => c.level === level);
          // The learner's own level is open on arrival and nothing else is: three
          // levels open at once was a hundred rows before the page ended. A level
          // with work in progress says so on its own closed row.
          const open = level === placement;
          const inProgress = rows.filter((u) => u.state === "learning").length;
          const row = (u: (typeof rows)[number]) => {
                const locked = !isUnitOpen({ unit: u.unit, doneUnitIds: doneIds, placement });
                const complete = u.state === "done";
                const isNext = !!next && u.unit.id === next.id;
                return (
                  <li
                    key={u.unit.id}
                    className="@container flex flex-wrap items-center gap-3 rounded-[var(--r-sm)] px-3 py-2.5 @md:flex-nowrap"
                    /*
                      ONE LINE A UNIT, AND ONE BUTTON IN THE WHOLE LIST.

                      Every row carried its can-do statement, a progress bar,
                      a count, a "Builds on" sentence when it was locked and
                      a button of its own, so a level of twenty-nine units
                      was a column of twenty-nine buttons with paragraphs
                      between them. The row is the way in and says what the
                      unit is called and how far through it you are. The
                      next unit alone says what it is for and carries the
                      one button, because that is the one row somebody
                      should press.

                      A locked unit is quieter through its padlock rather
                      than a fade on the row: `opacity` multiplies through
                      the words and took the unit's name under 4.5:1.
                    */
                    style={{ background: isNext ? "var(--accent-soft)" : undefined }}
                  >
                    <Link
                      href={`/learn/${u.unit.id}`}
                      className="group flex min-w-0 flex-1 basis-full items-center gap-3 @md:basis-0"
                    >
                      <span
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: complete ? "var(--sky-soft)" : u.state === "learning" ? "var(--accent-soft)" : "var(--raised)",
                          color: complete ? "var(--sky-ink)" : u.state === "learning" ? "var(--accent-deep)" : "var(--ink-3)",
                        }}
                      >
                        {locked ? <Lock size={15} aria-hidden /> : complete ? <Check size={17} aria-hidden /> : <NamedIcon name={u.unit.icon} size={16} aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          lang={uiWantsEnglish(placement) ? undefined : "et"}
                          className="block text-md font-bold group-hover:underline"
                          style={{ color: "var(--ink)" }}
                        >
                          {uiText(placement, u.unit.title, u.unit.subtitle)}
                        </span>
                        {isNext && (
                          <span className="block max-w-[62ch] text-sm" style={{ color: "var(--ink-2)" }}>
                            {u.unit.canDo}
                          </span>
                        )}
                        {/* Under the name in a narrow row, beside it in a wide
                            one: beside it at 320 left "sustainability" a box
                            too narrow for the word. */}
                        <span className="tnum block text-xs @md:hidden" style={{ color: "var(--ink-3)" }}>
                          {u.known}/{u.available}
                        </span>
                      </span>
                      <span className="tnum hidden shrink-0 text-xs @md:inline" style={{ color: "var(--ink-3)" }}>
                        {u.known}/{u.available}
                      </span>
                      {locked && <span className="sr-only">, builds on an earlier unit, and opens anyway</span>}
                      {!isNext && (
                        <ChevronRight size={18} aria-hidden className="shrink-0" style={{ color: "var(--ink-3)" }} />
                      )}
                    </Link>
                    {isNext && (
                      <span className="w-full @md:w-auto">
                        <ButtonLink
                          href={u.available > 0 ? `/learn/${u.unit.id}/lesson` : `/learn/${u.unit.id}`}
                          variant="primary"
                          size="sm"
                          className="w-full justify-center @md:w-32"
                        >
                          {u.state === "learning" ? "Continue" : "Start"}
                        </ButtonLink>
                      </span>
                    )}
                  </li>
                );
          };
          /*
            A LEVEL OPEN ON ARRIVAL SHOWS WHERE YOU ARE, NOT ALL OF IT.

            A1 is forty-one units and the open level was forty-one rows before
            the next level began, which is a wall somebody has to scroll past
            to find out there is anything else. The unit you are on and the
            few after it are what a learner chooses between; the rest, done and
            to come, are one press away under a line that says how many.
          */
          const anchorAt = Math.max(0, rows.findIndex((u) => (next ? u.unit.id === next.id : u.state !== "done")));
          const windowed = open && rows.length > UNITS_SHOWN + 2;
          const shown = windowed ? rows.slice(anchorAt, anchorAt + UNITS_SHOWN) : rows;
          const tucked = windowed ? rows.filter((u) => !shown.includes(u)) : [];
          return (
            <details
              key={level}
              open={open}
              className="rounded-[var(--r-lg)] border"
              style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
            >
              <summary className="flex min-h-[56px] cursor-pointer flex-wrap items-center gap-3 p-4 sm:gap-4">
                <span
                  className="tnum flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    // Two contrast fixes live here, and both came from putting
                    // *text* on backgrounds the app had only ever used behind an
                    // icon. White on --accent is 4.05:1 and white on --sky is
                    // 2.30:1, neither of which clears AA for a 13.5px label;
                    // --accent-deep is 6.25:1 and flips correctly in dark mode.
                    // --ink-3 on --raised is 4.05:1 too, so the resting badge
                    // takes --ink-2: the muted token is for a hint beside
                    // something, not for the only thing in a badge.
                    background: finished ? "var(--sky)" : pct > 0 ? "var(--accent-deep)" : "var(--raised)",
                    color: finished || pct > 0 ? "var(--surface)" : "var(--ink-2)",
                  }}
                >
                  {finished ? <Check size={20} aria-hidden /> : level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span
                      lang={uiWantsEnglish(placement) ? undefined : "et"}
                      className="text-lg font-bold"
                      style={{ color: "var(--ink)" }}
                    >
                      {uiText(placement, info.title, info.titleEn)}
                    </span>
                    {level === placement && <Chip tone="accent">You are here</Chip>}
                  </span>
                  <span className="mt-0.5 block max-w-[70ch] text-sm" style={{ color: "var(--ink-2)" }}>
                    {info.summary}
                  </span>
                  <span className="mt-2 flex items-center gap-3">
                    <span className="max-w-[220px] flex-1">
                      <Meter
                        pct={pct}
                        label={`${level}: ${known} of ${words} words known`}
                        tone={finished ? "var(--good)" : "var(--accent)"}
                        height={7}
                      />
                    </span>
                    {/* The counts stay: the `Meter` beside this draws a bar and
                        carries its figures in an `aria-label`, so this line is
                        the only place a sighted reader sees them. */}
                    <span className="tnum text-xs" style={{ color: "var(--ink-3)" }}>
                      {rows.length} units, {known}/{words} words
                      {!open && inProgress > 0 && <>, {inProgress} in progress</>}
                    </span>
                  </span>
                </span>
              </summary>

              <ol className="flex flex-col border-t px-2 py-2 sm:px-3" style={{ borderColor: "var(--rule)" }}>
                {shown.map(row)}
                {tucked.length > 0 && (
                  <li>
                    <details className="group/more">
                      <summary className="tap-tint flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--r-sm)] px-3 py-2 text-sm font-semibold" style={{ color: "var(--accent-deep)" }}>
                        <ChevronRight size={16} aria-hidden className="shrink-0 transition-transform group-open/more:rotate-90" />
                        The other {tucked.length} units at {level}
                      </summary>
                      <ol className="flex flex-col">{tucked.map(row)}</ol>
                    </details>
                  </li>
                )}

                {checkpoint && (
                  <li className="mt-1 flex items-center gap-3 rounded-[var(--r-sm)] border-t px-3 pb-1 pt-3" style={{ borderColor: "var(--rule-soft)" }}>
                    <Link
                      href={`/learn/checkpoint/${level.toLowerCase()}`}
                      className="group flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "var(--raised)", color: "var(--ink-3)" }}
                      >
                        <Flag size={15} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          lang={uiWantsEnglish(placement) ? undefined : "et"}
                          className="block text-md font-bold group-hover:underline"
                          style={{ color: "var(--ink)" }}
                        >
                          {uiText(placement, checkpoint.title, checkpoint.titleEn)}
                        </span>
                        <span className="tnum block text-xs" style={{ color: "var(--ink-3)" }}>
                          {checkpoint.questions} questions, {checkpoint.passMark}% to pass
                        </span>
                      </span>
                      <ChevronRight size={18} aria-hidden className="shrink-0" style={{ color: "var(--ink-3)" }} />
                    </Link>
                  </li>
                )}
              </ol>
            </details>
          );
        })}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <Explain label="What counts as known">
          A word counts as known once every card made from it has moved past the learning stage,
          not just been answered right once.
        </Explain>
        <Explain label="How a unit relates to the dictionary">
          Units are shortcuts into the same dictionary, not a separate course. Everything in them can
          also be found by searching, and anything missing you can{" "}
          <Link href="/dictionary" className="underline" style={{ color: "var(--accent-deep)" }}>add yourself</Link>.
          Nothing is ever truly locked: a unit above your level shows what it builds on, and opens anyway.
        </Explain>
        <Link
          href="/assess"
          className="mt-1 inline-flex items-center gap-1.5 self-start text-sm underline"
          style={{ color: "var(--accent-deep)" }}
        >
          <Compass size={14} aria-hidden /> Not sure of your level? Take the level check
        </Link>
      </div>
    </Page>
  );
}

/**
 * The next round of new words, and what happens to them.
 *
 * Three states rather than one with a disabled button. Words waiting is the
 * ordinary case; words part way up the ladder and none waiting is somebody who
 * has taken everything their deck holds and is finishing it off; nothing at all
 * is a deck that needs filling, and the course underneath is the way to fill it,
 * which is why this says so rather than offering a dead button.
 */
function LearnCard({
  waiting, started, phrases,
}: {
  waiting: number;
  started: number;
  /** The same two counts, over the fixed phrases (`Tere!`, `Kuidas läheb?`) rather than words. */
  phrases: { waiting: number; started: number };
}) {
  const ready = waiting + started;
  const phrasesReady = phrases.waiting + phrases.started;
  const batch = Math.min(ready, LEARN_BATCH);
  return (
    <div className="night mb-10 rounded-[var(--r-xl)] border p-6 md:p-9">
      <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="label-xs" style={{ color: "var(--butter-ink)" }}>
            {ready > 0 ? "Tonight\u2019s new words" : "New words"}
          </p>
          <h2 className="font-display mt-3 text-4xl font-bold leading-[1] md:text-5xl" style={{ color: "var(--ink)", textWrap: "balance" }}>
            {ready > 0 ? <>{batch} words are waiting</> : <>Nothing waiting yet</>}
          </h2>
          {/*
            One line for what happens next, where there used to be two chips of
            counts and three boxes spelling out the ladder under the button:
            five things to read before pressing the one thing on the card.
          */}
          {ready > 0 ? (
            <p className="mt-3 max-w-[48ch] text-md" style={{ color: "var(--ink-2)" }}>
              Meet each one, pick its meaning, then put it back in a sentence.
              {started > 0 && <> {started} already part way.</>}
            </p>
          ) : (
            <p className="mt-3 max-w-[44ch] text-md" style={{ color: "var(--ink-2)" }}>
              Open a unit below and its words arrive here, ready to be met.
            </p>
          )}
        </div>
        {/*
          `shrink-0` and `items-center` are the whole of what keeps the two
          buttons whole. Without them the row beside the heading was a flex
          item the heading could squeeze, `overflow-wrap: anywhere` let it go
          down to a letter, and "Learn 5 phrases" was drawn five letters a
          line at 44px wide while the primary beside it stretched to 319px
          tall. A button label is never broken (`components/Button.tsx`), so
          what gives now is the heading's measure, which is prose.
        */}
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap">
          {/*
            A whole phrase (`Kas sa räägid inglise keelt?`) is taught on the same
            ladder as a word, and for a while that meant "learn 5 new words" could
            hand over five phrases in a row, the entire `tervitused` unit and
            nothing else: a learner pressing "words" expecting words. So a phrase
            is its own quieter button here rather than folded into the count
            above, only where one is actually waiting.
          */}
          {phrasesReady > 0 && (
            <ButtonLink href="/learn/new?kind=phrase" variant="secondary" className="w-full justify-center sm:w-auto">
              Learn {Math.min(phrasesReady, LEARN_BATCH)} phrases
            </ButtonLink>
          )}
          {ready > 0 && (
            <ButtonLink href="/learn/new" variant="primary" size="lg" className="w-full justify-center whitespace-nowrap sm:w-auto">
              Learn {batch} words <ArrowRight size={17} aria-hidden />
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}
