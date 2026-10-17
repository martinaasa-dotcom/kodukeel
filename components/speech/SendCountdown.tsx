"use client";

import { useEffect, useRef } from "react";

/**
 * HOW LONG A HEARD LINE WAITS BEFORE IT IS SENT (docs/41-fifth-batch.md, D20).
 *
 * Two and a half seconds: long enough for the person who said it to see a
 * mishearing in the box and touch it, short enough that a round played out
 * loud is not a round of waiting. The screen that draws this stops it the
 * moment the learner touches the screen or the box, by unmounting it.
 */
export const SEND_COUNTDOWN_MS = 2500;

/**
 * The countdown, drawn as a bar running out under one line saying what will
 * happen. It sends once, when the bar is empty, and never if it was taken off
 * the screen first. Under `prefers-reduced-motion` the bar stands still and the
 * line still says it, since the wait is the information and the movement is not.
 */
export function SendCountdown({ label, onDone, ms = SEND_COUNTDOWN_MS }: {
  readonly label: string;
  readonly onDone: () => void;
  readonly ms?: number;
}) {
  const latest = useRef(onDone);
  useEffect(() => {
    latest.current = onDone;
  });
  useEffect(() => {
    const timer = setTimeout(() => latest.current(), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5" role="status">
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>{label}</p>
      <div className="h-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }} aria-hidden>
        <div className="send-countdown h-full rounded-full" style={{ background: "var(--accent)", animationDuration: `${ms}ms` }} />
      </div>
    </div>
  );
}
