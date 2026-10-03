import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A GAP SAYS WHAT ITS SENTENCE MEANS ONCE, ON THE QUESTION OR ON THE REVEAL.
 *
 * `GapMeaning` puts the English under a gapped sentence while it is being
 * answered. Every gap screen then reveals the sentence whole, with what it
 * says printed under it, and the question stays on the card above. Four of the
 * seven screens took the line off the question at that point and three did
 * not: walked on a C1 evening, the learn ladder printed `That's an
 * exaggeration!` under `See on ?!` and again under `See on liialdus!`, a hand's
 * width apart. The flash round and the exceptions round drew the same.
 *
 * So every `GapMeaning` is drawn behind a guard that stands down once the
 * answer is in. Read off the guard rather than off any one screen's flag name,
 * since the seven call it four different things.
 */
export default function aGapSaysItsEnglishOnce({ check, code, APP, COMPONENTS }: InvariantKit) {
  check("every gap screen takes the question's English away once the answer is in", () => {
    let seen = 0;
    const loose: string[] = [];
    for (const file of [...APP, ...COMPONENTS]) {
      if (file === "components/GapMeaning.tsx") continue;
      const source = code(file);
      if (!source.includes("<GapMeaning")) continue;
      for (const match of source.matchAll(/\{([^{}]*?)&&\s*<GapMeaning\b/g)) {
        seen++;
        const guard = match[1] ?? "";
        if (!/!\s*\w|===\s*"ask"/.test(guard)) loose.push(`${file}: {${guard.trim()} && <GapMeaning}`);
      }
      const drawn = (source.match(/<GapMeaning\b/g) ?? []).length;
      const guarded = [...source.matchAll(/&&\s*<GapMeaning\b/g)].length;
      if (drawn !== guarded) loose.push(`${file}: ${drawn - guarded} GapMeaning drawn with no guard at all`);
    }
    assert.ok(seen >= 7, `found ${seen} GapMeaning call sites, expected at least the seven gap screens`);
    assert.deepEqual(loose, [], "a gap screen leaves its English standing above the reveal that prints it again");
  });
}
