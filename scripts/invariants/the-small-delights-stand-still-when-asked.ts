import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE SMALL DELIGHTS STAND STILL WHEN ASKED, AND A RIPPLING WORD IS STILL ONE
 * WORD TO A SCREEN READER.
 *
 * An answer settling, a Tähed letter landing in its slot, a word rippling
 * letter by letter, the streak's flame catching, tonight's words arriving one
 * after another: each is a one-shot drawn in `app/globals.css`, and each is a
 * thing somebody who asked their device for less movement should never see.
 * The global reduced-motion rule shortens a duration and leaves a delay, so a
 * staggered ripple would still sit out its delays; these are switched off by
 * name, and this holds the list to the classes that animate.
 *
 * And a word drawn one element per letter is read letter by letter by some
 * screen readers, so `WaveWord` hides its letters and says the word once,
 * whole, and a rolling figure does the same with its digits. A tonight's-list
 * check lands only on a step ticked in this sitting, never on every visit.
 * Each arm is read off the code rather than the comments.
 */
const DELIGHTS = [".option-right", ".option-wrong", ".wave-letter", ".tile-land", ".flame-lit", ".flame", ".word-arrive", ".roll-digit", ".tick-land"];

export default function theSmallDelightsStandStillWhenAsked({ check, read, code }: InvariantKit) {
  check("every small delight is switched off under reduced motion", () => {
    const css = read("app/globals.css");
    const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([^{}]*)\{\s*animation: none !important;\s*\}/g)].map((m) => m[1]!);
    assert.ok(blocks.length > 0, "the delights' reduced-motion block is gone");
    const covered = blocks.join(" ");
    const missing = DELIGHTS.filter((cls) => !new RegExp(`${cls.replace(".", "\\.")}(?![\\w-])`).test(covered));
    assert.deepEqual(missing, [], `${missing.join(", ")} animate with nothing switching them off under reduced motion`);
    for (const cls of DELIGHTS) {
      assert.match(css, new RegExp(`${cls.replace(".", "\\.")}[^{]*\\{[^}]*animation:`), `${cls} no longer animates, so take it off this list`);
    }
  });

  check("a rippling word hides its letters and says the word once", () => {
    const wave = code("components/motion/WaveWord.tsx");
    assert.match(wave, /aria-hidden className=\{`wave-word/, "WaveWord's letters are no longer hidden from a screen reader");
    assert.match(wave, /!named && <span className="sr-only">\{text\}<\/span>/, "WaveWord no longer says the word whole");
  });

  check("a rolling figure hides its digits and says the figure once, after them", () => {
    const roll = code("components/motion/RollNumber.tsx");
    assert.match(roll, /<span aria-hidden className="roll-number">/, "RollNumber's digits are no longer hidden from a screen reader");
    assert.match(roll, /<\/span>\s*<span className="sr-only">\{text\}<\/span>/, "RollNumber no longer says the figure whole, after the digits");
    const ui = code("components/ui.tsx");
    assert.equal((ui.match(/<RollNumber value=\{value\} \/>/g) ?? []).length, 2, "Stat and StatTile no longer both roll their figure");
  });

  check("a step's check lands only when it was ticked in this sitting", () => {
    const list = code("components/course/StepList.tsx");
    assert.match(list, /arrivedDone\.current\.has\(step\.id\) \? undefined : "tick-land"/, "every done step's check springs in on every visit again");
  });

  check("a word that ripples only when reached names the end of the ripple, not its first letter", () => {
    for (const f of ["components/WordOfDay.tsx", "app/(app)/course/page.tsx"]) {
      const source = code(f);
      assert.match(source, /<WaveWord\b/, `${f} no longer draws a rippling word`);
      assert.match(source, /data-hop-end=\{WAVE_END\}/, `${f} clears its ripple on something other than the last letter`);
    }
  });
}
