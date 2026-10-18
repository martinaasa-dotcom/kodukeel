import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * GOOGLE'S BUTTON SITS ON THE CARD, NOT ON A WHITE SLAB.
 *
 * The dark theme sets `color-scheme: dark`, and a browser paints an iframe
 * whose own document does not share the scheme onto an opaque backdrop in
 * that document's canvas color. Google's frame hangs twenty pixels wider than
 * its button, so the backdrop was a white box round "Continue with Google" on
 * the dark sign-in card. Reported off the sign-in screen.
 */
export default function googleButtonHasNoBackdrop({ check, read }: InvariantKit) {
  check("Google's frame on the sign-in screen declares a light color scheme", () => {
    const css = read("app/globals.css");
    const rule = css.match(/\.gsi-button iframe\s*\{([^}]*)\}/);
    assert.ok(rule, "the `.gsi-button iframe` rule is gone");
    assert.match(rule[1]!, /color-scheme:\s*light/, "the frame no longer says it is light, so the dark theme paints a white backdrop round it");
  });
}
