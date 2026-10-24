/**
 * THE ONE INTERFACE EVERY SCREEN LISTENS THROUGH, AND THE CONTRACT THE NATIVE
 * APPS IMPLEMENT.
 *
 * Everything that decides something about speech is pure and lives beside this
 * file. What has to touch a device (the microphone, the worker the model runs
 * in, where the files are kept) sits behind `SpeechEngine`, and nothing else in
 * the app may reach past it (docs/41-fifth-batch.md, D24). The web engine in
 * `components/speech/webEngine.ts` is the first implementation; the iOS and
 * Android apps implement the same contract with sherpa-onnx's own libraries,
 * the same model files and the same hashes, and get the same `understood`, the
 * same verdict and the same pick match for the same audio because those are
 * computed here, from what the engine returns, rather than inside it.
 *
 * No browser type appears in this file on purpose.
 */

/** One decoding of one stretch of audio, exactly as the model gave it. */
export interface Decoding {
  readonly text: string;
  /** The model's pieces, with their leading space where a word begins. */
  readonly tokens: readonly string[];
  /** Seconds from the start of the prepared audio, one per token. */
  readonly timestamps: readonly number[];
  /** Log probability of each token. Carried for the measurements; nothing here decides on it. */
  readonly logProbs: readonly number[];
}

/** What one finished turn decoded to: the reading that is used, and the second reading the unsure rule compares it with. */
export interface RawTurn {
  readonly greedy: Decoding;
  readonly beam: Decoding;
  /** Seconds of speech the learner gave, before the silence was added. */
  readonly seconds: number;
}

/** A piece of a recording somebody opened, cut at its pauses, with where in the recording it was. */
export interface TranscribedPiece {
  readonly turn: RawTurn;
  /** Seconds into the recording the piece starts and ends. */
  readonly from: number;
  readonly to: number;
}

/**
 * Why the engine cannot hear right now, each with a sentence a screen can say.
 * The names are the ones `useSpeech()` reports and `MicButton` draws a state
 * for, so a native app reporting the same failure shows the same words.
 */
export const ENGINE_ERRORS = [
  /** The device has no microphone. */
  "no-microphone",
  /** The learner, or the browser on their behalf, refused the microphone. */
  "refused",
  /** The model has never been downloaded on this device. */
  "not-downloaded",
  /** It was downloaded once and the browser has since cleared it. */
  "cleared",
  /** A file did not match its pinned hash, so it was not used. */
  "hash-failed",
  /** The device check ran slower than real time, or the model would not fit in memory. */
  "too-slow",
  /** Not enough room on the device for the download. */
  "no-room",
  /** The download itself failed: the network, or the server holding the files. */
  "download-failed",
  /** Anything else the engine could not explain, kept so it is reported rather than hidden. */
  "failed",
] as const;

export type EngineError = (typeof ENGINE_ERRORS)[number];

/** Where the engine stands, which is what a microphone button draws. */
export type EngineState =
  | { readonly kind: "idle" }
  | { readonly kind: "downloading"; readonly done: number; readonly total: number }
  | { readonly kind: "loading" }
  | { readonly kind: "ready" }
  | { readonly kind: "listening" }
  | { readonly kind: "thinking" }
  | { readonly kind: "error"; readonly error: EngineError };

/** What the engine tells its caller while it listens. */
export type EngineEvent =
  /** The words so far, decoded as they are said. Never prepared, never final. */
  | { readonly kind: "partial"; readonly text: string }
  /** The level of the last frame, 0 to 1, and whether it is close to clipping. */
  | { readonly kind: "level"; readonly level: number; readonly clipping: boolean }
  /** Speech began, which is what lets a call-mode turn stop waiting for it. */
  | { readonly kind: "speech" }
  /** The turn ended, by a press, by the silence after speech, or by waiting too long for any. */
  | {
      readonly kind: "final";
      readonly turn: RawTurn | null;
      readonly why: "pressed" | "silence" | "nothing-said" | "too-long";
      /**
       * The turn's own audio, 16 kHz mono, where the listen asked to keep it
       * (`ListenOptions.keepAudio`). It is for playing the learner's voice back
       * to them on the device and nothing else: never stored, never sent
       * (docs/41-fifth-batch.md D1, D21).
       */
      readonly audio?: Float32Array;
    }
  | { readonly kind: "state"; readonly state: EngineState };

export interface ListenOptions {
  /** Close by itself after `waitForSpeechSeconds` if nothing is said, and after the endpoint silence once something is. */
  readonly endpoint: boolean;
  /**
   * The longest this turn may run, in seconds, where it is longer than one
   * ordinary turn: the mock exam's spoken part asks for ninety seconds of
   * talking (docs/39-speech.md SP-5). Clamped to `maxFileSeconds`; absent is
   * `maxTurnSeconds`.
   */
  readonly maxSeconds?: number;
  /** Hand the turn's audio back with the final event, for "hear yourself". */
  readonly keepAudio?: boolean;
}

/** How a native app or the web listens; see the header. */
export interface SpeechEngine {
  /** Whether this device holds the current model files. Read from where they are kept, never from a setting. */
  isDownloaded(): Promise<boolean>;
  /**
   * Fetch and check every file, reporting progress, and ask the platform to keep them.
   * A `quiet` download (the background one nobody pressed for) asks nothing a
   * browser might turn into a prompt, and the asking never holds the download up.
   */
  download(onProgress: (done: number, total: number) => void, options?: { readonly quiet?: boolean }): Promise<void>;
  /** Load the model and check the device can run it in real time. */
  load(): Promise<void>;
  /** Open the microphone and start hearing. Events arrive through `onEvent` until a `final`. */
  listen(options: ListenOptions, onEvent: (event: EngineEvent) => void): Promise<void>;
  /** End the turn now, as a press does. */
  stop(): void;
  /**
   * End the turn and throw away what was heard. While a recording is being
   * transcribed, stop after the piece in hand instead; `transcribe` then
   * resolves with the pieces heard so far, so stopping a long message keeps
   * its beginning.
   */
  cancel(): void;
  /** Decode audio that is already in hand, a recording somebody opened, in pieces cut at its pauses. */
  transcribe(samples: Float32Array, sampleRate: number, onProgress: (done: number, total: number) => void): Promise<TranscribedPiece[]>;
  /** Forget the downloaded files, which Settings offers. */
  forget(): Promise<void>;
  /** Let the model's memory go. The next listen loads it again. */
  release(): void;
}
