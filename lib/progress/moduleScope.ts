/**
 * The half of the module's scope that needs the dictionary: the spellings of
 * the words the ladder has taught, so a page can ask whether a sentence is
 * made of them. `lib/course/scope.ts` is the pure half and reads no database;
 * this reads one fact off `lib/dict/facts.ts`, which on a warm instance is no
 * query at all.
 */

import { cache } from "react";

import { prisma } from "@/lib/db";
import { courseFormsByLemma } from "@/lib/dict/facts";
import { moduleReached, programmeFor } from "@/lib/progress/course";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { dayReached, taughtThrough } from "@/lib/course";
import { startOfKey, type DayKey } from "@/lib/time/day";
import { moduleScopeFrom, scopeFor, scopeSoFar, type ModuleScope } from "@/lib/course/scope";
import { spellingsOf } from "@/lib/progress/lessonWords";
import { LADDER_CARD_TYPE } from "@/lib/learn/ladder";
import { APP_CHOSE } from "@/lib/srs/sources";

/** Every spelling of every taught word, or null outside a module. */
export async function moduleSpellings(scope: ModuleScope | null): Promise<ReadonlySet<string> | null> {
  if (!scope) return null;
  return spellingsOf(await courseFormsByLemma(), scope.lemmas);
}

/**
 * WHERE THE MODULE HAS TAKEN THIS LEARNER, READ OFF THEIR OWN STANDING RATHER
 * THAN OFF AN ADDRESS.
 *
 * `moduleScopeFrom` answers for a screen the module *opened*, which is the
 * only thing a URL can say. The daily path opens no such screen and was
 * therefore held to nothing: `/review` trickles unseen cards in beside what is
 * due, and on the second evening of A1 it handed a beginner
 * `Olen ______ nõus.` — a gap in a sentence holding two words nobody had shown
 * her, under a heading saying six were due. It was reported from exactly
 * there.
 *
 * The planned module is the record of what somebody has been taught, so it is
 * what the app reads before it teaches anything else. This reading credits
 * the whole evening reached and is the ladder's: Learn is where tonight's
 * words are taught. Everything that only asks, the review queue, Today's count
 * of it and the Practice rounds, reads `learnerScopeSoFar` below, which
 * credits tonight only for what tonight has done. The line that used to stand
 * here, that a round somebody walks to is their own difficulty to pick, was
 * the operator's and was reversed by the operator: the module and the rest of
 * the app are one course, and nothing may be asked before it is taught.
 *
 * Null for a learner who is not following a module, which is a state rather
 * than an absence: see `moduleReached`.
 */
export const learnerModuleScope = cache(async (ownerId: string): Promise<ModuleScope | null> => {
  const reached = await moduleReached(ownerId);
  if (!reached) return null;
  // The same constructor a module step's own address resolves through, so the
  // daily path and a step cannot disagree about what the ladder has shown.
  return scopeFor(reached.programme, reached.day);
});

/**
 * THE SAME STANDING, COUNTING TONIGHT ONLY FOR WHAT TONIGHT HAS DONE.
 *
 * `learnerModuleScope` credits the whole evening reached, which is right for
 * the ladder: Learn is where tonight's words are taught, so it has to be
 * allowed to teach them. Everything else that asks a learner something
 * without the module having opened it, the review queue, Today's count of it
 * and every Practice round, may only ask what has already been taught, and
 * part of tonight has not been yet. So a word of tonight's counts once the
 * ladder has asked it (a ladder card has left New), tonight's page once it is
 * ticked, tonight's past forms once they are, and the learner's own words
 * always: see `scopeSoFar` for the rule itself, which is pure.
 *
 * The evening after the one reached is read for met words too, because
 * pressing Start on it and walking the ladder writes no tick, so for those
 * minutes the pointer has not moved and the words have still been taught.
 *
 * Two reads beside the ones `moduleReached` makes, both owner-scoped and both
 * bounded by the deck, and memoised for the render because Today and the
 * round it links to both ask.
 */
export const learnerScopeSoFar = cache(async (ownerId: string): Promise<ModuleScope | null> => {
  const reached = await moduleReached(ownerId);
  if (!reached) return null;
  const { programme, day, ticked } = reached;
  const next = programme.days.find((d) => d.index === day.index + 1);
  const candidates = [...day.words, ...(next?.words ?? [])];
  const [metRows, ownRows] = await Promise.all([
    prisma.card.findMany({
      where: {
        ownerId, cardType: LADDER_CARD_TYPE, state: { not: 0 },
        lexeme: { lemma: { in: candidates } },
      },
      select: { lexeme: { select: { lemma: true } } },
    }),
    /*
      DISTINCT IN POSTGRES AND PINNED TO ONE OWNER, which is the only shape a
      `distinct` may take here: one learner's deck bounds it whatever it holds.
    */
    prisma.card.findMany({
      where: { ownerId, source: { notIn: [...APP_CHOSE] } },
      distinct: ["lexemeId"],
      select: { lexeme: { select: { lemma: true } } },
      orderBy: { lexemeId: "asc" },
    }),
  ]);
  const metSet = new Set(metRows.map((r) => r.lexeme?.lemma).filter((l): l is string => !!l));
  // In teaching order, tonight's before the next evening's.
  const met = candidates.filter((w, i) => metSet.has(w) && candidates.indexOf(w) === i);
  const own = ownRows.map((r) => r.lexeme?.lemma).filter((l): l is string => !!l);
  return scopeSoFar(programme, day, ticked, met, own);
});

type SearchParams = Record<string, string | string[] | undefined> | undefined;

/**
 * WHAT A PRACTICE ROUND MAY DRAW ON, WHEREVER IT WAS OPENED FROM.
 *
 * A round opened from a step of the module reads the step's own address, as
 * it always has (`moduleScopeFrom`). A round somebody walked to reads where
 * the module has actually taken them, so far (`learnerScopeSoFar`): Practice
 * and the module are one course, and a round that drilled a case nobody had
 * read or a word nobody had met because it was opened from a menu rather than
 * a list was the app contradicting its own evening. Null, and so exactly the
 * round it always was, for a learner who is not following the module.
 */
export async function practiceScope(
  ownerId: string, searchParams: SearchParams,
): Promise<ModuleScope | null> {
  return moduleScopeFrom(searchParams) ?? learnerScopeSoFar(ownerId);
}

/**
 * WHAT THE EVENINGS HAD TAUGHT WHEN THIS LEARNER'S DAY BEGAN, FOR A PUZZLE.
 *
 * Sõnad and the crossword are the two rounds the server builds again to mark,
 * from the day alone, so what they are built from has to be fixed for the
 * whole day: a word met at eight in the evening cannot change the grid a
 * learner has been filling since lunch. Their answers came off the dictionary
 * at the learner's band, which handed somebody three evenings into A1 a
 * six-letter word to deduce out of a language they had eleven words of.
 *
 * So a learner following the module is given the words the course had taught
 * by the start of their day, read off ticks written before it, which nothing
 * can add to afterwards. Somebody whose first tick is today has been taught
 * nothing yet as the day began and gets an empty list rather than the
 * dictionary. Null is a learner the module has never held, read the way
 * `moduleReached` reads it, and their puzzle is exactly what it was.
 *
 * NOT "FINISHED FIRST RUN TODAY", which is what this read first. First run is
 * not the module: somebody can finish it and practise for a week without
 * opening an evening, and holding them to the course took their puzzle away
 * over a screen they never opened. The phone suite's learner was exactly
 * that. The one cost of reading a tick instead is a learner who opens the
 * board before their very first tick and hands it in after: the marking then
 * finds no puzzle and grades nothing, which is the safe way round.
 */
export const taughtAtDayStart = cache(async (ownerId: string, day: DayKey): Promise<readonly string[] | null> => {
  const [programme, clock] = await Promise.all([programmeFor(ownerId), learnerDayClock(ownerId)]);
  if (!programme) return null;
  const began = startOfKey(clock, day);
  const rows = await prisma.courseStep.findMany({
    where: { ownerId, programmeId: programme.id },
    distinct: ["dayId"],
    select: { dayId: true, createdAt: true },
    orderBy: [{ dayId: "asc" }, { createdAt: "asc" }],
  });
  if (rows.length === 0) return null;
  const before = rows.filter((r) => r.createdAt < began);
  if (before.length === 0) return [];
  return taughtThrough(programme, dayReached(programme, new Set(before.map((r) => r.dayId))).index);
});
