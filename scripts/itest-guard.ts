import { databaseTarget, REMOTE_DATABASE_OPT_IN } from "../lib/security/localDatabase";

/**
 * Refuses to start `npm run test:db` against a database that is not on this
 * machine, before a single test file is loaded.
 *
 * The integration suite writes: learners, ledger rows against the shared daily
 * budget, invented dictionary entries. It opens whatever the shell exported,
 * and a shell carrying the deployment's connection string is the ordinary
 * state of a developer who copied `.env`. CI points it at `127.0.0.1` and is
 * untouched. A test database somewhere else is still reachable, on purpose:
 * set `ITEST_ALLOW_REMOTE_DATABASE=1` for that one run.
 *
 * Only the host is printed, never the connection string, which carries the
 * password. See `lib/security/localDatabase.ts` for what counts as local.
 */
export default function guard(): void {
  if (process.env[REMOTE_DATABASE_OPT_IN] === "1") return;
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const value = process.env[name]?.trim();
    if (!value) continue;
    const target = databaseTarget(value);
    if (target.local) continue;
    throw new Error(
      `${name} points at ${target.host || "a socket"}, which is not this machine. `
      + "The integration suite creates and deletes rows and books ledger calls, so it runs only "
      + `against a local database. Point ${name} at one, or set ${REMOTE_DATABASE_OPT_IN}=1 `
      + "for a test database elsewhere that you mean to write to.",
    );
  }
}
