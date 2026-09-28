import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOOP_SYNC_SCRIPT, SYNCED_LOOPS } from "./loopSync";

const css = readFileSync("app/globals.css", "utf8");

describe("the shared clock for the brand's loops", () => {
  it("names only keyframes the stylesheet declares", () => {
    for (const name of SYNCED_LOOPS) expect(css, name).toMatch(new RegExp(`@keyframes ${name}\\s*\\{`));
  });

  it("names no hover or press, which start when somebody reaches for them", () => {
    for (const name of ["mark-giddy", "tilde-tip", "pixel-dance", "pixel-burst", "mark-pop", "wordmark-hop", "anu-wiggle", "anu-hair-flick"]) {
      expect(SYNCED_LOOPS as readonly string[]).not.toContain(name);
    }
  });

  it("is a script that parses and carries every name", () => {
    expect(() => new Function(LOOP_SYNC_SCRIPT)).not.toThrow();
    for (const name of SYNCED_LOOPS) expect(LOOP_SYNC_SCRIPT).toContain(`'${name}':1`);
  });

  it("leaves a loop that is not infinite alone, so reduced motion is untouched", () => {
    expect(LOOP_SYNC_SCRIPT).toContain("c.iterations!==Infinity");
  });
});
