import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";

/*
  The robots route answering both ways (docs/44-sixth-batch.md S-6): a demo
  deployment asks every crawler to stay out and names no sitemap, and every
  other deployment is exactly what it was.
*/
describe("robots on a demo deployment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("asks every crawler to stay out and names no sitemap", () => {
    vi.stubEnv("DEMO_DEPLOYMENT", "1");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://demo.kodukeel.ee");
    const r = robots();
    expect(r.rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    expect(r.sitemap).toBeUndefined();
  });

  it("leaves an ordinary deployment open to its public pages", () => {
    vi.stubEnv("DEMO_DEPLOYMENT", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://kodukeel.ee");
    const r = robots();
    expect(r.rules).toEqual([{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }]);
    expect(r.sitemap).toBe("https://kodukeel.ee/sitemap.xml");
  });
});
