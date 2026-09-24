/**
 * WHETHER A CONNECTION STRING NAMES A DATABASE ON THIS MACHINE.
 *
 * `npm run test:db` writes. It creates learners, books calls against the
 * ledger's shared daily budget, invents dictionary rows and deletes them again,
 * and it opens whatever `DATABASE_URL` the shell exported. A developer whose
 * shell carries the deployment's connection string, which is exactly what a
 * copied `.env` does, would run the whole integration suite against the
 * database every learner uses. `scripts/itest-guard.ts` asks this before any
 * test file loads and refuses anything that is not on loopback, unless the
 * run opts in by name (`REMOTE_DATABASE_OPT_IN`) for a test database that is
 * genuinely somewhere else.
 *
 * Loopback means `localhost`, the whole of 127.0.0.0/8, `::1`, or a Unix
 * socket (an empty host, or a `host=` parameter that is a path). Anything
 * that does not parse is not local: a guard in front of a destructive run has
 * to fail closed. That includes libpq's `postgresql://user@/db?host=/path`,
 * which the URL parser refuses; such a run opts in by name.
 *
 * Pure: a string in, a verdict out. It never returns the string, because the
 * caller prints the host and a connection string carries a password.
 */

/** The variable a run sets to `1` to point the integration suite elsewhere on purpose. */
export const REMOTE_DATABASE_OPT_IN = "ITEST_ALLOW_REMOTE_DATABASE";

export interface DatabaseTarget {
  readonly local: boolean;
  /** The host alone, safe to print. Empty for a Unix socket; "unparseable" when it did not parse. */
  readonly host: string;
}

export function databaseTarget(connectionString: string): DatabaseTarget {
  let url: URL;
  try {
    url = new URL(connectionString.trim());
  } catch {
    return { local: false, host: "unparseable" };
  }
  if (!/^postgres(?:ql)?:$/.test(url.protocol)) return { local: false, host: "unparseable" };

  const socket = url.searchParams.get("host");
  if (socket?.startsWith("/")) return { local: true, host: socket };

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "") return { local: true, host: "" };
  const local = host === "localhost" || host === "::1" || /^127(?:\.\d{1,3}){3}$/.test(host);
  return { local, host };
}
