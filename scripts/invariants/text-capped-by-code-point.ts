import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function textCappedByCodePoint({ check, ALL, code }: InvariantKit) {
  check("free text is capped in characters, never in UTF-16 units", () => {
    /*
      `.slice(0, n)` counts code units, so a cap that lands inside an emoji
      keeps half of it, and the lone surrogate is stored and drawn as a
      replacement character on whatever screen reads the text back: a class
      name, a task, a note on a report. `lib/copy/clip.ts` counts code points.
      Two shapes are caps on text by construction: a `.trim().slice(0, n)`, and
      a slice to a `MAX_..._CHARS` constant, which names what it counts. Read
      with comments stripped, and over every source file rather than a list,
      since a list is how the thirteenth cap got written.
    */
    const offenders = ALL.filter((file) => !/\.test\.tsx?$/.test(file)
      && /\.trim\(\)\.slice\(0,|\.slice\(0, *MAX_\w*CHARS\)/.test(code(file)));
    assert.deepEqual(offenders, [],
      `${offenders.join(", ")} cap free text with .slice(0, n), which can cut a character in half; use clip() from lib/copy/clip.ts`);
    const clippers = ALL.filter((file) => /\bclip\(/.test(code(file)) && file !== "lib/copy/clip.ts");
    assert.ok(clippers.length >= 8, `only ${clippers.length} files cap text through clip(), which means the sweep is looking in the wrong place`);
  });
}
