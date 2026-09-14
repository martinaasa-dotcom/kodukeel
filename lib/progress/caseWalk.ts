import { prisma } from "@/lib/db";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { DEMO_LEMMAS, DEMO_STEMS, type DemoStems } from "@/lib/collections/demoWords";
import { parseExamples, sentenceContaining } from "@/lib/dict/examples";
import { CASES, caseByKey } from "@/lib/estonian/cases";
import {
  buildCaseTable, followsEndingRule, stemsFrom, type DerivedForm, type NounStems,
} from "@/lib/estonian/derive";
import { caseFits, caseQuestionFor, type CaseSubject } from "@/lib/estonian/caseQuestion";
import { caseExamplesFor, type CaseExample } from "@/lib/progress/caseExamples";
import type { CaseKey } from "@/lib/estonian/types";

/**
 * ONE WORD, WALKED THROUGH THE WHOLE SYSTEM, WITH REAL ESTONIAN AT EVERY STEP.
 *
 * `/grammar` is a reference: fourteen cards, each explaining one ending, read
 * by somebody who already knows which ending they are after. This is the thing
 * that comes before it, for somebody who has just been told Estonian has
 * fourteen cases and has decided that sounds impossible. The claim it has to
 * land is the one the language actually offers: three forms are memorized, and
 * the other eleven are the second of those three with a fixed ending glued on,
 * the same ending for every word in the language.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING HERE IS GENERATED. The words are the
 * five the landing page already asks the dictionary about, the forms come out
 * of `buildCaseTable`, which is the function the dictionary entry and the
 * flashcard builder use, and every sentence is one a lexicographer recorded
 * against the word it is filed under. The English prose lives in
 * `lib/estonian/grammar.ts` and is read by the screen, not shipped from here,
 * so this module holds no Estonian of its own at all (ADR-005).
 *
 * THE FIVE WORDS ARE THE ODD ONES ON PURPOSE, and `lib/collections/demoWords.ts`
 * argues that at length: `raamat` does nothing, `tuba` swaps its vowel, `sõber`
 * has two stems that disagree with each other. A walkthrough that only ever
 * showed a regular word would be teaching the arithmetic and hiding the one
 * thing that makes a beginner doubt it, which is that the form the ending goes
 * on is not the word they looked up.
 *
 * THE SENTENCE UNDER A CASE IS THE POINT OF THE SCREEN. An ending with a gloss
 * beside it is a table; an ending inside a sentence somebody wrote is the case
 * doing its job. The word on the walk supplies that sentence wherever the
 * dictionary has one for it, and where it does not, `caseExamplesFor` finds a
 * real word in that case with a sentence behind it, and the row says which
 * word it is about. Never a sentence built here, and never one about a word
 * that does not take the case: `caseFits` is what decides that, one reader for
 * the whole app (`lib/estonian/caseQuestion.ts`).
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

/**
 * The fallback sentence for one case: a real word in it, from the dictionary.
 *
 * Word-independent on purpose. It is here to answer "what does this ending
 * actually mean", and the honest answer is a sentence using it, whichever word
 * the lexicographer happened to be illustrating.
 */
export type CaseSentence = Readonly<Record<string, WalkSentence | undefined>>;

export interface CaseWalk {
  readonly words: readonly WalkWord[];
  readonly sentences: CaseSentence;
}

/**
 * How many real sentences to look at per case before settling for one.
 *
 * More than one, because the first is not always the clearest: Estonian
 * spells the short illative like the genitive for most of the words that have
 * one, so `Endisaegsed Soome mündid` is a sentence carrying the illative of
 * `Soome` and showing nothing whatever about the ending. `unmistakable` is
 * what tells those apart and it needs a few to choose between.
 */
const PER_CASE = 6;

export async function caseWalk(ownerId: string): Promise<CaseWalk> {
  /*
    All fourteen, the three memorized included. The first act of the screen
    explains what the nimetav, the omastav and the osastav are *for*, and a
    sentence using one is worth more there than anywhere else: "a finished,
    whole object" is a grammatical claim, and somebody reading it in a line a
    lexicographer wrote has met the thing rather than the description.
  */
  const keys = CASES.map((c) => c.key);

  const [words, examples] = await Promise.all([
    walkWords(),
    caseExamplesFor(ownerId, keys, PER_CASE)
      // A sentence is the best row on the screen and is not the screen: a
      // database having a bad minute costs the page its examples and not the
      // system it is explaining.
      .catch((): Map<CaseKey, CaseExample[]> => new Map()),
  ]);

  const sentences: Record<string, WalkSentence | undefined> = {};
  for (const key of keys) {
    const shown = (examples.get(key) ?? []).filter((e) => e.sentence && e.sentenceForm);
    // A form no other case of the word is spelled like, where the dictionary
    // has one. See `PER_CASE` and `CaseExample.unmistakable`.
    const found = shown.find((e) => e.unmistakable) ?? shown[0];
    if (!found?.sentence || !found.sentenceForm) continue;
    sentences[key] = {
      et: found.sentence.et,
      en: found.sentence.en,
      form: found.sentenceForm,
      lemma: found.lemma,
      translation: found.translation,
    };
  }

  return { words, sentences };
}

/**
 * The five words, read out of the dictionary, falling back to the seed stems.
 *
 * The same shape the landing page's own case explorer takes and for its
 * reason: a page that explains the language has to render whether or not the
 * database behind it is having a good minute, and a fresh deployment builds
 * before anything is seeded. The fallback carries principal parts copied from
 * the seed and checked against the built dictionary by
 * `scripts/test-invariants.ts`; every other form on the screen is derived from
 * them by the same function the live path uses.
 */
async function walkWords(): Promise<WalkWord[]> {
  try {
    const lexemes = await prisma.lexeme.findMany({
      where: { lemma: { in: [...DEMO_LEMMAS] }, pos: "NOUN" },
      select: {
        id: true, provenance: true,
        lemma: true, translation: true, pos: true, semanticTypes: true, examples: true,
        forms: { select: { formType: true, value: true, morphCode: true } },
      },
    });
    const built = oneEntryPerLemma(lexemes, [...DEMO_LEMMAS]).flatMap((lex) => {
      const stems = stemsFrom(lex.forms);
      const subject: CaseSubject = {
        lemma: lex.lemma,
        semanticTypes: lex.semanticTypes,
        nomSg: stems.nomSg ?? null,
      };
      return [toWalkWord(lex.lemma, lex.translation, stems, subject, parseExamples(lex.examples))];
    });
    if (built.length > 0) return built;
  } catch {
    // A page that teaches the case system is a reference, and a reference
    // renders. See the header.
  }
  return DEMO_STEMS.map(fromSeed);
}

/** The same word off the checked seed stems, with no sentences to show. */
function fromSeed(w: DemoStems): WalkWord {
  const subject: CaseSubject = { lemma: w.lemma, semanticTypes: w.semanticTypes, nomSg: w.nomSg };
  // No gloss is stored beside the stems, and a gloss invented here would be
  // the one authored column in the pipeline written by the wrong hand. The
  // screen prints nothing where there is nothing.
  return toWalkWord(w.lemma, "", w, subject, []);
}

function toWalkWord(
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
