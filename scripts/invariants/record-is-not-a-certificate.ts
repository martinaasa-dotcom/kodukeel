import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  A record of study says, on its own face, that it is not a certificate.

  The page exists to be printed and handed to somebody who never used the app:
  an employer, a teacher, an adviser. That reader cannot press anything, so the
  sentence has to be on the sheet rather than behind a disclosure, and it has to
  be the one sentence the arithmetic module owns rather than a paraphrase a
  later edit could soften. And nothing anywhere may call what this app gives out
  a certificate, because in Estonia a level is proved by the state examination
  alone and nothing here has been checked by an examiner.
*/
export default function recordIsNotACertificate({ check, code, ALL }: InvariantKit) {
  check("the record of study says on its face that it is not a certificate", () => {
    const page = code("app/(app)/progress/record/page.tsx");
    assert.match(page, /\{NOT_A_CERTIFICATE\}/, "the record page no longer prints the sentence saying it is not a certificate");
    assert.match(page, /\{WHAT_PROVES_A_LEVEL\}/, "the record page no longer says what does prove a level");
    const outside = page.replace(/<Explain\b[\s\S]*?<\/Explain>/g, "");
    assert.match(outside, /\{NOT_A_CERTIFICATE\}/, "the not-a-certificate sentence is behind a press, where the reader of a printout cannot reach it");

    const claims = ALL.filter((f) => !/\.(i)?test\.tsx?$/.test(f) && !f.startsWith("scripts/"))
      .filter((f) => /\b(your|our|earn|earned|download|get|receive)\s+(kodukeel\s+)?certificates?\b/i.test(code(f)));
    assert.deepEqual(claims, [], `these offer a certificate: ${claims.join(", ")}`);
  });
}
