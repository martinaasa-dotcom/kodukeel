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
 *
 * Two columns until `lg`, on both screens. A tile's label is set in
 * `label-xs`, uppercase, and "started" alone is 72px of it, so five across
 * needs a tile of about 96px. Five across at every width gave a 25px label box
 * on a phone and at 768, where the rail appears and the column is at its
 * narrowest, and `overflow-wrap: anywhere` broke every label into letters
 * ("NOT STA RTE D") rather than let it overflow, which is why the containment
 * sweep read it as clean. `sm:` is the wrong breakpoint for the same reason:
 * 768 is above it.
 */
export function ReadinessSummary({ summary }: { summary: Summary }) {
  const shown = [...RUNG_ORDER].reverse();
  return (
    <>
      <p className="text-base" style={{ color: "var(--ink)" }}>{headline(summary)}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {shown.map((rung) => (
          <StatTile key={rung} value={summary.counts[rung]} label={RUNG_LABEL[rung]} tone={RUNG_TILE[rung]} />
        ))}
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
