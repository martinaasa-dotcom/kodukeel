import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * EKILEX GETS WHAT docs/05-integrations.md SECTION 1.4 PROMISED, AND IS SHOWN WHAT IT GETS.
 *
 * docs/44-sixth-batch.md S-2 and D17. The promise was a concurrency cap of two
 * and backoff on 429 and 5xx, and for most of this app's life the harvest ran
 * six workers and four scripts kept a fetch of their own. So the rule is asked
 * of every file rather than of the ones that were fixed: one place makes a
 * request to ekilex.ee, every script that asks goes through it, the live
 * lookup counts what it asked, and the entry credits the Institute.
 */
export default function ekilexIsAskedThroughOneGate({ check, code, read, sourceFiles }: InvariantKit) {
  const GATE = "lib/ekilex/client.ts";

  check("only the gate in lib/ekilex/client.ts makes a request to ekilex.ee", () => {
    const files = [
      ...sourceFiles("app"), ...sourceFiles("lib"), ...sourceFiles("components"),
      ...sourceFiles("scripts", /\.(ts|tsx|mjs)$/), ...sourceFiles("prisma"),
    ].filter((f) => !/\.(test|itest)\.tsx?$/.test(f) && !f.startsWith("scripts/invariants/"));
    assert.ok(files.length > 500, `walked only ${files.length} files, so the sweep stopped finding the tree`);
    const strays = files.filter((f) => f !== GATE && /ekilex\.ee\/api|ekilex-api-key/.test(code(f)));
    assert.deepEqual(strays, [], `these reach Ekilex without the gate: ${strays.join(", ")}`);
    const gate = code(GATE);
    assert.match(gate, /export const EKILEX_IN_FLIGHT = 2;/, "the gate no longer holds the two in flight section 1.4 promised");
    assert.match(gate, /export const EKILEX_TRIES = 3;/, "the gate no longer gives up after three tries");
    assert.match(gate, /"user-agent": deps\.userAgent\(\)/, "a request to Ekilex stopped saying who sent it");
    assert.match(gate, /deadline !== undefined && deps\.now\(\) \+ wait >= deadline/, "a backoff no longer respects a page's deadline");
  });

  check("no script that asks Ekilex reads its own worker count past the gate", () => {
    const scripts = sourceFiles("scripts", /\.ts$/)
      .filter((f) => !f.startsWith("scripts/invariants/") && /ekilexRequest|searchEkilex|fetchEkilexDetails/.test(code(f)));
    assert.ok(scripts.length >= 8, `found only ${scripts.length} scripts asking Ekilex, so the sweep stopped matching`);
    const ownJobs = scripts.filter((f) => f !== "scripts/lib/ekilexJobs.ts" && /--jobs=/.test(code(f)));
    assert.deepEqual(ownJobs, [], `these parse --jobs themselves rather than through scripts/lib/ekilexJobs.ts: ${ownJobs.join(", ")}`);
    const jobs = code("scripts/lib/ekilexJobs.ts");
    assert.match(jobs, /--past-the-limit/, "going past two no longer needs saying out loud");
    assert.match(jobs, /console\.warn\([\s\S]{0,40}WARNING/, "going past two no longer prints a warning");
  });

  check("a live lookup counts what it asked once, and the dictionary counts a stored answer", () => {
    const lookup = code("lib/dict/lookup.ts");
    assert.match(lookup, /finally \{\s*await recordEkilexTally\(tally\);/, "a live lookup stopped writing what it asked to EkilexDay");
    assert.match(lookup, /searchEkilex\(query, gate\)/, "the live lookup's search stopped going through the counted gate");
    assert.match(lookup, /searchEkilex\(lexeme\.lemma, gate\)/, "the upgrade's search stopped going through the counted gate");
    const page = code("app/(app)/dictionary/page.tsx");
    assert.match(page, /if \(entry && !fetched && !prefetch\) after\(\(\) => countStoredAnswer\(entry\)\)/,
      "the dictionary stopped counting an answer from the stored copy, or counts a prefetch as one");
    const model = /model EkilexDay \{([\s\S]*?)\n\}/.exec(read("prisma/schema.prisma"))?.[1];
    assert.ok(model, "the EkilexDay model is gone, so nothing counts what Ekilex is asked");
    assert.doesNotMatch(model, /\bownerId\b/, "EkilexDay grew an owner: it is an aggregate and in no export or erasure");
  });

  check("every entry Ekilex supplied carries the credit CC BY 4.0 asks for, and /impact prints the load", () => {
    const credit = code("app/(app)/dictionary/EkilexCredit.tsx");
    assert.match(credit, /https:\/\/creativecommons\.org\/licenses\/by\/4\.0\//, "the credit no longer links the license deed");
    assert.match(credit, /Institute of the Estonian Language/, "the credit no longer names the Institute");
    assert.match(code("app/(app)/dictionary/DictionaryClient.tsx"), /\{entry\.ekilexWordId != null && <EkilexCredit \/>\}/,
      "the entry no longer draws the credit");
    assert.match(code("app/impact/page.tsx"), /<EkilexSection ekilex=\{ekilex\}/, "/impact stopped printing what this installation asked of Ekilex");
  });
}
