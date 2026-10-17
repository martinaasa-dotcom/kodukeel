/**
 * THE MICROPHONE, ON THE AUDIO THREAD.
 *
 * Bundled on its own by `scripts/vendor-asr-runtime.mjs` into
 * `public/asr/runtime/capture-worklet.js`. It runs where the browser renders
 * audio, so the meter never stutters behind a busy page, and it does two things
 * with every block the microphone delivers:
 *
 *   - resamples it from the device's rate to the model's 16 kHz
 *     (`lib/speech/resample.ts`) and sends it, about a tenth of a second at a
 *     time, straight to the speech worker through a port of its own, so the
 *     audio never crosses the main thread;
 *   - measures its level, and whether it is close to clipping, and tells the
 *     page about twenty times a second for the meter.
 *
 * Nothing is kept here and nothing leaves the device (ADR-028).
 */
import { StreamResampler } from "@/lib/speech/resample";
import { SPEECH_SETTINGS as S } from "@/lib/speech/settings";
import type { LevelMessage } from "./protocol";

/* The audio thread's globals, described as narrowly as this file uses them. */
interface ProcessorPort {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: unknown; ports: readonly MessagePort[] }) => void) | null;
}
declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: ProcessorPort;
}
declare function registerProcessor(name: string, processor: unknown): void;

/** About a tenth of a second of 16 kHz audio per message to the worker. */
const SEND_EVERY = 1600;
/** How often the meter hears about the level, in seconds. */
const LEVEL_EVERY = 0.05;

class Capture extends AudioWorkletProcessor {
  private readonly resampler = new StreamResampler(sampleRate, S.sampleRate);
  private worker: MessagePort | null = null;
  private pending: Float32Array[] = [];
  private pendingLength = 0;
  private peak = 0;
  private sumSquares = 0;
  private counted = 0;
  private lastLevelAt = 0;
  private stopped = false;

  constructor() {
    super();
    this.port.onmessage = (event) => {
      if (event.data === "stop") {
        // The rest of the audio first, then the word that ends the turn, down
        // the same port, so the worker cannot end a turn before its last words arrive.
        this.flush(true);
        this.worker?.postMessage("end");
        this.stopped = true;
        return;
      }
      if (event.ports[0]) this.worker = event.ports[0];
    };
  }

  process(inputs: Float32Array[][]): boolean {
    if (this.stopped) return false;
    const channel = inputs[0]?.[0];
    if (channel && channel.length > 0) {
      for (let i = 0; i < channel.length; i++) {
        const v = channel[i]!;
        const a = v < 0 ? -v : v;
        if (a > this.peak) this.peak = a;
        this.sumSquares += v * v;
      }
      this.counted += channel.length;
      const out = this.resampler.push(channel);
      if (out.length > 0) {
        this.pending.push(out);
        this.pendingLength += out.length;
      }
      if (this.pendingLength >= SEND_EVERY) this.flush(false);
      if (currentTime - this.lastLevelAt >= LEVEL_EVERY) {
        const rms = Math.sqrt(this.sumSquares / Math.max(1, this.counted));
        // A meter reads in decibels: -60 dB is empty and 0 dB is full.
        const db = 20 * Math.log10(Math.max(rms, 1e-6));
        const message: LevelMessage = {
          level: Math.max(0, Math.min(1, (db + 60) / 60)),
          clipping: this.peak >= S.clipWarnPeak,
        };
        this.port.postMessage(message);
        this.peak = 0;
        this.sumSquares = 0;
        this.counted = 0;
        this.lastLevelAt = currentTime;
      }
    }
    return true;
  }

  private flush(last: boolean): void {
    if (last) {
      const tail = this.resampler.flush();
      if (tail.length > 0) {
        this.pending.push(tail);
        this.pendingLength += tail.length;
      }
    }
    if (this.pendingLength === 0 || !this.worker) return;
    const joined = new Float32Array(this.pendingLength);
    let at = 0;
    for (const piece of this.pending) {
      joined.set(piece, at);
      at += piece.length;
    }
    this.pending = [];
    this.pendingLength = 0;
    this.worker.postMessage(joined, [joined.buffer]);
  }
}

registerProcessor("kodukeel-capture", Capture);
