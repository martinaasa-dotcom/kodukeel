/**
 * WHICH FIVE SAYINGS A SITTING DEALS, AND WHAT IT REMEMBERS AFTERWARDS.
 *
 * The sittings used to be fixed slices of `SAYINGS`, five in a row, picked by
 * the day or by `?set=`. So the same five always arrived together, the
 * neighbours on a match board were the same neighbours every time, and
 * "Another set" opened the next slice whether or not the learner had already
 * met it. What a learner has been shown is a fact the app has to remember,
 * because a saying is not a card and writes no review: nothing in the log can
 * say which of them somebody has seen.
 *
 * Four rules, each a thing the learner asked for in so many words.
 *
 * 1. NOTHING SEEN COMES BACK BEFORE EVERYTHING HAS BEEN SEEN. A sitting draws
 *    from the sayings this learner has not been served yet. The served list
 *    is a cycle: it fills up as sittings are dealt and starts over once every
 *    saying has been in one.
 *
 * 2. THE EASIER ONES FIRST. `SAYINGS` is in teaching order, the order its own
 *    header says a learner should meet them in, so a sitting draws from the
 *    earliest unseen ones rather than from anywhere in the list.
 *
 * 3. NEVER THE SAME FIVE TOGETHER. Inside that front of the list the draw is
 *    random: a window of `WINDOW` unseen sayings, shuffled, of which a sitting
 *    takes five. Two learners, or one learner on a second pass, meet them in
 *    different company.
 *
 * 4. A NEW PASS DOES NOT OPEN WITH THE SITTING THAT CLOSED THE LAST ONE. When
 *    fewer than five are left unseen, the sitting takes all of them and fills
 *    up from the rest, never from the sayings dealt in the sitting just before.
 *    That sitting finishes the cycle, so the next pass starts with exactly its
 *    five marked as served (`afterServing`), and none of them is dealt again
 *    until the rest of the list has gone round.
 *
 * Pure: no React, no Prisma, no network. The caller hands in the catalogue,
 * which is the ids that can actually be played on this deployment, in teaching
 * order, and the served list as stored.
 */

import { shuffle } from "@/lib/random/shuffle";

/** How many sayings a sitting deals. */
export const DEAL_SIZE = 5;

/**
 * How far into the unseen list a sitting reaches. Three sittings' worth: wide
 * enough that the five are a different five each time, narrow enough that the
 * easy front of the list still comes first.
 */
export const WINDOW = DEAL_SIZE * 3;

/** The separator a served list is stored with. Saying ids are ASCII and hold none. */
const SEP = " ";

/** The stored value read back as ids, in the order they were served. Junk is dropped. */
export function servedFrom(value: string | null | undefined): string[] {
  if (!value) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of value.split(SEP)) {
    if (!/^[a-z0-9-]{1,80}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** A served list written back for storage. */
export function servedValue(ids: readonly string[]): string {
  return ids.join(SEP);
}

/**
 * The ids a sitting deals, in teaching order.
 *
 * `served` is this cycle's served list, oldest first; its last `DEAL_SIZE`
 * entries are the sitting dealt most recently. Ids no longer in the catalogue
 * are ignored, so a saying taken out of the list, or one this deployment
 * cannot play, never blocks a cycle from finishing.
 */
export function dealSayings(
  catalogue: readonly string[],
  served: readonly string[],
  random: () => number = Math.random,
): string[] {
  if (catalogue.length <= DEAL_SIZE) return [...catalogue];
  const known = new Set(catalogue);
  const servedHere = served.filter((id) => known.has(id));
  const seen = new Set(servedHere);
  const unseen = catalogue.filter((id) => !seen.has(id));

  let picked: string[];
  if (unseen.length >= DEAL_SIZE) {
    picked = shuffle(unseen.slice(0, WINDOW), random).slice(0, DEAL_SIZE);
  } else {
    // The end of a pass: everything left, topped up from what has been seen,
    // never from the sitting just before, so two sittings in a row never share one.
    const last = new Set(servedHere.slice(-DEAL_SIZE));
    const fill = shuffle(catalogue.filter((id) => seen.has(id) && !last.has(id)), random);
    const backup = shuffle(catalogue.filter((id) => last.has(id)), random);
    picked = [...unseen, ...fill, ...backup].slice(0, DEAL_SIZE);
  }
  const order = new Map(catalogue.map((id, i) => [id, i]));
  return picked.sort((a, b) => order.get(a)! - order.get(b)!);
}

/**
 * The served list once a sitting has been shown.
 *
 * Every id shown is added in the order shown. Where that leaves nothing in the
 * catalogue unserved, the cycle is over and the next one starts with this
 * sitting alone marked as served, which is what keeps it from being the first
 * sitting of the next pass as well. Ids that are not in the catalogue are
 * never stored, so a forged request cannot grow the row.
 */
export function afterServing(
  catalogue: readonly string[],
  served: readonly string[],
  shown: readonly string[],
): string[] {
  const known = new Set(catalogue);
  const shownHere = [...new Set(shown.filter((id) => known.has(id)))];
  if (shownHere.length === 0) return served.filter((id) => known.has(id));
  // Shown last, so the tail of the list is always the most recent sitting.
  const shownSet = new Set(shownHere);
  const merged = [...served.filter((id) => known.has(id) && !shownSet.has(id)), ...shownHere];
  const all = new Set(merged);
  return catalogue.every((id) => all.has(id)) ? shownHere : merged;
}
