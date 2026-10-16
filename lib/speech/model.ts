/**
 * THE MODEL THIS APP HEARS ESTONIAN WITH, PINNED TO THE BYTE.
 *
 * TalTech's small streaming Zipformer, int8, chosen in `docs/39-speech.md`
 * section 3.8: on held-out recordings it is level with the large model at half
 * the size. It runs on the learner's own device through sherpa-onnx, and no
 * recording ever leaves that device (ADR-028).
 *
 * A model update is a change to this file and nothing else: the revision, the
 * sizes and the hashes move together, `ASR_CACHE` moves with them because it is
 * derived from them, the service worker's copy of that name is held to it by
 * an invariant, and the next press of a microphone asks again with the new
 * size (docs/41-fifth-batch.md, D23). Every file is checked against its hash
 * before it is used, so a file that changed under its name is refused rather
 * than run.
 *
 * Pure: no browser API, so the native apps read the same pins (D24).
 */

export interface ModelFile {
  /** The name sherpa-onnx is given, and the path under the model base. */
  readonly name: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface PinnedModel {
  /** The Hugging Face repository the files were taken from, for the credit and for `asr:fetch`. */
  readonly repo: string;
  readonly revision: string;
  readonly licence: string;
  readonly files: readonly ModelFile[];
}

/** Understanding a turn: every speaking feature in this app runs on this one. */
export const ASR_MODEL: PinnedModel = {
  repo: "TalTechNLP/streaming-zipformer.et-en",
  revision: "7edbacc1d13a4bc8fba21307753569e8334938a0",
  licence: "MIT",
  files: [
    { name: "encoder.int8.onnx", bytes: 70_107_780, sha256: "37b1eff8127447f192e3f8eae29fe3893be45a39283e444c9154b489bba6bbde" },
    { name: "decoder.int8.onnx", bytes: 796_689, sha256: "9ef6b41fd1552ded37acb3b7805264d7650ea5d737846eeef1b3feda54b6e267" },
    { name: "joiner.int8.onnx", bytes: 517_416, sha256: "7c8d02c85ea42ee6ff13b5a5207e935d001d98a561763ebbfd7a7a127ad374dd" },
    { name: "tokens.txt", bytes: 11_493, sha256: "cbe23ea2ef76303d874ab45ef8471b570e565b9048ab0aeda1c7adf2c663ee97" },
  ],
};

/**
 * The pair judge of D1, which this batch does not load (D3, VB-16).
 *
 * It is the anchored fine-tune `scripts/asr-icefall.py` built, and its files
 * are not published anywhere yet, so there is nothing to pin. Its entry exists
 * so the native work order and the credit both have one place to read it from;
 * the day it is published, its files and hashes go here the way the small
 * model's did.
 */
export const PAIR_JUDGE = {
  name: "TalTech icefall_pruned_transducer_stateless7_streaming_et, anchored fine-tune, chunk 32",
  licence: "CC BY-SA 4.0",
  files: [] as readonly ModelFile[],
} as const;

/** How many bytes the first download is, which the prompt says before it asks. */
export function modelBytes(model: PinnedModel = ASR_MODEL): number {
  return model.files.reduce((sum, file) => sum + file.bytes, 0);
}

/**
 * The size said the way a person says it: "71 MB". Decimal megabytes, because
 * that is what a phone's storage screen and a data plan both count in.
 */
export function megabytes(bytes: number): number {
  return Math.round(bytes / 1_000_000);
}

/**
 * The name of the cache the model lives in on the device.
 *
 * Derived from the hashes rather than typed, so it cannot fall behind them: a
 * new model is a new cache, and the service worker deletes every
 * `kodukeel-asr-` cache that is not this one (public/sw.js). The worker reads
 * this name too and an invariant holds the two copies equal, because the
 * worker is plain JavaScript and cannot import it.
 */
export const ASR_CACHE = `kodukeel-asr-${shortHash(ASR_MODEL)}`;

function shortHash(model: PinnedModel): string {
  // Twelve hex characters of the first file hash and the revision: unique in
  // practice, short enough to read in a cache list, and pure.
  return `${model.revision.slice(0, 6)}${model.files[0]!.sha256.slice(0, 6)}`;
}

/**
 * Where the model files are served from.
 *
 * The deployment's own storage (D10 of docs/39-speech.md), named by
 * `NEXT_PUBLIC_ASR_MODEL_BASE`, so a learner's address reaches no new company.
 * Without it, a copy fetched into `public/asr/model/` by `npm run asr:fetch`
 * is served from this origin, which is what local development and CI use.
 * With neither there is no model, and the app is exactly as it was before
 * speech: no microphone anywhere, and Settings says why.
 */
export const LOCAL_MODEL_BASE = "/asr/model";

/** The URL one file is fetched from, under a base with or without a trailing slash. */
export function modelFileUrl(base: string, file: ModelFile, model: PinnedModel = ASR_MODEL): string {
  const root = base.replace(/\/+$/, "");
  return `${root}/${model.revision}/${file.name}`;
}
