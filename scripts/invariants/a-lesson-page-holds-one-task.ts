import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LESSON PAGE HOLDS ONE TASK (Martin's call, 2026-11-04).
 *
 * A B2 learner answered the questions on Listen, pressed on, and found a whole
 * text to read stacked under the conversation on the same page, which read as
 * one more wall of words and was scrolled past. The rule: every page of a
 * lesson does one thing, and the next page does the next.
 *
 * `lib/course/lessons/screens.ts` is the one list of a step's pages and of the
 * finished lesson's, and these checks hold the runner to it: it reads both
 * lists, draws a step's content by the page that is on, keeps the text to read
 * and the notes on pages of their own, and draws each page of the finish
 * behind its own condition. A source check, because a page that slipped back
 * into the stack is a state no fixture has to walk into for it to ship.
 */
const RUNNER = "app/(app)/course/lessons/[id]/LessonRunner.tsx";

export default function aLessonPageHoldsOneTask({ check, code }: InvariantKit) {
  const runner = code(RUNNER);
  const body = (name: string) => {
    const start = runner.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `${RUNNER} no longer has ${name}`);
    const next = runner.indexOf("\nfunction ", start + 10);
    return runner.slice(start, next < 0 ? undefined : next);
  };

  check("the lesson runner walks the pages screens.ts lists", () => {
    assert.match(runner, /screensOf\(/, "the runner no longer asks screens.ts which pages a step has");
    assert.match(runner, /finishScreens\(/, "the finished lesson is no longer a page at a time");
    for (const step of ["Listen", "Words", "How"]) {
      assert.match(body(step), /screen/, `${step} draws without knowing which page is on`);
    }
  });

  check("the text to read and the notes are each a page of their own", () => {
    const listen = body("Listen");
    assert.match(listen, /hidden=\{screen !== "read"\}[\s\S]{0,400}<ReadText/, "the text to read is drawn on another page of Listen");
    assert.match(listen, /screen === "notes" &&[\s\S]{0,400}<NotesTalk/, "the notes are drawn on another page of Listen");
    assert.match(listen, /screen === "conversation" &&[\s\S]{0,1500}<LessonConversation/, "the conversation is drawn on a page that is not its own");
    assert.match(listen, /screen === "hear"/, "hearing it first shares its page");
  });

  check("every page of the finished lesson is drawn behind its own condition", () => {
    const over = runner.slice(runner.indexOf("if (over) {"), runner.indexOf("<StepPills"));
    for (const page of ["done", "again", "conversation", "check", "worksheet", "situation", "review", "next"]) {
      assert.match(over, new RegExp(`here === "${page}"`), `the finished lesson's "${page}" page is drawn beside another`);
    }
    // One Confetti, on the celebration alone.
    assert.match(over, /here === "done" &&[\s\S]{0,1500}<Confetti/, "the celebration is no longer its own page");
  });

  check("what is new at a level is a page of Listen, not a block above the steps", () => {
    const main = runner.slice(runner.indexOf("<StepPills") - 2000, runner.indexOf("<StepPills"));
    assert.doesNotMatch(main, /data-level-new/, "the level's news is drawn above the steps again, beside the step's own page");
  });
}
