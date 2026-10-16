import { afterEach, describe, expect, it, vi } from "vitest";

import { FREE_FEATURES, PAID_FEATURES, isOff, readSwitches } from "./switches";

describe("readSwitches", () => {
  it("switches nothing off when the variable is empty or absent", () => {
    expect(readSwitches(undefined).off.size).toBe(0);
    expect(readSwitches("").off.size).toBe(0);
    expect(readSwitches(" , ,").off.size).toBe(0);
  });

  it("switches off one feature", () => {
    expect([...readSwitches("scenes").off]).toEqual(["scenes"]);
  });

  it("switches off several, however they are spaced and cased", () => {
    expect(new Set(readSwitches(" Tutor,scan , GRADER").off)).toEqual(new Set(["tutor", "scan", "grader"]));
  });

  it("ignores a name that is not a feature and reports it as written", () => {
    const switches = readSwitches("scenes, scnes, Anu");
    expect([...switches.off]).toEqual(["scenes"]);
    expect(switches.unknown).toEqual(["scnes", "Anu"]);
  });

  it("knows exactly the five features the decision names", () => {
    expect([...PAID_FEATURES].sort()).toEqual(["grader", "scan", "scenes", "translate", "tutor"]);
  });

  it("can switch speech off too, which costs nothing and is kept out of the paid list", () => {
    expect([...FREE_FEATURES]).toEqual(["speech"]);
    expect([...readSwitches("speech, tutor").off].sort()).toEqual(["speech", "tutor"]);
  });
});

describe("isOff", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads the variable again when it changes", () => {
    vi.stubEnv("PAID_OFF", "translate");
    expect(isOff("translate")).toBe(true);
    expect(isOff("tutor")).toBe(false);
    vi.stubEnv("PAID_OFF", "tutor");
    expect(isOff("translate")).toBe(false);
    expect(isOff("tutor")).toBe(true);
  });

  it("says once in the log that a name was not a feature", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("PAID_OFF", "scenes,nonsense");
    isOff("scenes");
    isOff("tutor");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("nonsense");
    warn.mockRestore();
  });
});
