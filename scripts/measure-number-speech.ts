/**
 * Does TartuNLP read each shape of number the way an Estonian says it?
 *
 *   npm run measure:numbers                 every shape, three voices, cached
 *   npm run measure:numbers -- --voices mari,kalev
 *
 * The numbers round plays the right answer by having TartuNLP read the digits
 * (docs/41-fifth-batch.md, D10), and the work order's trip hazard is that the
 * service does not read every shape of them as a person would: `3,50 €` comes
 * back as a decimal read out, with `koma` in it. So before a shape is played
 * this asks, for a sample of every shape and every way of writing its digits:
 *
 *   1. what TartuNLP says for the digits, sent exactly as `/api/tts` sends
 *      them (`spokenText`) and prepared exactly as the route prepares them
 *      (`prepareClip`);
 *   2. what the app's own recognizer hears in that clip, through sherpa-onnx
 *      on the pinned model, in Node, greedy, as the worker decodes;
 *   3. what the round's own reader makes of that (`readAnswer`), and whether
 *      any word in it is not a number, `kell` or `euro`.
 *
 * A shape is played only where every sample comes back as the number it was
 * sent and nothing else: a stray `koma`, or a number read back wrong, is a
 * shape shown and not played. The result is written to
 * `lib/games/fixtures/number-speech.json`, and `numbers.test.ts` holds the
 * round's table (`SPOKEN` in `lib/games/numbers.ts`) to it.
 *
 * What it cannot say is whether the reading is idiomatic beyond being the
 * number with no stray word in it; the file is there for a native reader too.
 *
 * Needs the model (`npm run asr:fetch`) and the network for TartuNLP, which is
 * a free academic service and asks nothing of us, so every clip is cached on
 * disk under `.speech-cache/numbers/` and a re-run sends nothing. No paid
 * model is reached.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { spokenText } from "../lib/audio/say";
import { prepareClip } from "../lib/audio/wav";
import { readWav } from "../lib/speech/wav";
import { resample } from "../lib/speech/resample";
import { ASR_MODEL, LOCAL_MODEL_BASE } from "../lib/speech/model";
import { SPEECH_SETTINGS as S } from "../lib/speech/settings";
import { EURO_LEMMA, readAnswer, shapeOf, shown, type NumberItem, type NumberShape } from "../lib/games/numbers";
import { CLOCK_LEMMA, spokenNumbers } from "../lib/scenes/props";

const TTS = "https://api.tartunlp.ai/text-to-speech/v2";
const CACHE = ".speech-cache/numbers";
const OUT = "lib/games/fixtures/number-speech.json";

const arg = (name: string, fallback: string): string => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const VOICES = arg("voices", "mari,tambet,kalev").split(",");
/** Seconds of silence after the clip, so the last word is decoded. */
const PAD = Number(arg("pad", "0.8"));

/** A sample of every shape the round deals. */
const SAMPLES: readonly NumberItem[] = [
  ...[3, 7, 11, 12, 15, 19].map((n) => ({ kind: "count", n }) as const),
  ...[20, 25, 37, 48, 62, 99].map((n) => ({ kind: "count", n }) as const),
  ...[100, 115, 230, 325, 507, 999].map((n) => ({ kind: "count", n }) as const),
  ...[[8, 0], [14, 0], [20, 0], [9, 30], [13, 30], [19, 30], [8, 15], [14, 15], [16, 45], [11, 45]].map(
    ([hour, minute]) => ({ kind: "clock", hour: hour!, minute: minute!, face: "digital" }) as const,
  ),
  ...[[3, 0], [12, 0], [2, 30], [3, 15], [10, 45]].map(
    ([hour, minute]) => ({ kind: "clock", hour: hour!, minute: minute!, face: "analog" }) as const,
  ),
  ...[2, 12, 25, 80].map((euros) => ({ kind: "price", cents: euros * 100 }) as const),
  ...[350, 290, 1240, 4510, 7980].map((cents) => ({ kind: "price", cents }) as const),
];

/** Every way of writing an item's digits worth trying. Digits and symbols only (D10). */
function notations(item: NumberItem): string[] {
  const text = shown(item);
  switch (item.kind) {
    case "count":
      return [text];
    case "clock": {
      const unpadded = text.replace(/^0/, "");
      return [...new Set([text, text.replace(":", "."), unpadded, ...(item.minute === 0 ? [String(item.hour)] : [])])];
    }
    case "price": {
      const euros = Math.floor(item.cents / 100);
      const cents = item.cents % 100;
      if (cents === 0) return [text, `${euros}`];
      return [text, text.replace(",", "."), `${euros} € ${String(cents).padStart(2, "0")}`];
    }
  }
}

/** What counts as said in a reading of a number: number words, `kell`, `euro`, and nothing else. */
function strayWords(heard: string): string[] {
  return heard
    .toLocaleLowerCase("et")
    .split(/[^a-zõäöüšž0-9]+/)
    .filter(Boolean)
    // A number word is one the scenes' own reader reads as a number, so this names none.
    .filter((word) => !/^\d+$/.test(word) && spokenNumbers(word).length !== 1 && word !== CLOCK_LEMMA && !word.startsWith(EURO_LEMMA));
}

async function speak(text: string, voice: string): Promise<Uint8Array> {
  const sent = spokenText(text);
  const key = createHash("sha256").update(`${voice}\n${sent}`).digest("hex").slice(0, 24);
  const path = join(CACHE, `${key}.wav`);
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  const response = await fetch(TTS, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: sent, speaker: voice }),
  });
  if (!response.ok) throw new Error(`TartuNLP answered ${response.status} for ${sent}`);
  const clip = prepareClip(new Uint8Array(await response.arrayBuffer()));
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, clip);
  return clip;
}

interface Recognizer {
  createStream(): { acceptWaveform(rate: number, samples: Float32Array): void; inputFinished(): void; free(): void };
  isReady(stream: unknown): boolean;
  decode(stream: unknown): void;
  getResult(stream: unknown): { text: string };
}

function recognizer(): Recognizer {
  const dir = join("public", LOCAL_MODEL_BASE.replace(/^\//, ""), ASR_MODEL.revision);
  if (!existsSync(join(dir, "encoder.int8.onnx"))) throw new Error(`No model in ${dir}. Run npm run asr:fetch first.`);
  const require = createRequire(import.meta.url);
  const sherpa = require("sherpa-onnx") as { createOnlineRecognizer(config: unknown): Recognizer };
  return sherpa.createOnlineRecognizer({
    featConfig: { sampleRate: S.sampleRate, featureDim: 80 },
    modelConfig: {
      transducer: { encoder: join(dir, "encoder.int8.onnx"), decoder: join(dir, "decoder.int8.onnx"), joiner: join(dir, "joiner.int8.onnx") },
      tokens: join(dir, "tokens.txt"),
      numThreads: 1,
      provider: "cpu",
      debug: 0,
    },
    decodingMethod: S.decoding,
    maxActivePaths: S.beamPaths,
    enableEndpoint: 0,
  });
}

/**
 * The quiet after a clip, as a microphone would hand it over.
 *
 * A streaming model looks a little ahead, so the last word needs something
 * after it to be decoded, and digital silence is not what any microphone
 * sends: measured here, the model wrote a word into a stretch of zeros (`ja`,
 * `on`, `tuleb`) on about one clip in six, and with no tail at all it cut the
 * last word off on most of them. Room noise at about -66 dB, seeded so every
 * run hears the same tail, is neither.
 */
function roomTone(length: number): Float32Array {
  const out = new Float32Array(length);
  let seed = 7;
  for (let i = 0; i < length; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out[i] = (seed / 0x1_0000_0000 - 0.5) * 0.001;
  }
  return out;
}

function hear(asr: Recognizer, clip: Uint8Array): string {
  const { samples, rate } = readWav(clip);
  const at16 = resample(samples, rate, S.sampleRate);
  const stream = asr.createStream();
  stream.acceptWaveform(S.sampleRate, at16);
  // The silence a turn ends on, so the last word is decoded.
  stream.acceptWaveform(S.sampleRate, roomTone(Math.round(S.sampleRate * PAD)));
  stream.inputFinished();
  while (asr.isReady(stream)) asr.decode(stream);
  const text = asr.getResult(stream).text.trim();
  stream.free();
  return text;
}

interface Row {
  readonly shape: NumberShape;
  readonly item: NumberItem;
  readonly sent: string;
  readonly voice: string;
  readonly heard: string;
  readonly read: string | null;
  readonly right: boolean;
  readonly stray: readonly string[];
}

async function main(): Promise<void> {
  const asr = recognizer();
  const rows: Row[] = [];
  for (const item of SAMPLES) {
    for (const sent of notations(item)) {
      for (const voice of VOICES) {
        const heard = hear(asr, await speak(sent, voice));
        const read = readAnswer(item, heard);
        const right = read !== null && readAnswer(item, shown(item)) === read;
        rows.push({ shape: shapeOf(item), item, sent, voice, heard, read, right, stray: strayWords(heard) });
      }
    }
  }
  // Per shape and per way of writing it: how many samples came back as the number, with nothing else said.
  const summary = new Map<string, { clean: number; total: number }>();
  for (const row of rows) {
    const style = notationStyle(row.item, row.sent);
    const key = `${row.shape} ${style}`;
    const s = summary.get(key) ?? { clean: 0, total: 0 };
    s.total += 1;
    if (row.right && row.stray.length === 0) s.clean += 1;
    summary.set(key, s);
  }
  for (const [key, s] of [...summary].sort()) console.log(`${key.padEnd(34)} ${s.clean}/${s.total}`);
  for (const row of rows.filter((r) => !r.right || r.stray.length > 0)) {
    console.log(`  ${row.shape} [${row.sent}] ${row.voice}: heard "${row.heard}" read ${row.read}${row.stray.length ? ` stray ${row.stray.join(",")}` : ""}`);
  }
  mkdirSync("lib/games/fixtures", { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    measured: new Date().toISOString().slice(0, 10),
    command: "npm run measure:numbers",
    voices: VOICES,
    model: `${ASR_MODEL.repo}@${ASR_MODEL.revision}`,
    rows: rows.map((row) => ({ ...row, style: notationStyle(row.item, row.sent) })),
  }, null, 1) + "\n");
  console.log(`wrote ${OUT}: ${rows.length} readings`);
}

/** Which way of writing the digits a notation is, named so the round's table can point at one. */
export function notationStyle(item: NumberItem, sent: string): string {
  if (sent === shown(item)) return "shown";
  if (item.kind === "clock") return sent.includes(".") ? "dot" : sent.includes(":") ? "unpadded" : "hour-only";
  if (item.kind === "price") return sent.includes("€ ") ? "euro-then-cents" : sent.includes(".") ? "point" : "bare";
  return "other";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
