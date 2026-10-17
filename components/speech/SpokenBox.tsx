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
 * `spoken` says the box was last filled by the microphone. Edits after that
 * keep it spoken: the learner said it and then corrected what was heard, which
 * is the edit D3 counts, and the answer marked is still the one they said.
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
      if (verdict.kind === "good") good(hearing.understood, hearing);
      else fill(verdict.text, hearing);
    },
  });
  // The one rule for a microphone beside a box (D6), shared with the rounds that draw their own.
  const shown = speech.offered && (always || micInAnswerBox(speech, config));
  const hearing = speech.hearing;
  const carriesRepair = useCallback((text: string) => repairedInAnswer(hearing, text), [hearing]);
  const reset = useCallback(() => {
    setSpoken(false);
    speech.cancel();
  }, [speech]);
  return useMemo(
    () => ({ speech, shown, spoken, hearing, carriesRepair, reset }),
    [speech, shown, spoken, hearing, carriesRepair, reset],
  );
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
