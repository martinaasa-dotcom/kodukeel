import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NATIVE_CLIPS, nativeClip, nativeFor, nativeUrl, utteranceKey } from "./native";
import { decodeWav } from "./wav";

const DIR = path.resolve(__dirname, "../../public/audio/native");

describe("the native recordings", () => {
  it("has a file for every clip in the catalog, and no file the catalog does not name", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".wav")).map((f) => f.slice(0, -4)).sort();
    const ids = NATIVE_CLIPS.map((c) => c.id).sort();
    expect(files).toEqual(ids);
    expect(ids.length).toBeGreaterThan(100);
  });

  it("names every clip once", () => {
    const ids = NATIVE_CLIPS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is trimmed and leveled like every synthetic clip: a short lead, a real word, under the ceiling", () => {
    let measured = 0;
    for (const clip of NATIVE_CLIPS) {
      const pcm = decodeWav(new Uint8Array(readFileSync(path.join(DIR, `${clip.id}.wav`))));
      const seconds = pcm.samples.length / pcm.rate;
      expect(seconds, clip.id).toBeGreaterThan(0.45);
      expect(seconds, clip.id).toBeLessThan(7);
      let peak = 0;
      for (const v of pcm.samples) peak = Math.max(peak, Math.abs(v));
      expect(peak, clip.id).toBeGreaterThan(0.08);
      expect(peak, clip.id).toBeLessThanOrEqual(0.9);
      measured++;
    }
    expect(measured).toBe(NATIVE_CLIPS.length);
  });

  it("answers a spelling however it is written on a card", () => {
    expect(nativeFor("Aitäh!")?.id).toBe("word-aitaeh");
    expect(nativeFor("  tere   HOMMIKUST ")?.id).toBe("word-tere-hommikust");
    expect(nativeFor("Vabandust, ma ei saa aru. Palun korrake.")?.kind).toBe("line");
    expect(nativeFor("kaheksa")?.kind).toBe("number");
    expect(nativeFor("juuni")?.kind).toBe("month");
  });

  it("gives the slow take where one was recorded, and the take at speed where not", () => {
    expect(nativeFor("aitäh", { slow: true })?.id).toBe("word-aitaeh-slow");
    expect(nativeFor("Palun", { slow: true })?.id).toBe("word-palun");
    expect(nativeFor("aitäh")?.slow).toBeFalsy();
  });

  it("never looks up a bare sound or a letter's name by its spelling, nor a spelling said two ways", () => {
    expect(nativeFor("ä")).toBeNull();
    expect(nativeFor("mm")).toBeNull();
    expect(nativeFor("A")).toBeNull();
    expect(nativeFor("linna")).toBeNull();
    expect(nativeFor("")).toBeNull();
    expect(nativeFor("koer")).toBeNull();
  });

  it("never answers a spelling that hides two words for either of them", () => {
    for (const spelling of ["palk", "tall", "hall", "vill", "konna", "saada", "Saada!", "kanna"]) {
      expect(nativeFor(spelling), spelling).toBeNull();
    }
  });

  it("answers the words of lessons 3 to 13 in the speaker's own voice", () => {
    expect(nativeFor("Kus sa elad?")?.id).toBe("line-kus-sa-elad");
    expect(nativeFor("ma")?.id).toBe("word-ma");
    expect(nativeFor("kas")?.id).toBe("word-kas");
    expect(nativeFor("Ma olen pärit Inglismaalt. Aga ma elan Eestis.")?.id).toBe("line-ma-olen-paerit-inglismaalt-aga-ma-elan-eestis");
    expect(nativeFor("Ma räägin inglise keelt ja natuke eesti keelt.")?.id).toBe("line-ma-raeaegin-inglise-keelt-ja-natuke-eesti-keelt");
  });

  it("holds no line a woman says in a conversation, because the voice is a man's", () => {
    for (const line of ["Tere! Minu nimi on Mari. Mis su nimi on?", "Mina olen Mari. Ja sina?", "See on telefon.", "Head aega, Tom!", "Tere, Tom! Kuidas läheb?"]) {
      expect(nativeFor(line), line).toBeNull();
    }
    for (const clip of NATIVE_CLIPS) expect(clip.text, clip.id).not.toMatch(/\b(Mari|Liis)\b.*\b(olen|nimi)\b|\bolen (Mari|Liis)\b/);
  });

  it("refuses an id it does not hold, and builds a url that names the cut", () => {
    expect(() => nativeClip("sound-qq")).toThrow();
    expect(nativeUrl("sound-ae")).toMatch(/^\/audio\/native\/sound-ae\.wav\?v=\d+$/);
    expect(existsSync(path.join(DIR, "sound-ae.wav"))).toBe(true);
  });

  it("folds case, punctuation and spacing, and nothing else", () => {
    expect(utteranceKey("Selge! Aitäh!")).toBe("selge aitäh");
    expect(utteranceKey("Kas te räägite inglise keelt?")).toBe("kas te räägite inglise keelt");
    expect(utteranceKey("õhtust")).not.toBe(utteranceKey("ohtust"));
  });
});
