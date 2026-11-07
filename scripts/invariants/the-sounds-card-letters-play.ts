import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE FOUR LETTERS ON THE SOUNDS CARD PLAY, AND THE REST OF THE CARD OPENS THE SOUNDS.
 *
 * The card under the grammar stops says "Press a letter and hear it", and for a
 * while pressing one opened the module without a sound: the tiles were plain
 * spans inside the link. A button cannot sit inside a link, so the card is a
 * box, the title is the link, the letters are `SoundKey` buttons, and the box
 * answers a press on the rest of itself. It does not stretch the link over the
 * card with a pseudo-element: that draws an anchor on top of the sentence, and
 * the containment sweep refuses it.
 */
export default function theSoundsCardLettersPlay({ check, code }: InvariantKit) {
  check("the sounds card's letters are sound keys, and the grammar page draws that card", () => {
    const page = code("app/(app)/grammar/page.tsx");
    assert.match(page, /<SoundsCard\b/, "the grammar page no longer draws the sounds card");
    const card = code("components/sounds/SoundsCard.tsx");
    assert.match(card, /<SoundKey\b/, "the card's letters are no longer SoundKey buttons");
    for (const clip of ["sound-ou", "sound-ae", "sound-oe", "sound-ue"]) {
      assert.ok(card.includes(clip), `the card has no recording for ${clip}`);
    }
  });

  check("a press on the rest of the card opens the sounds, and a letter or link keeps its own answer", () => {
    const card = code("components/sounds/SoundsCard.tsx");
    assert.match(card, /onClick=\{open\}/, "the box no longer answers a press on itself");
    assert.match(card, /closest\("button, a"\)\) return/, "a press on a letter or the title would be answered twice");
    assert.match(card, /router\.push\(HREF\)/, "the box no longer opens the sounds");
    assert.doesNotMatch(card, /after:absolute|after:inset-0/, "the link is stretched over the card again, over the words");
    assert.doesNotMatch(card, /<Link\b[^>]*>\s*<SoundKey/, "a letter is inside a link again");
  });
}
