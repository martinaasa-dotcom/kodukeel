import { describe, expect, it } from "vitest";

import { minimumBuilds, parseBuild, refuseOldBuild } from "./build";

const asking = (value?: string) => ({ headers: { get: (name: string) => (name === "x-kodukeel-build" ? value ?? null : null) } });

describe("refuseOldBuild", () => {
  it("lets through a request with no build header, which is not a native app", () => {
    expect(refuseOldBuild(asking(), { NATIVE_MIN_BUILD_IOS: "40" })).toBeNull();
  });

  it("answers any build where no minimum is set", () => {
    expect(refuseOldBuild(asking("ios/1"), {})).toBeNull();
    expect(minimumBuilds({ NATIVE_MIN_BUILD_IOS: " ", NATIVE_MIN_BUILD_ANDROID: "nine" })).toEqual({ ios: null, android: null });
  });

  it("stops a build below its own platform's minimum with 426 too_old", async () => {
    const env = { NATIVE_MIN_BUILD_IOS: "40", NATIVE_MIN_BUILD_ANDROID: "7" };
    const refused = refuseOldBuild(asking("ios/39"), env);
    expect(refused?.status).toBe(426);
    expect(await refused?.json()).toMatchObject({ error: { code: "too_old" } });
    expect(refuseOldBuild(asking("ios/40"), env)).toBeNull();
    // The other platform's minimum is not this one's.
    expect(refuseOldBuild(asking("android/39"), env)).toBeNull();
    expect(refuseOldBuild(asking("android/6"), env)?.status).toBe(426);
  });

  it("refuses a header it cannot read rather than waving it through", () => {
    expect(refuseOldBuild(asking("windows/3"), {})?.status).toBe(400);
    expect(refuseOldBuild(asking("ios"), {})?.status).toBe(400);
    expect(parseBuild(" Android / 12 ")).toEqual({ platform: "android", build: 12 });
  });
});
