import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * EVERY ICON THE STORE SCRIPT WRITES HAS SOMEBODY WHO READS IT.
 *
 * An earlier script here rasterised the app icon into PNGs and was deleted
 * because nothing ever read what it wrote (`scripts/lib/browser.mjs` records
 * it). `npm run store:icons` writes seven files and each has a reader: the
 * two web icons are named by `app/manifest.ts`, which is what a launcher reads,
 * and every file under `store/icons/` is named by `docs/46-store-listing.md`,
 * which is what the operator uploads from. A file the script writes that
 * neither names, or a name with no file behind it, fails here.
 */
export default function storeIconsHaveReaders({ check, read }: InvariantKit) {
  check("every icon the store script writes is read by the manifest or the listing", () => {
    const sizes = read("scripts/lib/storeSizes.mjs");
    const written = [...sizes.matchAll(/^\s*file:\s*"([^"]+\.png)"/gm)].map((m) => m[1]!);
    assert.ok(written.length >= 7, `read only ${written.length} icon files off scripts/lib/storeSizes.mjs, so this stopped looking`);

    const manifest = read("app/manifest.ts");
    const listing = read("docs/46-store-listing.md");
    for (const file of written) {
      assert.ok(existsSync(file), `${file} is in scripts/lib/storeSizes.mjs and not on disk; run npm run store:icons`);
      if (file.startsWith("public/")) {
        const served = file.slice("public".length);
        assert.ok(manifest.includes(`"${served}"`), `${file} is written for the web manifest and app/manifest.ts does not name ${served}`);
      } else {
        assert.ok(listing.includes(file), `${file} is written for a store and docs/46-store-listing.md does not name it`);
      }
    }

    // And nothing lies in store/icons that the script does not write.
    const onDisk = readdirSync("store/icons").filter((f) => f.endsWith(".png")).map((f) => `store/icons/${f}`);
    for (const file of onDisk) {
      assert.ok(written.includes(file), `${file} is in store/icons and scripts/lib/storeSizes.mjs does not write it`);
    }
  });
}
