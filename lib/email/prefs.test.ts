import { describe, expect, it } from "vitest";

import {
  ALL_OFF, emailOptInTo, emailPrefsFrom, emailPrefsTo, kindStates, switchOff, switchOn, wants,
} from "./prefs";
import { DEFAULT_OFF, OPTIONAL_KINDS } from "./letter";

describe("what a learner has switched off", () => {
  it("reads a missing row as every letter that is part of the course", () => {
    /*
      Every one except the opt-in kinds, which is the whole of the asymmetry:
      a letter about the course somebody signed up to arrives until they say
      otherwise, and a daily word with nothing to press arrives only if they
      ask. `DEFAULT_OFF` is the list and `lib/email/prefs.ts` is the argument.
    */
    for (const stored of [null, undefined, "", "   "]) {
      const prefs = emailPrefsFrom(stored);
      for (const kind of OPTIONAL_KINDS) {
        expect(wants(prefs, kind), kind).toBe(!DEFAULT_OFF.includes(kind));
      }
      // And the asymmetry is a small exception rather than the rule.
      expect(DEFAULT_OFF.length).toBeLessThan(OPTIONAL_KINDS.length / 2);
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

describe("a letter nobody gets unless they ask", () => {
  /*
    The one place this app's usual reading of a missing row is inverted.
    Everything else here is part of the course somebody signed up to; a daily
    word with nothing to press is a daily message nobody asked for, whatever
    is in it.
  */
  it("is off for somebody who has never said anything", () => {
    const fresh = emailPrefsFrom(null, null);
    for (const kind of DEFAULT_OFF) expect(wants(fresh, kind)).toBe(false);
    // And the others are unaffected by its existing.
    expect(wants(fresh, "tonight")).toBe(true);
  });

  it("arrives once somebody asks, and stops when they take it back", () => {
    const asked = switchOn(emailPrefsFrom(null, null), "wordday");
    expect(wants(asked, "wordday")).toBe(true);
    expect(emailOptInTo(asked)).toBe("wordday");
    expect(wants(switchOff(asked, ["wordday"]), "wordday")).toBe(false);
  });

  it("stops when somebody presses the client's own unsubscribe button", () => {
    /*
      The half worth stating. Somebody who pressed that has said stop, and a
      daily word arriving afterwards because they once asked for it would be
      the plainest possible breach of what that button promises.
    */
    const asked = switchOn(emailPrefsFrom(null, null), "wordday");
    const none = switchOff(asked, OPTIONAL_KINDS);
    expect(none.kind).toBe("all-off");
    expect(wants(none, "wordday")).toBe(false);
    expect(emailPrefsTo(none)).toBe(ALL_OFF);
    expect(emailOptInTo(none)).toBe("");
  });

  it("leaves no row saying off and on at once", () => {
    // Switching something off withdraws the asking for it, so a reader never
    // has to know which of two rows wins.
    const muddled = switchOff(switchOn(emailPrefsFrom(null, null), "wordday"), ["wordday"]);
    expect(emailOptInTo(muddled)).not.toContain("wordday");
  });

  it("round-trips both rows", () => {
    const asked = switchOn(emailPrefsFrom("tonight", null), "wordday");
    const back = emailPrefsFrom(emailPrefsTo(asked), emailOptInTo(asked));
    expect(wants(back, "wordday")).toBe(true);
    expect(wants(back, "tonight")).toBe(false);
    expect(wants(back, "weekly")).toBe(true);
  });
});
