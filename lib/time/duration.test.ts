import { describe, expect, it } from "vitest";
import { formatAnswerTime, formatDuration } from "./duration";

describe("a duration on its way to a screen", () => {
  /*
    The fault this module exists for. Three minutes a day three days a week is
    nine minutes, and one decimal place of an hour cannot say nine: it said
    0.2h, which is twelve.
  */
  it("reads a small figure in minutes rather than in tenths of an hour", () => {
    expect(formatDuration(9 / 60)).toBe("9 min");
    expect(formatDuration(25 / 60)).toBe("25 min");
    expect(formatDuration(6 / 60)).toBe("6 min");
  });

  it("switches to hours where minutes stop being how anybody says it", () => {
    expect(formatDuration(1)).toBe("1 h");
    expect(formatDuration(91 / 60)).toBe("1.5 h");
    expect(formatDuration(8.06)).toBe("8.1 h");
  });

  it("spells the unit out in a sentence and abbreviates it in a tile", () => {
    expect(formatDuration(25 / 60, "long")).toBe("25 minutes");
    expect(formatDuration(1 / 60, "long")).toBe("1 minute");
    expect(formatDuration(1, "long")).toBe("1 hour");
    expect(formatDuration(1.5, "long")).toBe("1.5 hours");
  });

  it("treats a negative as nothing rather than printing one", () => {
    expect(formatDuration(-3)).toBe("0 min");
  });
});

describe("how long one answer took", () => {
  it("keeps a tenth where a tenth is the whole signal", () => {
    // 2.4 against 3.8 is the difference the pace panel exists to show.
    expect(formatAnswerTime(2400)).toBe("2.4s");
    expect(formatAnswerTime(3800)).toBe("3.8s");
  });

  it("drops the tenth once it is precision nobody measured", () => {
    expect(formatAnswerTime(14_300)).toBe("14s");
    expect(formatAnswerTime(10_000)).toBe("10s");
  });

  it("goes to minutes past a minute, where the seconds stop being the point", () => {
    expect(formatAnswerTime(90_000)).toBe("1.5 min");
  });

  it("has an answer for nothing and for a negative", () => {
    expect(formatAnswerTime(0)).toBe("0s");
    expect(formatAnswerTime(-1)).toBe("0s");
  });
});
