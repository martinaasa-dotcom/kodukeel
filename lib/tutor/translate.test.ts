import { describe, expect, it } from "vitest";
import { looksLikeEcho } from "@/lib/tutor/translate";

/**
 * `looksLikeEcho` is the one thing standing between a learner and the exact
 * fault reported live: a card showing "Kell on üks öösel." twice, the second
 * copy under an "AI · verify" badge, because the model answered a translation
 * request with the Estonian sentence it was asked to translate.
 */
describe("looksLikeEcho", () => {
  it("catches the sentence handed back exactly as it was given", () => {
    expect(looksLikeEcho("Kell on üks öösel.", "Kell on üks öösel.")).toBe(true);
  });

  it("catches it case-folded and without the closing stop", () => {
    expect(looksLikeEcho("kell on üks öösel", "Kell on üks öösel.")).toBe(true);
  });

  it("catches it with different trailing punctuation", () => {
    expect(looksLikeEcho("Kell on üks öösel!", "Kell on üks öösel?")).toBe(true);
  });

  it("catches it with extra or collapsed whitespace", () => {
    expect(looksLikeEcho("Kell  on üks   öösel.", "Kell on üks öösel.")).toBe(true);
  });

  it("does not fire on a real translation, however short", () => {
    expect(looksLikeEcho("It's one in the morning.", "Kell on üks öösel.")).toBe(false);
  });

  it("does not fire on a translation that happens to share a word", () => {
    expect(looksLikeEcho("The coffee is hot.", "Kohv on kuum.")).toBe(false);
  });

  it("does not fire on a genuinely different Estonian sentence", () => {
    expect(looksLikeEcho("Kohv on kuum.", "Kell on üks öösel.")).toBe(false);
  });
});
