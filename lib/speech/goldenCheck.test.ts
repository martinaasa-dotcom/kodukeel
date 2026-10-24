import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Golden } from "./golden";
import { checkGolden, type GoldenRun } from "./goldenCheck";

/*
  The check a native engine's turns are fed to (scripts/check-speech-golden.ts),
  run over the shipped golden file, so the rules and the file cannot drift
  apart without this failing, and so the check itself is seen to fail.
*/
const golden = JSON.parse(readFileSync("lib/speech/fixtures/golden.json", "utf8")) as Golden;

/** The golden file's own turns, as another engine would hand them over. */
function runOf(g: Golden): GoldenRun {
  return { engine: "a port", model: g.model, clips: g.clips.map(({ file, sha256, turns }) => ({ file, sha256, turns })) };
}

describe("the golden check without a browser", () => {
  it("decides every shipped clip as the golden file expects", () => {
    const report = checkGolden(golden);
    expect(report.clips.length).toBe(golden.clips.length);
    expect(report.clips.length).toBeGreaterThanOrEqual(10);
    expect(report.clips.filter((c) => c.problems.length > 0)).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("passes a run whose turns are the web's own", () => {
    expect(checkGolden(golden, runOf(golden)).passed).toBe(true);
  });

  it("names the field and the clip where an expected verdict changes", () => {
    const changed: Golden = {
      ...golden,
      clips: golden.clips.map((c, i) => (i === 1 ? { ...c, expect: { ...c.expect, verdict: { kind: "edit" } } } : c)),
    } as Golden;
    const report = checkGolden(changed);
    expect(report.passed).toBe(false);
    const differ = report.clips.filter((c) => c.problems.length > 0);
    expect(differ.map((c) => c.file)).toEqual([golden.clips[1]!.file]);
    expect(differ[0]!.problems[0]).toMatch(/^verdict: /);
  });

  it("refuses a run that heard differently, decoded other bytes, used another model or left a clip out", () => {
    const base = runOf(golden);
    const deaf = { ...base, clips: base.clips.map((c, i) => (i === 0 ? { ...c, turns: [] } : c)) };
    expect(checkGolden(golden, deaf).clips[0]!.problems.length).toBeGreaterThan(0);

    const other = { ...base, clips: base.clips.map((c, i) => (i === 0 ? { ...c, sha256: "0".repeat(64) } : c)) };
    expect(checkGolden(golden, other).clips[0]!.problems[0]).toMatch(/hash/);

    expect(checkGolden(golden, { ...base, model: "another@model" }).problems[0]).toMatch(/model/);

    const short = { ...base, clips: base.clips.slice(1) };
    expect(checkGolden(golden, short).clips[0]!.problems).toEqual(["the run holds no turns for this clip"]);
  });
});
