import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ENGLISH_AND_ESTONIAN, Legal, P, S, updatedIn } from "@/components/Legal";
import { rich } from "@/components/Rich";
import { CLAIMS, commandFor, evidenceRows, measuredOn, type EvidenceRow, type Measured } from "@/lib/evidence/claims";
import measured from "@/lib/evidence/measured.json";
import { fill, tr, type PublicLocale } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { publicPageTitle, resolvePublicPage, type PublicSearch } from "@/lib/progress/publicLocale";
import { publicCard } from "@/lib/copy/publicCards";

/*
  English and Estonian (D16 in docs/44-sixth-batch.md, which widens D12 of
  docs/38-third-batch.md): a reviewer at the Institute reads the frame in
  Estonian. Each claim, its figure and the file that asserts it stay as the
  repository writes them, in English, marked so, since a translated claim
  would be a second copy of it nobody measures.
*/
export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicPageTitle(searchParams, "How we know", undefined, publicCard("/how-we-know"), ENGLISH_AND_ESTONIAN);
}

/*
  The footer under every public page asks the database whether /impact has
  anything to say yet, so a page baked at build time would answer for the build
  machine. The figures themselves are a file in the repository.
*/
export const dynamic = "force-dynamic";

const REPO = "https://github.com/martinaasa-dotcom/kodukeel/blob/main";

/**
 * EVERY CLAIM THIS PROJECT MAKES ABOUT ITSELF, WITH THE COMMAND THAT CHECKS IT.
 *
 * The table is `lib/evidence/claims.ts` and the figures are what
 * `npm run evidence` last wrote into `lib/evidence/measured.json`, or, for the
 * few that need a running build or a database, what a person wrote down with
 * the day and the place they ran it. Nothing on this page is typed into it.
 */
export default async function HowWeKnowPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicPage(searchParams, ENGLISH_AND_ESTONIAN);
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  const rows = evidenceRows(measured as Measured);
  return (
    <Legal title={t("How we know")} updated="15 October 2026" locale={locale} explicit={explicit} path="/how-we-know" drawnIn={ENGLISH_AND_ESTONIAN}>
      <P>
        {t("Each claim this project makes about itself, the figure behind it, the day it was measured, and the command that measures it again. Run the command on a copy of the repository and you should get the same figure. The file named under each claim is the one that fails if the rule behind it breaks.")}
      </P>
      <P>
        {rich(t("Most figures are rewritten by `npm run evidence`, which re-runs every audit that needs no server and no database. The rest need a running build or a database, so a person wrote them down with the day and the place they ran. Each row says which. A figure older than the latest release is still a figure, so its date is printed rather than hidden. The wider picture is on {trust}, and what it costs to run is on {funding}."), {
          trust: <Link href={href("/trust")} className="underline underline-offset-2">{t("the trust page")}</Link>,
          funding: <Link href={href("/funding")} className="underline underline-offset-2">{t("the funding page")}</Link>,
        })}
      </P>
      {locale !== "en" && <P>{t("Each claim below is written as the repository writes it, in English, with its figure and the file that asserts it.")}</P>}

      <S id="claims" title={fill(t("{n} claims"), { n: CLAIMS.length })}>
        <ul className="flex flex-col gap-4" data-evidence-rows>
          {rows.map((row) => <ClaimRow key={row.id} row={row} locale={locale} />)}
        </ul>
      </S>

      <S id="not-here" title={t("What is not on this page")}>
        <P>
          {rich(t("A claim with no command behind it. This project has no SOC 2 report, no ISO 27001 certificate and no external penetration test, and none of the checks here stands in for one. The accessibility figures are automated checks, which find some faults and not others; the {statement} says what a person has to judge."), {
            statement: <Link href={href("/accessibility")} className="underline underline-offset-2">{t("accessibility statement")}</Link>,
          })}
        </P>
      </S>
    </Legal>
  );
}

function ClaimRow({ row, locale }: { row: EvidenceRow; locale: PublicLocale }) {
  const t = (english: string) => tr(locale, english);
  // The claim's own words are the repository's, in English (see the note at the top).
  const english = locale === "en" ? undefined : "en";
  return (
    <li id={row.id} className="rounded-[var(--r)] border p-4" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
      <p className="font-semibold" lang={english} style={{ color: "var(--ink)" }}>{row.claim}</p>
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]" style={{ color: "var(--ink-2)" }}>
        <dt className="font-semibold">{t("Figure")}</dt>
        <dd lang={english}>{row.figure}</dd>
        <dt className="font-semibold">{t("Measured")}</dt>
        <dd data-measured-on>
          {updatedIn(measuredOn(row.on), locale)}
          {row.source === "recorded" && row.recorded
            ? <>, <span lang={english}>{row.recorded.where}</span></>
            : `, ${t("by npm run evidence")}`}
        </dd>
        <dt className="font-semibold">{t("Command")}</dt>
        <dd><code>{commandFor(row)}</code></dd>
        <dt className="font-semibold">{t("Asserted in")}</dt>
        <dd>
          <a href={`${REPO}/${row.assertedBy}`} className="underline underline-offset-2" rel="noreferrer">
            <code>{row.assertedBy}</code>
          </a>
          , <span lang={english}>which {row.assertedHow}</span>
        </dd>
      </dl>
    </li>
  );
}
