import { describe, expect, it } from "vitest";
import { bearerMatches, MIN_SECRET_LENGTH, usableSecret } from "./bearerSecret";

const SECRET = "a".repeat(MIN_SECRET_LENGTH) + "-scheduler";

describe("bearerMatches", () => {
  it("matches the secret and nothing else", () => {
    expect(bearerMatches(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(bearerMatches(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(bearerMatches(SECRET, SECRET)).toBe(false);
    expect(bearerMatches(null, SECRET)).toBe(false);
    expect(bearerMatches("Bearer ", SECRET)).toBe(false);
  });

  it("refuses everybody when no secret, or too short a one, is set", () => {
    expect(bearerMatches("Bearer ", undefined)).toBe(false);
    expect(bearerMatches("Bearer short", "short")).toBe(false);
    expect(usableSecret("  ")).toBeNull();
    expect(usableSecret("x".repeat(MIN_SECRET_LENGTH - 1))).toBeNull();
    expect(usableSecret(SECRET)).toBe(SECRET);
  });
});
