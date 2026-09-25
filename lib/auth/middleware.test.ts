import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/*
  The middleware verifies a session through `@supabase/ssr`, and verifying can
  rotate the tokens: on `TOKEN_REFRESHED` the client writes the new pair through
  the cookie adapter, on a refresh that fails it writes empty ones. Either write
  rebuilds the pass-through response, so a branch that returns a fresh redirect
  instead throws them away. These drive the real middleware with the client
  replaced by one that writes a cookie while it answers.
*/
let answer: { state: "in" | "out"; email?: string } = { state: "out" };
let written: { name: string; value: string }[] = [];

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: {
    cookies: { setAll(c: { name: string; value: string; options: object }[]): void };
  }) => ({ adapter: options.cookies, auth: { signOut: async () => ({ error: null }) } }),
}));

vi.mock("@/lib/auth/identity", async (original) => {
  const real = await original<typeof import("@/lib/auth/identity")>();
  return {
    ...real,
    readIdentity: async (client: { adapter: { setAll(c: object[]): void } }) => {
      client.adapter.setAll(written.map((c) => ({ ...c, options: {} })));
      return answer.state === "in"
        ? { state: "in", learner: { id: "u1", email: answer.email ?? "a@x.ee", name: null } }
        : { state: "out" };
    },
  };
});

const { middleware } = await import("@/middleware");

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { cookie: "sb-proj-auth-token=OLD", host: "localhost:3000" },
  });
}

describe("a redirect after the session was read carries what reading it wrote", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("ALLOWED_EMAILS", "");
    vi.stubEnv("ALLOWED_EMAIL_DOMAINS", "");
  });

  it("keeps a rotated token on the way from /sign-in to home", async () => {
    answer = { state: "in" };
    written = [{ name: "sb-proj-auth-token", value: "NEW" }];
    const response = await middleware(request("/sign-in"));
    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-proj-auth-token")?.value).toBe("NEW");
  });

  it("clears a dead session on the way to sign-in", async () => {
    answer = { state: "out" };
    written = [{ name: "sb-proj-auth-token", value: "" }];
    const response = await middleware(request("/progress"));
    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-proj-auth-token")?.value).toBe("");
  });

  it("tells an API caller it is signed out and still clears the cookie", async () => {
    answer = { state: "out" };
    written = [{ name: "sb-proj-auth-token", value: "" }];
    const response = await middleware(request("/api/export"));
    expect(response.status).toBe(401);
    expect(response.cookies.get("sb-proj-auth-token")?.value).toBe("");
  });
});
