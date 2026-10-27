"use client";

import { useCallback, useState } from "react";
import { readSnapshot, snapshotKey, writeSnapshot, type RoundSnapshot } from "@/lib/ux/sessionSnapshot";

type Round<C extends { id: string }> = Omit<RoundSnapshot<C>, "v" | "savedAt">;

/** The key for the page this tab is on, or null on the server. */
function currentKey(): string | null {
  return typeof window === "undefined" ? null : snapshotKey(window.location.pathname + window.location.search);
}

/**
 * Whether this tab holds an unfinished round for the page it is on.
 *
 * Read by the briefing, so a learner whose page reloaded under them is put
 * straight back into the round rather than shown "here is what is about to
 * happen" over something that is already half done.
 */
export function hasRoundToResume(): boolean {
  const key = currentKey();
  if (!key) return false;
  try {
    return readSnapshot(window.sessionStorage.getItem(key), Date.now()) !== null;
  } catch {
    return false;
  }
}

/**
 * THE ROUND, KEPT WHERE A RELOAD CANNOT TAKE IT (lib/ux/sessionSnapshot.ts).
 *
 * `restored` is read once, on the first render, and only where the server
 * handed down cards: every page that renders a review session wraps it in the
 * briefing, which mounts the round after a press, so this never runs during
 * hydration and cannot draw something the server did not. A page with no
 * cards draws its empty state, and that is honest, since a round whose cards
 * are all answered has nothing left to resume.
 *
 * Storage that throws, a private window or a full quota, is a round that is
 * simply not remembered: the session goes on exactly as it did before this.
 */
export function useRoundSnapshot<C extends { id: string }>(initialCards: readonly C[]) {
  const [key] = useState(currentKey);
  const [restored] = useState<RoundSnapshot<C> | null>(() => {
    if (!key || initialCards.length === 0) return null;
    try {
      return readSnapshot<C>(window.sessionStorage.getItem(key), Date.now());
    } catch {
      return null;
    }
  });

  const save = useCallback((round: Round<C>) => {
    if (!key) return;
    try {
      if (round.index >= round.queue.length) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, writeSnapshot(round, Date.now()));
    } catch {
      // Blocked or full: the round goes on and simply is not remembered.
    }
  }, [key]);

  return { restored, save };
}
