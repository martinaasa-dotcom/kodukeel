import { describe, expect, it } from "vitest";
import { BLANK } from "@/lib/estonian/cloze";
import { ownCardFor, sentencesOf } from "./own";
import { LESSONS, ledgerThrough } from "./index";

describe("your own sentences as cards", () => {
  const lesson = LESSONS.find((l) => l.id === "a2-55-end") ?? LESSONS[LESSONS.length - 1]!;
  const taught = ledgerThrough(LESSONS, lesson.id)!;

  it("splits a draft into sentences of three words or more", () => {
    expect(sentencesOf("Tere. Ma elan Tallinnas ja töötan seal. Kas sa tuled ka?")).toEqual([
      "Ma elan Tallinnas ja töötan seal.",
      "Kas sa tuled ka?",
    ]);
  });

  it("takes out one taught word of four letters or more, and cues it by its headword", () => {
    const card = ownCardFor("Suvel ma kavatsen Saaremaale minna.", lesson, taught, LESSONS)!;
    expect(card).not.toBeNull();
    expect(card.front).toContain(BLANK);
    expect(card.front.replace(BLANK, card.answer)).toBe("Suvel ma kavatsen Saaremaale minna.");
    expect(card.answer.length).toBeGreaterThanOrEqual(4);
    expect(taught.spellings.has(card.answer.toLocaleLowerCase("et"))).toBe(true);
  });

  it("earns nothing from a sentence with no taught word in it", () => {
    expect(ownCardFor("Blorp zing quux.", lesson, taught, LESSONS)).toBeNull();
  });
});
