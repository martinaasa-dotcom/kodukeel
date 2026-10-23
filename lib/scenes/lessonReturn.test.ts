import { describe, expect, it } from "vitest";
import { focusValue, MODULE_PARAM, readFocus, type ModuleFocus } from "@/lib/course/focus";
import { backToLessonHref, conversationFrom, LESSON_RETURN_PARAM, lessonSceneHref } from "./lessonReturn";

const focus: ModuleFocus = { programmeId: "p", dayId: "a1.1.8", stepId: "lesson", n: 1, of: 1, derived: false };

describe("the round trip from a lesson to its conversation", () => {
  it("goes to the conversation bare outside a module", () => {
    expect(lessonSceneHref("a1-trepil", null)).toBe("/situations/a1-trepil");
  });

  it("carries the module marker under a name of its own, never as the step", () => {
    const params = new URL(lessonSceneHref("a1-trepil", focus), "http://x").searchParams;
    expect(params.get(MODULE_PARAM)).toBeNull();
    expect(readFocus(params.get(LESSON_RETURN_PARAM))).toEqual(focus);
  });

  it("comes back to the lesson saying why, with the module restored", () => {
    const back = new URL(backToLessonHref("a1-08-neighbour", "done", focusValue(focus)), "http://x");
    expect(back.pathname).toBe("/course/lessons/a1-08-neighbour");
    expect(back.searchParams.get("conversation")).toBe("done");
    expect(readFocus(back.searchParams.get(MODULE_PARAM))).toEqual(focus);
    expect(backToLessonHref("a1-08-neighbour", "left", null)).toBe("/course/lessons/a1-08-neighbour?conversation=left");
  });

  it("drops a marker that is not one rather than passing it on", () => {
    expect(backToLessonHref("a1-08-neighbour", "done", "forged")).toBe("/course/lessons/a1-08-neighbour?conversation=done");
  });

  it("reads only the two reasons there are", () => {
    expect(conversationFrom("done")).toBe("done");
    expect(conversationFrom(["left"])).toBe("left");
    expect(conversationFrom("finished")).toBeNull();
    expect(conversationFrom(undefined)).toBeNull();
  });
});
