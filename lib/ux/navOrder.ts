/**
 * WHICH ROWS THE RAIL CARRIES, AND IN WHAT ORDER, IS THE LEARNER'S TO SAY.
 *
 * The rail holds five places (`CORE` in lib/ux/nav.ts) and everything else
 * lives inside one of them. That is right for most people and wrong for some:
 * somebody in a class opens the calendar before anything else, and somebody
 * sitting the state examination in March opens the mock paper every evening.
 * For them a page one level in is one press too many, every day, so it is
 * theirs to pin back, from the menu under their name.
 *
 * WHAT IS CHOSEN IS AN ORDER AND A FEW PINS, NOTHING ELSE. The five can be
 * moved and cannot be removed, since a rail with no way back to Today is a
 * rail somebody gets lost in. A pin can be any place with a `within`, never a
 * control. And there are at most `MAX_PINS` of them, because the whole point
 * of five rows is a column that fits on a laptop without scrolling, and ten
 * pins would put back the column this replaced.
 *
 * ONE STRING, LIKE TODAY'S ORDER. The stored value is hrefs in order, space
 * separated, read forgivingly: an href this file no longer knows is dropped,
 * a duplicate is kept once, a pin past the cap is dropped, and a place the
 * row leaves out is put back where it stands in the default, so a place added
 * to the table after somebody set their order still appears.
 *
 * Pure: a string in, an order out. No React, no Prisma, no clock.
 */
import { CORE, PINNABLE, type Destination } from "./nav";

/** How many extra rows a rail may carry beside the five. */
export const MAX_PINS = 4;

/** The five, in the order the table gives them. */
export const DEFAULT_NAV_ORDER: readonly string[] = CORE.map((d) => d.href);

const CORE_HREFS = new Set(DEFAULT_NAV_ORDER);
const PIN_HREFS = new Set(PINNABLE.map((d) => d.href));
const BY_HREF = new Map<string, Destination>([...CORE, ...PINNABLE].map((d) => [d.href, d]));

/** Whether a row is one of the five, which may move and may not go. */
export function isCoreRow(href: string): boolean {
  return CORE_HREFS.has(href);
}

/** The order a stored value describes, made whole. */
export function navOrderFrom(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let pins = 0;
  for (const href of (raw ?? "").split(/\s+/)) {
    if (!href || seen.has(href)) continue;
    const core = CORE_HREFS.has(href);
    if (!core && !PIN_HREFS.has(href)) continue;
    if (!core && pins >= MAX_PINS) continue;
    seen.add(href);
    out.push(href);
    if (!core) pins++;
  }
  // A place the row leaves out goes back after the place before it in the
  // default, so a row written before a place existed still carries it.
  DEFAULT_NAV_ORDER.forEach((href, i) => {
    if (seen.has(href)) return;
    const before = DEFAULT_NAV_ORDER.slice(0, i).reverse().find((h) => seen.has(h));
    const at = before ? out.indexOf(before) + 1 : 0;
    out.splice(at, 0, href);
    seen.add(href);
  });
  return out;
}

/** The value to store for an order, which is the order read back whole. */
export function serialiseNavOrder(order: readonly string[]): string {
  return navOrderFrom(order.join(" ")).join(" ");
}

/** Whether an order is the one every rail starts with. */
export function isDefaultNavOrder(order: readonly string[]): boolean {
  return serialiseNavOrder(order) === DEFAULT_NAV_ORDER.join(" ");
}

/** The rows an order draws. */
export function railRows(order: readonly string[]): Destination[] {
  return navOrderFrom(order.join(" ")).map((href) => BY_HREF.get(href)!).filter(Boolean);
}

/** Places that could be pinned and are not. */
export function unpinned(order: readonly string[]): Destination[] {
  const on = new Set(order);
  return PINNABLE.filter((d) => !on.has(d.href));
}

/** How many pins an order carries. */
export function pinCount(order: readonly string[]): number {
  return order.filter((href) => !CORE_HREFS.has(href)).length;
}

/** An order with one row moved from one position to another. */
export function moveRow(order: readonly string[], from: number, to: number): string[] {
  const next = [...order];
  if (from < 0 || from >= next.length) return next;
  const [row] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, row!);
  return next;
}
