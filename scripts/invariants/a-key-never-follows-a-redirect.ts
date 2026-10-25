import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A REQUEST CARRYING A KEY FOLLOWS NO REDIRECT, AND NO KEY RIDES IN AN ADDRESS.
 *
 * `fetch` follows a redirect with the headers it was sent with, so a provider
 * (or anything between the server and it) answering 30x would be handed the
 * Anthropic, Groq, Gemini, Ekilex or Resend key along with the request. Every
 * call that carries one says `redirect: "error"`, or `"manual"` where the
 * caller reads the answer itself (lib/push). And Gemini's key went as
 * `?key=` in four URLs, which put it in every proxy and egress log on the way
 * out: it is the `x-goog-api-key` header now (lib/tutor/geminiCache.ts).
 *
 * Read off each call's own options, from the call to the close of its object,
 * and only for calls whose options name a key, so a request with nothing to
 * leak is not asked.
 */
const KEYED = /authorization|api[-_]key|anthropicHeaders\(|geminiHeaders\(|x-api-key|ekilex-api-key/i;

export default function aKeyNeverFollowsARedirect({ check, code, LIB, APP }: InvariantKit) {
  check("every outbound request carrying a key refuses a redirect", () => {
    let keyed = 0;
    const bare: string[] = [];
    for (const file of [...LIB, ...APP].filter((f) => !/\.(test|itest)\.tsx?$/.test(f))) {
      const src = code(file);
      for (const m of src.matchAll(/\b(?:fetch|transport|deps\.fetch)\(\s*[`"'\w]/g)) {
        const options = src.slice(m.index!, m.index! + 700);
        const firstLine = options.split("\n")[0]!;
        // A call closed on its own line (`fetch(url, init)`) passes its options through rather than writing them.
        const end = options.search(/\n\s*\}\)\)?[;,)]/);
        const call = /\)\s*[,;)]?\s*$/.test(firstLine) ? firstLine : end > 0 ? options.slice(0, end) : options;
        if (!KEYED.test(call)) continue;
        keyed += 1;
        if (!/redirect:\s*"(?:error|manual)"/.test(call)) {
          bare.push(`${file}:${src.slice(0, m.index!).split("\n").length}`);
        }
      }
    }
    assert.ok(keyed >= 8, `found ${keyed} keyed requests, so this stopped reading them`);
    assert.deepEqual(bare, [], `a request carrying a key would follow a redirect with the key attached: ${bare.join(", ")}`);
  });

  check("no API key is put in an address", () => {
    const inAddress = [...LIB, ...APP]
      .filter((f) => !/\.(test|itest)\.tsx?$/.test(f))
      .filter((f) => /[?&]key=\$\{/.test(code(f)));
    assert.deepEqual(inAddress, [], "a key travels in a URL, which proxies and egress logs write down");
  });
}
