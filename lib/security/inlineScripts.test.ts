import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AWAKE_SCRIPT } from "@/lib/ux/awake";
import { THEME_SCRIPT } from "@/lib/ux/themeScript";
import { INLINE_SCRIPTS, inlineScriptHashes, scriptHash } from "./inlineScripts";

describe("the layout's inline scripts are allowed by their hash", () => {
  it("hashes exactly what the browser hashes: SHA-256 of the script's text, base64", async () => {
    for (const source of INLINE_SCRIPTS) {
      const expected = `'sha256-${createHash("sha256").update(source, "utf8").digest("base64")}'`;
      expect(await scriptHash(source)).toBe(expected);
    }
  });

  it("names both scripts the root layout draws", async () => {
    expect(INLINE_SCRIPTS).toEqual([THEME_SCRIPT, AWAKE_SCRIPT]);
    expect(await inlineScriptHashes()).toHaveLength(2);
  });
});
