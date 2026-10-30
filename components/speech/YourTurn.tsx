"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/Locale";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { playClip } from "@/lib/audio/clip";
import { clarityOf, lineWords, lightUp, litAttr, shareLit, type LineClarity } from "@/lib/speech/lightUp";
import { core } from "@/lib/speech/reconcile";
import { saidIt } from "@/lib/speech/verdict";
import { CompareVoices } from "./CompareVoices";
import { HeardAs } from "./HeardAs";
import { MicButton } from "./MicButton";
import { useSpeech } from "./useSpeech";

/**
 * "YOUR TURN", ON MEETING A WORD (docs/41-fifth-batch.md VB-6, docs/39-speech.md SP-4).
 *
 * After the word has been heard, the learner says it. The word lights as it
 * is heard, by the say-it check of section 3.6: either reading of the audio,
 * folded the way an English ear folds, against the word as spelled, and never
 * a hotword. Where it was not heard as the word, the screen plays it again
 * rather than saying anything was wrong, because a meeting grades nothing and
 * a word not accepted is not a mistake.
 *
 * Offered wherever speech is (D6: speaking is the task on the meet rung), and
 * skipped by simply carrying on, which is the press the screen already has.
 *
 * "Understood" is the word on the screen, because that is all the check can
 * say: a word said with an accent is understood too. How it sounded is the
 * learner's ear's to judge, so once they have said it `CompareVoices` plays
 * their turn back and then the native word.
 */
export function YourTurn({ text }: { text: string }) {
  const t = useT();
  const { voice, pace } = useAudioPrefs();
  const words = useMemo(() => lineWords(text), [text]);
  const expect = useMemo(() => new Set(words.map((w) => core(w.text)).filter(Boolean)), [words]);
  const [outcome, setOutcome] = useState<"heard" | "again" | null>(null);
  const [understood, setUnderstood] = useState("");
  const [clarity, setClarity] = useState<LineClarity | null>(null);
  const speech = useSpeech({
    endpoint: true,
    expect,
    keepAudio: true,
    onHeard: (hearing, raw) => {
      setUnderstood(hearing.understood);
      setClarity(clarityOf(words, hearing.words));
      const heard = saidIt(raw, text) || shareLit(lightUp(words, hearing.understood)) === 1;
      setOutcome(heard ? "heard" : "again");
      if (!heard) void playClip({ text, voice, pace }).catch(() => undefined);
    },
  });
  if (!speech.offered) return null;

  const lit = outcome === "heard" ? words.map(() => true) : lightUp(words, speech.listening ? speech.partial : understood);

  return (
    <div className="flex flex-col items-center gap-2" data-your-turn>
      <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Your turn")}</p>
      <p lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }} aria-hidden>
        {words.map((w, i) => (
          <span key={`${i}-${w.text}`}>
            <span className="read-aloud-word" data-lit={litAttr(lit[i]!, outcome && !speech.listening && clarity?.clarity[i] === "close" ? "close" : null)}>{w.text}</span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
      <MicButton speech={speech} label={t("Say it yourself")} shortcut showPartial={false} fallback="none" />
      {outcome && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }} role="status">
          {outcome === "heard"
            ? clarity?.clarity.includes("close") ? t("Understood.") : t("Understood. That's the word.")
            : t("That wasn't heard as the word this time. Here it is again; say it once more if you like.")}
        </p>
      )}
      {outcome && !speech.listening && !speech.thinking && (
        <div className="turn-after flex flex-col items-center gap-3 text-center">
          {outcome === "heard" && clarity && <HeardAs line={words} clarity={clarity} />}
          {!speech.silent && <CompareVoices audio={speech.audio} text={text} hint={outcome === "heard"} align="center" />}
        </div>
      )}
    </div>
  );
}
