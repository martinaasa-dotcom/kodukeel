import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A FILE WRITTEN FOR A LANGUAGE MODEL IS A FILE IT CAN REACH SIGNED OUT.
 *
 * PageSpeed's agentic browsing asks for `/llms.txt` and for an agent catalog
 * under `/.well-known/`. The gate answered both with the sign-in page, which
 * the checker read as an llms.txt with no heading and no links and as a
 * catalog that does not validate. The file is served by a route, both paths
 * are named in `isPublicPath`, and the page list in the file is the sitemap's,
 * so the two cannot name different public pages.
 */
export default function anAgentIsToldWhatTheSiteIs({ check, code }: InvariantKit) {
  check("llms.txt and /.well-known/ are reachable signed out, and llms.txt is Markdown with links", () => {
    const middleware = code("middleware.ts");
    for (const path of ["/llms.txt", "/.well-known/"]) {
      assert.ok(middleware.includes(`path.startsWith("${path}")`), `isPublicPath does not name ${path}, so a crawler gets the sign-in page`);
    }
    const route = code("app/llms.txt/route.ts");
    assert.match(route, /"# Kodukeel"/, "llms.txt has lost its H1, which the checker requires");
    assert.match(route, /`- \[\$\{title\}\]\(\$\{at\(path\)\}\)/, "llms.txt no longer writes its pages as Markdown links");
    const listed = [...route.matchAll(/\["(\/[^"]*)", "/g)].map((m) => m[1]);
    const mapped = [...code("app/sitemap.ts").matchAll(/path: "(\/[^"]*)"/g)].map((m) => m[1]);
    assert.ok(mapped.length >= 5, `read ${mapped.length} sitemap paths, so this stopped reading the sitemap`);
    assert.deepEqual([...listed].sort(), [...mapped].sort(), "llms.txt and the sitemap name different public pages");
  });
}
