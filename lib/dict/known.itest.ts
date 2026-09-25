import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { didYouMean } from "./known";

/**
 * The suggestion row against the real `KnownWord` table.
 *
 * `nearest` is pure and tested in `known.test.ts`; what only a database can
 * show is which candidates the query hands it. The query draws by the first two
 * folded letters and caps the draw, and a cap is only honest if what it keeps
 * is the part worth ranking: ordered shortest first, the 800 rows it kept under
 * `ra` or `ka` were every short word and none of the long ones, so a typo in a
 * word of eleven letters had nothing near it to be offered. Measured over the
 * built list, 77,402 of the 154,995 headwords could never be suggested at all.
 */
afterAll(async () => {
  await prisma.$disconnect();
});

describe("didYouMean against the built word list", () => {
  it("offers a long word, not only the short words sharing its first letters", async () => {
    // `raamatukogu` is 1,751st of the 3,111 `ra` headwords by length.
    expect(await didYouMean("raamatukgu")).toContain("raamatukogu");
    // `kartulisalat` is 5,107th of the 6,947 `ka` headwords.
    expect(await didYouMean("kartulisalt")).toContain("kartulisalat");
  });

  it("still offers the word it was written for", async () => {
    expect(await didYouMean("uudishmulik")).toContain("uudishimulik");
  });
});
