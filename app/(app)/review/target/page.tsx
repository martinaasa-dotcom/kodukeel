import { requireUserId } from "@/lib/auth/session";
import { targetRound } from "@/lib/progress/target";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { TargetSession } from "./TargetSession";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { roundPaceFrom, secondsFor } from "@/lib/ux/roundClock";
import { TARGET_FLOOR_S, TARGET_START_S, TARGET_TICK_S } from "@/lib/games/targetClock";
import { moduleScopeFrom } from "@/lib/course/scope";

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
  const questions = await targetRound(ownerId, moduleScopeFrom(await searchParams));

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
    How long a shot runs, from the learner's own pace, on the server. Target is
    the third round with a clock and the last to read this setting: its eight
    seconds and its floor of three and a half were constants in the session,
    so a learner who reads slowly or answers by keyboard with one hand met
    the same clock whatever they had asked Settings for (WCAG 2.2.1).
  */
  const settings = await readSettings(ownerId, [SETTING_KEYS.roundPace]);
  const pace = roundPaceFrom(settings[SETTING_KEYS.roundPace]);
  const startSeconds = secondsFor(TARGET_START_S, pace, TARGET_TICK_S);
  const floorSeconds = secondsFor(TARGET_FLOOR_S, pace, TARGET_TICK_S);

  return <TargetSession questions={questions} startSeconds={startSeconds} floorSeconds={floorSeconds} />;
}
