import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LESSON SCREEN IMPORTS WHAT IT DRAWS, NEVER WHAT BUILDS THE COURSE.
 *
 * The writing step took two numbers from `lib/course/lessons/own.ts`, which
 * reaches the lesson heads, which build every lesson and the harvest when they
 * load, so every lesson page downloaded 1.9 MB of course and dictionary and
 * built it on the main thread. `scripts/check-bundle-data.mjs` caught it after
 * the build; this names the doors before one: a client file may not take a
 * runtime import from a module that builds the course.
 */
const BUILDS_THE_COURSE = [
  "@/lib/course/lessons",
  "@/lib/course/lessons/own",
  "@/lib/course/lessonHeads",
  "@/lib/course/lessonCourse",
  "@/lib/course/lessons/index",
];

export default function aLessonScreenCarriesNoCourse({ check, code, APP, COMPONENTS }: InvariantKit) {
  check("no client file takes a runtime import from a module that builds the course", () => {
    const clients = [...APP, ...COMPONENTS].filter((file) => /^\s*["']use client["']/m.test(code(file).slice(0, 200)));
    assert.ok(clients.length > 50, `only ${clients.length} client files found; the matcher stopped matching`);
    const offenders: string[] = [];
    for (const file of clients) {
      const src = code(file);
      for (const mod of BUILDS_THE_COURSE) {
        const runtime = new RegExp(`(?:^|\\n)\\s*import\\s+(?!type\\b)[^;]*?from\\s+["']${mod.replace(/[/.]/g, "\\$&")}["']`);
        if (runtime.test(src)) offenders.push(`${file} imports ${mod}`);
      }
    }
    assert.deepEqual(offenders, [], `a screen carries the course to the browser: ${offenders.join(", ")}`);
    assert.match(code("components/course/WriteStep.tsx"), /from "@\/lib\/course\/lessons\/limits"/, "the writing step no longer reads its limits from the leaf");
  });
}
