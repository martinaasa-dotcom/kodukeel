/**
 * WHICH CARD TO REOPEN ON, AFTER A DETOUR THE ROUTER DID NOT KEEP WARM.
 *
 * A review session freezes its queue in state on mount, on purpose (see the
 * comment on `ReviewSession`): a Server Action's own revalidation must not
 * shrink the pool under a running round. That protects the round while the
 * component stays mounted. It says nothing about what happens when it does
 * not: pressing "Full entry" on a card leaves the page, and the router's
 * cache for a dynamic route goes stale in thirty seconds
 * (`staleTimes.dynamic` in next.config.ts), which is shorter than reading a
 * dictionary entry usually takes. Coming back then remounts the session from
 * a fresh server render, at a new queue and index 0, so a learner who
 * checked a word mid-round could read a card they had already answered, or
 * simply lose their place.
 *
 * The fix is not to keep the round alive across a page it does not own. It is
 * to remember which card was on screen, in `sessionStorage`, and to look for
 * that same card in whatever queue the fresh render hands back. Most of the
 * time it is still there, since only a card that was graded during the
 * detour would be missing, and the round resumes on it rather than on
 * whichever card the reshuffled queue happens to open with.
 *
 * Keyed on the page's own path and query, because `/review`, `/review?case=`
 * and `/review/common/<group>` all render this component over different
 * pools and must not resume into each other's card.
 */
const PREFIX = "kodukeel:resume:";

export function resumeStorageKey(pathAndQuery: string): string {
  return `${PREFIX}${pathAndQuery}`;
}

/** The index of `savedId` in `cards`, or 0 where it is missing or unset. */
export function resumeIndex(cards: readonly { id: string }[], savedId: string | null): number {
  if (!savedId) return 0;
  const found = cards.findIndex((c) => c.id === savedId);
  return found >= 0 ? found : 0;
}
