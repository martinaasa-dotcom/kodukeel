import { afterEach, describe, expect, it } from "vitest";
import { androidAssetLinks, appleAssociation, CLAIMED_PATHS, fingerprint } from "./appLinks";
import { resolveLink } from "@/lib/links/routes";

/**
 * The two files a phone reads to open this domain's sign-in link in an app
 * (docs/44-sixth-batch.md, N-3). Each is the operator's fact, so each is
 * absent until its variables are set, and the routes are driven here with the
 * environment set both ways, since a route that answers on one machine and not
 * another is the thing to rule out.
 */

const KEYS = ["APPLE_TEAM_ID", "IOS_BUNDLE_ID", "ANDROID_PACKAGE_NAME", "ANDROID_CERT_SHA256"] as const;
const saved = new Map(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const [k, v] of saved) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function only(set: Partial<Record<(typeof KEYS)[number], string>> = {}) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, set);
}

const CERT = "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5";

describe("what the apps claim", () => {
  it("is the sign-in link alone, and a native screen answers every path claimed", () => {
    expect(CLAIMED_PATHS).toEqual(["/auth/callback"]);
    for (const path of CLAIMED_PATHS) {
      const home = resolveLink(path);
      expect(home, `${path} is claimed by the apps and no native screen answers it`).not.toBeNull();
      expect(home).not.toBe("browser");
    }
  });
});

describe("Apple's association file", () => {
  it("names the team and bundle and claims only the callback", () => {
    const body = appleAssociation({ APPLE_TEAM_ID: "ABCDE12345", IOS_BUNDLE_ID: "ee.kodukeel.app" });
    expect(body).toEqual({
      applinks: {
        details: [{
          appIDs: ["ABCDE12345.ee.kodukeel.app"],
          components: [{ "/": "/auth/callback", comment: "The emailed sign-in link" }],
        }],
      },
    });
  });

  it("is absent where either value is unset or malformed", () => {
    expect(appleAssociation({})).toBeNull();
    expect(appleAssociation({ APPLE_TEAM_ID: "ABCDE12345" })).toBeNull();
    expect(appleAssociation({ IOS_BUNDLE_ID: "ee.kodukeel.app" })).toBeNull();
    expect(appleAssociation({ APPLE_TEAM_ID: "short", IOS_BUNDLE_ID: "ee.kodukeel.app" })).toBeNull();
    expect(appleAssociation({ APPLE_TEAM_ID: "ABCDE12345", IOS_BUNDLE_ID: "nodots" })).toBeNull();
  });
});

describe("Android's asset links", () => {
  it("names the package and every certificate, in the form Android compares", () => {
    const lower = CERT.replace(/:/g, "").toLowerCase();
    const body = androidAssetLinks({ ANDROID_PACKAGE_NAME: "ee.kodukeel.app", ANDROID_CERT_SHA256: `${CERT}, ${lower}, ${"AB".repeat(32)}` });
    expect(body).toEqual([{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "ee.kodukeel.app",
        sha256_cert_fingerprints: [CERT, Array(32).fill("AB").join(":")],
      },
    }]);
  });

  it("is absent where the package or every certificate is unset or malformed", () => {
    expect(androidAssetLinks({})).toBeNull();
    expect(androidAssetLinks({ ANDROID_PACKAGE_NAME: "ee.kodukeel.app" })).toBeNull();
    expect(androidAssetLinks({ ANDROID_PACKAGE_NAME: "ee.kodukeel.app", ANDROID_CERT_SHA256: "not-a-hash" })).toBeNull();
    expect(androidAssetLinks({ ANDROID_PACKAGE_NAME: "1bad", ANDROID_CERT_SHA256: CERT })).toBeNull();
  });

  it("reads a fingerprint with or without colons, and nothing else", () => {
    expect(fingerprint(CERT.replace(/:/g, ""))).toBe(CERT);
    expect(fingerprint("AB:CD")).toBeNull();
  });
});

describe("the two routes", () => {
  it("serve Apple's file as JSON at its own path, with no redirect", async () => {
    only({ APPLE_TEAM_ID: "ABCDE12345", IOS_BUNDLE_ID: "ee.kodukeel.app" });
    const { GET } = await import("@/app/.well-known/apple-app-site-association/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("location")).toBeNull();
    const body = await res.json();
    expect(body.applinks.details[0].appIDs).toEqual(["ABCDE12345.ee.kodukeel.app"]);
  });

  it("answer Apple's path with a 404 where nothing is configured", async () => {
    only();
    const { GET } = await import("@/app/.well-known/apple-app-site-association/route");
    const res = GET();
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).not.toBe("application/json");
  });

  it("serve Android's file as JSON, and a 404 where nothing is configured", async () => {
    const { GET } = await import("@/app/.well-known/assetlinks.json/route");
    only({ ANDROID_PACKAGE_NAME: "ee.kodukeel.app", ANDROID_CERT_SHA256: CERT });
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect((await res.json())[0].target.sha256_cert_fingerprints).toEqual([CERT]);

    only();
    expect(GET().status).toBe(404);
  });

  it("are read per request, so one build serves both states", async () => {
    for (const path of ["@/app/.well-known/apple-app-site-association/route", "@/app/.well-known/assetlinks.json/route"]) {
      const mod = (await import(path)) as { dynamic?: string };
      expect(mod.dynamic, path).toBe("force-dynamic");
    }
  });
});
