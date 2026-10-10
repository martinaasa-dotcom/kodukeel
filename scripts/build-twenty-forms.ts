/**
 * The forms the question game reads beyond what the dictionary stores.
 *
 * A learner asks `Kas seda süüakse?` and `Kas see elab mägedes?`, and neither
 * spelling is a stored form or one the app derives: the impersonal and the
 * plural cases are the forms list's (`prisma/data/forms/`, Ekilex and Vabamorf
 * with guessing off). This reads the shards once and writes, for each headword
 * the game reads, the spellings that belong to it and that the dictionary's own
 * index does not already hold. It is the accept side of ADR-005: a spelling here
 * is only ever a reason to understand a question, never an answer or a card.
 *
 *   npm run twenty:forms
 */
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { dictionaryRows } from "./lib/dictionary";
import { NEEDED_LEMMAS } from "../lib/games/twenty";
import { buildIndex } from "../lib/games/twentyLookup";

const needed = new Set(NEEDED_LEMMAS);
const rows = dictionaryRows().filter((r) => needed.has(r.lemma));
const known = buildIndex(rows);
const dir = path.join(process.cwd(), "prisma", "data", "forms", "shards");
const out: Record<string, string[]> = {};

for (const file of fs.readdirSync(dir).sort()) {
  const text = gunzipSync(fs.readFileSync(path.join(dir, file))).toString("utf8");
  for (const line of text.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    const form = line.slice(0, tab);
    // A capital is a name, and a spelling the index already reads keeps its own readings.
    if (form !== form.toLowerCase() || known[form]) continue;
    for (const lemma of line.slice(tab + 1).split(",")) {
      if (needed.has(lemma)) (out[lemma] ??= []).push(form);
    }
  }
}

const sorted: Record<string, string> = {};
for (const lemma of Object.keys(out).sort()) sorted[lemma] = [...new Set(out[lemma])].sort().join(" ");
const target = path.join(process.cwd(), "prisma", "data", "twenty-forms.json");
fs.writeFileSync(target, `${JSON.stringify(sorted, null, 0).replace(/","/g, '",\n"')}\n`);
console.log(`${Object.keys(sorted).length} headwords, ${Object.values(out).flat().length} spellings, ${target}`);
