import { describe, expect, it } from "vitest";
import { translated } from "@/lib/copy/locale";
import { LESSON_SCENES } from "./lessonScenes";

/**
 * A LESSON'S CONVERSATION IS TRANSLATED WHERE ITS LESSON IS.
 *
 * The screen reads a scene's title, place and role card, the goal of each
 * beat, a break in time and the outcome through the tables and prints the
 * English where none holds the line, which is the right fallback and the
 * reason the gap went unseen: not one B1 part-end conversation had its
 * Russian or Ukrainian. The lines are read off the scene files, so a scene
 * added in English fails until both tables hold it.
 */
function screenLines(): string[] {
  const lines = new Set<string>();
  for (const scene of LESSON_SCENES) {
    lines.add(scene.title);
    lines.add(scene.place);
    lines.add(scene.role);
    for (const beat of scene.beats) {
      lines.add(beat.goal);
      if (beat.meanwhile) lines.add(beat.meanwhile);
    }
    for (const outcome of scene.outcomes) lines.add(outcome.says);
  }
  return [...lines];
}

describe("the lesson scenes in Russian and Ukrainian", () => {
  it("finds the lines it is asking about", () => {
    expect(screenLines().length).toBeGreaterThan(150);
  });

  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}: translates every line a lesson scene puts on the screen`, () => {
      expect(screenLines().filter((line) => !translated(locale, line)), `untranslated in ${locale}`).toEqual([]);
    });
  }
});
