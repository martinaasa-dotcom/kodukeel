import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { openersReadingFor, openerWords } from "@/lib/progress/openers";
import { starredAmong } from "@/lib/progress/stars";
import { buildRound, MIXED_STAGE, STAGES } from "@/lib/estonian/openers";
import { shuffle } from "@/lib/random/shuffle";
import { firstParams } from "@/lib/ux/queryParam";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { BeforeYouStart } from "@/components/round/Briefing";
import { OpenersSession } from "./OpenersSession";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return titleFor("Lause algus");
}

export const dynamic = "force-dynamic";

/**
 * The openers: how the first words of a sentence decide the form of its last.
 *
 * WHICH LEVEL SEES WHAT. A2 picks between two forms and meets the first two
 * stages, which is enough to feel the idea. From B1 the same stages are typed
 * and the four after them open. Below A2 there is nothing yet, because the
 * openers are first-month phrases and the round assumes the plain and the
 * "some of it" forms of a noun have been met.
 *
 * WHICH STAGE. The highest one the learner's own answers have opened
 * (`readOpeners`), or any open one they ask for with `?stage=`, never one
 * they have not reached. Nothing locks: the reading only decides which one the
 * round leads with.
 */
export default async function OpenersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const [level, locale] = await Promise.all([courseLevelFor(ownerId), localeFor(ownerId)]);
  const t = (english: string) => tr(locale, english);
  const params = firstParams(await searchParams);

  const typed = level !== "A2";
  const maxStage = level === "A1" ? 0 : level === "A2" ? 2 : MIXED_STAGE;

  if (maxStage === 0) {
    return (
      <Page title="Lause algus" titleLang="et" lead={t("The start of the sentence picks the ending.")}>
        <Empty
          title={t("This opens at A2")}
          body={t("It leans on the first month of phrases, so it waits until you have them.")}
          action={<ButtonLink href="/practice" variant="primary">{t("Back to Practice")}</ButtonLink>}
        />
      </Page>
    );
  }

  const [reading, words] = await Promise.all([openersReadingFor(ownerId, maxStage), openerWords()]);
  const asked = Number(params.stage);
  const stage = Number.isInteger(asked) && reading.stages.find((s) => s.n === asked)?.open
    ? asked
    : reading.current;

  const questions = buildRound(stage, words, shuffle);
  if (questions.length === 0) {
    return (
      <Page title="Lause algus" titleLang="et" lead={t("The start of the sentence picks the ending.")}>
        <Empty
          title={t("No words to practice with yet")}
          body={t("The dictionary has none of the words this round uses.")}
          action={<ButtonLink href="/dictionary" variant="primary">{t("Open the dictionary")}</ButtonLink>}
        />
      </Page>
    );
  }

  const starred = await starredAmong(ownerId, [...new Set(questions.map((q) => q.lexemeId))]);
  const stageSpec = STAGES.find((s) => s.n === stage);

  return (
    <BeforeYouStart id="openers" count={{ n: questions.length, noun: "sentence" }}>
      <OpenersSession
        questions={questions.map((q) => ({ ...q, starred: starred.has(q.lexemeId) }))}
        mode={typed ? "type" : "pick"}
        stage={{ n: stage, title: stageSpec?.title ?? "", line: stageSpec?.line ?? "" }}
        reading={reading.stages
          .filter((s) => s.open || s.n === reading.current + 1)
          .map((s) => ({ n: s.n, title: s.title, share: s.share, settled: s.settled, open: s.open }))}
      />
    </BeforeYouStart>
  );
}
