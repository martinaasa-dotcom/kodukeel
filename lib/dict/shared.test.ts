import { describe, expect, it } from "vitest";
import { isShared, mayRemove } from "./shared";

/*
  WHO MAY TAKE A WORD BACK OUT OF THE DICTIONARY. The rule is pure so its three
  cases are stated here rather than found on a screen: never a word a source
  supplied, any typed word for a reviewer, and a learner's own word only while
  it is still theirs alone.
*/
describe("mayRemove", () => {
  const mine = { provenance: "USER", approvedAt: null, editedBy: "me" };

  it("never removes a word the seed or Ekilex supplied, not even for a reviewer", () => {
    for (const provenance of ["SEED", "EKILEX"]) {
      expect(mayRemove({ ...mine, provenance }, "me", true, false)).toBe(false);
      expect(mayRemove({ ...mine, provenance }, "me", false, false)).toBe(false);
    }
  });

  it("lets a reviewer remove any typed word, passed, held by others or a model's", () => {
    expect(mayRemove({ ...mine, editedBy: "someone" }, "admin", true, true)).toBe(true);
    expect(mayRemove({ ...mine, approvedAt: new Date() }, "admin", true, true)).toBe(true);
    expect(mayRemove({ ...mine, provenance: "AI" }, "admin", true, false)).toBe(true);
  });

  it("lets a learner remove their own word only while nobody else can see or hold it", () => {
    expect(mayRemove(mine, "me", false, false)).toBe(true);
    expect(mayRemove(mine, "me", false, true)).toBe(false);
    expect(mayRemove({ ...mine, approvedAt: new Date() }, "me", false, false)).toBe(false);
    expect(mayRemove({ ...mine, editedBy: "someone" }, "me", false, false)).toBe(false);
    expect(mayRemove({ ...mine, editedBy: null }, "me", false, false)).toBe(false);
  });
});

describe("isShared", () => {
  it("is the seed, Ekilex, and a typed word a reviewer passed", () => {
    expect(isShared({ provenance: "SEED" })).toBe(true);
    expect(isShared({ provenance: "EKILEX" })).toBe(true);
    expect(isShared({ provenance: "USER", approvedAt: new Date() })).toBe(true);
    expect(isShared({ provenance: "USER", approvedAt: null })).toBe(false);
    expect(isShared({ provenance: "AI" })).toBe(false);
  });
});
