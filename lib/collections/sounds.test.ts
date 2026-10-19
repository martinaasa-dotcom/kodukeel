import { describe, expect, it } from "vitest";
import { NATIVE_CLIPS, nativeClip } from "@/lib/audio/native";
import { ALPHABET, CONSONANTS, LENGTH, MIX_UPS, SOFT_ALIKE, SOFT_BESIDE, SOFT_MORE, STRESS, VOWELS, VOWEL_PAIRS, VOWEL_WORDS, soundsPageClips } from "./sounds";
import { LESSONS } from "@/lib/course/lessons";

describe("the sounds page", () => {
  it("plays only recordings the catalog holds", () => {
    const clips = soundsPageClips();
    expect(clips.length).toBeGreaterThan(70);
    for (const id of clips) expect(() => nativeClip(id), id).not.toThrow();
  });

  it("shows on a key the very sound its recording holds", () => {
    for (const s of [...VOWELS, ...CONSONANTS]) {
      expect(nativeClip(s.clip).kind, s.clip).toBe("sound");
      expect(nativeClip(s.clip).text, s.clip).toBe(s.glyph);
    }
  });

  it("splits a word into syllables that spell the word it plays", () => {
    for (const s of STRESS) {
      expect(s.syllables.join(""), s.clip).toBe(nativeClip(s.clip).text.toLocaleLowerCase("et"));
      expect(s.syllables.length, s.clip).toBeGreaterThan(1);
    }
  });

  it("highlights letters each word actually has", () => {
    const words = [
      ...VOWEL_WORDS.flatMap((g) => g.words), ...VOWEL_PAIRS.flatMap((s) => s.words), ...SOFT_ALIKE.flatMap((s) => s.words),
      ...SOFT_BESIDE.flatMap((s) => s.words), ...SOFT_MORE.flatMap((s) => s.words), ...LENGTH.flatMap((s) => s.words), ...MIX_UPS.flatMap((s) => s.words),
    ];
    let marked = 0;
    for (const w of words) {
      if (!w.mark) continue;
      expect(nativeClip(w.clip).text.toLocaleLowerCase("et"), w.clip).toContain(w.mark);
      marked++;
    }
    expect(marked).toBeGreaterThan(60);
  });

  it("puts a plain word beside a soft one in every soft pair, and the alike pairs really are spelled alike", () => {
    for (const set of [...SOFT_ALIKE, ...SOFT_BESIDE]) {
      expect(set.words.map((w) => w.tag), set.words[0]!.clip).toEqual(["plain", "soft"]);
    }
    for (const set of SOFT_ALIKE) {
      const [plain, soft] = set.words.map((w) => nativeClip(w.clip));
      expect(plain!.text, plain!.id).toBe(soft!.text);
      expect(plain!.id).not.toBe(soft!.id);
    }
    expect(SOFT_ALIKE.length + SOFT_BESIDE.length).toBe(10);
    for (const set of SOFT_MORE) expect(set.words.every((w) => w.tag === "soft"), set.words[0]!.clip).toBe(true);
  });

  it("sets vowel pairs one vowel apart", () => {
    for (const set of VOWEL_PAIRS) {
      const [a, b] = set.words.map((w) => nativeClip(w.clip).text);
      expect(a!.length, a).toBe(b!.length);
      const differ = [...a!].filter((ch, i) => ch !== b![i]).length;
      expect(differ, `${a} ${b}`).toBeGreaterThan(0);
      expect(differ, `${a} ${b}`).toBeLessThanOrEqual(2);
    }
  });

  it("has every letter of the alphabet once, each with its own name recorded", () => {
    expect(ALPHABET).toHaveLength(32);
    expect(new Set(ALPHABET.map((a) => a.letter)).size).toBe(32);
    for (const a of ALPHABET) expect(nativeClip(a.clip).text, a.clip).toBe(a.letter);
    expect(ALPHABET.filter((a) => a.loanword).map((a) => a.letter).join("")).toBe("CFQŠZŽWXY");
  });

  it("leaves no recording unheard anywhere: every clip is on this page, in a lesson, or answers a speaker button", () => {
    const onPage = new Set(soundsPageClips());
    const inLessons = new Set(LESSONS.flatMap((l) => [
      ...(l.how.sounds ?? []).flatMap((r) => [r.sound, r.word]),
      ...(l.how.listen ?? []).flatMap((s) => s.words.map((w) => w.clip)),
    ]));
    const lookedUp = new Set(["word", "month", "number", "line", "stress", "pair", "soft", "length"]);
    const unheard = NATIVE_CLIPS.filter((c) => !onPage.has(c.id) && !inLessons.has(c.id) && !lookedUp.has(c.kind));
    expect(unheard.map((c) => c.id)).toEqual([]);
  });
});
