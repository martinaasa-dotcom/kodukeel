/**
 * WHICH DICTIONARY ENTRY A LESSON ITEM BECOMES A CARD OF.
 *
 * A lesson teaches spellings as a beginner meets them: `ma` rather than
 * `mina`, `kingad` rather than `king`, `Tere päevast!` as one thing to say,
 * `hommikul` as "in the morning". A card hangs off a dictionary entry, so a
 * spelling the dictionary does not head got no card, and a fifth of A1 was
 * never asked again: measured on 2026-10-17, 81 of the 429 things the lessons
 * teach.
 *
 * So each item is resolved, and the order is what decides it:
 *
 *   1. A headword, as the dictionary spells it. A one-word phrase is tried
 *      without its mark and with the capital it took for starting a
 *      sentence taken off (`Tere!` is the word `tere`), then without its
 *      mark (`Palun`), then as written (`Tere hommikust!`).
 *   2. A word that is a stored form of exactly one headword is that headword
 *      (`ma` is `mina`, `kingad` is `king`, `raamatut` is `raamat`). A form
 *      two headwords share is neither, which is `readCase`'s rule one module
 *      over.
 *   3. Anything else is the lesson's own entry, spelled as the lesson says it
 *      and glossed with the lesson's English (`lessonEntries`), which the seed
 *      writes into the dictionary. A chunk like `hommikul` is taught as a
 *      chunk, so its card asks the chunk rather than a headword the lesson
 *      never showed.
 *
 * The headwords come off the course harvest and the hand-typed phrases, which
 * are what the seed writes for the course. `lessonHeads.test.ts` holds every
 * lesson entry to a spelling the built dictionary does not already head, so
 * the seed never writes a second entry beside one it already has.
 *
 * No Estonian is written here: every spelling is one a lesson already teaches,
 * and lessons are held to ADR-005 amendment 6.
 *
 * Pure: no React, no Prisma, no clock.
 */

import { HARVESTED } from "@/prisma/data/harvested";
import { PHRASES } from "@/prisma/data/other";
import { LESSONS, unfold, type LessonSpec } from "./lessons";

type Item = ReturnType<typeof unfold>[number];

const HEADWORDS: ReadonlySet<string> = new Set([
  ...HARVESTED.map((w) => w.lemma),
  ...PHRASES.map(([lemma]) => lemma),
]);

/** Every stored spelling of a harvested word, and the headwords it belongs to. */
const FORM_OF: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const owners = new Map<string, Set<string>>();
  for (const word of HARVESTED) {
    const spellings = [
      ...Object.values(word.parts).filter((v): v is string => typeof v === "string"),
      ...word.extraForms.map((f) => f.value),
    ];
    for (const spelling of spellings) {
      const held = owners.get(spelling) ?? new Set<string>();
      held.add(word.lemma);
      owners.set(spelling, held);
    }
  }
  return owners;
})();

const stripped = (text: string) => text.trim().replace(/[.!?]+$/, "");
const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase("et") + text.slice(1);

/** The headword a lesson item is a card of, or null where it is an entry of its own. */
function headword(item: Item): string | null {
  if (item.kind === "form") return item.of;
  const bare = stripped(item.et);
  for (const candidate of [lowerFirst(bare), bare, item.et.trim()]) {
    if (HEADWORDS.has(candidate)) return candidate;
  }
  if (!/\s/.test(bare)) {
    for (const spelling of [bare, lowerFirst(bare)]) {
      const owners = FORM_OF.get(spelling);
      if (owners?.size === 1) return [...owners][0]!;
    }
  }
  return null;
}

/** What a lesson item is a card of: a headword, or the lesson's own spelling. */
export function lessonHead(item: Item): string {
  return headword(item) ?? item.et.trim();
}

/** Every lesson item, in teaching order, unfolded the way the Words step lists it. */
function items(lesson: LessonSpec): readonly Item[] {
  return lesson.teaches.flatMap(unfold);
}

/** What a lesson teaches, as the dictionary heads it, once each. */
export function lessonHeads(lesson: LessonSpec): string[] {
  const out: string[] = [];
  for (const item of items(lesson)) {
    const head = lessonHead(item);
    if (!out.includes(head)) out.push(head);
  }
  return out;
}

/** A dictionary entry the lessons need and the course harvest does not head. */
export interface LessonEntry {
  readonly lemma: string;
  /** A phrase or a chunk is a `PHRASE`; a single word is `OTHER`, since the lesson names no part of speech. */
  readonly pos: "PHRASE" | "OTHER";
  readonly translation: string;
  /** The lesson that first teaches it, so the seed can say where it came from. */
  readonly lesson: string;
}

/**
 * Every lesson item that is an entry of its own, once, glossed by the first
 * lesson that teaches it. The seed writes these with `ON CONFLICT DO NOTHING`.
 *
 * `headedElsewhere` is what the rest of the dictionary already heads (the
 * built expansion, which this module does not load because every page imports
 * the course): a spelling it holds is a card of that entry already, so the
 * lesson writes none beside it.
 */
export function lessonEntries(headedElsewhere: ReadonlySet<string> = new Set()): LessonEntry[] {
  const out = new Map<string, LessonEntry>();
  for (const lesson of LESSONS) {
    for (const item of items(lesson)) {
      if (headword(item) !== null) continue;
      const lemma = item.et.trim();
      if (out.has(lemma) || headedElsewhere.has(lemma)) continue;
      out.set(lemma, {
        lemma,
        pos: item.kind === "word" ? "OTHER" : "PHRASE",
        translation: item.en.replace(/[{}]/g, ""),
        lesson: lesson.id,
      });
    }
  }
  return [...out.values()];
}
