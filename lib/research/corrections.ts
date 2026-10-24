/**
 * THE CORRECTIONS THIS INSTALLATION MADE TO ENTRIES EKILEX SUPPLIED, AS ROWS TO SEND BACK.
 *
 * `docs/31-grant-case.md` section 4 and `/funding` say corrected entries could
 * go back to the Institute, and nothing gathered them. This decides what a row
 * says; `scripts/export-corrections.ts` reads the database and writes the CSV.
 * Pure, like the rest of `lib/research/`, so what may leave is tested rather
 * than trusted.
 *
 * NOTHING ABOUT WHO REPORTED IT. The input carries no owner, no reviewer and
 * the learner's own note never: an entry's word id, its lemma, what changed
 * from what to what, the reviewer's decision note and the day. The reviewer's
 * note is their words about the entry and is what EKI would want to read; the
 * learner's note is somebody's message to this app and stays here.
 */
export interface AcceptedReport {
  ekilexWordId: number;
  lemma: string;
  /** The stored proposal, as `lib/suggestions/model.ts` reads it. */
  patch: { kind: string; formType?: string; value?: string; translation?: string; sentence?: string } | null;
  /** What the change replaced, where it was recorded (`Suggestion.replaced`). */
  replaced: string | null;
  decision: string | null;
  reviewedAt: Date | null;
}

export interface HandEdit {
  ekilexWordId: number;
  lemma: string;
  translation: string;
  /** The principal parts as they stand now, `formType` to value. */
  parts: Readonly<Record<string, string>>;
  editedAt: Date | null;
}

export const CORRECTION_HEADER = ["ekilex_word_id", "lemma", "kind", "field", "from", "to", "reviewer_note", "date"] as const;

/** Not recorded, said in the cell rather than left blank, so a reader can tell it from an empty value. */
export const NOT_RECORDED = "(not recorded)";

const day = (at: Date | null): string => (at ? at.toISOString().slice(0, 10) : "");

/** One accepted report as a row, or null where it changed nothing a lexicographer would read. */
export function reportRow(report: AcceptedReport): string[] | null {
  const patch = report.patch;
  if (!patch) return null;
  const from = report.replaced ?? NOT_RECORDED;
  const note = report.decision ?? "";
  const base = (field: string, before: string, after: string) =>
    [String(report.ekilexWordId), report.lemma, "accepted report", field, before, after, note, day(report.reviewedAt)];
  switch (patch.kind) {
    case "SET_FORM":
      return base(patch.formType ?? "form", from, patch.value ?? "");
    case "SET_TRANSLATION":
      return base("English gloss", from, patch.translation ?? "");
    case "DROP_EXAMPLE":
      return base("example sentence", patch.sentence ?? "", "(removed from this app's entry)");
    case "CLEAR_TRANSLATION":
      return base("English line of an example", patch.sentence ?? "", "(English taken off)");
    default:
      // A new word is not a correction to an entry Ekilex supplied.
      return null;
  }
}

/** One hand edit as a row. What it replaced is not kept anywhere, and the row says so. */
export function handEditRow(edit: HandEdit): string[] {
  const parts = Object.entries(edit.parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, value]) => `${type}=${value}`)
    .join("; ");
  return [
    String(edit.ekilexWordId), edit.lemma, "hand edit", "gloss and principal parts", NOT_RECORDED,
    parts ? `${edit.translation} | ${parts}` : edit.translation, "", day(edit.editedAt),
  ];
}

export function correctionRows(reports: readonly AcceptedReport[], edits: readonly HandEdit[]): string[][] {
  const rows: string[][] = [];
  for (const report of reports) {
    const row = reportRow(report);
    if (row) rows.push(row);
  }
  for (const edit of edits) rows.push(handEditRow(edit));
  return rows.sort((a, b) => (a[7] ?? "").localeCompare(b[7] ?? "") || (a[1] ?? "").localeCompare(b[1] ?? ""));
}
