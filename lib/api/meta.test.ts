import { describe, expect, it } from "vitest";

import { MetaResponse } from "./contract";
import { buildMeta } from "./meta";

const facts = (env: Record<string, string | undefined>) => ({
  env,
  speech: { modelBase: null, unavailable: "off" as const },
  sso: false,
  hosted: true,
});

describe("buildMeta", () => {
  it("fits its own schema", () => {
    expect(MetaResponse.safeParse(buildMeta(facts({}))).success).toBe(true);
  });

  it("says a switch is off and never what the operator typed", () => {
    const meta = buildMeta(facts({ PAID_OFF: "speech, tutor, whatever-else" }));
    expect(meta.switches.speech).toBe("off");
    expect(meta.switches.tutor).toBe("off");
    expect(meta.switches.scenes).toBe("on");
    expect(JSON.stringify(meta)).not.toContain("whatever-else");
  });

  it("says whether a sign-in is configured and never its value", () => {
    const meta = buildMeta(facts({ NEXT_PUBLIC_GOOGLE_CLIENT_ID: "123-secretish.apps.googleusercontent.com", EMAIL_SIGN_IN: "off" }));
    expect(meta.signIn).toEqual({ google: true, apple: false, emailLink: false, sso: false });
    expect(JSON.stringify(meta)).not.toContain("secretish");
  });

  it("reads the minimum builds", () => {
    expect(buildMeta(facts({ NATIVE_MIN_BUILD_ANDROID: "17" })).minimumBuild).toEqual({ ios: null, android: 17 });
  });
});
