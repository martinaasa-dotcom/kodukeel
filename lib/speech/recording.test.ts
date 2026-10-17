import { describe, expect, it } from "vitest";
import type { Decoding, RawTurn, TranscribedPiece } from "./engine";
import { core, reconcile } from "./reconcile";
import { SPEECH_SETTINGS as S } from "./settings";
import {
  MAX_RECORDING_SECONDS, WORDS_WRONG_QUIET, WORDS_WRONG_NOISY, clock, doubtfulTokens, isOggOpus, looksLikeAudio,
  mono, oneIn, sliceOf, transcriptLines,
} from "./recording";

function decoding(text: string): Decoding {
  return { text, tokens: [], timestamps: [], logProbs: [] };
}
function piece(greedy: string, from: number, to: number, beam = greedy): TranscribedPiece {
  const turn: RawTurn = { greedy: decoding(greedy), beam: decoding(beam), seconds: to - from };
  return { turn, from, to };
}

describe("a recording becomes a transcript one line per piece", () => {
  it("keeps the pieces in order with where each one was, and leaves out a piece nothing was heard in", () => {
    const { lines, cut } = transcriptLines(
      [piece("Ta on klassis rõõmus", 0, 2.1), piece("", 2.1, 2.6), piece("ee", 2.6, 3), piece("Palun lugege kodus", 3, 5.4)],
      { maxChars: 4000 },
    );
    expect(cut).toBe(false);
    expect(lines.map((l) => l.hearing.understood)).toEqual(["Ta on klassis rõõmus", "Palun lugege kodus"]);
    expect(lines.map((l) => [l.from, l.to])).toEqual([[0, 2.1], [3, 5.4]]);
  });

  it("makes no repair, since nobody knows what a stranger's message could hold", () => {
    const heard = transcriptLines([piece("ta luges raamatud", 0, 2)], { maxChars: 4000, known: () => false }).lines[0]!;
    expect(heard.hearing.repairs).toEqual([]);
    expect(heard.hearing.understood).toBe("ta luges raamatud");
  });

  it("marks a word the forms list does not hold, and one the two readings heard differently", () => {
    const known = (w: string) => w !== "raamatud";
    const [line] = transcriptLines([piece("ta luges raamatud täna", 0, 2, "ta luges raamatut täna")], { maxChars: 4000, known }).lines;
    expect(line!.hearing.words.filter((w) => w.unsure).map((w) => w.text)).toEqual(["raamatud"]);
    const [other] = transcriptLines([piece("ta luges raamatut täna", 0, 2, "ta loeb raamatut täna")], { maxChars: 4000, known: () => true }).lines;
    expect(other!.hearing.words.filter((w) => w.unsure).map((w) => w.text)).toEqual(["luges"]);
  });

  it("stops at the reading page's limit with whole lines only, and says it stopped", () => {
    const long = Array.from({ length: 10 }, (_, i) => piece("sõna ".repeat(20).trim(), i * 5, i * 5 + 5));
    const { lines, cut } = transcriptLines(long, { maxChars: 500 });
    expect(cut).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThan(10);
    const used = lines.reduce((n, l) => n + l.hearing.understood.length + 2, 0);
    expect(used).toBeLessThanOrEqual(500);
  });
});

describe("the dotted word and the doubtful word are told apart on a glossed line", () => {
  it("finds the unsure words among the glossed tokens, walking the two together", () => {
    const hearing = reconcile({ greedy: decoding("Ta on klassis rõõmus"), beam: decoding("Ta on klassis rõõmsalt"), seconds: 2 }, { known: () => true });
    const tokens = [
      { text: "Ta", word: true }, { text: " ", word: false }, { text: "on", word: true }, { text: " ", word: false },
      { text: "klassis", word: true }, { text: " ", word: false }, { text: "rõõmus", word: true },
    ];
    expect([...doubtfulTokens(tokens, hearing.words)]).toEqual([6]);
  });

  it("does not shift every mark after a word the two split differently", () => {
    const hearing = reconcile({ greedy: decoding("kell 5 on hilja"), beam: decoding("kell viis on hilja"), seconds: 2 }, { known: () => true });
    const tokens = [
      { text: "kell", word: true }, { text: " ", word: false }, { text: "5", word: true }, { text: " ", word: false },
      { text: "on", word: true }, { text: " ", word: false }, { text: "hilja", word: true },
    ];
    expect([...doubtfulTokens(tokens, hearing.words)]).toEqual([2]);
    expect(hearing.words.filter((w) => w.unsure).map((w) => core(w.text))).toEqual(["5"]);
  });
});

describe("the sound of a line, and the file it came from", () => {
  it("cuts a line's sound out of the recording at its own seconds", () => {
    const samples = Float32Array.from({ length: 100 }, (_, i) => i);
    expect([...sliceOf(samples, 10, { from: 2, to: 4 })]).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]);
    expect(sliceOf(samples, 10, { from: 9, to: 20 }).length).toBe(10);
  });

  it("mixes two channels into one", () => {
    expect([...mono([Float32Array.from([1, 0, 1]), Float32Array.from([0, 0, 1])])]).toEqual([0.5, 0, 1]);
    const one = Float32Array.from([0.2]);
    expect(mono([one])).toBe(one);
  });

  it("knows the Ogg voice note Safari opens only partly, by name or by type", () => {
    expect(isOggOpus("PTT-20261016-WA0003.opus", "")).toBe(true);
    expect(isOggOpus("voice.ogg", "audio/ogg")).toBe(true);
    expect(isOggOpus("memo.m4a", "audio/mp4")).toBe(false);
  });

  it("takes the sound files a messaging app saves, and nothing else", () => {
    for (const [name, type] of [["a.mp3", "audio/mpeg"], ["a.m4a", ""], ["a.opus", ""], ["a.wav", "audio/wav"], ["a.webm", "video/webm"]] as const) {
      expect(looksLikeAudio(name, type), name).toBe(true);
    }
    expect(looksLikeAudio("letter.pdf", "application/pdf")).toBe(false);
    expect(looksLikeAudio("photo.jpg", "image/jpeg")).toBe(false);
  });

  it("writes a length the way a voice message shows one", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(67.4)).toBe("1:07");
    expect(clock(180)).toBe("3:00");
  });
});

describe("what the page says about it is the measurement", () => {
  it("caps a recording at the setting, three minutes", () => {
    expect(MAX_RECORDING_SECONDS).toBe(S.maxFileSeconds);
    expect(MAX_RECORDING_SECONDS).toBe(180);
  });

  it("says one word in twelve, from the quiet figure measured in section 0", () => {
    expect(WORDS_WRONG_QUIET).toBeCloseTo(0.083);
    expect(WORDS_WRONG_NOISY).toBeGreaterThan(WORDS_WRONG_QUIET);
    expect(oneIn(WORDS_WRONG_QUIET)).toBe(12);
  });
});
