import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CARD A LEARNER HID STAYS HIDDEN, AND KEEPS ITS PLACE.
 *
 * Today deals eight cards, and Settings lets any of them be hidden
 * (`hiddenSlotsFrom`, a leading `-` on the slot's id in the same stored row
 * as the order). Three things make that work and each fails silently: the
 * page has to hand the hidden set to the deal, or the button does nothing; the
 * action has to keep the marks when it normalizes the row, or a hide is
 * dropped on the way into the database; and the panel has to write them, or
 * the press is decoration.
 */
export default function aTodayCardCanBeHidden({ check, code }: InvariantKit) {
  check("a card hidden in Settings is not dealt on Today", () => {
    const today = code("app/(app)/page.tsx");
    assert.match(
      today, /hiddenCards = hiddenSlotsFrom\(settings\[SETTING_KEYS\.todayOrder\]\)/,
      "Today no longer reads which cards were hidden",
    );
    assert.match(
      today, /orderTodayCards\(\{[\s\S]*?\}, todayOrderFrom\(settings\[SETTING_KEYS\.todayOrder\]\), hiddenCards\)/,
      "Today deals without the hidden set, so hiding a card does nothing",
    );

    const action = code("app/actions.ts");
    assert.match(
      action, /serialiseTodayOrder\(order, hiddenSlotsFrom\(raw\)\)/,
      "setTodayOrder drops the hidden marks on its way into the database",
    );

    const panel = code("app/(app)/settings/TodayOrderPanel.tsx");
    assert.match(panel, /serialiseTodayOrder\(next, nextHidden\)/, "the Settings panel no longer writes what is hidden");
    assert.match(panel, /Hide \{title\} from Today/, "the hide control lost the name that says which card it hides");
  });
}
