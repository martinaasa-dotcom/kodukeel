import { describe, expect, it } from "vitest";
import { confirmWord, confirms } from "./confirmWord";

describe("the word typed to confirm a destructive action", () => {
  it("asks for it in the reader's language", () => {
    expect(confirmWord("delete", "en")).toBe("delete");
    expect(confirmWord("delete", "uk")).toBe("видалити");
    expect(confirmWord("delete", "ru")).toBe("удалить");
    expect(confirmWord("replace", "uk")).toBe("замінити");
    expect(confirmWord("replace", "ru")).toBe("заменить");
  });

  it("accepts the word in every language, whatever the case and the space around it", () => {
    for (const word of ["delete", "DELETE", " Delete ", "видалити", "Видалити", "УДАЛИТЬ", "удалить\n"]) {
      expect(confirms("delete", word), word).toBe(true);
    }
    for (const word of ["replace", "Замінити", " заменить "]) {
      expect(confirms("replace", word), word).toBe(true);
    }
  });

  it("stays deliberate: no empty box, no part of the word, no other action's word", () => {
    for (const word of ["", "   ", "del", "видали", "delete it", "так", "yes", "replace", "замінити"]) {
      expect(confirms("delete", word), word).toBe(false);
    }
    expect(confirms("replace", "видалити")).toBe(false);
    expect(confirms("delete", undefined)).toBe(false);
    expect(confirms("delete", 42)).toBe(false);
  });
});
