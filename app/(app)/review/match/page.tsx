import { titleFor } from "@/lib/progress/locale";
import { prisma } from "@/lib/db";
import { plainPhrase } from "@/lib/copy/values";
import { requireUserId } from "@/lib/auth/session";
import { numberSetting, readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { RECENT_WORDS, byRecency, lemmaFilter, recentLemmas } from "@/lib/course/scope";
import { MatchSession, type MatchPair } from "./MatchSession";
import { practiceScope } from "@/lib/progress/moduleScope";
import { meaningPrefsFrom, meaningsShown } from "@/lib/collections/glossLanguage";

export async function generateMetadata() {
  return titleFor("Match");
}

export const dynamic = "force-dynamic";

const PAIRS = 8;
const MIN_PAIRS = 4;

/**
 * Builds one match round.
 *
 * Recognition cards only: a pair has to be a word and its meaning, and a
 * case-form card ("tuba → inessive") has no meaning to pair with. Due and
 * lapsed cards come first, so the round is practice rather than a novelty —
 * then anything else in the deck, so a learner who is caught up can still play.
 *
 * Duplicate translations are dropped: two tiles reading "book" would make a
 * pair unmatchable through no fault of the player.
 */
export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const now = new Date();

  /*
    OPENED FROM THE MODULE, THE BOARD IS THE MODULE'S OWN WORDS. A learner who
    walked here from Practice plays their whole deck; one the module sent
    plays what the module has taught through tonight, read off the step's own
    address (`lib/course/scope.ts`), so a beginner's first board is the five
    words they met an hour ago and never a word from further up the course.
  */
  const scope = await practiceScope(ownerId, await searchParams);
  const base = {
    ownerId, suspended: false, cardType: "RECOGNITION", lexemeId: { not: null },
    ...(scope ? { lexeme: lemmaFilter(scope) } : {}),
  } as const;
  // The equivalents ride in the select that already loads the word, for drawing the meaning tiles.
  const include = { lexeme: { select: { lemma: true, pos: true, translationRu: true, translationUk: true } } } as const;

  /*
    The best score is one settings row and has nothing to do with which cards
    are due, so the two are asked at once rather than one after the other. Each
    `await` here is a round trip to a pooler in another region.
  */
  const [recent, due, settings] = await Promise.all([
    /*
      AND INSIDE THE MODULE IT LEADS WITH TONIGHT, then the evenings just
      before it (`recentLemmas`). Due cards first put tonight's three new words
      on a B1 board beside five A1 greetings, because a learner standing at B1
      always has an `aitäh` somewhere near due.
    */
    scope
      ? prisma.card.findMany({
          where: { ...base, state: { not: 0 }, lexeme: { lemma: { in: recentLemmas(scope) } } },
          orderBy: { id: "asc" },
          take: RECENT_WORDS * 2,
          include,
        })
      : Promise.resolve([]),
    prisma.card.findMany({
      where: { ...base, due: { lte: now }, state: { not: 0 } },
      orderBy: { due: "asc" },
      take: PAIRS * 2,
      include,
    }),
    readSettings(ownerId, [SETTING_KEYS.matchBest, SETTING_KEYS.glossLanguage, SETTING_KEYS.glossAlso]),
  ]);
  const prefs = meaningPrefsFrom(settings[SETTING_KEYS.glossLanguage], settings[SETTING_KEYS.glossAlso]);

  const led = scope ? byRecency(scope, recent, (c) => c.lexeme?.lemma) : [];
  const ledIds = new Set(led.map((c) => c.id));
  let pool = [...led, ...due.filter((c) => !ledIds.has(c.id))];
  if (pool.length < PAIRS) {
    const seen = new Set(pool.map((c) => c.id));
    const rest = await prisma.card.findMany({
      /*
        state: { not: 0 } here too: this top-up is for a learner who is caught
        up, so they can still play, not a second door for a brand-new word to
        reach the board cold. Without it, a deck with fewer than PAIRS due
        cards filled the rest of the board from whatever came next by lapses
        and due, id included, which is exactly the unmet cards the due query
        above was built to keep out.
      */
      where: { ...base, id: { notIn: [...seen] }, state: { not: 0 } },
      orderBy: [{ lapses: "desc" }, { due: "asc" }],
      take: PAIRS * 2 - pool.length,
      include,
    });
    pool = [...pool, ...rest];
  }

  const seenAnswers = new Set<string>();
  const chosen: { pair: MatchPair; entry: (typeof pool)[number]["lexeme"] }[] = [];
  for (const card of pool) {
    const english = card.back.trim();
    const estonian = plainPhrase(card.lexeme?.lemma ?? card.front, card.lexeme?.pos);
    const key = english.toLowerCase();
    if (seenAnswers.has(key)) continue;
    seenAnswers.add(key);
    chosen.push({ pair: { cardId: card.id, estonian, english }, entry: card.lexeme });
    if (chosen.length === PAIRS) break;
  }
  /*
    The meaning tiles in the learner's language where every one of them has an
    equivalent and no two read the same, and in English otherwise. Drawing
    only: a pair is matched by its card.
  */
  const shown = prefs.lead === "en" ? null : meaningsShown(
    chosen.map((c) => ({ english: c.pair.english, entry: c.entry })), prefs,
  );
  const pairs: MatchPair[] = chosen.map((c, i) => (
    shown && shown[i]?.english ? { ...c.pair, meaning: shown[i] } : c.pair
  ));

  const best = numberSetting(settings[SETTING_KEYS.matchBest], 0);

  return <MatchSession pairs={pairs.length >= MIN_PAIRS ? pairs : []} best={best} />;
}
