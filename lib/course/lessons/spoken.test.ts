import { describe, expect, it } from "vitest";
import { LESSONS } from "@/lib/course/lessons";
import { estonianOf } from "@/lib/course/lessons/ledger";
import { BANK } from "@/lib/scenes/bank";
import { CURVEBALL_PICKS, PICKS } from "@/lib/scenes/picks/index";
import { authoredRows } from "@/lib/dict/authored";
import { JOKES } from "@/lib/collections/jokes";
import { NOT_SAID, notSaidIn } from "@/lib/estonian/spoken";

/**
 * Every line a learner reads is held to `lib/estonian/spoken.ts`: no phrase a
 * native speaker has refused may come back, in a lesson, a scene's own lines,
 * what a learner may pick to say, a sentence written for a beginner or a joke.
 * The table holds only what is wrong everywhere; whether the rest is how people
 * talk is the native speaker's read in the pull request.
 */

interface Line {
  readonly where: string;
  readonly et: string;
}

function everyLine(): Line[] {
  const lines: Line[] = [];
  for (const lesson of LESSONS) {
    for (const { where, et } of estonianOf(lesson)) lines.push({ where: `${lesson.id}, ${where}`, et });
  }
  for (const line of BANK) lines.push({ where: `bank ${line.scene}/${line.beat}`, et: line.text });
  for (const [scene, beats] of Object.entries(PICKS)) {
    for (const [beat, picks] of Object.entries(beats)) {
      for (const pick of picks) lines.push({ where: `picks ${scene}/${beat}`, et: pick.et });
    }
  }
  for (const [curveball, picks] of Object.entries(CURVEBALL_PICKS)) {
    for (const pick of picks) lines.push({ where: `curveball ${curveball}`, et: pick.et });
  }
  for (const [lemma, et] of authoredRows()) lines.push({ where: `written for ${lemma}`, et });
  JOKES.forEach((joke, i) => joke.forEach(([et]) => lines.push({ where: `joke ${i + 1}`, et })));
  return lines;
}

describe("every line is how people talk", () => {
  const lines = everyLine();

  it("reads every source, so a source that stops arriving cannot pass on nobody", () => {
    expect(lines.length).toBeGreaterThan(10_000);
    for (const source of ["bank ", "picks ", "curveball ", "written for ", "joke "]) {
      expect(lines.some((l) => l.where.startsWith(source)), source).toBe(true);
    }
  });

  it("holds no phrase a native speaker does not say", () => {
    const found = lines.flatMap((l) => notSaidIn(l.et).map((n) => `${l.where}: "${l.et}" (say ${n.say})`));
    expect(found).toEqual([]);
  });

  it("checks every entry fires on its own example and not on what to say instead", () => {
    expect(NOT_SAID.length).toBeGreaterThan(0);
    for (const entry of NOT_SAID) {
      expect(entry.pattern.test(entry.example), entry.example).toBe(true);
      for (const instead of entry.say.split(" / ")) expect(entry.pattern.test(instead), instead).toBe(false);
      expect(entry.why.length).toBeGreaterThan(10);
    }
  });
});
