import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HARD_LEARNERS, tooHardForEveryone } from "@/lib/srs/defer";

/**
 * HOW MANY PEOPLE PUT A WORD ASIDE, AND HOW MANY COULD HAVE.
 *
 * The counting behind `hardWords` in `lib/dict/facts.ts`, which caches the
 * answer and states why it may: the result is a fact about the shared
 * dictionary and about nobody in particular. The queries are here rather than
 * there because one of them has to name `ownerId`, and that file is asserted
 * to hold nothing scoped to a person. A `COUNT(DISTINCT "ownerId")` is the
 * opposite of what that rule is about, and a check that reads a filename
 * cannot tell the two apart, which is the right way round: the rule is worth
 * more than the convenience of keeping two queries beside their cache.
 *
 * TWO QUERIES AND THE SECOND ONE IS THE POINT. The first groups `Deferral`,
 * which holds one row per learner per word, so its count is people, and only
 * people who have graded a card (`votesFor`). That gives a handful of
 * candidates. The second asks how many learners met each of *those* words, by
 * a card or by having put it aside, which is the denominator
 * `tooHardForEveryone` needs and which is only cheap because the candidate
 * list is short and both tables are indexed on `lexemeId`.
 *
 * AND "SHORT" IS A CAP RATHER THAN A HOPE. The candidate list is whatever
 * `HARD_LEARNERS` lets through, which is a number about people and says
 * nothing about how many words reach it: the second query interpolates that
 * list into an `IN`, and the answer is read on every render of the review
 * queue. So it is cut, and a cut says where (`MOST_REFUSED`), which is the
 * words most people refused, the primary key settling a tie. What that costs
 * is the tail of a list this deployment is failing at the top of, and a
 * deployment with more than that many words past the threshold has a course
 * problem rather than a query problem.
 */

/**
 * People who met each of these words. The denominator.
 *
 * A card, or a press of "Too complicated", whichever came first. The unit
 * lesson puts a word aside before any card for it exists, so counting card
 * holders alone put those learners on top of the share and never under it:
 * the share could pass one, and a word refused only in lessons had no holders
 * at all and could never move however many people refused it.
 */
async function holdersOf(ids: readonly string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  /*
    `COUNT(DISTINCT)` in Postgres rather than Prisma's `distinct`, which
    deduplicates in the client: a word in four hundred decks is four hundred
    rows on the wire to produce one integer, and this asks about every
    candidate at once.
  */
  const rows = await prisma.$queryRaw<{ lexemeId: string; learners: number }[]>`
    SELECT met."lexemeId" AS "lexemeId",
           COUNT(DISTINCT met."ownerId")::int AS "learners"
    FROM (
      SELECT c."lexemeId", c."ownerId" FROM "Card" c
      WHERE c."lexemeId" IN (${Prisma.join([...ids])})
      UNION
      SELECT d."lexemeId", d."ownerId" FROM "Deferral" d
      WHERE d."lexemeId" IN (${Prisma.join([...ids])})
    ) met
    GROUP BY met."lexemeId"
  `;
  return new Map(rows.map((row) => [row.lexemeId, row.learners]));
}

/**
 * WHO GETS A VOTE, WHICH IS SOMEBODY WHO HAS ANSWERED A CARD.
 *
 * A deferral is two things at once: a wait on one learner's own cards, which
 * every press gets, and a vote on where a word sits for everybody, which only
 * a learner who has engaged with the course gets. Sign-up is open, so without
 * this a handful of accounts made for the purpose could put any word held by
 * few learners aside and move it a band later for the whole deployment, with
 * nothing on their side but a press each. One graded `Review` is the bar, any
 * at all: it costs a real learner nothing they had not already done on their
 * first evening, and it is a row a throwaway account has to go and earn.
 *
 * `EXISTS` rather than a join, because the question is whether a row exists
 * and `Review` is the largest table in the schema: the planner stops at the
 * first one it finds on `(ownerId, reviewedAt)`. One row per learner per word
 * in `Deferral` is still what makes the count people.
 *
 * Both readings go through here, the move and the admin's table, so the panel
 * cannot count a vote the move refuses.
 */
async function votesFor(
  atLeast: number,
  limit: number,
): Promise<{ lexemeId: string; learners: number }[]> {
  return prisma.$queryRaw<{ lexemeId: string; learners: number }[]>`
    SELECT d."lexemeId" AS "lexemeId", COUNT(*)::int AS "learners"
    FROM "Deferral" d
    WHERE EXISTS (SELECT 1 FROM "Review" r WHERE r."ownerId" = d."ownerId")
    GROUP BY d."lexemeId"
    HAVING COUNT(*) >= ${atLeast}
    ORDER BY COUNT(*) DESC, d."lexemeId" ASC
    LIMIT ${limit}
  `;
}

/**
 * How many words this may offer a band later, at once.
 *
 * Generous rather than tight, because every one of them is a real finding and
 * dropping one is a word left where the learners it is failing already said it
 * does not belong.
 */
const MOST_REFUSED = 200;

/** The words this deployment now teaches a band later than the dictionary says. */
export async function movedWords(): Promise<ReadonlySet<string>> {
  const candidates = await votesFor(HARD_LEARNERS, MOST_REFUSED);
  if (candidates.length === 0) return new Set<string>();

  const holding = await holdersOf(candidates.map((row) => row.lexemeId));
  const moved = new Set<string>();
  for (const row of candidates) {
    if (tooHardForEveryone({ learners: row.learners, holders: holding.get(row.lexemeId) ?? 0 })) {
      moved.add(row.lexemeId);
    }
  }
  return moved;
}

/**
 * The same counts, unfiltered, for whoever runs this installation.
 *
 * The queue on `/admin/suggestions` is where a person reads what learners have
 * said, and this is the half of it nobody typed a note for. It names the words
 * under the threshold as well as over it, because the ones on their way up are
 * the useful half of the reading: a word at four learners out of nine is the
 * next thing to look at, and a panel that only showed what has already been
 * acted on would be reporting its own decisions back.
 *
 * Not cached, unlike `hardWords`: it is read by one screen, by one person,
 * and a reviewer looking at a queue wants what is in it now.
 */
export interface HardWordReading {
  lexemeId: string;
  lemma: string;
  cefr: string | null;
  /** People who put it aside and have graded a card, one row each (`votesFor`). */
  learners: number;
  /** People holding a card for it, which is who could have. */
  holders: number;
  /** Whether the deployment is now offering it a band later. */
  moved: boolean;
}

/** Two people is the smallest thing that is a pattern rather than an evening. */
const WORTH_READING = 2;

export async function hardWordReadings(limit = 40): Promise<HardWordReading[]> {
  const candidates = await votesFor(WORTH_READING, limit);
  if (candidates.length === 0) return [];

  const ids = candidates.map((row) => row.lexemeId);
  const [holding, words] = await Promise.all([
    holdersOf(ids),
    prisma.lexeme.findMany({ where: { id: { in: ids } }, select: { id: true, lemma: true, cefr: true } }),
  ]);
  const byId = new Map(words.map((word) => [word.id, word]));

  return candidates.map((row) => {
    const learners = row.learners;
    const held = holding.get(row.lexemeId) ?? 0;
    return {
      lexemeId: row.lexemeId,
      lemma: byId.get(row.lexemeId)?.lemma ?? "",
      cefr: byId.get(row.lexemeId)?.cefr ?? null,
      learners,
      holders: held,
      moved: tooHardForEveryone({ learners, holders: held }),
    };
  });
}
