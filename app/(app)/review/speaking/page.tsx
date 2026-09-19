import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { parseExamples, usableExamples } from "@/lib/dict/examples";
import { sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import { naturalSentence } from "@/lib/estonian/cloze";
import { starredAmong } from "@/lib/progress/stars";
import { SpeakingSession, type SpeakingCard } from "./SpeakingSession";
import { lemmaFilter, moduleScopeFrom, sentenceWithin } from "@/lib/course/scope";
import { moduleSpellings } from "@/lib/progress/moduleScope";

export const metadata = { title: "Speaking" };

export const dynamic = "force-dynamic";

const ROUND = 10;

/**
 * A speaking round from the learner's own deck.
 *
 * Words the scheduler thinks are due come first — speaking practice on a word
 * you are about to forget is worth more than on one you met this morning. A
 * word whose sentence already has an English translation is asked as the
 * sentence instead: producing "Jõin tassi kohvi." out loud is a different and
 * harder skill than producing "kohv", and by this point in a session the
 * learner has usually earned it.
 */
export default async function SpeakingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const now = new Date();

  // Opened from the module, taught words, and a sentence only where every
  // word of it has been taught; otherwise the word alone, which this round
  // already says. See lib/course/scope.ts.
  const scope = moduleScopeFrom(await searchParams);
  const readable = sentenceWithin(scope, await moduleSpellings(scope));

  const base = {
    ownerId, suspended: false, cardType: "RECOGNITION", lexemeId: { not: null },
    ...(scope ? { lexeme: lemmaFilter(scope) } : {}),
  } as const;
  const include = {
    lexeme: { select: { lemma: true, translation: true, examples: true, cefr: true } },
  } as const;

  const [due, reach] = await Promise.all([
    prisma.card.findMany({
      where: { ...base, due: { lte: now }, state: { not: 0 } },
      orderBy: { due: "asc" },
      take: ROUND,
      include,
    }),
    // How a beginner's word orders its own sentences, so this round says the
    // plainest one recorded rather than the shortest. See lib/dict/plainness.ts.
    // Asked beside the deck read rather than in front of it: the two do not
    // need each other, and a hosted database is a round trip away.
    sentenceReach(),
  ]);

  let pool = due;
  if (pool.length < ROUND) {
    const seen = new Set(pool.map((c) => c.id));
    const rest = await prisma.card.findMany({
      /*
        state: { not: 0 } here too, matching the due read above: this top-up
        is for a session shorter than ROUND due cards, not a second door for a
        word the learner has never met to be asked out loud cold.
      */
      where: { ...base, id: { notIn: [...seen] }, state: { not: 0 } },
      orderBy: [{ lapses: "desc" }, { due: "asc" }],
      take: ROUND - pool.length,
      include,
    });
    pool = [...pool, ...rest];
  }

  // Which of the round are already favorites, in one read rather than one per
  // card, so the star in the corner is drawn in the state it is actually in.
  const starred = await starredAmong(
    ownerId, pool.map((c) => c.lexemeId).filter((id): id is string => !!id),
  );

  const cards: SpeakingCard[] = pool.map((card) => {
    const lemma = card.lexeme?.lemma ?? card.front;
    const kept = { lexemeId: card.lexemeId, starred: !!card.lexemeId && starred.has(card.lexemeId) };
    /*
      And only a sentence somebody could be asked to say aloud. `usableExamples`
      keeps what is worth printing on a dictionary entry, which is not the same
      thing: `Uuringud näitavad, et ..` trails off and `Elekter läks ära /
      kadus.` is two alternatives round a slash, and neither is speakable.
      `naturalSentence` is the gate the mock exam and the level check already
      put every sentence through.
    */
    const translated = usableExamples(
      parseExamples(card.lexeme?.examples), plainerFirst(card.lexeme?.cefr ?? null, reach),
    ).find((e) => e.en && naturalSentence(e.et) && readable(e.et));
    if (translated?.en) {
      return { cardId: card.id, et: translated.et, prompt: translated.en, lemma, isSentence: true, ...kept };
    }
    return { cardId: card.id, et: lemma, prompt: card.back, lemma, isSentence: false, ...kept };
  });

  return <SpeakingSession cards={cards} />;
}
