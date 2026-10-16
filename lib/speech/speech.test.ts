import { describe, expect, it } from "vitest";
import { ASR_CACHE, ASR_MODEL, megabytes, modelBytes, modelFileUrl } from "./model";
import { SPEECH_SETTINGS as S } from "./settings";
import { resample, StreamResampler } from "./resample";
import { loudFrames, normalize, pad, peakOf, prepareTurn, squeezePauses } from "./prepare";
import { core, reconcile, type Hearing } from "./reconcile";
import { cardVerdict, saidIt } from "./verdict";
import type { Decoding, RawTurn } from "./engine";

const RATE = 16_000;

function tone(seconds: number, hz = 220, amp = 0.5, rate = RATE): Float32Array {
  const out = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / rate);
  return out;
}
function silence(seconds: number, rate = RATE): Float32Array {
  return new Float32Array(Math.round(seconds * rate));
}
function join(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
function decoding(text: string): Decoding {
  return { text, tokens: [], timestamps: [], logProbs: [] };
}
function turn(greedy: string, beam = greedy): RawTurn {
  return { greedy: decoding(greedy), beam: decoding(beam), seconds: 1 };
}

describe("the settings are the ones that were measured", () => {
  it("holds every value to the figure in docs/39-speech.md", () => {
    expect(S.sampleRate).toBe(16_000);
    expect(S.leadSeconds).toBe(0.5);
    expect(S.tailSeconds).toBe(0.8);
    expect(S.pauseOverSeconds).toBe(0.25);
    expect(S.pauseToSeconds).toBe(0.15);
    expect(S.pauseFloorDb).toBe(-40);
    expect(S.keepAfterWordSeconds).toBe(0.15);
    expect(S.decoding).toBe("greedy_search");
    expect(S.beamPaths).toBe(8);
    expect(S.hotwords).toBe(false);
    expect(S.unsurePrecision).toBeCloseTo(0.832);
    expect(S.unsureRecall).toBeCloseTo(0.65);
    expect(S.waitForSpeechSeconds).toBe(8);
    expect(S.maxFileSeconds).toBe(180);
    expect(S.releaseAfterMs).toBe(120_000);
  });

  it("never cuts closer to a word than the pause it leaves", () => {
    expect(S.pauseToSeconds).toBeGreaterThanOrEqual(S.keepAfterWordSeconds);
  });
});

describe("the model is pinned to the byte", () => {
  it("names four files, each with a hash of the right shape", () => {
    expect(ASR_MODEL.files.map((f) => f.name)).toEqual(["encoder.int8.onnx", "decoder.int8.onnx", "joiner.int8.onnx", "tokens.txt"]);
    for (const file of ASR_MODEL.files) {
      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(file.bytes).toBeGreaterThan(0);
    }
    expect(ASR_MODEL.revision).toMatch(/^[0-9a-f]{40}$/);
  });

  it("says its size in the megabytes a phone counts", () => {
    expect(modelBytes()).toBe(71_433_378);
    expect(megabytes(modelBytes())).toBe(71);
  });

  it("derives its cache name from the hashes", () => {
    expect(ASR_CACHE).toMatch(/^kodukeel-asr-[0-9a-f]{12}$/);
  });

  it("puts a file under its revision, whatever the base's trailing slash", () => {
    const file = ASR_MODEL.files[3]!;
    expect(modelFileUrl("/asr/model", file)).toBe(`/asr/model/${ASR_MODEL.revision}/tokens.txt`);
    expect(modelFileUrl("https://x.example/models/", file)).toBe(`https://x.example/models/${ASR_MODEL.revision}/tokens.txt`);
  });
});

describe("resampling to the model's rate", () => {
  it("keeps a speech-band tone and its length", () => {
    const input = tone(1, 440, 0.5, 48_000);
    const out = resample(input, 48_000, 16_000);
    expect(out.length).toBe(16_000);
    // The middle of the tone keeps its level.
    const middle = out.subarray(4000, 12000);
    expect(peakOf(middle)).toBeGreaterThan(0.45);
    expect(peakOf(middle)).toBeLessThan(0.55);
  });

  it("takes out what is above the new Nyquist frequency instead of folding it back", () => {
    const input = tone(1, 12_000, 0.5, 48_000);
    const out = resample(input, 48_000, 16_000);
    expect(peakOf(out.subarray(2000, 14000))).toBeLessThan(0.02);
  });

  it("gives the same samples fed in pieces as fed whole, which is what streaming needs", () => {
    const input = join(tone(0.3, 300, 0.4, 44_100), tone(0.3, 900, 0.3, 44_100));
    const whole = resample(input, 44_100, 16_000);
    const stream = new StreamResampler(44_100, 16_000);
    const pieces: Float32Array[] = [];
    for (let at = 0; at < input.length; at += 128) pieces.push(stream.push(input.subarray(at, at + 128)));
    pieces.push(stream.flush());
    const streamed = join(...pieces).subarray(0, whole.length);
    let worst = 0;
    for (let i = 0; i < whole.length; i++) worst = Math.max(worst, Math.abs(whole[i]! - streamed[i]!));
    expect(worst).toBeLessThan(1e-6);
  });

  it("passes audio already at the rate through untouched", () => {
    const input = tone(0.1);
    expect(Array.from(resample(input, RATE, RATE))).toEqual(Array.from(input));
  });
});

describe("preparing a finished turn", () => {
  it("raises a quiet recording and leaves a loud one alone", () => {
    expect(peakOf(normalize(tone(0.2, 220, 0.1)))).toBeCloseTo(S.normalizePeak, 2);
    const loud = tone(0.2, 220, 0.7);
    expect(normalize(loud)).toBe(loud);
  });

  it("squeezes a long pause to the measured length and leaves a short one", () => {
    const words = join(tone(0.4), silence(1.0), tone(0.4), silence(0.2), tone(0.4));
    const out = squeezePauses(words);
    // 1.0 s cut to 0.15 s; the 0.2 s pause is under the 0.25 s line and stays;
    // the clip ends on the word, so there is no tail to keep.
    const expected = 0.4 + S.pauseToSeconds + 0.4 + 0.2 + 0.4;
    expect(out.length / RATE).toBeGreaterThan(expected - 0.05);
    expect(out.length / RATE).toBeLessThan(expected + 0.05);
  });

  it("reads a pause against the clip's own loudest frame, so a quiet microphone squeezes the same pauses", () => {
    const loud = join(tone(0.4, 220, 0.8), silence(1), tone(0.4, 220, 0.8));
    const quiet = join(tone(0.4, 220, 0.01), silence(1), tone(0.4, 220, 0.01));
    expect(squeezePauses(quiet).length).toBe(squeezePauses(loud).length);
  });

  it("keeps the tail of a word, never cutting into it", () => {
    const frames = loudFrames(join(tone(0.3), silence(0.5)));
    expect(frames.filter(Boolean).length).toBeGreaterThan(25);
    const out = squeezePauses(join(tone(0.3), silence(0.5)));
    expect(out.length / RATE).toBeCloseTo(0.3 + S.keepAfterWordSeconds, 1);
  });

  it("puts exactly the measured silence in front and behind", () => {
    const padded = pad(tone(0.3));
    expect(padded.length).toBe(Math.round(RATE * (0.3 + S.leadSeconds + S.tailSeconds)));
    expect(padded[Math.round(RATE * S.leadSeconds) - 1]).toBe(0);
  });

  it("makes nothing of nothing", () => {
    expect(squeezePauses(silence(1)).length).toBe(0);
    expect(prepareTurn(silence(1)).length).toBe(Math.round(RATE * (S.leadSeconds + S.tailSeconds)));
  });
});

describe("what was heard and what it is read as", () => {
  const knownForms = new Set(["tere", "ma", "lähen", "poodi", "piima", "ostma", "kirjutas", "retsepti", "kool", "kooli"]);
  const known = (w: string) => knownForms.has(w);

  it("keeps a word the forms list holds exactly as heard, even where something else was expected", () => {
    const hearing = reconcile(turn("Ma lähen kooli"), { known, expect: new Set(["kool", "poodi"]) });
    expect(hearing.understood).toBe("Ma lähen kooli");
    expect(hearing.repairs).toEqual([]);
  });

  it("never picks between two real words, which would be deciding what somebody meant", () => {
    // `kool` and `kooli` both exist; a repair only ever replaces a non-word.
    const hearing = reconcile(turn("kooli"), { known, expect: new Set(["kool"]) });
    expect(hearing.understood).toBe("kooli");
    expect(hearing.words[0]!.repaired).toBe(false);
  });

  it("repairs a non-word to the one expected spelling that sounds the same, and marks it", () => {
    const hearing = reconcile(turn("ma lähen podi"), { known, expect: new Set(["poodi", "piima"]) });
    expect(hearing.understood).toBe("ma lähen poodi");
    expect(hearing.heard).toBe("ma lähen podi");
    expect(hearing.words[2]).toMatchObject({ text: "poodi", heard: "podi", repaired: true, unsure: true });
    expect(hearing.repairs).toEqual([{ from: "podi", to: "poodi", rule: "sound" }]);
  });

  it("splits one word heard where two were meant, at the one boundary that works", () => {
    const hearing = reconcile(turn("kirjutusretsepti"), { known, expect: new Set(["kirjutas", "retsepti"]) });
    // `kirjutus` folds to a different key from `kirjutas`, so this is not a split...
    expect(hearing.words[0]!.repaired).toBe(false);
    const heardRight = reconcile(turn("kirjutasretsepti"), { known, expect: new Set(["kirjutas", "retsepti"]) });
    expect(heardRight.understood).toBe("kirjutas retsepti");
    expect(heardRight.repairs[0]!.rule).toBe("boundary");
  });

  it("leaves a non-word alone where two expected spellings sound like it", () => {
    const hearing = reconcile(turn("lina"), { known: () => false, expect: new Set(["linna", "linnna"]) });
    expect(hearing.words[0]!.repaired).toBe(false);
    expect(hearing.words[0]!.unsure).toBe(true);
  });

  it("makes no repair at all where nobody said what could be said", () => {
    const hearing = reconcile(turn("podi"), { known });
    expect(hearing.understood).toBe("podi");
    expect(hearing.words[0]!.unsure).toBe(true);
  });

  it("takes out the marks the model writes for a filled pause, and keeps a real word that looks like one", () => {
    const hearing = reconcile(turn("ee ma e-lähen öö poodi"), { known: () => true });
    expect(hearing.understood).toBe("ma lähen öö poodi");
    expect(hearing.repairs.map((r) => r.rule)).toEqual(["hesitation", "hesitation"]);
  });

  it("marks a word the two decodings disagree on, and only that one", () => {
    const hearing = reconcile(turn("Tere ma lähen poodi", "tere! Ma lähen pood"), { known });
    expect(hearing.words.map((w) => w.unsure)).toEqual([false, false, false, true]);
  });

  it("says nothing unsure about the forms list where it could not be asked", () => {
    const hearing = reconcile(turn("poodi"), { known: () => undefined });
    expect(hearing.words[0]).toMatchObject({ known: null, unsure: false });
  });

  it("compares words without their capital or punctuation and keeps diacritics as spelling", () => {
    expect(core("Tere!")).toBe("tere");
    expect(core("«Õun,»")).toBe("õun");
    expect(core("oun")).not.toBe(core("õun"));
  });
});

describe("the verdict only ever grades up", () => {
  const known = () => true;
  const hear = (greedy: string, beam = greedy): Hearing => reconcile(turn(greedy, beam), { known });

  it("is Good when the card's answer is heard exactly as spelled", () => {
    expect(cardVerdict(hear("poodi"), ["poodi"])).toEqual({ kind: "good" });
    expect(cardVerdict(hear("Tere hommikust!"), ["tere hommikust"])).toEqual({ kind: "good" });
  });

  it("accepts any spelling the marker takes", () => {
    expect(cardVerdict(hear("toasse"), ["tuppa", "toasse"])).toEqual({ kind: "good" });
  });

  it("fills the box, never grades down, when something else was heard", () => {
    expect(cardVerdict(hear("pood"), ["poodi"])).toEqual({ kind: "fill", text: "pood" });
  });

  it("fills the box when the two readings disagreed, even on the right word", () => {
    expect(cardVerdict(hear("poodi", "pood"), ["poodi"])).toEqual({ kind: "fill", text: "poodi" });
  });

  it("never grades a word the dictionary repaired (D13)", () => {
    const repaired = reconcile(turn("podi"), { known: (w) => w === "poodi", expect: new Set(["poodi"]) });
    expect(repaired.understood).toBe("poodi");
    expect(cardVerdict(repaired, ["poodi"])).toEqual({ kind: "fill", text: "poodi" });
  });

  it("has nothing to fill for nothing said", () => {
    expect(cardVerdict(hear(""), ["poodi"])).toEqual({ kind: "fill", text: "" });
  });

  it("can produce no other outcome", () => {
    const kinds = new Set([hear("x"), hear("poodi"), hear("")].map((h) => cardVerdict(h, ["poodi"]).kind));
    for (const kind of kinds) expect(["good", "fill"]).toContain(kind);
  });
});

describe("the say-it check", () => {
  it("accepts the word with the folds an English ear makes", () => {
    expect(saidIt(turn("linna"), "linna")).toBe(true);
    expect(saidIt(turn("lina"), "linna")).toBe(true);
    expect(saidIt(turn("kapi", "kabi"), "kabi")).toBe(true);
  });

  it("accepts either reading of the same audio", () => {
    expect(saidIt(turn("pood", "poodi"), "poodi")).toBe(true);
  });

  it("does not accept another word", () => {
    expect(saidIt(turn("kool"), "poodi")).toBe(false);
    expect(saidIt(turn(""), "poodi")).toBe(false);
  });
});
