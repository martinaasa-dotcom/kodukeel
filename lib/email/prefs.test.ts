import { describe, expect, it } from "vitest";

import { ALL_OFF, emailPrefsFrom, emailPrefsTo, kindStates, switchOff, switchOn, wants } from "./prefs";
import { OPTIONAL_KINDS } from "./letter";

describe("what a learner has switched off", () => {
  it("reads a missing row as every letter on", () => {
    for (const stored of [null, undefined, "", "   "]) {
      const prefs = emailPrefsFrom(stored);
      for (const kind of OPTIONAL_KINDS) expect(wants(prefs, kind)).toBe(true);
    }
  });

  it("switches off only what it was asked to", () => {
    const prefs = switchOff(emailPrefsFrom(null), ["tonight"]);
    expect(wants(prefs, "tonight")).toBe(false);
    expect(wants(prefs, "weekly")).toBe(true);
  });

  it("never switches off a letter nobody may switch off", () => {
    /*
      A sign-in link is not a preference. `system` is dropped on the way in, so
      a hand-edited row cannot reach it either.
    */
    expect(wants(emailPrefsFrom("system tonight"), "system")).toBe(true);
    expect(wants(switchOff(emailPrefsFrom(null), ["system"]), "system")).toBe(true);
    expect(emailPrefsTo(emailPrefsFrom("system"))).toBe("");
  });

  it("stores everything off as `all`, so a kind added later stays off too", () => {
    /*
      The reason this is a value rather than a list. Somebody who unticked
      every box has said stop, and writing out the four kinds that exist today
      would opt them back in to the fifth the day it is written.
    */
    const none = switchOff(emailPrefsFrom(null), OPTIONAL_KINDS);
    expect(emailPrefsTo(none)).toBe(ALL_OFF);
    expect(none.kind).toBe("all-off");
  });

  it("expands `all` when one is switched back on", () => {
    const back = switchOn(emailPrefsFrom(ALL_OFF), "weekly");
    expect(wants(back, "weekly")).toBe(true);
    expect(wants(back, "tonight")).toBe(false);
  });

  it("drops a kind it does not recognise rather than throwing", () => {
    // Read on a scheduled run with nobody watching. One odd row should cost
    // that learner's preference, not everybody's letters.
    const prefs = emailPrefsFrom("tonight not-a-kind weekly");
    expect(wants(prefs, "tonight")).toBe(false);
    expect(wants(prefs, "weekly")).toBe(false);
    expect(emailPrefsTo(prefs)).not.toContain("not-a-kind");
  });

  it("offers the settings screen every optional kind and no others", () => {
    expect(kindStates(emailPrefsFrom(null)).map((k) => k.kind).sort()).toEqual([...OPTIONAL_KINDS].sort());
  });

  it("round-trips", () => {
    for (const stored of ["", "tonight", "tonight weekly", ALL_OFF]) {
      expect(emailPrefsTo(emailPrefsFrom(stored))).toBe(
        stored === "tonight weekly" ? "tonight weekly" : stored,
      );
    }
  });
});
