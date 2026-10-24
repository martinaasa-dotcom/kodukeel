import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ENGLISH_AND_ESTONIAN, Legal, P, S } from "@/components/Legal";
import { rich } from "@/components/Rich";
import { resolveOperator } from "@/lib/legal/operator";
import { tr } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { publicPageTitle, resolvePublicPage, type PublicSearch } from "@/lib/progress/publicLocale";
import { publicCard } from "@/lib/copy/publicCards";

// Its own words where it is shared, rather than the landing page's pitch to a
// learner, in the language the page is drawn in.
export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicPageTitle(searchParams, "Running a pilot", undefined, publicCard("/pilots"), ENGLISH_AND_ESTONIAN);
}

/*
  Whether the address at the foot is drawn is a fact about the deployment,
  so a page baked at build time would describe whichever machine ran the build.
*/
export const dynamic = "force-dynamic";

const REPO = "https://github.com/martinaasa-dotcom/kodukeel/blob/main";

/**
 * WHAT A PILOT IS, FOR AN ORGANIZATION DECIDING WHETHER TO RUN ONE.
 *
 * This was `docs/30-pilots.md`, a file in a repository, which is somewhere a
 * school or a company's procurement contact will not look. The page is now the
 * source of the text and the document is a summary pointing here, so it is
 * said once (docs/37-second-batch.md, D4).
 *
 * English and Estonian. It was English only, because a machine translation of
 * a page about what has and has not been verified is where a softened sentence
 * could slip in unread. D16 (docs/44-sixth-batch.md) adds Estonian for a
 * reviewer at the Institute or a ministry, and keeps that guard: the page
 * carries the policy pages' notice, so it says first, in Estonian, that the
 * translation awaits the native speaker and that the English prevails.
 * Russian and Ukrainian are not drawn, and the switch does not offer them.
 *
 * WHAT THIS IS NOT READY FOR STAYS AS LOUD AS THE REST. No SOC 2 report, no
 * external penetration test and no contractual uptime: a reader who catches one
 * overclaim discards the whole page, and `lib/legal/pilots.test.ts` fails if
 * any of the three stops being said. Every figure here is one the repository
 * already states.
 */
export default async function PilotsPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicPage(searchParams, ENGLISH_AND_ESTONIAN);
  const t = (english: string) => tr(locale, english);
  const contact = resolveOperator().email;
  const page = (to: string, label: string) => (
    <Link href={localeHref(to, locale, explicit)} className="underline underline-offset-2">{t(label)}</Link>
  );
  const doc = (path: string, label: string) => (
    <a href={`${REPO}/${path}`} className="underline underline-offset-2" rel="noreferrer">{t(label)}</a>
  );

  return (
    <Legal title={t("Running a pilot")} updated="14 October 2026" locale={locale} explicit={explicit} path="/pilots" drawnIn={ENGLISH_AND_ESTONIAN} legal>
      <P>
        {t("For a company, a school, a ministry or a university deciding whether to put Kodukeel in front of a group of people. It says what a pilot is, what it costs, what is asked of you, what you get back, and what happens to your people’s data.")}
        {/* Only where there is an address to point at: unset, the last section says why there is none. */}
        {contact && " " + t("If something here is not answered, the address at the bottom reaches a person.")}
      </P>

      <S id="honest" title={t("What this cannot offer yet")}>
        <P>
          {t("There is no reference customer to name and no case study to send. This project has been built and measured in public and has not yet been run at scale by anybody else, and a page claiming otherwise would be the first thing a careful reader caught.")}
        </P>
        <P>
          {rich(t("What there is instead is the evidence: the app, its tests, the security review summarized on {trust}, and the data protection impact assessment behind {privacy}. A cost model on {funding} publishes what it costs to run and where every figure came from. A first pilot is a first pilot. It is priced and scoped accordingly."), {
            trust: page("/trust#security", "the trust page"),
            privacy: page("/privacy", "the privacy notice"),
            funding: page("/funding", "the funding page"),
          })}
        </P>
      </S>

      <S id="shapes" title={t("The three shapes a pilot takes")}>
        <Shape title={t("A workplace.")}>
          {t("A group of colleagues learning Estonian, usually because they moved here for the job. The sponsor gets a cohort view that shows effort and a readiness band, never a percentage and never an individual’s answers. That boundary is in the code rather than in a policy: the query behind an employer’s view does not read the column a teacher’s view uses, and the list is ordered by name so it cannot be read as a league table. Enterprise sign-in is available through SAML, so nobody is asked to make another account.")}
        </Shape>
        <Shape title={t("A class.")}>
          {rich(t("A teacher and their pupils. A teacher sees more than an employer, because they have a lesson to plan: effort, the group’s weakest cases, and each pupil’s own weakest case as a rolled-up percentage over enough answers to mean something. Still never a pupil’s deck, their searches or their answer history. The join screen says all of this before anybody joins, and {teachers} shows the roster over an invented class."), {
            teachers: page("/teachers", "the page for teachers"),
          })}
        </Shape>
        <Shape title={t("An institution.")}>
          {rich(t("A ministry, a university department or a language school evaluating whether this is worth supporting or building on. Usually the interesting output is not the learners at all but {research}: which cases and which gradation patterns learners actually get wrong, at a scale no classroom reaches, published under statistical disclosure control and labeled where it is self-reported."), {
            research: doc("docs/19-research-export.md", "the research export"),
          })}
        </Shape>
      </S>

      <S id="cost" title={t("What it costs")}>
        <P>
          {rich(t("Nothing to run a pilot, and that is not an introductory offer. The app is free to use, there is nothing to buy and nothing about anybody is sold. {funding} publishes the whole bill and the arithmetic behind it: the floor is a few hundred dollars a month before a single learner arrives, most of it does not move when they do, and the first thousand people are close to free to serve. A pilot of thirty people costs the operator almost exactly what an empty deployment costs."), {
            funding: page("/funding", "The funding page"),
          })}
        </P>
        <P>
          {t("What a pilot can cost you is time, and it is worth naming: somebody has to introduce it, and somebody has to tell us what went wrong. That second one is the part that is actually valuable.")}
        </P>
      </S>

      <S id="asked" title={t("What is asked of you")}>
        <ol className="list-decimal space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>{rich(t("**A named contact.** One person who can answer a question and pass one on."))}</li>
          <li>{rich(t("**A start date and an end date.** Six to twelve weeks is enough to see whether anybody comes back in the second month, which is the only retention number worth having."))}</li>
          <li>
            {rich(t("**Permission to count, not to watch.** The figures in {impact} are aggregates over people who have not opted out, with floors that suppress a number rather than report a small one. Nobody is asked a question they did not volunteer for and no analytics vendor is involved, because there is not one anywhere in this app."), {
              impact: doc("docs/23-impact.md", "the impact report"),
            })}
          </li>
          <li>{rich(t("**A written result at the end**, including if the answer is that it did not work."))}</li>
        </ol>
      </S>

      <S id="back" title={t("What you get back")}>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>{t("The app, with every part of it switched on, for as long as the pilot runs.")}</li>
          <li>{t("Enterprise sign-in through your own identity provider, where you have one.")}</li>
          <li>{t("A cohort view scoped to what your role is entitled to see.")}</li>
          <li>{t("A written summary at the end: how many people started, how many were still there in the second month, how much study that came to, and how many conversations in Estonian they reported having outside the app. That last one is the number this project says it is measured by, and it is self-reported, and the summary will say so.")}</li>
          <li>{t("Whatever we learned about where the software got in the way.")}</li>
        </ul>
      </S>

      <S id="data" title={t("What happens to your people’s data")}>
        <P>
          {rich(t("The full answer is {privacy} and the {dpia}. These are the parts a sponsor asks about first:"), {
            privacy: page("/privacy", "the privacy notice"),
            dpia: doc("docs/24-dpia.md", "data protection impact assessment"),
          })}
        </P>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>{t("Every learner can take their whole record out in one file at any time, and delete their account from inside the app.")}</li>
          <li>{t("There is no analytics script, no advertising identifier and no third-party tracker on any page.")}</li>
          <li>{t("What a sponsor sees is fixed in code, not in a setting somebody could widen later.")}</li>
          <li>{t("A photograph of a page is read and never stored.")}</li>
          <li>
            {rich(t("The live list of every service this copy talks to is on {trust}, generated from the deployment’s own configuration, and the {register} describes the same list, so the two cannot silently disagree."), {
              trust: page("/trust#data", "the trust page"),
              register: doc("docs/26-subprocessors.md", "subprocessor register"),
            })}
          </li>
          <li>{t("Ending a pilot does not take anybody’s account away. It is their account.")}</li>
        </ul>
      </S>

      <S id="not-ready" title={t("What this is not ready for")}>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }} data-not-ready>
          <li>
            {rich(t("**There is no SOC 2 report and no ISO 27001 certificate.** {controls} is a self-assessment against both, written to be checked rather than believed."), {
              controls: doc("docs/29-controls.md", "The control map"),
            })}
          </li>
          <li>
            {rich(t("**No external penetration test has been carried out.** The threat model and the review are on {trust} and they are our own work."), {
              trust: page("/trust#security", "the trust page"),
            })}
          </li>
          <li>{rich(t("**There is no contractual uptime commitment.** What there is instead is an app that keeps working with no network for the pages a learner has already opened, and holds grades until it can send them."))}</li>
          <li>
            {rich(t("**The accessibility claim is partial conformance, not full**, with the gaps named on {statement} rather than rounded up."), {
              statement: page("/accessibility", "the accessibility statement"),
            })}
          </li>
        </ul>
        <P>
          {t("Any of those can change, and each has a note on what would trigger it. None of them is going to be claimed before it is true.")}
        </P>
      </S>

      <S id="contact" title={t("Getting in touch")}>
        {contact ? (
          <P>
            {rich(t("{email} reaches the operator named on {privacy}, which is the same address a data protection question goes to. There is no separate sales address, because there is nobody in sales."), {
              email: (
                <a href={`mailto:${contact}?subject=${encodeURIComponent(t("A Kodukeel pilot"))}`} className="underline underline-offset-2">
                  {contact}
                </a>
              ),
              privacy: page("/privacy", "the privacy notice"),
            })}
          </P>
        ) : (
          <P>
            {rich(t("Whoever runs this copy of Kodukeel has not named an address yet, so there is nobody on this page to write to. {trust} says what they need to fill in."), {
              trust: page("/trust#who", "The trust page"),
            })}
          </P>
        )}
      </S>
    </Legal>
  );
}

function Shape({ title, children }: { title: string; children: ReactNode }) {
  return (
    <P>
      <strong>{title}</strong> {children}
    </P>
  );
}
