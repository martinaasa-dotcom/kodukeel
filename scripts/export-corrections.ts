/**
 * THE CORRECTIONS MADE HERE TO ENTRIES EKILEX SUPPLIED, AS A CSV FOR THE INSTITUTE.
 *
 *   npm run export:corrections                 writes corrections-<day>.csv
 *   npm run export:corrections -- --out=x.csv  writes it where you say
 *
 * Every accepted report on an entry that carries an `ekilexWordId`, and every
 * hand edit of one, as word id, lemma, what changed from what to what, the
 * reviewer's note and the day. Nothing about who reported or who reviewed it:
 * `lib/research/corrections.ts` decides what a row says and is tested for
 * that. A hand edit keeps no record of what it replaced, so its row says
 * "(not recorded)" rather than guessing; an accepted report records it from
 * the day `Suggestion.replaced` existed.
 *
 * It writes a file and sends nothing. Sending it to EKI is the operator's, and
 * `docs/45-ekilex.md` is the letter it goes with.
 */
import { writeFile } from "node:fs/promises";

import { prisma } from "../lib/db";
import { parsePatch } from "../lib/suggestions/model";
import { isPrincipalFormType } from "../lib/estonian/types";
import { CORRECTION_HEADER, correctionRows, type AcceptedReport, type HandEdit } from "../lib/research/corrections";
import { csvCell } from "./lib/csv";

async function main() {
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length)
    ?? `corrections-${new Date().toISOString().slice(0, 10)}.csv`;

  const accepted = await prisma.suggestion.findMany({
    where: { status: "ACCEPTED", lexemeId: { not: null } },
    // Read field by field: the owner, the reviewer and the learner's note are
    // never selected, so they cannot leak into the file by a later edit here.
    select: { lexemeId: true, patch: true, replaced: true, decision: true, reviewedAt: true, groupKey: true },
    orderBy: [{ reviewedAt: "asc" }, { id: "asc" }],
  });
  const lexemeIds = [...new Set(accepted.map((s) => s.lexemeId!))];
  const [reportLexemes, edited] = await Promise.all([
    prisma.lexeme.findMany({
      where: { id: { in: lexemeIds }, ekilexWordId: { not: null } },
      select: { id: true, lemma: true, ekilexWordId: true },
    }),
    prisma.lexeme.findMany({
      where: { ekilexWordId: { not: null }, editedAt: { not: null } },
      select: {
        id: true, lemma: true, ekilexWordId: true, translation: true, editedAt: true,
        forms: { where: { isPrincipal: true }, select: { formType: true, value: true }, orderBy: { orderIndex: "asc" } },
      },
      orderBy: [{ editedAt: "asc" }, { id: "asc" }],
    }),
  ]);
  const byId = new Map(reportLexemes.map((l) => [l.id, l]));

  // One row per group: accepting acts on a group, so forty reports of one
  // wrong form are one correction.
  const seen = new Set<string>();
  const reports: AcceptedReport[] = [];
  for (const s of accepted) {
    const lexeme = byId.get(s.lexemeId!);
    if (!lexeme || seen.has(s.groupKey)) continue;
    seen.add(s.groupKey);
    reports.push({
      ekilexWordId: lexeme.ekilexWordId!, lemma: lexeme.lemma, patch: parsePatch(s.patch),
      replaced: s.replaced, decision: s.decision, reviewedAt: s.reviewedAt,
    });
  }

  // A hand edit is an entry whose last change was a person's, which an
  // accepted report also stamps: those are left to the report's row.
  const reported = new Set(reportLexemes.map((l) => l.id));
  const edits: HandEdit[] = edited
    .filter((l) => !reported.has(l.id))
    .map((l) => ({
      ekilexWordId: l.ekilexWordId!, lemma: l.lemma, translation: l.translation, editedAt: l.editedAt,
      parts: Object.fromEntries(l.forms.filter((f) => isPrincipalFormType(f.formType)).map((f) => [f.formType, f.value])),
    }));

  const rows = correctionRows(reports, edits);
  const csv = [CORRECTION_HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  await writeFile(out, csv);
  console.log(`Wrote ${rows.length} correction${rows.length === 1 ? "" : "s"} to ${out}: ${reports.length} accepted report(s), ${edits.length} hand edit(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
