import { glossLanguageFrom } from "@/lib/collections/glossLanguage";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { learnBatch, learnCounts, type LearnKind } from "@/lib/progress/learn";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { learnerModuleScope, moduleSpellings } from "@/lib/progress/moduleScope";
import { LearnSession } from "./LearnSession";
import { firstParam, firstParams } from "@/lib/ux/queryParam";

export const dynamic = "force-dynamic";

function kindFrom(raw: string | undefined): LearnKind {
  return raw === "phrase" ? "phrase" : "word";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ kind?: string | string[] }> }) {
  const { kind } = firstParams(await searchParams);
  return { title: kindFrom(kind) === "phrase" ? "Learn phrases" : "Learn new words" };
}

/**
 * A round of the Learn ladder.
 *
 * Five words, read once, and everything the session needs to ask them assembled
 * here rather than in the browser: the sentence out of a column that holds up
 * to eight of them, the gap made from that sentence, and the four options
 * ranked against the whole dictionary. See `lib/progress/learn.ts`.
 *
 * A static segment under `/learn`, so the course path stays where every unit
 * link and every bookmark already points. Next resolves a static segment ahead
 * of the `[unitId]` beside it, and no unit in the syllabus is called `new`.
 *
 * `?kind=phrase` is the same round over the fixed phrases (`Tere!`, `Kuidas
 * läheb?`) instead of single words. It is a search param rather than a second
 * route because it changes which pool a round draws from and nothing about
 * the shape of the round: `lib/progress/learn.ts` is what actually keeps the
 * two apart, so a round of "words" never hands somebody a whole sentence
 * badged as one.
 */
export default async function LearnNewPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const ownerId = await requireUserId();
  const kind = kindFrom(firstParam((await searchParams).kind));

  /*
    Which language a first meeting gives the meaning in, beside the level and
    the counts rather than in front of them: none of the four needs another's
    answer, and on a hosted database each `await` in a row is a round trip.
  */
  /*
    AND THE DAILY ROW IN THE RAIL IS THIS SCREEN, so it is held to the module
    the same way the review queue's trickle is.

    This round answers "teach me something next" off the whole deck, and first
    run builds a starter deck of three units, so a learner on the second
    evening of A1 could be handed a word from the third. `learnerModuleScope`
    is where the module has actually taken them; null is somebody not following
    one, and then nothing here binds and the round is exactly what it was.

    THE SENTENCE IS HELD AS THE UNIT LESSON HOLDS IT, not as the module does.
    A learner pressed this, so `heldToTaughtWords` reads it as a screen they
    walked to: the gap rung is held at A1, where a lexicographer's sentence is
    one a beginner cannot read through, and above A1 nothing changes, since
    meeting an unfamiliar word inside a sentence is how reading grows.
  */
  const [settings, level, taught] = await Promise.all([
    readSettings(ownerId, [SETTING_KEYS.glossLanguage]),
    courseLevelFor(ownerId),
    learnerModuleScope(ownerId),
  ]);
  const within = taught?.lemmas ?? null;
  const [counts, spellings] = await Promise.all([
    learnCounts(ownerId, undefined, within),
    moduleSpellings(taught),
  ]);

  const words = await learnBatch(
    ownerId, level, glossLanguageFrom(settings[SETTING_KEYS.glossLanguage]), undefined,
    {
      kind,
      within,
      // Only where the module has said something: `readableFor` fails closed on
      // a null set, so handing it one for a learner who follows no module would
      // take every gap off the A1 ladder.
      ...(taught ? { taughtWords: spellings, sentenceReader: "lesson" as const } : {}),
    },
  );

  const { waiting, started } = kind === "phrase" ? counts.phrases : counts;
  return <LearnSession words={words} waiting={waiting} started={started} kind={kind} />;
}
