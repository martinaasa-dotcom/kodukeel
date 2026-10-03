import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE NET UNDER A COMPOSED LINE IS THE BEAT AS IT IS, NOT AS THE MODEL IS TOLD IT.
 *
 * `stillTalking` hands a closing beat to the composer as a `confirm`, so a
 * model asked something on the way out answers it and leaves the goodbye to
 * the learner. The cheap ladder was spread from the same object and inherited
 * the relabelled beat, and a `confirm` does not take `Head aega!`: with no
 * model behind the run, a learner who asked something as they were leaving
 * read the stage direction "They say goodbye." in English, turn after turn.
 * The keyless sweep could not see it, because its loop never had the
 * relabelling; the critic's harness did, and found it.
 *
 * Both halves are held: the relabelling is still there for the composer, and
 * the cheap ladder names the beat after the spread so the spread cannot win.
 */
export default function theKeylessNetIsTheBeatAsItIs({ check, code }: InvariantKit) {
  check("the scene route's keyless net is handed the beat, not the composer's relabelled one", () => {
    // The reply is assembled once, for the route and every harness (`lib/progress/sceneTurn.ts`).
    const turn = code("lib/progress/sceneTurn.ts");
    assert.match(turn, /beat:\s*stillTalking\s*\?\s*\{\s*\.\.\.beat,\s*move:\s*"confirm"/, "the composer no longer hears a closing beat as a confirm while the learner is still asking");
    const cheap = /const cheap = await sceneLine\(\{([^}]*)\}\)/.exec(turn);
    assert.ok(cheap, "the cheap ladder call was not found; the pattern stopped matching");
    const args = cheap[1]!;
    // `beat` as a property of its own after the spread, shorthand or not: `beat.id` inside a value is not one.
    const after = args.slice(args.indexOf("...line.request")).split(",").map((part) => part.trim());
    assert.ok(/\.\.\.line\.request\b/.test(args) && after.some((part) => /^beat(?:\s*:\s*(?:line\.)?beat)?$/.test(part)),
      "the cheap ladder takes the composer's request without naming `beat` after it, so it inherits the relabelled closing beat");
  });
}
