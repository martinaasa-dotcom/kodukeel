import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  The mock paper rehearses the opening conversation the real spoken part starts with.

  The Board describes every level's speaking test as opening with a general
  introductory conversation, and the paper's two speaking tasks stand in for
  what comes after it. The break before the spoken part is where the opening is
  rehearsed, so the break has to draw the prompts, anchored on the element.
  The prompts are the level's own, since at B2 and C1 the opening conversation
  asks about work and opinions rather than about where you live, so the break
  reads them through `openingConversation(level)` and draws what it returned.
*/
export default function speakingOpensWithAConversation({ check, code }: InvariantKit) {
  check("the break before the spoken part rehearses the conversation it opens with", () => {
    const session = code("app/(app)/exam/[level]/ExamSession.tsx");
    const breakScreen = session.slice(session.indexOf("function Break("));
    const head = breakScreen.slice(0, 6000);
    assert.match(head, /const (\w+) = openingConversation\(level\)/, "the break no longer asks for the level's opening conversation");
    const name = head.match(/const (\w+) = openingConversation\(level\)/)![1]!;
    assert.match(head, new RegExp(`\\b${name}\\.map\\(`), "the break no longer draws the opening conversation's prompts");
  });
}
