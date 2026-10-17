import type { EngineError, RawTurn } from "@/lib/speech/engine";

/**
 * What the page and the speech worker say to each other. One file, so the two
 * ends cannot disagree about a message's shape; the worker is bundled
 * separately and this is the only thing the two compilations share besides
 * `lib/speech/`.
 */

/** A model file as the worker fetches and keeps it. */
export interface WorkerFile {
  readonly name: string;
  readonly bytes: number;
  readonly sha256: string;
  /** Where it is downloaded from: the deployment's model base. */
  readonly url: string;
  /** What it is kept under in the cache, independent of the base, so moving the files does not mean downloading them again. */
  readonly key: string;
}

export type ToWorker =
  | { readonly type: "download"; readonly files: readonly WorkerFile[]; readonly cache: string }
  | {
      readonly type: "load";
      readonly files: readonly WorkerFile[];
      readonly cache: string;
      readonly runtimeBase: string;
      /** The shipped two-second clip the device check decodes, at 16 kHz. */
      readonly check: Float32Array;
    }
  /**
   * Start a turn; its audio arrives through the port sent with this message.
   * `id` is echoed on everything the turn says, so a turn cancelled while it
   * was being read cannot land its final on the turn that replaced it.
   */
  | { readonly type: "listen"; readonly id: number; readonly endpoint: boolean; readonly maxSeconds?: number; readonly keepAudio?: boolean }
  | { readonly type: "stop" }
  | { readonly type: "cancel" }
  | { readonly type: "transcribe"; readonly samples: Float32Array; readonly rate: number };

export type FromWorker =
  | { readonly type: "progress"; readonly done: number; readonly total: number }
  | { readonly type: "downloaded" }
  | { readonly type: "loaded"; readonly rtf: number }
  | { readonly type: "partial"; readonly id: number; readonly text: string }
  | { readonly type: "speech"; readonly id: number }
  | { readonly type: "thinking"; readonly id: number }
  | { readonly type: "final"; readonly id: number; readonly turn: RawTurn | null; readonly why: "pressed" | "silence" | "nothing-said" | "too-long"; readonly audio?: Float32Array }
  | { readonly type: "segment"; readonly turn: RawTurn | null; readonly from: number; readonly to: number; readonly done: number; readonly total: number }
  | { readonly type: "transcribed" }
  | { readonly type: "error"; readonly error: EngineError; readonly detail?: string };

/** What the capture worklet tells the page, about twenty times a second. */
export interface LevelMessage {
  readonly level: number;
  readonly clipping: boolean;
}
