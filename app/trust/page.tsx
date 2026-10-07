import { Accessibility, CircleAlert, CircleCheck, Database, Download, EyeOff, ShieldQuestion, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { rich } from "@/components/Rich";
import { fill, tr } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { resolveOperator, SUPERVISORY_AUTHORITY } from "@/lib/legal/operator";
import { resolveRecipients, transfersOutsideEea } from "@/lib/legal/recipients";
import { recipientIn } from "@/lib/legal/recipientCopy";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "Trust");
}

/*
  Same reason as /privacy, /terms and /funding: who runs this and what it is
  configured to talk to are facts about the deployment, so a page baked at
  build time would describe whichever machine ran the build.
*/
export const dynamic = "force-dynamic";

const REPO = "https://github.com/martinaasa-dotcom/kodukeel/blob/main";

/**
 * One page for the reader who has to decide whether this is safe to put in
 * front of other people.
 *
 * A school buying a licence, a ministry funding the work and an engineer
 * reviewing it are asking one question from three directions: who is
 * answerable, where does the data sit, what happens when it breaks, and what
 * has actually been checked by somebody. Each of those is already answered in
 * this repository, in a design document or in the environment the app is
 * running in, and none of it was on a page you could send somebody.
 *
 * WHAT MAKES IT WORTH READING IS THE PARAGRAPH THAT SAYS NO. There is no SOC 2
 * report, no ISO 27001 certificate and no penetration test, and a page that
 * left those out would be a page whose other claims are worth less. A buyer
 * who catches one overclaim stops believing the rest, which is the argument
 * `docs/27-security.md` opens its own gaps section with.
 *
 * Nothing here is asserted twice. The recipients are read from the deployment
 * exactly as `/privacy` reads them, so the two pages cannot disagree about
 * where anything goes. In Russian and Ukrainian the prose comes from the
 * public area (lib/copy/i18n/areas/public.ts); the documents it links to stay
 * English, and the links say so.
 */
export default async function TrustPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicLocale(searchParams);
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  const operator = resolveOperator();
  const recipients = resolveRecipients();
  const leavesTheUnion = transfersOutsideEea(recipients);
  const doc = (path: string, label: string) => (
    <a href={`${REPO}/${path}`} className="underline underline-offset-2" rel="noreferrer">
      {t(label)}
    </a>
  );
  const identity = {
    name: operator.name,
    registry: operator.registryCode ? `, ${fill(t("registry code {code}"), { code: operator.registryCode })}` : "",
    vat: operator.vatId ? `, ${fill(t("VAT number {vat}"), { vat: operator.vatId })}` : "",
    address: operator.address,
  };

  return (
    <Legal title={t("Trust and security")} updated="5 September 2026" locale={locale} explicit={explicit} path="/trust">
      <P>
        {t("This page is for whoever decides whether Kodukeel is safe for a class, a team or a grant. The short answers come first, and each one takes you to the detail below.")}
      </P>

      {/*
        THE ANSWERS AT A GLANCE, THE WORKING UNDER THEM. Six questions a buyer
        asks, each with its answer in a few words and a mark saying whether it
        is a yes or a not yet. The not-yets are drawn exactly as loudly as the
        yeses, which is the whole argument of this page: a reader who catches
        one overclaim stops believing the rest. Every tile is a link to the
        section that holds the evidence, so nothing here is asserted twice.
      */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Glance href="#who" icon={<UserRound size={18} aria-hidden />} question={t("Who answers for it")}
          answer={operator.identified && operator.name ? operator.name : t("Not named on this copy yet")} good={operator.identified} yes={t("Yes")} notYet={t("Not yet")} />
        <Glance href="#data" icon={<Database size={18} aria-hidden />} question={t("Where the data is kept")}
          answer={leavesTheUnion ? t("Its own database, with some services outside the EEA") : t("Its own database, and nothing sent outside the EEA")} good={!leavesTheUnion} yes={t("Yes")} notYet={t("Not yet")} />
        <Glance href="#data" icon={<EyeOff size={18} aria-hidden />} question={t("Trackers and analytics")}
          answer={t("None")} good yes={t("Yes")} notYet={t("Not yet")} />
        <Glance href="#rights" icon={<Download size={18} aria-hidden />} question={t("Export and deletion")}
          answer={t("Any time, from Settings")} good yes={t("Yes")} notYet={t("Not yet")} />
        <Glance href="#security" icon={<ShieldQuestion size={18} aria-hidden />} question={t("Outside audit or certificate")}
          answer={t("Not yet: no SOC 2, ISO 27001 or pen test")} good={false} yes={t("Yes")} notYet={t("Not yet")} />
        <Glance href="#accessibility" icon={<Accessibility size={18} aria-hidden />} question={t("Accessibility")}
          answer={t("Checked on every change. Partial, with the gaps named")} good={false} yes={t("Yes")} notYet={t("Not yet")} />
      </ul>

      <S id="who" title={t("Who runs this")}>
        {operator.identified ? (
          <>
            <P>
              {rich(t("This installation is run by **{name}**{registry}{vat}, at {address}. They’re the controller of every learner’s data here, and the party any contract would be with."), identity)}
            </P>
            <P>
              {rich(t("One address reaches a real person, whether it’s a data question, a security report or a procurement question: {email}. There’s no separate security mailbox yet, and saying so is more use than publishing one nobody reads."), {
                email: (
                  <a href={`mailto:${operator.email}`} className="underline underline-offset-2">
                    {operator.email}
                  </a>
                ),
              })}
            </P>
          </>
        ) : (
          <P>
            {rich(t("**Whoever runs this installation has not filled their name in.** Kodukeel is software anyone can install, not a service with one address, so the copy you’re reading is run by a person or an organization who’s supposed to be named here. Until they are, there’s nobody on this page to sign anything with. If you’re running it, set `OPERATOR_NAME`, `OPERATOR_ADDRESS` and `OPERATOR_EMAIL`."))}
          </P>
        )}
      </S>

      <S id="data" title={t("Where the data is held, and who else touches it")}>
        <P>
          {t("Everything a learner does is held in this installation’s own Postgres database. Nothing below gets a deck, a review history or an exam paper. The list is read straight from this deployment’s configuration rather than typed out here, so it’s the real set of services this copy talks to.")}
        </P>
        <ul className="space-y-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {recipients.map((r) => {
            const shown = recipientIn(r, locale);
            return (
              <li key={r.name}>
                <strong>{shown.name}</strong>: {shown.what}.{" "}
                {r.eea === true
                  ? t("Established in the European Economic Area.")
                  : r.eea === false
                    ? t("Established outside the European Economic Area.")
                    : t("Where this one sits depends on how the installation was set up, so ask the operator above.")}
              </li>
            );
          })}
        </ul>
        {leavesTheUnion && (
          <P>
            {rich(t("**Some of that leaves the European Economic Area**, which matters for a transfer assessment. It rests on the standard contractual clauses each provider publishes. The two features that do it are the tutor and the page scanner, and a deployment configured with no AI provider has neither, so an organization that cannot accept the transfer can run the rest of the app without it."))}
          </P>
        )}
        <P>
          {rich(t("There’s no analytics vendor, no advertising identifier and no third-party tracker, and you don’t have to take our word for it: the app has no third-party script tag anywhere in it, and the one thing it counts, whether people come back, is worked out from its own review log. {privacy} is the long version of all of this, written for the learner rather than the buyer."), {
            privacy: <Link href={href("/privacy")} className="underline underline-offset-2">{t("Privacy")}</Link>,
          })}
        </P>
      </S>

      <S id="rights" title={t("How a learner gets their data out, and how they delete it")}>
        <P>
          {rich(t("**Export.** Settings has a button that returns everything held about the account as a single JSON file: every card, review, task, setting, scanned word list, level check, mock exam paper with the composition in it, tutor message, conversation, suggestion, starred word and class membership. It is a real backup and the same file restores into a fresh installation, which is what makes it portability rather than a gesture."))}
        </P>
        <P>
          {rich(t("**Deleting everything.** The same screen deletes the account and everything in it, including the sign-in record, in one action and with no request to write. Where an installation is not configured to remove the sign-in record itself, the button says so plainly instead of reporting a success it did not achieve. Both live under {settings}."), {
            settings: <Link href="/settings" className="underline underline-offset-2">{t("Settings")}</Link>,
          })}
        </P>
        <P>
          {t("A learner in a class or a workplace group can leave it, which stops the sponsor seeing anything and takes nothing out of their own deck.")}
        </P>
      </S>

      <S id="security" title={t("Security posture")}>
        <P>
          {t("The security work is written down in full rather than summarized for you. There are three documents, and each one names files you can open:")}
        </P>
        <ul className="space-y-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>
            {rich(t("{doc}: what the system is, the five trust boundaries, fifteen threats worked through one at a time, the controls inventory, and a section on what has not been done."), {
              doc: doc("docs/27-security.md", "Security review and threat model"),
            })}
          </li>
          <li>
            {rich(t("{doc}: severity, who does what, the Article 33 clock for telling the supervisory authority, the Article 34 clock for telling the people affected, and runbooks for a leaked credential, a runaway AI bill, a database restore and a vandalized dictionary."), {
              doc: doc("docs/28-incident-response.md", "Incident response"),
            })}
          </li>
          <li>
            {rich(t("{doc}: the controls a reviewer usually asks about, mapped to where each one lives."), {
              doc: doc("docs/29-controls.md", "Control map"),
            })}
          </li>
        </ul>
        {locale !== "en" && (
          <P>{t("The three documents are in English.")}</P>
        )}
        <P>
          {rich(t("**What this project does not have, stated plainly.** There is no SOC 2 report. There is no ISO/IEC 27001 certificate. The control map is a self-assessment written by the people who wrote the code, and it has not been reviewed by anybody outside this project. No external penetration test has been commissioned, so nobody has attacked this application under contract, and no independent reviewer has read the source for security faults. The code being public is not the same thing as having been audited."))}
        </P>
        <P>
          {rich(t("Four more limits, named here before you find them yourself. Ownership of rows is enforced in application code and asserted in the build rather than by Postgres row level security. The Content Security Policy carries {inline} in its script sources, for a reason written out in the code, and that is the weakest line in it. Nothing watches the logs continuously: there is no intrusion detection and no alerting beyond an optional error webhook. And multi-factor authentication is inherited from whatever the learner’s Google account has rather than enforced here."), {
            inline: <code>&lsquo;unsafe-inline&rsquo;</code>,
          })}
        </P>
        <P>
          {t("What there is instead is a build that fails when a rule is broken, rather than a document promising the rules are kept: the credential scan greps the built client bundle for every server-only value, the invariant suite asserts the rules this project set itself, and the browser suites drive the real app. All of it runs on every change.")}
        </P>
        <P>
          {t("One of those suites is worth naming, because it is the only one that asks these questions of a server rather than of the source. It sends the forged requests, reads back every security header, checks that what is behind a token stays behind it, and reads what the health endpoint is willing to say. It found something on its first run: a request carrying an address the app could not parse was being treated as a request carrying none, and those had different answers. That is the shape of thing it is for. It is a test written by the people who wrote the code, so it cannot tell you the design is right, and it is not the outside look this section says is missing.")}
        </P>
      </S>

      <S title={t("Availability")}>
        <P>
          {rich(t("**There is no contractual service level today.** No uptime percentage is promised anywhere in this app or in its terms, and nothing here is worth quoting as one. What can be said is what the app does when things break, which is a design decision rather than a hope."))}
        </P>
        <P>
          {rich(t("**The review path survives losing the network.** A grade answered with no connection goes into a queue in the browser and is sent later with the time it was actually answered, never dropped and never restamped, so a session on a train costs nothing. The service worker keeps the pages a learner was last on and an offline screen behind them, so the app opens rather than showing a browser error. The dictionary, the tutor and speech all need a connection and say so instead of serving something stale."))}
        </P>
        <P>
          {rich(t("**When the database is unreachable**, pages that need it fail to an error screen that says nothing has been lost, which is true: the review log is only ever appended to. The message itself stays on the server, because a database error can quote a connection string, and what the screen shows is a reference you can quote back at us."))}
        </P>
        <P>
          {rich(t("**When an AI provider is having a bad minute**, the app moves to the next provider configured rather than failing, and where none answers the feature says so. Nothing that teaches Estonian depends on a model: the dictionary, the deck, the scheduler, the exam and every practice round work with no AI provider at all."))}
        </P>
        <P>
          {rich(t("**Health check.** {health} answers without a session and returns whether the app is up, whether the database answers, and the commit this build came from. It carries no counts and nothing about anybody. A monitor can poll it."), {
            health: <a href="/api/health" className="underline underline-offset-2">/api/health</a>,
          })}
        </P>
      </S>

      <S title={t("Reporting a vulnerability")}>
        <P>
          {rich(t("Send it to {who} with “security” in the subject line. The full policy is in {policy}, including the response times we can actually keep: three working days to acknowledge, ten to tell you whether we agree it is a problem, and a target of thirty days to fix anything critical or high. If the report is sensitive enough that plain email worries you, say so in one line with no detail in it and we’ll set up another channel."), {
            who: operator.identified && operator.email ? (
              <a href={`mailto:${operator.email}`} className="underline underline-offset-2">
                {operator.email}
              </a>
            ) : (
              t("the operator named at the top of this page")
            ),
            policy: <a href={`${REPO}/SECURITY.md`} className="underline underline-offset-2" rel="noreferrer">SECURITY.md</a>,
          })}
        </P>
        <P>
          {fill(t("If a breach ever affects personal data, the incident document above is the procedure we follow, and the supervisory authority for Estonia is the {authority} ({local})."), {
            authority: t(SUPERVISORY_AUTHORITY.name),
            local: SUPERVISORY_AUTHORITY.localName,
          })}
        </P>
      </S>

      <S id="accessibility" title={t("Accessibility")}>
        <P>
          {rich(t("Contrast is measured in a browser in both themes, every target is measured against 44px under a coarse pointer, axe runs over every route on every change, and no audit by a person with a disability using assistive technology has been commissioned yet. The {statement} says what is claimed, what is tested, and the gaps that are known."), {
            statement: <Link href={href("/accessibility")} className="underline underline-offset-2">{t("accessibility statement")}</Link>,
          })}
        </P>
      </S>
    </Legal>
  );
}

/** One answer at a glance, marked yes or not yet, opening the section behind it. */
function Glance({ href, icon, question, answer, good, yes, notYet }: {
  href: string; icon: ReactNode; question: string; answer: string; good: boolean; yes: string; notYet: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="lift flex h-full items-start gap-3 rounded-[var(--r-lg)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--raised)", color: "var(--ink-2)" }}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm" style={{ color: "var(--ink-3)" }}>{question}</span>
          <span className="mt-0.5 block text-base font-semibold leading-snug" style={{ color: "var(--ink)" }}>{answer}</span>
        </span>
        <span className="shrink-0" style={{ color: good ? "var(--sky-ink)" : "var(--hard-ink)" }}>
          {good
            ? <CircleCheck size={18} aria-label={yes} />
            : <CircleAlert size={18} aria-label={notYet} />}
        </span>
      </a>
    </li>
  );
}
