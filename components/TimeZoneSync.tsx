"use client";

import { useEffect } from "react";
import { setTimeZone } from "@/app/actions";

/**
 * Tells the server where the learner's midnight is.
 *
 * Renders nothing, asks nothing. The browser already knows the answer, so
 * putting a timezone picker in Settings would be making somebody fill in a
 * form to tell a machine what it can read for itself — and the one person who
 * would never think to fill it in is the one it matters most for, since a
 * learner does not know the streak is being counted somewhere else.
 *
 * Called only when the stored value actually disagrees with the browser, which
 * is once on a new account and once more if somebody moves or travels. The
 * server accepts a named zone and nothing else (`canonicalZone` in
 * lib/time/day.ts), so a stored zone means the same thing to Postgres as it
 * does here. A browser that reports a bare offset is not asked to send it,
 * because the server would refuse it on every page load for ever.
 */
export function TimeZoneSync({ stored }: { stored: string | null }) {
  useEffect(() => {
    let zone: string | undefined;
    try {
      zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // A browser that will not say keeps the app on the server's zone, which
      // is what it did before this existed. Nothing to report and nothing to
      // recover from.
      return;
    }
    if (!zone || zone === stored || /^[+-]/.test(zone)) return;
    void setTimeZone(zone).catch(() => undefined);
  }, [stored]);

  return null;
}
