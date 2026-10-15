import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN INSTALLED APP TURNS WITH THE PHONE.
 *
 * The manifest fixed the installed app upright with `orientation: "portrait"`,
 * which fails WCAG 1.3.4 for anybody whose phone is mounted on its side, a
 * wheelchair mount being the case the criterion was written for. Nothing here
 * needs one orientation: every screen is measured at 844x390. So the manifest
 * may say "any" or nothing, and the accessibility table's 1.3.4 row names this
 * file as what checks it.
 */
export default function noOrientationLock({ check, code }: InvariantKit) {
  check("the installed app is not locked to one orientation", () => {
    const manifest = code("app/manifest.ts");
    const declared = /\borientation:\s*"([^"]+)"/.exec(manifest)?.[1];
    assert.ok(declared === undefined || declared === "any",
      `app/manifest.ts locks the installed app to "${declared}", which fails WCAG 1.3.4 (Orientation)`);
  });
}
