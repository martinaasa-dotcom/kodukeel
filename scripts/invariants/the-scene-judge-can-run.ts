import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A `let` IN THE SCENE ROUTE IS DECLARED BEFORE ANYTHING NAMES IT.
 *
 * `readingOf` is a function declaration, so it is hoisted and the judge near
 * the top of POST could call it; the memo it read was a `let` written beside
 * it seven hundred lines further down, which is not hoisted. So every judge
 * call threw "Cannot access 'readOnce' before initialization", the error was
 * reported and swallowed, and the one path that credits a learner who did what
 * the beat asked in words the dictionary did not expect never ran, in
 * production, for as long as the memo existed. No type check and no unit test
 * reaches it, since the route's body is only ever run by a request.
 *
 * The rule is the hazard itself rather than a style: a function declaration
 * in the file whose body names a \`let\` binding may not be called before
 * that binding is written. Anything else a \`let\` does is ordinary.
 */
export default function theSceneJudgeCanRun({ check, code }: InvariantKit) {
  check("no hoisted function in the scene route reads a let before it is written", () => {
    const route = code("app/api/scene/route.ts");
    const word = (name: string) => new RegExp(`(?<![\\w$./])${name.replace(/\$/g, "\\$")}(?![\\w$])`, "g");
    // Every function declaration with its body, found by brace matching from its opening brace.
    const functions: { name: string; body: string; params: string }[] = [];
    for (const found of route.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
      const open = route.indexOf("{", route.indexOf(")", found.index!));
      let depth = 0;
      let at = open;
      for (; at < route.length; at += 1) {
        if (route[at] === "{") depth += 1;
        else if (route[at] === "}" && --depth === 0) break;
      }
      functions.push({ name: found[1]!, body: route.slice(open, at + 1), params: route.slice(found.index!, open) });
    }
    assert.ok(functions.length >= 5, `found only ${functions.length} function declarations in the scene route; the pattern stopped matching`);
    const lets = [...route.matchAll(/\blet\s+([A-Za-z_$][\w$]*)\b/g)];
    for (const found of lets) {
      const name = found[1]!;
      for (const fn of functions) {
        if (!word(name).test(fn.body)) continue;
        // A name the function binds itself, as a parameter or a local, is not the outer `let`.
        if (word(name).test(fn.params) || new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`).test(fn.body)) continue;
        const call = new RegExp(`(?<![\\w$.])${fn.name}\\s*\\(`, "g");
        for (const use of route.matchAll(call)) {
          const isDeclaration = /function\s+$/.test(route.slice(Math.max(0, use.index! - 12), use.index!));
          assert.ok(
            isDeclaration || use.index! > found.index!,
            `\`${fn.name}\` reads \`${name}\` and is called before \`let ${name}\` is written, which throws on the first request that reaches it`,
          );
        }
      }
    }
  });
}
