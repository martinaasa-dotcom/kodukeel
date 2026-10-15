import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * TODAY ASKS THE SERVER AGAIN WHEN IT IS SHOWN FROM A COPY.
 *
 * Today's review count is the length of Review's own queue, and that only
 * holds while the copy on screen is current. A grade clears the page cache,
 * but time and another device do not: a copy the router kept, a page fetched
 * on a hover or a tab left open could promise a number Review no longer
 * holds. `KeepCurrent` refreshes such a copy, and it measures age on the
 * tab's own clock from when it first saw that render, never against the
 * server's stamp, or a device clock ahead of the server would refresh for
 * ever.
 */
export default function todayIsCurrentWhenShownAgain({ check, code }: InvariantKit) {
  check("Today refreshes a copy of itself it shows again", () => {
    const today = code("app/(app)/page.tsx");
    assert.match(today, /<KeepCurrent renderedAt=\{now\.getTime\(\)\} \/>/,
      "Today no longer refreshes a cached copy, so its review count can promise a session Review no longer holds");
    const keep = code("components/KeepCurrent.tsx");
    assert.match(keep, /FIRST_SEEN\.get\(renderedAt\)/, "KeepCurrent no longer measures age from when this tab first saw the render");
    assert.doesNotMatch(keep, /Date\.now\(\)\s*-\s*renderedAt/,
      "KeepCurrent compares the server's clock with the device's, which refreshes for ever on a device clock that runs ahead");
    assert.match(keep, /visibilitychange/, "KeepCurrent no longer refreshes a tab brought back after a while");
  });
}
