import { requireUserId } from "@/lib/auth/session";
import { targetRound } from "@/lib/progress/target";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { TargetSession } from "./TargetSession";
import { moduleScopeFrom } from "@/lib/course/scope";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { multiplierFor, roundPaceFrom } from "@/lib/ux/roundClock";

export const metadata = { title: "Target" };

export const dynamic = "force-dynamic";

/**
 * TARGET: FAST, AND ABOUT ENDINGS RATHER THAN ONLY MEANINGS.
 *
 * The aim-and-hit round. A prompt at the top, four targets, hit the right one
 * before the clock runs out, and the round gets harder as it goes.
 *
 * Two thirds of the questions are about a case ending rather than a meaning,
 * and that is what makes it worth building rather than a fourth vocabulary
 * quiz. `lib/progress/target.ts` says why, and the short version is that a case
 * question offers four forms of one word, so nothing can be eliminated by
 * meaning and the only way through is to read the ending.
 *
 * Grades through `gradeCard` like every other mode (ADR-016).
 */
export default async function TargetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  // Opened from the module, the targets are taught words in taught cases.
  const [questions, pace] = await Promise.all([
    targetRound(ownerId, moduleScopeFrom(await searchParams)),
    readSetting(ownerId, SETTING_KEYS.roundPace),
  ]);

  if (questions.length === 0) {
    return (
      <Page title="Target" lead="Hit the right form before the clock does.">
        <Empty
          title="Nothing to aim at yet"
          body="This round draws on words already in your deck."
          action={<ButtonLink href="/learn" variant="primary">Open the course</ButtonLink>}
        />
      </Page>
    );
  }

  /*
    Resolved here and handed down as a number, the way the Case Sprint and the
    quest take theirs: the session is a client component and has no settings
    to read, and a round that fetched its own length would start before it
    knew it. See lib/ux/roundClock.ts.
  */
  return <TargetSession questions={questions} multiplier={multiplierFor(roundPaceFrom(pace))} />;
}
