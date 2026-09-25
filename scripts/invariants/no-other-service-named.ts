import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  `docs/31-competitors.md` compares Kodukeel with three other ways to learn
  Estonian, and it is the one place allowed to name them. Every claim there
  carries the page it was read from and the day, because a claim about somebody
  else's service is only worth making when it can be checked. A screen cannot
  carry that sourcing, and a sentence on one comparing us with a named service
  goes stale the day they change a price. So nothing the app draws names one, and
  the comparison stays where it is dated. It reads code rather than comments,
  because a comment is not copy and a note explaining this rule has to be able
  to name what it is about.
*/
const EXEMPT: Readonly<Record<string, string>> = {
  "app/(chromeless)/welcome/page.tsx": "the dated comparison in the FAQ, which credits what each tool does better",
  "lib/collections/placesToTalk.ts": "points at the free state course as a place to go alongside this app",
};

const OTHERS = /\b(keelix|tere\s?tere|keeleklikk|keeletee|keelelend)\b/i;

export default function noOtherServiceNamed({ check, read, ALL }: InvariantKit) {
  check("the app names no other Estonian course; the comparison lives in docs/31-competitors.md", () => {
    assert.ok(ALL.length > 400, `only ${ALL.length} source files read, so this check stopped looking`);
    const naming = ALL.filter((f) => OTHERS.test(read(f)));
    const unexcused = naming.filter((f) => !(f in EXEMPT));
    assert.deepEqual(unexcused, [], `these name another service: ${unexcused.join(", ")}`);
    const stale = Object.keys(EXEMPT).filter((f) => !naming.includes(f));
    assert.deepEqual(stale, [], `exempt but no longer naming anybody, so take the line out: ${stale.join(", ")}`);
  });
}
