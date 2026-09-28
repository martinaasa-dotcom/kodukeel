import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A READING IS NOT A VERDICT.
 *
 * Sky, butter and blush say what happened to an answer: right, nearly,
 * wrong. A figure about the learner (a case's accuracy, a ring of retention,
 * a share of situations, a busy day, a count of conversations) is a reading,
 * and it is drawn in one hue in steps: the accent, from `--scale-1` to
 * `--scale-4`, over `--scale-track`. Progress was painting its readings as a
 * traffic light, a case at 60% in blush and at 86% in sky, a rung of the
 * readiness bar in blush, the tiers of mastery in the three verdict hues and
 * the counts under "Out there" in their inks, and the person it described read
 * the page as red and green marks on themselves. The heatmap ran sky to violet
 * to pink, which is a rainbow rather than a scale.
 *
 * Four arms. A colour chosen by comparing a figure against a number may not
 * pick between two verdict hues. A `Stat` may not be written in a verdict
 * ink. The heatmap reads the scale and nothing else. And the scale is declared
 * once. A warning is still allowed, one verdict hue against a neutral (a clock
 * in its last seconds, an allowance nearly spent), because that is a message
 * rather than a reading. The exam result is exempt by name: a part of a sat
 * paper passed or failed is a mark, which is the one thing these hues mean.
 */
const VERDICT = "(?:good|hard|again|sky|blush|butter)(?:-soft|-ink)?";
const THRESHOLD_TRAFFIC_LIGHT = new RegExp(
  `[<>]=?\\s*[\\w.]+\\s*\\?\\s*"var\\(--${VERDICT}\\)"\\s*:\\s*(?:[^?:"]*\\?\\s*)?"var\\(--${VERDICT}\\)"`,
);
const VERDICT_STAT = new RegExp(`<Stat\\b[^>]*tone=\\{?\\s*(?:"var\\(--${VERDICT}\\)"|VERDICT_INK)`);

const EXEMPT: Record<string, string> = {
  "app/(app)/exam/result/[id]/page.tsx": "a part of a sat paper passed or failed is a mark on it",
};

export default function aReadingIsNotAVerdict({ check, code, read, APP, COMPONENTS }: InvariantKit) {
  check("a figure is never coloured by a threshold between two verdict hues", () => {
    const offenders: string[] = [];
    let asked = 0;
    for (const file of [...APP, ...COMPONENTS]) {
      if (!file.endsWith(".tsx")) continue;
      asked += 1;
      const src = code(file);
      const lines = src.split("\n");
      for (const [i, line] of lines.entries()) {
        if (THRESHOLD_TRAFFIC_LIGHT.test(line) && !EXEMPT[file]) offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
        if (VERDICT_STAT.test(line)) offenders.push(`${file}:${i + 1}: a Stat in a verdict ink`);
      }
      // A multi-line Stat, which is how most round summaries write theirs.
      for (const m of src.matchAll(/<Stat\b[\s\S]*?\/>/g)) {
        if (/tone=\{?\s*(?:VERDICT_INK|"var\(--(?:good|hard|again|sky|blush|butter))/.test(m[0]) && !VERDICT_STAT.test(m[0].split("\n")[0]!)) {
          offenders.push(`${file}: a Stat in a verdict ink (${m[0].split("\n")[0]!.trim()})`);
        }
      }
    }
    assert.ok(asked >= 200, `only read ${asked} files, so this sweep stopped looking`);
    assert.deepEqual(offenders, [], "a reading coloured as a verdict: draw it in the accent, or plain ink for a count");

    for (const [file, why] of Object.entries(EXEMPT)) {
      assert.ok(THRESHOLD_TRAFFIC_LIGHT.test(code(file)), `${file} is exempt (${why}) and no longer colours by a threshold; take the line out`);
    }
  });

  check("the heatmap is one hue in steps, and the steps are declared once", () => {
    const heat = code("components/Heatmap.tsx");
    const colours = [...(/LEVEL_COLOR[^=]*=\s*\{([\s\S]*?)\};/.exec(heat)?.[1] ?? "").matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]!);
    assert.equal(colours.length, 5, `the heatmap has ${colours.length} levels; it reads five off the scale`);
    for (const c of colours) assert.match(c, /^var\(--scale-(?:track|[1-4])\)$/, `the heatmap paints a level ${c}; it reads the scale`);

    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const step of ["track", "1", "2", "3", "4"]) {
      const n = (css.match(new RegExp(`--scale-${step}:`, "g")) ?? []).length;
      assert.equal(n, 1, `--scale-${step} is declared ${n} times; it is derived once, from the accent`);
    }
  });
}
