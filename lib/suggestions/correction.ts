import { isPrincipalFormType } from "@/lib/estonian/types";
import { clip } from "@/lib/copy/clip";
import { SUGGESTION_LIMITS, type Patch, type SuggestionCategory } from "./model";

/**
 * A learner's edit to a dictionary entry that is not theirs, as reports for the
 * review queue.
 *
 * THE SHARED DICTIONARY IS EVERYBODY'S, SO NOBODY BUT A REVIEWER REWRITES IT.
 * The edit form on every entry used to write straight into the row: any
 * signed-in account could change the English, the headword, the band, the part
 * of speech, the government and the principal parts of `tere` for every learner,
 * and an entry Ekilex supplied kept its Ekilex label afterwards, so the change
 * carried the Institute's name into other people's cards, their exam papers and
 * Anu's briefing. Sign-up is open, so the only limit on that was how fast one
 * account could type.
 *
 * What the form proposes is the same, and it now arrives where corrections were
 * always meant to: the suggestion queue, behind `requireAdminId`, through the
 * patch shapes the queue already applies. A new English and a new principal
 * part each become a report a reviewer accepts in one press; a change the queue
 * has no patch for (the headword, the kind of word, the government, the level)
 * becomes one report saying what was proposed, for a person to act on. Pure: the
 * caller reads the entry and records the reports.
 */
export interface EntryNow {
  id: string;
  lemma: string;
  translation: string;
  pos: string;
  cefr: string | null;
  government: string | null;
  /** The entry's principal parts, keyed by form type. */
  forms: Readonly<Record<string, string>>;
}

export interface EntryProposed {
  lemma: string;
  translation: string;
  pos: string;
  /** Undefined where the form left the level alone, "" where it cleared it. */
  cefr: string | undefined;
  government: string;
  forms: Readonly<Record<string, string>>;
}

export interface CorrectionReport {
  category: SuggestionCategory;
  patch: Patch | null;
  note: string;
}

export function correctionReports(now: EntryNow, proposed: EntryProposed): CorrectionReport[] {
  const out: CorrectionReport[] = [];
  if (proposed.translation.trim() && proposed.translation.trim() !== now.translation.trim()) {
    out.push({
      category: "WRONG_MEANING",
      patch: { kind: "SET_TRANSLATION", lexemeId: now.id, translation: proposed.translation.trim() },
      note: "",
    });
  }
  for (const [formType, raw] of Object.entries(proposed.forms)) {
    const value = String(raw ?? "").trim();
    if (!isPrincipalFormType(formType) || !value) continue;
    if ((now.forms[formType] ?? "").trim() === value) continue;
    out.push({ category: "WRONG_FORM", patch: { kind: "SET_FORM", lexemeId: now.id, formType, value }, note: "" });
  }
  const other: string[] = [];
  if (proposed.lemma.trim() !== now.lemma.trim()) other.push(`headword "${now.lemma}" to "${proposed.lemma.trim()}"`);
  if (proposed.pos !== now.pos) other.push(`kind of word ${now.pos} to ${proposed.pos}`);
  if (proposed.government.trim() !== (now.government ?? "").trim()) {
    other.push(`government "${now.government ?? ""}" to "${proposed.government.trim()}"`);
  }
  if (proposed.cefr !== undefined && (proposed.cefr || null) !== now.cefr) {
    other.push(`level ${now.cefr ?? "none"} to ${proposed.cefr || "none"}`);
  }
  if (other.length > 0) {
    out.push({
      category: "OTHER",
      patch: null,
      note: clip(`Proposed correction to the entry: ${other.join("; ")}.`, SUGGESTION_LIMITS.note),
    });
  }
  return out;
}
