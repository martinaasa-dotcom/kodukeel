import { describe, expect, it } from "vitest";
import { hashNonce, randomNonce } from "./googleIdentity";

describe("randomNonce", () => {
  it("returns a 32-character hex string", () => {
    const nonce = randomNonce();
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is different on every call", () => {
    expect(randomNonce()).not.toBe(randomNonce());
  });
});

describe("hashNonce", () => {
  it("matches a known SHA-256 digest", async () => {
    // sha256("kodukeel"), checked against Node's own crypto module.
    expect(await hashNonce("kodukeel")).toBe(
      "461e4f2dc30726dc66359614ab65dac37990f172d796db0aca332b4792ba3af1",
    );
  });

  it("is deterministic", async () => {
    const nonce = randomNonce();
    expect(await hashNonce(nonce)).toBe(await hashNonce(nonce));
  });
});
