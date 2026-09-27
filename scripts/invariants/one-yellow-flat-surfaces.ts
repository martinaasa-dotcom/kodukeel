import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * ONE YELLOW, AND NOTHING CASTS A SHADOW IT DOES NOT NEED.
 *
 * The palette has a single yellow and the stylesheet held four: `--butter` at
 * #ffc400, a button gold at #ffd23f with a darker #b88a00 "lip" under it, the
 * dark theme's #ffd35c and the printed sheet's #cf9114. Side by side on one
 * screen they read as a palette nobody had decided. So `--butter` is the
 * yellow in every theme and on paper, and the loud button is painted with it
 * rather than with a gold of its own.
 *
 * And the button glowed under a pointer: a lip in a deeper shade and a blurred
 * halo that grew on hover, which reads as a product from ten years ago. A
 * primary button is a flat fill; under a pointer it gains a hairline ring and
 * nothing else. Cards were each given a drop under them as well, on top of the
 * border that already says where they end, so every surface token that
 * described a drop is `none` or a hairline. The one thing still allowed to
 * cast is a panel floating over the page, which has to read as above it, and
 * it asks for that by name (`--shadow-float`).
 */
export default function oneYellowFlatSurfaces({ check, read }: InvariantKit) {
  check("the palette has one yellow and no surface casts a shadow it does not need", () => {
    const css = read("app/globals.css");
    const butters = new Set([...css.matchAll(/--butter:\s*([^;]+);/g)].map((m) => m[1]!.trim().toLowerCase()));
    assert.deepEqual([...butters], ["#ffc400"], `--butter is defined as ${[...butters].join(", ")}; the palette has one yellow`);
    for (const m of css.matchAll(/--cta:\s*([^;]+);/g)) {
      assert.equal(m[1]!.trim(), "var(--butter)", "the loud button's yellow is its own again rather than the palette's");
    }
    assert.ok(!/--cta-lip|--accent-lip|var\(--lip\)/.test(css), "a button is standing on a lip again");
    for (const m of css.matchAll(/--depth(?:-sm|-lift)?:\s*([^;]+);/g)) {
      assert.equal(m[1]!.trim(), "none", "a card casts a drop again; its border already says where it ends");
    }
    const key = /\.key:hover[^{]*\{([^}]*)\}/.exec(css);
    assert.ok(key, "the key's hover rule is gone, so the button no longer answers a pointer");
    assert.ok(!/\d+px\s+\d+px\s+-?\d+px/.test(key[1]!.replace(/inset 0 0 0 [\d.]+px/, "")),
      "the button glows under a pointer again; a hover is a hairline ring, not a halo");
  });
}
