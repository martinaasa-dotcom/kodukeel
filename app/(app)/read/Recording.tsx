"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AudioLines, FileAudio, Loader2, Play, Square, Upload } from "lucide-react";
import { readHeard } from "@/app/actions";
import { Button } from "@/components/Button";
import { GlossedSentence } from "@/components/GlossedSentence";
import { useT } from "@/components/Locale";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { useSpeech } from "@/components/speech/useSpeech";
import { EngineFailure } from "@/components/speech/webEngine";
import { Note } from "@/components/ui";
import type { GlossedToken } from "@/lib/dict/glossed";
import type { TranscribedPiece } from "@/lib/speech/engine";
import { megabytes, modelBytes } from "@/lib/speech/model";
import {
  MAX_RECORDING_BYTES, MAX_RECORDING_SECONDS, WORDS_WRONG_QUIET, clock, doubtfulTokens, isOggOpus,
  looksLikeAudio, mono, oneIn, sliceOf, transcriptLines, type HeardLine,
} from "@/lib/speech/recording";
import { MAX_READING_CHARS } from "@/lib/estonian/readingText";
import { playRecording, type PlayingRecording } from "@/lib/audio/clip";
import { fill } from "@/lib/copy/locale";
import { keepUnits } from "@/lib/copy/values";

/** The rate a recording is decoded at: what the recognizer hears, and plenty for a voice. */
const DECODE_RATE = 16_000;

type Stage =
  | { readonly kind: "idle" }
  | { readonly kind: "asking"; readonly file: File }
  | { readonly kind: "downloading"; readonly file: File }
  | { readonly kind: "opening"; readonly name: string }
  | { readonly kind: "hearing"; readonly name: string; readonly done: number; readonly total: number }
  | { readonly kind: "reading"; readonly name: string }
  | { readonly kind: "done" };

/** The recording in hand, for as long as the page is open, and nowhere else. */
interface Opened {
  readonly name: string;
  readonly samples: Float32Array;
  readonly rate: number;
  readonly seconds: number;
  /** Longer than the cap, so only its beginning was heard. */
  readonly cut: boolean;
  /** The learner pressed stop partway. */
  readonly stopped: boolean;
  readonly pieces: readonly TranscribedPiece[];
}

/** What came back from the dictionary, or null where it could not be asked (offline). */
interface Glossed {
  readonly tokens: readonly GlossedToken[][];
  readonly known: (word: string) => boolean | undefined;
}

/** Safari opens an Ogg voice message only partly; said before and after, never left to a silent failure. */
function onSafari(): boolean {
  return typeof navigator !== "undefined" && /^((?!chrome|chromium|android|crios|fxios).)*safari/i.test(navigator.userAgent);
}

/**
 * OPEN A RECORDING, AND READ WHAT WAS SAID (docs/41-fifth-batch.md, VB-12).
 *
 * Beside "paste a text", the reading page takes a voice message: picked, or on
 * a desktop dragged onto the page from a messaging app's own window. The
 * browser decodes it, the speech engine hears it on this device in pieces cut
 * at its pauses (with a bar that moves and a way to stop), and what comes back
 * is the reading page's own view: a line per piece, the dictionary under every
 * word, and each line played again from the recording itself, slowed to the
 * learner's own pace by the one stretch every clip in the app goes through.
 *
 * NOTHING SOMEBODY ELSE SAID IS KEPT (D16). The sound is never uploaded,
 * stored or sent, TartuNLP included: it lives in this component's state and
 * goes when the learner leaves. The one request is the transcript's text, to
 * the same glossing a pasted text gets, which keeps nothing either. And the
 * transcript is never Estonian the app vouches for: it is labelled as what a
 * machine heard, the words it was least sure of carry a wavy underline, and a
 * word reaches the deck only through the dictionary entry its underline opens.
 */
export function Recording({ onActive }: { readonly onActive: (active: boolean) => void }) {
  const t = useT();
  const { pace } = useAudioPrefs();
  const speech = useSpeech();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [opened, setOpened] = useState<Opened | null>(null);
  const [glossed, setGlossed] = useState<Glossed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState<{ readonly line: number | "all"; readonly slow: boolean } | null>(null);
  const player = useRef<PlayingRecording | null>(null);
  const stopping = useRef(false);
  const latest = useRef(speech);
  latest.current = speech;

  const active = stage.kind !== "idle";
  useEffect(() => onActive(active), [active, onActive]);
  useEffect(() => () => player.current?.stop(), []);

  const reset = () => {
    player.current?.stop();
    setPlaying(null);
    setOpened(null);
    setGlossed(null);
    setError(null);
    setStage({ kind: "idle" });
  };

  const lines = useMemo(() => {
    if (!opened) return [];
    return transcriptLines(opened.pieces, { known: glossed?.known, maxChars: MAX_READING_CHARS }).lines;
  }, [opened, glossed]);

  const lookUp = useCallback(async (heard: readonly HeardLine[]) => {
    const result = await readHeard(heard.map((line) => line.hearing.understood)).catch(() => null);
    if (!result || !result.ok) return null;
    const asked = new Set(result.asked);
    const yes = new Set(result.known);
    return {
      tokens: result.lines.map((line) => line.tokens),
      known: (word: string) => (asked.has(word) ? yes.has(word) : undefined),
    } satisfies Glossed;
  }, []);

  /** Decode, hear, look up: the whole path from a file to a transcript. */
  const hear = useCallback(async (file: File) => {
    setError(null);
    setStage({ kind: "opening", name: file.name });
    let samples: Float32Array;
    let rate: number;
    try {
      const bytes = await file.arrayBuffer();
      let context: OfflineAudioContext;
      try {
        context = new OfflineAudioContext(1, 1, DECODE_RATE);
      } catch {
        // A browser with a narrower range of rates: decode at its own, and the engine resamples.
        context = new OfflineAudioContext(1, 1, 44_100);
      }
      const decoded = await context.decodeAudioData(bytes);
      rate = decoded.sampleRate;
      samples = mono(Array.from({ length: decoded.numberOfChannels }, (_, c) => decoded.getChannelData(c)));
    } catch {
      setError(isOggOpus(file.name, file.type)
        ? t("This browser couldn't open an Ogg voice message. Safari opens them only partly: open this page in Chrome or Firefox, or save the message as MP3 or M4A.")
        : t("That file couldn't be opened as sound. A voice message saved as MP3, M4A, Ogg or WAV works."));
      setStage({ kind: "idle" });
      return;
    }
    const cap = Math.round(MAX_RECORDING_SECONDS * rate);
    const cut = samples.length > cap;
    if (cut) samples = samples.slice(0, cap);
    const seconds = samples.length / rate;

    setStage({ kind: "hearing", name: file.name, done: 0, total: 0 });
    stopping.current = false;
    let pieces: TranscribedPiece[];
    try {
      pieces = await latest.current.transcribe(samples, rate, (done, total) =>
        setStage({ kind: "hearing", name: file.name, done, total }));
    } catch (failure) {
      const why = failure instanceof EngineFailure ? failure.error : "failed";
      if (why === "not-downloaded" || why === "cleared" || why === "hash-failed") {
        setStage({ kind: "asking", file });
        return;
      }
      setError(why === "too-slow"
        ? t("This device is too slow to hear a recording, so it wasn't opened. Pasting the text still works.")
        : t("The recording couldn't be heard just now. Try it again."));
      setStage({ kind: "idle" });
      return;
    }
    const stopped = stopping.current;
    const first = transcriptLines(pieces, { maxChars: MAX_READING_CHARS }).lines;
    if (first.length === 0) {
      setError(stopped
        ? t("You stopped it before any words were heard.")
        : t("No words were heard in that recording. It may be music, or very quiet."));
      setStage({ kind: "idle" });
      return;
    }
    setOpened({ name: file.name, samples, rate, seconds, cut, stopped, pieces });
    setStage({ kind: "reading", name: file.name });
    setGlossed(await lookUp(first));
    setStage({ kind: "done" });
  }, [lookUp, t]);

  /** A file picked or dropped: checked, the download asked for where it is missing, then heard. */
  const take = useCallback((file: File) => {
    setError(null);
    if (!looksLikeAudio(file.name, file.type)) {
      setError(t("That isn't a sound file. A voice message saved as MP3, M4A, Ogg or WAV works."));
      return;
    }
    if (file.size > MAX_RECORDING_BYTES) {
      setError(t("That file is far larger than a voice message, so it wasn't opened."));
      return;
    }
    const phase = latest.current.phase;
    if (phase === "needs-download" || phase === "cleared" || phase === "error") {
      setStage({ kind: "asking", file });
      return;
    }
    void hear(file);
  }, [hear, t]);

  const download = async (file: File) => {
    setStage({ kind: "downloading", file });
    await latest.current.download();
    if (latest.current.phase === "ready") void hear(file);
    else {
      setError(t("The download stopped. Check your connection and try again."));
      setStage({ kind: "idle" });
    }
  };

  // A file dragged over the window lands on the page, which is how a desktop shares a voice message (D25).
  useEffect(() => {
    if (stage.kind !== "idle" || !speech.offered) return;
    const carriesFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      depth += 1;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) take(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      setDragging(false);
    };
  }, [stage.kind, speech.offered, take]);

  const play = (line: number | "all", slow: boolean) => {
    if (!opened) return;
    const same = playing?.line === line && playing.slow === slow;
    player.current?.stop();
    player.current = null;
    if (same) {
      setPlaying(null);
      return;
    }
    const target = line === "all" ? null : lines[line];
    const samples = target ? sliceOf(opened.samples, opened.rate, target) : opened.samples;
    const handle = playRecording({ samples, rate: opened.rate }, { pace, slow, asItWas: line === "all" });
    player.current = handle;
    setPlaying({ line, slow });
    void handle.ended.catch(() => "played").then(() => {
      if (player.current === handle) {
        player.current = null;
        setPlaying(null);
      }
    });
  };

  if (!speech.offered && speech.why !== "too-slow") return null;

  if (stage.kind === "done" && opened) {
    return (
      <div className="flex flex-col gap-6" data-recording>
        <Note tone="hard">
          <span className="flex items-start gap-2">
            <AudioLines size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              {fill(t("This is what the machine heard. Words with a wavy underline are the ones it was least sure of. In a quiet room it gets about one word in {n} wrong, and more with music or talk behind it."), { n: oneIn(WORDS_WRONG_QUIET) })}
            </span>
          </span>
        </Note>
        <article
          className="flex flex-col gap-1 rounded-lg border p-3 md:p-4"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
          data-reading
          aria-label={fill(t("What was heard in {name}"), { name: opened.name })}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3">
            <span className="flex min-w-0 items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
              <FileAudio size={16} aria-hidden className="shrink-0" />
              <span className="min-w-0">{opened.name}</span>
              <span className="tnum shrink-0" style={{ color: "var(--ink-3)" }}>{clock(opened.seconds)}</span>
            </span>
            <button
              type="button"
              onClick={() => play("all", false)}
              aria-pressed={playing?.line === "all"}
              className="press tap-tint inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
              style={{ color: "var(--ink-2)" }}
            >
              {playing?.line === "all" ? <Square size={13} fill="currentColor" aria-hidden /> : <Play size={14} aria-hidden />}
              {playing?.line === "all" ? t("Stop") : t("Hear it all as it was")}
            </button>
          </div>
          {lines.map((line, i) => {
            const tokens = glossed?.tokens[i];
            const now = playing?.line === i;
            return (
              <div key={i} className="recording-line flex items-start gap-3 rounded-[var(--r)] px-2 py-2" data-playing={now ? "true" : "false"}>
                <LinePlay
                  at={clock(line.from)}
                  playing={now ? playing!.slow : null}
                  onPlay={(slow) => play(i, slow)}
                />
                <div className="min-w-0 flex-1 pt-0.5">
                  {tokens ? (
                    <GlossedSentence
                      tokens={tokens}
                      sentence={line.hearing.understood}
                      prose
                      offerTurnOff={false}
                      speak={false}
                      doubtful={doubtfulTokens(tokens, line.hearing.words)}
                    />
                  ) : (
                    <PlainLine words={line.hearing.words.map((w) => ({ text: w.text, unsure: w.unsure }))} />
                  )}
                </div>
              </div>
            );
          })}
        </article>
        {opened.cut && (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(t("Only the first {minutes} minutes were heard, which is as long as a recording can be here."), { minutes: MAX_RECORDING_SECONDS / 60 })}
          </p>
        )}
        {opened.stopped && (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {t("You stopped it partway, so this is the beginning of the recording.")}
          </p>
        )}
        {!glossed && (
          <div className="flex flex-wrap items-center gap-3" role="status">
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              {t("The dictionary needs a connection, so the words aren't underlined yet.")}
            </p>
            <Button variant="secondary" size="sm" onClick={async () => setGlossed(await lookUp(lines))}>
              {t("Look the words up")}
            </Button>
          </div>
        )}
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {t("The sound stayed on this device. Only the words went to the dictionary, and nothing was kept.")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={reset}>{t("Open another recording")}</Button>
        </div>
      </div>
    );
  }

  if (stage.kind === "opening" || stage.kind === "hearing" || stage.kind === "reading") {
    const share = stage.kind === "hearing" && stage.total > 0 ? stage.done / stage.total : stage.kind === "reading" ? 1 : 0;
    const line = stage.kind === "opening"
      ? t("Opening the recording")
      : stage.kind === "reading"
        ? t("Looking the words up")
        : stage.total === 0
          ? t("Getting ready to listen")
          : fill(t("Hearing it on this device: {done} of {total} pieces"), { done: stage.done, total: stage.total });
    return (
      <Panel>
        <p className="flex min-w-0 items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
          <FileAudio size={16} aria-hidden className="shrink-0" />
          <span className="min-w-0">{stage.name}</span>
        </p>
        <p className="mt-3 flex items-center gap-2 font-semibold" role="status" style={{ color: "var(--ink)" }}>
          <Loader2 size={16} className="animate-spin" aria-hidden /> {line}
        </p>
        <div className="recording-meter mt-3" aria-hidden><span style={{ width: `${Math.round(share * 100)}%` }} /></div>
        {stage.kind === "hearing" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm" style={{ color: "var(--ink-2)" }}>
              {t("A long message can take a minute on a phone. Stop, and you'll read what was heard so far.")}
            </p>
            <Button variant="secondary" size="sm" onClick={() => { stopping.current = true; latest.current.cancel(); }}>
              <Square size={13} fill="currentColor" aria-hidden /> {t("Stop here")}
            </Button>
          </div>
        )}
      </Panel>
    );
  }

  if (stage.kind === "asking" || stage.kind === "downloading") {
    const total = megabytes(modelBytes());
    const progress = speech.progress;
    return (
      <Panel>
        <p className="flex min-w-0 items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
          <FileAudio size={16} aria-hidden className="shrink-0" />
          <span className="min-w-0">{stage.file.name}</span>
        </p>
        {stage.kind === "asking" ? (
          <div className="mt-3 flex flex-col gap-3" role="group" aria-label={t("Download for speaking")}>
            <p className="text-base" style={{ color: "var(--ink)" }}>
              {speech.phase === "cleared"
                ? keepUnits(fill(t("Your browser cleared the speaking download to save space. Getting it back is {mb} MB, once."), { mb: total }))
                : keepUnits(fill(t("Hearing a recording needs a one-time download of {mb} MB. It stays on this device, so nothing you open is ever sent anywhere."), { mb: total }))}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>{t("Not now")}</Button>
              <Button size="sm" variant="primary" onClick={() => void download(stage.file)}>
                {keepUnits(fill(t("Download {mb} MB"), { mb: total }))}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 flex items-center gap-2 font-semibold" role="status" style={{ color: "var(--ink)" }}>
              <Loader2 size={16} className="animate-spin" aria-hidden />
              {progress.total > 0
                ? keepUnits(fill(t("Downloading {done} of {total} MB"), { done: megabytes(progress.done), total: megabytes(progress.total) }))
                : t("Starting the download")}
            </p>
            <div className="recording-meter mt-3" aria-hidden>
              <span style={{ width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%` }} />
            </div>
          </>
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <h2 className="flex items-center gap-2 text-md font-bold" style={{ color: "var(--ink)" }}>
        <AudioLines size={18} aria-hidden style={{ color: "var(--accent-deep)" }} /> {t("Or open a recording")}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        {fill(t("A voice message from a landlord, a colleague or your child's teacher, up to {minutes} minutes. It's heard on this device, and the sound never leaves it."), { minutes: MAX_RECORDING_SECONDS / 60 })}
      </p>
      {speech.why === "too-slow" ? (
        <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
          {t("This device is too slow to hear a recording, so pasting the text is the way in here.")}
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label
              className="press btn inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r)] border px-4 py-2.5 text-sm font-semibold transition-ui focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"
              style={{ background: "var(--surface)", color: "var(--ink)", borderColor: "var(--rule)", boxShadow: "var(--shadow-sm)" }}
            >
              <Upload size={15} aria-hidden />
              {t("Choose a recording")}
              <input
                type="file"
                accept="audio/*,.ogg,.oga,.opus,.m4a,.mp3,.wav,.webm,.aac,.amr"
                className="sr-only"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (file) take(file);
                }}
              />
            </label>
            <span className="recording-drop-hint text-sm" style={{ color: "var(--ink-3)" }}>{t("or drop one onto this page")}</span>
          </div>
          {onSafari() && (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
              {t("Safari opens Ogg voice messages only partly. MP3 and M4A always open.")}
            </p>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--again-ink)" }}>{error}</p>}
      {dragging && (
        <div className="recording-drop" aria-hidden>
          <span className="flex items-center gap-2 text-lg font-bold" style={{ color: "var(--accent-deep)" }}>
            <Upload size={20} /> {t("Drop the recording to hear it")}
          </span>
        </div>
      )}
    </Panel>
  );
}

function Panel({ children }: { readonly children: ReactNode }) {
  return (
    <section className="rounded-lg border p-5" style={{ borderColor: "var(--rule)", background: "var(--surface)" }} data-recording>
      {children}
    </section>
  );
}

/**
 * One line's play control: the recording at the learner's own pace, and
 * slower, as one pill (the shape `SpeakPair` gives the app's own voice), with
 * where in the recording the line starts.
 */
function LinePlay({ at, playing, onPlay }: {
  readonly at: string;
  /** Null when this line is not playing; otherwise whether it is the slow half. */
  readonly playing: boolean | null;
  readonly onPlay: (slow: boolean) => void;
}) {
  const t = useT();
  const half = "press tap-tint inline-flex items-center justify-center rounded-full";
  return (
    <span className="flex shrink-0 flex-col items-center gap-0.5">
      <span className="inline-flex items-center rounded-full border" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
        <button
          type="button"
          className={`${half} px-2.5 py-1.5`}
          style={{ color: "var(--ink-2)" }}
          aria-pressed={playing === false}
          aria-label={playing === false ? t("Stop") : fill(t("Play from {at}, at your pace"), { at })}
          onClick={() => onPlay(false)}
        >
          {playing === false ? <Square size={13} fill="currentColor" aria-hidden /> : <Play size={15} aria-hidden />}
        </button>
        <span aria-hidden className="h-4 w-px shrink-0" style={{ background: "var(--rule)" }} />
        <button
          type="button"
          className={`${half} whitespace-nowrap px-2.5 py-1.5 text-sm font-semibold`}
          style={{ color: "var(--ink-3)" }}
          aria-pressed={playing === true}
          aria-label={playing === true ? t("Stop") : fill(t("Play from {at}, slowly"), { at })}
          onClick={() => onPlay(true)}
        >
          {playing === true ? <Square size={13} fill="currentColor" aria-hidden /> : t("Slow")}
        </button>
      </span>
      <span className="tnum text-xs" style={{ color: "var(--ink-3)" }}>{at}</span>
    </span>
  );
}

/** A line with no dictionary under it yet, offline: the words, the unsure ones marked the same way. */
function PlainLine({ words }: { readonly words: readonly { readonly text: string; readonly unsure: boolean }[] }) {
  const t = useT();
  return (
    <p lang="et" className="text-md leading-relaxed" style={{ color: "var(--ink)" }}>
      {words.map((w, i) => (
        <span key={i}>
          {w.unsure ? <><span className="heard-unsure">{w.text}</span><span className="sr-only"> ({t("heard least surely")})</span></> : w.text}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
