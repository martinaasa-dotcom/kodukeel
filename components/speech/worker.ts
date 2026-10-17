/**
 * THE THREAD THE MODEL RUNS IN.
 *
 * Bundled on its own by `scripts/vendor-asr-runtime.mjs` into
 * `public/asr/runtime/speech-worker.js`, beside the sherpa-onnx runtime it
 * loads, and never part of a page's first load: a screen starts it on a press
 * (docs/41-fifth-batch.md, section 3).
 *
 * It does as little as it can. It fetches and checks the files, runs the model,
 * decodes what it is sent, and says what it decoded. Every decision about what
 * that means is in `lib/speech/`, on the main thread, where the native apps can
 * run the same code (D24). The microphone and the level meter are the capture
 * worklet's; audio arrives here already at 16 kHz through a port of its own.
 *
 * Single-threaded on purpose (D18): a threaded build needs the page to be
 * cross-origin isolated, which would stop Google's sign-in from loading.
 */
import { prepareTurn, spokenSeconds, piecesOf } from "@/lib/speech/prepare";
import { resample } from "@/lib/speech/resample";
import { SPEECH_SETTINGS as S } from "@/lib/speech/settings";
import type { Decoding, EngineError, RawTurn } from "@/lib/speech/engine";
import type { ToWorker, FromWorker, WorkerFile } from "./protocol";

/* The worker's own global, described as narrowly as this file uses it, so the
   app's DOM types and a worker's do not have to be compiled together. */
interface WorkerScope {
  importScripts(...urls: string[]): void;
  postMessage(message: FromWorker, transfer?: Transferable[]): void;
  onmessage: ((event: { data: ToWorker; ports: readonly MessagePort[] }) => void) | null;
  readonly caches: CacheStorage;
  readonly crypto: Crypto;
}
const scope = globalThis as unknown as WorkerScope;

/* What the vendored runtime puts on the global scope (sherpa-onnx-asr.js). */
interface SherpaModule {
  readonly FS: { writeFile(path: string, data: Uint8Array): void; mkdir(path: string): void; unlink(path: string): void };
}
interface SherpaStream {
  acceptWaveform(rate: number, samples: Float32Array): void;
  inputFinished(): void;
  free(): void;
}
interface SherpaRecognizer {
  createStream(): SherpaStream;
  isReady(stream: SherpaStream): boolean;
  decode(stream: SherpaStream): void;
  isEndpoint(stream: SherpaStream): boolean;
  getResult(stream: SherpaStream): { text: string; tokens: string[]; timestamps: number[]; ys_probs: number[] };
  free(): void;
}
declare const createOnlineRecognizer: (module: SherpaModule, config: unknown) => SherpaRecognizer;
declare const Module: (moduleArg: Record<string, unknown>) => Promise<unknown>;

let sherpa: SherpaModule | null = null;
let greedy: SherpaRecognizer | null = null;
let beam: SherpaRecognizer | null = null;

/* One turn's state while it is being said. */
let live: SherpaStream | null = null;
let heard: Float32Array[] = [];
let heardLength = 0;
let spoke = false;
let endpointOn = false;
let partialText = "";
/** The turn being heard, echoed on everything it says (protocol.ts). */
let turnId = 0;

function post(message: FromWorker): void {
  scope.postMessage(message);
}

/** Whatever was thrown, in words: emscripten throws plain objects and numbers as well as errors. */
function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }
  return String(error);
}

function fail(error: EngineError, detail?: string): void {
  post({ type: "error", error, detail });
}

function config(method: string): unknown {
  return {
    featConfig: { sampleRate: S.sampleRate, featureDim: 80 },
    modelConfig: {
      transducer: { encoder: "/m/encoder.int8.onnx", decoder: "/m/decoder.int8.onnx", joiner: "/m/joiner.int8.onnx" },
      paraformer: { encoder: "", decoder: "" },
      zipformer2Ctc: { model: "" },
      nemoCtc: { model: "" },
      toneCtc: { model: "" },
      tokens: "/m/tokens.txt",
      numThreads: 1,
      provider: "cpu",
      debug: 0,
      modelType: "",
      modelingUnit: "",
      bpeVocab: "",
    },
    decodingMethod: method,
    maxActivePaths: S.beamPaths,
    enableEndpoint: 1,
    // Nothing said yet: close after the wait. Something said: close on the silence after it.
    rule1MinTrailingSilence: S.waitForSpeechSeconds,
    rule2MinTrailingSilence: S.endpointSilenceSeconds,
    rule3MinUtteranceLength: S.maxTurnSeconds,
    hotwordsFile: "",
    hotwordsScore: 1.5,
    ctcFstDecoderConfig: { graph: "", maxActive: 3000 },
    ruleFsts: "",
    ruleFars: "",
  };
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await scope.crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchChecked(file: WorkerFile, onBytes: (n: number) => void): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(file.url, { credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new EngineFailure("download-failed");
  }
  if (!response.ok || !response.body) throw new EngineFailure("download-failed", `HTTP ${response.status}`);
  const reader = response.body.getReader();
  const out = new Uint8Array(file.bytes);
  let at = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (at + value.length > out.length) throw new EngineFailure("hash-failed", `${file.name} is longer than pinned`);
    out.set(value, at);
    at += value.length;
    onBytes(value.length);
  }
  if (at !== file.bytes || (await sha256(out)) !== file.sha256) throw new EngineFailure("hash-failed", file.name);
  return out;
}

class EngineFailure extends Error {
  constructor(readonly error: EngineError, detail?: string) {
    super(detail ?? error);
  }
}

async function download(files: readonly WorkerFile[], cacheName: string): Promise<void> {
  const cache = await scope.caches.open(cacheName);
  const total = files.reduce((n, f) => n + f.bytes, 0);
  let done = 0;
  for (const file of files) {
    if (await cache.match(file.key)) {
      done += file.bytes;
      post({ type: "progress", done, total });
      continue;
    }
    const bytes = await fetchChecked(file, (n) => {
      done += n;
      post({ type: "progress", done, total });
    });
    await cache.put(file.key, new Response(new Blob([bytes as BlobPart]), { headers: { "content-type": "application/octet-stream" } }));
  }
  post({ type: "downloaded" });
}

async function load(files: readonly WorkerFile[], cacheName: string, runtimeBase: string, check: Float32Array): Promise<void> {
  if (!sherpa) {
    scope.importScripts(`${runtimeBase}sherpa-onnx.js`, `${runtimeBase}sherpa-onnx-asr.js`);
    const moduleArg: Record<string, unknown> = { locateFile: (path: string) => `${runtimeBase}${path.replace("sherpa-onnx-wasm-nodejs", "sherpa-onnx")}` };
    await Module(moduleArg);
    sherpa = moduleArg as unknown as SherpaModule;
  }
  const cache = await scope.caches.open(cacheName);
  // The model's own directory in the in-memory file system, made once per worker.
  try {
    sherpa.FS.mkdir("/m");
  } catch {
    // Already there from an earlier load in this worker.
  }
  for (const file of files) {
    const hit = await cache.match(file.key);
    if (!hit) throw new EngineFailure("cleared");
    const bytes = new Uint8Array(await hit.arrayBuffer());
    if (bytes.length !== file.bytes || (await sha256(bytes)) !== file.sha256) {
      await cache.delete(file.key);
      throw new EngineFailure("hash-failed", file.name);
    }
    sherpa.FS.writeFile(`/m/${file.name}`, bytes);
  }
  // A load after a failed one in the same worker (a device check that ran
  // slow once) lets the recognizers that load made go before making new ones.
  live?.free();
  live = null;
  greedy?.free();
  greedy = null;
  beam?.free();
  beam = null;
  try {
    greedy = createOnlineRecognizer(sherpa, config(S.decoding));
  } catch (error) {
    throw new EngineFailure("too-slow", `the model would not fit: ${String(error)}`);
  }
  // The device check: the shipped clip, decoded once, timed against its own length.
  const timed = (): number => {
    const started = performance.now();
    decodeWhole(greedy!, check);
    return (performance.now() - started) / 1000 / (check.length / S.sampleRate);
  };
  /* The first decoding in a fresh worker pays for the WebAssembly warming up,
     on a page that is itself still loading, and a busy moment is not a slow
     device: one reading over the line once marked a capable machine "too slow"
     for the rest of the tab. So a slow first pass is decoded again and the
     faster of the two decides. A device that is really slower than real time
     is slow both times. */
  let rtf = timed();
  if (!(rtf <= S.maxRealTimeFactor)) rtf = Math.min(rtf, timed());
  if (!(rtf <= S.maxRealTimeFactor)) throw new EngineFailure("too-slow", `${rtf.toFixed(2)} of real time`);
  // The second reading is made only when a turn ends, but it is loaded now, so
  // the screen says "getting ready" once rather than stalling the first turn.
  try {
    beam = createOnlineRecognizer(sherpa, config(S.secondDecoding));
  } catch {
    // Without it nothing is marked unsure for disagreeing, which is the safe side.
    beam = null;
  }
  post({ type: "loaded", rtf });
}

function decodeWhole(recognizer: SherpaRecognizer, samples: Float32Array): Decoding {
  const stream = recognizer.createStream();
  try {
    stream.acceptWaveform(S.sampleRate, samples);
    stream.inputFinished();
    while (recognizer.isReady(stream)) recognizer.decode(stream);
    const r = recognizer.getResult(stream);
    return { text: r.text.trim(), tokens: r.tokens, timestamps: r.timestamps, logProbs: r.ys_probs };
  } finally {
    stream.free();
  }
}

async function finalTurn(samples: Float32Array): Promise<RawTurn | null> {
  const seconds = spokenSeconds(samples);
  if (seconds === 0) return null;
  const prepared = prepareTurn(samples);
  const first = decodeWhole(greedy!, prepared);
  // Where the second reading could not be made, it is the first: nothing is
  // marked unsure for disagreeing, which is the safe side.
  const second = beam ? decodeWhole(beam, prepared) : first;
  return { greedy: first, beam: second, seconds };
}

/** How long this turn may run, and whether its audio goes back with it (`ListenOptions`). */
let turnLimitSeconds: number = S.maxTurnSeconds;
let keepAudio = false;

function startTurn(id: number, endpoint: boolean, maxSeconds?: number, keep?: boolean): void {
  live?.free();
  turnId = id;
  live = greedy!.createStream();
  heard = [];
  heardLength = 0;
  spoke = false;
  partialText = "";
  endpointOn = endpoint;
  turnLimitSeconds = typeof maxSeconds === "number" && Number.isFinite(maxSeconds)
    ? Math.min(Math.max(maxSeconds, 1), S.maxFileSeconds)
    : S.maxTurnSeconds;
  keepAudio = keep === true;
}

function accept(samples: Float32Array): void {
  if (!live || !greedy) return;
  heard.push(samples);
  heardLength += samples.length;
  live.acceptWaveform(S.sampleRate, samples);
  while (greedy.isReady(live)) greedy.decode(live);
  const text = greedy.getResult(live).text.trim();
  if (text !== partialText) {
    partialText = text;
    if (text && !spoke) {
      spoke = true;
      post({ type: "speech", id: turnId });
    }
    post({ type: "partial", id: turnId, text });
  }
  if (heardLength / S.sampleRate >= turnLimitSeconds) {
    void endTurn("too-long");
  } else if (endpointOn && greedy.isEndpoint(live)) {
    void endTurn(spoke ? "silence" : "nothing-said");
  }
}

async function endTurn(why: "pressed" | "silence" | "nothing-said" | "too-long"): Promise<void> {
  if (!live) return;
  const id = turnId;
  live.free();
  live = null;
  const all = new Float32Array(heardLength);
  let at = 0;
  for (const piece of heard) {
    all.set(piece, at);
    at += piece.length;
  }
  heard = [];
  heardLength = 0;
  post({ type: "thinking", id });
  const turn = why === "nothing-said" ? null : await finalTurn(all);
  // The learner's own voice goes back only where the screen asked to play it to them.
  if (keepAudio && turn) {
    const message: FromWorker = { type: "final", id, turn, why, audio: all };
    scope.postMessage(message, [all.buffer]);
    return;
  }
  post({ type: "final", id, turn, why });
}

/** Set by "cancel" while a recording is being heard: stop after the piece in hand, keeping what was heard. */
let stopTranscribing = false;

/**
 * A recording somebody opened, heard in pieces cut at its pauses so no piece
 * is long and no word is split, each piece decoded the way a turn is.
 */
async function transcribe(samples: Float32Array, rate: number): Promise<void> {
  stopTranscribing = false;
  const audio = resample(samples, rate, S.sampleRate);
  // Where the recording is cut is decided in lib/speech/, so a native app cuts in the same places.
  const pieces = piecesOf(audio);
  const total = pieces.length;
  let done = 0;
  for (const [from, to] of pieces) {
    const turn = await finalTurn(audio.subarray(from, to));
    done += 1;
    post({ type: "segment", turn, from: from / S.sampleRate, to: to / S.sampleRate, done, total });
    // A real pause between pieces, so a "cancel" sent while this runs is read
    // before the next piece rather than after the last one: decoding is
    // synchronous, and a resolved await gives the message queue no turn.
    await new Promise((resume) => setTimeout(resume, 0));
    if (stopTranscribing) break;
  }
  stopTranscribing = false;
  post({ type: "transcribed" });
}


let audioPort: MessagePort | null = null;

scope.onmessage = (event) => {
  const message = event.data;
  const run = async (): Promise<void> => {
    switch (message.type) {
      case "download":
        await download(message.files, message.cache);
        return;
      case "load":
        await load(message.files, message.cache, message.runtimeBase, message.check);
        return;
      case "listen":
        if (!greedy) throw new EngineFailure("not-downloaded");
        startTurn(message.id, message.endpoint, message.maxSeconds, message.keepAudio);
        audioPort?.close();
        audioPort = event.ports[0] ?? null;
        if (audioPort) {
          audioPort.onmessage = (e: MessageEvent<Float32Array | "end">) => {
            if (e.data === "end") void endTurn("pressed");
            else accept(e.data);
          };
        }
        return;
      case "stop":
        audioPort?.close();
        audioPort = null;
        await endTurn("pressed");
        return;
      case "cancel":
        stopTranscribing = true;
        audioPort?.close();
        audioPort = null;
        live?.free();
        live = null;
        heard = [];
        heardLength = 0;
        return;
      case "transcribe":
        if (!greedy) throw new EngineFailure("not-downloaded");
        await transcribe(message.samples, message.rate);
        return;
    }
  };
  run().catch((error: unknown) => {
    if (error instanceof EngineFailure) fail(error.error, error.message);
    else fail("failed", describe(error));
  });
};
