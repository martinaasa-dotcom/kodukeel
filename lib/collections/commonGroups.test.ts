import { describe, expect, it } from "vitest";
import { FREQUENCY_GROUPS } from "./frequency";
import {
  COMMON_GROUPS, commonGroup, groupBySlug, groupsAgree,
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
