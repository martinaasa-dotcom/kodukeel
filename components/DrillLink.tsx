import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { modeAt } from "@/lib/ux/modes";
import { NamedIcon } from "@/components/icons";

/**
 * The drill that belongs on the page you are already standing on.
 *
 * Four practice modes are drills for a named weakness, which is what
 * `lib/ux/modes.ts` has always called them, and all four used to sit on a menu
 * under a heading saying exactly that. A menu is the wrong shape for them: it
 * offers five answers to a question the learner has not asked, and it is the
 * one place they have no reason to be looking when the question does occur to
 * them. So each is now on the screen that names the thing it drills, and that
 * screen is the one place it is obviously worth pressing: the leech clinic
 * under the panel listing the cards you keep failing, the verb government drill
 * under the page explaining rektsioon, writing under the case it asks you to
 * write in, and pasting your own Estonian beside the scanner.
 *
 * The title, the blurb, the icon and the hue all come from `modeAt`, so a mode
 * renamed in one table is renamed on every page that offers it. That is the
 * same argument `lib/ux/nav.ts` makes about itself, and it is why this is one
 * component rather than four hand-drawn cards.
 */
export function DrillLink({ href }: { href: string }) {
  const mode = modeAt(href);
  // Rather than throwing on a page whose drill has been retired. The invariant
  // suite is what catches a stale href; a learner should not meet it.
  if (!mode) return null;

  return (
    <Link
      href={mode.href}
      className="lift grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 rounded-[var(--r-lg)] border p-5 sm:items-start"
      style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--hard-sm)" }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:row-span-2"
        style={{ background: `var(--${mode.tone})`, color: "var(--surface)" }}
      >
        <NamedIcon name={mode.icon} size={19} aria-hidden />
      </span>
      {/* On a phone the icon sits beside the title and the blurb takes the
          card's whole width under both, rather than a column the icon has
          already narrowed. */}
      <span className="min-w-0">
        <span className="block text-lg font-bold" style={{ color: "var(--ink)" }}>{mode.title}</span>
        <span className="block text-xs" style={{ color: "var(--ink-3)" }}>{mode.subtitle}</span>
      </span>
      <span className="col-span-2 block text-sm sm:col-span-1 sm:col-start-2" style={{ color: "var(--ink-2)" }}>{mode.blurb}</span>
    </Link>
  );
}
