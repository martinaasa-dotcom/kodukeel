/**
 * Writes lib/course/lessons/pronounTwins.ts: the long and short forms of the six
 * personal pronouns, read off the dictionary's own stored forms, so the lesson
 * marker can take `ma` where a lesson wrote `mina` without anybody typing a form.
 *
 *   npx tsx scripts/build-pronoun-twins.ts
 *
 * `lib/course/lessons/pronounTwins.test.ts` builds the same table and fails if
 * the file has fallen behind.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pronounTwinsFrom, renderTwins } from "./lib/pronounTwins";
import { shippedDictionary } from "./lib/dictionary";

const twins = pronounTwinsFrom(shippedDictionary());
const out = join(process.cwd(), "lib/course/lessons/pronounTwins.ts");
writeFileSync(out, renderTwins(twins));
console.log(`Wrote ${out}: ${twins.length} pairs.`);
