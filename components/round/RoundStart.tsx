import type { ReactNode } from "react";

/**
 * THE SCREEN A TIMED ROUND OR A BOARD OPENS ON, DRAWN ONCE.
 *
 * Five rounds carry a start screen of their own rather than a briefing in
 * front of them (see `BriefingLines` in ./Briefing.tsx), and each had drawn it
 * its own way: a mint wash on one, butter on the next, a bare icon and a
 * paragraph on the third. They are one moment, the same one the briefing is,
 * so they are one drawing and it is the briefing's: a night panel, the round's
 * name large, what it is in one paragraph, what is true of tonight's sitting
 * as chips, and the way in last.
 *
 * It draws the screen's one `h1`, so a caller does not wrap it in `Page`.
 */
export function RoundStart({ icon, title, lead, children, chips, actions, footnote, hue = "cta" }: {
  icon: ReactNode;
  title: string;
  /** The round's one-line pitch, under the name. */
  lead?: ReactNode;
  /** What the round is, in a paragraph. */
  children?: ReactNode;
  /** Facts about tonight's sitting: how long, how many, a personal best. */
  chips?: ReactNode;
  /** The row of buttons, primary last. */
  actions: ReactNode;
  /** A quiet line under the buttons, such as where the clock is set. */
  footnote?: ReactNode;
  /** Which of the four night colours the icon disk wears. */
  hue?: "cta" | "blush" | "accent" | "sky";
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-5 md:py-16">
      <div className="night pop-in rounded-[var(--r-xl)] border px-5 py-9 text-center sm:px-8 md:px-10 md:py-11">
        <span
          aria-hidden
          className="round-start-disk float mx-auto grid h-20 w-20 place-items-center rounded-full"
          style={{ background: `var(--${hue})`, color: "var(--on-hue)" }}
        >
          {icon}
        </span>
        <h1
          className="font-display mt-6 text-4xl font-bold leading-[1.02] tracking-tight md:text-5xl"
          style={{ color: "var(--ink)", textWrap: "balance" }}
        >
          {title}
        </h1>
        {lead && (
          <p className="mt-2 text-md font-semibold" style={{ color: "var(--cta)" }}>{lead}</p>
        )}
        {children && (
          <div className="mx-auto mt-5 flex max-w-[46ch] flex-col gap-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {children}
          </div>
        )}
        {chips && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{chips}</div>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
        {footnote && (
          <p className="mt-5 text-sm" style={{ color: "var(--ink-3)" }}>{footnote}</p>
        )}
      </div>
    </div>
  );
}

/** One fact about tonight's sitting, as a glass pill on the night panel. */
export function RoundChip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold"
      style={{ background: "rgb(255 255 255 / 0.08)", border: "1px solid rgb(255 255 255 / 0.14)", color: "var(--ink)" }}
    >
      {icon}
      {children}
    </span>
  );
}
