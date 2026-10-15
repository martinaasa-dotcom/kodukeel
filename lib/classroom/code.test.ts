import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, CODE_LENGTH, generateCode, isValidCode, joinCodeFrom, normaliseCode } from "./code";

describe("generateCode", () => {
  it("is the right length and uses only the safe alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect([...code].every((ch) => CODE_ALPHABET.includes(ch))).toBe(true);
    }
  });

  it("leaves out the characters people misread", () => {
    for (const ch of ["0", "O", "1", "I", "L", "U", "V"]) {
      expect(CODE_ALPHABET).not.toContain(ch);
    }
  });

  it("is deterministic when the randomness is", () => {
    const fixed = () => 0;
    expect(generateCode(fixed)).toBe("AAAAAA");
  });
});

describe("normaliseCode", () => {
  it("uppercases and drops the separators people add", () => {
    expect(normaliseCode(" abc-234 ")).toBe("ABC234");
  });

  it("never guesses at a mistyped character — a wrong code must not open another class", () => {
    // `0` is not in the alphabet, so this stays invalid rather than becoming `Q`.
    expect(normaliseCode("ABC0234")).toBe("ABC0234");
    expect(isValidCode("ABC0234")).toBe(false);
  });

  it("refuses a code with a character too many rather than cutting it", () => {
    // A seventh character is a mistyped code, and dropping it would join a class.
    expect(isValidCode("ABCDEF3")).toBe(false);
    expect(isValidCode("ABCDEFGHJK")).toBe(false);
    expect(isValidCode("ABC-DEF")).toBe(true);
  });
});

describe("isValidCode", () => {
  it("accepts a generated code", () => {
    expect(isValidCode(generateCode())).toBe(true);
  });

  it("rejects the wrong length or an excluded character", () => {
    expect(isValidCode("ABC23")).toBe(false);
    expect(isValidCode("ABCO23")).toBe(false);
    expect(isValidCode("")).toBe(false);
  });
});

describe("joinCodeFrom, what a join link carried", () => {
  it("reads a code in lower case, with spaces or with dashes", () => {
    expect(joinCodeFrom("abc234")).toBe("ABC234");
    expect(joinCodeFrom(" abc 234 ")).toBe("ABC234");
    expect(joinCodeFrom("abc-234")).toBe("ABC234");
  });

  it("takes the first of a repeated parameter", () => {
    expect(joinCodeFrom(["xyz789", "ABC234"])).toBe("XYZ789");
    expect(joinCodeFrom([])).toBe("");
    expect(joinCodeFrom([42, "ABC234"])).toBe("");
  });

  it("gives an empty box for anything that is not a code", () => {
    expect(joinCodeFrom("ABC23")).toBe("");
    expect(joinCodeFrom("ABC2345")).toBe("");
    expect(joinCodeFrom("ABC0O1")).toBe("");
    expect(joinCodeFrom("ABC<23")).toBe("");
    expect(joinCodeFrom(123456)).toBe("");
    expect(joinCodeFrom(undefined)).toBe("");
    expect(joinCodeFrom(null)).toBe("");
  });
});
