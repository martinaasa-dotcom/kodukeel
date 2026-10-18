import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { ASR_MODEL } from "./model";
import { decide, type Golden } from "./golden";

/*
  The golden file (VB-3): the turns the web engine returned for each fixture
  clip, and what the pure layer decided from them. Run again over the same
  turns, the rules have to decide the same, word for word. A deliberate change
  to the hearing rules re-records the file with `npm run asr:golden`, in the
  same pull request, where a reviewer sees the difference.
*/
const golden = JSON.parse(readFileSync("lib/speech/fixtures/golden.json", "utf8")) as Golden;

describe("the golden file", () => {
  it("was recorded against the model this app pins", () => {
    expect(golden.model).toBe(`${ASR_MODEL.repo}@${ASR_MODEL.revision}`);
  });

  it("holds every fixture clip, each heard", () => {
    // Read off the directory rather than typed: a clip a suite plays and the file leaves out is a clip no native engine is checked on.
    const wavs = ["public/asr/check.wav", ...readdirSync("scripts/fixtures/speech").filter((f) => f.endsWith(".wav")).map((f) => `scripts/fixtures/speech/${f}`)];
    expect([...golden.clips.map((c) => c.file)].sort()).toEqual(wavs.sort());
    for (const clip of golden.clips) expect(clip.expect.understood, clip.file).not.toBe("");
  });

  it("was recorded off the bytes the fixtures hold now", () => {
    for (const clip of golden.clips) {
      expect(clip.sha256, clip.file).toBe(createHash("sha256").update(readFileSync(clip.file)).digest("hex"));
    }
  });

  for (const clip of golden.clips) {
    it(`decides ${clip.file} as it did when it was recorded`, () => {
      expect(decide(clip.turns, clip.says)).toEqual(clip.expect);
    });
  }

  it("grades each phrase clip up against its own text, and lights the pick it says", () => {
    const of = (file: string) => golden.clips.find((c) => c.file === file)!.expect;
    const phrases = ["public/asr/check.wav", "scripts/fixtures/speech/tere.wav", "scripts/fixtures/speech/aitah.wav", "scripts/fixtures/speech/kuidas-laheb.wav"];
    for (const file of phrases) expect(of(file).verdict, file).toEqual({ kind: "good" });
    expect(phrases.map((file) => of(file).pick)).toEqual([null, 0, 1, 2]);
  });
});
