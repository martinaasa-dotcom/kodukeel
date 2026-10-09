import type { ReactNode } from "react";

/**
 * THE LEADING CARD OF A PAGE, SET ONCE.
 *
 * Learn, Practice and Progress each drew their own night card, in their own
 * type sizes, with the buttons hung off the bottom right and the top right
 * empty. Today and the dictionary never had that, because something always
 * fills the right half. So this is one component, and it takes the *parts*
 * rather than the markup: an eyebrow, a headline, a line of body, a figure
 * with its caption, and the actions. Every page that uses it therefore sets
 * the same sizes in the same order, which is what "normalised" means here,
 * and a page cannot choose a different headline size because there is no
 * place to put one.
 *
 * Words on the left, a tile on the right that is never empty and is centred
 * against the words. On a phone the tile stacks under them.
 */
export function HeroSplit({ eyebrow, title, titleId, text, figure, actions }: {
  eyebrow: string;
  title: ReactNode;
  titleId?: string;
  text?: ReactNode;
  /** The one number the card is about, drawn at the same size on every page. */
  figure?: { value: ReactNode; label: string };
  actions?: ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className="night rounded-[var(--r-xl)] border p-6 md:p-9">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-10">
        <div className="min-w-0">
          <p className="label-xs" style={{ color: "var(--butter-ink)" }}>{eyebrow}</p>
          <h2
            id={titleId}
            className="font-display mt-3 text-3xl font-bold leading-tight"
            style={{ color: "var(--ink)", textWrap: "balance" }}
          >
            {title}
          </h2>
          {text && (
            <div className="mt-3 max-w-[44ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>{text}</div>
          )}
        </div>
        <div
          data-hero-aside
          className="flex min-w-0 flex-col gap-5 rounded-[var(--r-lg)] border p-6"
          style={{
            background: "color-mix(in srgb, var(--ink) 6%, transparent)",
            borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)",
          }}
        >
          {figure && (
            <div>
              <p className="font-display tnum text-7xl font-bold leading-none" style={{ color: "var(--ink)" }}>{figure.value}</p>
              <p className="mt-2 text-md font-semibold" style={{ color: "var(--ink-2)" }}>{figure.label}</p>
            </div>
          )}
          {actions && <div className="flex flex-col gap-2">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
