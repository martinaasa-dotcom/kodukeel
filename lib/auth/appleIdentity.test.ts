import { describe, expect, it } from "vitest";
import {
  APPLE_SCRIPT_ORIGIN, APPLE_SCRIPT_SRC, appleInit, appleNameMetadata,
  hashNonce, randomNonce, readAppleFailure, readAppleResponse,
} from "./appleIdentity";

/** A token with three dot-separated parts, which is all the reader checks of its shape. */
const TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIwMDAxIn0.c2lnbmF0dXJl";

describe("the nonce", () => {
  it("is the Google module's, so the two doors make it one way", async () => {
    const nonce = randomNonce();
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
    // sha256("kodukeel"), the same known digest the Google test checks.
    expect(await hashNonce("kodukeel")).toBe(
      "461e4f2dc30726dc66359614ab65dac37990f172d796db0aca332b4792ba3af1",
    );
  });
});

describe("appleInit", () => {
  it("hands Apple the hash, asks for the name and email, and uses the popup", () => {
    const init = appleInit({
      servicesId: "ee.kodukeel.web", origin: "https://kodukeel.ee", hashedNonce: "abc", state: "s1",
    });
    expect(init).toEqual({
      clientId: "ee.kodukeel.web",
      scope: "name email",
      redirectURI: "https://kodukeel.ee/sign-in",
      state: "s1",
      nonce: "abc",
      usePopup: true,
    });
  });

  it("loads the script from the one host the policy names", () => {
    expect(APPLE_SCRIPT_SRC.startsWith(`${APPLE_SCRIPT_ORIGIN}/`)).toBe(true);
  });
});

describe("readAppleResponse", () => {
  it("keeps the name Apple sends on the first sign-in", () => {
    const read = readAppleResponse({
      authorization: { id_token: TOKEN, code: "c", state: "s1" },
      user: { email: "x@privaterelay.appleid.com", name: { firstName: "Mari", lastName: "Tamm" } },
    }, "s1");
    expect(read).toEqual({ idToken: TOKEN, name: "Mari Tamm", givenName: "Mari" });
  });

  it("reads no name every other time, so nothing is overwritten", () => {
    const read = readAppleResponse({ authorization: { id_token: TOKEN, state: "s1" } }, "s1");
    expect(read).toEqual({ idToken: TOKEN, name: null, givenName: null });
    expect(read && appleNameMetadata(read)).toBeNull();
  });

  it("cleans a name of characters nobody can see", () => {
    const read = readAppleResponse({
      authorization: { id_token: TOKEN, state: "s1" },
      user: { name: { firstName: "​Mari‮", lastName: "" } },
    }, "s1");
    expect(read?.name).toBe("Mari");
    expect(read && appleNameMetadata(read)).toEqual({ full_name: "Mari", given_name: "Mari" });
  });

  it("keeps a family name alone, with no given name to offer", () => {
    const read = readAppleResponse({
      authorization: { id_token: TOKEN, state: "s1" },
      user: { name: { lastName: "Tamm" } },
    }, "s1");
    expect(read && appleNameMetadata(read)).toEqual({ full_name: "Tamm" });
  });

  it("refuses an answer to somebody else's attempt", () => {
    expect(readAppleResponse({ authorization: { id_token: TOKEN, state: "other" } }, "s1")).toBeNull();
  });

  it("refuses anything that is not a token", () => {
    for (const raw of [null, "x", [], {}, { authorization: {} }, { authorization: { id_token: "nodots", state: "s1" } }]) {
      expect(readAppleResponse(raw, "s1")).toBeNull();
    }
  });
});

describe("readAppleFailure", () => {
  it("reads a closed popup as the person changing their mind", () => {
    expect(readAppleFailure({ error: "popup_closed_by_user" })).toBe("cancelled");
    expect(readAppleFailure({ error: "user_cancelled_authorize" })).toBe("cancelled");
  });

  it("reads anything else as a failure to say", () => {
    expect(readAppleFailure({ error: "invalid_request" })).toBe("failed");
    expect(readAppleFailure(new Error("x"))).toBe("failed");
    expect(readAppleFailure(undefined)).toBe("failed");
  });
});
