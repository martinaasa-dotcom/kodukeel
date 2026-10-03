import { prisma } from "@/lib/db";
import { readableFront } from "@/lib/copy/caseHint";
import { plainPhrase } from "@/lib/copy/values";
import { requireUserId } from "@/lib/auth/session";
import { starredAmong } from "@/lib/progress/stars";
import { SprintSession, type SprintCard } from "./SprintSession";
import { parseExamples, sentenceEnglish } from "@/lib/dict/examples";
import { BLANK, filledSentence } from "@/lib/estonian/cloze";
import { resolveProvider } from "@/lib/tutor/provider";
import { shuffle } from "@/lib/random/shuffle";
import { numberSetting, readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { roundPaceFrom, secondsFor, SPRINT_SECONDS } from "@/lib/ux/roundClock";
import {
  RECENT_WORDS, TONIGHT_SHARE, byRecency, cardWithin, lemmaFilter, recentLemmas, tonightsCase,
} from "@/lib/course/scope";
import { caseAskFor, type CaseAsk } from "@/lib/questions/caseAsk";
import { moduleSpellings, practiceScope } from "@/lib/progress/moduleScope";

export const metadata = { title: "Case Sprint" };

export const dynamic = "force-dynamic";

const POOL_SIZE = 40;

/* What a card's word brings with it: the sentence's English for a gap, and,
   inside the module, the forms and the kind of thing it is, which is what a
   case ask is built from (`lib/questions/caseAsk.ts`). */
const LEXEME_SELECT = {
  lemma: true, translation: true, examples: true, pos: true, semanticTypes: true,
  forms: { select: { formType: true, morphCode: true, value: true } },
} as const;


/**
 * A sixty second speed round by default, the "timed practice" idea, adapted to
 * cards already in the deck rather than inventing new content. Weak (high-lapse)
 * and overdue cards are favored, since fast repetition on exactly those is where
 * a timer earns its keep.
 *
 * Always renders SprintSession, even with an empty pool: SprintSession decides
 * for itself, once on mount, whether to show its own empty state. Server
 * Actions like gradeCard() refresh this route's Server Component on every
 * call, so a conditional Empty-vs-Session choice made *here* would keep
 * re-evaluating as the pool is graded away — and swap to Empty right as the
 * final card is graded, right before the session summary would show.
 */
export default async function SprintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const now = new Date();

  // Opened from the module, the sprint is the module's own words, and a case
  // card only once its page has been read. See lib/course/scope.ts.
  const scope = await practiceScope(ownerId, await searchParams);
  const scoped = scope ? { lexeme: lemmaFilter(scope) } : {};
  // Started here and awaited where it is read, so the settings row rides
  // beside the deck reads rather than after them.
  const settingsPromise = readSettings(ownerId, [
    SETTING_KEYS.sprintBest, SETTING_KEYS.roundPace,
  ]);

  const [spellings, recent, due] = await Promise.all([
    moduleSpellings(scope),
    /* Inside the module it leads with tonight and the evenings just before, as Match does. */
    scope
      ? prisma.card.findMany({
          where: { ownerId, suspended: false, state: { not: 0 }, lexeme: { lemma: { in: recentLemmas(scope) } } },
          orderBy: { id: "asc" },
          take: RECENT_WORDS * 3,
          include: { lexeme: { select: LEXEME_SELECT } },
        })
      : Promise.resolve([]),
    prisma.card.findMany({
      where: { ownerId, suspended: false, due: { lte: now }, state: { not: 0 }, ...scoped },
      orderBy: { due: "asc" },
      take: POOL_SIZE,
      include: { lexeme: { select: LEXEME_SELECT } },
    }),
  ]);

  const led = scope ? byRecency(scope, recent, (c) => c.lexeme?.lemma) : [];
  const ledIds = new Set(led.map((c) => c.id));
  let cards = [...led, ...due.filter((c) => !ledIds.has(c.id))].slice(0, POOL_SIZE);
  if (cards.length < POOL_SIZE) {
    const seenIds = new Set(cards.map((c) => c.id));
    const weak = await prisma.card.findMany({
      where: { ownerId, suspended: false, lapses: { gt: 0 }, id: { notIn: [...seenIds] }, ...scoped },
      orderBy: { lapses: "desc" },
      take: POOL_SIZE - cards.length,
      include: { lexeme: { select: LEXEME_SELECT } },
    });
    cards = [...cards, ...weak];
  }
  if (cards.length < POOL_SIZE) {
    // And then any met word, as Match and Listening already do: on an evening
    // where nothing is due and nothing has lapsed the sprint had no cards.
    const seenIds = new Set(cards.map((c) => c.id));
    const met = await prisma.card.findMany({
      where: { ownerId, suspended: false, state: { not: 0 }, id: { notIn: [...seenIds] }, ...scoped },
      orderBy: [{ due: "asc" }, { id: "asc" }],
      take: POOL_SIZE - cards.length,
      include: { lexeme: { select: LEXEME_SELECT } },
    });
    cards = [...cards, ...met];
  }

  // Shuffled so the same session doesn't always open on the same word.
  const shuffled = shuffle(cards.filter((c) => cardWithin(scope, c, spellings)));
  // Which of the pool are already favorites, in one read rather than one per
  // card, so the star in the corner is drawn in the state it is actually in.
  const starred = await starredAmong(
    ownerId, shuffled.map((c) => c.lexemeId).filter((id): id is string => !!id),
  );
  /*
    INSIDE THE MODULE A WORD CARD BECOMES A CASE, WHERE ONE HAS BEEN READ.

    A module learner's deck holds a word's meaning and its spelling, since the
    module adds those two and asks the forms in its rounds, so a sprint drawn
    off it was word flips under the name "Case Sprint" on the very evening that
    read the inessive. A production card of a noun is asked one of the cases
    the module has read instead, tonight's about half the time, phrased by what
    it means: the word, `Say "in the house"`, and `majas` behind the flip.
    Graded onto that card with the case as its slot, the way the writing round
    grades a sentence, so the mastery count sees the facet that was practised.
  */
  const tonight = tonightsCase(scope);
  const caseAsks = new Map<string, CaseAsk>();
  if (scope && scope.cases.length > 0) {
    for (const c of shuffled) {
      if (c.cardType !== "PRODUCTION" || c.lexeme?.pos !== "NOUN" || !c.lexeme.translation) continue;
      const ask = caseAskFor(
        { ...c.lexeme, translation: c.lexeme.translation }, scope.cases, tonight, TONIGHT_SHARE,
      );
      if (ask) caseAsks.set(c.id, ask);
    }
  }

  const sprintCards: SprintCard[] = shuffled.map((c) => {
    const asked = caseAsks.get(c.id);
    if (asked && c.lexeme) {
      return {
        id: c.id,
        front: plainPhrase(c.lexeme.lemma, c.lexeme.pos),
        back: asked.answer,
        ask: asked.ask,
        slot: asked.caseKey,
        lemma: plainPhrase(c.lexeme.lemma, c.lexeme.pos),
        lexemeId: c.lexemeId,
        starred: !!c.lexemeId && starred.has(c.lexemeId),
        cardType: "CASE_FORM",
        sentenceEn: null,
        hint: null,
      };
    }
    return {
      id: c.id,
      front: readableFront(c.front),
      back: c.back,
      ask: null,
      slot: null,
      lemma: c.lexeme ? plainPhrase(c.lexeme.lemma, c.lexeme.pos) : null,
      lexemeId: c.lexemeId,
      starred: !!c.lexemeId && starred.has(c.lexemeId),
      cardType: c.cardType,
      /*
        A gap-fronted card is a whole recorded sentence with one word taken out,
        and sprint draws whatever is due, so the fastest round in the app was
        also one of the places a sentence went past with nothing to say what it
        meant. The shipped line and no call here (`ask="never"` on the session),
        because forty cards in a minute is forty calls against the deployment's
        own daily cap for a reader who is racing past them.
      */
      sentenceEn: c.front.includes(BLANK) && c.lexeme
        ? sentenceEnglish(parseExamples(c.lexeme.examples), filledSentence(c.front, c.back))
        : null,
      // Not drawn, and read: it is how `gapMeaning` knows which word of the
      // English sentence is the one the gap is asking for.
      hint: c.hint,
    };
  });

  // Through the store, not straight at the table: the keys live there, and so
  // does the one settings read this request has already made. Both in one
  // call, because two reads of one map is two round trips for nothing.
  const settings = await settingsPromise;
  const best = numberSetting(settings[SETTING_KEYS.sprintBest], 0);
  /*
    How long the clock runs, resolved on the server and handed down as a
    number of seconds. The session is a client component and has no business
    reading a setting for itself; see lib/ux/roundClock.ts for why this is a
    pace over the round's own base rather than a stored number of seconds.
  */
  const seconds = secondsFor(SPRINT_SECONDS, roundPaceFrom(settings[SETTING_KEYS.roundPace]));

  return <SprintSession cards={sprintCards} best={best} seconds={seconds} canTranslate={resolveProvider() !== null} />;
}
