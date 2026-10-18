import { titleFor } from "@/lib/progress/locale";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { starredAmong } from "@/lib/progress/stars";
import { lemmaFilter } from "@/lib/course/scope";
import { spellableWord } from "@/lib/collections/spelling";
import { shuffle } from "@/lib/random/shuffle";
import { SpelledSession, type SpelledWord } from "./SpelledSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { practiceScope } from "@/lib/progress/moduleScope";

export async function generateMetadata() {
  return titleFor("Tähthaaval");
}

export const dynamic = "force-dynamic";

/** Words in one round: a short phone call's worth. */
const ROUND = 6;

/** The pool the round draws from, before the words that cannot be spelled are dropped. */
const POOL = 60;

/**
 * TÄHTHAAVAL: A WORD SPELLED DOWN THE PHONE, LETTER BY LETTER.
 *
 * Spelling is how a name, a street or an email gets from one person to
 * another in Estonia, and it is said in the letters' Estonian names, which
 * are not the English ones. This plays a word the learner has met, one
 * letter name at a time in the native speaker's recordings
 * (`lib/collections/spelling.ts`), and they write it down, the way they would
 * with a pen in one hand and a phone in the other.
 *
 * IT GRADES NOTHING, and that is the decision. What is practised is hearing
 * the letters' names, which no card holds: a learner who knows `tuba` and
 * writes `tyba` because the name of u and the name of y sound close has not
 * forgotten the word, and writing a lapse on its card would tell the scheduler
 * something false. A word somebody needs to see again is listed on the last
 * screen with its entry one press away, which is the only thing the round can
 * honestly say about it.
 *
 * Inside the module it reads the evenings' own words off the step's address,
 * like every other round (`lib/course/scope.ts`).
 */
export default async function SpelledPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const scope = await practiceScope(ownerId, await searchParams);
  const scoped = scope ? lemmaFilter(scope) : {};

  const cards = await prisma.card.findMany({
    where: {
      ownerId, suspended: false, cardType: "RECOGNITION", lexemeId: { not: null }, state: { not: 0 },
      lexeme: scoped,
    },
    orderBy: [{ due: "asc" }, { id: "asc" }],
    take: POOL,
    include: { lexeme: { select: { lemma: true, translation: true } } },
  });

  const seen = new Set<string>();
  const playable = cards.filter((c) => {
    const lemma = c.lexeme?.lemma;
    if (!lemma || !spellableWord(lemma) || seen.has(lemma)) return false;
    seen.add(lemma);
    return true;
  });
  const picked = shuffle(playable).slice(0, ROUND);
  const starred = await starredAmong(
    ownerId, picked.map((c) => c.lexemeId).filter((id): id is string => !!id),
  );

  const words: SpelledWord[] = picked.map((c) => ({
    id: c.id,
    lemma: c.lexeme!.lemma,
    meaning: c.lexeme!.translation,
    lexemeId: c.lexemeId!,
    starred: starred.has(c.lexemeId!),
  }));

  return (
    <BeforeYouStart id="spelled" ready={words.length > 0} count={{ n: words.length, noun: "word" }}>
      <SpelledSession words={words} />
    </BeforeYouStart>
  );
}
