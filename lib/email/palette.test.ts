/*
  THE LETTER PAINTS WHAT THE APP PAINTS, AND THIS IS THE ONLY THING THAT SAYS SO.

  `app/` and `components/` are swept for a raw hex by the invariant suite, so a
  screen cannot invent a colour. An email has to write the value out, because
  `var(--accent)` resolves to nothing in Gmail, which means `lib/email` is the
  one place in this project where the palette exists as a second copy.

  A second copy that nothing compares is a second copy that drifts. Somebody
  tunes `--accent` against the dark theme one afternoon, the app changes, and
  every letter goes on sending last year's purple to somebody who is about to
  click through to this year's. Nothing fails, nothing looks broken in
  isolation, and the two only disagree where a reader sees both at once, which
  is exactly the moment the email is trying to survive.

  So this reads the stylesheet.
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DARK, DARK_TOKEN_OF, PALETTE, TOKEN_OF } from "./palette";

const CSS = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

/**
 * What the stylesheet declares a token as, inside one block.
 *
 * Scoped to a block rather than read off the whole file, because `--ink` is
 * declared in the light block and again in the dark one and a file-wide search
 * would answer with whichever came first. The light theme is `:root {` and the
 * dark one is `:root[data-theme="dark"] {`, which is the rule CLAUDE.md
 * settles: light is the default and dark is a choice.
 */
function declaredIn(selector: string, token: string): string | null {
  const start = CSS.indexOf(selector);
  if (start < 0) return null;
  const block = CSS.slice(start, CSS.indexOf("\n  }", start));
  const found = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(block);
  return found?.[1]?.toLowerCase() ?? null;
}

describe("the letter palette is the app's palette", () => {
  it("writes out the light theme exactly as the stylesheet declares it", () => {
    for (const [key, value] of Object.entries(PALETTE)) {
      const token = TOKEN_OF[key as keyof typeof PALETTE];
      expect(
        declaredIn("  :root {\n    color-scheme: light;", token),
        `${key} is ${value} in lib/email/palette.ts, and ${token} is something else in app/globals.css. ` +
          "An email cannot read a custom property, so this file is a copy, and a copy nothing " +
          "compares is a letter that quietly stops matching the app it links to.",
      ).toBe(value.toLowerCase());
    }
  });

  it("writes out the dark overrides exactly as the stylesheet declares them", () => {
    for (const [key, value] of Object.entries(DARK)) {
      const token = DARK_TOKEN_OF[key as keyof typeof DARK];
      expect(declaredIn('  :root[data-theme="dark"] {', token), `${key} / ${token} has drifted`).toBe(
        value.toLowerCase(),
      );
    }
  });

  it("names a token for every colour it holds, and holds a colour for every token it names", () => {
    // Either half alone passes on a key added to one table and not the other,
    // which is a colour with no check behind it wearing a checked colour's clothes.
    expect(Object.keys(PALETTE).sort()).toEqual(Object.keys(TOKEN_OF).sort());
    expect(Object.keys(DARK).sort()).toEqual(Object.keys(DARK_TOKEN_OF).sort());
  });
});
