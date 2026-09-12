"use client";

import { useCallback, useState } from "react";
import { resumeIndex, resumeStorageKey } from "@/lib/ux/resumePosition";

/**
 * WHICH CARD TO RESUME ON, SHARED BY EVERY SESSION THAT FREEZES A QUEUE.
 *
 * Five session screens (`ReviewSession`, `SpeakingSession`,
 * `DictationSession`, `SentenceSession`, `LearnSession`) each snapshot the
 * server's own array into state on mount, on purpose: a Server Action's
 * revalidation must not shrink the pool under a round already in progress.
 * That is right while the component stays mounted, and every one of them
 * links out to a card's dictionary entry mid-round, which is where it stops
 * being right. The router's cache for a dynamic route goes stale in thirty
 * seconds (`staleTimes.dynamic` in next.config.ts), reading an entry usually
 * takes longer than that, and coming back then remounts the session from a
 * fresh server render — a new queue, at the start.
 *
 * `lib/ux/resumePosition.ts` holds the pure half: a storage key from the
 * page's own path and query, and which index a saved card id now sits at.
 * This is the one place that turns it into state, so each of the five
 * screens calls one hook rather than carrying its own copy of `useState`,
 * `sessionStorage` and an effect that could drift from the other four.
 *
 * Read once, from the URL the browser actually has rather than from a
 * `next/navigation` hook: every caller is already client-rendered under a
 * `force-dynamic` page, so nothing here needs to react to the URL changing,
 * only to remember where it was reached from.
 */
export function useResumeCard(initialCards: readonly { id: string }[]) {
  const [resumeKey] = useState(() =>
    typeof window === "undefined" ? null : resumeStorageKey(window.location.pathname + window.location.search),
  );
  const [initialIndex] = useState(() => {
    if (!resumeKey || typeof window === "undefined") return 0;
    return resumeIndex(initialCards, window.sessionStorage.getItem(resumeKey));
  });

  /** Call with the card now on screen, or `undefined` once the round is done. */
  const remember = useCallback(
    (current: { id: string } | undefined) => {
      if (!resumeKey || typeof window === "undefined") return;
      if (current) window.sessionStorage.setItem(resumeKey, current.id);
      else window.sessionStorage.removeItem(resumeKey);
    },
    [resumeKey],
  );

  return { initialIndex, remember };
}
