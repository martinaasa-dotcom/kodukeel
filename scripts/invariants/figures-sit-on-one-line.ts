import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * FIGURES SIDE BY SIDE SIT ON ONE LINE.
 *
 * Reported off Progress: "Out there" is a row of five counts, and the first
 * carried a small icon stacked above its number, so it sat a line lower than
 * the four beside it. The same page had the fault a second way: the four
 * figures at the top are in a row centred on its cross axis, so a label that
 * wraps to two lines made its cell taller and lifted that figure off the
 * others. Neither is a size fault, so no containment check could see it.
 *
 * Three halves. The components: nothing is drawn above a `Stat`'s figure, the
 * icon goes on the label's line, and a `StatTile` is a subgrid of three rows
 * its neighbours share, so a wrapping label or a longer hint cannot move its
 * figure. The
 * layouts: a row of `Stat`s is never centred or bottom-aligned. And the
 * measurement: `scripts/test-containment.mjs` asks the browser, on every route
 * at every width, whether the figures in each row end on one line, finding a
 * figure by `data-figure` or by being a number set at 24px or more, so a row
 * drawn by hand later is measured without anybody marking it. The demo fixture
 * reports conversations, because a check can only measure a panel it is shown.
 */
export default function figuresSitOnOneLine({ check, code, APP, COMPONENTS }: InvariantKit) {
  check("nothing is drawn above a Stat's figure, and a StatTile's figure is held level", () => {
    const ui = code("components/ui.tsx");
    const from = ui.indexOf("export function Stat(");
    const stat = from < 0 ? "" : ui.slice(from, ui.indexOf("export function StatTile(", from));
    assert.ok(stat, "components/ui.tsx no longer exports Stat where this looks");
    const body = stat.slice(stat.indexOf("return ("));
    const firstChild = body.match(/<div data-stat>\s*<(\w+)([^>]*)>/);
    assert.ok(firstChild, "Stat's root lost `data-stat`, or its first child moved");
    assert.match(firstChild[2] ?? "", /\bdata-figure\b/, "something is drawn above a Stat's figure, which drops it below the figures beside it");
    assert.ok(body.indexOf("{icon") > body.indexOf("data-figure"), "a Stat's icon is drawn above its figure");

    const at = ui.indexOf("export function StatTile(");
    const tile = at < 0 ? "" : ui.slice(at, ui.indexOf("\nexport ", at + 1));
    assert.match(tile, /data-stat/, "StatTile lost the `data-stat` hook");
    assert.match(tile, /data-figure/, "StatTile lost the `data-figure` hook the sweep reads");
    assert.match(tile, /row-span-3 grid grid-rows-subgrid/, "a StatTile no longer shares its label, figure and hint rows with the tiles beside it, so a wrapping label or a longer hint moves its figure");
  });

  check("a row of Stats is never centred or bottom-aligned", () => {
    const offenders: string[] = [];
    for (const file of [...APP, ...COMPONENTS]) {
      if (!file.endsWith(".tsx")) continue;
      const src = code(file);
      for (const m of src.matchAll(/<(\w+)\s[^>]*className="([^"]*\b(?:grid|flex)\b[^"]*)"[^>]*>\s*<Stat(?:Tile)?\b/g)) {
        if (/(?:^|\s)items-(?:center|end|baseline)\b/.test(m[2] ?? "")) offenders.push(`${file}: ${m[2] ?? ""}`);
      }
    }
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });

  check("the containment sweep measures every row of figures, and the fixture draws Out there", () => {
    const sweep = code("scripts/test-containment.mjs");
    assert.match(sweep, /function figuresInRows\(\)/, "the sweep stopped asking whether figures side by side are level");
    assert.match(sweep, /page\.evaluate\(figuresInRows\)/, "the sweep defines the figure check and never runs it");
    assert.match(sweep, /\[data-figure\]/, "the figure check stopped reading the hook Stat and StatTile carry");
    assert.match(sweep, /fontSize\) >= 24/, "the figure check stopped finding hand-drawn numbers by size");
    assert.match(code("scripts/demo-data.ts"), /prisma\.encounter\.createMany/, "the demo fixture reports no conversation, so no suite sees the Out there panel");
  });
}
