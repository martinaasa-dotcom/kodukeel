"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useT } from "@/components/Locale";
import { Button } from "@/components/Button";
import { fill } from "@/lib/copy/locale";
import { megabytes, modelBytes } from "@/lib/speech/model";
import type { EngineError } from "@/lib/speech/engine";
import type { Speech } from "./useSpeech";
import { keepUnits } from "@/lib/copy/values";

/**
 * THE ONE MICROPHONE (docs/41-fifth-batch.md, VB-2).
 *
 * One button, one look and one set of states for every screen that listens,
 * so no screen invents its own. Press to talk, press again (or pause) to
 * stop; under a coarse pointer, holding it is talking and letting go ends the
 * turn. While it listens it shows a level ring, the words so far and a warning
 * before the sound clips. It is disabled while the app itself is speaking, so
 * it never hears its own voice (D14).
 *
 * Every state the engine can be in has words, and every error has the typed
 * way on beside it: the screen under this button still does its job by typing
 * (section 3: every microphone works with the microphone denied).
 *
 * What was heard is announced, one line at a time, in a live region (D12).
 */

export interface MicButtonProps {
  readonly speech: Speech;
  /** What the button does, for a screen reader and a tooltip: "Answer out loud". */
  readonly label?: string;
  /** Bind the keyboard shortcut. One button per screen does. */
  readonly shortcut?: boolean;
  /** Show the words so far under the button while listening. Off where the screen shows them in its own box. */
  readonly showPartial?: boolean;
  readonly size?: "md" | "lg";
  /**
   * The screen says what was heard and what went wrong in its own words, so
   * the button says neither: the landing café's way on is picking a line, and
   * its own status line names the heard words with what happens next, which
   * a second live region here would read out twice (VB-15).
   */
  readonly speaksForItself?: boolean;
}

/** The shortcut: Control and M, which types nothing on any keyboard Estonian is written on. */
export const MIC_SHORTCUT = { key: "m", label: "Ctrl M" } as const;

/** Pressed for longer than this under a finger, a press is talking while held. */
const HOLD_MS = 350;

export function MicButton({ speech, label, shortcut = false, showPartial = true, size = "md", speaksForItself = false }: MicButtonProps) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  const [announce, setAnnounce] = useState("");
  const pressedAt = useRef(0);
  const held = useRef(false);
  const latest = useRef(speech);
  latest.current = speech;

  const { offered, phase, listening, thinking, partial, level, clipping, error, hearing, appSpeaking } = speech;
  const megabytesTotal = megabytes(modelBytes());

  useEffect(() => {
    if (hearing && !speaksForItself) setAnnounce(hearing.understood ? fill(t("Heard: {text}"), { text: hearing.understood }) : t("Nothing was heard."));
  }, [hearing, speaksForItself, t]);

  const press = () => {
    const s = latest.current;
    if (s.listening) {
      s.stop();
      return;
    }
    if (s.thinking || s.appSpeaking) return;
    if (s.phase === "needs-download" || s.phase === "cleared") {
      setAsking(true);
      return;
    }
    if (s.phase === "downloading") return;
    void s.start();
  };

  // The shortcut: a tap starts or stops; held, it is push-to-talk and letting go ends the turn.
  useEffect(() => {
    if (!shortcut || !offered) return;
    const down = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey || e.key.toLowerCase() !== MIC_SHORTCUT.key || e.repeat) return;
      e.preventDefault();
      pressedAt.current = Date.now();
      press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== MIC_SHORTCUT.key && e.key !== "Control") return;
      if (pressedAt.current && Date.now() - pressedAt.current > HOLD_MS && latest.current.listening) latest.current.stop();
      pressedAt.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // `press` reads the latest speech through a ref, so it is not a dependency.
  }, [shortcut, offered]);

  if (!offered) return null;

  const download = async () => {
    setAsking(false);
    await speech.download();
    // The press that asked was a press to talk; once the model is here, talk.
    if (latest.current.phase === "ready") void latest.current.start();
  };

  const metered = typeof navigator !== "undefined" && meteredConnection();
  const big = size === "lg";
  const dim = big ? "h-14 w-14" : "h-11 w-11";
  const busy = phase === "loading" || phase === "downloading" || thinking;

  const status: string | null =
    phase === "downloading" ? downloadingLine(t, speech.progress.done, speech.progress.total)
    : phase === "loading" ? t("Getting ready to listen")
    : thinking ? t("Reading what you said")
    : listening ? t("Listening. Press again when you are done.")
    : null;

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Wraps rather than squeezing: beside a 44px button in a narrow column the status line would otherwise break inside a word. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          className={`speech-mic press relative inline-flex shrink-0 items-center justify-center rounded-full ${dim}`}
          data-state={listening ? "listening" : busy ? "busy" : "idle"}
          aria-pressed={listening}
          aria-label={listening ? t("Stop listening") : label ?? t("Say it out loud")}
          aria-keyshortcuts={shortcut ? "Control+M" : undefined}
          title={shortcut ? `${label ?? t("Say it out loud")} (${MIC_SHORTCUT.label})` : undefined}
          disabled={appSpeaking && !listening}
          aria-busy={busy || undefined}
          onClick={() => {
            if (held.current) {
              held.current = false;
              return;
            }
            press();
          }}
          onPointerDown={(e) => {
            if (e.pointerType !== "touch") return;
            pressedAt.current = Date.now();
            const at = pressedAt.current;
            setTimeout(() => {
              // Still down after the hold: talk while held.
              if (pressedAt.current === at && !latest.current.listening && latest.current.phase === "ready") {
                held.current = true;
                void latest.current.start();
              }
            }, HOLD_MS);
          }}
          onPointerUp={() => {
            const wasHeld = held.current && Date.now() - pressedAt.current > HOLD_MS;
            pressedAt.current = 0;
            if (wasHeld && latest.current.listening) latest.current.stop();
          }}
          onPointerCancel={() => {
            pressedAt.current = 0;
          }}
          style={{ "--mic-level": String(level) } as CSSProperties}
        >
          {busy ? (
            <Loader2 size={big ? 24 : 20} className="animate-spin" aria-hidden />
          ) : listening ? (
            <Square size={big ? 20 : 16} fill="currentColor" aria-hidden />
          ) : (
            <Mic size={big ? 24 : 20} aria-hidden />
          )}
        </button>
        {status && <p className="text-sm" style={{ color: "var(--ink-2)" }}>{status}</p>}
      </div>

      {listening && showPartial && partial && (
        <p lang="et" className="speech-partial text-md" style={{ color: "var(--ink)" }}>{partial}</p>
      )}
      {listening && clipping && (
        <p className="text-sm" style={{ color: "var(--hard-ink)" }}>{t("That is very loud. Hold the microphone a little further away.")}</p>
      )}

      {asking && (
        <div className="explain-panel flex max-w-prose flex-col gap-3" role="group" aria-label={t("Download for speaking")}>
          <p className="text-sm" style={{ color: "var(--ink)" }}>
            {phase === "cleared"
              ? keepUnits(fill(t("Your browser cleared the speaking download to save space. Getting it back is {mb} MB, once."), { mb: megabytesTotal }))
              : keepUnits(fill(t("Speaking is new. It needs a one-time download of {mb} MB, which stays on this device, so hearing works offline and nothing you say ever leaves it."), { mb: megabytesTotal }))}
          </p>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {t("What you see is the machine's hearing. You can always change it before it counts.")}
          </p>
          {metered && (
            <p className="text-sm" style={{ color: "var(--hard-ink)" }}>{t("You seem to be on mobile data, so you might want to wait for Wi-Fi.")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>{t("Not now")}</Button>
            <Button size="sm" onClick={() => void download()}>{keepUnits(fill(t("Download {mb} MB"), { mb: megabytesTotal }))}</Button>
          </div>
        </div>
      )}

      {error && !asking && !speaksForItself && <MicError error={error} onRetry={error === "download-failed" || error === "hash-failed" ? () => void speech.download() : null} />}

      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </div>
  );
}

function downloadingLine(t: (english: string) => string, done: number, total: number): string {
  if (total <= 0) return t("Starting the download");
  return keepUnits(fill(t("Downloading {done} of {total} MB"), { done: megabytes(done), total: megabytes(total) }));
}

/** The browser says it is on a metered connection, where it says anything. */
function meteredConnection(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; type?: string } }).connection;
  return Boolean(connection?.saveData) || connection?.type === "cellular";
}

/** Every error in words, with the typed way on (VB-2). */
export function MicError({ error, onRetry }: { readonly error: EngineError; readonly onRetry: (() => void) | null }) {
  const t = useT();
  const line: Record<EngineError, string> = {
    "no-microphone": t("No microphone was found. Typing works as before."),
    refused: t("The microphone is blocked for this site. You can allow it in your browser's site settings, or keep typing."),
    "not-downloaded": t("Speaking needs its download first."),
    cleared: t("Your browser cleared the speaking download. Press the microphone to get it back."),
    "hash-failed": t("The download did not check out, so it was not used. Try it again."),
    "too-slow": t("This device is too slow to hear speech as you say it, so typing stays as it was."),
    "no-room": t("There is not enough room on this device for the download."),
    "download-failed": t("The download stopped. Check your connection and try again."),
    failed: t("Something went wrong with listening. Typing works as before."),
  };
  return (
    <div className="flex flex-wrap items-center gap-2" role="status">
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>{line[error]}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>{t("Try again")}</Button>}
    </div>
  );
}
