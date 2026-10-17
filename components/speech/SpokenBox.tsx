"use client";

import { micInAnswerBox } from "./answerBoxMic";
import { useCallback, useMemo, useRef, useState } from "react";
import { useT } from "@/components/Locale";
import { cardVerdict, repairedInAnswer, type SpokenVerdict } from "@/lib/speech/verdict";
import { core, type Hearing } from "@/lib/speech/reconcile";
import { MicButton } from "./MicButton";
import { useSpeech, useSpeechConfig, type Speech } from "./useSpeech";

/**
 * AN ANSWER BOX THAT CAN BE ANSWERED ALOUD (docs/41-fifth-batch.md VB-5, VB-6).
 *
 * Every box that asks for an Estonian form can be filled by the microphone,
 * and what fills it is decided in one place, `lib/speech/verdict.ts`: a recall
 * heard exactly as the card spells it is Good, and anything else is put in the
 * box, editable, to be marked when the learner presses Check by the same
 * `checkAnswer` a typed answer meets (D4, D19). Nothing spoken writes Again or
 * Hard on its own. A word the dictionary repaired and the learner left in the
 * box grades nothing (D13); the screen asks `carriesRepair` before it writes.
 *
 * Where speaking is the task the microphone is always offered; in an answer
 * box elsewhere it appears only once the learner has downloaded the model and
 * kept the setting on (D6), so nobody meets a microphone in a box before
 * choosing speech somewhere.
 *
 * `spoken` says the box was last filled by the microphone, which is what the
 * screen reads to say "this is what was heard" and to ask `carriesRepair`.
 * What `Review.spoken` records is narrower, and is `saidAsHeard`: the answer
 * marked is exactly what the microphone put in the box (D4, the schema's own
 * note on the column). An answer edited after it was heard, or cleared and
 * typed again, is a typed answer for the log, so "said aloud this week" and
 * recall after a spoken answer count what was said and nothing typed over it.
 * One rule for every screen, and the numbers round and the conjugation chant
 * already drew it there.
 */
export interface SpokenBox {
  readonly speech: Speech;
  /** Whether this screen draws the microphone at all (D6). */
  readonly shown: boolean;
  /** The box was last filled by the microphone. */
  readonly spoken: boolean;
  /** What the last turn was heard as. */
  readonly hearing: Hearing | null;
  /** Whether the text about to be marked still holds a word the dictionary repaired (D13). */
  carriesRepair(text: string): boolean;
  /** Whether the text about to be marked is what the microphone put in the box, unedited: what `Review.spoken` records. */
  saidAsHeard(text: string): boolean;
  /** A new question: forget what was heard. */
  reset(): void;
}

export interface SpokenBoxOptions {
  /** Every spelling the marker would take, as `acceptedAnswers` returns it. */
  readonly accepted: readonly string[];
  /** Speaking is the task here, so the microphone is offered whatever the setting says (D6). */
  readonly always?: boolean;
  /** Decide a turn some other way than the card's own verdict, as the Speaking round's sentences do. */
  readonly judge?: (hearing: Hearing) => SpokenVerdict;
  /** Heard as spelled: the screen marks it as a right answer, said aloud. */
  readonly onGood: (text: string, hearing: Hearing) => void;
  /** Anything else: the screen puts the text in the box and waits for Check. */
  readonly onFill: (text: string, hearing: Hearing) => void;
  /** Keep the turn's audio, for "hear yourself". */
  readonly keepAudio?: boolean;
}

export function useSpokenBox({ accepted, always = false, judge, onGood, onFill, keepAudio }: SpokenBoxOptions): SpokenBox {
  const config = useSpeechConfig();
  const [spoken, setSpoken] = useState(false);
  /** What the microphone last put in the box, to tell an answer said from one typed over it. */
  const filled = useRef<string | null>(null);
  const latest = useRef({ accepted, judge, onGood, onFill });
  latest.current = { accepted, judge, onGood, onFill };
  // The answers are what a repair may land on: the dictionary's spelling of what they meant, never a word from nowhere.
  const expect = useMemo(
    () => new Set(accepted.flatMap((answer) => answer.split(/\s+/)).map(core).filter(Boolean)),
    [accepted],
  );
  const speech = useSpeech({
    endpoint: true,
    expect,
    keepAudio,
    onHeard: (hearing) => {
      const { accepted: answers, judge: decide, onGood: good, onFill: fill } = latest.current;
      if (!hearing.understood.trim()) return;
      const verdict = decide ? decide(hearing) : cardVerdict(hearing, answers);
      setSpoken(true);
      filled.current = verdict.kind === "good" ? hearing.understood : verdict.text;
      if (verdict.kind === "good") good(hearing.understood, hearing);
      else fill(verdict.text, hearing);
    },
  });
  // The one rule for a microphone beside a box (D6), shared with the rounds that draw their own.
  const shown = speech.offered && (always || micInAnswerBox(speech, config));
  const hearing = speech.hearing;
  const carriesRepair = useCallback((text: string) => repairedInAnswer(hearing, text), [hearing]);
  const saidAsHeard = useCallback(
    (text: string) => spoken && filled.current !== null && sameText(text, filled.current),
    [spoken],
  );
  const reset = useCallback(() => {
    setSpoken(false);
    filled.current = null;
    speech.cancel();
  }, [speech]);
  return useMemo(
    () => ({ speech, shown, spoken, hearing, carriesRepair, saidAsHeard, reset }),
    [speech, shown, spoken, hearing, carriesRepair, saidAsHeard, reset],
  );
}

/** Two answers are one where only the spaces round and between their words differ. */
function sameText(a: string, b: string): boolean {
  const squash = (text: string) => text.normalize("NFC").trim().replace(/\s+/g, " ");
  return squash(a) === squash(b);
}

/** The microphone beside an answer box, drawn only where `useSpokenBox` says (D6). */
export function AnswerMic({ box, label, shortcut = true }: { box: SpokenBox; label?: string; shortcut?: boolean }) {
  const t = useT();
  if (!box.shown) return null;
  return (
    <>
      <MicButton speech={box.speech} label={label ?? t("Answer out loud")} shortcut={shortcut} />
      {/* What was heard went into the box and is not marked until Check: said
          once, where the screen is still asking, so nobody reads a filled box
          as an answer the app has already taken. */}
      {box.spoken && (
        <p className="max-w-sm text-sm" style={{ color: "var(--ink-2)" }}>
          {t("This is what was heard. Change anything that is not what you said, then check it.")}
        </p>
      )}
    </>
  );
}
