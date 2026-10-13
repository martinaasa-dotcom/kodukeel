import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A ROUND THAT LINKS BACK TO ITS OWN ROUTE REMOUNTS WHEN IT GETS THERE.
 *
 * Väljendid ended on "Another set", a link to `/review/sayings?set=n`, and
 * pressing it changed the address and nothing on the screen: a soft
 * navigation to the same route keeps a client component's state while its
 * place in the tree holds still, and the session held its plan in `useState`
 * and was sitting on the finished screen. Openers and Kakskümmend küsimust
 * had already worked this out and key their session on the round; Väljendid
 * had not, and nothing said so.
 *
 * So a session whose code links to its own route with a query string has to
 * be rendered by that route's page with a `key`, read off the code with the
 * comments stripped. A floor holds the sweep to finding the three it was
 * written for, or a pattern that stops matching passes on nobody.
 */
export default function aRoundThatLinksToItselfRemounts({ check, ALL, code }: InvariantKit) {
  check("a session linking to its own route with a query string is keyed by its page", () => {
    const sessions = ALL.filter((f) => /^app\/\(app\)\/review\/[^/]+\/[A-Za-z]+Session\.tsx$/.test(f));
    const faults: string[] = [];
    let found = 0;
    for (const file of sessions) {
      const segment = file.split("/")[3]!;
      if (!new RegExp(`href=\\{\`/review/${segment}\\?`).test(code(file))) continue;
      found++;
      const name = file.split("/").pop()!.replace(/\.tsx$/, "");
      const page = file.replace(/[^/]+$/, "page.tsx");
      if (!existsSync(page)) { faults.push(`${file}: no page beside it`); continue; }
      const render = code(page).match(new RegExp(`<${name}\\b[^>]*>`, "s"))?.[0] ?? "";
      if (!/\bkey=/.test(render)) faults.push(`${page}: <${name}> links to its own route and carries no key`);
    }
    assert.ok(found >= 3, `found ${found} sessions linking to their own route, expected at least 3`);
    assert.deepEqual(faults, []);
  });
}
