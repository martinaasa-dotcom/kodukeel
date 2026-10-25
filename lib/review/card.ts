/**
 * WHAT A REVIEW CARD IS ON THE WIRE, AND THE SESSION A DEVICE KEEPS OF THEM.
 *
 * The page assembles a `ReviewCard` on the server (`app/(app)/review/cards.ts`),
 * the session draws it (`ReviewSession.tsx`), and the offline store keeps the
 * last session's cards so there is something to review with the network gone
 * (`lib/offline/db.ts`). The shape lived in the client component, so the
 * offline store reached into a page for a type, and a native app, which keeps
 * the same cached session in its own store, would have had to do the same.
 * It lives here now, beside the rule for how long a kept session is worth
 * anything, and both sides read it.
 *
 * Pure: no React, no Next, no Prisma, and no browser API. The imports below
 * are types and are erased before anything runs.
 */

import type { ShownMeaning } from "@/lib/collections/glossLanguage";
import type { GlossedToken } from "@/lib/dict/glossed";
import type { Contrast } from "@/lib/progress/contrast";
import type { SchedulingState } from "@/lib/srs/scheduler";

export interface ReviewCard {
  id: string;
  cardType: string;
  front: string;
  back: string;
  hint: string | null;
  targetCase: string | null;
  /** The conjugation slot a CONJUGATION card is about, as `CONJUGATION_SLOTS` spells it. */
  slot: string | null;
  lemma: string | null;
  /**
   * The dictionary entry behind the card, for the favorite button.
   *
   * Null on the handful of cards with no entry behind them, which is what the
   * `lemma` above is null on too, and the star is simply not drawn there:
   * there is nothing to keep.
   */
  lexemeId: string | null;
  /**
   * Other forms of this word, so another ending is not marked as a slip.
   *
   * `checkAnswer` reads anything within one edit as a typo and marks it as
   * produced, and every pair of Estonian cases is one letter apart: measured
   * over the shipped dictionary, 47,982 of 51,513 case answers have another
   * case of the same word one edit away. So the card told a learner who wrote
   * the seestütlev that they had mistyped the seesütlev, graded it Hard, and
   * wrote it into the append-only log as a recall. `lib/games/flash.ts` names
   * this fault and fixes it for its own round by asking the word's forms
   * first; these are those forms, on the screen a learner opens every day.
   *
   * Empty on a card with no entry behind it, and on a recognition card, whose
   * answer is English.
   */
  rivals: string[];
  /**
   * Every other spelling of the word, on a card asking for the word from its
   * meaning. There another form is the word recalled rather than a miss:
   * `usaldada` typed for "to trust" is the other infinitive, which the marker
   * says, where the slip rule called it one letter out of `usaldama`.
   *
   * Empty on every other card, and on a session stashed before this existed.
   */
  kin: string[];
  /** Whether this word is already one of the learner's favorites. */
  starred: boolean;
  isNew: boolean;
  /**
   * Whether the learner has already met this word on another of its cards.
   *
   * A word is taught on the Learn ladder through its recognition card alone:
   * met, picked out of four, then typed. Its production card is still New
   * afterwards, so the closing round of the same evening introduced it again
   * as a "New word", with the meeting screen, the "ask me later" button and
   * the line saying it is fine not to know it yet, about a word typed two
   * minutes earlier. Read on the server off the word's other cards, so it is
   * a fact about the learner rather than about this session. Optional only
   * for a session stashed offline before the field existed, which reads as
   * not met and keeps the meeting, which is the safe direction.
   */
  wordMet?: boolean;
  /**
   * What to show the first time this word is met, assembled by the page out of
   * the dictionary. Null on a card that has been seen, and on the rare card
   * with no dictionary entry behind it.
   */
  intro: {
    lemma: string;
    gloss: string;
    /**
     * The Institute's own equivalent in the learner's chosen language, or null.
     *
     * The first meeting is the one screen where this earns the most: it is the
     * moment the word is being learned rather than tested, and somebody who
     * already speaks Russian or Ukrainian reaches the meaning in one step
     * instead of two. Beside the English rather than instead of it, since the
     * English is the gloss every entry has. Comes from Ekilex, like the
     * sentence under it.
     */
    equivalent: { text: string; lang: string } | null;
    /** The other of Russian and Ukrainian, small after the first, where the learner asked for it. */
    also?: { text: string; lang: string } | null;
    /** An attested sentence, and which form of the word it carries. */
    sentence: { et: string; en: string | null; form: string | null; authored: boolean } | null;
    /** The entry it hangs off, so the sentence can be asked about in English. */
    lexemeId: string | null;
    /**
     * That sentence with the dictionary under every word it will vouch for.
     *
     * Ekilex holds no English for most usages, so the sentence that is meant to
     * show a word behaving was six unreadable words around one glossed one.
     * Null where the page did not look, which is a different thing from a
     * sentence nothing in the dictionary could be said about. See
     * `lib/dict/glossed.ts`.
     */
    tokens: GlossedToken[] | null;
    /**
     * The everyday spelling of a pronoun, where the word has one.
     *
     * `mina` and `ma` are one word twice: the card teaches the headword and
     * every sentence under it says the other one. Read off the entry's own
     * stored forms, never written (see `lib/estonian/pronouns.ts`).
     */
    alsoSaid: string | null;
    /** Whether this deployment has a model that could translate the whole line. */
    canTranslate: boolean;
    /**
     * Whether the entry is a whole utterance rather than a word.
     *
     * `Tere!` and `Kuidas läheb?` have no example sentence and never will, and
     * saying "no example sentence for this one yet" about them told a beginner
     * the app had let them down on twenty of the first cards it ever shows.
     */
    isPhrase: boolean;
    /** The word's own band, so `WordIntro` can decide whether to show a sentence at all. */
    cefr: string | null;
    /** Whether this is the very first word this learner has ever met, anywhere in the app. */
    firstCardEver: boolean;
  } | null;
  /** Four options including the right one, when this card can be asked as multiple choice. */
  choices: string[] | null;
  /**
   * The card's English meaning as the learner's language leads it: the back of
   * a recognition card, the prompt of a production card. Null where the
   * learner reads meanings in English or the Institute recorded no equivalent,
   * which draws exactly what the card drew before. Drawing only: the back and
   * the front are still what a typed answer and a pick are marked against.
   * Optional for a session stashed offline before the field existed.
   */
  meaning?: ShownMeaning | null;
  /**
   * How each of `choices` is drawn, index for index, or null for English.
   * Every option leads in the equivalent or none does (`meaningsShown`), so the
   * presence of Ukrainian never singles one out. A pick is still `choices[i]`.
   */
  choiceMeanings?: ShownMeaning[] | null;
  scheduling: Omit<SchedulingState, "due" | "lastReview"> & { due: string; lastReview: string | null };
  /**
   * The stored English translation of a `CLOZE` card's own sentence, matched
   * off the lexeme's examples. Null on every other card type, and on a CLOZE
   * card whose sentence has not been translated yet.
   */
  sentenceEn: string | null;
  /**
   * The one line a bare form card asks with, `Say “with the bird”`, or null.
   *
   * Where this is set it replaces the question word, the plain clause and the
   * form's name before the answer: one instruction rather than four lines of
   * grammar. The name comes back after the answer, as the thing to remember.
   */
  say: string | null;
  /** Whether this deployment has a model that could translate the sentence. */
  canTranslate: boolean;
  /**
   * The other words that mean what a production card's prompt says, with
   * this card's own word beside them, so a learner who types one of them is
   * told it works and shown how the two differ. Null on every other card and
   * on a production card with no neighbor. See `lib/questions/neighbours.ts`.
   */
  contrast: Contrast | null;
}


/** The last session's cards, as a device keeps them for a visit with no connection. */
export interface StashedSession {
  cards: ReviewCard[];
  /** When they were kept, in milliseconds since the epoch. */
  stashedAt: number;
}

/** A stash older than this is not worth reviewing: the schedule has moved on. */
export const STASH_MAX_AGE_MS = 3 * 86_400_000;

/**
 * The cards a kept session can still offer at `now`, or none.
 *
 * A stash that is missing, malformed or older than `STASH_MAX_AGE_MS` offers
 * nothing, which is the empty state rather than a review of a schedule that
 * has since moved on.
 */
export function stashedCards(stash: StashedSession | null | undefined, now: number): ReviewCard[] {
  if (!stash || !Array.isArray(stash.cards)) return [];
  if (now - stash.stashedAt > STASH_MAX_AGE_MS) return [];
  return stash.cards;
}
