import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function queryValuesMayRepeat({ check, APP, code }: InvariantKit) {
  check("a page types its query values as possibly repeated", () => {
    /*
      ?q=kohv&q=tee is a good address and Next hands the page an array. Twelve
      pages declared searchParams as { q?: string }, so the compiler let an array
      into .trim(), .toUpperCase() and a Prisma where, and the dictionary, the
      exceptions round and /review answered that address with the error screen.
      Typed honestly the compiler finds every read; firstParams in
      lib/ux/queryParam.ts is the reading.
    */
    const pages = APP.filter((f) => /searchParams\s*:\s*Promise</.test(code(f)));
    assert.ok(pages.length >= 25, `only ${pages.length} pages read a query, so this check stopped looking`);
    const narrow = pages.filter((f) =>
      [...code(f).matchAll(/searchParams\s*:\s*Promise<\{([^}]*)\}>/g)].some(([, shape]) =>
        /\w+\??\s*:\s*string\s*(?:;|$)/m.test(shape!.replace(/;/g, ";\n"))),
    );
    assert.deepEqual(narrow, [], `these claim a query value is always one string: ${narrow.join(", ")}`);
  });
}
