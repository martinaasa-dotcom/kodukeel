import assert from "node:assert/strict";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LESSON IN PREVIEW IS OPENED BY A REVIEWER AND BY NOBODY ELSE, through
 * every door. The lesson page asks `isAdmin` before it shows one; the server
 * actions a lesson calls (reading a sentence, reading a text, keeping its
 * sentences as cards) found a lesson by id among the course and the preview
 * alike, so any signed-in learner could have an unreleased lesson read, or
 * cards cut from it written into their own deck, by typing its id into a
 * request. Every file under `app/` that names the preview list asks the same
 * question before it hands one out.
 */
export default function aLessonInPreviewIsForReviewers({ check, code, APP }: InvariantKit) {
  const files = APP.filter((f) => !/\.test\./.test(f));

  check("every file under app/ that reaches the preview lessons asks whether the caller is a reviewer first", () => {
    const reaching = files.filter((f) => /\bPREVIEW_LESSONS\b/.test(code(f)));
    assert.ok(reaching.length >= 1, "no file under app/ names PREVIEW_LESSONS, so this check reads nothing");
    for (const file of reaching) {
      const source = code(file);
      assert.doesNotMatch(source, /\[\s*\.\.\.LESSONS\s*,\s*\.\.\.PREVIEW_LESSONS\s*\]/, `${file} finds a lesson among the course and the preview alike, with nobody asked`);
      for (const m of source.matchAll(/\bPREVIEW_LESSONS\b(?!\s*}\s*from)/g)) {
        const before = source.slice(Math.max(0, m.index - 240), m.index);
        assert.match(before, /isAdmin\(\)|allowPreview/, `${file} hands out a lesson in preview without asking isAdmin`);
      }
    }
  });
}
