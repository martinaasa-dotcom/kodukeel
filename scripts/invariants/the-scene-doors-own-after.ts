import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CONVERSATION'S TURN HAS TWO DOORS, AND EACH OWNS WHAT RUNS AFTER IT ANSWERS
 * (N-5, ADR-029).
 *
 * The body of a turn is `sceneTurnFor` in `lib/progress/sceneRequest.ts`, which
 * the web's `/api/scene` and `POST /api/v1/scenes/{runId}/turns` both call. The
 * ledger's settlements and releases and the dictionary growing run after the
 * answer has gone, and the deployment suspends a function once its response is
 * sent, so each of them goes through `after()` from `next/server`, which keeps
 * the request alive until it finishes. That `after` belongs to the request,
 * which is the door's, so the door hands its own in:
 *
 * - both doors import `after` from `next/server` and pass it to `sceneTurnFor`;
 * - the body imports nothing from `next/server`, so the `after` it calls is the
 *   one a door handed it, and every function in it that calls `after` takes it
 *   as a parameter;
 * - every settlement, release and dictionary growth in the body goes through
 *   `after`, so none is left to a promise nobody is holding.
 */
const BODY = "lib/progress/sceneRequest.ts";
const DOORS = ["app/api/scene/route.ts", "app/api/v1/scenes/[runId]/turns/route.ts"];

export default function theSceneDoorsOwnAfter({ check, code }: InvariantKit) {
  check("each door hands its own after() to the one turn body", () => {
    for (const door of DOORS) {
      const source = code(door);
      assert.match(source, /import \{ after \} from "next\/server";/, `${door} no longer imports next/server's after`);
      const calls = [...source.matchAll(/\bsceneTurnFor\(([^;]*?)\);/g)];
      assert.equal(calls.length, 1, `${door} calls sceneTurnFor ${calls.length} times; a turn has one body`);
      assert.match(calls[0]![1]!, /,\s*after\s*$/, `${door} hands sceneTurnFor something other than its own after()`);
    }
  });

  check("the turn body schedules nothing on a request of its own", () => {
    const body = code(BODY);
    assert.doesNotMatch(body, /from "next\/server"|from "next\/cache"|from "next\/headers"/, `${BODY} imports from next itself, so what runs after the answer is not the door's`);
    // Every function declaration with its parameters and the span of its body, found by brace matching.
    const functions = [...body.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((found) => {
      const open = body.indexOf("{", body.indexOf(")", found.index!));
      let depth = 0;
      let at = open;
      for (; at < body.length; at += 1) {
        if (body[at] === "{") depth += 1;
        else if (body[at] === "}" && --depth === 0) break;
      }
      return { name: found[1]!, params: body.slice(found.index!, open), from: open, to: at };
    });
    assert.ok(functions.length >= 4, `found only ${functions.length} functions in ${BODY}; the pattern stopped matching`);
    const handed = functions.filter((fn) => /\bafter: Later\b/.test(fn.params));
    assert.deepEqual(handed.map((fn) => fn.name).sort(), ["compose", "reviewLine", "sceneTurnFor"],
      `the functions in ${BODY} handed after() are not sceneTurnFor, reviewLine and compose`);
    const calls = [...body.matchAll(/(?<![\w$.])after\(/g)];
    assert.ok(calls.length >= 5, `only ${calls.length} after() calls in ${BODY}; the pattern stopped matching`);
    for (const call of calls) {
      assert.ok(handed.some((fn) => call.index! > fn.from && call.index! < fn.to),
        `${BODY} calls after() at character ${call.index} outside every function that was handed it`);
    }
  });

  check("every settlement, release and dictionary growth in the turn body goes through after()", () => {
    const body = code(BODY);
    for (const name of ["recordUsage", "releaseReservation", "growDictionary"]) {
      const all = body.match(new RegExp(`(?<![\\w$.])${name}\\(`, "g"))?.length ?? 0;
      const deferred = body.match(new RegExp(`after\\(\\(\\) => ${name}\\(`, "g"))?.length ?? 0;
      assert.ok(all >= 1, `${BODY} no longer calls ${name}, so this check reads nothing for it`);
      assert.equal(deferred, all, `${BODY} calls ${name} outside after(), which the platform may never run`);
    }
  });
}
