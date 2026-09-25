import { describe, expect, it } from "vitest";
import { visibleLine, visibleProse } from "./visibleText";

describe("visibleLine", () => {
  it("refuses a name made of nothing but zero-width spaces", () => {
    expect(visibleLine("\u200B\u200B", 60)).toBe("");
  });

  it("takes the direction override out rather than letting it reorder the row", () => {
    expect(visibleLine("Mari\u202Eaks", 32)).toBe("Mariaks");
  });

  it("refuses a row of punctuation", () => {
    expect(visibleLine("...!", 32)).toBe("");
  });

  it("folds runs of whitespace and trims", () => {
    expect(visibleLine("  Tallinna\t\n  kool  ", 60)).toBe("Tallinna kool");
  });

  it("stores one normalization", () => {
    expect(visibleLine("ö", 32)).toBe("ö");
  });

  it("never cuts a character in half", () => {
    const name = visibleLine(`${"a".repeat(31)}\u{1F600}`, 32);
    expect(/\p{Cs}/u.test(name)).toBe(false);
    expect(name).toBe(`${"a".repeat(31)}\u{1F600}`);
    expect(visibleLine(`${"a".repeat(32)}\u{1F600}`, 32)).toBe("a".repeat(32));
  });

  it("is empty for anything that is not a string", () => {
    expect(visibleLine(42, 32)).toBe("");
    expect(visibleLine(null, 32)).toBe("");
  });
});

describe("visibleProse", () => {
  it("keeps the line breaks somebody laid a note out with", () => {
    expect(visibleProse("Read page 12.\r\nThen write three lines.", 200)).toBe("Read page 12.\nThen write three lines.");
  });

  it("takes format characters out of the middle of a note", () => {
    expect(visibleProse("Due \u202EFriday\u200B", 200)).toBe("Due Friday");
  });

  it("may be empty, since a note is optional", () => {
    expect(visibleProse("\u200B", 200)).toBe("");
  });

  it("never cuts a character in half", () => {
    expect(/\p{Cs}/u.test(visibleProse(`${"a".repeat(9)}\u{1F600}`, 10))).toBe(false);
  });
});
