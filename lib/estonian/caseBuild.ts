import { parseExamples, sentenceContaining } from "@/lib/dict/examples";
import { caseByKey } from "./cases";
import { caseFits, caseQuestionFor, type CaseSubject } from "./caseQuestion";
import { buildCaseTable, followsEndingRule, type DerivedForm, type NounStems } from "./derive";
import type { CaseKey } from "./types";

/**
 * ONE WORD, SHAPED INTO THE WALK `/grammar/build-a-word` DRAWS.
 *
 * The screen's whole claim is that three forms are stored per word and the
 * other eleven are the second of those three with a fixed ending glued on.
 * What this module decides is the three things a row has to say for that claim
 * to be honest on every word: which form to print, whether the ending really
 * reaches it, and whether the reader may be asked to produce it.
 *
 * PURE, AND SPLIT OFF FOR THAT REASON. `lib/progress/caseWalk.ts` is the half
 * that reads the dictionary and may import Prisma; every judgment on this side
 * is a function of stems the caller already holds, so it is unit tested rather
 * than driven in a browser. Both halves were one file first, which put the
 * three claims above behind a database.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING HERE IS GENERATED. The forms come out of
 * `buildCaseTable`, which is the function the dictionary entry and the
 * flashcard builder use; the sentences are ones a lexicographer recorded; and
 * the English about a case lives in `lib/estonian/grammar.ts`, which the screen
 * reads for itself. This module holds no Estonian of its own at all (ADR-005).
 */

/** One of the eleven, for one word. */
export interface WalkForm {
  readonly key: CaseKey;
  /** The ending, without its hyphen. Empty for the three that have none. */
  readonly suffix: string;
  /** The question *this word* answers with this case, pronoun only. */
  readonly question: string;
  /** The form to print. */
  readonly value: string;
  /** The other spelling that is also right, where Estonian has one. */
  readonly alsoRight: string | null;
  /**
   * The printed form is not the stem plus this ending, so no rule reaches it
   * and the dictionary holds it: `tuppa`, `kätte`. The screen says so in
   * words, because lighting an ending here would light a rule the word does
   * not follow.
   */
  readonly stored: boolean;
  /**
   * May the screen ask a learner to produce this form?
   *
   * `caseFits`, so a person is never asked for the inside trio: `sõber` and
   * `mees` are people and `sõbras` is not how anybody says it. The row is
   * still *shown*, because a table of forms is a reference and the dictionary
   * entry prints the whole of it.
   */
  readonly askable: boolean;
  /** This word's own attested sentence carrying this very form, if one exists. */
  readonly sentence: WalkSentence | null;
}

export interface WalkSentence {
  readonly et: string;
  readonly en: string | null;
  /** The form the sentence actually contains, for the screen to mark in it. */
  readonly form: string;
  /** The word the sentence is filed under, where that is not the word on the walk. */
  readonly lemma: string | null;
  readonly translation: string | null;
}

/** A word to walk: its three memorized forms, and the eleven that follow. */
export interface WalkWord {
  readonly lemma: string;
  readonly translation: string;
  /** The stem every ending below is glued onto. */
  readonly genitive: string | null;
  /** The three principal parts, in the order a schoolbook drills them. */
  readonly principal: readonly WalkForm[];
  /** The other eleven, in the traditional order. */
  readonly derived: readonly WalkForm[];
}

export function toWalkWord(
  lemma: string,
  translation: string,
  stems: NounStems,
  subject: CaseSubject,
  examples: ReturnType<typeof parseExamples>,
): WalkWord {
  const table = buildCaseTable(stems);
  const row = (form: DerivedForm): WalkForm => {
    const spec = form.spec;
    const value = form.singular ?? "";
    /*
      Whether the ending really reaches this form. `followsEndingRule` is the
      one answer to that and it lives in `derive.ts`, which owns the join; its
      header says why `origin` is not the test.
    */
    const stored = !spec.principal && !followsEndingRule(value, stems.genSg, spec);
    const found = value ? sentenceContaining(examples, value) : null;
    return {
      key: spec.key,
      suffix: spec.suffix,
      question: caseQuestionFor(spec, subject),
      value,
      alsoRight: form.alsoRight,
      stored,
      askable: !spec.principal && !stored && caseFits(spec.key, subject),
      sentence: found
        ? { et: found.et, en: found.en ?? null, form: value, lemma: null, translation: null }
        : null,
    };
  };

  const rows = table.filter((f) => f.singular).map(row);
  return {
    lemma,
    translation,
    genitive: stems.genSg ?? null,
    principal: rows.filter((r) => caseByKey(r.key)?.principal),
    derived: rows.filter((r) => !caseByKey(r.key)?.principal),
  };
}
