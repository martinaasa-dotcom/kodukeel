import { describe, expect, it } from "vitest";
import { liveText } from "./liveText";

const idle = { listening: false, partial: "" };
const hearing = (partial: string) => ({ listening: true, partial });

describe("liveText", () => {
  it("shows the box as it is when nothing is listening", () => {
    expect(liveText("tere", idle)).toBe("tere");
    expect(liveText("tere", { listening: false, partial: "stale words" })).toBe("tere");
  });

  it("keeps the typing until the first word is heard", () => {
    expect(liveText("ma olen", hearing(""))).toBe("ma olen");
    expect(liveText("ma olen", hearing("   "))).toBe("ma olen");
  });

  it("puts the words so far in the box the finished turn replaces", () => {
    expect(liveText("ma olen", hearing("Päris hästi nagu alati"))).toBe("Päris hästi nagu alati");
    expect(liveText("", hearing("tere"))).toBe("tere");
  });

  it("adds the words so far after what a growing box already holds", () => {
    expect(liveText("Kas ma", hearing("saan aru"), "add")).toBe("Kas ma saan aru");
    expect(liveText("  ", hearing("saan aru"), "add")).toBe("saan aru");
  });
});
