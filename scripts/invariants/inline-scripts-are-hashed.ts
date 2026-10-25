import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * EVERY INLINE SCRIPT IS ONE THE POLICY KNOWS BY ITS HASH.
 *
 * A page's scripts run on the request's nonce, and Next stamps that nonce on
 * what it renders (middleware.ts, lib/security/headers.ts). The root layout's
 * own blocking scripts are allowed by their SHA-256 instead
 * (lib/security/inlineScripts.ts), so a third script added to the layout and
 * not to `INLINE_SCRIPTS` is refused by the browser on every page, silently:
 * the theme flashes, or whatever the script was for simply never happens.
 * And an inline `<script>` anywhere else in the tree has neither, so it is the
 * same fault one file over.
 *
 * The middleware half: a nonce minted per request, put on the request so the
 * render can read it, and a policy that carries `'strict-dynamic'` beside it.
 */
export default function inlineScriptsAreHashed({ check, code, APP, COMPONENTS }: InvariantKit) {
  check("every inline script the layout draws is allowed by its hash", () => {
    const layout = code("app/layout.tsx");
    const drawn = [...layout.matchAll(/<script\b[^>]*dangerouslySetInnerHTML=\{\{\s*__html:\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
    const tags = (layout.match(/<script\b/g) ?? []).length;
    assert.ok(drawn.length >= 2, `found ${drawn.length} inline scripts in app/layout.tsx, so this check stopped matching`);
    assert.equal(tags, drawn.length, "app/layout.tsx draws a <script> that is not a named inline string the policy can hash");
    const listed = /INLINE_SCRIPTS[^=]*=\s*\[([^\]]*)\]/.exec(code("lib/security/inlineScripts.ts"))?.[1] ?? "";
    for (const name of drawn) {
      assert.match(listed, new RegExp(`\\b${name}\\b`), `app/layout.tsx draws ${name}, which INLINE_SCRIPTS does not hash`);
    }
  });

  check("no inline script anywhere but the layout", () => {
    const others = [...APP, ...COMPONENTS]
      .filter((f) => f !== "app/layout.tsx" && /\.tsx$/.test(f) && !/\.(test|itest)\.tsx$/.test(f))
      .filter((f) => /<script\b/.test(code(f)));
    assert.deepEqual(others, [], "an inline <script> outside app/layout.tsx carries no nonce and no hash");
  });

  check("the middleware mints a nonce per request and hands it to the render", () => {
    const middleware = code("middleware.ts");
    assert.match(middleware, /mintNonce\(\)/, "middleware.ts no longer mints a nonce");
    assert.match(middleware, /request\.headers\.set\("x-nonce"/, "the nonce no longer reaches the render");
    assert.match(middleware, /request\.headers\.set\("Content-Security-Policy"/, "Next reads the nonce off the request's policy, and it is no longer there");
    assert.match(middleware, /inlineScriptHashes\(\)/, "the layout's scripts are no longer hashed into the policy");
    const headers = code("lib/security/headers.ts");
    assert.match(headers, /`'nonce-\$\{nonce\}'`,\s*"'strict-dynamic'"/, "the per-request policy no longer pairs its nonce with 'strict-dynamic'");
    assert.match(headers, /crypto\.getRandomValues/, "the nonce is no longer drawn from the platform's random source");
  });
}
