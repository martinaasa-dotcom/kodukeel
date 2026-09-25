import { classifyGradation, classifyVerbGradation, gradates } from "@/lib/estonian/gradation";
import { isPrincipalFormType } from "@/lib/estonian/types";
import { MAX_USER_PER_WORD, parseExamples, serialiseExamples } from "@/lib/dict/examples";

/**
 * A WORD A BACKUP FILE BRINGS IN CARRIES WHAT A PERSON COULD HAVE TYPED, AND
 * NOTHING THE INSTITUTE SAID.
 *
 * A restore adds a word the shared dictionary does not already hold, and it
 * used to add it almost exactly as the file wrote it. The provenance and the
 * Ekilex id were reset, and everything else went straight in: sentences
 * labelled `EKILEX`, forms filed as `EKILEX:<morphCode>`, the Institute's
 * semantic types, an Estonian definition, a CEFR band. A backup file is a
 * document one learner hands the server. So any signed-in learner could put
 * Estonian into the dictionary everybody reads, dressed as a lexicographer's.
 * The typed-sentence cap in `usableExamples` did not stop it, because that cap
 * counts only sentences marked as typed. `borrowedSentences` then lent those
 * sentences to other learners' form cards, which is ADR-005 broken through
 * the one door nobody watched.
 *
 * So what survives is what `upsertLexemeWithForms` lets a person supply: the
 * lemma, the gloss, the part of speech, a band, a government string, and the
 * principal parts, with the gradation worked out from those rather than read
 * from the file. The learner's own sentences come back as theirs, marked
 * `USER` and capped at the same number `addExample` allows. A backup that was
 * genuinely made on this deployment loses nothing that matters by it. A word
 * that was Ekilex's when the backup was taken is almost always still in the
 * dictionary under the same id, and a restore leaves such a word exactly as
 * it is.
 *
 * Pure, so the rule is tested directly rather than through a transaction.
 */
export interface RestoredEntry {
  readonly lexeme: {
    id: string;
    lemma: string;
    pos: string;
    translation: string;
    cefr: string | null;
    government: string | null;
    gradation: string;
    gradationNote: string | null;
    examples: string;
    provenance: "USER";
    editedBy: string;
  };
  readonly forms: readonly { formType: string; value: string }[];
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/** What a restore may create from one backup row, or null where the row names no word. */
export function restoredEntry(raw: Record<string, unknown>, ownerId: string): RestoredEntry | null {
  const id = text(raw.id);
  const lemma = text(raw.lemma);
  const pos = text(raw.pos);
  const translation = text(raw.translation);
  if (!id || !lemma || !pos || !translation) return null;

  const forms: { formType: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const f of Array.isArray(raw.forms) ? raw.forms : []) {
    if (typeof f !== "object" || f === null) continue;
    const formType = text((f as Record<string, unknown>).formType);
    const value = text((f as Record<string, unknown>).value);
    if (!formType || !value || !isPrincipalFormType(formType)) continue;
    const key = `${formType}\u0000${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    forms.push({ formType, value });
  }

  const at = (type: string) => forms.find((f) => f.formType === type)?.value;
  const nomSg = at("NOM_SG");
  const genSg = at("GEN_SG");
  const infMa = at("INF_MA");
  const pres1 = at("PRES_1SG");
  const gradation =
    !gradates(pos) ? { type: "NONE", note: undefined }
    : nomSg && genSg ? classifyGradation(nomSg, genSg)
    : infMa && pres1 ? classifyVerbGradation(infMa, pres1)
    : { type: "NONE", note: undefined };

  const examples = parseExamples(typeof raw.examples === "string" ? raw.examples : null)
    .slice(0, MAX_USER_PER_WORD)
    .map((e) => ({ et: e.et, ...(e.en ? { en: e.en } : {}), source: "USER" as const }));

  return {
    lexeme: {
      id, lemma, pos, translation,
      cefr: text(raw.cefr),
      government: text(raw.government),
      gradation: gradation.type,
      gradationNote: gradation.note ?? null,
      examples: serialiseExamples(examples),
      provenance: "USER",
      editedBy: ownerId,
    },
    forms,
  };
}
