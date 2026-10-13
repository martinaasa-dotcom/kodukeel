import { titleFor } from "@/lib/progress/locale";
import { requireUserId } from "@/lib/auth/session";
import { resolveProvider } from "@/lib/tutor/provider";
import { setCount, sayingSet } from "@/lib/estonian/sayings";
import { buildPlan } from "@/lib/games/sayings";
import { playableSayings } from "@/lib/progress/sayings";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { dayIndex } from "@/lib/random/dayHash";
import { rng, seedFrom } from "@/lib/random/seeded";
import { BeforeYouStart } from "@/components/round/Briefing";
import { SayingsSession } from "./SayingsSession";

export async function generateMetadata() {
  return titleFor("Väljendid");
}

export const dynamic = "force-dynamic";

/**
 * SAYINGS: FIVE VERB PAIRS THAT DO NOT MEAN WHAT THEY SAY.
 *
 * See `lib/games/sayings.ts` for the three steps and `lib/estonian/sayings.ts`
 * for why nothing in them is written. This page is the plain part: it picks
 * which sitting, reads the sentences out of the dictionary, shuffles on the
 * server so the board is the same on arrival, and hands the plan down.
 *
 * WHICH SITTING. `?set=` names one, and with nothing asked the day does, by
 * the same walk the word of the day takes (`dayIndex`), so a learner who comes
 * back tomorrow meets the next five rather than the same five. A value that is
 * not a sitting is the day's, which is what a forged address gets.
 *
 * A NEW SET IS A NEW SESSION. "Another set" is a soft navigation to this
 * same route with a different `?set=`, and React keeps a client component's
 * state while its place in the tree holds still: the session holds its plan
 * in `useState` and was sitting on the finished screen, so the press changed
 * the address and nothing on the page. Keyed on the sitting, it remounts with
 * the new plan and starts at the first step, as Openers does with its round.
 *
 * NOTHING IS GRADED OR STORED. A saying is not a card, so there is no review
 * to write and no schedule to move; the round is the sitting. That is a
 * decision rather than a gap: handing sayings to the scheduler means a new
 * kind of card, and the first thing worth knowing is whether the round does
 * its job.
 */
export default async function SayingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const sets = setCount();
  const asked = (await searchParams).set;
  const wanted = typeof asked === "string" && /^\d{1,3}$/.test(asked) ? Number(asked) : NaN;
  const today = (await learnerDayClock(ownerId)).dayKey();
  const n = Number.isInteger(wanted) && wanted >= 0 && wanted < sets
    ? wanted
    : dayIndex(today, "sayings", sets);

  const playable = await playableSayings(sayingSet(n));
  const plan = buildPlan(playable, rng(seedFrom(`${today}:${n}`)));

  return (
    <BeforeYouStart id="sayings" ready={plan !== null} count={plan ? { n: plan.see.length, noun: "saying" } : null}>
      <SayingsSession
        key={n}
        plan={plan}
        nextSet={(n + 1) % sets}
        canTranslate={resolveProvider() !== null}
      />
    </BeforeYouStart>
  );
}
