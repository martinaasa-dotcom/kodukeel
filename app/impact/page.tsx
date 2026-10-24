import { Legal, P, S } from "@/components/Legal";
import { EkilexSection, ImpactRows as Rows, impactWords } from "@/components/ImpactFigures";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { publicCard } from "@/lib/copy/publicCards";
import { heldImpact, impactIsListed } from "@/lib/progress/impactListed";
import { ekilexImpact } from "@/lib/dict/ekilexCount";
import { IMPACT_WINDOW_DAYS } from "@/lib/progress/impact";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";
import { MAX_LEARNER_SHARE, MIN_LEARNERS, MIN_REVIEWS } from "@/lib/research/corpus";
import { impactListable, type Impact, type RetentionReading } from "@/lib/research/impact";

/*
  Force-dynamic: every figure is this deployment's own, read when the page is
  asked for, and a page baked at build time would publish the build machine's
  database, which is usually empty.
*/
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  const meta = await publicTitle(searchParams, "What this installation has done", undefined, publicCard("/impact"));
  /*
    Listed nowhere until the headline clears the floors (docs/38-third-batch.md,
    D3), and asked not to be indexed for the same reason: a page that is mostly
    "not enough data yet" is not one to send a stranger to from a search.
  */
  return (await impactIsListed()) ? meta : { ...meta, robots: { index: false, follow: true } };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "15 October 2026", the shape `Legal` translates the month of. */
function spelled(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}

/**
 * WHAT ONE INSTALLATION HAS DONE, IN FIGURES THAT CANNOT IDENTIFY ANYBODY.
 *
 * The page a funder is sent to. Every figure comes out of `summariseImpact`
 * (`lib/research/impact.ts`), which puts each one through the research
 * export's own gate: at least `MIN_LEARNERS` people and `MIN_REVIEWS` records
 * behind it, no one person more than `MAX_LEARNER_SHARE` of it, head counts in
 * bands and counts rounded. A figure that does not clear says why rather than
 * showing a small number. The research opt-out is honored before anything is
 * counted, in `gatherImpact`.
 *
 * Nothing here is collected for this page. Every row it reads is one the app
 * keeps to schedule revision, or one a learner wrote when asked whether they
 * spoke Estonian yesterday.
 */
export default async function ImpactPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicLocale(searchParams);
  const t = (english: string) => tr(locale, english);
  const read = await heldImpact();
  if (!read) {
    return (
      <Legal title={t("What this installation has done")} updated={spelled(new Date().toISOString())} locale={locale} explicit={explicit} path="/impact">
        <P>{t("The figures could not be read just now. Try again in a few minutes.")}</P>
      </Legal>
    );
  }
  const impact: Impact = read;
  const ekilex = await ekilexImpact(IMPACT_WINDOW_DAYS);

  const { headcount, quantity, comingBack } = impactWords(locale);
  const MILESTONE_LABEL: Record<RetentionReading["key"], string> = {
    d1: "Came back the next day",
    d7: "Came back a week later",
    d30: "Came back a month later",
  };

  return (
    <Legal title={t("What this installation has done")} updated={spelled(impact.generatedAt)} locale={locale} explicit={explicit} path="/impact">
      <P>
        {t("These figures come from this installation’s own review log, and from what learners said about Estonian they spoke outside the app. None of them can identify anybody.")}
      </P>
      {!impactListable(impact) && (
        <P>{t("The figures appear here once enough people use the app to publish them safely.")}</P>
      )}
      {!impact.anyActivity ? (
        <P>{t("Nobody has answered a card on this installation yet, so there is nothing to show.")}</P>
      ) : (
        <>
          <S title={t("Who has used it")}>
            <Rows rows={[
              [fill(t("Learning in the last {days}"), { days: countOf(locale, impact.windowDays, "day") }), headcount(impact.activeLearners)],
              [t("Reached since the start"), headcount(impact.learnersReached)],
            ]} />
          </S>
          <S title={t("What they studied")}>
            <Rows rows={[
              [t("Answers given"), quantity(impact.reviewsAnswered, "answer")],
              [t("Time spent studying, counted as whole sittings"), quantity(impact.studyTime, "hour")],
              [t("Words the review schedule now treats as known"), quantity(impact.wordsLearned, "word")],
            ]} />
          </S>
          <S title={t("Coming back")}>
            <Rows rows={impact.retention.map((reading) => [t(MILESTONE_LABEL[reading.key]), comingBack(reading)] as const)} />
          </S>
          <S title={t("Estonian spoken outside the app")}>
            <P>{t("This is the number the app says it is measured by, and it is what learners told us rather than anything we watched.")}</P>
            <Rows rows={[
              [t("Conversations reported"), quantity(impact.conversationsReported, "conversation")],
              [t("People who reported at least one"), headcount(impact.learnersWithConversation)],
            ]} />
          </S>
        </>
      )}
      <EkilexSection ekilex={ekilex} locale={locale} />
      <S title={t("How to read it")}>
        <P>
          {fill(t("Every figure rests on at least {people} and {records}, and no one person is more than {pct}% of any of them. Anything under that says so instead of showing a small number."), {
            people: countOf(locale, MIN_LEARNERS, "person"),
            records: fill(t("{n} records"), { n: MIN_REVIEWS }),
            pct: Math.round(MAX_LEARNER_SHARE * 100),
          })}
        </P>
        <P>{t("People are counted in bands and other counts are rounded, so two readings of this page cannot be compared to work out who arrived in between.")}</P>
        <P>
          {t("Nothing was collected to make this page. There is no analytics service and no tracker: every figure comes from rows the app keeps to schedule revision, and anybody can keep their own rows out of it in Settings.")}
        </P>
      </S>
    </Legal>
  );
}
