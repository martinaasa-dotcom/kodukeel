import { requireUserId } from "@/lib/auth/session";
import { localeFor, roundTitleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { mapRound } from "@/lib/progress/map";
import { practiceScope } from "@/lib/progress/moduleScope";
import { offered } from "@/lib/tutor/provider";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { BeforeYouStart } from "@/components/round/Briefing";
import { MapSession } from "./MapSession";
import { roundPageTitle } from "@/lib/ux/roundNames";

export async function generateMetadata() {
  return roundTitleFor("/review/map");
}

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
  const [questions, locale] = await Promise.all([
    practiceScope(ownerId, await searchParams).then((scope) => mapRound(ownerId, scope)),
    localeFor(ownerId),
  ]);

  if (questions.length === 0) {
    return (
      <Page {...roundPageTitle("/review/map", (english) => tr(locale, english))} lead={tr(locale, "See what an ending means, then pick it.")}>
        <Empty
          title={tr(locale, "Nothing to map yet")}
          body={tr(locale, "It needs nouns with a recorded sentence at your level.")}
          action={<ButtonLink href="/learn" variant="primary">{tr(locale, "Open the course")}</ButtonLink>}
        />
      </Page>
    );
  }

  return (
    <BeforeYouStart id="map" count={{ n: questions.length, noun: "word" }}>
      <MapSession questions={questions} canTranslate={offered("translate")} />
    </BeforeYouStart>
  );
}
