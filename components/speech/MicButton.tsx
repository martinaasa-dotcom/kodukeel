"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useT } from "@/components/Locale";
import { Button } from "@/components/Button";
import { fill } from "@/lib/copy/locale";
import { fillNodes } from "@/components/TemplateNodes";
import { megabytes } from "@/lib/speech/model";
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
  /**
   * Whether the screen has a box to type in instead. An error says "keep
   * typing" only where there is somewhere to type; on a screen of saying
   * along there is not, and the way on is to say it anyway.
   */
  readonly fallback: MicFallback;
}

/** What a learner does where the microphone will not: type in the box beside it, or say it anyway. */
export type MicFallback = "box" | "none";

/** The shortcut: Control and M, which types nothing on any keyboard Estonian is written on. */
export const MIC_SHORTCUT = { key: "m", label: "Ctrl M" } as const;

/** Pressed for longer than this under a finger, a press is talking while held. */
const HOLD_MS = 350;

export function MicButton({ speech, label, shortcut = false, showPartial = true, size = "md", speaksForItself = false, fallback }: MicButtonProps) {
  const t = useT();
  const [announce, setAnnounce] = useState<ReactNode>("");
  const pressedAt = useRef(0);
  const held = useRef(false);
  const latest = useRef(speech);
  latest.current = speech;

  const { offered, phase, listening, thinking, partial, level, clipping, error, hearing, appSpeaking, silent } = speech;

  useEffect(() => {
    if ((!hearing && !silent) || speaksForItself) return;
    // The heard words are Estonian inside a line in the screen's language, so a screen reader says them as Estonian.
    const line: ReactNode = hearing?.understood
      ? fillNodes(t("Heard: {text}"), { text: <span lang="et">{hearing.understood}</span> })
      : t("Nothing was heard.");
    /* The same words twice is two turns, and a live region whose text did not
       change says nothing the second time: it is emptied and filled again on
       the next frame, so the second "Heard: tere" is read out too (D12). */
    setAnnounce("");
    const frame = requestAnimationFrame(() => setAnnounce(line));
    return () => cancelAnimationFrame(frame);
  }, [hearing, silent, speaksForItself, t]);

  const press = () => {
    const s = latest.current;
    if (s.listening) {
      s.stop();
      return;
    }
    if (s.thinking || s.appSpeaking) return;
    if (s.phase === "needs-download" || s.phase === "cleared" || s.phase === "downloading") {
      // The model usually arrived in the background already (SpeechPrefetch).
      // Where it has not, this press fetches it, or waits for the fetch under
      // way, and then listens: the press was a press to talk.
      void (async () => {
        await s.download();
        if (latest.current.phase === "ready") void latest.current.start();
      })();
      return;
    }
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

  const big = size === "lg";
  const dim = big ? "h-14 w-14" : "h-11 w-11";
  const busy = phase === "loading" || phase === "downloading" || thinking;

  const status: string | null =
    phase === "downloading" ? downloadingLine(t, speech.progress.done, speech.progress.total)
    : phase === "loading" ? t("Getting ready to listen")
    : thinking ? t("Reading what you said")
    : listening ? t("Listening. Press again when you are done.")
    // A turn that closed on its own with nothing said says so, rather than the button just going quiet.
    : silent && !speaksForItself ? t("Nothing was heard.")
    : null;

  return (
    <div className="flex flex-col items-start gap-3">
      {/* The status line stays beside the button and wraps inside its own
          column, by words: wrapped under the button, it sat inside the level
          ring and the ring drew over its first words. The gap clears the ring
          at its widest (`.speech-mic` in globals.css). */}
      <div className="flex max-w-full items-center gap-4">
        <button
          type="button"
          className={`speech-mic press relative inline-flex shrink-0 items-center justify-center rounded-full ${dim}`}
          data-state={listening ? "listening" : busy ? "busy" : "idle"}
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
            /* A long press a browser kept for itself (a context menu, a
               scroll) can end with no click, which would leave `held` set and
               eat the next ordinary tap. Every press starts clean. */
            held.current = false;
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
            // The browser took the finger mid-hold: the turn ends with what was said, as letting go does.
            if (held.current && latest.current.listening) latest.current.stop();
            held.current = false;
            pressedAt.current = 0;
          }}
          onContextMenu={(e) => {
            // Holding to talk is not a request for the browser's long-press menu.
            if (pressedAt.current !== 0) e.preventDefault();
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
        {status && <p className="min-w-0 flex-1 text-sm" style={{ color: "var(--ink-2)" }}>{status}</p>}
      </div>

      {listening && showPartial && partial && (
        <p lang="et" className="speech-partial text-md" style={{ color: "var(--ink)" }}>{partial}</p>
      )}
      {listening && clipping && (
        <p className="text-sm" style={{ color: "var(--hard-ink)" }}>{t("That is very loud. Hold the microphone a little further away.")}</p>
      )}

      {error && !speaksForItself && <MicError error={error} fallback={fallback} onRetry={error === "download-failed" || error === "hash-failed" ? () => void speech.download() : null} />}

      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </div>
  );
}

function downloadingLine(t: (english: string) => string, done: number, total: number): string {
  if (total <= 0) return t("Starting the download");
  return keepUnits(fill(t("Downloading {done} of {total} MB"), { done: megabytes(done), total: megabytes(total) }));
}

/** Every error in words, with the typed way on (VB-2). */
export function MicError({ error, fallback, onRetry }: { readonly error: EngineError; readonly fallback: MicFallback; readonly onRetry: (() => void) | null }) {
  const t = useT();
  const box = fallback === "box";
  const line: Record<EngineError, string> = {
    "no-microphone": box ? t("No microphone was found. Typing works as before.") : t("No microphone was found. Say it out loud anyway and carry on."),
    refused: box
      ? t("The microphone is blocked for this site. You can allow it in your browser's site settings, or keep typing.")
      : t("The microphone is blocked for this site. You can allow it in your browser's site settings, or say it out loud anyway and carry on."),
    "not-downloaded": t("Speaking needs its download first."),
    cleared: t("Your browser cleared the speaking download. Press the microphone to get it back."),
    "hash-failed": t("The download did not check out, so it was not used. Try it again."),
    "too-slow": box ? t("This device is too slow to hear speech as you say it, so typing stays as it was.") : t("This device is too slow to hear speech as you say it. Say it out loud anyway and carry on."),
    "no-room": t("There is not enough room on this device for the download."),
    "download-failed": t("The download stopped. Check your connection and try again."),
    failed: box ? t("Something went wrong with listening. Typing works as before.") : t("Something went wrong with listening. Say it out loud anyway and carry on."),
  };
  /* Mounted empty and filled a frame later, so the reason is read when it arrives rather than slipping in with the region. */
  const [said, setSaid] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSaid(line[error]));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p role="status" className="sr-only">{said}</p>
      <p className="text-sm" style={{ color: "var(--ink-2)" }} aria-hidden>{line[error]}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>{t("Try again")}</Button>}
    </div>
  );
}
