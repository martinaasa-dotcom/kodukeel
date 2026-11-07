import { describe, expect, it } from "vitest";
import { buildFasterNoteSystem, buildFasterNoteUser, FASTER_NOTE_CHARS, heldNote, parseFasterNote, unverifiedIn } from "./fasterNote";

const input = {
  ask: { et: "Mida sa eile teha ei jõudnud?", en: "What didn't you get done yesterday?" },
  cue: "Say three things you didn't do.",
  point: "After {ei}, the noun is in the [osastav] (3rd form).",
  model: "Kööki ma ei koristanud, leiba ei ostnud ja võtmeid ei leidnud!",
  checks: [{ en: "Three things with {ei}.", met: true }, { en: "The noun in the [osastav] (3rd form).", met: false }],
  said: "Ma ei ostnud leib ja ei leidnud võtmed",
  spoken: true,
};

describe("Anu's note on the first go", () => {
  it("reads the JSON it asked for, clipped, and refuses anything else", () => {
    expect(parseFasterNote('{"comment":"Good start."}')).toBe("Good start.");
    expect(parseFasterNote("no json")).toBeNull();
    expect(parseFasterNote('{"comment":"  "}')).toBeNull();
    expect(parseFasterNote(JSON.stringify({ comment: "a".repeat(2000) }))!.length).toBeLessThanOrEqual(FASTER_NOTE_CHARS);
  });

  it("is told the transcript, the point and which checks came across, and never asked about a sound", () => {
    const user = buildFasterNoteUser(input);
    expect(user).toContain(input.said);
    expect(user).toContain(input.point);
    expect(user).toContain("(not this time)");
    expect(user).toContain("What the recognizer heard");
    expect(buildFasterNoteSystem()).toMatch(/never comment on pronunciation/);
    expect(buildFasterNoteSystem("uk")).toContain("Ukrainian");
  });

  it("lets through Estonian the transcript, the model or the lesson holds", () => {
    const text = [input.said, input.model].join(" \n ");
    const note = "You said \"ei ostnud\" well. Next time try \"leiba\" after the no.";
    expect(unverifiedIn(note, [], text)).toEqual([]);
    expect(heldNote(note, [], text)).toBe(note);
  });

  it("drops the sentence that reached for a form nobody said, and keeps the rest", () => {
    const text = [input.said, input.model].join(" \n ");
    const note = "Good, you used \"ei leidnud\". Try \"leibasid\" next time. Keep going.";
    expect(unverifiedIn(note, [], text)).toEqual(["leibasid"]);
    expect(heldNote(note, [], text)).toBe("Good, you used \"ei leidnud\". Keep going.");
  });

  it("takes a word the dictionary vouched for, and withholds a note left with nothing", () => {
    const text = input.said;
    expect(heldNote("Try \"piima\".", [], text, ["piima"])).toBe("Try \"piima\".");
    expect(heldNote("Try \"leibasid\".", [], text)).toBeNull();
    // The lesson's own words vouch too.
    expect(heldNote("Say \"kööki\" too.", ["kööki"], text)).toBe("Say \"kööki\" too.");
  });
});
