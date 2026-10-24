import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * `DEMO_DEPLOYMENT` DRAWS A BANNER AND CLOSES THE DOOR TO CRAWLERS, AND DOES NOTHING ELSE.
 *
 * docs/44-sixth-batch.md D18. The demo is local mode because it carries no
 * Supabase keys (ADR-013), and CLAUDE.md forbids any flag that could switch
 * sign-in off on a deployment that has it. A variable named for the demo is
 * exactly the flag somebody would reach for next ("skip the onboarding on the
 * demo", "let the demo in without a session"), so the readers are a closed
 * list of two, and nothing under `lib/auth/` or the middleware may name it at
 * all, comments included.
 */
const READERS = ["components/DemoBanner.tsx", "app/robots.ts"];

export default function theDemoFlagTouchesOnlyTheBanner({ check, code, read, ALL }: InvariantKit) {
  check("DEMO_DEPLOYMENT is read by the banner and the robots route and nothing else", () => {
    const readers = ALL.filter((f) => /process\.env\.DEMO_DEPLOYMENT|env\[["']DEMO_DEPLOYMENT/.test(code(f))).sort();
    assert.deepEqual(readers, [...READERS].sort(), `the demo flag is read by ${readers.join(", ")}`);
  });

  check("nothing that decides who is signed in names the demo flag", () => {
    const auth = [...ALL.filter((f) => f.startsWith("lib/auth/")), "middleware.ts"];
    assert.ok(auth.length >= 5, `only ${auth.length} sign-in files found; the sweep moved`);
    const naming = auth.filter((f) => /DEMO_DEPLOYMENT/.test(read(f)));
    assert.deepEqual(naming, [], `these sign-in files name the demo flag: ${naming.join(", ")}`);
  });

  check("the banner warns on a model key rather than staying quiet", () => {
    const banner = code("components/DemoBanner.tsx");
    assert.match(banner, /PROVIDER_KEY_ENV\.filter\(/, "the banner stopped asking which model keys are set");
    assert.match(banner, /data-demo-banner="unsafe"/, "the warning the reset workflow reads is gone");
  });
}
