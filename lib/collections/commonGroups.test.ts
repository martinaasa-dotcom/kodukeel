import { describe, expect, it } from "vitest";
import { FREQUENCY_GROUPS } from "./frequency";
import {
  COMMON_BATCH, COMMON_GROUPS, COMMON_PARTS, commonGroup, groupBySlug, groupsAgree, partLemmas, readPart,
} from "./commonGroups";

describe("the commonest-word groups", () => {
  it("names every group the generated table has, and no others", () => {
    /*
      The generated file is rebuilt by `npm run build:frequency`, so a fifth
      group could arrive there without anybody editing this one. A group with
      no row here renders with no name on it, which is the failure worth
      catching before a screen does.
    */
    expect(groupsAgree()).toBe(true);
    expect(COMMON_GROUPS).toHaveLength(FREQUENCY_GROUPS.length);
  });

  it("gives every group a title, a line and a slug", () => {
    for (const group of COMMON_GROUPS) {
      expect(group.title.length, `${group.key} has no title`).toBeGreaterThan(0);
      expect(group.blurb.length, `${group.key} has no line`).toBeGreaterThan(0);
      expect(group.slug, `${group.key} has a slug a URL would have to escape`)
        .toMatch(/^[a-z]+$/);
    }
  });

  it("keeps the slugs and the titles distinct", () => {
    expect(new Set(COMMON_GROUPS.map((g) => g.slug)).size).toBe(COMMON_GROUPS.length);
    expect(new Set(COMMON_GROUPS.map((g) => g.title)).size).toBe(COMMON_GROUPS.length);
  });

  it("paints each group in a different colour of the mix", () => {
    /*
      These four were kept off mint and peach, which read as "recalled" and
      "missed". Those two have left the palette, and the four bright colours of
      the mix are what a tile set cycles through, one each, so four groups read
      as four things.
    */
    const tones = COMMON_GROUPS.map((g) => g.tone);
    for (const tone of tones) expect(["accent", "butter", "sky", "blush"]).toContain(tone);
    expect(new Set(tones).size).toBe(tones.length);
  });

  it("resolves a slug however it is typed, and nothing else", () => {
    expect(groupBySlug("noun")?.key).toBe("NOUN");
    expect(groupBySlug("NOUN")?.key).toBe("NOUN");
    expect(groupBySlug("nouns")).toBeUndefined();
    expect(groupBySlug("")).toBeUndefined();
    // A route parameter is JSON off the wire whatever the type says.
    expect(groupBySlug(42)).toBeUndefined();
    expect(groupBySlug(undefined)).toBeUndefined();
    expect(groupBySlug(["noun"])).toBeUndefined();
  });

  it("answers for every key the generated table can produce", () => {
    for (const key of FREQUENCY_GROUPS) {
      expect(commonGroup(key)?.key, `${key} has no row`).toBe(key);
    }
  });

  it("leads with the small words", () => {
    // The argument the lists make. See the module header.
    expect(COMMON_GROUPS[0]?.key).toBe("SMALL");
  });
});

describe("the four parts of a list", () => {
  it("cuts a hundred words into four parts of twenty-five, in order, with none lost", () => {
    const hundred = Array.from({ length: 100 }, (_, i) => i);
    const parts = Array.from({ length: COMMON_PARTS }, (_, i) => partLemmas(hundred, i + 1));
    expect(parts.map((p) => p.length)).toEqual([COMMON_BATCH, COMMON_BATCH, COMMON_BATCH, COMMON_BATCH]);
    expect(parts.flat()).toEqual(hundred);
  });

  it("reads only parts one to four off a URL", () => {
    expect(readPart("1")).toBe(1);
    expect(readPart(["3"])).toBe(3);
    for (const bad of ["0", "5", "x", "", "1.5", undefined, 2, null]) {
      expect(readPart(bad), String(bad)).toBeUndefined();
    }
  });
});
