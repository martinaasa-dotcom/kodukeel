import { describe, expect, it } from "vitest";
import { shareText, sonadNumber, SONAD_FIRST_DAY } from "./sonadShare";

describe("sonadNumber", () => {
  it("counts the first day as puzzle 1", () => {
    expect(sonadNumber(SONAD_FIRST_DAY)).toBe(1);
    expect(sonadNumber("2026-10-24")).toBe(2);
    expect(sonadNumber("2026-11-06")).toBe(15);
  });

  it("counts across a clock change and a month end", () => {
    expect(sonadNumber("2026-10-31")).toBe(9);
    expect(sonadNumber("2026-11-01")).toBe(10);
  });

  it("never shares a zero or a negative", () => {
    expect(sonadNumber("2026-10-01")).toBe(1);
    expect(sonadNumber("not a day")).toBe(1);
  });
});

describe("shareText", () => {
  // The board in the report this was built from: rõõmus in six.
  const guesses = ["punane", "lennuk", "ausalt", "sünnis", "mõnust", "rõõmus"];

  it("draws the board without a single letter of it", () => {
    const text = shareText({ day: "2026-11-06", level: "A2", guesses, answer: "rõõmus", site: "kodukeel.ee" });
    expect(text).toBe(
      [
        "Sõnad 15, A2, 6/7",
        "",
        "⚪🟡⚪⚪⚪⚪",
        "⚪⚪⚪⚪🟢⚪",
        "⚪🟡🟡⚪⚪⚪",
        "⚪⚪⚪⚪⚪🟢",
        "🟡🟢⚪🟡🟡⚪",
        "🟢🟢🟢🟢🟢🟢",
        "",
        "kodukeel.ee",
      ].join("\n"),
    );
    for (const guess of guesses) expect(text.toLowerCase()).not.toContain(guess);
  });

  it("scores a lost board as X", () => {
    const lost = ["punane", "lennuk", "ausalt", "sünnis", "mõnust", "kassid", "koerad"];
    const text = shareText({ day: "2026-11-06", level: "B1", guesses: lost, answer: "rõõmus", site: "kodukeel.ee" });
    expect(text.split("\n")[0]).toBe("Sõnad 15, B1, X/7");
    expect(text.split("\n").filter((l) => /^[🟢🟡⚪]+$/u.test(l))).toHaveLength(7);
  });
});
