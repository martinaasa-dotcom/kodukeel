import { CASES } from "@/lib/estonian/cases";
import { derivedVerbForms, pres1sgFrom } from "@/lib/estonian/conjugate";
import { caseAnswer, stemsFromParts } from "@/lib/estonian/derive";
import { caseFromMorphCode, ekilexCodeOf, numberFromMorphCode } from "@/lib/estonian/morph";
import type { CaseKey } from "@/lib/estonian/types";

/**
 * Every spelling of one word that could be the gap in a sentence.
 *
 * A GAP-FILL IS BUILT OUT OF A SENTENCE SOMEBODY RECORDED, AND THE WORD IN IT
 * IS INFLECTED.
 *
 * `buildCloze` hides a word it is told to look for, so what it can hide is
 * whatever list the caller hands it, and there were five such lists. Two of
 * them (`lesson.ts`, `checkpoint.ts`) already added the ten regular cases and
 * were the same twenty lines twice. Three did not: the review card, the
 * printable worksheet, and the mock exam, and the worksheet's own comment says
 * "a sentence about `tuba` usually contains `toas`, not `tuba`, and hiding the
 * inflected form is the more useful exercise" over a list that could not hide
 * `toas` unless Ekilex happened to have stored it. None of the five knew a
 * verb person at all, so `Kontsert algab kell 18.` could not be gapped for
 * `algama` and `Kuidas sa elad?` could not be gapped for `elama`, which are
 * the two commonest shapes in the language.
 *
 * Measured over the graded half of the shipped dictionary: 2,201 words could
 * carry a gap and 2,758 can now, a quarter more, on sentences the dictionary
 * already held.
 *
 * NOTHING IS INVENTED, AND THE SENTENCE IS THE SECOND OPINION. Every spelling
 * here is a stored form or one of the two derivations ADR-005 amendment 1
 * allows, and a derived form only ever becomes a card by matching a word a
 * lexicographer wrote in a real sentence. A wrong derivation matches nothing
 * and disappears; a right one is confirmed by the sentence it was found in.
 *
 * Pure, like the two modules it unions.
 */

export interface GapWord {
  readonly lemma: string;
  readonly pos: string;
  readonly forms: readonly { formType: string; value: string; morphCode?: string | null }[];
}

/**
 * Lowercased spelling to the case it is, or null where it is not a case.
 *
 * A verb person and the headword itself are null: neither is a case, and a
 * card that claimed otherwise would put a wrong row in the accuracy chart.
 */
export function gapForms(word: GapWord): Map<string, CaseKey | null> {
  const out = new Map<string, CaseKey | null>();
  const add = (value: string | null | undefined, caseKey: CaseKey | null) => {
    const clean = value?.trim().toLowerCase();
    if (!clean) return;
    // First writer wins, so a stored form keeps the slot Ekilex named it with
    // rather than the one a suffix rule would guess for the same string.
    if (!out.has(clean)) out.set(clean, caseKey);
  };

  const parts: Record<string, string> = {};
  for (const form of word.forms) parts[form.formType] = form.value;

  /*
    A PRINCIPAL PART IS NOT LABELED, AND NOR IS A SHORT ILLATIVE SPELLED LIKE
    ONE.

    `tuba` is its own nominative and its own partitive, so a card built on it
    cannot say which case the sentence was using it in, and the label is what
    the accuracy chart counts: a guess there is a wrong row rather than a
    missing one.

    `ILL_SG_SHORT` was the exception, on the argument that the dictionary only
    promotes it where it differs from all three principal parts. That is not
    what the dictionary holds. Measured over the shipped file, **1,934 of the
    2,700 entries that store a short illative store one spelled exactly like a
    principal part**, which is the same figure `lib/estonian/derive.ts` quotes
    the other way round when it says the case does this to most words: `arsti`
    is the short illative of `arst` and also its genitive and its partitive.
    The old rule left the label to whichever row the database happened to
    return first, since the first writer wins below, so `Läksin ____ juurde.`
    gapped for a genitive could be written into the append-only log as an
    illative.

    So the strict rule the gap rung already states applies here too: exactly
    one slot claims the spelling, or no slot is named. The form is still
    gappable, because it is a real form of the word; what it no longer does is
    claim a case it shares with another.

    A retrieved form names its own slot, which is what `morphCode` is.

    READ THROUGH `ekilexCodeOf`, BECAUSE THE SEED WRITES NO morphCode. A
    harvested extra form is stored as `formType: "EKILEX:<code>"` and nothing
    else (`prisma/seed.ts`), so reading the column alone named the case on a
    live Ekilex lookup and on no seeded install: 399 spellings across 376
    shipped entries, the same word two ways by which door it came in. Not
    `slotCodeOf`, which would translate `NOM_SG` into a code and start naming
    the principal parts this block exists to leave unnamed, and not
    `morphCodeOf`, which hands a principal part back as its own name.

    AND A PLURAL NAMES NO CASE. `caseFromMorphCode` ignores number, so a stored
    `PlKom` claimed the kaasaütlev its singular has, and a card cut on it would
    write the singular case into `Review.slot`. That is the rule above, exactly
    one slot or none, applied to number as it is to the short illative. The
    spelling stays in the map, so every reader asking whether a form may be
    hidden gets the answer it always had; `lib/srs/cards.ts` is the one reader
    of the label, and deciding which plurals a fresh card may reach for is
    still its call to make.
  */
  const principalValues = new Set(
    ["NOM_SG", "GEN_SG", "PART_SG"]
      .map((k) => parts[k]?.trim().toLowerCase())
      .filter((v): v is string => !!v),
  );
  for (const form of word.forms) {
    const named = form.formType === "ILL_SG_SHORT"
      ? (principalValues.has(form.value.trim().toLowerCase()) ? null : "ILLATIVE" as const)
      : singularCaseOf(ekilexCodeOf(form));
    add(form.value, named);
  }
  add(word.lemma, null);

  if (word.pos === "VERB") {
    for (const derived of derivedVerbForms({ lemma: word.lemma, pres1sg: pres1sgFrom(word.forms) })) {
      add(derived.value, null);
    }
    return out;
  }

  const stems = stemsFromParts(parts);
  for (const spec of CASES) {
    // `accepted` rather than the one shown, because a learner reading the
    // sentence met whichever spelling the lexicographer wrote: the short
    // illative and the long one are both the word, and either can be the gap.
    for (const value of caseAnswer(stems, spec.key)?.accepted ?? []) add(value, spec.key);
  }
  return out;
}

/** The case a code names, where it names a singular; nothing for a plural. */
function singularCaseOf(code: string | null): CaseKey | null {
  return numberFromMorphCode(code) === "SINGULAR" ? caseFromMorphCode(code) : null;
}

/**
 * The same, for a caller holding principal parts rather than form rows.
 *
 * The course's own word shapes carry `parts` because that is what the syllabus
 * harvest writes down, and a `Record` cannot say which slot Ekilex named a
 * retrieved form with. It does not need to: a seeded word has principal parts
 * and nothing else, so every case in the table is worked out from the genitive
 * stem either way.
 */
export function gapFormsFromParts(word: {
  readonly lemma: string;
  readonly pos: string;
  readonly parts: Readonly<Record<string, string>>;
}): Map<string, CaseKey | null> {
  return gapForms({
    lemma: word.lemma,
    pos: word.pos,
    forms: Object.entries(word.parts).map(([formType, value]) => ({ formType, value })),
  });
}
