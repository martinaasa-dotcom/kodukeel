import { describe, expect, it } from "vitest";
import { firstParam } from "./queryParam";

describe("firstParam", () => {
  it("reads a value given once", () => expect(firstParam("kohv")).toBe("kohv"));
  it("reads the first of a value given twice, which is what ?q=a&q=b sends", () =>
    expect(firstParam(["kohv", "tee"])).toBe("kohv"));
  it("reads nothing where there is nothing", () => {
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam([])).toBeUndefined();
  });
});
