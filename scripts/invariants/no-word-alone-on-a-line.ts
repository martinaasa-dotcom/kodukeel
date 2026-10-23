import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * NO WORD ALONE ON THE LAST LINE.
 *
 * The daily quest's lead broke as a full line over a lone "up.", and the fix
 * belongs to the whole app rather than to that one line: `app/globals.css`
 * sets `text-wrap: pretty` on running text and `balance` on headings and on
 * anything centered. This holds both rules there, so a stylesheet tidy-up
 * that drops one brings every orphan back at once.
 */
export default function noWordAloneOnALine({ check, read }: InvariantKit) {
  check("running text never ends on a lone word, and centered text is balanced", () => {
    const css = read("app/globals.css");
    const pretty = css.match(/\n\s*p, li, dd[^{]*\{\s*text-wrap: pretty;/);
    assert.ok(pretty, "app/globals.css no longer sets text-wrap: pretty on paragraphs and list items");
    const balance = css.match(/\n\s*h1, h2, h3[^{]*\.text-center[^{]*\{\s*text-wrap: balance;/);
    assert.ok(balance, "app/globals.css no longer balances headings and centered text");
  });
}
