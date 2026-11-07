/**
 * READ ALOUD AND HEARD BACK: THE TWO HALVES OF A SPEECH CHECK, SHARED.
 *
 * `npm run measure:numbers` and `npm run measure:endings` both ask the same
 * question of a piece of Estonian: what does TartuNLP say for it, and what
 * does the app's own recognizer hear in that clip? This is the asking. The
 * clip is sent exactly as `/api/tts` sends it (`spokenText`) and prepared
 * exactly as the route prepares it (`prepareClip`), and heard through
 * sherpa-onnx on the pinned model, greedy, as the browser's worker decodes.
 *
 * Every clip is cached on disk under the caller's directory, so a re-run
 * sends nothing to a free academic service. No paid model is reached.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { spokenText } from "../../lib/audio/say";
import { prepareClip } from "../../lib/audio/wav";
import { readWav } from "../../lib/speech/wav";
import { resample } from "../../lib/speech/resample";
import { ASR_MODEL, LOCAL_MODEL_BASE } from "../../lib/speech/model";
import { SPEECH_SETTINGS as S } from "../../lib/speech/settings";

const TTS = "https://api.tartunlp.ai/text-to-speech/v2";

export async function speak(text: string, voice: string, cache: string): Promise<Uint8Array> {
  const sent = spokenText(text);
  const key = createHash("sha256").update(`${voice}\n${sent}`).digest("hex").slice(0, 24);
  const path = join(cache, `${key}.wav`);
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  const response = await fetch(TTS, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: sent, speaker: voice }),
  });
  if (!response.ok) throw new Error(`TartuNLP answered ${response.status} for ${sent}`);
  const clip = prepareClip(new Uint8Array(await response.arrayBuffer()));
  mkdirSync(cache, { recursive: true });
  writeFileSync(path, clip);
  return clip;
}

export interface Recognizer {
  createStream(): { acceptWaveform(rate: number, samples: Float32Array): void; inputFinished(): void; free(): void };
  isReady(stream: unknown): boolean;
  decode(stream: unknown): void;
  getResult(stream: unknown): { text: string };
}

export function recognizer(): Recognizer {
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

export function hear(asr: Recognizer, clip: Uint8Array, pad: number): string {
  const { samples, rate } = readWav(clip);
  const at16 = resample(samples, rate, S.sampleRate);
  const stream = asr.createStream();
  stream.acceptWaveform(S.sampleRate, at16);
  // The silence a turn ends on, so the last word is decoded.
  stream.acceptWaveform(S.sampleRate, roomTone(Math.round(S.sampleRate * pad)));
  stream.inputFinished();
  while (asr.isReady(stream)) asr.decode(stream);
  const text = asr.getResult(stream).text.trim();
  stream.free();
  return text;
}
