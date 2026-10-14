import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A BUILD THAT FAILS IN A SUITE SAYS WHY, BECAUSE "DID NOT COMPLETE" IS NOT A CAUSE.
 *
 * `scripts/test-signin.mjs` makes its own hosted-mode build. It ran that with
 * `stdio: "ignore"`, so on 2026-10-14 a CI run whose build exited after twenty
 * eight seconds left one line, that the build "did not complete on this
 * machine", and 29 of 39 checks waived. The same build passed locally and
 * passed on a re-run, and nobody could say what had happened the first time,
 * because the only account of it had been thrown away. A failure may not
 * misname its cause, and one that names none is the same fault with less in it.
 *
 * Two halves, since either alone passes on the broken shape: the build's
 * output is kept (not ignored), and it is printed before the suite waives
 * anything, so the waiver is never the first thing a reader meets.
 */
export default function aFailedBuildSaysWhy({ check, code }: InvariantKit) {
  const suite = code("scripts/test-signin.mjs");

  check("the sign-in suite keeps the hosted build's output instead of ignoring it", () => {
    const spawned = suite.match(/spawnSync\(\s*"npx",\s*\["next",\s*"build"\][^;]*?\);/);
    assert.ok(spawned, "found no spawnSync of `next build` in scripts/test-signin.mjs; the pattern stopped matching");
    assert.ok(!/stdio:\s*"ignore"/.test(spawned[0]), "the hosted build is run with `stdio: \"ignore\"`, so a build that fails leaves no account of why");
    assert.ok(/encoding:\s*"utf8"/.test(spawned[0]), "the hosted build is run without `encoding`, so its output arrives as buffers nobody prints");
  });

  check("a build that fails is described before the suite waives anything for it", () => {
    const failed = suite.indexOf("built.status !== 0");
    assert.ok(failed >= 0, "found no test of the build's status in scripts/test-signin.mjs; the pattern stopped matching");
    const described = suite.indexOf("buildFailure(built", failed);
    const waived = suite.indexOf("absent(", failed);
    assert.ok(described >= 0, "a failed build is waived without being described");
    assert.ok(waived >= 0, "the failed-build branch no longer waives anything, so this check no longer describes the file");
    assert.ok(described < waived, "the build's account is printed after the waiver, so the waiver is the first thing a reader meets");
  });
}
