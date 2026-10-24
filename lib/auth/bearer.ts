import { createClient } from "@supabase/supabase-js";

import { refuseOldBuild } from "@/lib/api/build";
import { apiError } from "@/lib/api/errors";
import { isAllowedEmail } from "@/lib/auth/access";
import {
  AUTH_TIMEOUT_MS,
  boundedTransport,
  learnerFromClaims,
  type Identity,
  type Learner,
} from "@/lib/auth/identity";
import { LOCAL_USER_ID, supabaseConfigured } from "@/lib/auth/mode";

/**
 * WHO IS ASKING A v1 ROUTE, FROM A TOKEN AND NEVER FROM A COOKIE (D3, ADR-029).
 *
 * A native app holds its own Supabase session on the device, refreshes it with
 * supabase-js there, and sends the access token as `Authorization: Bearer`. This
 * reads that header and nothing else: a cookie arriving with the request is
 * ignored, so a stolen web session drives no route here, and there is no
 * fallback to the cookie when the header is missing, which is the shape D3
 * exists to forbid and the natural thing to write. The server never sees a
 * refresh token and never asks for one.
 *
 * It answers with `readIdentity`'s own three states, for its reason (D6): a
 * token that does not verify is "out", and an auth service that did not answer
 * is "unreachable", never "out", because reading a timeout as a sign-out takes
 * somebody's deck away over another company's bad minute.
 *
 * `getClaims(token)` verifies the token against the project's public keys, cached
 * in the process, so a project on asymmetric signing keys costs no round trip
 * per request, exactly as the web's middleware does. On the legacy shared secret
 * it asks the auth service through `getUser`, one round trip a request, which is
 * correct and slower: the fix is a dashboard setting, not code. Either way the
 * call goes through `boundedTransport`, so the deadline and the "did not answer"
 * state are the web's.
 */

/** The parts of a deployment a test states rather than inherits. */
export interface BearerDeps {
  url?: string;
  anonKey?: string;
  timeoutMs?: number;
}

/** The access token in `Authorization: Bearer <token>`, or null where there is none. */
export function bearerToken(request: { headers: { get(name: string): string | null } }): string | null {
  const header = request.headers.get("authorization");
  const match = /^Bearer\s+([A-Za-z0-9._~+/=-]+)\s*$/i.exec(header ?? "");
  return match ? match[1]! : null;
}

const LOCAL_LEARNER: Learner = { id: LOCAL_USER_ID, name: "you", email: null, avatarUrl: null, givenName: null };

/** The three-state answer to who is asking, read off the bearer token alone. */
export async function readBearer(
  request: { headers: { get(name: string): string | null } },
  deps: BearerDeps = {},
): Promise<Identity> {
  const url = deps.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = deps.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { state: "in", learner: LOCAL_LEARNER };

  const token = bearerToken(request);
  if (!token) return { state: "out" };

  const transport = boundedTransport(deps.timeoutMs ?? AUTH_TIMEOUT_MS);
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: transport.fetch },
  });
  try {
    const { data } = await supabase.auth.getClaims(token);
    if (data) return { state: "in", learner: learnerFromClaims(data.claims) };
  } catch {
    return { state: "unreachable" };
  }
  return transport.reached ? { state: "out" } : { state: "unreachable" };
}

/** Who a v1 route is answering. */
export interface BearerUser {
  ownerId: string;
  learner: Learner;
}

/** How long a client waits before asking again when the auth service did not answer. */
export const AUTH_RETRY_AFTER_SEC = 15;

/**
 * The owner a v1 route answers, or the refusal to return instead.
 *
 * Runs the build check first, so every route that resolves an owner stops a
 * build the operator has retired. Then the token: 401 `unauthenticated` where
 * there is none or it does not verify, which is the one answer a client signs
 * out on; 503 `auth_unavailable` with `Retry-After` where the auth service did
 * not answer; and the allowlist on every request, as the web asks it, so taking
 * an address off the list takes effect on the next request rather than when
 * the token expires. With no Supabase keys this is a local install (ADR-013)
 * and the answer is its one learner, as every web route gives it.
 */
export async function requireBearerUser(
  request: Request,
  deps: BearerDeps = {},
): Promise<Response | BearerUser> {
  const old = refuseOldBuild(request, process.env);
  if (old) return old;
  if (!deps.url && !supabaseConfigured()) return { ownerId: LOCAL_USER_ID, learner: LOCAL_LEARNER };
  const who = await readBearer(request, deps);
  if (who.state === "unreachable") return apiError("auth_unavailable", { retryAfterSec: AUTH_RETRY_AFTER_SEC });
  if (who.state === "out") return apiError("unauthenticated");
  if (!isAllowedEmail(who.learner.email)) {
    return apiError("unauthenticated", { message: "This address isn't allowed to use this installation." });
  }
  return { ownerId: who.learner.id, learner: who.learner };
}
