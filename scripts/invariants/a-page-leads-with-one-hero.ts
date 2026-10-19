import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A TOP-LEVEL PAGE LEADS WITH ONE HERO, AND ONLY TODAY'S IS LIT.
 *
 * Learn, Practice, Progress, My words, In real life and the course each drew
 * their own night card, and the reported fault was that no two were balanced
 * the same way: a headline ending on one stranded word, text running up against
 * a tile, a different left edge on every page and an empty middle on half of
 * them. `components/HeroFan.tsx` is the one card now, and the spacing is in it
 * and in `app/hero-fan.css` rather than in each page.
 *
 * Four arms. Every page that leads with a hero draws it through `HeroFan`;
 * Today's module is the one hero passed `bright`, which is what lets it stand
 * out without anything shouting; the card measures its words and fits its
 * headline rather than breaking it; and the stylesheet keeps the three rules
 * that hold the balance: a cards' column never narrower than the fan, a
 * headline too long for the column going above the cards, and the cards laid
 * out as a grid where a phone has no room for a fan.
 */
const HEROES = [
  "app/(app)/page.tsx",
  "app/(app)/learn/page.tsx",
  "app/(app)/practice/page.tsx",
  "app/(app)/progress/page.tsx",
  "app/(app)/words/page.tsx",
  "app/(app)/progress/readiness/page.tsx",
  "app/(app)/course/page.tsx",
];

export default function aPageLeadsWithOneHero({ check, APP, COMPONENTS, code }: InvariantKit) {
  check("every top-level page that leads with a hero draws it through HeroFan", () => {
    const missing = HEROES.filter((f) => !/<HeroFan\b/.test(code(f)));
    assert.deepEqual(missing, [], `${missing.join(", ")} no longer lead with HeroFan`);
    const split = [...APP, ...COMPONENTS].filter((f) => /\bHeroSplit\b/.test(code(f)));
    assert.deepEqual(split, [], `${split.join(", ")} reach for the old split hero`);
  });

  check("only Today's module is the bright hero", () => {
    const bright = [...APP, ...COMPONENTS].filter((f) => /<HeroFan\b[^>]*?\bbright\b/s.test(code(f)));
    assert.deepEqual(bright, ["app/(app)/page.tsx"], `the bright hero is drawn by ${bright.join(", ") || "nobody"}`);
  });

  check("the hero measures its words and fits its headline rather than breaking it", () => {
    const hero = code("components/HeroFan.tsx");
    assert.match(hero, /<FitText\b[\s\S]*?as="h2"/, "the headline is not fitted, so a long Estonian word would break");
    assert.match(hero, /textWrap: "balance"/, "the hero's lines are no longer balanced");
    assert.match(hero, /data-measure/, "the text block no longer shrinks to its widest line");
    assert.match(hero, /labelStep\(/, "a fan's labels are no longer one size, on the scale");
  });

  check("the hero's stylesheet keeps the rules that hold the balance", () => {
    const css = code("app/hero-fan.css");
    assert.match(css, /minmax\(var\(--fan-min\), 1fr\)/, "the cards' column can be narrower than the fan");
    assert.match(css, /\.hero-fan-long \.hero-fan-row[\s\S]*?"head head"/, "a long headline no longer runs across the top");
    assert.match(css, /prefers-reduced-motion: reduce/, "the hero moves for somebody who asked it not to");
    assert.doesNotMatch(css, /\bopacity:\s*0\.\d/, "a hero sets a fade on something that may hold words");
    /* The two copies of the fan are one fan: a fix made to one and not the other is a fan that differs at five cards. */
    const fans = [...css.matchAll(/@container hero-fan \(min-width: \d+px\) \{\n  \.hero-fan[^{]*hero-fan-hand\) \{([\s\S]*?)\n  \}\n\}/g)].map((m) => m[1]);
    assert.equal(fans.length, 2, `the fan is written ${fans.length} times, not twice`);
    assert.equal(fans[0], fans[1], "the fan for four cards and the fan for five have drifted apart");
  });

  check("a headline across the top has no stretched empty row under it", () => {
    const css = code("app/hero-fan.css");
    const rule = css.match(/\.hero-fan-long \.hero-fan-row \{([^}]*)\}/)?.[1] ?? "";
    assert.ok(rule, "the long-headline layout is gone");
    assert.doesNotMatch(rule, /\b1fr\b/, "a row under the headline is stretched to the cards' height again, so the words float far below it");
    assert.match(rule, /grid-template-rows:\s*auto auto auto/, "the long-headline rows are no longer the height of their content");
    /* The card's own height is bounded: it is padding plus what is drawn in it, never a fixed fraction of the window. */
    assert.doesNotMatch(css, /\.hero-fan\s*\{[^}]*(min-height|height:\s*\d+(vh|svh|dvh))/, "the hero is given a height of its own");
  });

  check("a phone gets a hand of cards, and hover is a pointer's alone", () => {
    const css = code("app/hero-fan.css");
    const hero = code("components/HeroFan.tsx");
    /* The narrow shape is the base the fan is layered on, a single row of cards. */
    assert.match(css, /\.hero-fan-cards \{\s*--hand-w:[^}]*display: flex/, "the hand is no longer the cards' own shape");
    assert.doesNotMatch(css, /grid-template-columns: 1fr 1fr/, "a phone deals the cards into a grid of tiles again");
    /* Only the drawing moves: a card that moved under the pointer that lifted it lost the hover and twitched. */
    assert.match(hero, /className="hero-fan-face"/, "a card is no longer two boxes, where it sits and what is drawn");
    for (const m of css.matchAll(/\.hero-fan-card:hover \{([^}]*)\}/g)) {
      assert.doesNotMatch(m[1]!, /transform|translate|scale|rotate/, "a hovered card moves its own hit box again");
    }
    /* Every lift and every sheen sits inside a block for a pointer that can hover. */
    const HOVER = "@media (hover: hover) and (pointer: fine) {";
    const loose = [...css.matchAll(/:hover \.hero-fan-(face|sheen)/g)].filter((m) => {
      const before = css.slice(0, m.index);
      const open = before.lastIndexOf(HOVER);
      if (open < 0) return true;
      let depth = 0;
      for (const ch of before.slice(open + HOVER.length)) depth += ch === "{" ? 1 : ch === "}" ? -1 : 0;
      return depth < 0;
    });
    assert.ok(css.includes(HOVER), "nothing on the hero is kept to a pointer that can hover");
    assert.equal(loose.length, 0, "a card lifts or shines on a tap, where hover sticks");
  });
}
