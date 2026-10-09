import { requireUserId } from "@/lib/auth/session";
import { mapRound } from "@/lib/progress/map";
import { practiceScope } from "@/lib/progress/moduleScope";
import { resolveProvider } from "@/lib/tutor/provider";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { BeforeYouStart } from "@/components/round/Briefing";
import { MapSession } from "./MapSession";

export const metadata = { title: "Map" };

export const dynamic = "force-dynamic";

/**
 * MAP: WHAT AN ENDING MEANS, SHOWN RATHER THAN NAMED.
 *
 * `lib/games/map.ts` says what the round is and why it covers eleven cases and
 * not fourteen; `lib/progress/map.ts` builds the questions and says why a
 * sentence is required. Grades through `gradeCard` like every other mode
 * (ADR-016). Nothing about it is timed.
 */
export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  // A learner following the course is asked what the evenings have taught,
  // whether they came from a step or walked here themselves.
  const questions = await mapRound(ownerId, await practiceScope(ownerId, await searchParams));

  if (questions.length === 0) {
    return (
      <Page title="Map" lead="See what an ending means, then pick it.">
        <Empty
          title="Nothing to map yet"
          body="It needs nouns with a recorded sentence at your level."
          action={<ButtonLink href="/learn" variant="primary">Open the course</ButtonLink>}
        />
      </Page>
    );
  }

  return (
    <BeforeYouStart id="map" count={{ n: questions.length, noun: "word" }}>
      <MapSession questions={questions} canTranslate={resolveProvider() !== null} />
    </BeforeYouStart>
  );
}
