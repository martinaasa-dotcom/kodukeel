import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight } from "lucide-react";
import { EVIDENCE_LABEL } from "@/lib/exam/readiness";
import type { Reading } from "@/lib/readiness/rungs";
import { RungChip } from "./Rung";
import { tr, type Locale } from "@/lib/copy/locale";

/**
 * ONE SITUATION, AS ONE THING TO READ AND ONE PLACE TO PRESS.
 *
 * The row carried the rung, the evidence, the claim, the unit's own subtitle,
 * the next step as a sentence, a "try it" sentence and a three-bar chart of
 * the same rung the chip had already named: seven things per row, eighty rows
 * a page. The page each row opens says all of that at length. What the list
 * needs is which situation it is and where you stand on it, and the chip
 * carries the evidence behind it, which a rung printed on its own may not
 * leave out.
 */
export function SituationRow({ reading, locale }: { reading: Reading; locale: Locale }) {
  const { situation, rung, evidence } = reading;
  return (
    <Link
      href={`/progress/readiness/${situation.id}`}
      className="lift flex h-full items-center gap-4 rounded-[var(--r-lg)] border px-4 py-3.5"
      style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold" style={{ color: "var(--ink)" }}>
          {tr(locale, situation.claim)}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <RungChip rung={rung} locale={locale} />
          {rung !== "unmet" && (
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>{tr(locale, EVIDENCE_LABEL[evidence])}</span>
          )}
        </span>
      </span>
      <ArrowRight size={16} aria-hidden className="shrink-0" style={{ color: "var(--ink-3)" }} />
    </Link>
  );
}
