import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoBanner } from "@/components/DemoBanner";
import { PROVIDER_KEY_ENV } from "@/lib/tutor/provider";

/*
  The banner shown only with the variable set (docs/44-sixth-batch.md S-6),
  and the warning the nightly reset reads off the page where a model key sits
  beside it. The reset workflow greps for the two data attributes, so they are
  what is asserted, beside the words a visitor reads.
*/
const html = () => {
  const el = DemoBanner({ locale: "en" });
  return el ? renderToStaticMarkup(el) : "";
};

describe("the demo banner", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("draws nothing on an ordinary deployment", () => {
    vi.stubEnv("DEMO_DEPLOYMENT", "");
    expect(DemoBanner({ locale: "en" })).toBeNull();
  });

  it("says the demo is shared and wiped where the variable is set", () => {
    vi.stubEnv("DEMO_DEPLOYMENT", "1");
    for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, "");
    const out = html();
    expect(out).toContain('data-demo-banner="shared"');
    expect(out).toContain("wiped every night");
    expect(out).not.toContain("unsafe");
  });

  it("names every model key set beside it, and never its value", () => {
    vi.stubEnv("DEMO_DEPLOYMENT", "1");
    for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, "");
    const [first] = PROVIDER_KEY_ENV;
    vi.stubEnv(first!, "sk-a-value-that-must-not-print");
    const out = html();
    expect(out).toContain('data-demo-banner="unsafe"');
    expect(out).toContain(first!);
    expect(out).not.toContain("sk-a-value");
  });
});
