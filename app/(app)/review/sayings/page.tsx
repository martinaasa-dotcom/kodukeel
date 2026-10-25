import { roundTitleFor } from "@/lib/progress/locale";
import { requireUserId } from "@/lib/auth/session";
import { offered } from "@/lib/tutor/provider";
import { sayingsSitting } from "@/lib/progress/sayings";
import { BeforeYouStart } from "@/components/round/Briefing";
import { SayingsSession } from "./SayingsSession";

export async function generateMetadata() {
  return roundTitleFor("/review/sayings");
}

export const dynamic = "force-dynamic";

/**
 * SAYINGS: FIVE VERB PAIRS THAT DO NOT MEAN WHAT THEY SAY.
 *
 * See `lib/games/sayings.ts` for the three steps and `lib/estonian/sayings.ts`
 * for why nothing in them is written. This page is the plain part: it asks
 * which five this learner is dealt and hands the plan down.
 *
 * WHICH FIVE. `lib/games/sayingsDeal.ts` decides, off what this learner has
 * been shown this pass: sayings they have not met, from the front of the list,
 * a different five every time, and nothing seen again until every saying has
 * been. The sittings used to be fixed slices picked by the day or by `?set=`,
 * which dealt the same five together for ever.
 *
 * A NEW SET IS A NEW ROUND. "Another set" is `AnotherRound`, which names a new
 * `round`, and `BeforeYouStart` draws the session through `FreshRound`, keyed
 * on it (`lib/ux/again.ts`). Without both, the press changed the address and
 * left the finished screen exactly where it was.
 *
 * NOTHING IS GRADED. A saying is not a card, so there is no review to write
 * and no schedule to move. What is stored is which sayings were shown, written
 * by the session when it starts rather than here, because a page renders on a
 * hover as well.
 */
export default async function SayingsPage() {
  const ownerId = await requireUserId();
  const plan = await sayingsSitting(ownerId);

  return (
    <BeforeYouStart id="sayings" ready={plan !== null} count={plan ? { n: plan.see.length, noun: "saying" } : null}>
      <SayingsSession plan={plan} canTranslate={offered("translate")} />
    </BeforeYouStart>
  );
}
