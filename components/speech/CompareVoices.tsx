"use client";

import { useEffect, useRef, useState } from "react";
import { Ear, Square } from "lucide-react";
import { useT } from "@/components/Locale";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { playClip, playRecording, untilQuiet, type PlayingRecording } from "@/lib/audio/clip";
import { SPEECH_SETTINGS } from "@/lib/speech/settings";

/**
 * YOU, THEN THEM: THE SOUND IS CHECKED BY EAR, BECAUSE NOTHING ELSE CAN.
 *
 * A learner said `aitäh` as "eye-toy" on purpose and the card lit every word.
 * That is the recognizer doing its job: it is built to understand an accent,
 * so it writes most words said with an accent as the word that was meant
 * (`docs/39-speech.md` section 3.5). `npm run measure:confidence` asked
 * whether anything it hands back, its own confidence included, can tell a
 * word said well from a word said badly, and the answer is no
 * (`docs/41-fifth-batch.md` section 8c). So the screen does not grade the
 * sound, and what it offers instead is the one comparison that works, which
 * is how shadowing is practiced anywhere: the learner's own turn, played back
 * as it was, and straight after it the native recording of the same line.
 *
 * One press, both voices, in that order, because the order is the lesson: the
 * native last is the one still in the ear. It plays the audio the engine just
 * heard (`useSpeech({ keepAudio: true })`), which lives in this tab only and
 * is never stored or sent (D1, D21). Both halves go through the paths that
 * count as the app speaking, so the microphone stays closed while either
 * plays (D14). Nothing is scored, written or graded.
 */
export function CompareVoices({ audio, text, voice, hint = false }: {
  /** The turn's audio at 16 kHz, or null before anything has been said. */
  readonly audio: Float32Array | null;
  /** The Estonian line the native recording says. */
  readonly text: string;
  /** Whose voice the native line is in, where the screen has one; the learner's own choice otherwise. */
  readonly voice?: string;
  /** Say once, beside the button, that the app checks the words and the ear checks the sound. */
  readonly hint?: boolean;
}) {
  const t = useT();
  const prefs = useAudioPrefs();
  const [playing, setPlaying] = useState<"you" | "them" | null>(null);
  const recording = useRef<PlayingRecording | null>(null);
  const run = useRef(0);

  // A new turn, or the screen going, stops whatever was playing.
  useEffect(() => () => {
    run.current += 1;
    recording.current?.stop();
    recording.current = null;
    setPlaying(null);
  }, [audio]);

  if (!audio || audio.length === 0) return null;

  const press = async () => {
    if (playing) {
      // Stopped during "you", the native half never starts; during "them" it is a second or two and ends by itself.
      run.current += 1;
      recording.current?.stop();
      recording.current = null;
      setPlaying(null);
      return;
    }
    const mine = ++run.current;
    const still = () => mine === run.current;
    setPlaying("you");
    try {
      const play = playRecording({ samples: audio, rate: SPEECH_SETTINGS.sampleRate }, { asItWas: true });
      recording.current = play;
      await play.ended.catch(() => "played" as const);
      recording.current = null;
      if (!still()) return;
      await new Promise((resolve) => setTimeout(resolve, BETWEEN_MS));
      if (!still()) return;
      setPlaying("them");
      await playClip({ text, voice: voice ?? prefs.voice, pace: prefs.pace });
      await untilQuiet(THEM_CAP_MS);
    } catch {
      // No native recording to play (offline, the service down): their own turn was heard, which is half of it.
    } finally {
      if (still()) setPlaying(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" data-compare-voices>
      <button
        type="button"
        onClick={() => void press()}
        aria-pressed={playing !== null}
        className="press inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
        style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink-2)" }}
      >
        {playing ? <Square size={12} fill="currentColor" aria-hidden /> : <Ear size={15} aria-hidden />}
        {playing === "you" ? t("You…") : playing === "them" ? t("Now them…") : t("Hear yourself, then them")}
      </button>
      {hint && (
        <span className="text-sm" style={{ color: "var(--ink-3)" }}>
          {t("The app checks the words. Your ear checks the sound.")}
        </span>
      )}
      <span className="sr-only" role="status">
        {playing === "you" ? t("Playing your recording.") : playing === "them" ? t("Playing the native recording.") : ""}
      </span>
    </div>
  );
}

/** A beat between the two voices, so they are heard as two things to compare rather than one run. */
const BETWEEN_MS = 400;
/** The longest the native half is waited for; a line is a few seconds. */
const THEM_CAP_MS = 15_000;
