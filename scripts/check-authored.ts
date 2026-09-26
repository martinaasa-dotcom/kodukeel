/**
 * Every written sentence that breaks a rule, with the reason. See
 * `lib/dict/authored.ts`. Reports and never writes.
 */
import { authoredRows } from "../lib/dict/authored";
import { checkAuthored } from "./lib/authoredCheck";

const faults = checkAuthored();
for (const { row, why } of faults) console.log(`  ${row[0].padEnd(14)} ${row[1]}\n      ${why}`);
console.log(`\n${authoredRows().length} rows, ${faults.length} faults.`);
process.exitCode = faults.length > 0 ? 1 : 0;
