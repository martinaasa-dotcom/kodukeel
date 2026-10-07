import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { guessList, puzzleFor } from "@/lib/progress/sonad";
import { taughtAtDayStart } from "@/lib/progress/moduleScope";
import { SONAD_GUESSES, SONAD_LENGTH } from "@/lib/games/sonad";
import { Empty, Page } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { SonadSession } from "./SonadSession";
import { BeforeYouStart } from "@/components/round/Briefing";

export const metadata = { title: "Sõnad" };

export const dynamic = "force-dynamic";

/**
 * SÕNAD: ONE ESTONIAN WORD A DAY, SIX LETTERS, SIX GUESSES.
 *
 * `lib/games/sonad.ts` holds the rules and the argument about what is anybody
 * else's; `lib/progress/sonad.ts` holds which word today is and which words it
 * will accept. This page is the join, and the two reads it needs are asked at
 * once because neither depends on the other.
 *
 * The word is banded on the learner's level, so the pool follows them up and
 * nobody is asked to deduce a C1 noun in their first week. The guess list is
 * the whole language, because refusing a real Estonian word is the one thing a
 * game like this must never do, and it is handed to the browser rather than
 * checked over the wire: a round trip per guess is a round trip inside the one
 * gesture the game is made of.
 */
export default async function SonadPage() {
  const ownerId = await requireUserId();
  const [level, clock] = await Promise.all([courseLevelFor(ownerId), learnerDayClock(ownerId)]);
  const day = clock.dayKey(new Date());

  const [puzzle, guessable, taught] = await Promise.all([
    puzzleFor(ownerId, day, level),
    guessList(),
    // Memoised: `puzzleFor` asks the same question of the same day.
    taughtAtDayStart(ownerId, day),
  ]);

  return (
    <BeforeYouStart id="sonad" ready={puzzle !== null}>
      <Page
        title="Sõnad"
        lead={`One word a day. ${SONAD_LENGTH} letters, ${SONAD_GUESSES} guesses, ${taught ? "a word you've met" : "at your level"}.`}
      >
        {puzzle ? (
          <SonadSession puzzle={puzzle} day={day} guessable={guessable} />
        ) : (
          /*
            A dictionary with nothing of the right length at this level, which on
            the shipped seed cannot happen and on a deployment seeded before the
            harvest is the ordinary state. Saying which is more use than an empty
            board.
          */
          taught ? (
            /*
              Held to the words the evenings had taught when the day began, and
              none of them is the right length yet. That is a few evenings at
              most, and saying so is the honest answer to an empty board.
            */
            <Empty
              title="Not enough words yet"
              body={`Today's word comes from your evenings, and none of their words has ${SONAD_LENGTH} letters yet.`}
              action={<ButtonLink href="/course">Today&rsquo;s evening</ButtonLink>}
            />
          ) : (
            <Empty
              title="No word for today"
              body={`We couldn't find a ${SONAD_LENGTH}-letter word at your level for today. Try again tomorrow.`}
              action={<ButtonLink href="/dictionary">Look something up</ButtonLink>}
            />
          )
        )}
      </Page>
    </BeforeYouStart>
  );
}
