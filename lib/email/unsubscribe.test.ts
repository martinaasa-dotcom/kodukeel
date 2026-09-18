import { beforeEach, describe, expect, it } from "vitest";

import {
  ALL_OPTIONAL,
  kindsInScope,
  mailSecret,
  oneClickUrl,
  readUnsubscribe,
  unsubscribeLink,
} from "./unsubscribe";
import { EMAIL_KINDS } from "./letter";

const SECRET = "a-secret-long-enough-to-be-one";
const ORIGIN = "https://kodukeel.ee";
const OWNER = "8f14e45f-ceea-467a-a6b3-1cfc0e6cd3ea";

function paramsOf(url: string) {
  const q = new URL(url).searchParams;
  return { u: q.get("u"), k: q.get("k"), t: q.get("t") };
}

describe("the way out of a letter", () => {
  it("reads back the link it made", () => {
    const link = unsubscribeLink(OWNER, "tonight", ORIGIN, SECRET);
    expect(readUnsubscribe(paramsOf(link.url), SECRET)).toEqual({
      ownerId: OWNER,
      scope: "tonight",
    });
  });

  it("refuses a token signed for a different learner", () => {
    /*
      The whole reason the link is signed. Without it, anybody holding one
      unsubscribe URL could stop anybody else's mail by editing one field.
    */
    const mine = paramsOf(unsubscribeLink(OWNER, "tonight", ORIGIN, SECRET).url);
    expect(readUnsubscribe({ ...mine, u: "somebody-else" }, SECRET)).toBeNull();
  });

  it("refuses a token signed for a different kind", () => {
    const mine = paramsOf(unsubscribeLink(OWNER, "tonight", ORIGIN, SECRET).url);
    expect(readUnsubscribe({ ...mine, k: "weekly" }, SECRET)).toBeNull();
  });

  it("refuses a token made with a different secret", () => {
    const mine = paramsOf(unsubscribeLink(OWNER, "tonight", ORIGIN, SECRET).url);
    expect(readUnsubscribe(mine, "a-different-secret-entirely")).toBeNull();
  });

  it("refuses a missing, empty or truncated token without throwing", () => {
    // `timingSafeEqual` throws on a length mismatch, so the lengths are checked
    // first. A route that 500s on a truncated link is a route a reader reads as
    // an unsubscribe that does not work.
    const mine = paramsOf(unsubscribeLink(OWNER, "tonight", ORIGIN, SECRET).url);
    for (const t of [null, "", "abc", mine.t!.slice(0, -1)]) {
      expect(readUnsubscribe({ ...mine, t }, SECRET)).toBeNull();
    }
  });

  it("cannot be used to unsubscribe from the letters nobody may switch off", () => {
    /*
      A `system` letter is a sign-in link or a notice that an account is going.
      Its footer points at the preferences screen, and the token path refuses
      the scope outright, so a hand-typed link cannot switch one off either.
    */
    expect(unsubscribeLink(OWNER, "system", ORIGIN, SECRET).url).toContain("/settings#email");
    expect(readUnsubscribe({ u: OWNER, k: "system", t: "anything" }, SECRET)).toBeNull();
    expect(kindsInScope(ALL_OPTIONAL)).not.toContain("system");
  });

  it("gives the mail client's own button everything optional", () => {
    const read = readUnsubscribe(paramsOf(oneClickUrl(OWNER, ORIGIN, SECRET)), SECRET);
    expect(read?.scope).toBe(ALL_OPTIONAL);
    expect(kindsInScope(ALL_OPTIONAL).sort()).toEqual(
      EMAIL_KINDS.filter((k) => k !== "system").sort(),
    );
  });

  it("makes a different signature for every kind, so one link is not every link", () => {
    const tokens = EMAIL_KINDS.filter((k) => k !== "system").map(
      (k) => paramsOf(unsubscribeLink(OWNER, k, ORIGIN, SECRET).url).t,
    );
    expect(new Set(tokens).size).toBe(tokens.length);
  });
});

describe("the secret fails closed", () => {
  beforeEach(() => {
    delete process.env.EMAIL_TOKEN_SECRET;
  });

  it("is null when unset, blank or too short to be a secret", () => {
    expect(mailSecret()).toBeNull();
    for (const value of ["", "   ", "short"]) {
      process.env.EMAIL_TOKEN_SECRET = value;
      expect(mailSecret(), `"${value}" was accepted as a signing key`).toBeNull();
    }
  });

  it("is the value when one is really set", () => {
    process.env.EMAIL_TOKEN_SECRET = SECRET;
    expect(mailSecret()).toBe(SECRET);
  });
});
