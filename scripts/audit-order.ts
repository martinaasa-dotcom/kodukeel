/**
 * Every alternative word order the app will accept, printed so a person can
 * read them.
 *
 * `lib/estonian/wordOrder.ts` decides two things: that a particle straight
 * after the finite verb may also stand at the end of its clause, so the
 * sentence builder no longer marks `Muidugi tuleb näpukaid ette` wrong, and
 * that a time adverb may stand at either edge of its clause or on either side
 * of the verb, so it no longer marks `Täna ma loen raamatut` wrong either. Every
 * order it accepts is this app making a claim about Estonian, and a rate is
 * not a way to check a claim: the only way to know the rule is right is to
 * read the sentences it fires on, which is `eval:scene`'s own discipline and
 * is what this prints.
 *
 * It was the instrument both rules were drawn with rather than a report
 * written after them. Every condition in that module is there because a run
 * of this put a sentence nobody says on the screen: a postposition carried
 * away from its complement, a spelling that is a verb and a noun at once, a
 * particle sent past a `ja` or past a participle standing in front of its
 * noun, a comma that separated a list rather than ending a clause, an adverb
 * taken out of `täna hommikul`, one that left the verb first and turned a
 * statement into a question, and one put between `ei` and its verb.
 *
 * **It reads the whole dictionary and the app does not**, which is worth
 * knowing before trusting a number off it. A screen narrows to the words of
 * the sentences it is about to set and asks the database about those, so a
 * rule can fire here and reach nobody: that is exactly what happened when the
 * adverb move landed, since the narrowing still asked whether a sentence held
 * a *particle* and every figure this printed about `täna` was true of nothing
 * a learner could open. What closes that now is not a change here but a check
 * in `wordOrder.test.ts`, which rebuilds what the app's two queries would
 * return and asserts the two readings offer the same orders for every
 * sentence in this file.
 *
 * No database, no network and no key: it reads `prisma/data/expanded.json` and
 * the course harvest through `shippedDictionary`, which is what the seed
 * loads.
 */
import { isBuildable, naturalSentence } from "../lib/estonian/cloze";
import { alsoRightOrders, orderContextFrom } from "../lib/estonian/wordOrder";
import { dictionaryRows } from "./lib/dictionary";

const rows = dictionaryRows();
const dict = orderContextFrom(rows);

let sentences = 0;
const offered: { et: string; also: string }[] = [];
const seen = new Set<string>();

for (const row of rows) {
  for (const example of row.examples) {
    const et = example.et;
    if (!naturalSentence(et) || !isBuildable(et) || seen.has(et)) continue;
    seen.add(et);
    sentences++;
    for (const also of alsoRightOrders(et, dict)) offered.push({ et, also });
  }
}

for (const { et, also } of offered) {
  console.log(`  ${et}\n    also right: ${also}`);
}

const share = sentences === 0 ? 0 : (offered.length / sentences) * 100;
console.log(
  `\n${offered.length} alternative orders over ${sentences} sentences the builder can set `
  + `(${share.toFixed(2)}%).`,
);

/*
  A FLOOR AND A CEILING, because both ways of being wrong are silent. A run
  that offers nothing is a rule that has stopped firing, which reads exactly
  like a dictionary with no particle verbs in it; a run that offers an
  alternative for most sentences is a rule that has stopped refusing, which
  reads exactly like a clean report. Neither is a target: the number to look at
  is the list above.
*/
if (sentences < 5_000) {
  console.error("\nToo few sentences to say anything. Is the dictionary built?");
  process.exit(1);
}
if (offered.length < 20) {
  console.error("\nThe rule fired on almost nothing. It has stopped reading the dictionary.");
  process.exit(1);
}
if (share > 5) {
  console.error("\nThe rule fires on more than one sentence in twenty. It has stopped refusing.");
  process.exit(1);
}
