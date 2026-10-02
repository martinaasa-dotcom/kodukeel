/**
 * A SECOND WORD FOR THE SAME THING IS RIGHT, AND IT IS WORTH A SENTENCE.
 *
 * A production card shows "to begin (something)" and asks for `alustama`. A
 * learner who types `hakkama` has produced a real Estonian word the dictionary
 * glosses "to begin, to start (doing)", and anybody in Tallinn would have
 * understood them. The card used to say "Not quite", ask for a retype and
 * grade Again, which told somebody who had reached for the commonest verb in
 * the language that they did not know how to say it. That is the one thing
 * this app tries never to do.
 *
 * So a word that shares a sense with the card's prompt is accepted, and the
 * screen says why both are fine and how the dictionary tells them apart: the
 * two glosses side by side, which is where the course writes the difference
 * ("(something)" against "(doing)"), and one sentence of each. Nothing here
 * decides what that difference *is*; the glosses and the sentences are the
 * dictionary's own, and this file holds no Estonian at all (ADR-005).
 *
 * The relation is `lib/dict/synonyms.ts`'s, read through `sensesOf`, and like
 * that module it is read **only to accept**. It over-accepts on purpose:
 * English is polysemous and the gloss is English, so two words can share a
 * sense over an English word that means two things. On this side a wrong pair
 * credits a learner with a word that meant something nearby, which costs a
 * card coming back a little later than it should; refusing a right word costs
 * somebody's confidence, which is the dearer of the two.
 *
 * And it never writes the card's own word down as recalled. The grade is Hard
 * (`NEIGHBOUR_RATING`), which FSRS reads as a pass that comes back sooner: the
 * learner produced *a* right word and has not yet shown the one this card is
 * about, and `Review` is append-only.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */

import { sensesOf, type Sense } from "@/lib/dict/synonyms";
import { fold } from "@/lib/estonian/fold";
import { acceptedForms } from "@/lib/estonian/answer";

/** The grade a neighbour earns: a pass, brought back sooner. */
export const NEIGHBOUR_RATING = 2 as const;

/** How many neighbours a card carries at most, so a session stays small. */
export const MAX_NEIGHBOURS = 6;

/**
 * How far into the card's gloss a shared sense may sit, and why the typed
 * word's own sense has to be its first.
 *
 * English is polysemous and the gloss is English, so "chair" is the first
 * sense of the word for the furniture and the third of the word for whoever
 * runs a meeting, and "story" is a tale under one entry and a floor of a
 * building under another. Telling somebody who typed the second of either
 * "yes, that means it too" would be a confident wrong answer, which is worse
 * than the "not quite" this replaces. Read over the shipped dictionary, the
 * pairs a learner would actually type (`hakkama` for `alustama`, `isik` for
 * `inimene`, `doktor` for `arst`) all meet on the typed word's first sense,
 * and the noise all meets further down.
 */
const PROMPT_SENSES = 2;

/** The little the index needs about an entry. */
export interface NeighbourEntry {
  readonly id: string;
  readonly lemma: string;
  readonly pos: string;
  /** The English gloss, a comma-separated list of senses. */
  readonly gloss: string;
  /** Whether the entry is graded, which is the course or the graded seed. */
  readonly graded: boolean;
}

interface Indexed {
  readonly entry: NeighbourEntry;
  readonly narrowedTo?: string;
  /** Where the sense stands in the entry's own gloss, 0 for its first. */
  readonly rank: number;
}

/** Every entry, filed under each `pos sense` it carries. */
export type NeighbourIndex = ReadonlyMap<string, readonly Indexed[]>;

function key(pos: string, sense: Sense): string {
  return `${pos} ${sense.of}`;
}

export function neighbourIndex(entries: readonly NeighbourEntry[]): NeighbourIndex {
  const out = new Map<string, Indexed[]>();
  for (const entry of entries) {
    sensesOf(entry.gloss).forEach((sense, rank) => {
      const k = key(entry.pos, sense);
      let group = out.get(k);
      if (!group) {
        group = [];
        out.set(k, group);
      }
      group.push({ entry, rank, ...(sense.narrowedTo ? { narrowedTo: sense.narrowedTo } : {}) });
    });
  }
  return out;
}

/**
 * The entries sharing a sense with this card's prompt, most useful first.
 *
 * Same part of speech, because a noun meaning "help" is not a verb meaning
 * "to help". Two qualifiers that differ are somebody saying the two are not
 * the same thing, which is the rule `substitutesFrom` keeps, so "bread (dark)"
 * never stands in for "bread (white)". Spellings the card already accepts are
 * left out, since those are its own answers rather than neighbours.
 *
 * Graded entries first, then the entries sharing more of the prompt's senses,
 * then the lemma, so the order does not depend on the database.
 */
export function neighboursOf(
  card: { lemma: string; pos: string; gloss: string },
  index: NeighbourIndex,
  accepted: readonly string[] = [],
): NeighbourEntry[] {
  const own = new Set([card.lemma, ...accepted].map((w) => fold(w.trim().toLocaleLowerCase("et"))));
  const shared = new Map<string, { entry: NeighbourEntry; count: number }>();
  for (const sense of sensesOf(card.gloss).slice(0, PROMPT_SENSES)) {
    for (const found of index.get(key(card.pos, sense)) ?? []) {
      // The typed word's own first meaning, never a sense it wanders into
      // further down its gloss: see the note on `PROMPT_SENSES`.
      if (found.rank !== 0) continue;
      if (own.has(fold(found.entry.lemma.trim().toLocaleLowerCase("et")))) continue;
      if (sense.narrowedTo && found.narrowedTo && sense.narrowedTo !== found.narrowedTo) continue;
      const held = shared.get(found.entry.id);
      if (held) held.count += 1;
      else shared.set(found.entry.id, { entry: found.entry, count: 1 });
    }
  }
  return [...shared.values()]
    .sort((a, b) =>
      Number(b.entry.graded) - Number(a.entry.graded)
      || b.count - a.count
      || a.entry.lemma.localeCompare(b.entry.lemma, "et"))
    .slice(0, MAX_NEIGHBOURS)
    .map((held) => held.entry);
}

/**
 * Which neighbour, if any, the learner typed.
 *
 * Folded, so `hakkama` typed without a diacritic it needed still counts: the
 * screen shows the word as the dictionary spells it, which is the correction
 * a dropped letter needs, and nobody is told they were wrong for knowing it.
 */
export function typedNeighbour<T extends { lemma: string }>(typed: string, neighbours: readonly T[]): T | null {
  const given = fold(typed.trim().toLocaleLowerCase("et").replace(/[!?.,;:]/g, "").replace(/\s+/g, " "));
  if (!given) return null;
  for (const neighbour of neighbours) {
    for (const form of acceptedForms(neighbour.lemma, "et")) {
      if (fold(form.compared) === given) return neighbour;
    }
  }
  return null;
}
