import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { NamedIcon } from "@/components/icons";
import { DESTINATIONS } from "@/lib/ux/nav";

/**
 * THE PLACES THAT LIVE INSIDE THIS ONE, AS A ROW OF DOORS AT THE FOOT OF IT.
 *
 * The rail carries five places and everything else carries `within`
 * (`lib/ux/nav.ts`). That is only honest if the place named really does offer
 * each of them, so this reads the table rather than a list the page keeps: a
 * destination added under Progress appears on Progress by existing, and one
 * moved elsewhere leaves by the same edit. `nav.test.ts` counts this element
 * as linking every destination whose `within` is the place it is given.
 *
 * Quiet on purpose. It is the answer to "where did the calendar go", not
 * something to press on an ordinary evening, so it sits at the bottom of the
 * page it belongs to in the smallest shape that is still a 44px target.
 */
export function InsideHere({ place, title }: { place: string; title: string }) {
  const inside = DESTINATIONS.filter((d) => d.within === place);
  if (inside.length === 0) return null;
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold" style={{ color: "var(--ink-3)" }}>{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {inside.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              title={d.blurb}
              className="choice-btn inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
              style={{ borderColor: "var(--edge)", color: "var(--ink)" }}
            >
              <NamedIcon name={d.icon} size={15} strokeWidth={2.2} aria-hidden style={{ color: inkOf(d.tone) }} />
              {d.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The ink a hue is written in on a card: never the fill, which fails 4.5:1. */
function inkOf(tone: string): string {
  if (tone === "accent") return "var(--accent-deep)";
  if (tone === "mint" || tone === "sky" || tone === "butter" || tone === "blush") return `var(--${tone}-ink)`;
  return "var(--ink-3)";
}
