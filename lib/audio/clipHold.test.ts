import { describe, expect, it } from "vitest";
import { holdSpeaking, isSpeaking, onSpeakingChange, untilQuiet } from "./clip";

/*
  A retell lit its microphone after every line of the story: between two
  lines no clip was playing, so the app read as quiet for a quarter second
  and the button came back on. A run holds the app as speaking across its
  gaps, and the microphone listens to that.
*/
describe("a run of lines is one thing being said", () => {
  it("stays speaking from the first line to the last, gaps included", () => {
    const heard: boolean[] = [];
    const off = onSpeakingChange((speaking) => heard.push(speaking));
    expect(isSpeaking()).toBe(false);
    const release = holdSpeaking();
    expect(isSpeaking()).toBe(true);
    release();
    release();
    expect(isSpeaking()).toBe(false);
    off();
    // Told once each way, and never told the app went quiet mid-run.
    expect(heard).toEqual([true, false]);
  });

  it("does not make a run wait on itself between its own lines", async () => {
    const release = holdSpeaking();
    await expect(untilQuiet(50)).resolves.toBeUndefined();
    release();
  });

  it("two holds are quiet only once both let go", () => {
    const a = holdSpeaking();
    const b = holdSpeaking();
    a();
    expect(isSpeaking()).toBe(true);
    b();
    expect(isSpeaking()).toBe(false);
  });
});
