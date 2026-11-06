import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE FOUR LETTERS ON THE SOUNDS CARD PLAY, AND THE REST OF THE CARD OPENS THE SOUNDS.
 *
 * The card under the grammar stops says "Press a letter and hear it", and for a
 * while pressing one opened the module without a sound: the tiles were plain
 * spans inside the link. A button cannot sit inside a link, so the card is a
 * box, the title is the link and stretches over the card, and the letters are
 * `SoundKey` buttons lifted above it.
 */
export default function theSoundsCardLettersPlay({ check, code }: InvariantKit) {
  check("the sounds card's letters are sound keys above the card's link, not text inside it", () => {
    const page = code("app/(app)/grammar/page.tsx");
    const at = page.indexOf("data-sounds-link");
    assert.ok(at > 0, "the sounds card is gone from the grammar page");
    const card = page.slice(Math.max(0, at - 400), at + 2200);
    assert.match(card, /<SoundKey\b/, "the card's letters are no longer SoundKey buttons");
    assert.match(card, /z-10/, "the letters no longer sit above the card's link");
    assert.match(card, /after:absolute after:inset-0/, "the rest of the card no longer opens the sounds");
    const opener = card.slice(0, card.indexOf("data-sounds-link"));
    assert.doesNotMatch(opener, /<Link\b[^>]*$/, "the card is a link again, so a letter cannot be a button");
  });
}
