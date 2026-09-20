import { caseReading } from "./caseReading";
import { stemsFrom, type NounStems } from "./derive";
import { caseFromMorphCode, morphCodeOf, numberFromMorphCode } from "./morph";
import { plainAsk } from "./plainAsk";
import { isPersonalPronoun, pronounReading } from "./pronouns";
import { caseIndex, readCase } from "./whichCase";
import type { CaseKey } from "./types";

/**
 * WHAT THE SPELLING IN FRONT OF SOMEBODY MEANS, IN AS FEW ENGLISH WORDS AS ARE
 * TRUE.
 *
 * `/grammar/build-a-word` answered this for a word the reader had just built:
 * `raamatu + -lt = raamatult`, and under it "off the book", because a learner
 * watching an ending arrive cannot cash it in until somebody says so. Every
 * other screen that names a form still answered it with the form's *name*.
 * A learner tapped `Ta` in `Ta armastab mind`, read `tema · SgN · he, she`,
 * and reported the panel as making no sense; and tapping `mind` gave them the
 * headword's whole gloss, which is both answers with no way of telling which
 * one this is. It is "me".
 *
 * So this is the one reading of a form, for the panel under a sentence and for
 * anything else that holds a spelling and the entry it belongs to. It composes
 * nothing of its own: the pronouns are `lib/estonian/pronouns.ts`, the cases
 * are `caseReading`, which is the build-a-word phrase itself, and where
 * neither has a phrase the clause is `plainAsk`'s, which is the same sentence
 * a flash card prints over the box. Three tables, one answer, so a screen
 * cannot disagree with the screen next door about what `toas` means.
 *
 * NOTHING HERE IS ESTONIAN AND NOTHING IS GENERATED. Every string it returns
 * is authored English about a slot, or the entry's own gloss dropped into an
 * authored frame (ADR-005). `null` is an answer rather than a gap: a screen
 * with no reading prints the form's name and the entry's gloss, which is what
 * every screen here drew before this existed.
 *
 * Pure: no React, no Next, no Prisma, no Estonian.
 */

/** The entry a spelling belongs to, as every caller already holds one. */
export interface WordSeen {
  readonly lemma: string;
  readonly pos: string;
  /** The dictionary's own English, which is the one authored column. */
  readonly gloss: string;
  /** Ekilex's semantic type codes, for the person-or-thing half of a case reading. */
  readonly semanticTypes: string | null;
  /** Every form the entry holds, which is what the spelling is read against. */
  readonly forms: readonly FormRow[];
}

/** A form as either shape of row spells it: a live fetch, or the seed's `EKILEX:` prefix. */
export interface FormSeen {
  readonly formType?: string | null;
  readonly morphCode?: string | null;
}

/** One stored row, in the shape `stemsFrom` and `morphCodeOf` both read. */
export interface FormRow extends FormSeen {
  readonly value: string;
}

/** A reading and the sentence under it, which are one question about one form. */
export interface FormText {
  /** What the spelling means, in as few English words as are true. */
  readonly reading: string | null;
  /** What the form is for, where no phrase reads it. `plainAsk`'s own clause. */
  readonly clause: string | null;
}

const NOTHING: FormText = { reading: null, clause: null };

/**
 * WHICH CASE THIS SPELLING IS, UNDER THE STRICT RULE, OR NOTHING.
 *
 * `readCase` is that rule and it is the reason this is not a lookup on the
 * code the match came back with. `kohvi` is stored as the omastav of `kohv`
 * and is also its osastav, so a panel keyed on the matched row would have read
 * `Ma joon kohvi` as "of the coffee", which is the wrong half of a word the
 * learner is looking straight at. Exactly one case spells it that way, or
 * nothing is said: the same discipline that decides whether a gap may be cut
 * for a case at all.
 *
 * A spelling the index does not hold at all falls back to the form the match
 * came back with, which is what carries the parallel short forms: `ma` is a
 * second nominative of `mina` and the index holds only the principal one.
 */
function caseOf(stems: NounStems, form: FormSeen, spelling: string): CaseKey | null {
  const verdict = readCase(caseIndex(stems), spelling);
  if (verdict.kind === "one") return verdict.key;
  if (verdict.kind === "shared") return null;
  return caseFromMorphCode(morphCodeOf(form));
}

/**
 * What to say about the spelling somebody tapped: the phrase, or the clause.
 *
 * Both answers come out of one resolution of the form, because they are one
 * question asked at two lengths and a caller holding two functions would be a
 * caller that can print a reading of one case under the name of another.
 *
 * A PLURAL GETS NO FRAME, which is a limit of the frames rather than of the
 * language: `caseReading` drops one English noun into "in the %", and the
 * gloss it is given is the headword's, which is singular. "in the room" over
 * `tubades` is wrong in the one way a learner cannot catch, so the plural
 * keeps its name and its clause. The pronouns are exempt from that, because
 * `meie`, `teie` and `nemad` are headed by their plural and the table names
 * the word rather than the number.
 */
export function readForm(form: FormSeen, word: WordSeen, spelling: string): FormText {
  /*
    THE HEADWORD IS ITS OWN ANSWER, AND THE DICTIONARY ALREADY WROTE IT.

    A frame over the nominative reads `mees` as "the man", which is narrower
    than the gloss beside it ("man, husband") and buys an article nobody asked
    for. This exists for the spelling that is *not* the word a learner looked
    up; where the sentence spelled the headword, what the entry says about
    itself is what the panel prints, exactly as it did before any of this.
  */
  if (spelling.trim().toLocaleLowerCase("et") === word.lemma.toLocaleLowerCase("et")) {
    return NOTHING;
  }
  /*
    Read once and read here, because the two questions below are both about
    this one table: which case the spelling is, and what the word's own
    nominative singular is. `stemsFrom` is the one reading of a form list and
    finding `NOM_SG` a second way beside it is how two answers start.
  */
  const stems = stemsFrom(word.forms);
  const code = morphCodeOf(form);
  const key = caseOf(stems, form, spelling);

  /*
    A pronoun is the table's or it is nothing. `see` is "this, it" in every
    role English has, so a frame over its gloss can only ever produce "in the
    this", and `kes` and `mis` are the same. The six the table does name are
    the ones English spells four ways.
  */
  if (word.pos === "PRONOUN") {
    const reading = key && isPersonalPronoun(word.lemma)
      ? pronounReading(word.lemma, key)
      : null;
    return reading ? { reading, clause: null } : { reading: null, clause: clauseFor(key, code) };
  }

  const plural = numberFromMorphCode(code) === "PLURAL";
  const reading = key && !plural
    ? caseReading(key, word.gloss, {
      lemma: word.lemma,
      semanticTypes: word.semanticTypes,
      // The stored principal part, which is what `CaseSubject` asks for: a
      // headword that is its own plural (`prillid`) has none, and that is the
      // fact the field carries.
      nomSg: stems.nomSg ?? null,
    })
    : null;
  return reading ? { reading, clause: null } : { reading: null, clause: clauseFor(key, code) };
}

/**
 * The sentence under the name, for a form no phrase reads.
 *
 * This is the other half of what the report was about. The osastav gets no
 * frame at all and says so at length in `caseReading`'s own table, so `mind`
 * had its pronoun reading and `raamatut` had nothing whatever beside a name in
 * two languages a beginner has met neither of. `plainAsk` has answered that
 * for a flash card since it was written, in the words somebody would use out
 * loud, and the answer is the same answer on a panel.
 *
 * Keyed on the case where one was settled and on the code otherwise, since
 * `plainAsk`'s table holds both: a card asks for a case by key and a verb by
 * code. A spelling more than one case claims is given neither, for the reason
 * `caseOf` refuses to name it.
 */
function clauseFor(key: CaseKey | null, code: string | null): string | null {
  if (key) return plainAsk(key);
  return code ? plainAsk(code) : null;
}
