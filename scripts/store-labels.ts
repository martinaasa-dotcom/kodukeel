/**
 * The App Store privacy label and the Google Play Data safety answers, printed
 * as Markdown for docs/46-store-listing.md (docs/44-sixth-batch.md, R-3).
 *
 *   npm run store:labels              every recipient the code can name switched on
 *   npm run store:labels -- --from-env the recipients this shell's environment switches on
 *
 * The default declares the most, which is the safe way to be wrong on a form a
 * store holds an app to: every recipient `resolveRecipients` can name is
 * assumed on, and the output says so. Run it with the hosted deployment's own
 * environment and `--from-env` before a submission to see the narrower label.
 * Writes nothing; the answers come from `lib/legal/storeLabels.ts`.
 */
import { readFileSync } from "node:fs";

import { resolveRecipients } from "../lib/legal/recipients";
import { EVERY_RECIPIENT_ENV, storeLabels, type LabelAnswer } from "../lib/legal/storeLabels";

const fromEnv = process.argv.includes("--from-env");
if (!fromEnv) for (const [key, value] of Object.entries(EVERY_RECIPIENT_ENV)) process.env[key] = value;

const schema = readFileSync("prisma/schema.prisma", "utf8");
const tables = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
  .filter((m) => /^\s*ownerId\s/m.test(m[2]!))
  .map((m) => m[1]!);

const recipients = resolveRecipients();
const labels = storeLabels(recipients, tables);
const yes = (value: boolean | undefined) => (value ? "Yes" : "No");

function reasons(row: LabelAnswer): string {
  return row.reasons.map((r) => `  - ${r}`).join("\n");
}

const out: string[] = [];
out.push(`Generated on ${new Date().toISOString().slice(0, 10)} by \`npm run store:labels${fromEnv ? " -- --from-env" : ""}\`.`);
out.push("");
out.push(fromEnv
  ? "Recipients are the ones this environment switches on:"
  : "Every recipient the code can name is assumed on, which declares the most. The variables assumed set are:");
out.push("");
if (!fromEnv) out.push(...Object.keys(EVERY_RECIPIENT_ENV).map((key) => `- \`${key}\``), "");
out.push(...recipients.map((r) => `- ${r.name}`));
out.push("");
out.push("### App Store privacy label");
out.push("");
out.push(`**Used to track you:** ${labels.apple.tracking.answer}. ${labels.apple.tracking.why}`);
out.push("");
for (const row of labels.apple.collected) {
  out.push(`- **${row.label}.** Linked to the person: ${yes(row.linked)}. Used for: ${row.purposes.join(", ")}.`);
  out.push(reasons(row));
}
out.push("");
out.push("### Google Play Data safety");
out.push("");
out.push(`**Encrypted in transit:** ${labels.play.encryptedInTransit.answer}. ${labels.play.encryptedInTransit.why}`);
out.push("");
out.push(`**A way to ask for deletion:** ${labels.play.deletion.answer}. ${labels.play.deletion.why}`);
out.push("");
out.push(`**Shared with third parties:** No, for every type. ${labels.play.sharedWhy}`);
out.push("");
for (const row of labels.play.collected) {
  out.push(
    `- **${row.label}.** Collected: Yes. Processed only while answering: ${yes(row.ephemeral)}. `
      + `Optional: ${yes(row.optional)}. Used for: ${row.purposes.join(", ")}.`,
  );
  out.push(reasons(row));
}
out.push("");
out.push("### Not collected, in either store");
out.push("");
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
for (const item of labels.notCollected) out.push(`- **${item.what}.** ${sentence(item.why)}.`);
if (labels.undecided.length > 0) {
  out.push("");
  out.push(`**Undecided, so this label is not finished:** ${labels.undecided.join(", ")}.`);
}
console.log(out.join("\n"));
process.exitCode = labels.undecided.length > 0 ? 1 : 0;
