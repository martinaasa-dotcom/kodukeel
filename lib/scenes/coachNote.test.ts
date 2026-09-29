import { describe, expect, it } from "vitest";

import { parseCoachNote, withoutUnverified } from "./coachNote";

describe("the note from Anu", () => {
  it("reads the JSON it asked for and refuses anything else", () => {
    expect(parseCoachNote('{"comment":"Good.","rule":"Try again."}')).toEqual({ comment: "Good.", rule: "Try again." });
    expect(parseCoachNote("no json here")).toBeNull();
    expect(parseCoachNote('{"rule":"only a rule"}')).toBeNull();
  });

  it("drops the sentence that reached for a form nobody said, and keeps the rest", () => {
    const note = { comment: "You opened politely. You could say \"kolm päeva\" next time. The doctor understood you.", rule: "Say how long with \"päeva\"." };
    const kept = withoutUnverified(note, ["päeva"]);
    expect(kept).toEqual({ comment: "You opened politely. The doctor understood you.", rule: "" });
  });

  it("withholds the note where no sentence of the comment survives", () => {
    expect(withoutUnverified({ comment: "Try \"päeva\".", rule: "" }, ["päeva"])).toBeNull();
  });

  it("leaves a note with nothing unverified untouched", () => {
    const note = { comment: "Nice.", rule: "More." };
    expect(withoutUnverified(note, [])).toBe(note);
  });
});
