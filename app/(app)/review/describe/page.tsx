import { requireUserId } from "@/lib/auth/session";
import { PICTURES, roundSize } from "@/lib/collections/pictures";
import { shuffle } from "@/lib/random/shuffle";
import { courseLevelFor } from "@/lib/progress/level";
import { practiceScope } from "@/lib/progress/moduleScope";
import { resolveProviders } from "@/lib/tutor/provider";
import { DescribeSession, type PicturePrompt } from "./DescribeSession";
import { BeforeYouStart } from "@/components/round/Briefing";

export const metadata = { title: "Say what you see" };

export const dynamic = "force-dynamic";

/**
 * SAY WHAT YOU SEE: A SCENE MADE OF EMOJI, AND FIVE SENTENCES ABOUT IT.
 *
 * This is the writing part of the state examination in miniature: look at a
 * picture, write what you see and what might be going on. The examination
 * uses drawings; this app has no artist yet, so the scenes are laid out in
 * emoji, which are characters drawn by the reader's own font (see
 * `lib/collections/pictures.ts`, which is also where the twelve are and why
 * there are twelve and not an endless supply).
 *
 * TWO OR THREE PICTURES A ROUND, because five sentences is the tiring part,
 * and the same picture coming up again is fine: there are always more
 * sentences to write about it.
 *
 * THE LEARNER'S WORDS ORDER THE DRAW AND NEVER FILTER IT. A learner following
 * the course is dealt first the pictures made of words they have been taught,
 * so they can name what they see, and a picture of words they have not met is
 * still a picture they can write about and learn the words from afterwards:
 * an empty round for somebody three evenings in would be worse than a hard
 * one. It is the rule `aroundFirst` states for a pool a learner already owns.
 */
export default async function DescribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const query = await searchParams;
  const [level, scope] = await Promise.all([courseLevelFor(ownerId), practiceScope(ownerId, query)]);
  const taught = new Set(scope?.lemmas ?? []);

  const ranked = shuffle([...PICTURES])
    .map((picture) => ({ picture, known: picture.things.filter((t) => taught.has(t.lemma)).length }))
    // `sort` is stable, so the shuffle survives inside each group of equals.
    .sort((a, b) => b.known - a.known)
    .slice(0, roundSize(level))
    .map(({ picture }) => picture);

  const prompts: PicturePrompt[] = ranked.map((picture) => ({
    pictureId: picture.id,
    title: picture.title,
    rows: [...picture.rows],
    alt: picture.alt,
    example: picture.example,
  }));

  return (
    <BeforeYouStart id="describe" ready={prompts.length > 0} count={{ n: prompts.length, noun: "picture" }}>
      <DescribeSession prompts={prompts} aiAvailable={resolveProviders({ purpose: "grader" }).length > 0} />
    </BeforeYouStart>
  );
}
