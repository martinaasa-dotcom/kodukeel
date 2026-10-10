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
    assert.match(css, /:not\(\.hero-fan-long\)/, "a long headline no longer goes above the cards");
    assert.match(css, /@container hero-fan \(max-width: \d+px\)[\s\S]*?grid-template-columns/, "a phone no longer gets the cards as a grid");
    assert.match(css, /prefers-reduced-motion: reduce/, "the hero moves for somebody who asked it not to");
    assert.doesNotMatch(css, /\bopacity:\s*0\.\d/, "a hero sets a fade on something that may hold words");
  });
}
