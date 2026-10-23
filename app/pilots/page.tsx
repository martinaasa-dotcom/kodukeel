import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { resolveOperator } from "@/lib/legal/operator";
import { shareCard } from "@/lib/progress/publicLocale";
import { PUBLIC_CARDS } from "@/lib/copy/publicCards";

// Its own words where it is shared, rather than the landing page's pitch to a
// learner, and English only, since the page is.
export const metadata = { title: "Running a pilot", ...shareCard("en", "Running a pilot", PUBLIC_CARDS["/pilots"], "/pilots") };

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
 * English only, by that same decision: it is read by somebody writing a
 * proposal or a procurement note, and a machine translation of a page about
 * what has and has not been verified would be the one place on the site where
 * a softened sentence could slip in unread. The language switcher is left off
 * for that reason, rather than offering two languages that would show English.
 *
 * WHAT THIS IS NOT READY FOR STAYS AS LOUD AS THE REST. No SOC 2 report, no
 * external penetration test and no contractual uptime: a reader who catches one
 * overclaim discards the whole page, and `lib/legal/pilots.test.ts` fails if
 * any of the three stops being said. Every figure here is one the repository
 * already states.
 */
export default function PilotsPage() {
  const contact = resolveOperator().email;
  const page = (to: string, label: string) => (
    <Link href={to} className="underline underline-offset-2">{label}</Link>
  );
  const doc = (path: string, label: string) => (
    <a href={`${REPO}/${path}`} className="underline underline-offset-2" rel="noreferrer">{label}</a>
  );

  return (
    <Legal title="Running a pilot" updated="14 October 2026" path="/pilots" oneLanguage>
      <P>
        For a company, a school, a ministry or a university deciding whether to put Kodukeel in front of
        a group of people. It says what a pilot is, what it costs, what is asked of you, what you get
        back, and what happens to your people’s data.
        {/* Only where there is an address to point at: unset, the last section says why there is none. */}
        {contact && " If something here is not answered, the address at the bottom reaches a person."}
      </P>

      <S id="honest" title="What this cannot offer yet">
        <P>
          There is no reference customer to name and no case study to send. This project has been built
          and measured in public and has not yet been run at scale by anybody else, and a page claiming
          otherwise would be the first thing a careful reader caught.
        </P>
        <P>
          What there is instead is the evidence: the app, its tests, the security review summarized on{" "}
          {page("/trust#security", "the trust page")}, and the data protection impact assessment behind{" "}
          {page("/privacy", "the privacy notice")}. A cost model on {page("/funding", "the funding page")}{" "}
          publishes what it costs to run and where every figure came from. A first pilot is a first
          pilot. It is priced and scoped accordingly.
        </P>
      </S>

      <S id="shapes" title="The three shapes a pilot takes">
        <Shape title="A workplace.">
          A group of colleagues learning Estonian, usually because they moved here for the job. The
          sponsor gets a cohort view that shows effort and a readiness band, never a percentage and never
          an individual’s answers. That boundary is in the code rather than in a policy: the query behind
          an employer’s view does not read the column a teacher’s view uses, and the list is ordered by
          name so it cannot be read as a league table. Enterprise sign-in is available through SAML, so
          nobody is asked to make another account.
        </Shape>
        <Shape title="A class.">
          A teacher and their pupils. A teacher sees more than an employer, because they have a lesson
          to plan: effort, the group’s weakest cases, and each pupil’s own weakest case as a rolled-up
          percentage over enough answers to mean something. Still never a pupil’s deck, their searches
          or their answer history. The join screen says all of this before anybody joins, and{" "}
          {page("/teachers", "the page for teachers")} shows the roster over an invented class.
        </Shape>
        <Shape title="An institution.">
          A ministry, a university department or a language school evaluating whether this is worth
          supporting or building on. Usually the interesting output is not the learners at all but{" "}
          {doc("docs/19-research-export.md", "the research export")}: which cases and which gradation
          patterns learners actually get wrong, at a scale no classroom reaches, published under
          statistical disclosure control and labeled where it is self-reported.
        </Shape>
      </S>

      <S id="cost" title="What it costs">
        <P>
          Nothing to run a pilot, and that is not an introductory offer. The app is free to use, there
          is nothing to buy and nothing about anybody is sold. {page("/funding", "The funding page")}{" "}
          publishes the whole bill and the arithmetic behind it: the floor is a few hundred dollars a
          month before a single learner arrives, most of it does not move when they do, and the first
          thousand people are close to free to serve. A pilot of thirty people costs the operator almost
          exactly what an empty deployment costs.
        </P>
        <P>
          What a pilot can cost you is time, and it is worth naming: somebody has to introduce it, and
          somebody has to tell us what went wrong. That second one is the part that is actually valuable.
        </P>
      </S>

      <S id="asked" title="What is asked of you">
        <ol className="list-decimal space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li><strong>A named contact.</strong> One person who can answer a question and pass one on.</li>
          <li>
            <strong>A start date and an end date.</strong> Six to twelve weeks is enough to see whether
            anybody comes back in the second month, which is the only retention number worth having.
          </li>
          <li>
            <strong>Permission to count, not to watch.</strong> The figures in{" "}
            {doc("docs/23-impact.md", "the impact report")} are aggregates over people who have not opted
            out, with floors that suppress a number rather than report a small one. Nobody is asked a
            question they did not volunteer for and no analytics vendor is involved, because there is not
            one anywhere in this app.
          </li>
          <li>
            <strong>A written result at the end</strong>, including if the answer is that it did not work.
          </li>
        </ol>
      </S>

      <S id="back" title="What you get back">
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>The app, with every part of it switched on, for as long as the pilot runs.</li>
          <li>Enterprise sign-in through your own identity provider, where you have one.</li>
          <li>A cohort view scoped to what your role is entitled to see.</li>
          <li>
            A written summary at the end: how many people started, how many were still there in the
            second month, how much study that came to, and how many conversations in Estonian they
            reported having outside the app. That last one is the number this project says it is
            measured by, and it is self-reported, and the summary will say so.
          </li>
          <li>Whatever we learned about where the software got in the way.</li>
        </ul>
      </S>

      <S id="data" title="What happens to your people’s data">
        <P>
          The full answer is {page("/privacy", "the privacy notice")} and the{" "}
          {doc("docs/24-dpia.md", "data protection impact assessment")}. These are the parts a sponsor asks about first:
        </P>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>
            Every learner can take their whole record out in one file at any time, and delete their
            account from inside the app.
          </li>
          <li>There is no analytics script, no advertising identifier and no third-party tracker on any page.</li>
          <li>What a sponsor sees is fixed in code, not in a setting somebody could widen later.</li>
          <li>A photograph of a page is read and never stored.</li>
          <li>
            The live list of every service this copy talks to is on{" "}
            {page("/trust#data", "the trust page")}, generated from the deployment’s own configuration, and
            the {doc("docs/26-subprocessors.md", "subprocessor register")} describes the same list, so the
            two cannot silently disagree.
          </li>
          <li>Ending a pilot does not take anybody’s account away. It is their account.</li>
        </ul>
      </S>

      <S id="not-ready" title="What this is not ready for">
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }} data-not-ready>
          <li>
            <strong>There is no SOC 2 report and no ISO 27001 certificate.</strong>{" "}
            {doc("docs/29-controls.md", "The control map")} is a self-assessment against both, written to
            be checked rather than believed.
          </li>
          <li>
            <strong>No external penetration test has been carried out.</strong> The threat model and the
            review are on {page("/trust#security", "the trust page")} and they are our own work.
          </li>
          <li>
            <strong>There is no contractual uptime commitment.</strong> What there is instead is an app
            that keeps working with no network for the pages a learner has already opened, and holds
            grades until it can send them.
          </li>
          <li>
            <strong>The accessibility claim is partial conformance, not full</strong>, with the gaps named
            on {page("/accessibility", "the accessibility statement")} rather than rounded up.
          </li>
        </ul>
        <P>
          Any of those can change, and each has a note on what would trigger it. None of them is going
          to be claimed before it is true.
        </P>
      </S>

      <S id="contact" title="Getting in touch">
        {contact ? (
          <P>
            <a href={`mailto:${contact}?subject=${encodeURIComponent("A Kodukeel pilot")}`} className="underline underline-offset-2">
              {contact}
            </a>{" "}
            reaches the operator named on {page("/privacy", "the privacy notice")}, which is the same address
            a data protection question goes to. There is no separate sales address, because there is nobody
            in sales.
          </P>
        ) : (
          <P>
            Whoever runs this copy of Kodukeel has not named an address yet, so there is nobody on this
            page to write to. {page("/trust#who", "The trust page")} says what they need to fill in.
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
