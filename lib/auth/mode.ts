/**
 * Whether this deployment has Supabase Auth wired up.
 *
 * Two ways to run Kodukeel, and the app has to be honest about which one it is in:
 *
 * - **Hosted**, with Supabase configured: every request is gated by the middleware
 *   and each person sees only their own deck. This is the default for anything on
 *   the public internet.
 * - **Local**, with no Supabase keys: a single learner on one machine — the case a
 *   student or a teacher's laptop actually starts from. Demanding an OAuth project
 *   before the first flashcard is a wall, not security, so we drop the gate and
 *   own the data under one fixed local id.
 *
 * The fallback triggers *only* when the keys are absent. A configured deployment
 * can never be talked into local mode, so this is not an auth bypass.
 */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * The one shape of this that is neither mode, and must not be read as either.
 *
 * ADR-013 keys local mode on the *absence* of configuration, and a deployment
 * with the URL set and the anon key misspelled is not an absence: it is somebody
 * standing up a hosted install who has made one mistake in a dashboard. Read
 * as local mode it opens that install to the internet under one shared id,
 * with `isAdmin()` true for every visitor, and the sign-in screen reads as
 * "set up later" rather than "the door is open". Read as hosted it would fail
 * on the first Supabase call with a message about a missing key, which is a
 * worse way to find out but at least says so.
 *
 * So it is a third state and the middleware answers 503 while it holds.
 */
export function halfConfigured(): string | null {
  const url = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (url === key) return null;
  return url ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "NEXT_PUBLIC_SUPABASE_URL";
}

/**
 * Whether this looks like an install on the internet that has lost its
 * Supabase configuration, which is local mode served to strangers.
 *
 * Local mode is the absence of both Supabase variables, and the two are
 * inlined into the build, so a build that is missing both is local mode
 * whatever it was meant to be. That is the right answer on a laptop and the
 * worst answer there is on a host: every visitor is the one shared learner,
 * `isAdmin()` is true for all of them, and the native API answers without a
 * token. The way it happens is ordinary, a preview or a fork whose Supabase
 * variables are scoped to production while the database address is not.
 *
 * So local mode is refused where the process says it is a deployment rather
 * than somebody's machine: on Vercel, or in a production build pointed at a
 * database that is not on this machine. `KODUKEEL_LOCAL_MODE=1` is the one
 * way to say it is meant, for an operator who really does run a single-learner
 * copy on a server. CI and every browser suite run `next start` against a
 * loopback Postgres, so none of them meets this.
 *
 * Returns the reason, or null where local mode may stand.
 */
export interface ModeEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string | undefined;
  KODUKEEL_LOCAL_MODE?: string | undefined;
  VERCEL?: string | undefined;
  NODE_ENV?: string | undefined;
  DATABASE_URL?: string | undefined;
  [key: string]: string | undefined;
}

const LOOPBACK_HOST = /^(localhost|127(?:\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)$/i;

function databaseIsLocal(url: string | undefined): boolean {
  if (!url) return true;
  try {
    const host = new URL(url).hostname;
    // A socket path rides in the query string with an empty host.
    return host === "" || LOOPBACK_HOST.test(host);
  } catch {
    return false;
  }
}

export function localModeRefused(env: ModeEnv = process.env): string | null {
  if (env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  if (env.KODUKEEL_LOCAL_MODE === "1") return null;
  if (env.VERCEL) return "this is a Vercel deployment with no Supabase configuration";
  if (env.NODE_ENV === "production" && !databaseIsLocal(env.DATABASE_URL)) {
    return "this is a production build pointed at a database that is not on this machine";
  }
  return null;
}

/** The owner id every row belongs to when running without sign-in. */
export const LOCAL_USER_ID = "local-single-user";
