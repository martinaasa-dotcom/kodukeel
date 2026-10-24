/*
  A CONVERSATION A PHONE IS HANDED IS THE CONVERSATION THE WEB IS HANDED.

  `/api/v1/scenes` publishes the shapes in `lib/api/contract.ts`, and the web's
  actions answer with the types `lib/progress/sceneRuns.ts` builds, out of the
  scene machinery's own records (`TurnRecord`, `SceneRecap`, `SceneReview`).
  This holds each schema and the type it names to each other in both
  directions, at compile time, so a field the scene machinery grows or drops
  fails `tsc` here rather than a native app in a learner's hand. A turn's
  answer is built inline by `sceneTurnFor` and has no named type; the v1 suite
  (`app/api/v1/scenes/scenes.itest.ts`) parses real answers against its schema
  and fails on a field the schema does not name.
*/
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import type {
  SceneFinishResponse, SceneHelpResponse, SceneOpenedResponse, SentTurnSchema,
} from "@/lib/api/contract";
import type { FinishedScene, HelpWord, OpenedRun } from "./sceneRuns";

/** True only where each type is assignable to the other. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * True only where every object, all the way down, names the same keys. `Same`
 * cannot see an optional field one side has and the other lacks, since either
 * is assignable to the other, and an optional field is most of a turn record.
 */
type Keys<A, B> =
  [A] extends [readonly (infer X)[]] ? ([B] extends [readonly (infer Y)[]] ? Keys<X, Y> : false)
  : [A] extends [object] ? ([B] extends [object]
    ? (Same<keyof A, keyof B> extends true
      ? ({ [K in keyof A & keyof B]-?: Keys<NonNullable<A[K]>, NonNullable<B[K]>> }[keyof A & keyof B] extends true ? true : false)
      : false)
    : false)
  : true;

const openedAgrees: Same<z.infer<typeof SceneOpenedResponse>, Omit<OpenedRun, "ok">> = true;
const helpAgrees: Same<z.infer<typeof SceneHelpResponse>, Omit<HelpWord, "ok">> = true;
const finishAgrees: Same<z.infer<typeof SceneFinishResponse>, Omit<FinishedScene, "ok">> = true;
const openedKeys: Keys<z.infer<typeof SceneOpenedResponse>, Omit<OpenedRun, "ok">> = true;
const helpKeys: Keys<z.infer<typeof SceneHelpResponse>, Omit<HelpWord, "ok">> = true;
const finishKeys: Keys<z.infer<typeof SceneFinishResponse>, Omit<FinishedScene, "ok">> = true;

/** Every field a sent turn carries is one the screen's own turn (`Sent` in SceneSession) has. */
type SentKeys = keyof z.infer<typeof SentTurnSchema>;
const sentKeysAgree: Same<SentKeys, "beatId" | "said" | "helped" | "picked" | "heard" | "conceded" | "alsoDone" | "spoken"> = true;

describe("the v1 scene contract", () => {
  it("names what the scene actions answer with exactly", () => {
    expect([openedAgrees, helpAgrees, finishAgrees, openedKeys, helpKeys, finishKeys, sentKeysAgree]).toEqual(Array(7).fill(true));
  });
});
