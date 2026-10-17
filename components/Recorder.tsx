"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useT } from "@/components/Locale";
import { writeWav } from "@/lib/speech/wav";
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
 * no upload, no storage, and the object URL is released when the turn changes
 * or the screen goes. Nothing here scores anything; what the machine heard is
 * shown by the screen in words, and never as a judgment of a sound.
 */
export function Recorder({ audio, label }: {
  /** The turn's audio at 16 kHz, or null where nothing has been said yet. */
  audio: Float32Array | null;
  label?: string;
}) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!audio || audio.length === 0) {
      setUrl(null);
      return;
    }
    const bytes = writeWav({ samples: audio, rate: SPEECH_SETTINGS.sampleRate });
    const next = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: "audio/wav" }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [audio]);

  if (!url) return null;

  return (
    <button
      type="button"
      onClick={() => { void new Audio(url).play().catch(() => undefined); }}
      className="press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
      style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink-2)" }}
    >
      <Play size={14} aria-hidden /> {label ?? t("Hear yourself")}
    </button>
  );
}
