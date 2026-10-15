import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { CLAIMS, commandFor, evidenceRows, measuredOn, type EvidenceRow, type Measured } from "@/lib/evidence/claims";
import measured from "@/lib/evidence/measured.json";
import { shareCard } from "@/lib/progress/publicLocale";
import { PUBLIC_CARDS } from "@/lib/copy/publicCards";

// English only (docs/38-third-batch.md, D12), like /pilots, so its own card in English.
export const metadata = { title: "How we know", ...shareCard("en", "How we know", PUBLIC_CARDS["/how-we-know"], "/how-we-know") };

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
export default function HowWeKnowPage() {
  const rows = evidenceRows(measured as Measured);
  return (
    <Legal title="How we know" updated="15 October 2026" path="/how-we-know" oneLanguage>
      <P>
        Each claim this project makes about itself, the figure behind it, the day it was measured, and the
        command that measures it again. Run the command on a copy of the repository and you should get the
        same figure. The file named under each claim is the one that fails if the rule behind it breaks.
      </P>
      <P>
        Most figures are rewritten by <code>npm run evidence</code>, which re-runs every audit that needs no
        server and no database. The rest need a running build or a database, so a person wrote them down
        with the day and the place they ran. Each row says which. A figure older than the latest release is
        still a figure, so its date is printed rather than hidden. The wider picture is on{" "}
        <Link href="/trust" className="underline underline-offset-2">the trust page</Link>, and what it costs
        to run is on <Link href="/funding" className="underline underline-offset-2">the funding page</Link>.
      </P>

      <S id="claims" title={`${CLAIMS.length} claims`}>
        <ul className="flex flex-col gap-4" data-evidence-rows>
          {rows.map((row) => <ClaimRow key={row.id} row={row} />)}
        </ul>
      </S>

      <S id="not-here" title="What is not on this page">
        <P>
          A claim with no command behind it. This project has no SOC 2 report, no ISO 27001 certificate and
          no external penetration test, and none of the checks here stands in for one. The accessibility
          figures are automated checks, which find some faults and not others; the{" "}
          <Link href="/accessibility" className="underline underline-offset-2">accessibility statement</Link>{" "}
          says what a person has to judge.
        </P>
      </S>
    </Legal>
  );
}

function ClaimRow({ row }: { row: EvidenceRow }) {
  return (
    <li id={row.id} className="rounded-[var(--r)] border p-4" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>{row.claim}</p>
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]" style={{ color: "var(--ink-2)" }}>
        <dt className="font-semibold">Figure</dt>
        <dd>{row.figure}</dd>
        <dt className="font-semibold">Measured</dt>
        <dd data-measured-on>
          {measuredOn(row.on)}
          {row.source === "recorded" && row.recorded ? `, ${row.recorded.where}` : ", by npm run evidence"}
        </dd>
        <dt className="font-semibold">Command</dt>
        <dd><code>{commandFor(row)}</code></dd>
        <dt className="font-semibold">Asserted in</dt>
        <dd>
          <a href={`${REPO}/${row.assertedBy}`} className="underline underline-offset-2" rel="noreferrer">
            <code>{row.assertedBy}</code>
          </a>
          , which {row.assertedHow}
        </dd>
      </dl>
    </li>
  );
}
