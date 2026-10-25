import { afterEach, describe, expect, it } from "vitest";
import { halfConfigured, localModeRefused, supabaseConfigured } from "./mode";

/**
 * The two variables are a pair, and the state worth a test is the one where
 * somebody has set one of them. See `halfConfigured` for what that state
 * would otherwise have done to a hosted install.
 */
const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const before = { url: process.env[URL_KEY], anon: process.env[ANON_KEY] };

function set(url: string | undefined, anon: string | undefined) {
  if (url === undefined) delete process.env[URL_KEY]; else process.env[URL_KEY] = url;
  if (anon === undefined) delete process.env[ANON_KEY]; else process.env[ANON_KEY] = anon;
}

afterEach(() => set(before.url, before.anon));

describe("halfConfigured", () => {
  it("is silent when both are set, which is a hosted deployment", () => {
    set("https://example.supabase.co", "anon-key");
    expect(halfConfigured()).toBeNull();
    expect(supabaseConfigured()).toBe(true);
  });

  it("is silent when neither is set, which is one learner on one machine", () => {
    set(undefined, undefined);
    expect(halfConfigured()).toBeNull();
    expect(supabaseConfigured()).toBe(false);
  });

  it("names the missing one when only the URL is set", () => {
    set("https://example.supabase.co", undefined);
    expect(halfConfigured()).toBe(ANON_KEY);
  });

  it("names the missing one when only the key is set", () => {
    set(undefined, "anon-key");
    expect(halfConfigured()).toBe(URL_KEY);
  });
});

describe("localModeRefused", () => {
  /*
    Local mode is the absence of configuration, and a hosted build can lose its
    configuration without anybody meaning it to. Served to the internet that is
    every visitor signed in as one learner with admin rights, so it is refused
    wherever the process says it is a deployment.
  */
  it("lets a contributor's machine and CI run as one learner", () => {
    expect(localModeRefused({})).toBeNull();
    expect(localModeRefused({ NODE_ENV: "production", DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/kodukeel" })).toBeNull();
    expect(localModeRefused({ NODE_ENV: "production", DATABASE_URL: "postgresql://u:p@127.0.0.1/kodukeel" })).toBeNull();
    expect(localModeRefused({ NODE_ENV: "development", DATABASE_URL: "postgresql://u:p@db.example.com/k" })).toBeNull();
  });

  it("refuses a Vercel deployment or a production build on a remote database", () => {
    expect(localModeRefused({ VERCEL: "1" })).toMatch(/Vercel/);
    expect(localModeRefused({ NODE_ENV: "production", DATABASE_URL: "postgresql://u:p@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" })).toMatch(/database/);
    expect(localModeRefused({ NODE_ENV: "production", DATABASE_URL: "not a url" })).toMatch(/database/);
  });

  it("stands aside where sign-in is configured, or where an operator says local mode is meant", () => {
    expect(localModeRefused({ VERCEL: "1", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" })).toBeNull();
    expect(localModeRefused({ VERCEL: "1", KODUKEEL_LOCAL_MODE: "1" })).toBeNull();
  });
});
