import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CASE NAMED BESIDE ITS QUESTION IS ONE LABEL, DRAWN BY `CaseLabel`.
 *
 * Every screen that named a case next to the question it answers joined the
 * two itself: `{prompt.caseEt}, {prompt.caseQuestion}` in the writing round,
 * a name in one span and `<CaseQuestion inline />` glued on after a typed
 * `", "` on the grammar reference and the build-a-word walk, a stored hint
 * printed as it was stored under a review card. A learner read
 * `alaleütlev , millele? kuhu?` there and reported it as looking horrible,
 * and asked for one look across the app. `components/CaseLabel.tsx` is that
 * look and `lib/copy/caseLabel.ts` is the pure half that hands it its parts.
 *
 * Two arms. No screen joins a case's name and its question with a comma typed
 * in JSX, read off the code with comments stripped; and the screens converted
 * still draw the label, so a later edit that writes the string back has to
 * delete the import to do it, which a review sees.
 */
const JOINED = [
  /\{[^}]*caseEt\}\s*,\s*\{[^}]*[qQ]uestion\}/,
  /\{[^}]*\.et\}\s*,\s*\{[^}]*question\}/,
  // A name, a typed separator, then the question component straight after it.
  /\{[^{}]*(?:\.et|caseEt|caseName)\}<\/span>\s*\{",\s*"\}\s*<CaseQuestion\b/,
];

const DRAWS_IT = [
  "app/(app)/review/ReviewSession.tsx",
  "app/(app)/review/write/WriteSession.tsx",
  "app/(app)/review/describe/DescribeSession.tsx",
  "app/(app)/review/government/GovernmentSession.tsx",
  "app/(app)/review/flashcards/FlashSession.tsx",
  "app/(app)/review/exceptions/ExceptionsSession.tsx",
  "app/(app)/quest/QuestSession.tsx",
  "app/(app)/dictionary/AddWord.tsx",
  "app/(app)/dictionary/DictionaryClient.tsx",
  "app/(app)/dictionary/Forms.tsx",
  "app/(app)/grammar/page.tsx",
  "app/(app)/grammar/build-a-word/BuildWalk.tsx",
  "app/(app)/learn/[unitId]/lesson/LessonSession.tsx",
  "app/(app)/learn/[unitId]/worksheet/page.tsx",
  "app/(app)/exam/[level]/ExamSession.tsx",
  "components/WordExceptions.tsx",
  "components/scene/SceneDebrief.tsx",
];

export default function aCaseIsOneLabel({ check, ALL, code }: InvariantKit) {
  check("no screen joins a case's name and its question with a comma typed in JSX", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"));
    assert.ok(files.length > 100, `only ${files.length} files scanned, so the haystack stopped matching`);
    const offenders: string[] = [];
    for (const f of files) {
      const source = code(f);
      for (const pattern of JOINED) {
        if (pattern.test(source)) offenders.push(`${f}: ${source.match(pattern)![0]}`);
      }
    }
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\ndraw the case with <CaseLabel label={{ et, question }} />`);
  });

  check("the screens that name a case beside its question draw it through CaseLabel", () => {
    const missing = DRAWS_IT.filter((f) => !/<CaseLabel\b/.test(code(f)));
    assert.deepEqual(missing, [], `${missing.join(", ")} no longer draw a case through CaseLabel`);
    const label = code("components/CaseLabel.tsx");
    assert.match(label, /case-label-name/, "CaseLabel lost the name run the browser suites read");
    assert.match(label, /case-label-ask/, "CaseLabel lost the question run");
  });
}
