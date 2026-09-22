import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { starredAmong } from "@/lib/progress/stars";
import { lemmaFilter, moduleScopeFrom } from "@/lib/course/scope";
import { spellable, tilesFor } from "@/lib/games/letters";
import { shuffle } from "@/lib/random/shuffle";
import { LettersSession, type LettersWord } from "./LettersSession";
import { BeforeYouStart } from "@/components/round/Briefing";

export const metadata = { title: "Tähed" };

export const dynamic = "force-dynamic";

/** Words in one round: enough to be a game, short enough for one evening. */
const ROUND = 8;

/** The pool the round draws from, before the words that cannot be played are dropped. */
const POOL = 40;

/**
 * TÄHED: A TAUGHT WORD'S LETTERS, SCRAMBLED, PUT BACK IN ORDER.
 *
 * The A1 evening was reported as the same evening every night, and it was:
 * Match and Listening are what a handful of words can carry, and both ask the
 * words back as meanings. This asks them back as spellings, which is the one
 * thing a beginner has to notice about Estonian before anything else, that
 * `ä` and `a` are two letters and `ö` and `õ` are two more. See
 * `lib/games/letters.ts` for the rules and why nothing in them is written.
 *
 * WHICH CARD IT GRADES. Rebuilding the spelling from the meaning is
 * production, so the round grades the word's PRODUCTION card, the way the
 * closing review does when the same word is typed cold (ADR-016). It draws
 * the words the learner has met, which is a RECOGNITION card in a state past
 * new: the ladder grades that card on the choice rung, so a word met this
 * evening is on the board tonight. Due first, then the rest, and only words
 * `spellable` says have an order to find.
 *
 * Inside the module it is the module's own words off the step's address
 * (`lib/course/scope.ts`), like every other round a rotation can deal.
 *
 * Always renders the session, for the reason the listening page gives: the
 * Server Component refreshes on every grade, and a choice made here between
 * an empty state and the session would swap to the empty state as the last
 * word was graded.
 */
export default async function LettersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const now = new Date();
  const scope = moduleScopeFrom(await searchParams);
  const scoped = scope ? lemmaFilter(scope) : {};

  const where = {
    ownerId, suspended: false, cardType: "PRODUCTION" as const, lexemeId: { not: null },
    lexeme: {
      ...scoped,
      cards: { some: { ownerId, cardType: "RECOGNITION" as const, suspended: false, state: { not: 0 } } },
    },
  };
  const select = { lexeme: { select: { lemma: true, translation: true } } };

  const due = await prisma.card.findMany({
    where: { ...where, due: { lte: now } },
    orderBy: [{ due: "asc" }, { id: "asc" }],
    take: POOL,
    include: select,
  });
  let cards = due;
  if (cards.length < POOL) {
    const seen = new Set(cards.map((c) => c.id));
    const rest = await prisma.card.findMany({
      where: { ...where, id: { notIn: [...seen] } },
      orderBy: [{ due: "asc" }, { id: "asc" }],
      take: POOL - cards.length,
      include: select,
    });
    cards = [...cards, ...rest];
  }

  const playable = cards.filter((c) => c.lexeme && spellable(c.lexeme.lemma));
  const picked = shuffle(playable).slice(0, ROUND);
  const starred = await starredAmong(
    ownerId, picked.map((c) => c.lexemeId).filter((id): id is string => !!id),
  );

  // Scrambled here and handed down, because a shuffle run in the render
  // disagrees with itself between the server and the browser and the whole
  // board is regenerated on arrival, measured as a hydration error.
  const words: LettersWord[] = picked.map((c) => ({
    cardId: c.id,
    lemma: c.lexeme!.lemma,
    tiles: tilesFor(c.lexeme!.lemma),
    meaning: c.lexeme!.translation,
    lexemeId: c.lexemeId!,
    starred: starred.has(c.lexemeId!),
  }));

  return (
    <BeforeYouStart id="letters" ready={words.length > 0} count={{ n: words.length, noun: "word" }}>
      <LettersSession words={words} />
    </BeforeYouStart>
  );
}
