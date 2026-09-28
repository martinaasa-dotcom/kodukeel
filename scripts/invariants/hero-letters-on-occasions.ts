import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * The four letters on a hero panel are for occasions, and there is one way to
 * put them there.
 *
 * `Lettered` in components/HeroLetters.tsx is that way: it is the box outside
 * the clipping `.night` panel that the letters can hang off, and a screen
 * drawing `HeroLetters` itself would be a second answer to where that box is.
 * And some screens may not carry them at all: over a board, a conversation or
 * an examination they are a second thing moving beside the box somebody is
 * typing into, which is the rule `docs/18-voice.md` and the design system make
 * about decoration that ticks at the speed of a cursor.
 */
const NEVER = [
  "app/(app)/exam/",
  "app/(app)/sonad/",
  "app/(app)/crossword/",
  "app/(app)/situations/",
  "components/scene/",
];

export default function heroLettersOnOccasions({ check, APP, COMPONENTS, code }: InvariantKit) {
  const files = [...APP, ...COMPONENTS].filter((f) => f.endsWith(".tsx"));

  check("the hero letters are drawn through Lettered and nowhere else", () => {
    const direct = files.filter((f) => f !== "components/HeroLetters.tsx" && /<HeroLetters\b/.test(code(f)));
    assert.deepEqual(direct, [], `draw these through Lettered instead:\n  ${direct.join("\n  ")}`);
  });

  check("the hero letters sit on a handful of panels, and never where somebody is concentrating", () => {
    const users = files.filter((f) => /<Lettered\b/.test(code(f)));
    assert.ok(users.length >= 5, `found only ${users.length} screens with the letters, so this check stopped looking`);
    assert.ok(users.length <= 12, `${users.length} screens carry the letters, which is wallpaper rather than an occasion`);
    const barred = users.filter((f) => NEVER.some((p) => f.startsWith(p)));
    assert.deepEqual(barred, [], `the letters may not go on these screens:\n  ${barred.join("\n  ")}`);
  });
}
