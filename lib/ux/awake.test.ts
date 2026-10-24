import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AWAKE_ATTR, AWAKE_SCRIPT, IDLE_LOOPS } from "./awake";

const css = readFileSync("app/globals.css", "utf8");

describe("the brand's idle loops, waiting for the page to settle", () => {
  it("names only keyframes the stylesheet declares", () => {
    for (const name of IDLE_LOOPS) expect(css, name).toMatch(new RegExp(`@keyframes ${name}\\s*\\{`));
  });

  it("names no hover or press, which start when somebody reaches for them", () => {
    for (const name of ["mark-giddy", "tilde-tip", "pixel-dance", "pixel-burst", "mark-pop", "wordmark-hop", "anu-wiggle", "anu-hair-flick"]) {
      expect(IDLE_LOOPS as readonly string[]).not.toContain(name);
    }
  });

  it("is a script that parses and sets the attribute the loops wait for", () => {
    expect(() => new Function(AWAKE_SCRIPT)).not.toThrow();
    expect(AWAKE_SCRIPT).toContain(`setAttribute('${AWAKE_ATTR}'`);
  });

  it("no longer watches the page, since no loop it named runs for ever", () => {
    expect(AWAKE_SCRIPT).not.toContain("MutationObserver");
    expect(AWAKE_SCRIPT).not.toContain("getAnimations");
  });
});
