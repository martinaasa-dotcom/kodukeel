import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Card, CardLink, SectionTitle, StatTile } from "@/components/ui";
import { RUNG_LABEL, RUNG_ORDER, type Summary } from "@/lib/readiness/rungs";
import { headline } from "@/lib/readiness/narrative";
import { RUNG_TILE } from "./Rung";

/**
 * The distribution over a level, which is the headline this screen prints
 * instead of a percentage.
 *
 * Five tiles rather than one figure, in the rung order, strongest last so the
 * eye lands on "lead" at the end of the row. Drawn on Progress and at the top
 * of the readiness page from one component, so the two cannot count a level
 * two ways.
 */
export function ReadinessSummary({ summary }: { summary: Summary }) {
  const shown = [...RUNG_ORDER].reverse();
  return (
    <>
      <p className="text-base" style={{ color: "var(--ink)" }}>{headline(summary)}</p>
      {/*
        Five across once the card has the room, not once the window does: at
        768 the rail takes a column and this card is 318px wide, which put
        five tiles at 57px each and broke "Lead" and "Follow" mid-letter.
        The card's own width is the question, so it is a container query.
      */}
      <div className="@container mt-4">
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-5">
          {shown.map((rung) => (
            <StatTile key={rung} value={summary.counts[rung]} label={RUNG_LABEL[rung]} tone={RUNG_TILE[rung]} />
          ))}
        </div>
      </div>
      {summary.commonest && (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          The thing in the way most often, on {summary.commonest.times} of them: {summary.commonest.title.toLowerCase()}.
          {summary.commonest.href && summary.commonest.cta && (
            <>
              {" "}
              <Link
                href={summary.commonest.href}
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--accent-deep)" }}
              >
                {summary.commonest.cta}
              </Link>
              .
            </>
          )}
        </p>
      )}
    </>
  );
}

/** The panel Progress draws. */
export function ReadinessPanel({ summary }: { summary: Summary }) {
  return (
    <section>
      <SectionTitle hint={`at ${summary.level} · counted in situations`}>In real life</SectionTitle>
      <Card>
        <ReadinessSummary summary={summary} />
        <div className="mt-4">
          <CardLink href="/progress/readiness">Every situation, and where each would go wrong</CardLink>
        </div>
      </Card>
    </section>
  );
}
