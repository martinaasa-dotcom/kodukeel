import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Card, CardLink, SectionTitle } from "@/components/ui";
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
  const total = shown.reduce((sum, rung) => sum + summary.counts[rung], 0);
  return (
    <>
      <p className="text-base" style={{ color: "var(--ink)" }}>{headline(summary)}</p>
      {/*
        Five across once the card has the room, not once the window does: at
        768 the rail takes a column and this card is 318px wide, which put
        five tiles at 57px each and broke "Lead" and "Follow" mid-letter.
        The card's own width is the question, so it is a container query.
      */}
      {/*
        One bar in proportion rather than five tiles of numbers: where the
        situations stand is a share of one whole, and the shape of it is the
        thing worth seeing at a glance. The legend carries the words and the
        counts, so the hue is never the only thing saying which is which.
      */}
      {total > 0 && (
        <div aria-hidden className="mt-4 flex h-3 w-full overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          {shown.filter((rung) => summary.counts[rung] > 0).map((rung) => (
            <span
              key={rung}
              className="block h-full"
              style={{ width: `${(summary.counts[rung] / total) * 100}%`, background: `var(--${RUNG_TILE[rung]})` }}
            />
          ))}
        </div>
      )}
      {/* Only the rungs something sits on: three zeros in a row beside the two
          that count was a legend longer than the bar it explains, and the
          sentence above already says what is empty. */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {shown.filter((rung) => total === 0 || summary.counts[rung] > 0).map((rung) => (
          <li key={rung} className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--${RUNG_TILE[rung]})` }} />
            {RUNG_LABEL[rung]}
            <span className="tnum font-bold" style={{ color: "var(--ink)" }}>{summary.counts[rung]}</span>
          </li>
        ))}
      </ul>
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
