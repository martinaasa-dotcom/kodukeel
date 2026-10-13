/**
 * "ANOTHER ROUND" IS A NEW ADDRESS, OR IT IS NOTHING.
 *
 * Every round ends on a button that offers another one, and for most of the
 * life of this app that button was a link to the page it was already on:
 * `/review/match` from `/review/match`, `/review/sayings?set=3` from
 * `/review/sayings?set=2`. A soft navigation to the same route keeps every
 * client component whose place in the tree has not moved, and a round keeps
 * its whole state in one: measured in a browser on Match, the board and the
 * clock carried on exactly as they were, whether the address changed or not.
 * Sixteen rounds had the button and none of them did anything.
 *
 * Two halves, and each is useless without the other. The link carries a
 * `round` that is one more than the one it was pressed on, so the address is
 * new and the server deals a new round (`againHref`). And the round is drawn
 * inside `FreshRound`, keyed on that same value, so the new round mounts
 * rather than being handed to the old one as props it ignores. `BeforeYouStart`
 * wraps its children in it, so a round with a briefing gets the key for free
 * and the briefing is not shown a second time.
 *
 * Pure: no React, no Next.js.
 */

/** The query parameter a fresh round is keyed on. */
export const ROUND_PARAM = "round";

/** Which round the address names, or 0. Anything but a small whole number is 0. */
export function roundOf(params: { get(name: string): string | null } | null | undefined): number {
  const raw = params?.get(ROUND_PARAM) ?? null;
  return raw && /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
}

/**
 * The address of the next round: the same path, every other parameter kept,
 * and `round` one higher than the one it was built on.
 */
export function againHref(path: string, params: { toString(): string } | string = ""): string {
  const next = new URLSearchParams(typeof params === "string" ? params : params.toString());
  next.set(ROUND_PARAM, String(roundOf(next) + 1));
  return `${path}?${next.toString()}`;
}
