import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  The mock paper rehearses the opening conversation the real spoken part starts with.

  The Board describes every level's speaking test as opening with a general
  introductory conversation, and the paper's two speaking tasks stand in for
  what comes after it. The break before the spoken part is where the opening is
  rehearsed, so the break has to draw the prompts, anchored on the element.
*/
export default function speakingOpensWithAConversation({ check, code }: InvariantKit) {
  check("the break before the spoken part rehearses the conversation it opens with", () => {
    const session = code("app/(app)/exam/[level]/ExamSession.tsx");
    const breakScreen = session.slice(session.indexOf("function Break("));
    assert.match(breakScreen.slice(0, 6000), /OPENING_CONVERSATION\.map\(/, "the break no longer draws the opening conversation's prompts");
  });
}
