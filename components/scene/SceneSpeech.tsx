"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { MicButton, MicError } from "@/components/speech/MicButton";
import { useSpeech } from "@/components/speech/useSpeech";
import { useT } from "@/components/Locale";
import { SceneFace } from "./SceneFace";
import { Ear } from "lucide-react";
import { Button } from "@/components/Button";
import { Speak } from "@/components/Speak";
import { ReadAloud } from "@/components/speech/ReadAloud";
import { fill } from "@/lib/copy/locale";
import { untilQuiet } from "@/lib/audio/clip";
import { VOICE_CAP_MS } from "@/lib/scenes/pacing";
import { SEND_RING_MS } from "@/lib/speech/matchPick";
import type { EngineError } from "@/lib/speech/engine";
import type { Hearing } from "@/lib/speech/reconcile";

/**
 * A CONVERSATION, SAID ALOUD (docs/41-fifth-batch.md, VB-4).
 *
 * The microphone in the panel a learner answers in, and the two things that
 * make speaking a conversation feel like one: the words appearing in the box as
 * they are said, and on a call, the microphone opening by itself after the other
 * side has spoken.
 *
 * ITS OWN COMPONENT, BECAUSE OF WHAT CHANGES SEVERAL TIMES A SECOND. The level
 * ring and the words heard so far arrive many times a second, and a hook in the
 * conversation would re-render every bubble above the box with each of them.
 * Here they re-render this button and nothing else, and the words so far are
 * written straight into the box's own element rather than through the
 * conversation's state: the box is a controlled field, its value is the draft,
 * and the draft is set once, from the finished reading, when the turn is heard.
 * Writing the element moves no focus, which is the trip hazard the brief names:
 * the caret stays wherever the learner left it.
 *
 * NOTHING HERE DECIDES WHAT WAS SAID. What was heard goes to `onHeard`, and the
 * conversation decides whether it lit a line on screen or goes into the box.
 */

export interface MicState {
  readonly listening: boolean;
  readonly thinking: boolean;
  /** The microphone can be offered here at all, on this device. */
  readonly offered: boolean;
}

export interface SceneMicProps {
  /** The box the words so far are written into, or null where they show under the button. */
  readonly box: RefObject<HTMLInputElement | null> | null;
  /** The spellings this moment could hold, lower-cased, for the dictionary's repairs. */
  readonly expect: ReadonlySet<string>;
  readonly onHeard: (hearing: Hearing) => void;
  /** A telephone call, where the microphone opens on its own after their line (VB-4 call mode). */
  readonly call: boolean;
  /**
   * Moves on each time the other side has finished saying something and the
   * floor is the learner's. On a call, once the learner has pressed the
   * microphone once in this run, a new value opens it after the line has played.
   */
  readonly cue: number;
  /** A turn is in flight or the room is moving: the microphone stays shut. */
  readonly closed: boolean;
  readonly label: string;
  readonly size?: "md" | "lg";
  /** Told when listening starts or stops, never on a level or a partial, so the conversation re-renders at turn boundaries only. */
  readonly onState?: (state: MicState) => void;
}

/** The words so far, written into the box's own element, which is the one write that moves no focus and renders nothing. */
function writeInto(element: HTMLInputElement | null, text: string): void {
  if (element) element.value = text;
}

/** A frame or two for a line's own speaker to mount and start asking for its clip, as the conversation waits. */
const MOUNT_MS = 250;
/** A breath after their line ends, so the microphone does not open on the tail of their voice. */
const AFTER_LINE_MS = 350;

export function SceneMic({ box, expect, onHeard, call, cue, closed, label, size = "md", onState }: SceneMicProps) {
  const t = useT();
  const heard = useRef(onHeard);
  heard.current = onHeard;
  const speech = useSpeech({ endpoint: true, expect, onHeard: (hearing) => heard.current(hearing) });
  const latest = useRef(speech);
  latest.current = speech;
  const shut = useRef(closed);
  shut.current = closed;

  /*
    ARMED BY THE FIRST PRESS, NEVER BEFORE (D14 and VB-4). A call opens the
    microphone by itself only once the learner has chosen to speak in this run,
    so nobody's microphone opens because they opened a conversation.
  */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (speech.listening && !armed) setArmed(true);
  }, [speech.listening, armed]);

  // The words so far, into the box's own element: no render of the conversation, no focus moved.
  useEffect(() => {
    if (speech.listening) writeInto(box?.current ?? null, speech.partial);
  }, [box, speech.partial, speech.listening]);

  /*
    Closed the moment the app starts speaking: it never listens to its own
    voice (D14). And opened again once it has finished, because the commonest
    way to meet this is a learner pressing in the gap between their line
    arriving and its clip starting to play: closing it for good would throw
    their press away with nothing on the screen saying so.
  */
  const reopen = useRef(false);
  useEffect(() => {
    if (speech.listening && speech.appSpeaking) {
      reopen.current = true;
      speech.cancel();
    }
  }, [speech]);
  useEffect(() => {
    if (speech.appSpeaking || !reopen.current) return;
    let live = true;
    void (async () => {
      await untilQuiet(VOICE_CAP_MS);
      await new Promise((resume) => window.setTimeout(resume, AFTER_LINE_MS));
      const s = latest.current;
      if (!live || !reopen.current) return;
      reopen.current = false;
      if (shut.current || s.listening || s.thinking || s.appSpeaking || s.phase !== "ready") return;
      void s.start();
    })();
    return () => { live = false; };
  }, [speech.appSpeaking]);

  /*
    THE CARET COMES BACK TO THE MICROPHONE ONCE THE APP HAS SPOKEN. The button
    is disabled while a line plays (D14), and a browser drops focus to the body
    off a control it has just disabled, so a keyboard user who answered with
    the microphone was left with nothing focused after every one of the other
    side's lines. Only where focus was on it when the line started and is
    still nowhere when it ends: a learner who moved it meanwhile keeps it where
    they put it.
  */
  const root = useRef<HTMLDivElement>(null);
  const hadFocus = useRef(false);
  /*
    Read during the render, which is before the commit that disables the
    button: by the time an effect runs, the browser has already moved focus to
    the body and there is nothing left to ask.
  */
  const focusedBefore = useRef(false);
  if (typeof document !== "undefined" && root.current) focusedBefore.current = root.current.contains(document.activeElement);
  useEffect(() => {
    if (speech.appSpeaking) {
      hadFocus.current = focusedBefore.current || (root.current?.contains(document.activeElement) ?? false);
      return;
    }
    if (!hadFocus.current) return;
    hadFocus.current = false;
    if (document.activeElement === document.body || document.activeElement === null) {
      root.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    }
  }, [speech.appSpeaking]);

  const reported = useRef<string>("");
  const report = useRef(onState);
  report.current = onState;
  useEffect(() => {
    const key = `${speech.listening}${speech.thinking}${speech.offered}`;
    if (key === reported.current) return;
    reported.current = key;
    report.current?.({ listening: speech.listening, thinking: speech.thinking, offered: speech.offered });
  }, [speech.listening, speech.thinking, speech.offered]);

  /*
    THE CALL: AFTER THEIR LINE HAS PLAYED, THE MICROPHONE OPENS. It waits for
    the line's own speaker to mount and for every clip to finish, then a
    breath, and opens only if the floor is still the learner's and nothing else
    moved meanwhile. The engine waits up to eight seconds for speech to start
    and ends the turn on the measured silence once it has (`lib/speech/settings.ts`);
    if nothing is said it closes and the button is simply there again, so a
    learner thinking is never cut off by a silence they did not choose.
  */
  useEffect(() => {
    if (!call || !armed || cue === 0) return;
    let live = true;
    void (async () => {
      await new Promise((resume) => window.setTimeout(resume, MOUNT_MS));
      await untilQuiet(VOICE_CAP_MS);
      await new Promise((resume) => window.setTimeout(resume, AFTER_LINE_MS));
      const s = latest.current;
      if (!live || shut.current || s.listening || s.thinking || s.appSpeaking || s.phase !== "ready") return;
      void s.start();
    })();
    return () => { live = false; };
  }, [cue, call, armed]);

  if (!speech.offered) {
    return speech.why === "too-slow" ? <MicError error={"too-slow" satisfies EngineError} fallback={box === null ? "none" : "box"} onRetry={null} /> : null;
  }

  return (
    <div ref={root} className="flex flex-col gap-2" data-scene-mic={speech.listening ? "listening" : speech.thinking ? "thinking" : "idle"}>
      <MicButton speech={speech} label={label} shortcut size={size} showPartial={box === null} fallback={box === null ? "none" : "box"} />
      {call && armed && !speech.listening && !speech.thinking && (
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          {t("On a call the microphone opens by itself after they speak.")}
        </p>
      )}
    </div>
  );
}

/**
 * THE COUNTDOWN RING (D20): what was heard is sent on its own after a beat,
 * unless the learner touches the screen or the box first, which puts them in
 * charge of it. Drawn inside the button it will press, as a ring that empties,
 * and said in words for a reader who gets nothing from a drawing.
 *
 * Stopped by any press anywhere and by any key, heard before anything else
 * on the page hears it. A press on the button itself still presses it, which
 * is the learner sending it now rather than in a moment. Under
 * `prefers-reduced-motion` the ring holds still and the words carry it.
 */
export function SendRing({ onDone, onStop, announce = true }: {
  readonly onDone: () => void;
  readonly onStop: () => void;
  /**
   * Say it for a screen reader. Off where the screen already says it in a
   * status line of its own beside the ring (a conversation's lit line and its
   * box), so it is announced once rather than twice.
   */
  readonly announce?: boolean;
}) {
  const t = useT();
  const done = useRef(onDone);
  done.current = onDone;
  const stop = useRef(onStop);
  stop.current = onStop;
  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), SEND_RING_MS);
    const halt = () => {
      window.clearTimeout(timer);
      stop.current();
    };
    window.addEventListener("pointerdown", halt, { capture: true, once: true });
    window.addEventListener("keydown", halt, { capture: true, once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", halt, { capture: true });
      window.removeEventListener("keydown", halt, { capture: true });
    };
  }, []);
  return (
    <span className="inline-flex items-center gap-2" data-send-ring>
      <svg aria-hidden viewBox="0 0 20 20" className="send-ring h-5 w-5 shrink-0" style={{ "--ring-ms": `${SEND_RING_MS}ms` } as CSSProperties}>
        <circle cx="10" cy="10" r="8" className="send-ring-track" />
        <circle cx="10" cy="10" r="8" className="send-ring-fill" pathLength={100} />
      </svg>
      {announce && <span className="sr-only" role="status">{t("Sending in a moment. Press anywhere or any key to stop it.")}</span>}
    </span>
  );
}

/**
 * A CALL IN PROGRESS (VB-4), which is what a phone shows mid-call and nothing
 * more: the person on the line, how long it has been going, and whose turn it
 * is. No text of the conversation, because on a call there is none; the lines
 * still play, from the conversation mounted and hidden under this.
 *
 * The clock counts up and limits nothing (D9): it is the look of a call, and
 * no spoken answer anywhere in the app counts down.
 */
export function CallScreen({ saying, listening, thinking }: {
  readonly saying: "them" | "you" | null;
  readonly listening: boolean;
  readonly thinking: boolean;
}) {
  const t = useT();
  const status = saying === "them" ? t("They're speaking")
    : thinking ? t("Reading what you said")
    : listening ? t("Listening to you")
    : t("Your turn");
  return (
    <div data-call className="flex flex-col items-center gap-2 py-5 text-center">
      <span className="call-face rounded-full" data-speaking={saying === "them" ? "true" : "false"}>
        <SceneFace who="them" size="lg" />
      </span>
      <p className="label-xs mt-2" style={{ color: "var(--ink-3)" }}>{t("On a call")}</p>
      <CallClock />
      <p role="status" aria-live="polite" className="text-md font-medium" style={{ color: "var(--ink)" }}>{status}</p>
    </div>
  );
}

/** How long the call has been going, counting up from when it opened. Its own state, so a second ticking re-renders the clock and nothing else. */
function CallClock() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return (
    <p aria-hidden data-call-clock className="font-display text-2xl tabular-nums" style={{ color: "var(--ink-2)" }}>
      {minutes}:{rest}
    </p>
  );
}

/**
 * HEAR THEM FIRST (VB-4): the other side's opening lines from the scene bank,
 * one at a time, each played in the app's own voice and drawn so the learner
 * can say it along (`ReadAloud`). It writes nothing: a bank line here is shown
 * and spoken and never marked, which stays inside the bank's own rule, and the
 * conversation that follows draws its own lines fresh.
 *
 * One press opens it and plays the first line, so the briefing stays as short
 * as it was for somebody who would rather go straight in.
 */
export function HearFirst({ lines }: { readonly lines: readonly string[] }) {
  const t = useT();
  const [at, setAt] = useState<number | null>(null);
  if (lines.length === 0) return null;
  if (at === null) {
    return (
      <button
        type="button"
        onClick={() => setAt(0)}
        className="choice-btn press flex w-full items-center gap-3 rounded-[var(--r-lg)] border px-4 py-3 text-left"
        data-hear-first
      >
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
          <Ear size={18} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold" style={{ color: "var(--ink)" }}>{t("Hear them first")}</span>
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Their opening lines, one at a time, to say along with. Nothing is marked.")}</span>
        </span>
      </button>
    );
  }
  const line = lines[at]!;
  return (
    <section className="flex flex-col gap-3 rounded-[var(--r-lg)] border p-4" style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth)" }} aria-labelledby="scene-hear-first" data-hear-first>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="scene-hear-first" className="font-semibold" style={{ color: "var(--ink)" }}>{t("Hear them first")}</h2>
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>{fill(t("Line {n} of {total}"), { n: at + 1, total: lines.length })}</span>
      </div>
      <div className="flex items-center gap-2">
        <Speak key={line} text={line} autoplay insist size={18} label={t("Hear it")} className="press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[var(--raised)]" />
        <span className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Listen, then say it along.")}</span>
      </div>
      <ReadAloud key={`read-${line}`} line={line} label={t("Say it along")} />
      <div className="flex flex-wrap gap-2">
        {at > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setAt(at - 1)}>{t("Previous line")}</Button>
        )}
        {at < lines.length - 1 && (
          <Button variant="secondary" size="sm" onClick={() => setAt(at + 1)}>{t("Next line")}</Button>
        )}
      </div>
    </section>
  );
}
