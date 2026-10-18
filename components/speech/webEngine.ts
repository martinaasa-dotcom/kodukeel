import { ASR_CACHE, ASR_MODEL, modelBytes, modelFileUrl } from "@/lib/speech/model";
import { SPEECH_SETTINGS as S } from "@/lib/speech/settings";
import { readWav } from "@/lib/speech/wav";
import { resample } from "@/lib/speech/resample";
import type { EngineError, EngineEvent, ListenOptions, SpeechEngine, TranscribedPiece } from "@/lib/speech/engine";
import type { FromWorker, LevelMessage, ToWorker, WorkerFile } from "./protocol";

/**
 * THE BROWSER'S SPEECH ENGINE: THE FIRST IMPLEMENTATION OF `SpeechEngine`.
 *
 * Three threads, each doing one thing (docs/41-fifth-batch.md, VB-1):
 *
 *   - this one, which owns the microphone permission, the audio context and
 *     the lifecycle, and is the only thing a screen talks to, through
 *     `useSpeech()`;
 *   - the capture worklet on the audio thread, which resamples to 16 kHz and
 *     measures the level, so the meter never stutters behind a busy page;
 *   - the speech worker, which holds the model and decodes, and is sent the
 *     audio straight from the worklet through a port, so it never crosses here.
 *
 * Nothing about what a transcript means is decided here: that is
 * `lib/speech/`, which the native apps run as it is (D24).
 *
 * The files live in a cache of their own (`ASR_CACHE`), which the service
 * worker never trims and clears only when the model changes, so a model
 * loaded once works offline, which is the daily path's rule (ADR-015).
 */

export const RUNTIME_BASE = "/asr/runtime/";
const CHECK_CLIP = "/asr/check.wav";
/** Where the files are kept in the cache, whatever base they were downloaded from. */
const CACHE_KEY = (name: string) => `/asr/model-cache/${ASR_MODEL.revision}/${name}`;
/** Remembers, on this device, that the model was downloaded once, so a cleared cache can be told from a first visit. */
const DOWNLOADED_MARK = "kodukeel-asr-downloaded";

class EngineFailure extends Error {
  constructor(readonly error: EngineError, detail?: string) {
    super(detail ?? error);
  }
}

export class WebSpeechEngine implements SpeechEngine {
  private worker: Worker | null = null;
  private loaded: Promise<void> | null = null;
  private turn: {
    readonly id: number;
    readonly context: AudioContext;
    readonly stream: MediaStream;
    readonly node: AudioWorkletNode;
    readonly onEvent: (event: EngineEvent) => void;
  } | null = null;
  /**
   * Moves on every listen and every cancel. Opening a turn waits on the model,
   * the permission prompt and the audio thread, and a press to cancel (or a
   * second press to listen) can land in any of those waits; a listen that finds
   * its ticket moved when it wakes lets go of what it opened rather than
   * opening the microphone on a turn nobody is waiting for.
   */
  private ticket = 0;
  private waiters = new Set<(message: FromWorker) => void>();
  /** A recording is being heard, which `cancel` stops rather than a turn. */
  private transcribing = false;

  constructor(private readonly modelBase: string) {}

  private files(): WorkerFile[] {
    return ASR_MODEL.files.map((file) => ({
      name: file.name,
      bytes: file.bytes,
      sha256: file.sha256,
      url: modelFileUrl(this.modelBase, file),
      key: CACHE_KEY(file.name),
    }));
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(`${RUNTIME_BASE}speech-worker.js`);
    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      for (const waiter of [...this.waiters]) waiter(event.data);
      this.route(event.data);
    };
    worker.onerror = (event) => {
      /* A worker that threw outside a message (its script would not load, the
         WebAssembly ran out of memory) is not used again: everything waiting on
         it is told, a turn it was hearing ends in words rather than listening
         for ever, and the next press starts a fresh one. */
      event.preventDefault();
      const stopped: FromWorker = { type: "error", error: "failed", detail: "the speech worker stopped" };
      for (const waiter of [...this.waiters]) waiter(stopped);
      this.route(stopped);
      if (this.worker === worker) {
        worker.terminate();
        this.worker = null;
        this.loaded = null;
      }
    };
    this.worker = worker;
    return worker;
  }

  /** Send a message and wait for the reply that ends it, or the error that does. */
  private ask(message: ToWorker, until: FromWorker["type"], onEach?: (m: FromWorker) => void, transfer: Transferable[] = []): Promise<FromWorker> {
    const worker = this.ensureWorker();
    return new Promise((resolve, reject) => {
      const waiter = (reply: FromWorker) => {
        onEach?.(reply);
        if (reply.type === until) {
          this.waiters.delete(waiter);
          resolve(reply);
        } else if (reply.type === "error") {
          this.waiters.delete(waiter);
          reject(new EngineFailure(reply.error, reply.detail));
        }
      };
      this.waiters.add(waiter);
      worker.postMessage(message, transfer);
    });
  }

  /** What the worker says during a turn, handed to whoever is listening. */
  private route(message: FromWorker): void {
    const turn = this.turn;
    if (!turn) return;
    // What a turn says carries its id: a canceled turn's last words are not this one's.
    if ("id" in message && message.id !== turn.id) return;
    switch (message.type) {
      case "partial":
        turn.onEvent({ kind: "partial", text: message.text });
        return;
      case "speech":
        turn.onEvent({ kind: "speech" });
        return;
      case "thinking":
        this.closeCapture();
        turn.onEvent({ kind: "state", state: { kind: "thinking" } });
        return;
      case "final":
        this.closeCapture();
        this.turn = null;
        turn.onEvent({ kind: "final", turn: message.turn, why: message.why, ...(message.audio ? { audio: message.audio } : {}) });
        return;
      case "error":
        this.closeCapture();
        this.turn = null;
        turn.onEvent({ kind: "state", state: { kind: "error", error: message.error } });
        return;
      default:
        return;
    }
  }

  async isDownloaded(): Promise<boolean> {
    if (typeof caches === "undefined") return false;
    try {
      /* Asked before it is opened, because `caches.open` creates what it
         cannot find: every screen with an answer box asks this on mount
         (VB-6), and an empty speech cache appearing on a device that never
         said yes to speech is a cache nothing will ever clear. */
      if (!(await caches.has(ASR_CACHE))) return false;
      const cache = await caches.open(ASR_CACHE);
      for (const file of ASR_MODEL.files) if (!(await cache.match(CACHE_KEY(file.name)))) return false;
      return true;
    } catch {
      return false;
    }
  }

  /** The model was downloaded on this device once and is not there now: the browser cleared it. */
  async wasCleared(): Promise<boolean> {
    let mark: string | null = null;
    try {
      mark = localStorage.getItem(DOWNLOADED_MARK);
    } catch {
      return false;
    }
    return mark !== null && !(await this.isDownloaded());
  }

  /** Whether the device has room for the download, where the browser will say. */
  static async hasRoom(): Promise<boolean> {
    try {
      const estimate = await navigator.storage?.estimate?.();
      if (!estimate || estimate.quota === undefined || estimate.usage === undefined) return true;
      return estimate.quota - estimate.usage > modelBytes() * 1.1;
    } catch {
      return true;
    }
  }

  async download(onProgress: (done: number, total: number) => void): Promise<void> {
    if (!(await WebSpeechEngine.hasRoom())) throw new EngineFailure("no-room");
    await this.ask({ type: "download", files: this.files(), cache: ASR_CACHE }, "downloaded", (m) => {
      if (m.type === "progress") onProgress(m.done, m.total);
    });
    try {
      localStorage.setItem(DOWNLOADED_MARK, ASR_CACHE);
    } catch {
      // A private window: the model still works, it just cannot tell a cleared cache from a first visit.
    }
    // Safari clears a site's storage after a week without a visit; ask it to keep this.
    try {
      await navigator.storage?.persist?.();
    } catch {
      // Refused or not offered: the next press says so if it was cleared (D7).
    }
  }

  load(): Promise<void> {
    if (this.loaded) return this.loaded;
    this.loaded = (async () => {
      const response = await fetch(CHECK_CLIP);
      if (!response.ok) throw new EngineFailure("failed", "the device check clip did not load");
      const clip = readWav(new Uint8Array(await response.arrayBuffer()));
      const check = clip.rate === S.sampleRate ? clip.samples : resample(clip.samples, clip.rate, S.sampleRate);
      await this.ask(
        { type: "load", files: this.files(), cache: ASR_CACHE, runtimeBase: RUNTIME_BASE, check },
        "loaded",
      );
    })();
    this.loaded.catch(() => {
      this.loaded = null;
    });
    return this.loaded;
  }

  async listen(options: ListenOptions, onEvent: (event: EngineEvent) => void): Promise<void> {
    if (this.turn) this.cancel();
    const ticket = ++this.ticket;
    const stale = () => ticket !== this.ticket;
    await this.load();
    if (stale()) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new EngineFailure("no-microphone", "this browser offers no microphone here");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      throw new EngineFailure(
        name === "NotAllowedError" || name === "SecurityError" ? "refused" : name === "NotFoundError" || name === "OverconstrainedError" ? "no-microphone" : "failed",
        name,
      );
    }
    const letGo = (context: AudioContext | null) => {
      for (const track of stream.getTracks()) track.stop();
      if (context) void context.close().catch(() => undefined);
    };
    // Canceled while the permission prompt was open: the microphone closes again at once.
    if (stale()) {
      letGo(null);
      return;
    }
    let context: AudioContext | null = null;
    let node: AudioWorkletNode;
    try {
      context = new AudioContext();
      await context.audioWorklet.addModule(`${RUNTIME_BASE}capture-worklet.js`);
      /* An audio context made after the awaits above has lost the press that
         asked for it, and a browser that is strict about that (Safari) starts
         it suspended: the worklet then hears nothing and the turn would wait
         for ever with the microphone open. Asked to run, it runs, because the
         page is capturing. */
      if (context.state === "suspended") await context.resume();
      const source = context.createMediaStreamSource(stream);
      node = new AudioWorkletNode(context, "kodukeel-capture", { numberOfOutputs: 1 });
      const mute = context.createGain();
      mute.gain.value = 0;
      source.connect(node);
      node.connect(mute);
      mute.connect(context.destination);
    } catch (error) {
      // The microphone was opened and the audio thread would not take it: close it rather than leave it on.
      letGo(context);
      throw new EngineFailure("failed", error instanceof Error ? error.message : String(error));
    }
    if (stale()) {
      letGo(context);
      return;
    }
    node.port.onmessage = (event: MessageEvent<LevelMessage>) => {
      onEvent({ kind: "level", level: event.data.level, clipping: event.data.clipping });
    };
    // A headset unplugged mid-turn ends the turn with what was said, as a press does.
    for (const track of stream.getAudioTracks()) track.onended = () => this.stop();
    const channel = new MessageChannel();
    this.turn = { id: ticket, context, stream, node, onEvent };
    node.port.postMessage({ type: "port" }, [channel.port1]);
    this.ensureWorker().postMessage(
      { type: "listen", id: ticket, endpoint: options.endpoint, maxSeconds: options.maxSeconds, keepAudio: options.keepAudio } satisfies ToWorker,
      [channel.port2],
    );
    onEvent({ kind: "state", state: { kind: "listening" } });
  }

  stop(): void {
    // The worklet sends the last of the audio and then the end of the turn, down the same port.
    this.turn?.node.port.postMessage("stop");
  }

  cancel(): void {
    // A listen still opening (the model loading, the permission prompt) finds this and lets go.
    this.ticket += 1;
    if (this.transcribing) {
      // A recording being heard stops after the piece in hand; what was heard by then is returned.
      this.worker?.postMessage({ type: "cancel" } satisfies ToWorker);
      return;
    }
    if (!this.turn) return;
    this.worker?.postMessage({ type: "cancel" } satisfies ToWorker);
    this.closeCapture();
    this.turn = null;
  }

  private closeCapture(): void {
    const turn = this.turn;
    if (!turn) return;
    for (const track of turn.stream.getTracks()) track.stop();
    turn.node.port.onmessage = null;
    turn.node.disconnect();
    void turn.context.close().catch(() => undefined);
  }

  async transcribe(samples: Float32Array, sampleRate: number, onProgress: (done: number, total: number) => void): Promise<TranscribedPiece[]> {
    await this.load();
    const pieces: TranscribedPiece[] = [];
    this.transcribing = true;
    try {
      await this.ask({ type: "transcribe", samples, rate: sampleRate }, "transcribed", (m) => {
        if (m.type === "segment") {
          if (m.turn) pieces.push({ turn: m.turn, from: m.from, to: m.to });
          onProgress(m.done, m.total);
        }
      });
    } finally {
      this.transcribing = false;
    }
    return pieces;
  }

  async forget(): Promise<void> {
    this.release();
    try {
      await caches.delete(ASR_CACHE);
    } catch {
      // Nothing to delete.
    }
    try {
      localStorage.removeItem(DOWNLOADED_MARK);
    } catch {
      // A private window keeps nothing anyway.
    }
  }

  release(): void {
    this.cancel();
    this.worker?.terminate();
    this.worker = null;
    this.loaded = null;
    for (const waiter of [...this.waiters]) waiter({ type: "error", error: "failed", detail: "released" });
    this.waiters.clear();
  }
}

export { EngineFailure };
