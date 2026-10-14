import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TABLES } from "./tables";
import { serializeTable } from "./table";

/**
 * THE BROWSER AND THE SERVER READ ONE TABLE.
 *
 * The server merges the areas when it starts; a browser loads
 * `generated/<locale>.json` (`load.ts`). If an area changes and the file does
 * not, the server renders a line in Russian and the browser hydrates it in
 * English, which React reports as a mismatch and redraws in the wrong
 * language. Compared as the exact text the script writes, so a stale file
 * fails here rather than on somebody's screen.
 */
describe("the generated tables", () => {
  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}.json is what the areas say today (npm run i18n:tables writes it)`, () => {
      const onDisk = readFileSync(join(import.meta.dirname, "generated", `${locale}.json`), "utf8");
      expect(onDisk === serializeTable(TABLES[locale]), "run npm run i18n:tables").toBe(true);
    });
  }
});
