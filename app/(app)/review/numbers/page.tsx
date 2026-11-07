import { roundTitleFor } from "@/lib/progress/locale";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { practiceScope } from "@/lib/progress/moduleScope";
import { recentLemmas } from "@/lib/course/scope";
import { BeforeYouStart } from "@/components/round/Briefing";
import { CLOCK_LEMMA } from "@/lib/scenes/props";
import { EURO_LEMMA, dealRound, itemKey, numberLemmas, shown, spokenAs } from "@/lib/games/numbers";
import { dealEndings } from "@/lib/games/numberEndings";
import { MODULE_PARAM } from "@/lib/course/focus";
import { NumbersSession, type NumbersItem } from "./NumbersSession";
import { EndingsSession } from "./EndingsSession";
import { NumbersModes } from "./NumbersModes";

export async function generateMetadata() {
  return roundTitleFor("/review/numbers");
}

export const dynamic = "force-dynamic";

/**
 * ARVUD: NUMBERS, CLOCK TIMES AND PRICES, SAID OUT LOUD (docs/41-fifth-batch.md, VB-7).
 *
 * Ten items, dealt by `lib/games/numbers.ts` from the ranges the scene props
 * deal, said into the microphone or typed, in words or in digits. The rules
 * are in that module; this page deals the round, finds the learner's own
 * cards for the number words so a right answer can grade them, and hands the
 * digits TartuNLP is to read for each answer, where its shape was measured
 * reading well (D10).
 *
 * Held to what the evenings have taught (D11): inside the module, and for a
 * learner the module holds, an item is dealt only where every word it is said
 * with has been taught, a clock waits for `kell` and a price for `euro`. A
 * learner with nothing taught yet meets the empty state, which is the round
 * not opening yet rather than a round of nothing.
 *
 * Dealt here rather than in the browser, so the server and the browser draw
 * the same round on arrival (a random draw in render is a hydration error).
 */
export default async function NumbersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const params = await searchParams;
  const scope = await practiceScope(ownerId, params);
  // A step of the module opens the round it dealt and offers no other door (CLAUDE.md, "a step is a room").
  const inModule = typeof params[MODULE_PARAM] === "string";

  /*
    THE SECOND MODE: ONE NUMBER, MANY JOBS (lib/games/numberEndings.ts).
    Its sentences are frames whose every word the forms list holds and its
    numbers are built by a rule checked against the same list (ADR-005
    amendment 8), so it asks nothing a learner has not got the words for
    beyond the numbers themselves. A learner the module still holds below
    the numbers, who has not met them, gets the say-it mode's empty state.
  */
  if (params.mode === "endings" && !inModule) {
    const cards = scope && dealRoundEmpty(scope) ? [] : dealEndings(Math.random);
    return (
      <>
        <NumbersModes active="endings" />
        <BeforeYouStart id="numberEndings" ready={cards.length > 0} count={{ n: cards.length, noun: "question" }}>
          <EndingsSession cards={cards} />
        </BeforeYouStart>
      </>
    );
  }
  const taught = scope ? new Set(scope.lemmas) : null;
  // Inside the module the round leads with today's words, kind by kind, like every round it deals.
  const items = dealRound(Math.random, taught, undefined, scope ? new Set(recentLemmas(scope)) : new Set());

  // Every word this round can be said with, so a right answer finds its card.
  const lemmas = new Set<string>([CLOCK_LEMMA, EURO_LEMMA]);
  for (let n = 0; n <= 100; n += 1) for (const lemma of numberLemmas(n) ?? []) lemmas.add(lemma);
  const cards = items.length === 0 ? [] : await prisma.card.findMany({
    where: { ownerId, cardType: "PRODUCTION", suspended: false, lexeme: { lemma: { in: [...lemmas] } } },
    orderBy: { id: "asc" },
    select: { id: true, lexeme: { select: { lemma: true } } },
  });
  const cardFor: Record<string, string> = {};
  for (const card of cards) {
    const lemma = card.lexeme?.lemma;
    if (lemma && !cardFor[lemma]) cardFor[lemma] = card.id;
  }

  const round: NumbersItem[] = items.map((item) => ({ key: itemKey(item), item, shown: shown(item), spoken: spokenAs(item) }));

  return (
    <>
      {!inModule && <NumbersModes active="say" />}
      <BeforeYouStart id="numbers" ready={round.length > 0} count={{ n: round.length, noun: "question" }}>
        <NumbersSession items={round} cardFor={cardFor} />
      </BeforeYouStart>
    </>
  );
}

/**
 * Whether a learner the module holds has met no number yet, which keeps the
 * endings mode closed for them the way the say-it mode is: a round of number
 * forms for somebody who has not been taught `kaks` asks what was not taught.
 */
function dealRoundEmpty(scope: { lemmas: readonly string[] }): boolean {
  return !scope.lemmas.includes("kaks");
}
