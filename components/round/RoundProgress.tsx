"use client";

import { useT } from "@/components/Locale";
import { Meter } from "@/components/ui";
import { EndSession } from "@/components/round/RoundExit";
import { fill } from "@/lib/copy/locale";

/**
 * THE TOP OF A ROUND, DRAWN ONCE.
 *
 * Every round opens on the same three things: the way out, how far along the
 * round is, and how many are left. They were written out by hand in fifteen
 * sessions and had come apart into three looks: a four-pixel hairline with the
 * count in grey, a ten-pixel bar with the count on a tint, and the daily path's
 * own. A learner moving from Match to Listening to the conjugation table saw
 * the top of the screen change for no reason they could name, which reads as
 * three different apps. This is the daily path's look for all of them.
 *
 * `done` and `total` are counts rather than a percentage, so the bar and the
 * count beside it cannot disagree, and the count is never below nought.
 */
export function RoundProgress({ done, total, left, label, endHref }: {
  done: number;
  total: number;
  /** What the count says, where it is not simply `total - done`. */
  left?: number;
  /** The accessible name of the bar. */
  label?: string;
  endHref?: string;
}) {
  const t = useT();
  const remaining = Math.max(0, left ?? total - done);
  const pct = total > 0 ? (Math.min(done, total) / total) * 100 : 0;
  return (
    <div className="mb-6 flex items-center gap-4">
      <EndSession href={endHref} />
      <div className="flex-1">
        <Meter pct={pct} label={label ?? t("Round progress")} height={8} />
      </div>
      <span
        className="tnum label-xs shrink-0 rounded-full px-2.5 py-1"
        style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
      >
        {fill(t("{n} left"), { n: remaining })}
      </span>
    </div>
  );
}
