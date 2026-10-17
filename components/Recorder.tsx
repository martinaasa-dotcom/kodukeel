"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { useT } from "@/components/Locale";
import { playRecording, type PlayingRecording } from "@/lib/audio/clip";
import { SPEECH_SETTINGS } from "@/lib/speech/settings";

/**
 * YOUR OWN VOICE, PLAYED BACK, AND NOTHING ELSE.
 *
 * This used to open the microphone itself and record, on the argument that no
 * Estonian speech recognizer existed for this app to hear the recording with.
 * One does now, on the device (docs/41-fifth-batch.md, ADR-028), and the one
 * way a screen listens is `useSpeech()` (D5). So the capture moved there, and
 * what is left here is the half that was always worth having: hearing yourself
 * beside a native voice, which is how shadowing is actually practised.
 *
 * It plays the audio of the turn the engine just heard, handed over by the
 * screen (`useSpeech({ keepAudio: true })`). That audio lives in this tab only:
 * no upload and no storage. It plays through `playRecording`, the same path a
 * recording opened on the reading page takes, at its own speed, which is what
 * makes it count as the app speaking: the microphone stays closed while it
 * plays (D14), rather than hearing the learner's own voice twice. Nothing
 * here scores anything; what the machine heard is shown by the screen in
 * words, and never as a judgment of a sound.
 */
export function Recorder({ audio, label }: {
  /** The turn's audio at 16 kHz, or null where nothing has been said yet. */
  audio: Float32Array | null;
  label?: string;
}) {
  const t = useT();
  const [playing, setPlaying] = useState(false);
  const current = useRef<PlayingRecording | null>(null);

  // A new turn, or the screen going, stops the old one.
  useEffect(() => () => {
    current.current?.stop();
    current.current = null;
    setPlaying(false);
  }, [audio]);

  if (!audio || audio.length === 0) return null;

  const press = () => {
    if (current.current) {
      current.current.stop();
      return;
    }
    const play = playRecording({ samples: audio, rate: SPEECH_SETTINGS.sampleRate }, { asItWas: true });
    current.current = play;
    setPlaying(true);
    void play.ended
      .catch(() => "played" as const)
      .finally(() => {
        if (current.current === play) current.current = null;
        setPlaying(false);
      });
  };

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={playing}
      className="press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
      style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink-2)" }}
      data-hear-yourself
    >
      {playing ? <Square size={12} fill="currentColor" aria-hidden /> : <Play size={14} aria-hidden />} {label ?? t("Hear yourself")}
    </button>
  );
}
