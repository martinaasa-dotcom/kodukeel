import { parseExamples, sentenceContaining } from "@/lib/dict/examples";
import { caseByKey } from "./cases";
import {
  asksAboutPerson, caseFits, caseIsUnsaidFor, caseQuestionFor, type CaseSubject,
} from "./caseQuestion";
import { caseReading } from "./caseReading";
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
 * the prose explaining a case lives in `lib/estonian/grammar.ts`, which the
 * screen reads for itself. The one thing composed here is English: a row
 * carries what the word means wearing that ending, out of a frame per case and
 * the entry's own gloss (`lib/estonian/caseReading.ts`). This module holds no
 * Estonian of its own at all (ADR-005).
 */

/** One of the eleven, for one word. */
export interface WalkForm {
  readonly key: CaseKey;
  /** The ending, without its hyphen. Empty for the three that have none. */
  readonly suffix: string;
  /** The question *this word* answers with this case, pronoun only. */
  readonly question: string;
  /**
   * This word in this case, in plain English, or null where nothing fits.
   *
   * The half a learner can cash in the moment the ending arrives. `raamatult`
   * is a word the screen has just built out of two pieces and "off the book"
   * is what it means; the case's own explanation, four lines down, is about
   * the ending rather than about the word. Composed here rather than on the
   * screen because this is the module holding both halves of it, the word's
   * gloss and what the Institute says the word is, and the screen holding
   * neither. See `lib/estonian/caseReading.ts` for what is refused and why.
   */
  readonly reading: string | null;
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
   * Why the language does not put this word in this case, or null where it does.
   *
   * `caseIsUnsaidFor`, which is the deleter's question rather than the
   * builder's and asks for positive evidence: `mehes` is a form nobody says
   * and `toale` is ordinary Estonian the builder happens not to choose for a
   * room. Deliberately **not** the negation of `askable`, which is false for
   * the three that are stored and for `tuppa`, a form people very much say.
   *
   * The row is still shown, because a table of forms is a reference. What the
   * screen owes it is a sentence, and until this existed it had none: the card
   * built `mehes`, printed "Being inside something, and being in a month or a
   * mood" under it, and left a learner to conclude that is how you say it.
   * That is the fault `lib/estonian/caseQuestion.ts` was written for, standing
   * on the one screen whose whole job is explaining the case system.
   *
   * TWO REASONS, AND THE SENTENCE HAS TO BE TRUE OF BOTH. `caseIsUnsaidFor`
   * fires for a word the Institute calls a person and for a lemma ending in
   * `-maa`, which is a country, an island or a county. The first version of
   * the line said "Estonian puts a person on the endings under On top", which
   * is false about Germany: the same fault as the osastav reading a commit
   * earlier, committed inside the fix for it.
   *
   * So the row says which, and `"other"` is deliberately not "a place". What
   * is *known* here is that the word is not a person, since `asksAboutPerson`
   * is the owner's own answer; that it is therefore a `-maa` word is an
   * inference off `caseIsUnsaidFor` having exactly two disjuncts today, and an
   * inference the screen would keep making silently if a third were added. The
   * copy behind `"other"` names no class for that reason, so a third reason
   * degrades to a sentence that is still true rather than to a wrong one.
   *
   * `caseIsUnsaidFor` itself is untouched: it decides what `npm run
   * audit:decks --write` removes from a learner's deck, and nothing about a
   * line of English is worth reshaping that.
   */
  readonly unsaid: "person" | "other" | null;
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
      reading: translation ? caseReading(spec.key, translation, subject) : null,
      value,
      alsoRight: form.alsoRight,
      stored,
      unsaid: caseIsUnsaidFor(spec.key, subject)
        ? (asksAboutPerson(subject) ? "person" : "other")
        : null,
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
