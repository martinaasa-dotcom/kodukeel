import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function shareSheetClosedIsAChoice({ check, ALL, code }: InvariantKit) {
  check("closing the share sheet is not reported as a failure", () => {
    /*
      navigator.share rejects with an AbortError when the learner closes the sheet,
      and the progress card answered every rejection with "Could not build the
      card just now", about a card that was built. Every caller asks shareRefusal
      in lib/ux/share.ts which of the two it was.
    */
    const sharers = ALL.filter((f) => /navigator\.share\(/.test(code(f)));
    assert.ok(sharers.length >= 1, "nothing calls navigator.share, so this check stopped looking");
    const blind = sharers.filter((f) => !/\bshareRefusal\(/.test(code(f)));
    assert.deepEqual(blind, [], `these read a closed share sheet as a failure: ${blind.join(", ")}`);
  });
}
