"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * A PAGE WHOSE NUMBERS ARE A PROMISE ASKS THE SERVER AGAIN WHEN IT IS SHOWN
 * FROM A COPY.
 *
 * Today prints how many cards Review is about to ask, and Review asks exactly
 * that many (lib/progress/dailyQueue.ts). Every grade clears the browser's
 * page cache (`revalidatePath` in the grading actions), so going back to Today
 * after a session is always a fresh render. What is not a mutation is time
 * and the other device. A copy of Today can be up to thirty seconds old when
 * the router serves it (`staleTimes.dynamic`), two minutes when a hover
 * fetched it (`staleTimes.static`), and as old as the tab when it was simply
 * left open: cards fall due in the meantime, and a session finished on the
 * phone leaves the laptop's Today still saying 20. The learner presses it and
 * meets a different number, which is the fault this whole queue was rebuilt
 * to stop.
 *
 * So the page asks again whenever it is put back on screen from something it
 * already had: mounted with a payload this tab has seen before and is more
 * than `STALE_MS` old, or brought back into view after `AWAY_MS`.
 *
 * Age is measured on this tab's own clock, from the moment it first saw that
 * render, never against the server's timestamp, because a device clock ahead
 * of the server would read every fresh render as old and refresh for ever.
 * A refresh brings a new `renderedAt`, which has never been seen, so it can
 * never ask twice for one copy.
 */

/** A copy shown again after this long is asked for again. */
const STALE_MS = 5_000;
/** A tab brought back after this long is asked for again. */
const AWAY_MS = 60_000;

/** When this tab first saw each render, by the server's stamp on it. */
const FIRST_SEEN = new Map<number, number>();

export function KeepCurrent({ renderedAt }: { renderedAt: number }) {
  const router = useRouter();

  useEffect(() => {
    const seen = FIRST_SEEN.get(renderedAt);
    const now = Date.now();
    if (seen === undefined) {
      FIRST_SEEN.set(renderedAt, now);
      // A tab open all day sees a render a minute; keep the map small.
      if (FIRST_SEEN.size > 50) FIRST_SEEN.delete(FIRST_SEEN.keys().next().value!);
    } else if (now - seen > STALE_MS) {
      router.refresh();
      return;
    }

    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt > AWAY_MS) router.refresh();
      hiddenAt = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [renderedAt, router]);

  return null;
}
