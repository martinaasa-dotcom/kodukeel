import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN ACCOUNT IS DELETED ONE WAY, AND TAKEN OUT ONE WAY, FROM EVERY DOOR (N-8, D8).
 *
 * An account can be deleted from Settings on the web, from the native app
 * (`DELETE /api/v1/me`) and, for somebody without the app, by following
 * `/account/delete` to Settings. The erasure is the one place this app is
 * promised to leave nothing behind, so there is one body, `deleteAccountFor`,
 * and the erasure invariant reads it for a `deleteMany` per owner-scoped model.
 * This holds the doors to it, since a second door with a second list is how a
 * table gets left behind on the door nobody tests.
 *
 * Four arms. Both deletion doors call `deleteAccountFor` and nothing else
 * reaches a `deleteMany` across the account; both export doors call
 * `backupFor` and ask `exportAllowance` first, so a phone and a browser share
 * one file and one allowance; the public page deletes nothing, reaches no
 * action and no database, and reads the request only through `viewerId`; and
 * it is reachable, from /privacy and /help and in the three public lists.
 */
export default function anAccountIsDeletedOneWay({ check, code }: InvariantKit) {
  const between = (src: string, from: string) => {
    const start = src.indexOf(from);
    assert.ok(start >= 0, `${from} is gone`);
    const end = src.indexOf("\nexport ", start + from.length);
    return src.slice(start, end < 0 ? undefined : end);
  };

  check("both deletion doors are the one erasure", () => {
    assert.match(between(code("app/actions.ts"), "export async function deleteMyAccount("), /deleteAccountFor\(ownerId/,
      "Settings deletes an account without deleteAccountFor");
    assert.match(between(code("app/api/v1/me/route.ts"), "export async function DELETE("), /deleteAccountFor\(who\.ownerId/,
      "DELETE /api/v1/me deletes an account without deleteAccountFor");
    const erase = code("lib/account/erase.ts");
    assert.match(erase, /isConfirmed\(confirmation, "delete"\)/, "the erasure no longer asks for the typed word itself, so a door could skip it");
    assert.match(erase, /\$transaction\(/, "the erasure is no longer one transaction, so a half-deleted account is reachable");
  });

  check("both export doors are the one backup under the one allowance", () => {
    for (const file of ["app/api/export/route.ts", "app/api/v1/export/route.ts"]) {
      const src = code(file);
      const asked = src.indexOf("exportAllowance(");
      const built = src.indexOf("backupFor(");
      assert.ok(asked >= 0 && built >= 0, `${file} does not build the backup through backupFor under exportAllowance`);
      assert.ok(asked < built, `${file} builds the backup before it asks the allowance`);
      assert.doesNotMatch(src, /prisma\./, `${file} reads a table itself rather than through backupFor`);
    }
  });

  check("the deletion page deletes nothing and reads only whether somebody is signed in", () => {
    const page = code("app/(chromeless)/account/delete/page.tsx");
    assert.doesNotMatch(page, /@\/app\/actions|@\/lib\/db|prisma|deleteAccountFor|"use client"/,
      "the public deletion page reaches an action, the database or the erasure; it only says where the button is");
    assert.doesNotMatch(page, /\brequireUserId\b|\bcurrentLearner\b|\bcookies\(/, "the public deletion page reads the session beyond deciding where its button goes");
    assert.match(page, /\bviewerId\(\)/, "the deletion page no longer decides where its button goes");
    assert.match(page, /\/settings\?tab=account/, "the deletion page no longer sends a signed-in learner to the deletion in Settings");
    assert.match(page, /\/sign-in\?next=/, "the deletion page no longer sends a signed-out reader to sign in first");
  });

  check("the deletion page is reachable from /privacy and /help and listed as public", () => {
    for (const file of ["app/privacy/page.tsx", "app/help/page.tsx"]) {
      assert.match(code(file), /href\("\/account\/delete"\)/, `${file} no longer links to the deletion page`);
    }
    assert.match(code("middleware.ts"), /path\.startsWith\("\/account\/delete"\)/, "the deletion page is behind the sign-in, which is the one place it may not be");
    assert.match(code("app/sitemap.ts"), /path: "\/account\/delete"/, "the sitemap does not list the deletion page");
    assert.match(code("app/llms.txt/route.ts"), /"\/account\/delete"/, "llms.txt does not list the deletion page");
  });
}
