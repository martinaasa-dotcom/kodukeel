import { plainPhrase } from "@/lib/copy/values";
import { buildCloze, naturalSentence, nominalOpener } from "@/lib/estonian/cloze";
import { gapForms } from "@/lib/estonian/gapForms";
import { ekilexCodeOf, numberFromMorphCode } from "@/lib/estonian/morph";
import { usableExamples, type Example, type Rank } from "@/lib/dict/examples";

/**
 * A printable worksheet for one unit.
 *
 * The feature a real Estonian course asks for and no flashcard app has: paper.
 * Teachers hand out worksheets, and a course that lives only behind a login is
 * a course half the class does at home and nobody does in the room. This turns
 * a unit into a sheet with an answer key on the back.
 *
 * Every exercise is built from material the dictionary already holds — attested
 * sentences from Ekilex, principal parts from the seed — and nothing is
 * generated. A gap-fill is a real sentence with one of its own words hidden; a
 * case table is a table with cells left out. That is the whole trick, and it is
 * the same one the cloze cards use (ADR-005, ADR-017).
 *
 * Deterministic on purpose. Printing the same unit twice has to produce the same
 * sheet, or a class ends up comparing answers to two different worksheets.
 */
export interface WorksheetWord {
  lemma: string;
  translation: string;
  pos: string;
  /**
   * `morphCode` is optional so a caller that has not fetched it still
   * compiles; `firstGap` reads it to keep a plural out of the gap-fill (see
   * its own comment), and a row with none is read as not plural rather than
   * refused.
   */
  forms: readonly { formType: string; value: string; morphCode?: string | null }[];
  examples: readonly Example[];
  /**
   * How this word's attested sentences are ordered, where the caller has an
   * opinion. A sheet is printed for a class and worked through on paper, so
   * nobody can ask about a sentence afterwards: a beginner's word takes its
   * plainest recorded sentence rather than its shortest. See
   * `lib/dict/plainness.ts`. Absent leaves the order exactly as it was.
   */
  plainest?: Rank;
}

export interface VocabularyItem {
  lemma: string;
  translation: string;
}

export interface GapItem {
  /** The sentence with one word replaced by a blank. */
  text: string;
  /** The word that was taken out. */
  answer: string;
  /** The dictionary form of the word, given so the exercise tests the form. */
  hint: string;
  english: string | null;
}

export interface CaseRow {
  lemma: string;
  nominative: string;
  genitive: string;
  partitive: string;
  /** Which cells are printed blank for the learner to fill in. */
  blanks: readonly ("genitive" | "partitive")[];
}

export interface Worksheet {
  vocabulary: VocabularyItem[];
  gaps: GapItem[];
  cases: CaseRow[];
  /** True when there is nothing at all to print. */
  empty: boolean;
}

export interface WorksheetLimits {
  vocabulary?: number;
  gaps?: number;
  cases?: number;
}

const DEFAULTS: Required<WorksheetLimits> = { vocabulary: 12, gaps: 8, cases: 6 };

export function buildWorksheet(words: readonly WorksheetWord[], limits: WorksheetLimits = {}): Worksheet {
  const max = { ...DEFAULTS, ...limits };

  const vocabulary: VocabularyItem[] = words
    .filter((w) => w.translation.trim().length > 0)
    .slice(0, max.vocabulary)
    .map((w) => ({ lemma: plainPhrase(w.lemma, w.pos), translation: plainPhrase(w.translation, w.pos) }));

  const gaps: GapItem[] = [];
  for (const word of words) {
    if (gaps.length >= max.gaps) break;
    const gap = firstGap(word);
    if (gap) gaps.push(gap);
  }

  const cases: CaseRow[] = [];
  for (const word of words) {
    if (cases.length >= max.cases) break;
    const row = caseRow(word, cases.length);
    if (row) cases.push(row);
  }

  return {
    vocabulary,
    gaps,
    cases,
    empty: vocabulary.length === 0 && gaps.length === 0 && cases.length === 0,
  };
}

/**
 * `NOM_PL`, `GEN_PL` and `PART_PL` by name, for a row Ekilex never gave a
 * `morphCode`. Everything else plural is read off the code itself, below.
 */
const UNTAUGHT_PRINCIPAL_PARTS = ["NOM_PL", "GEN_PL", "PART_PL"];

/**
 * The plurals nobody has been taught, so `firstGap` never hides one.
 *
 * No unit in this course teaches how Estonian forms a plural
 * (`docs/13-mvp-status.md` names the B1 tier that would as not built yet), so
 * a worksheet handed to a class as the paper version of a unit may not ask
 * for one: a blank wanting `sõbrad` on a sheet about `sõber` is a question
 * the class was never given the tools to answer.
 *
 * The three named principal parts are the case a caller has no `morphCode`
 * for, and most of the time it has one: `caseFromMorphCode` reads `SgIn` and
 * `PlIn` alike as the *singular* `INESSIVE`, "ignoring number" by its own
 * comment, so an enriched entry's stored plural paradigm — `tubadega`,
 * `morphCode` `PlKom`, a real row (`lib/dict/edit.itest.ts`) — would
 * otherwise sit in `gapForms`'s output labelled exactly like its singular
 * and be offered as a gap the same way. `lib/progress/caseExamples.ts`
 * already guards this with `numberFromMorphCode(...) === "SINGULAR"`; this
 * is the same guard read the other way round, catching a plural of *any*
 * case rather than only the three principal ones.
 */
function untaughtPlurals(word: WorksheetWord): Set<string> {
  return new Set(
    word.forms
      .filter((f) =>
        UNTAUGHT_PRINCIPAL_PARTS.includes(f.formType)
        || numberFromMorphCode(ekilexCodeOf(f)) === "PLURAL")
      .map((f) => f.value.trim().toLowerCase()),
  );
}

/**
 * The first attested sentence for this word that can carry a gap.
 *
 * Any of the word's own forms may be the one hidden — a sentence about `tuba`
 * usually contains `toas`, not `tuba`, and hiding the inflected form is the
 * more useful exercise anyway.
 */
function firstGap(word: WorksheetWord): GapItem | null {
  // Which is what the comment above has always said and what the list could
  // not do: `toas` is a derived case, so a stored-forms-only list could hide
  // it on an enriched entry and not on a seeded one.
  const untaught = untaughtPlurals(word);
  const forms = [...gapForms(word).keys()].filter((form) => !untaught.has(form));
  /*
    And only out of something that is a sentence. `usableExamples` keeps what is
    worth printing on a dictionary entry; a gap on a sheet a class works through
    is a question, and the mock exam and the level check have put every sentence
    through `naturalSentence` since a real sitting turned up a usage that trails
    off and one that leaves the answer standing beside the gap in its other
    spelling. This is paper, so nobody can ask about it afterwards.
  */
  const opener = nominalOpener(word.pos, [word.lemma, ...word.forms.map((f) => f.value)]);
  const lemma = word.lemma.toLocaleLowerCase("et");
  for (const example of usableExamples([...word.examples], word.plainest)) {
    if (!naturalSentence(example.et, opener)) continue;
    const cloze = buildCloze(example.et, forms);
    if (!cloze) continue;
    /*
      AND THE GAP MAY NOT BE THE WORD IN THE BRACKET BESIDE IT.

      The sheet prints the lemma after the blank and heads the section "Put the
      word in brackets into the right form", so a gap whose answer is the lemma
      is answered by copying the bracket. `gapForms` includes the headword
      itself, deliberately, because a nominative standing in a sentence is a
      form; every other caller keeps that and none of them prints the lemma an
      inch away. Measured over the shipped dictionary, 1,519 of 4,214 buildable
      gaps were the word beside them, which is a third of every sheet a class
      works through, and it is the commonest shape rather than an edge: a
      lexicographer illustrating a noun usually writes it in the nominative.

      3,389 of those words have another sentence whose gap is inflected, which
      is the exercise this was always meant to be and what the comment above has
      said since it was written. The rest get no gap: the sheet still prints
      their meaning and their case table, and a question answered by its own
      hint is worth less than a line of paper.
    */
    if (cloze.answer.toLocaleLowerCase("et") === lemma) continue;
    return {
      text: cloze.text,
      answer: cloze.answer,
      hint: word.lemma,
      english: example.en ?? null,
    };
  }
  return null;
}

/**
 * A row of the case table, with cells left blank in a rotating pattern.
 *
 * Rotating rather than random: the first row leaves the genitive out, the second
 * the partitive, the third both. A sheet where every row blanks the same column
 * teaches the column; this one makes the learner read the row.
 */
function caseRow(word: WorksheetWord, position: number): CaseRow | null {
  if (word.pos !== "NOUN") return null;
  const value = (type: string) => word.forms.find((f) => f.formType === type)?.value;

  const nominative = value("NOM_SG") ?? word.lemma;
  const genitive = value("GEN_SG");
  const partitive = value("PART_SG");
  if (!genitive || !partitive) return null;

  const pattern: CaseRow["blanks"][] = [["genitive"], ["partitive"], ["genitive", "partitive"]];
  return {
    lemma: word.lemma,
    nominative,
    genitive,
    partitive,
    blanks: pattern[position % pattern.length]!,
  };
}
