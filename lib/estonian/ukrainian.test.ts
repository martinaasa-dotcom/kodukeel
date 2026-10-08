import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HARVESTED } from "../../prisma/data/harvested";
import {
  FAMILIAR, FAMILIAR_HEADINGS, SOUND_LETTERS, SPEAKER_CASE_NAMES, SPEAKER_ENDINGS, SPEAKER_LEMMAS,
  SPEAKER_SECTIONS, TYPED_LETTERS, UKRAINIAN_PAGE_LEMMAS, caseNameFor, endingFor, speakerLines,
} from "./ukrainian";
import { PRACTICE_MODES } from "../ux/modes";
import { translated } from "../copy/locale";

/**
 * The page for Ukrainian speakers names Estonian words, and every one of them
 * is a request against the shipped dictionary rather than a word somebody
 * typed (ADR-005). Hermetic: it reads the two files `npm run db:seed` loads.
 */
interface SeedEntry { lemma: string; pos: string; translation: string }
const EXPANDED: SeedEntry[] = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8"));

/** Every English gloss the dictionary holds for a lemma, from both halves of the seed. */
function glossesOf(lemma: string): string[] {
  return [
    ...EXPANDED.filter((e) => e.lemma === lemma).map((e) => e.translation),
    ...HARVESTED.filter((w) => w.lemma === lemma).map((w) => w.gloss),
  ];
}

describe("the page for Ukrainian speakers", () => {
  it("names only words the shipped dictionary holds", () => {
    expect(UKRAINIAN_PAGE_LEMMAS.length).toBeGreaterThanOrEqual(15);
    const missing = UKRAINIAN_PAGE_LEMMAS.filter((lemma) => glossesOf(lemma).length === 0);
    expect(missing).toEqual([]);
  });

  it("claims for each familiar word only the meaning its dictionary gloss carries", () => {
    expect(FAMILIAR.length).toBeGreaterThanOrEqual(8);
    expect(FAMILIAR.length).toBeLessThanOrEqual(14);
    const wrong = FAMILIAR.filter((w) =>
      !glossesOf(w.lemma).some((g) => g.toLowerCase().includes(w.meaning.toLowerCase())));
    expect(wrong.map((w) => w.lemma)).toEqual([]);
  });

  it("holds the misleading half to the sense it warns about", () => {
    const misleading = FAMILIAR.filter((w) => w.kind === "misleading");
    expect(misleading.length).toBeGreaterThanOrEqual(3);
    // A false friend is worth a line only where the dictionary agrees the word
    // means the other thing, which the test above already asks; and it says
    // what it is not, which is the half a learner came for.
    for (const w of misleading) expect(w.note, w.lemma).toMatch(/«[^»]+»/);
  });

  it("makes no claim about where a word came from beyond the textbook two", () => {
    for (const w of FAMILIAR) {
      if (!w.note || !/came into Estonian/.test(w.note)) continue;
      expect(w.note, w.lemma).toMatch(/came into Estonian from (German|a Slavic language)\./);
    }
  });

  it("writes the Ukrainian in Cyrillic and nothing Russian", () => {
    for (const w of FAMILIAR) {
      expect(w.uk, w.lemma).toMatch(/^[Ѐ-ӿ' ]+$/);
      expect(w.uk, w.lemma).not.toMatch(/[ыэъё]/);
    }
  });

  it("holds no Estonian letter in any line of prose", () => {
    const lines = speakerLines();
    expect(lines.length).toBeGreaterThan(30);
    for (const line of lines) expect(line, line).not.toMatch(/[õäöüšž]/i);
  });

  it("names every slot a line uses, and fills it", () => {
    const fillable = new Set([
      ...Object.keys(SPEAKER_LEMMAS), ...Object.keys(SPEAKER_ENDINGS),
      ...Object.keys(SPEAKER_CASE_NAMES), ...Object.keys(TYPED_LETTERS),
    ]);
    for (const line of speakerLines()) {
      for (const [, slot] of line.matchAll(/\{(\w+)\}/g)) expect(fillable.has(slot!), `${slot} in "${line}"`).toBe(true);
    }
    for (const slot of Object.keys(SPEAKER_ENDINGS)) expect(endingFor(slot), slot).toMatch(/^-[a-z]+$/);
    for (const slot of Object.keys(SPEAKER_CASE_NAMES)) expect(caseNameFor(slot), slot).toBeTruthy();
  });

  it("sends every sound point to a round that exists", () => {
    const sounds = SPEAKER_SECTIONS.find((s) => s.id === "sounds")!;
    expect(sounds.points.length).toBeGreaterThanOrEqual(6);
    for (const point of sounds.points) {
      expect(point.drill, point.text).toBeTruthy();
      expect(PRACTICE_MODES.some((m) => m.href === point.drill), point.drill).toBe(true);
    }
    const lettered = sounds.points.filter((p) => p.letter).map((p) => SOUND_LETTERS[p.letter!]);
    expect(lettered).toEqual(Object.values(TYPED_LETTERS));
  });

  it("is translated into Ukrainian, line by line", () => {
    const lines = [
      ...speakerLines(),
      "Estonian for Ukrainian speakers",
      "What your Ukrainian already gives you, and where it leads you astray.",
      "Practise it: {round}",
      "In the dictionary: {gloss}",
    ];
    expect(lines.filter((line) => !translated("uk", line))).toEqual([]);
  });

  it("keeps every line to something a reader will finish", () => {
    for (const section of SPEAKER_SECTIONS) {
      expect(section.lead.length, section.id).toBeLessThanOrEqual(130);
      for (const point of section.points) expect(point.text.split(/\s+/).length, point.text).toBeLessThanOrEqual(36);
    }
    expect(Object.keys(FAMILIAR_HEADINGS)).toEqual(["familiar", "misleading"]);
  });
});
