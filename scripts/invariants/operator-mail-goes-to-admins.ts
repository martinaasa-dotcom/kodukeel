import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN ERROR IS EMAILED TO WHOEVER RUNS THIS COPY, AND TO NOBODY ELSE.
 *
 * `sendToOperator` in `lib/mailer/transport.ts` posts a plain note through the
 * same Resend key the course letters use, and it is the one send in the app
 * that skips the learner's letter machinery: no unsubscribe footer, no
 * `EmailSend` booking. That is right for an alert to the operator and wrong
 * for anybody else, so it has exactly one caller, `lib/observability/store.ts`,
 * and that caller addresses it from `adminEmails()` and nothing else.
 *
 * Two more halves of the same promise. The stored row is about the app and not
 * about a learner, so the store may not write the `ownerId` the record carries.
 * And `reportError` reaches the store only inside Next's Node server, through
 * a dynamic import, so a unit test, a script and the Edge middleware never
 * open a database from the reporter.
 */
export default function operatorMailGoesToAdmins({ check, code, LIB, APP, COMPONENTS }: InvariantKit) {
  check("only the error store sends operator mail, and it sends it to ADMIN_EMAILS", () => {
    const callers = [...LIB, ...APP, ...COMPONENTS].filter(
      (file) => file !== "lib/mailer/transport.ts" && /\bsendToOperator\b/.test(code(file)),
    );
    assert.deepEqual(callers, ["lib/observability/store.ts"], `sendToOperator is reached from ${callers.join(", ") || "nowhere"}`);
    const store = code("lib/observability/store.ts");
    assert.match(store, /const recipients = adminEmails\(\)/, "the store's recipients are not read off adminEmails()");
    assert.match(store, /sendToOperator\(\{ to: recipients\b/, "the store sends operator mail to something other than the admins");
  });

  check("a kept error carries no learner id", () => {
    const store = code("lib/observability/store.ts");
    const create = store.match(/errorEvent\.create\(\{[\s\S]*?\n {4}\}\);/)?.[0];
    assert.ok(create, "the store's create call was not found");
    assert.doesNotMatch(create, /ownerId/, "the error store writes the learner's id");
    assert.doesNotMatch(code("prisma/schema.prisma").match(/model ErrorEvent \{[\s\S]*?\n\}/)?.[0] ?? "", /ownerId/,
      "ErrorEvent has grown an ownerId column");
  });

  check("the reporter opens the store only inside Next's Node server", () => {
    const report = code("lib/observability/report.ts");
    assert.doesNotMatch(report, /^import[^\n]*["']\.\/store["']/m, "report.ts imports the store statically, which pulls Prisma into everything that reports");
    const gated = report.match(/if \(process\.env\.NEXT_RUNTIME === "nodejs"\) \{[\s\S]*?import\("\.\/store"\)/);
    assert.ok(gated, "report.ts reaches the store outside the NEXT_RUNTIME gate");
  });
}
