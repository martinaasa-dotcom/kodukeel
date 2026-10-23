import assert from "node:assert/strict";

import { TABLES } from "../../lib/copy/i18n/merged";
import { VOICE_RULES, findTells } from "../../lib/copy/voice";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A SENTENCE ENDS WHEN ITS FACTS DO.
 *
 * "No date is set, so that's the whole story." was reported off the landing
 * page as an instant giveaway that a machine wrote it. Every fact in it was in
 * the sentence before, and the tail was there to sound like somebody
 * finishing. The phrases are the `FLOURISH` group in `lib/copy/voice.ts` and
 * `readerCopy.test.ts` sweeps them line by line; these are the three things
 * that sweep cannot see.
 *
 * A line read whole. The sweep reads one line of source at a time, so a
 * sentence typed as two joined fragments, or wrapped across lines in a
 * translation table, can carry a flourish across the break and pass. Every
 * English line the translation tables are keyed on is a whole sentence a
 * reader sees, so it is read here as one string.
 *
 * The curly apostrophe. The landing page is typeset with it and every pattern
 * is written with the straight one, so `findTells` folds before it matches.
 * Without the fold "That’s the whole trick" passed for as long as it was
 * there, on the first screen anybody opens.
 *
 * Anu. A phrase banned on the screen and allowed in her answer is the fault
 * `voice.ts` was written to end, so the rule has to reach her prompt.
 */
export default function aSentenceEndsWhenItsFactsDo({ check }: InvariantKit) {
  check("no English line the app translates ends on a flourish, read whole", () => {
    const lines = new Set([...Object.keys(TABLES.ru.lines), ...Object.keys(TABLES.uk.lines)]);
    assert.ok(lines.size >= 5000, `only ${lines.size} translated lines found, so the tables stopped loading`);
    const found = [...lines].flatMap((line) => {
      const tells = findTells(line);
      return tells.length ? [`[${tells.map((t) => t.name).join(", ")}] ${line.slice(0, 120)}`] : [];
    });
    assert.deepEqual(found, [], `${found.join("\n")}\nend the sentence where its facts end (docs/18-voice.md, section 3b)`);
  });

  check("the flourish is found through a curly apostrophe as well as a straight one", () => {
    for (const line of ["That’s the whole trick.", "No date is set, so that's the whole story.", "Here’s the secret: three forms."]) {
      assert.ok(findTells(line).length > 0, `nothing caught: ${line}`);
    }
  });

  check("Anu is told not to end on a flourish", () => {
    const rules = VOICE_RULES.join("\n");
    for (const phrase of ["whole story", "Here's the secret", "and that's fine"]) {
      assert.ok(rules.includes(phrase), `VOICE_RULES no longer names "${phrase}", so Anu may say what a screen may not`);
    }
  });
}
