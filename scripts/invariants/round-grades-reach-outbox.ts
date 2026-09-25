import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function roundGradesReachOutbox({ check, ALL, code }: InvariantKit) {
  check("a practice round's grade that does not reach the server goes into the outbox", () => {
    /*
      Every round grades through `gradeCard` (ADR-016), and nearly every one of
      them wrote a failed grade off with a comment saying so, while review, the
      flash round, the exceptions round and the learn ladder queued theirs in
      the durable outbox (ADR-015). The daily quest did not even catch: a failed
      grade threw out of the handler before `busy` was set back and the round
      stopped answering. `components/round/useGrade.ts` is the one path, and a
      round calls the action directly only where it queues the failure itself.
    */
    const hook = code("components/round/useGrade.ts");
    assert.match(hook, /await gradeCard\(/, "useGrade no longer calls gradeCard");
    assert.match(hook, /enqueueGrade\(/, "useGrade no longer queues a grade that did not land");
    const OWN_OUTBOX = new Set([
      "app/(app)/review/ReviewSession.tsx",
      "app/(app)/review/flashcards/FlashSession.tsx",
      "app/(app)/review/exceptions/ExceptionsSession.tsx",
      "app/(app)/learn/new/LearnSession.tsx",
    ]);
    const callers = ALL.filter((f) => /\bgradeCard\(/.test(code(f)) && !f.startsWith("app/actions") && f !== "components/round/useGrade.ts");
    assert.ok(callers.length >= 4, `only ${callers.length} files call gradeCard directly`);
    for (const file of callers) {
      assert.ok(OWN_OUTBOX.has(file), `${file} calls gradeCard directly; a grade there is lost when the request fails. Use useGrade`);
      assert.match(code(file), /enqueueGrade\(/, `${file} calls gradeCard directly and no longer queues a failed grade`);
    }
    const using = ALL.filter((f) => /\buseGrade\(\)/.test(code(f)));
    assert.ok(using.length >= 15, `only ${using.length} rounds grade through useGrade`);
    /*
      Match hands its whole board in through one batched call rather than a
      grade per pair, so it cannot use the per-card hook; what it may not do is
      swallow a batch that did not land, which is what the catch it was given
      did. It queues the same ids through the hook's twin.
    */
    assert.match(hook, /export function useQueueGrades\(/, "useGrade.ts no longer offers a way to queue a whole round");
    const match = code("app/(app)/review/match/MatchSession.tsx");
    assert.match(match, /recordMatchGrades\(/, "Match no longer grades its board in one call");
    assert.match(match, /useQueueGrades\(\)/, "Match no longer queues a board whose grades did not land");
  });
}
