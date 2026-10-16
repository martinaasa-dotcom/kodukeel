"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { EngineError, RawTurn, TranscribedPiece } from "@/lib/speech/engine";
import { reconcile, core, type Hearing } from "@/lib/speech/reconcile";
import { SPEECH_SETTINGS as S } from "@/lib/speech/settings";
import { isSpeaking, onSpeakingChange } from "@/lib/audio/clip";
import { WebSpeechEngine, EngineFailure } from "./webEngine";

/**
 * THE ONE WAY A SCREEN LISTENS (docs/41-fifth-batch.md, D5).
 *
 * `useSpeech()` is what every microphone in the app is built on, and
 * `components/speech/MicButton.tsx` is what every screen draws. No component
 * calls `getUserMedia` itself; an invariant holds that. Under the hook is one
 * engine per tab (`WebSpeechEngine`), shared across screens so the model is
 * loaded once and kept while somebody moves from a card to a conversation, and
 * let go two minutes after the last screen that listens has gone.
 *
 * What a turn is heard as is decided in `lib/speech/`, here on the main thread:
 * the two readings the worker returns are reconciled with the forms list
 * (asked once a turn is over, and not at all offline) and with whatever the
 * screen said the moment could hold.
 */

/** What the shell knows about speech on this deployment, published once. */
export interface SpeechConfig {
  /** Where the model files are served from, or null where there is no model. */
  readonly modelBase: string | null;
  /** Why speech is not offered here, where it is not. */
  readonly unavailable: "off" | "no-model" | null;
  /** "Show the microphone in answer boxes" (D6): the learner's own choice once the model is downloaded. */
  readonly inBoxes: boolean;
  /** "Send what I say straight away": skip the countdown ring. */
  readonly sendAtOnce: boolean;
}

const OFF: SpeechConfig = { modelBase: null, unavailable: "no-model", inBoxes: false, sendAtOnce: false };
const Config = createContext<SpeechConfig>(OFF);

export function SpeechProvider({ value, children }: { readonly value: SpeechConfig; readonly children: ReactNode }) {
  return <Config.Provider value={value}>{children}</Config.Provider>;
}

export function useSpeechConfig(): SpeechConfig {
  return useContext(Config);
}

/** Where the model stands on this device, shared by every screen in the tab. */
export type ModelPhase =
  | "checking"
  | "needs-download"
  | "cleared"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

interface Shared {
  readonly phase: ModelPhase;
  readonly done: number;
  readonly total: number;
  readonly error: EngineError | null;
}

let engine: WebSpeechEngine | null = null;
let shared: Shared = { phase: "checking", done: 0, total: 0, error: null };
let users = 0;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let checked: string | null = null;
const subscribers = new Set<() => void>();

function set(next: Partial<Shared>): void {
  shared = { ...shared, ...next };
  for (const notify of subscribers) notify();
}

function engineFor(base: string): WebSpeechEngine {
  if (!engine) engine = new WebSpeechEngine(base);
  return engine;
}

/** Look once per tab at whether the model is on this device, and whether it was and is not now. */
async function checkDevice(base: string): Promise<void> {
  if (checked === base) return;
  checked = base;
  const e = engineFor(base);
  if (await e.isDownloaded()) set({ phase: "ready", error: null });
  else if (await e.wasCleared()) set({ phase: "cleared", error: null });
  else set({ phase: "needs-download", error: null });
}

function useShared(): Shared {
  return useSyncExternalStore(
    (notify) => {
      subscribers.add(notify);
      return () => subscribers.delete(notify);
    },
    () => shared,
    () => shared,
  );
}

/** Whether the app is saying something aloud right now, which keeps the microphone closed (D14). */
export function useAppSpeaking(): boolean {
  return useSyncExternalStore(onSpeakingChange, isSpeaking, () => false);
}

function errorOf(error: unknown): EngineError {
  // The detail is for whoever is building this; the learner gets the named error in words.
  if (process.env.NODE_ENV !== "production") console.warn("[speech]", error);
  return error instanceof EngineFailure ? error.error : "failed";
}

/** Ask the forms list which words it holds; `undefined` for every word where it cannot be asked. */
async function knownSpellings(words: readonly string[]): Promise<((word: string) => boolean | undefined)> {
  const distinct = [...new Set(words.map(core).filter(Boolean))];
  if (distinct.length === 0 || (typeof navigator !== "undefined" && !navigator.onLine)) return () => undefined;
  try {
    const response = await fetch("/api/speech/forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ words: distinct }),
    });
    if (!response.ok) return () => undefined;
    const { known, asked } = (await response.json()) as { known: string[]; asked: string[] };
    const yes = new Set(known);
    const was = new Set(asked);
    return (word) => (was.has(word) ? yes.has(word) : undefined);
  } catch {
    return () => undefined;
  }
}

export interface UseSpeechOptions {
  /** Close the turn by itself on the silence after speech, and after a long wait for any. */
  readonly endpoint?: boolean;
  /** The spellings the moment could hold, lower-cased, for the dictionary's repairs. */
  readonly expect?: ReadonlySet<string>;
  /** Called once a turn has been heard and reconciled. */
  readonly onHeard?: (hearing: Hearing, raw: RawTurn) => void;
  /** Called when a turn closed with nothing said, so a call can show the button again. */
  readonly onNothing?: () => void;
}

export interface Speech {
  /** Speech is offered on this deployment and device at all. */
  readonly offered: boolean;
  /** Why it is not, in the engine's own terms, where it is not. */
  readonly why: "off" | "no-model" | "too-slow" | null;
  readonly phase: ModelPhase;
  readonly progress: { readonly done: number; readonly total: number };
  readonly listening: boolean;
  readonly thinking: boolean;
  readonly partial: string;
  readonly level: number;
  readonly clipping: boolean;
  readonly error: EngineError | null;
  readonly hearing: Hearing | null;
  /** The app is saying something, so the microphone waits (D14). */
  readonly appSpeaking: boolean;
  download(): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  cancel(): void;
  forget(): Promise<void>;
  transcribe(samples: Float32Array, rate: number, onProgress: (done: number, total: number) => void): Promise<TranscribedPiece[]>;
}

export function useSpeech(options: UseSpeechOptions = {}): Speech {
  const config = useSpeechConfig();
  const model = useShared();
  const appSpeaking = useAppSpeaking();
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [partial, setPartial] = useState("");
  const [level, setLevel] = useState(0);
  const [clipping, setClipping] = useState(false);
  const [error, setError] = useState<EngineError | null>(null);
  const [hearing, setHearing] = useState<Hearing | null>(null);
  const latest = useRef(options);
  latest.current = options;

  const base = config.modelBase;
  const offered = base !== null && config.unavailable === null;

  useEffect(() => {
    if (!base) return;
    void checkDevice(base);
    users += 1;
    if (releaseTimer) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
    return () => {
      users -= 1;
      if (users > 0) return;
      // Let the model's memory go a while after the last screen that listens.
      releaseTimer = setTimeout(() => {
        engine?.release();
        if (shared.phase === "loading" || shared.phase === "ready") set({ phase: "ready" });
      }, S.releaseAfterMs);
    };
  }, [base]);

  const download = useCallback(async () => {
    if (!base) return;
    set({ phase: "downloading", done: 0, total: 0, error: null });
    try {
      await engineFor(base).download((done, total) => set({ done, total }));
      set({ phase: "ready", error: null });
    } catch (e) {
      set({ phase: "error", error: errorOf(e) });
    }
  }, [base]);

  const start = useCallback(async () => {
    if (!base || !offered) return;
    setError(null);
    setHearing(null);
    setPartial("");
    const e = engineFor(base);
    try {
      set({ phase: shared.phase === "ready" ? "loading" : shared.phase });
      await e.load();
      set({ phase: "ready", error: null });
    } catch (err) {
      const why = errorOf(err);
      if (why === "cleared" || why === "hash-failed") set({ phase: "cleared", error: why });
      else set({ phase: "error", error: why });
      return;
    }
    try {
      await e.listen({ endpoint: latest.current.endpoint ?? true }, (event) => {
        switch (event.kind) {
          case "partial":
            setPartial(event.text);
            return;
          case "level":
            setLevel(event.level);
            setClipping(event.clipping);
            return;
          case "state":
            if (event.state.kind === "thinking") {
              setListening(false);
              setThinking(true);
            } else if (event.state.kind === "error") {
              setListening(false);
              setThinking(false);
              setError(event.state.error);
            } else if (event.state.kind === "listening") {
              setListening(true);
            }
            return;
          case "speech":
            return;
          case "final": {
            setListening(false);
            setLevel(0);
            setClipping(false);
            const raw = event.turn;
            if (!raw) {
              setThinking(false);
              latest.current.onNothing?.();
              return;
            }
            void (async () => {
              const known = await knownSpellings(raw.greedy.text.split(/\s+/));
              const heard = reconcile(raw, { known, expect: latest.current.expect });
              setThinking(false);
              setHearing(heard);
              setPartial("");
              latest.current.onHeard?.(heard, raw);
            })();
            return;
          }
        }
      });
    } catch (err) {
      setListening(false);
      setError(errorOf(err));
    }
  }, [base, offered]);

  const stop = useCallback(() => engine?.stop(), []);
  const cancel = useCallback(() => {
    engine?.cancel();
    setListening(false);
    setThinking(false);
    setPartial("");
    setLevel(0);
  }, []);

  const forget = useCallback(async () => {
    await engine?.forget();
    checked = null;
    set({ phase: "needs-download", error: null });
  }, []);

  const transcribe = useCallback(
    async (samples: Float32Array, rate: number, onProgress: (done: number, total: number) => void) => {
      if (!base) return [];
      return engineFor(base).transcribe(samples, rate, onProgress);
    },
    [base],
  );

  // A device that ran the check slower than real time keeps its typed app, and says why in Settings.
  const tooSlow = model.phase === "error" && model.error === "too-slow";
  const why = config.unavailable ?? (base === null ? "no-model" : tooSlow ? "too-slow" : null);

  return useMemo(
    () => ({
      offered: offered && !tooSlow,
      why,
      phase: model.phase,
      progress: { done: model.done, total: model.total },
      listening,
      thinking,
      partial,
      level,
      clipping,
      error: error ?? (model.phase === "error" ? model.error : null),
      hearing,
      appSpeaking,
      download,
      start,
      stop,
      cancel,
      forget,
      transcribe,
    }),
    [offered, tooSlow, why, model, listening, thinking, partial, level, clipping, error, hearing, appSpeaking, download, start, stop, cancel, forget, transcribe],
  );
}
