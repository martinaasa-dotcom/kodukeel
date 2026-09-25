/*
  WHICH SPENT SHIELD A LETTER MAY BE ABOUT.

  The letter says "A shield covered yesterday", so the only day it may be
  sent about is yesterday. The list of covered days only ever grows, and the
  first version took the latest one nobody had been told about, whatever its
  age: a shield spent in March was announced in September as yesterday's.
*/
import { describe, expect, it } from "vitest";

import { shieldToTell } from "./letters/shield";

const YESTERDAY = "2026-09-24";

describe("the shield a letter is about", () => {
  it("is yesterday's, when a shield covered yesterday and nobody said so", () => {
    expect(shieldToTell('["2026-03-01","2026-09-24"]', "2026-03-01", YESTERDAY)).toBe(YESTERDAY);
    expect(shieldToTell('["2026-09-24"]', "", YESTERDAY)).toBe(YESTERDAY);
  });

  it("is nothing when the only untold shield is months old", () => {
    expect(shieldToTell('["2026-03-01"]', "", YESTERDAY)).toBeNull();
  });

  it("is nothing when the untold shield covered the day before yesterday", () => {
    expect(shieldToTell('["2026-09-23"]', "", YESTERDAY)).toBeNull();
  });

  it("is nothing once yesterday's shield has been told", () => {
    expect(shieldToTell('["2026-09-24"]', "2026-09-24", YESTERDAY)).toBeNull();
  });

  it("is nothing where the stored list cannot be read", () => {
    expect(shieldToTell("not json", "", YESTERDAY)).toBeNull();
    expect(shieldToTell('{"a":1}', "", YESTERDAY)).toBeNull();
    expect(shieldToTell(undefined, "", YESTERDAY)).toBeNull();
    expect(shieldToTell('[5, null]', "", YESTERDAY)).toBeNull();
  });
});
