import { titleFor } from "@/lib/progress/locale";
import { requireUserId } from "@/lib/auth/session";
import { practiceScope } from "@/lib/progress/moduleScope";
import { twinsRound } from "@/lib/progress/twins";
import { resolveProvider } from "@/lib/tutor/provider";
import { BeforeYouStart } from "@/components/round/Briefing";
import { TwinsSession } from "./TwinsSession";

export async function generateMetadata() {
  return titleFor("Kaksikud");
}

export const dynamic = "force-dynamic";

/**
 * KAKSIKUD: WORDS THAT LOOK ALIKE AND ARE NOT THE SAME WORD.
 *
 * `lib/collections/twins.ts` is the table of pairs and why there are three
 * kinds of them; `lib/progress/twins.ts` decides which a round draws on;
 * `lib/progress/twinQuestions.ts` builds each question out of a recorded
 * sentence. Grades through `gradeCard` like every other mode (ADR-016).
 *
 * `?group=` drills one group, which is what the grammar page and the review
 * card's note about a mix-up link to.
 *
 * Always renders the session, for the reason the listening page gives: the
 * Server Component refreshes on every grade, and a choice made here between an
 * empty state and the session would swap to the empty state mid-round.
 */
export default async function TwinsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const params = await searchParams;
  const group = typeof params.group === "string" ? params.group : null;
  const { questions, focus } = await twinsRound(ownerId, await practiceScope(ownerId, params), group);

  return (
    <BeforeYouStart id="twins" ready={questions.length > 0} count={{ n: questions.length, noun: "question" }}>
      <TwinsSession
        questions={questions}
        canTranslate={resolveProvider() !== null}
        focusTitle={focus ? focus.words.map((w) => w.lemma).join(", ") : null}
      />
    </BeforeYouStart>
  );
}
