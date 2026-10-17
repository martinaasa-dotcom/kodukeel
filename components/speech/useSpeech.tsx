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

let downloading: Promise<void> | null = null;

/**
 * Fetch the model onto this device, once per tab however many screens ask.
 *
 * `quiet` is the background download every learner gets (below): a failure
 * puts the phase back where it was rather than showing an error on whatever
 * screen they are on, and the next visit, the next time the device comes back
 * online, or a press of a microphone tries again.
 */
function downloadModel(base: string, quiet: boolean): Promise<void> {
  if (downloading) return downloading;
  set({ phase: "downloading", done: 0, total: 0, error: null });
  downloading = (async () => {
    try {
      await engineFor(base).download((done, total) => set({ done, total }));
      set({ phase: "ready", error: null });
    } catch (e) {
      const why = errorOf(e);
      if (quiet) set({ phase: "needs-download", error: null });
      else set({ phase: "error", error: why });
    } finally {
      downloading = null;
    }
  })();
  return downloading;
}

/**
 * EVERY LEARNER HAS THE MODEL BEFORE THEY REACH FOR A MICROPHONE.
 *
 * The operator's call (docs/41-fifth-batch.md, section 8b): asking before a
 * download put a decision about 71 MB between somebody and the first thing
 * they said, and a microphone that answers "download first" is a microphone
 * nobody presses twice. So the signed-in shell mounts this, and once the page
 * has settled it fetches the model quietly in the background, once per
 * device. Two tabs do not both fetch: a Web Lock holds the download to one,
 * and the other finds the files there when it gets the lock.
 *
 * Nothing about what is heard changes. The sound still never leaves the
 * device, and the microphone still opens only on a press.
 *
 * A browser driven by a test (`navigator.webdriver`) does not fetch it on its
 * own: every suite opens fresh browsers, and 71 MB behind each of them would
 * be a suite measuring its own download. `scripts/test-speech.mjs` clears the
 * flag on one page to check the background download itself.
 */
export function SpeechPrefetch() {
  const config = useSpeechConfig();
  const base = config.unavailable === null ? config.modelBase : null;
  useEffect(() => {
    if (!base) return;
    let gone = false;
    const run = async () => {
      if (gone || !navigator.onLine || navigator.webdriver) return;
      await checkDevice(base);
      if (gone || (shared.phase !== "needs-download" && shared.phase !== "cleared")) return;
      const fetchOnce = async () => {
        // Another tab may have fetched it while this one waited for the lock.
        if (await engineFor(base).isDownloaded()) {
          set({ phase: "ready", error: null });
          return;
        }
        await downloadModel(base, true);
      };
      const locks = (navigator as Navigator & { locks?: LockManager }).locks;
      if (locks) await locks.request("kodukeel-asr-download", fetchOnce);
      else await fetchOnce();
    };
    // After the page a learner opened has had the network to itself.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const timer = setTimeout(() => (idle ? idle(() => void run(), { timeout: 10_000 }) : void run()), PREFETCH_AFTER_MS);
    const online = () => void run();
    window.addEventListener("online", online);
    return () => {
      gone = true;
      clearTimeout(timer);
      window.removeEventListener("online", online);
    };
  }, [base]);
  return null;
}

/** How long after a page loads the background download waits, so it never slows the page itself. */
const PREFETCH_AFTER_MS = 3_000;

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
  /** The longest a turn may run, in seconds, where it is longer than one ordinary turn (the exam's spoken part). */
  readonly maxSeconds?: number;
  /** Keep the turn's audio so the screen can play the learner's own voice back. Never stored or sent. */
  readonly keepAudio?: boolean;
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
  /** The last turn's own audio at 16 kHz, where `keepAudio` asked for it; for playing back on the device only. */
  readonly audio: Float32Array | null;
  /** The app is saying something, so the microphone waits (D14). */
  readonly appSpeaking: boolean;
  /** The last turn closed with nothing said, so the button can say so rather than going quiet. */
  readonly silent: boolean;
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
  const [audio, setAudio] = useState<Float32Array | null>(null);
  const [silent, setSilent] = useState(false);
  const latest = useRef(options);
  latest.current = options;
  /*
    Which turn this hook is waiting on. A turn's last step (asking the forms
    list which words it holds) is a fetch, and a cancel, a new press or the
    screen moving on can land while it is out: a reading that comes back for a
    turn nobody is waiting on is dropped rather than filling a box the learner
    has already moved past.
  */
  const turnRef = useRef(0);
  /* A press while the turn is still opening (the model loading, the browser's
     permission prompt) is not a second turn. */
  const opening = useRef(false);

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
      const letGo = () => {
        /* Not while the files are still arriving: releasing ends the worker,
           and a 71 MB download started on Settings and left running while
           somebody reads a grammar page would fail two minutes later with a
           sentence about listening. It waits for the download, then goes. */
        if (shared.phase === "downloading") {
          releaseTimer = setTimeout(letGo, S.releaseAfterMs);
          return;
        }
        releaseTimer = null;
        engine?.release();
        if (shared.phase === "loading" || shared.phase === "ready") set({ phase: "ready" });
      };
      releaseTimer = setTimeout(letGo, S.releaseAfterMs);
    };
  }, [base]);

  const download = useCallback(async () => {
    if (!base) return;
    await downloadModel(base, false);
  }, [base]);

  const start = useCallback(async () => {
    if (!base || !offered || opening.current) return;
    opening.current = true;
    const turn = ++turnRef.current;
    const current = () => turn === turnRef.current;
    setError(null);
    setHearing(null);
    setSilent(false);
    setPartial("");
    const e = engineFor(base);
    try {
      set({ phase: shared.phase === "ready" ? "loading" : shared.phase });
      await e.load();
      set({ phase: "ready", error: null });
    } catch (err) {
      opening.current = false;
      const why = errorOf(err);
      if (why === "cleared" || why === "hash-failed") set({ phase: "cleared", error: why });
      else set({ phase: "error", error: why });
      return;
    }
    if (!current()) {
      opening.current = false;
      return;
    }
    try {
      setAudio(null);
      await e.listen({
        endpoint: latest.current.endpoint ?? true,
        maxSeconds: latest.current.maxSeconds,
        keepAudio: latest.current.keepAudio,
      }, (event) => {
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
            if (event.audio) setAudio(event.audio);
            if (!raw) {
              setThinking(false);
              setSilent(true);
              latest.current.onNothing?.();
              return;
            }
            void (async () => {
              const known = await knownSpellings(raw.greedy.text.split(/\s+/));
              if (!current()) return;
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
      if (current()) setError(errorOf(err));
    } finally {
      opening.current = false;
    }
  }, [base, offered]);

  const stop = useCallback(() => engine?.stop(), []);
  const cancel = useCallback(() => {
    turnRef.current += 1;
    engine?.cancel();
    setListening(false);
    setThinking(false);
    setPartial("");
    setLevel(0);
    setClipping(false);
    setSilent(false);
  }, []);

  /*
    The microphone is closed the moment the app starts speaking (D14), on
    every screen rather than the ones that remembered: a turn heard over the
    app's own voice is not the learner's, so it is let go rather than sent, and
    the button is back under their hand, closed until the line ends.
  */
  useEffect(() => {
    if (appSpeaking && listening) cancel();
  }, [appSpeaking, listening, cancel]);

  /* A screen that goes while its microphone is open closes it: leaving a card
     for the dictionary must not leave the microphone hearing the room. */
  const listeningRef = useRef(false);
  listeningRef.current = listening || thinking;
  useEffect(() => () => {
    // `opening` too: a screen left with the permission prompt still up must not open the microphone afterwards.
    if (listeningRef.current || opening.current) {
      turnRef.current += 1;
      engine?.cancel();
    }
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
      audio,
      appSpeaking,
      silent,
      download,
      start,
      stop,
      cancel,
      forget,
      transcribe,
    }),
    [offered, tooSlow, why, model, listening, thinking, partial, level, clipping, error, hearing, audio, appSpeaking, silent, download, start, stop, cancel, forget, transcribe],
  );
}
