import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { meaningPrefsFor } from "@/lib/progress/meaningPrefs";
import { meaningShown } from "@/lib/collections/glossLanguage";
import { tr } from "@/lib/copy/locale";
import { courseLevelFor } from "@/lib/progress/level";
import { practiceScope } from "@/lib/progress/moduleScope";
import { starredAmong } from "@/lib/progress/stars";
import { twentyRound } from "@/lib/progress/twenty";
import { forPool, learnedWords } from "@/lib/progress/twentyLearned";
import { topicFrom } from "@/lib/games/twenty";
import { numberSetting, readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { firstParams } from "@/lib/ux/queryParam";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { BeforeYouStart } from "@/components/round/Briefing";
import { TwentySession } from "./TwentySession";

export async function generateMetadata() {
  return titleFor("Kakskümmend küsimust");
}

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
  const topic = topicFrom(params.topic);
  const [level, scope, locale, prefs, bestRow] = await Promise.all([
    courseLevelFor(ownerId), practiceScope(ownerId, query), localeFor(ownerId), meaningPrefsFor(ownerId),
    readSetting(ownerId, SETTING_KEYS.twentyBest),
  ]);

  const round = await twentyRound({
    level,
    taught: new Set(scope?.lemmas ?? []),
    not: params.not ?? null,
    kinds: topic.kinds,
  });

  if (!round) {
    return (
      <Page title="Kakskümmend küsimust" lead={tr(locale, "Twenty questions, in Estonian.")}>
        <Empty
          title={tr(locale, "Nothing to think of yet")}
          body={tr(locale, "The dictionary holds none of the words this game uses.")}
          action={<ButtonLink href="/practice" variant="primary">{tr(locale, "Back to Practice")}</ButtonLink>}
        />
      </Page>
    );
  }

  // What earlier rounds' "Ei tea" taught the game, for everybody, trimmed to this round's things.
  const [starred, learned] = await Promise.all([
    starredAmong(ownerId, [round.lexemeId]),
    learnedWords().catch(() => []),
  ]);

  return (
    <BeforeYouStart id="twenty">
      <TwentySession
        // A new thing is a new round, so the session starts from nothing rather than from the last word's turns.
        key={round.secret.lemma}
        secret={round.secret}
        lexemeId={round.lexemeId}
        meaning={meaningShown(round.gloss, round.secretEquivalents, prefs)}
        glosses={round.glosses}
        equivalents={round.equivalents}
        index={round.index}
        extra={round.extra}
        pool={round.pool}
        starred={starred.has(round.lexemeId)}
        topic={topic.id}
        best={numberSetting(bestRow, 0) || null}
        learned={forPool(learned, round.pool)}
      />
    </BeforeYouStart>
  );
}
