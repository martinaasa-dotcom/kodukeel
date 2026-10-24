/**
 * WRITES EACH LANGUAGE'S WHOLE TABLE AS ONE FILE THE BROWSER LOADS ALONE.
 *
 *   npm run i18n:tables
 *
 * The areas hold all three languages side by side (`lib/copy/i18n/areas/`),
 * which is how somebody fluent reads them and the one shape a bundler cannot
 * split: an object literal is never tree-shaken by property. So a Russian
 * learner would download the Ukrainian with it. This writes
 * `lib/copy/i18n/generated/ru.json`, `uk.json` and the public pages' `et.json`
 * from the same merge the
 * server reads, and `lib/copy/i18n/load.ts` imports one of them as a chunk of
 * its own, cached like any other build file and kept by the service worker for
 * the offline review path.
 *
 * Generated and committed, the way the course harvest is: `generated.test.ts`
 * fails with this command in its message when an area changes and the files
 * do not, so the browser and the server cannot read two different tables.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { TABLES } from "@/lib/copy/i18n/merged";
import { serializeTable } from "@/lib/copy/i18n/table";

for (const locale of ["ru", "uk", "et"] as const) {
  const file = join("lib", "copy", "i18n", "generated", `${locale}.json`);
  writeFileSync(file, serializeTable(TABLES[locale]));
  console.log(`Wrote ${file}: ${Object.keys(TABLES[locale].lines).length} lines.`);
}
