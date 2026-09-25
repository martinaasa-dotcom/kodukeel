import { prisma } from "@/lib/db";
import { classifyGradation, classifyVerbGradation, gradates } from "@/lib/estonian/gradation";
import { PRINCIPAL_FORM_TYPES, isPrincipalFormType } from "@/lib/estonian/types";
import { isUniqueViolation, replaceForms } from "./replaceForms";

/**
 * The one write path into the shared dictionary, for a change a person made.
 *
 * It was inlined in `createLexemeWithForms`, which was fine while a hand edit
 * on the dictionary page was the only way in. It is not the only way in any
 * more: an accepted suggestion writes the same three things, and two copies of
 * this would be two answers to the questions that actually matter here.
 * Namely: which forms may be replaced (principal parts, and nothing else),
 * what happens to `provenance` when somebody corrects an Ekilex entry (it
 * stays Ekilex's), and where the gradation classification comes from (the two
 * stems, never a stored guess).
 *
 * Every Estonian character reaching this function was typed by a person. No
 * model is upstream of it on either path, which is ADR-005 and is why the
 * review queue can push a change through at all.
 */
export interface LexemeWrite {
  /** Present when correcting an entry. Without it, changing the Estonian word
   *  itself would create a second lexeme and orphan the cards made from it. */
  id?: string;
  lemma: string;
  translation: string;
  pos: string;
  cefr?: string | null;
  government?: string | null;
  /** Keyed by form type. Anything that is not a principal part is dropped. */
  forms: Record<string, string>;
  /** Who to attribute it to. A shared edit that is not attributable is untraceable. */
  editedBy: string;
}

export interface LexemeWriteResult {
  id: string;
  lemma: string;
  translation: string;
  /** What the entry said before, when there was one. For the card rewrite. */
  previous: { lemma: string; translation: string } | null;
}

export async function upsertLexemeWithForms(input: LexemeWrite): Promise<LexemeWriteResult> {
  try {
    return await writeOnce(input);
  } catch (error) {
    /*
      TWO PEOPLE ADDING ONE NEW WORD AT ONCE BOTH FIND NO ENTRY, AND ONE LOSES.

      `existing` is read and the create follows it, so two adds of the same
      lemma inside that gap both reach the create and the second is refused on
      `(lemma, pos)`. That was an error page for somebody who had done nothing
      wrong. Asked again, the loser finds the entry the winner made and takes
      the correction path, which is exactly what it would have done arriving a
      moment later. Once, because a second collision is not this race.
    */
    if (!input.id && isUniqueViolation(error)) return writeOnce(input);
    throw error;
  }
}

async function writeOnce(input: LexemeWrite): Promise<LexemeWriteResult> {
  const { lemma, translation, pos } = input;

  const named = Object.entries(input.forms)
    // Only the principal parts are user-managed. Everything else on this lexeme
    // came from Ekilex and is authoritative; a hand edit must not submit one.
    .filter(([formType]) => isPrincipalFormType(formType))
    .map(([formType, value]) => ({ formType, value: String(value ?? "").trim() }));
  const forms = named.filter((f) => f.value);
  /*
    A FORM THE CALLER DID NOT NAME IS LEFT ALONE, AND ONE IT NAMED EMPTY IS
    CLEARED.

    Every principal part was deleted and only the supplied ones written back.
    The hand-edit form names every stored part, because it is pre-filled from
    the entry, so that was harmless there. Accepting a "this word is missing"
    report for a word the dictionary already holds names none or a few, and
    the entry lost its genitive, its partitive and its plural for everybody,
    which is a case table and every card built off it. It is the rule the
    `cefr` and `government` block below states, applied to the forms.
  */
  const replaced = named.map((f) => f.formType);
  const existing = input.id
    ? await prisma.lexeme.findUnique({ where: { id: input.id } })
    : await prisma.lexeme.findUnique({ where: { lemma_pos: { lemma, pos } } });

  // The stems the entry will hold once this lands: what was supplied, and
  // otherwise what it already had, so gradation is graded off the result.
  const kept = existing
    ? await prisma.form.findMany({
        where: {
          lexemeId: existing.id,
          formType: { in: [...PRINCIPAL_FORM_TYPES].filter((t) => !replaced.includes(t)) },
        },
        orderBy: { id: "asc" },
        select: { formType: true, value: true },
      })
    : [];
  const at = (type: string) =>
    forms.find((f) => f.formType === type)?.value ?? kept.find((f) => f.formType === type)?.value;
  const nomSg = at("NOM_SG");
  const genSg = at("GEN_SG");
  const infMa = at("INF_MA");
  const pres1 = at("PRES_1SG");

  const gradation =
    !gradates(pos) ? { type: "NONE" as const, note: undefined }
    : nomSg && genSg ? classifyGradation(nomSg, genSg)
    : infMa && pres1 ? classifyVerbGradation(infMa, pres1)
    : { type: "NONE" as const, note: undefined };

  const data = {
    lemma, translation, pos,
    /*
      SUPPLIED OR LEFT ALONE, WHICH IS THE RULE THE PARAGRAPH BELOW STATES AND
      THESE TWO COLUMNS DID NOT KEEP.

      They were written unconditionally, so a caller that sends neither nulled
      both on an entry everybody reads. `lib/suggestions/apply.ts` is exactly
      such a caller: accepting a "this word is missing" report for a lemma the
      dictionary already holds passes a gloss and forms and nothing else, and
      it stripped the CEFR band and the government string off the existing
      row. Losing the band is not cosmetic: it takes the word out of the exam
      pool, out of the readiness counts and out of the suggestion row, all of
      which read `cefr` as the record that something vouched for the word.

      The hand-edit form was safe only by accident, because it pre-fills both
      fields from the entry it is editing. `undefined` means the caller had no
      opinion; an empty string still clears, since that is a person emptying
      the field in front of them.
    */
    ...(input.cefr !== undefined ? { cefr: input.cefr || null } : {}),
    ...(input.government !== undefined ? { government: input.government || null } : {}),
    /*
      `notes` IS NOT HERE, AND THAT IS THE FIX RATHER THAN THE OMISSION.

      It was `notes: input.notes || null`, in an `update`, and neither caller
      has ever sent one: the add-and-correct form has no notes field and the
      suggestion queue passes forms and a gloss. So every hand edit and every
      accepted correction nulled the column, which holds the further English
      senses the builder stored, in the shared dictionary everybody reads.
      Correcting a typo in `aadress` deleted "email address" for everyone.

      That is the same fault the comment below this block describes about
      forms, one column over: replace what the caller supplied and leave alone
      what it did not. The parameter is gone rather than guarded, because a
      parameter nobody passes is not a feature, it is the bug's only door.
    */
    /*
      A WRITE THAT SUPPLIED NO FORMS HAS NO OPINION ABOUT THEM, which is the
      rule `cefr` and `government` follow above, one field over. An accepted
      missing-word report sends `forms: {}`, and reading "none supplied" as
      "none exist" reset the gradation for everybody. The gradation is graded
      off the forms the entry will hold once this lands, the supplied ones and
      otherwise the ones it already had (`kept` above), so a write naming no
      form or only some of them grades the entry it leaves behind.
    */
    gradation: gradation.type,
    gradationNote: gradation.note ?? null,
    // An entry Ekilex supplied stays marked as Ekilex's after a correction —
    // relabelling it USER would quietly discard where the forms came from.
    ...(existing && (existing.provenance === "SEED" || existing.provenance === "EKILEX")
      ? {}
      : { provenance: "USER" }),
    editedBy: input.editedBy,
    editedAt: new Date(),
  };

  const lexeme = existing
    ? await prisma.lexeme.update({ where: { id: existing.id }, data })
    : await prisma.lexeme.create({ data });

  // Replace only the principal parts. Deleting every row for the lexeme threw
  // away the forms retrieved from Ekilex — the one thing on an entry that cannot
  // be reconstructed — whenever anybody corrected a typo.
  // Under the entry's own row, so two corrections at once cannot leave it with
  // both genitives. See lib/dict/replaceForms.ts. Only the parts the write
  // named: one it named empty is cleared, one it did not name is left alone.
  if (replaced.length) {
    await replaceForms(lexeme.id, forms, { formType: { in: replaced } });
  }

  return {
    id: lexeme.id,
    lemma,
    translation,
    previous: existing ? { lemma: existing.lemma, translation: existing.translation } : null,
  };
}
