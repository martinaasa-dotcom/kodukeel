import { titleFor } from "@/lib/progress/locale";
import { requireUserId } from "@/lib/auth/session";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { buildWordplay } from "@/lib/games/wordplay";
import { BeforeYouStart } from "@/components/round/Briefing";
import { WordplaySession } from "./WordplaySession";

export async function generateMetadata() {
  return titleFor("Sõnamäng");
}

export const dynamic = "force-dynamic";

/**
 * SÕNAMÄNG: WORDS THAT ARE FUNNY ON PURPOSE.
 *
 * A turtle is a shield frog, a bat is a leather mouse, and `pea` is a head.
 * See `lib/games/wordplay.ts` for the three steps and `lib/estonian/literally.ts`
 * for why nothing in them is written. This page is the plain part: it works out
 * the learner's day and hands the sitting down.
 *
 * A NEW ROUND IS THE NEXT FIVE. "Another round" is `AnotherRound`, which names
 * a new `round`, and `BeforeYouStart` draws the session through `FreshRound`,
 * keyed on it (`lib/ux/again.ts`). The sitting is a pure function of the day
 * and that number, so nothing is stored and a reload deals the same words.
 *
 * NOTHING IS GRADED. A compound read for fun is not a card, so there is no
 * review to write and no schedule to move, which is the standing Väljendid has.
 */
export default async function WordplayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const [params, clock] = await Promise.all([searchParams, learnerDayClock(ownerId)]);
  const raw = typeof params.round === "string" ? params.round : "";
  const round = /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
  const plan = buildWordplay(clock.dayKey(), round);

  return (
    <BeforeYouStart id="wordplay" ready={plan !== null} count={plan ? { n: plan.apart.length, noun: "word" } : null}>
      <WordplaySession plan={plan} />
    </BeforeYouStart>
  );
}
