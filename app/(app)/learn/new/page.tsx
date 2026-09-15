import { glossLanguageFrom } from "@/lib/collections/glossLanguage";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { learnBatch, learnCounts, type LearnKind } from "@/lib/progress/learn";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { LearnSession } from "./LearnSession";

export const dynamic = "force-dynamic";

function kindFrom(raw: string | undefined): LearnKind {
  return raw === "phrase" ? "phrase" : "word";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
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
  searchParams: Promise<{ kind?: string }>;
}) {
  const ownerId = await requireUserId();
  const kind = kindFrom((await searchParams).kind);

  /*
    Which language a first meeting gives the meaning in, beside the level and
    the counts rather than in front of them: none of the four needs another's
    answer, and on a hosted database each `await` in a row is a round trip.
  */
  const [settings, level, counts] = await Promise.all([
    readSettings(ownerId, [SETTING_KEYS.glossLanguage]),
    courseLevelFor(ownerId),
    learnCounts(ownerId),
  ]);

  const words = await learnBatch(
    ownerId, level, glossLanguageFrom(settings[SETTING_KEYS.glossLanguage]), undefined, kind,
  );

  const { waiting, started } = kind === "phrase" ? counts.phrases : counts;
  return <LearnSession words={words} waiting={waiting} started={started} kind={kind} />;
}
