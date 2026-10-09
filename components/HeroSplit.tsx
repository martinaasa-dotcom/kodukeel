import type { ReactNode } from "react";

/**
 * THE SHAPE OF A PAGE'S LEADING CARD, ONCE.
 *
 * Learn, Practice and Progress each drew their own night card and each put a
 * heading on the left and the buttons at the bottom right, which on a wide
 * screen left the top right of the box empty. Today and the dictionary never
 * had that, because there is always something in the right half: a progress
 * ring, a search box. So this is that shape as a component: words on the left,
 * and on the right a panel that is never empty, centred against the words
 * rather than hung off the bottom edge.
 *
 * The panel is a quiet tile on the night ground, never a second card with
 * its own shadow, and it stacks under the words on a phone.
 */
export function HeroSplit({ children, aside, label }: {
  children: ReactNode;
  aside: ReactNode;
  /** Names the region for a screen reader, which is the heading's own id. */
  label?: string;
}) {
  return (
    <section aria-labelledby={label} className="night rounded-[var(--r-xl)] border p-6 md:p-9">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-10">
        <div className="min-w-0">{children}</div>
        <div
          data-hero-aside
          className="flex min-w-0 flex-col gap-4 rounded-[var(--r-lg)] border p-5"
          style={{
            background: "color-mix(in srgb, var(--ink) 6%, transparent)",
            borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)",
          }}
        >
          {aside}
        </div>
      </div>
    </section>
  );
}
