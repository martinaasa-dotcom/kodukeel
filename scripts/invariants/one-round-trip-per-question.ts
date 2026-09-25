import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  A ROUND TRIP IS THE UNIT OF A PAGE, AND A QUESTION ASKED TWICE IN ONE RENDER
  IS TWO OF THEM.

  CLAUDE.md's rule: what one learner is asked twice in a render is memoised
  for that render with React's `cache`, and two answers that do not need each
  other are asked at once. These hold the particular reads an audit found
  doing neither, by the shape of the fault rather than by today's markup.
*/

/** The body of a named function or `const` arrow in a file, up to its closing brace at column 0. */
function bodyOf(source: string, name: string): string {
  const start = source.search(new RegExp(`(?:function\\s+${name}\\s*\\(|const\\s+${name}\\s*=)`));
  assert.ok(start >= 0, `${name} is no longer declared where this check looks for it`);
  const end = source.indexOf("\n}", start);
  return source.slice(start, end < 0 ? undefined : end);
}

/** Every name a file binds to a `cache(...)` call. */
function cachedNames(source: string): string[] {
  return [...source.matchAll(/const\s+(\w+)\s*=\s*cache\(/g)].map((m) => m[1]!);
}

/** Whether the text between two offsets closes a top-level batch, which is `]);` at two spaces. */
function closesBatch(source: string, from: number, to: number): boolean {
  return /\n  \]\);/.test(source.slice(from, to));
}

export default function oneRoundTripPerQuestion({ check, code }: InvariantKit) {
  check("a per-learner read asked twice in one render is memoised through cache(", () => {
    /*
      `deferredWordIds` is asked by the deck snapshot, the ladder's counts and
      the course's "have the words been met" in one render; `caseReviewsFor`
      by Progress and `readinessPicture` with the same instant; and the course
      screen's reading and its closing line both count the same answers and
      ask the same day's words. Each exported reader has to reach a `cache`,
      or every caller is a round trip of its own.
    */
    const READERS: readonly (readonly [string, string])[] = [
      ["lib/progress/deferrals.ts", "deferredWordIds"],
      ["lib/progress/cases.ts", "caseReviewsFor"],
      ["lib/progress/course.ts", "gradedSince"],
      ["lib/progress/course.ts", "metWords"],
    ];
    assert.ok(READERS.length >= 4, "the list of memoised readers shrank");
    for (const [file, name] of READERS) {
      const source = code(file);
      assert.match(source, /import\s*\{[^}]*\bcache\b[^}]*\}\s*from\s*"react"/, `${file} no longer imports cache from react`);
      const cached = cachedNames(source);
      assert.ok(cached.length > 0, `${file} declares nothing through cache(`);
      const body = bodyOf(source, name);
      assert.ok(cached.some((c) => new RegExp(`\\b${c}\\(`).test(body)),
        `${file}: ${name} reads without going through any of ${cached.join(", ")}, so every caller in a render pays a round trip`);
    }
  });

  check("Today starts courseReading in the same batch as programmeFor, and the climb beside the word of the day", () => {
    const page = code("app/(app)/page.tsx");
    const calls = [...page.matchAll(/\bcourseReading\(/g)];
    assert.equal(calls.length, 1, `Today calls courseReading ${calls.length} times`);
    const programme = page.indexOf("programmeFor(ownerId)");
    const reading = calls[0]!.index!;
    assert.ok(programme > 0 && reading > programme,
      "Today reads the course before it knows the programme");
    assert.ok(!closesBatch(page, programme, reading),
      "Today waits for a whole batch to come back before it starts courseReading, which needs only the programme");
    const word = page.indexOf("wordOfDay(ownerId");
    const ladder = page.indexOf("ladderPosition(");
    assert.ok(word > 0 && ladder > word && !closesBatch(page, word, ladder),
      "Today asks for the climb in a batch of its own after the word of the day");
  });

  check("readinessSignals asks every database question in its batch, none in the object it returns", () => {
    const body = bodyOf(code("lib/progress/exam.ts"), "readinessSignals");
    const batchEnd = body.search(/\n\s*\]\);/);
    assert.ok(batchEnd > 0, "readinessSignals has no Promise.all batch any more");
    assert.doesNotMatch(body.slice(batchEnd), /await\s+prisma\./,
      "readinessSignals awaits a query after its batch, which is one more round trip for an answer that needs none of it");
  });

  check("a ladder batch is not held up waiting for counts it never reads", () => {
    const PAGES = ["app/(app)/learn/new/page.tsx", "app/(app)/course/learn/page.tsx"];
    for (const file of PAGES) {
      const page = code(file);
      assert.match(page, /\blearnBatch\(/, `${file} no longer builds a ladder batch`);
      assert.doesNotMatch(page, /=\s*await\s+learnBatch\(/,
        `${file} awaits learnBatch in a statement of its own, after the counts it does not need`);
      const counts = page.indexOf("learnCounts(");
      const batch = page.indexOf("learnBatch(");
      assert.ok(counts > 0 && batch > counts, `${file} no longer asks for the counts before building the batch`);
      assert.ok(!/\bawait\b/.test(page.slice(counts, batch)),
        `${file} waits for the counts before it starts the batch, which never reads them`);
    }
  });
}
