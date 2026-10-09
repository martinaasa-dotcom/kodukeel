import { describe, expect, it } from "vitest";

import { parseCoachNote, withoutUnverified } from "./coachNote";

describe("the note from Anu", () => {
  it("reads the JSON it asked for and refuses anything else", () => {
    expect(parseCoachNote('{"comment":"Good.","rule":"Try again."}')).toEqual({ comment: "Good.", rule: "Try again.", improve: [] });
    expect(parseCoachNote("no json here")).toBeNull();
    expect(parseCoachNote('{"rule":"only a rule"}')).toBeNull();
  });

  it("drops the sentence that reached for a form nobody said, and keeps the rest", () => {
    const note = { comment: "You opened politely. You could say \"kolm päeva\" next time. The doctor understood you.", rule: "Say how long with \"päeva\".", improve: [] };
    const kept = withoutUnverified(note, ["päeva"]);
    expect(kept).toEqual({ comment: "You opened politely. The doctor understood you.", rule: "", improve: [] });
  });

  it("withholds the note where no sentence of the comment survives", () => {
    expect(withoutUnverified({ comment: "Try \"päeva\".", rule: "", improve: [] }, ["päeva"])).toBeNull();
  });

  it("leaves a note with nothing unverified untouched", () => {
    const note = { comment: "Nice.", rule: "More.", improve: [] };
    expect(withoutUnverified(note, [])).toBe(note);
  });

  it("reads up to three suggestions and ignores anything else in the list", () => {
    const raw = JSON.stringify({ comment: "Good.", rule: "", improve: ["a", 4, " ", "b", "c", "d"] });
    expect(parseCoachNote(raw)?.improve).toEqual(["a", "b", "c"]);
    expect(parseCoachNote('{"comment":"Good.","improve":"nope"}')?.improve).toEqual([]);
  });

  it("drops only the suggestion that reached for a form nobody said", () => {
    const note = { comment: "Fine.", rule: "", improve: ["Say how long you worked there.", "Try \"päeva\" after the number."] };
    expect(withoutUnverified(note, ["päeva"])?.improve).toEqual(["Say how long you worked there."]);
  });
});
