import { fold } from "@/lib/estonian/fold";
import { editDistance } from "@/lib/estonian/answer";
import { soundKey } from "@/lib/estonian/sounds";
import { englishVariants, glossHeads, looksEnglish } from "./english";

/**
 * WHAT THE DICTIONARY HAS THAT IS CLOSE TO WHAT WAS TYPED.
 *
 * A search that finds nothing used to say so and open a form for adding the
 * word yourself. That is the right answer when the dictionary really has
 * nothing like it, and the wrong one the rest of the time: a learner typed
 * `championship`, the dictionary held `meistrivõistlused` glossed
 * "championships", and they were invited to add a word the app already had.
 * Being told to do somebody else's job with a word you could not find is the
 * screen making you feel stupid, which is what Sõnaveeb, the Institute's own
 * dictionary, is careful never to do: it answers a miss with what it thinks
 * you meant.
 *
 * So the dead end asks, over every entry the dictionary holds, the five ways a
 * search misses something that is there:
 *
 *   - **The English was in another shape.** "championship" against
 *     "championships", "running" against "to run", "color" against "color".
 *     See `lib/dict/english.ts`.
 *   - **The English was misspelled.** "chamiponship" is one letter swapped.
 *   - **The Estonian was misspelled.** A letter or two off, scaled to the
 *     length of the word, since two letters is a typo in `raamatukogu` and a
 *     different word in `kass`.
 *   - **The Estonian was heard rather than read.** `soundKey` is the rule the
 *     app already uses for that: a lenis stop written as a fortis one, a long
 *     sound written short.
 *   - **It is a compound the dictionary has the parts of.** An Estonian
 *     compound means what its last part means, narrowed: `meistrivõistlus` is
 *     a kind of `võistlus`. Offering the part is honest about what it is and
 *     is very often what the learner needed.
 *
 * Every suggestion is a headword this dictionary holds, so pressing one opens
 * an entry rather than another miss, and every one carries its own English, so
 * a learner can tell which they meant without opening all six.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock. The entries are
 * the ones `lib/dict/facts.ts` already keeps in memory, so on the dead end this
 * costs no query at all.
 */

/** An entry as this module needs to see it. */
export interface NearbyEntry {
  lemma: string;
  translation: string;
  pos: string;
  cefr: string | null;
}

/** Why a word was offered, so the screen can say so in a word rather than leave it to be guessed. */
export type NearbyReason =
  | "english"      // the English meaning, in another shape or with a slip in it
  | "translation"  // Wiktionary's English entry names it as the Estonian word
  | "spelling"     // a letter or two off
  | "sound"        // what somebody who only heard it might write
  | "part";        // part of the compound typed

export interface Nearby {
  lemma: string;
  /** The English beside it, the first two senses at most, or null where nothing is known yet. */
  gloss: string | null;
  why: NearbyReason;
}

/** How many words the row offers. Six fits on a phone in two lines and is still a choice rather than a list. */
export const NEARBY_LIMIT = 6;

/** The shortest dictionary word that may be offered as part of a compound. Below it, `ta` is part of everything. */
const PART_FLOOR = 4;

/**
 * How many letters off an Estonian spelling may be, by the length of what was
 * typed. One on a short word, because two letters turn `kass` into `kast`, a
 * different everyday word; two from five letters; three from eleven, where a
 * learner copying `raamatukogude` off a sign drops letters in the middle.
 */
export function spellingSlack(length: number): number {
  if (length <= 4) return 1;
  if (length <= 10) return 2;
  return 3;
}

/**
 * The same for an English word. None under six letters, because English is
 * dense with short words a letter apart (`house`, `horse`, `mouse`, `louse`)
 * and a slip there is as likely a different word as a typo.
 */
function englishSlack(length: number): number {
  if (length < 6) return 0;
  if (length <= 9) return 1;
  return 2;
}

/** The first two senses of a gloss, which is as much English as a suggestion row has room for. */
export function shortGloss(translation: string): string | null {
  const senses = translation.split(/\s*[,;]\s*/).map((s) => s.trim()).filter(Boolean);
  if (senses.length === 0) return null;
  return senses.slice(0, 2).join(", ");
}

interface Scored extends Nearby {
  score: number;
  /** The entry's band, so a common word leads a rare one equally close. */
  cefr: string | null;
}

/**
 * Words from the dictionary close to the query, best first.
 *
 * Scores are only ever compared with each other, so their size means nothing
 * beyond the order: an English meaning in another shape outranks one with a
 * slip in it, which outranks a spelling one letter off, which outranks two
 * letters off, a sound-alike and a compound part. Ties go to the shorter word
 * and then the alphabet, so the same query always offers the same row; the
 * comparator never returns 0 for two different lemmas, for the reason
 * `rankCandidates` gives about a comparator that does.
 */
export function nearbyEntries(
  query: string,
  entries: readonly NearbyEntry[],
  limit = NEARBY_LIMIT,
): Nearby[] {
  const raw = query.trim();
  if (!raw) return [];
  const folded = fold(raw.toLowerCase());
  const length = [...folded].length;
  const english = looksEnglish(raw);
  const variants = english ? englishVariants(raw) : [];
  const key = soundKey(raw);
  const slack = spellingSlack(length);

  const best = new Map<string, Scored>();
  const firstParts: NearbyEntry[] = [];
  let endsOnWord = false;
  const offer = (entry: NearbyEntry, why: NearbyReason, score: number) => {
    // The query itself is never offered back: a lemma spelled exactly as typed
    // would have been found, and offering it would be the search failing twice.
    if (entry.lemma.toLowerCase() === raw.toLowerCase()) return;
    const held = best.get(entry.lemma);
    if (held && held.score >= score) return;
    best.set(entry.lemma, { lemma: entry.lemma, gloss: shortGloss(entry.translation), why, score, cefr: entry.cefr });
  };

  /*
    THE ENGLISH IN ANOTHER SHAPE IS AN ANSWER, AND ONCE THERE IS ONE THE REST
    IS NOISE.

    Asked first and on its own, because where it finds anything the query was
    English and nothing spelled nearly like it in Estonian is what was meant:
    `running` matched "to run" and also ended on `ning`, the Estonian for
    "and", and `houses` matched "house" and was one letter from "louse",
    "mouse" and "horse". Offering those beside the answer turns a row that
    knows what you meant into six guesses.
  */
  if (english) {
    const shapes = new Set(variants);
    for (const entry of entries) {
      const at = headsOf(entry.translation).findIndex((head) => shapes.has(head));
      if (at >= 0) offer(entry, "english", at === 0 ? 100 : 92);
    }
    if (best.size > 0) return ranked(best, limit);
  }

  const allowedEnglish = englishSlack(raw.length);
  for (const entry of entries) {
    const lemma = fold(entry.lemma.toLowerCase());

    // A slip in the English, compared against every sense the entry has and
    // every shape of the query, so "chamiponships" still finds the entry
    // glossed "championship". Only on a word long enough that one letter is a
    // slip rather than a different word: `house` and `horse` are both English.
    if (english && allowedEnglish > 0) {
      let nearest = Infinity;
      for (const head of headsOf(entry.translation)) {
        for (const variant of variants) {
          if (Math.abs(variant.length - head.length) > allowedEnglish) continue;
          nearest = Math.min(nearest, editDistance(variant, head, allowedEnglish));
        }
      }
      if (nearest <= allowedEnglish) offer(entry, "english", 85 - nearest * 5);
    }

    // A spelling a letter or two off. Folded on both sides, so a missing õ
    // costs nothing here; the search already forgave that, and this is about
    // the letters it could not.
    let spelled = 0;
    if (Math.abs(lemma.length - folded.length) <= slack) {
      const distance = editDistance(folded, lemma, slack);
      if (distance <= slack) spelled = 80 - distance * 10;
    }

    /*
      Heard rather than read, which is the stronger reason when both hold:
      `pois` is one letter from `õis`, `köis` and `mõis` and is what somebody
      writes who heard `poiss`, so a sound-alike is lifted over the spellings
      that are merely as close.
    */
    if (key.length >= 2 && soundKey(entry.lemma) === key) {
      offer(entry, "sound", Math.max(spelled, 66) + 8);
    } else if (spelled > 0) {
      offer(entry, "spelling", spelled);
    }

    // Part of a compound. The last part carries the meaning in Estonian, so it
    // ranks above the first, and a longer part above a shorter one, which is
    // `võistlus` over `lus` and `raamatukogu` over `kogu`.
    if (lemma.length >= PART_FLOOR && lemma.length <= folded.length - 2) {
      if (folded.endsWith(lemma)) {
        offer(entry, "part", 40 + Math.min(lemma.length, 15));
        endsOnWord = true;
      } else if (folded.startsWith(lemma)) {
        firstParts.push(entry);
      }
    }
  }

  /*
    The first part only where the word also ends on one. A string that merely
    *starts* like a word is what any typo, any made-up string and any English
    word with an Estonian-looking head does, and `kontroll` offered for a
    string nobody could read is noise rather than help. A compound the
    dictionary has both ends of is a compound.
  */
  if (endsOnWord) {
    for (const entry of firstParts) offer(entry, "part", 30 + Math.min(fold(entry.lemma).length, 15));
  }

  return ranked(best, limit);
}

/**
 * The held suggestions best first. Equally close, a graded word leads an
 * ungraded one and an easier band a harder one, since `juba` is likelier what
 * somebody meant than a word the Wiktionary expansion holds and no course
 * teaches; then the shorter word, then the alphabet.
 */
function ranked(best: ReadonlyMap<string, Scored>, limit: number): Nearby[] {
  const band = (cefr: string | null) => cefr ?? "Z";
  return [...best.values()]
    .sort((a, b) =>
      b.score - a.score
      || band(a.cefr).localeCompare(band(b.cefr))
      || a.lemma.length - b.lemma.length
      || a.lemma.localeCompare(b.lemma, "et"))
    .slice(0, limit)
    .map(({ lemma, gloss, why }) => ({ lemma, gloss, why }));
}

/**
 * A gloss's senses as a query is compared against them, remembered per gloss.
 *
 * The dead end reads every entry's gloss once per search, and splitting six
 * thousand of them through `looseSenses` is most of what that costs. The
 * glosses are the dictionary's own and a few thousand of them, so the cache
 * is bounded by the dictionary rather than by anything a visitor types; the
 * cap is there for the day it is not.
 */
const HEADS = new Map<string, string[]>();
const HEADS_MAX = 20_000;

function headsOf(translation: string): string[] {
  let heads = HEADS.get(translation);
  if (!heads) {
    heads = glossHeads(translation);
    if (HEADS.size >= HEADS_MAX) HEADS.clear();
    HEADS.set(translation, heads);
  }
  return heads;
}

/**
 * Several lists of suggestions as one row, the earlier lists first, each lemma
 * once. The order the caller passes them in is the argument: a word Wiktionary
 * names as the Estonian for an English query is a stronger answer than one
 * spelled nearly like it.
 */
export function mergeNearby(lists: readonly (readonly Nearby[])[], limit = NEARBY_LIMIT): Nearby[] {
  const out: Nearby[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.lemma)) continue;
      seen.add(item.lemma);
      out.push(item);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
