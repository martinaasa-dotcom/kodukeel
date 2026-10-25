import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { EkilexSection, ImpactRows, impactWords } from "@/components/ImpactFigures";
import { fillNodes } from "@/components/reference/fillNodes";
import { rich } from "@/components/Rich";
import { SYLLABUS } from "@/lib/collections/syllabus";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { PITCH } from "@/lib/copy/pitch";
import { PUBLIC_CARDS, publicCard } from "@/lib/copy/publicCards";
import { localeHref } from "@/lib/copy/publicLocale";
import { LESSONS, LESSON_PARTS } from "@/lib/course/lessons";
import { alignCourse, courseMadeOf, lessonLevels } from "@/lib/curriculum/align";
import { ekilexImpact } from "@/lib/dict/ekilexCount";
import { DEFAULT_SHAPE } from "@/lib/funding/facts";
import { floorUsd, retrenchment } from "@/lib/funding/sustainability";
import { CC_BY_DEED, EKILEX_CREDIT, EKILEX_INSTITUTE } from "@/lib/legal/ekilexCredit";
import { demoUrl } from "@/lib/legal/demo";
import { resolveOperator } from "@/lib/legal/operator";
import { IMPACT_WINDOW_DAYS } from "@/lib/progress/impact";
import { heldImpact } from "@/lib/progress/impactListed";
import { publicPageTitle, resolvePublicPage, type PublicSearch } from "@/lib/progress/publicLocale";
import { impactListable } from "@/lib/research/impact";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicPageTitle(searchParams, "For partners and funders", undefined, publicCard("/partners"));
}

/*
  Every figure on it is this deployment's own, read when the page is asked for:
  the learners' figures, what was asked of Ekilex, the demo address and who runs
  it. A page baked at build time would publish the build machine's.
*/
export const dynamic = "force-dynamic";

const REPO = "https://github.com/martinaasa-dotcom/kodukeel/blob/main";

/**
 * THE ONE PAGE A REVIEWER IS SENT TO (docs/44-sixth-batch.md, S-7).
 *
 * A reviewer at the Institute of the Estonian Language or at a ministry gives
 * a link about ten minutes, and the answers they want were spread over seven
 * pages, none of which said it was the place to start. This is that place, in
 * eight sections in the order a reviewer asks: what it is, the demo, what this
 * installation has done, what the course covers, how it uses Ekilex, what it
 * costs, how it is checked, and who runs it.
 *
 * NOTHING HERE IS TYPED TWICE. Every figure and every sentence about one is
 * read through the function the page it comes from uses: the landing page's
 * own sentence (`PITCH`), `heldImpact` and `impactWords` with /impact's own
 * empty states, `courseMadeOf` and `alignCourse` as /curriculum counts the
 * course, `EkilexSection` and the credit the dictionary draws, `retrenchment`
 * and `floorUsd` as /funding prices it, the cards the checking pages share
 * themselves with, and `resolveOperator`. `lib/legal/partners.test.ts` holds
 * the calls, so a figure typed in by hand fails before it can disagree with
 * its page.
 *
 * Drawn in every public language through `resolvePublicPage`, like every
 * other page built with `Legal`, so a fourth one arrives here the way it
 * arrives on the rest. Pages it links to that are English only say so in the
 * link, in the other languages.
 */
export default async function PartnersPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicPage(searchParams);
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  const link = (to: string, label: string) => (
    <Link href={href(to)} className="underline underline-offset-2">{t(label)}</Link>
  );

  const operator = resolveOperator();
  const demo = demoUrl();
  const [impact, ekilex] = await Promise.all([heldImpact(), ekilexImpact(IMPACT_WINDOW_DAYS)]);
  const { headcount, quantity } = impactWords(locale);

  const made = courseMadeOf(SYLLABUS, LESSONS);
  const taught = lessonLevels(LESSONS);
  const levels = alignCourse(SYLLABUS.filter((u) => !taught.has(u.level)), () => undefined);

  const funded = retrenchment(DEFAULT_SHAPE)[0];
  const floor = floorUsd(DEFAULT_SHAPE);

  return (
    <Legal title={t("For partners and funders")} updated="24 October 2026" locale={locale} explicit={explicit} path="/partners">
      <P>
        {t("The place to start if you are deciding whether to support Kodukeel. Each section says what holds, read from this installation when you open the page, and links to the page that says more.")}
      </P>

      <S id="what" title={t("What Kodukeel is")}>
        <P>{t(PITCH.promise)}</P>
        <P>{t("It is for adults who live in Estonia and read English, Russian or Ukrainian, and the app is written in all three.")}</P>
      </S>

      {demo && (
        <S id="demo" title={t("Try it")}>
          <P>
            {rich(t("A shared demo with two months of made-up history behind it, wiped every night, at {demo}. Nothing needs signing up for, and it costs nobody anything."), {
              demo: <a href={demo} className="underline underline-offset-2" rel="noreferrer">{demo.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>,
            })}
          </P>
        </S>
      )}

      <S id="done" title={t("What this installation has done")}>
        {!impact ? (
          <P>{t("The figures could not be read just now. Try again in a few minutes.")}</P>
        ) : (
          <>
            {!impactListable(impact) && (
              <P>{t("The figures appear here once enough people use the app to publish them safely.")}</P>
            )}
            {!impact.anyActivity ? (
              <P>{t("Nobody has answered a card on this installation yet, so there is nothing to show.")}</P>
            ) : (
              <ImpactRows rows={[
                [fill(t("Learning in the last {days}"), { days: countOf(locale, impact.windowDays, "day") }), headcount(impact.activeLearners)],
                [t("Reached since the start"), headcount(impact.learnersReached)],
                [t("Answers given"), quantity(impact.reviewsAnswered, "answer")],
                [t("Conversations reported"), quantity(impact.conversationsReported, "conversation")],
              ]} />
            )}
          </>
        )}
        <P>
          {rich(t("Every figure, and the rules that keep each one from identifying anybody, are on {impact}."), {
            impact: link("/impact", "what this installation has done"),
          })}
        </P>
      </S>

      <S id="course" title={t("The course")}>
        <P>
          {fill(t("The levels up to {through} are {lessons}. They come in {parts}, and every part ends in a check of what its lessons taught. The levels above are {units} until each of them becomes lessons too."), {
            through: made.through,
            lessons: countOf(locale, made.lessons, "lesson"),
            parts: countOf(locale, LESSON_PARTS.length, "part"),
            units: countOf(locale, made.units, "unit"),
          })}
        </P>
        <ImpactRows rows={levels.map((level) => [level.level, countOf(locale, level.units.length, "unit")] as const)} />
        <P>
          {rich(t("What each lesson and unit says a learner can do, and which part of the state examination it prepares for, is on {curriculum}."), {
            curriculum: link("/curriculum", "what the course covers"),
          })}
        </P>
      </S>

      <S id="ekilex" title={t("How it uses Ekilex")}>
        <P>{t("Every dictionary entry that Ekilex supplied carries this credit:")}</P>
        <p className="border-l-2 pl-4 text-base leading-relaxed" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>
          {fillNodes(t(EKILEX_CREDIT), {
            source: <a href="https://ekilex.ee" className="underline underline-offset-2" rel="noreferrer">Ekilex</a>,
            institute: t(EKILEX_INSTITUTE),
            license: <a href={CC_BY_DEED} className="underline underline-offset-2" rel="noreferrer license">CC BY 4.0</a>,
          })}
        </p>
        <P>
          {rich(t("What the app takes from Ekilex, how it asks, and what it gives back is written up for the Institute in {brief}, in English and in Estonian."), {
            brief: <a href={`${REPO}/docs/45-ekilex.md`} className="underline underline-offset-2" rel="noreferrer">{t("a brief for the Institute")}</a>,
          })}
        </P>
      </S>
      <EkilexSection ekilex={ekilex} locale={locale} />

      <S id="cost" title={t("What it costs")}>
        {funded && (
          <P>
            {fill(t("With somebody paid to work on it, at the size the funding page starts from ({learners}), it costs about ${usd} a month. With nobody paid, a server and a database keep it teaching for ${floor} a month."), {
              learners: countOf(locale, DEFAULT_SHAPE.learners, "learner"),
              usd: funded.usd.toFixed(0),
              floor: floor.toFixed(0),
            })}
          </P>
        )}
        <P>
          {rich(t("Every line of the bill, where each price comes from, and what goes first if the money stops, are on {funding}."), {
            funding: link("/funding", "the funding page"),
          })}
        </P>
      </S>

      <S id="checked" title={t("How it is checked")}>
        <ul className="space-y-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>{link("/how-we-know", "How we know")}: {t(PUBLIC_CARDS["/how-we-know"])}</li>
          <li>{link("/accessibility", "Accessibility")}: {t(PUBLIC_CARDS["/accessibility"])}</li>
          <li>{link("/trust", "Trust and security")}: {t(PUBLIC_CARDS["/trust"])}</li>
          <li>
            <a href="/.well-known/security.txt" className="underline underline-offset-2">security.txt</a>:{" "}
            {t("Where to report a security problem, in the standard form a researcher looks for first.")}
          </li>
        </ul>
      </S>

      <S id="who" title={t("Who runs it")}>
        {operator.identified ? (
          <div data-operator="named" className="space-y-3">
            <P>
              {rich(t("This installation is run by **{name}**{registry}, at {address}. Write to {email}, and a person reads it."), {
                name: operator.name,
                registry: operator.registryCode ? `, ${fill(t("registry code {code}"), { code: operator.registryCode })}` : "",
                address: operator.address,
                email: <a href={`mailto:${operator.email}`} className="underline underline-offset-2">{operator.email}</a>,
              })}
            </P>
          </div>
        ) : (
          <div data-operator="unset" className="space-y-3">
            <P>
              {rich(t("**Whoever runs this installation has not filled their name in**, so there is nobody named here to write to. If you are running it, set `OPERATOR_NAME`, `OPERATOR_ADDRESS` and `OPERATOR_EMAIL`."))}
            </P>
          </div>
        )}
      </S>
    </Legal>
  );
}
