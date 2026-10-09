import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { prisma } from "@/lib/db";
import { sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { isAround } from "@/lib/collections/levels";
import { exceptionIndex } from "@/lib/dict/facts";
import { starredAmong } from "@/lib/progress/stars";
import { EXCEPTION_KINDS, FAMILY_TITLES, KIND_NOTES } from "@/lib/estonian/exceptions";
import { FAMILY_ORDER, kindsOf, parseFamily } from "@/lib/games/exceptionPaths";
import { familyStandings } from "@/lib/progress/exceptionStanding";
import { CEFR_LEVELS } from "@/lib/estonian/types";
import { exceptionRound, pickWords, type ExceptionWord } from "@/lib/games/exceptions";
import { formIndex } from "@/lib/games/flash";
import { naturalSentencesFor } from "@/lib/srs/cards";
import { shuffle } from "@/lib/random/shuffle";
import { resolveProvider } from "@/lib/tutor/provider";
import { ButtonLink } from "@/components/Button";
import { Chip, Empty, Page, Stack } from "@/components/ui";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ExceptionsSession } from "./ExceptionsSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { firstParams } from "@/lib/ux/queryParam";
import { practiceScope } from "@/lib/progress/moduleScope";

export async function generateMetadata() {
  return titleFor("Exceptions");
}

export const dynamic = "force-dynamic";

/**
 * THE DRILL FOR THE WORDS THE ENDING RULE DOES NOT REACH.
 *
 * `/grammar/exceptions` is the list and this is what to do with it, which is
 * the split `/dictionary/common` and `/review/common` already make: reading a
 * list of unpredictable forms teaches nobody one.
 *
 * WHICH WORDS. Banded to the learner's level, deck first. Government's drill
 * makes the same argument about the same thing one route over: a word met for
 * the first time in a drill that explains the answer is a reasonable way to
 * learn it, and a word already in the deck is the one where answering is
 * evidence the scheduler should see. `?kind=` narrows it, which is what the
 * button on each kind's own page sends.
 *
 * WHAT IT GRADES. The learner's own card for the word, where they hold one,
 * carrying the slot that was actually asked, so the illative somebody cannot
 * produce here lands in the same weakest-case chart as the illative they cannot
 * produce on a card (ADR-016). A word with no card writes nothing, which is the
 * answer `/review/emoji` gives about the same situation: there is no schedule
 * to move.
 *
 * The sentences are read through `naturalSentencesFor`, the deck's own reader,
 * because what counts as a sentence is one answer for the whole app and a
 * second copy of it is where two screens start disagreeing.
 */
export default async function ExceptionsRoundPage({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string | string[]; family?: string | string[]; mixed?: string | string[]; module?: string | string[];
  }>;
}) {
  const ownerId = await requireUserId();
  const canTranslate = resolveProvider() !== null;
  const params = firstParams(await searchParams);
  const { kind } = params;
  // Opened from the module, the words are the taught ones. See lib/course/scope.ts.
  const kindWanted = kind && (EXCEPTION_KINDS as readonly string[]).includes(kind.toUpperCase())
    ? kind.toUpperCase()
    : null;
  const family = parseFamily(params.family);
  /*
    THE ROUND IS ONE AREA AT A TIME, which is what makes it a path rather than a
    sample. A kind's own page asks for one kind, the chooser asks for a family,
    and a round opened from the module has its own scope. Only a bare visit
    gets the chooser: somebody who followed no link has not said what they want
    to practise, and the mixed round is one press from it.
  */
  if (!kindWanted && !family && !params.module && !params.mixed) return <FamilyChooser ownerId={ownerId} />;
  const wantedKinds: ReadonlySet<string> | null = kindWanted
    ? new Set([kindWanted])
    : family ? new Set(kindsOf(family)) : null;

  const [scope, level, index] = await Promise.all([
    practiceScope(ownerId, params), courseLevelFor(ownerId), exceptionIndex(),
  ]);
  const taught = scope ? new Set(scope.lemmas) : null;
  const near = index.filter(
    (row) => (taught ? taught.has(row.lemma) : isAround(row.cefr, level))
      && (!wantedKinds || row.exceptions.some((e) => wantedKinds.has(e.kind))),
  );

  if (near.length === 0) return <NothingToDrill />;

  // Both are asked of the same list and neither needs the other, so they are
  // one round trip.
  const [starred, cards] = await Promise.all([
    starredAmong(ownerId, near.map((row) => row.id)),
    prisma.card.findMany({
      where: { ownerId, lexemeId: { in: near.map((row) => row.id) } },
      select: { id: true, lexemeId: true, cardType: true, targetCase: true },
      // Ordered because it is what decides which words grade a real card, and an
      // unordered read hands that to the query plan: the same word would score on
      // one visit and not the next.
      orderBy: { id: "asc" },
    }),
  ]);

  const mine = new Set(cards.map((c) => c.lexemeId));
  /*
    Inside one family the words go easiest first, so the round climbs rather
    than wanders: the shuffle is for the mixed round, where variety is the
    point. Deck words still lead either way, since answering one of those is
    evidence the scheduler should see. Ended on the lemma, because a band is
    not unique and an order loose at the end is loose.
  */
  const bandOf = (cefr: string | null) => {
    const at = CEFR_LEVELS.indexOf(cefr as never);
    return at === -1 ? CEFR_LEVELS.length : at;
  };
  const climb = (rows: typeof near) => [...rows].sort(
    (a, b) => bandOf(a.cefr) - bandOf(b.cefr) || a.lemma.localeCompare(b.lemma),
  );
  const arrange = (rows: typeof near) => (family || kindWanted ? climb(rows) : shuffle(rows));
  const ordered = [
    ...arrange(near.filter((row) => mine.has(row.id))),
    ...arrange(near.filter((row) => !mine.has(row.id))),
  ];

  /*
    One exception per word, and the asked kind first where the round was opened
    from one of the kind pages. `pickWords` is what stops a word with four
    exceptions being the whole round, where the second rung of the second one
    is the first one's answer sitting on the screen.
  */
  const chosen = pickWords(ordered.flatMap((row) => {
    // Every exception the word has, so `pickWords` can spread the round across
    // kinds rather than taking whichever one happens to be first. Narrowed to
    // one where the round was opened from a kind's own page.
    const wantedOnes = wantedKinds ? row.exceptions.filter((e) => wantedKinds.has(e.kind)) : row.exceptions;
    return wantedOnes.map((exception) => ({ row, exception }));
  }).map(({ row, exception }) => ({
    lexemeId: row.id, lemma: row.lemma, translation: row.translation, pos: row.pos,
    exception,
    cardId: cardFor(cards, row.id, exception.slot),
    starred: starred.has(row.id),
    index: {} as Record<string, readonly string[]>,
    forms: [] as { formType: string; value: string; morphCode?: string | null }[],
    sentences: [] as { et: string; en: string | null }[],
    canTranslate,
  })));

  /*
    The forms and the sentences of the six words the round settled on, rather
    than of the three thousand it chose them from. `exceptionIndex` deliberately
    holds neither: the form index needs the whole paradigm and `examples` is the
    longest column in the schema, and a fact cached for everybody may not carry
    either at that size.
  */
  const [full, reach] = await Promise.all([
    prisma.lexeme.findMany({
      where: { id: { in: chosen.map((w) => w.lexemeId) } },
      select: {
        id: true, lemma: true, pos: true, examples: true,
        // The band, which decides whether this word's sentences are ranked for
        // a beginner rather than by length. See lib/dict/plainness.ts.
        cefr: true,
        forms: { select: { formType: true, value: true, morphCode: true }, orderBy: { id: "asc" } },
      },
      orderBy: { id: "asc" },
    }),
    // Asked beside it, because the two do not need each other.
    sentenceReach(),
  ]);

  const words: ExceptionWord[] = chosen.map((word) => {
    const lex = full.find((l) => l.id === word.lexemeId);
    if (!lex) return word;
    return {
      ...word,
      index: formIndex({ lemma: lex.lemma, pos: lex.pos, forms: lex.forms }),
      forms: lex.forms,
      sentences: naturalSentencesFor({
        lemma: lex.lemma, pos: lex.pos, examples: lex.examples, forms: lex.forms,
        plainest: plainerFirst(lex.cefr, reach),
      }).map((e) => ({ et: e.et, en: e.en ?? null })),
    };
  });

  const tasks = exceptionRound(words);
  /*
    Words near the learner's level do not guarantee a round. `pickWords` keeps
    only the drillable ones, so a kind page or a module whose words are all
    spelled like a principal part builds no task. Handed to the session, that
    read "Round complete · Asked 0": a round that claimed to have happened.
  */
  if (tasks.length === 0) return <NothingToDrill />;
  return (
    <BeforeYouStart id="exceptions" ready={tasks.length > 0} count={{ n: tasks.length, noun: "word" }}>
      <ExceptionsSession tasks={tasks} />
    </BeforeYouStart>
  );
}

/**
 * The card an answer about this word and this slot should move.
 *
 * The case card for the case being asked where the learner holds one, since
 * that is the card asking the same question, and any card of the word
 * otherwise. `gradeCard` writes the asked slot beside the grade either way, so
 * the review log records what was practiced whichever card carried it.
 */
function cardFor(
  cards: readonly { id: string; lexemeId: string | null; cardType: string; targetCase: string | null }[],
  lexemeId: string,
  slot: string,
): string | null {
  const mine = cards.filter((c) => c.lexemeId === lexemeId);
  const exact = mine.find((c) => c.targetCase === slot);
  if (exact) return exact.id;
  const production = mine.find((c) => c.cardType === "PRODUCTION");
  return (production ?? mine[0])?.id ?? null;
}

/** The one empty state, whichever of the two reasons there is nothing to ask. */
async function NothingToDrill() {
  // `requireUserId` is memoised for the render, so this is the session the page already read.
  const ownerId = await requireUserId();
  const locale = await localeFor(ownerId);
  return (
    <Page title={tr(locale, "Exceptions")} lead={tr(locale, "Words that don't follow the usual pattern, so you just have to know them.")}>
      <Empty
        title={tr(locale, "Nothing to practice here yet")}
        body={tr(locale, "None of the rule-breakers are near your level yet. Have a look through the full list instead.")}
        action={<ButtonLink href="/grammar/exceptions" variant="primary">{tr(locale, "Browse the exceptions")}</ButtonLink>}
      />
    </Page>
  );
}

/**
 * THE FIRST SCREEN: FOUR AREAS, WHERE YOU STAND IN EACH, AND ONE MIXED ROUND.
 *
 * The drill used to open straight into a round drawn across every kind, which
 * felt random. Each card here is one family, named the way the exceptions list
 * names it, with the kinds under it so a learner can see what they are about to
 * practise, and a standing read off their own answers. Never a stored counter
 * (ADR-014), and never "known" on thin evidence (`standingOf`).
 */
async function FamilyChooser({ ownerId }: { ownerId: string }) {
  const [locale, standings] = await Promise.all([localeFor(ownerId), familyStandings(ownerId)]);
  const t = (english: string) => tr(locale, english);
  return (
    <Page title={t("Exceptions")} lead={t("Pick one area and work through it, easiest words first.")}>
      <Stack>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FAMILY_ORDER.map((family, i) => {
            const standing = standings[family];
            return (
              <li key={family}>
                <Link
                  href={`/review/exceptions?family=${family.toLowerCase()}`}
                  className="lift flex h-full flex-col gap-2 rounded-[var(--r-lg)] border p-5"
                  style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                      {i + 1}. {t(FAMILY_TITLES[family])}
                    </span>
                    {standing.state === "known" && <Chip tone="accent">{t("Known")}</Chip>}
                    {standing.state === "learning" && (
                      <Chip tone="neutral">{fill(t("{pct}% right"), { pct: standing.pct })}</Chip>
                    )}
                    {standing.state === "new" && <Chip tone="neutral">{t("Not started")}</Chip>}
                  </span>
                  <span className="flex flex-wrap gap-1.5 pt-1">
                    {kindsOf(family).map((kind) => (
                      <span key={kind} className="rounded-full px-2.5 py-1 text-sm" style={{ background: "var(--raised)", color: "var(--ink-2)" }}>
                        {t(KIND_NOTES[kind].title)}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <ButtonLink href="/review/exceptions?mixed=1" variant="secondary">{t("Mixed round")}</ButtonLink>
      </Stack>
    </Page>
  );
}
