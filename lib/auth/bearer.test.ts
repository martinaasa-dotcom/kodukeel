/*
  WHO IS ASKING, FROM A TOKEN SIGNED HERE, AGAINST A KEY SET STUBBED HERE.

  The tokens are ES256 JWTs made in this file with a key generated in this
  file, and the project's key set is a stubbed `fetch`, so nothing reaches a
  network and every case is a fact about `getClaims(token)` as the installed
  supabase-js runs it. Each test names its own project URL, because
  supabase-js caches a key set per project in the process and two tests
  sharing one would be reading each other's.
*/
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { bearerToken, readBearer, requireBearerUser } from "./bearer";

type Jwk = JsonWebKey & { kid: string };

const b64url = (bytes: Uint8Array | string) =>
  Buffer.from(typeof bytes === "string" ? Buffer.from(bytes) : bytes).toString("base64url");

async function keyPair(kid: string) {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid, alg: "ES256", use: "sig" } as Jwk;
  return { privateKey: pair.privateKey, jwk };
}

async function sign(privateKey: CryptoKey, kid: string, claims: Record<string, unknown>): Promise<string> {
  const head = b64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid }));
  const body = b64url(JSON.stringify(claims));
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, Buffer.from(`${head}.${body}`)));
  return `${head}.${body}.${b64url(signature)}`;
}

const now = () => Math.floor(Date.now() / 1000);
const claims = (over: Record<string, unknown> = {}) => ({
  sub: "11111111-2222-3333-4444-555555555555",
  email: "mari@kool.ee",
  aud: "authenticated",
  role: "authenticated",
  exp: now() + 600,
  iat: now(),
  user_metadata: { full_name: "Mari Maasikas" },
  ...over,
});

let good: Awaited<ReturnType<typeof keyPair>>;
let other: Awaited<ReturnType<typeof keyPair>>;

beforeAll(async () => {
  good = await keyPair("key-1");
  other = await keyPair("key-1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** A key set that answers with `keys`, and an auth service that refuses any `getUser`. */
function stubProject(keys: Jwk[]) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/.well-known/jwks.json")) return Response.json({ keys });
    if (url.endsWith("/auth/v1/user")) return Response.json({ code: 401, msg: "invalid JWT" }, { status: 401 });
    return new Response("not stubbed", { status: 500 });
  }));
}

/** A project whose key set never answers, until the deadline gives up on it. */
function stubSilentProject() {
  vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "TimeoutError")));
  })));
}

let project = 0;
const deps = () => ({ url: `https://proj${++project}.supabase.co`, anonKey: "anon", timeoutMs: 200 });
const asking = (authorization?: string, extra: Record<string, string> = {}) =>
  new Request("https://kodukeel.example/api/v1/me", { headers: { ...(authorization ? { authorization } : {}), ...extra } });

describe("readBearer", () => {
  it("lets in a good token, verified against the key set without asking the auth service", async () => {
    stubProject([good.jwk]);
    const token = await sign(good.privateKey, "key-1", claims());
    const who = await readBearer(asking(`Bearer ${token}`), deps());
    expect(who).toMatchObject({ state: "in", learner: { id: claims().sub, name: "Mari Maasikas", email: "mari@kool.ee" } });
    const urls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.endsWith("/auth/v1/user"))).toBe(false);
  });

  it("says out for an expired token", async () => {
    stubProject([good.jwk]);
    const token = await sign(good.privateKey, "key-1", claims({ exp: now() - 60 }));
    expect(await readBearer(asking(`Bearer ${token}`), deps())).toEqual({ state: "out" });
  });

  it("says out for a token the project signed that is not a learner's session", async () => {
    stubProject([good.jwk]);
    for (const over of [{ aud: "anon", role: "anon" }, { role: "service_role" }, { is_anonymous: true }]) {
      const token = await sign(good.privateKey, "key-1", claims(over));
      expect(await readBearer(asking(`Bearer ${token}`), deps())).toEqual({ state: "out" });
    }
  });

  it("says out for a token signed by another key under the same name", async () => {
    stubProject([good.jwk]);
    const token = await sign(other.privateKey, "key-1", claims());
    expect(await readBearer(asking(`Bearer ${token}`), deps())).toEqual({ state: "out" });
  });

  it("says out for a token naming a key the set does not hold, once the auth service refuses it", async () => {
    stubProject([good.jwk]);
    const token = await sign(other.privateKey, "key-9", claims());
    expect(await readBearer(asking(`Bearer ${token}`), deps())).toEqual({ state: "out" });
  });

  it("says out for a missing header and a malformed one, and never reads a cookie instead", async () => {
    stubProject([good.jwk]);
    const token = await sign(good.privateKey, "key-1", claims());
    expect(await readBearer(asking(undefined, { cookie: `sb-proj-auth-token=${token}` }), deps())).toEqual({ state: "out" });
    expect(await readBearer(asking("Basic abc"), deps())).toEqual({ state: "out" });
    expect(await readBearer(asking("Bearer not.a.jwt"), deps())).toEqual({ state: "out" });
    expect(bearerToken(asking("bearer abc.def.ghi"))).toBe("abc.def.ghi");
  });

  it("says unreachable, never out, when the key set does not answer", async () => {
    stubSilentProject();
    const token = await sign(good.privateKey, "key-1", claims());
    expect(await readBearer(asking(`Bearer ${token}`), deps())).toEqual({ state: "unreachable" });
  });
});

describe("requireBearerUser", () => {
  it("answers the owner for a good token", async () => {
    stubProject([good.jwk]);
    const token = await sign(good.privateKey, "key-1", claims());
    const who = await requireBearerUser(asking(`Bearer ${token}`), deps());
    expect(who).toMatchObject({ ownerId: claims().sub });
  });

  it("answers 401 unauthenticated for no token, which is the one answer a client signs out on", async () => {
    stubProject([good.jwk]);
    const refused = await requireBearerUser(asking(), deps());
    expect(refused).toBeInstanceOf(Response);
    expect((refused as Response).status).toBe(401);
    expect(await (refused as Response).json()).toMatchObject({ error: { code: "unauthenticated" } });
  });

  it("answers 401 for an address the allowlist refuses, on every request", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "jaan@kool.ee");
    stubProject([good.jwk]);
    const token = await sign(good.privateKey, "key-1", claims());
    const refused = await requireBearerUser(asking(`Bearer ${token}`), deps()) as Response;
    expect(refused.status).toBe(401);
  });

  it("answers 503 auth_unavailable with Retry-After when the auth service is silent", async () => {
    stubSilentProject();
    const token = await sign(good.privateKey, "key-1", claims());
    const refused = await requireBearerUser(asking(`Bearer ${token}`), deps()) as Response;
    expect(refused.status).toBe(503);
    expect(refused.headers.get("retry-after")).not.toBeNull();
    expect(await refused.json()).toMatchObject({ error: { code: "auth_unavailable" } });
  });

  it("stops a retired build before it reads the token", async () => {
    vi.stubEnv("NATIVE_MIN_BUILD_IOS", "50");
    stubProject([good.jwk]);
    const token = await sign(good.privateKey, "key-1", claims());
    const refused = await requireBearerUser(asking(`Bearer ${token}`, { "x-kodukeel-build": "ios/49" }), deps()) as Response;
    expect(refused.status).toBe(426);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("answers the one local learner on an install with no Supabase keys", async () => {
    stubProject([]);
    const who = await requireBearerUser(asking());
    expect(who).toMatchObject({ ownerId: "local-single-user" });
  });
});
