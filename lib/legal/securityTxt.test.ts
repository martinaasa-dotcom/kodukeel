import { describe, expect, it } from "vitest";

import { resolveOperator } from "./operator";
import { SECURITY_TXT_LIFETIME_DAYS, securityTxt } from "./securityTxt";

const built = new Date("2026-10-24T12:00:00.000Z");
const named = resolveOperator({ OPERATOR_NAME: "A Company OÜ", OPERATOR_ADDRESS: "A street 1, Tallinn", OPERATOR_EMAIL: "security@example.ee" });

function fields(body: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const line of body.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const at = line.indexOf(": ");
    expect(at, `${line} is not a field`).toBeGreaterThan(0);
    const key = line.slice(0, at).toLowerCase();
    out.set(key, [...(out.get(key) ?? []), line.slice(at + 2)]);
  }
  return out;
}

describe("security.txt (RFC 9116)", () => {
  it("carries the two required fields, each once, from the operator and the build", () => {
    const body = securityTxt(named, new URL("https://example.ee"), built)!;
    const f = fields(body);
    expect(f.get("contact")).toEqual(["mailto:security@example.ee"]);
    expect(f.get("expires")).toHaveLength(1);
    const expires = new Date(f.get("expires")![0]!);
    expect(expires.toISOString()).toBe(f.get("expires")![0]);
    const days = (expires.getTime() - built.getTime()) / 86_400_000;
    expect(days).toBe(SECURITY_TXT_LIFETIME_DAYS);
    expect(days).toBeLessThan(365);
    expect(body.endsWith("\n")).toBe(true);
  });

  it("names the policy, the languages and its own canonical address where the origin is known", () => {
    const f = fields(securityTxt(named, new URL("https://example.ee"), built)!);
    expect(f.get("policy")).toEqual(["https://example.ee/trust#security"]);
    expect(f.get("canonical")).toEqual(["https://example.ee/.well-known/security.txt"]);
    expect(f.get("preferred-languages")).toEqual(["en, et"]);
  });

  it("leaves out the fields that need an origin when the deployment has not said where it lives", () => {
    const f = fields(securityTxt(named, null, built)!);
    expect(f.has("policy")).toBe(false);
    expect(f.has("canonical")).toBe(false);
    expect(f.get("contact")).toEqual(["mailto:security@example.ee"]);
  });

  it("publishes nothing for a deployment that names nobody", () => {
    expect(securityTxt(resolveOperator({}), new URL("https://fork.example"), built)).toBeNull();
  });

  it("names the canonical deployment's operator off the table, with no variables set", () => {
    const f = fields(securityTxt(resolveOperator({ NEXT_PUBLIC_SITE_URL: "https://kodukeel.ee" }), new URL("https://kodukeel.ee"), built)!);
    expect(f.get("contact")).toEqual(["mailto:privacy@upthink.ee"]);
  });
});
