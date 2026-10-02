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
import { acceptedForms, checkAnswer, countsAsRecalled } from "@/lib/estonian/answer";

/** The grade a neighbour earns: a pass, brought back sooner. */
export const NEIGHBOUR_RATING = 2 as const;

/**
 * How many neighbours a card carries at most. High on purpose: the list is
 * what the learner's typed word is compared against, and a word left off it
 * is a right word marked wrong. Over the shipped dictionary no word reaches
 * eight, so this is a ceiling against a gloss nobody has written yet rather
 * than a cut anybody meets.
 */
export const MAX_NEIGHBOURS = 40;

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

/**
 * The senses of a gloss, read a little more loosely than `sensesOf` reads them.
 *
 * A gloss is written for a reader and two glosses of one meaning are rarely
 * spelled alike: "a beginning" against "beginning", "to start / to begin"
 * against "to begin, start", "doctor or physician". So an article is dropped,
 * a slash and an "or" split a sense the way a comma does, and the qualifier is
 * kept beside it for ranking rather than for refusing. Generous by design:
 * refusing a right word costs more than crediting a near one.
 */
export function looseSenses(gloss: string): Sense[] {
  const out: Sense[] = [];
  const seen = new Set<string>();
  for (const sense of sensesOf(gloss.replace(/\s*\/\s*/g, ", ").replace(/\s+or\s+/gi, ", "))) {
    const of = sense.of
      .replace(/^(?:a|an|the|to|be)\s+/, "")
      .replace(/^(?:a|an|the)\s+/, "")
      .replace(/[!?.]+$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (of.length < 2 || seen.has(of)) continue;
    seen.add(of);
    out.push({ of, ...(sense.narrowedTo ? { narrowedTo: sense.narrowedTo } : {}) });
  }
  return out;
}

function key(pos: string, sense: Sense): string {
  return `${pos} ${sense.of}`;
}

export function neighbourIndex(entries: readonly NeighbourEntry[]): NeighbourIndex {
  const out = new Map<string, Indexed[]>();
  for (const entry of entries) {
    looseSenses(entry.gloss).forEach((sense, rank) => {
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
 * Every entry sharing a sense with this card's prompt, the closest first.
 *
 * Exhaustive rather than careful, which is the operator's call: any sense of
 * the prompt against any sense of the other word, qualifiers or not, because
 * the panel that follows prints both glosses and a sentence of each, so a
 * pair that only overlaps a little is shown overlapping a little rather than
 * claimed to be the same. The one line kept is the part of speech, since a
 * noun meaning "help" typed for "to help" is a different answer rather than a
 * second word for this one. Spellings the card already accepts are its own
 * answers, not neighbours.
 *
 * Closest first: a word whose first sense is the prompt's first sense, then
 * more senses shared, then a matching qualifier, then graded entries, then the
 * lemma, so the order does not depend on the database.
 */
export function neighboursOf(
  card: { lemma: string; pos: string; gloss: string },
  index: NeighbourIndex,
  accepted: readonly string[] = [],
): NeighbourEntry[] {
  const own = new Set([card.lemma, ...accepted].map((w) => fold(w.trim().toLocaleLowerCase("et"))));
  const shared = new Map<string, { entry: NeighbourEntry; count: number; closeness: number; clash: boolean }>();
  looseSenses(card.gloss).forEach((sense, cardRank) => {
    for (const found of index.get(key(card.pos, sense)) ?? []) {
      if (own.has(fold(found.entry.lemma.trim().toLocaleLowerCase("et")))) continue;
      const clash = !!(sense.narrowedTo && found.narrowedTo && sense.narrowedTo !== found.narrowedTo);
      const closeness = (found.rank === 0 ? 2 : 0) + (cardRank === 0 ? 1 : 0);
      const held = shared.get(found.entry.id);
      if (held) {
        held.count += 1;
        held.closeness = Math.max(held.closeness, closeness);
        held.clash &&= clash;
      } else {
        shared.set(found.entry.id, { entry: found.entry, count: 1, closeness, clash });
      }
    }
  });
  return [...shared.values()]
    .sort((a, b) =>
      b.closeness - a.closeness
      || b.count - a.count
      || Number(a.clash) - Number(b.clash)
      || Number(b.entry.graded) - Number(a.entry.graded)
      || a.entry.lemma.localeCompare(b.entry.lemma, "et"))
    .slice(0, MAX_NEIGHBOURS)
    .map((held) => held.entry);
}

function normalised(text: string): string {
  return fold(text.trim().toLocaleLowerCase("et").replace(/[!?.,;:]/g, "").replace(/\s+/g, " "));
}

/**
 * Which neighbour, if any, the learner typed.
 *
 * An exact match first, folded so a dropped diacritic still counts. Then a
 * slip of the hand on the neighbour, read by the same `checkAnswer` that
 * forgives one on the card's own word, so being generous about the second
 * word is never stricter than being generous about the first: the screen
 * shows the dictionary's spelling, which is the correction a slip needs.
 */
export function typedNeighbour<T extends { lemma: string }>(typed: string, neighbours: readonly T[]): T | null {
  const given = normalised(typed);
  if (!given) return null;
  for (const neighbour of neighbours) {
    for (const form of acceptedForms(neighbour.lemma, "et")) {
      if (fold(form.compared) === given) return neighbour;
    }
  }
  for (const neighbour of neighbours) {
    if (countsAsRecalled(checkAnswer(typed, neighbour.lemma, "et").verdict)) return neighbour;
  }
  return null;
}
