import { describe, expect, it } from "vitest";
import { cleanGroupName, GROUP_NAME_MAX } from "./groupName";

describe("cleanGroupName", () => {
  it("keeps an ordinary name as it was typed", () => {
    expect(cleanGroupName("  Eesti keel B1, teisipäev ")).toBe("Eesti keel B1, teisipäev");
  });

  it("removes zero-width and bidi characters", () => {
    expect(cleanGroupName("Klass​ 7b")).toBe("Klass 7b");
    expect(cleanGroupName("Klass ‮7b")).toBe("Klass 7b");
  });

  it("turns a line break into a space rather than gluing words together", () => {
    expect(cleanGroupName("Evening\r\nclass")).toBe("Evening class");
  });

  it("refuses a name that is nothing once cleaned", () => {
    expect(cleanGroupName("​​")).toBe("");
    expect(cleanGroupName("‮ ... ")).toBe("");
    expect(cleanGroupName(42)).toBe("");
  });

  it("caps the length", () => {
    expect(cleanGroupName("a".repeat(200))).toHaveLength(GROUP_NAME_MAX);
  });
});
