import { describe, expect, it } from "vitest";
import { readAccessPolicy } from "./access";
import { addressProvedForAllowlist } from "./allowlistProof";
import { readSsoPolicy } from "./sso";

const closed = readAccessPolicy({ ALLOWED_EMAIL_DOMAINS: "kool.ee" });
const open = readAccessPolicy({});
const sso = readSsoPolicy({ SSO_DOMAINS: "kool.ee" });
const none = readSsoPolicy({});
const at = (methods?: string[], email = "mari@kool.ee") => ({ email, signInMethods: methods });

describe("an address on a closed allowlist has to have been proved", () => {
  it("checks nothing where there is no list", () => {
    expect(addressProvedForAllowlist(at(["password"]), open, none)).toBe(true);
    expect(addressProvedForAllowlist(at(undefined), open, none)).toBe(true);
  });

  it("lets in the doors that prove an inbox", () => {
    expect(addressProvedForAllowlist(at(["oauth"]), closed, none)).toBe(true);
    expect(addressProvedForAllowlist(at(["otp"]), closed, none)).toBe(true);
  });

  it("refuses a session that proves nothing about the address, or says nothing about how it was made", () => {
    expect(addressProvedForAllowlist(at(["password"]), closed, none)).toBe(false);
    expect(addressProvedForAllowlist(at(["anonymous"]), closed, none)).toBe(false);
    expect(addressProvedForAllowlist(at(["oauth", "password"]), closed, none)).toBe(false);
    expect(addressProvedForAllowlist(at([]), closed, none)).toBe(false);
    expect(addressProvedForAllowlist(at(undefined), closed, none)).toBe(false);
  });

  it("trusts a company's own identity provider for its own domain and no other", () => {
    expect(addressProvedForAllowlist(at(["sso/saml"]), closed, sso)).toBe(true);
    expect(addressProvedForAllowlist(at(["sso/saml"]), closed, none)).toBe(false);
    expect(addressProvedForAllowlist(at(["sso/saml"], "mari@evilkool.ee"), closed, sso)).toBe(false);
  });
});
