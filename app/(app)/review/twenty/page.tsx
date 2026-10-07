import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { practiceScope } from "@/lib/progress/moduleScope";
import { starredAmong } from "@/lib/progress/stars";
import { twentyRound } from "@/lib/progress/twenty";
import { firstParams } from "@/lib/ux/queryParam";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { BeforeYouStart } from "@/components/round/Briefing";
import { TwentySession } from "./TwentySession";

export const metadata = { title: "Kakskümmend küsimust" };

export const dynamic = "force-dynamic";

/**
 * TWENTY QUESTIONS, IN ESTONIAN.
 *
 * The page picks the thing and hands the session everything it needs to answer
 * on its own: the thing's facts, and the dictionary's reading of every word the
 * game understands. Answering is a pure function of those (`lib/games/twenty.ts`),
 * so a question costs no request, no model and no allowance, and the round works
 * with the network gone. The thing is in the browser's memory and a learner who
 * looks has spoiled their own round, which is the call Sõnad makes about its
 * word and for the same reason: nothing here is scored.
 *
 * THE LEARNER'S WORDS ORDER THE DRAW AND NEVER FILTER IT, as in Say what you
 * see: a thing the evenings have taught comes first, and a thing they have not
 * is still a fair thing to be thinking of, since the exercise is the question
 * rather than the noun.
 */
export default async function TwentyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const query = await searchParams;
  const params = firstParams(query);
  const [level, scope] = await Promise.all([courseLevelFor(ownerId), practiceScope(ownerId, query)]);

  const round = await twentyRound({
    level,
    taught: new Set(scope?.lemmas ?? []),
    not: params.not ?? null,
  });

  if (!round) {
    return (
      <Page title="Kakskümmend küsimust" lead="Twenty questions, in Estonian.">
        <Empty
          title="Nothing to think of yet"
          body="The dictionary holds none of the words this game uses."
          action={<ButtonLink href="/practice" variant="primary">Back to Practice</ButtonLink>}
        />
      </Page>
    );
  }

  const starred = await starredAmong(ownerId, [round.lexemeId]);

  return (
    <BeforeYouStart id="twenty">
      <TwentySession
        // A new thing is a new round, so the session starts from nothing rather than from the last word's turns.
        key={round.secret.lemma}
        secret={round.secret}
        lexemeId={round.lexemeId}
        gloss={round.gloss}
        glosses={round.glosses}
        index={round.index}
        starred={starred.has(round.lexemeId)}
      />
    </BeforeYouStart>
  );
}
