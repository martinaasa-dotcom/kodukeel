"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Play, Square } from "lucide-react";
import { useT } from "@/components/Locale";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { playClip, playRecording, rateFor, RECORDING_LEAD_S, stretchedClip, untilQuiet, type PlayingRecording } from "@/lib/audio/clip";
import { decodeWav, type Pcm } from "@/lib/audio/wav";
import { barsPerSecond, speechOnly, waveBars, type WaveBars } from "@/lib/audio/waveBars";
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
 *
 * AND BOTH VOICES ARE DRAWN, ON ONE CLOCK. Each is a row of bars, one per
 * slice of time at one scale for the pair (`lib/audio/waveBars.ts`), so a
 * turn said slower is a longer row and a held vowel is a wider hump: Estonian
 * carries meaning in how long a sound lasts, and that is the half of the
 * comparison an eye can check. The bars light as each voice plays, so the
 * learner can follow along. It is loudness drawn and nothing else: no bar is
 * colored for right or wrong, because nothing here knows (ADR-018). The native
 * row is read off the very clip that plays, at the pace it plays at; a clip
 * that cannot be had (offline, the service down) leaves that row as a line.
 */
export function CompareVoices({ audio, text, voice, hint = false, align = "start" }: {
  /** The turn's audio at 16 kHz, or null before anything has been said. */
  readonly audio: Float32Array | null;
  /** The Estonian line the native recording says. */
  readonly text: string;
  /** Whose voice the native line is in, where the screen has one; the learner's own choice otherwise. */
  readonly voice?: string;
  /** Say once, under the button, that the app checks the words and the ear checks the sound. */
  readonly hint?: boolean;
  /** Where the card and its hint sit: against the line's edge, or under a centered card's middle. */
  readonly align?: "start" | "center";
}) {
  const t = useT();
  const prefs = useAudioPrefs();
  const [playing, setPlaying] = useState<"you" | "them" | null>(null);
  const [native, setNative] = useState<Pcm | null>(null);
  const recording = useRef<PlayingRecording | null>(null);
  const run = useRef(0);
  const request = useMemo(() => ({ text, voice: voice ?? prefs.voice, pace: prefs.pace }), [text, voice, prefs.voice, prefs.pace]);

  // A new turn, or the screen going, stops whatever was playing.
  useEffect(() => () => {
    run.current += 1;
    recording.current?.stop();
    recording.current = null;
    setPlaying(null);
  }, [audio]);

  /* The native row is drawn from the clip that will play, read once the turn
     is there to compare it with. On these screens the line has nearly always
     been played already, so this is the clip cache answering, the same warm
     read `prefetchClip` makes for the next card. */
  const hasTurn = !!audio && audio.length > 0;
  // The turn as it plays back: the speech, without the seconds of room the microphone kept after it.
  const turn = useMemo(() => (audio && audio.length > 0 ? speechOnly(audio, SPEECH_SETTINGS.sampleRate) : null), [audio]);
  useEffect(() => {
    if (!hasTurn) return;
    let live = true;
    void stretchedClip(request, rateFor(request))
      .then(async (clip) => decodeWav(new Uint8Array(await clip.blob.arrayBuffer())))
      .then((pcm) => { if (live) setNative(pcm); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [hasTurn, request]);

  const rows = useMemo(() => {
    const you = turn ? waveBars(turn, SPEECH_SETTINGS.sampleRate, 1) : null;
    const them = native ? waveBars(native.samples, native.rate, 1) : null;
    const perSecond = barsPerSecond([you?.seconds ?? 0, them?.seconds ?? 0], MOST_BARS);
    return {
      you: turn ? waveBars(turn, SPEECH_SETTINGS.sampleRate, perSecond) : null,
      them: native ? waveBars(native.samples, native.rate, perSecond) : null,
    };
  }, [turn, native]);

  if (!turn) return null;

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
      const play = playRecording({ samples: turn, rate: SPEECH_SETTINGS.sampleRate }, { asItWas: true });
      recording.current = play;
      await play.ended.catch(() => "played" as const);
      recording.current = null;
      if (!still()) return;
      await new Promise((resolve) => setTimeout(resolve, BETWEEN_MS));
      if (!still()) return;
      // `playClip` resolves as the clip starts, which is when the native row's bars start to light.
      await playClip(request);
      if (!still()) return;
      setPlaying("them");
      await untilQuiet(THEM_CAP_MS);
    } catch {
      // No native recording to play (offline, the service down): their own turn was heard, which is half of it.
    } finally {
      if (still()) setPlaying(null);
    }
  };

  return (
    <div className="compare-voices" data-compare-voices data-align={align} data-playing={playing ?? "idle"}>
      <button type="button" onClick={() => void press()} aria-pressed={playing !== null} className="compare-btn press">
        <span className="compare-play" aria-hidden>
          {playing ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </span>
        <span className="compare-body">
          <span className="compare-label">{t("Hear yourself, then them")}</span>
          <span className="compare-rows" aria-hidden>
            <Wave who="you" label={t("Your voice")} bars={rows.you} lead={RECORDING_LEAD_S} />
            <Wave who="them" label={t("Native voice")} bars={rows.them} lead={0} />
          </span>
        </span>
      </button>
      {hint && <p className="compare-hint">{t("The app checks the words. Your ear checks the sound.")}</p>}
      <span className="sr-only" role="status">
        {playing === "you" ? t("Playing your recording.") : playing === "them" ? t("Playing the native recording.") : ""}
      </span>
    </div>
  );
}

/** One voice drawn: its name, and its bars timed to light as it plays. */
function Wave({ who, label, bars, lead }: { who: "you" | "them"; label: string; bars: WaveBars | null; lead: number }) {
  return (
    <span className="compare-row" data-row={who}>
      <span className="compare-who">{label}</span>
      {/* As wide as its bars at full size, and narrower only where the card has no more room, so the two rows keep their proportion. */}
      <span className="compare-wave" style={bars ? { width: `${bars.bars.length * BAR_PITCH - BAR_GAP}px` } : undefined}>
        {bars
          ? bars.bars.map((h, i) => (
            <span
              key={i}
              className="compare-bar"
              style={{ "--h": h.toFixed(3), "--at": `${(lead + bars.start + i * bars.step).toFixed(3)}s` } as CSSProperties}
            />
          ))
          : <span className="compare-flat" />}
      </span>
    </span>
  );
}

/** A bar and the gap after it, in pixels, at full size: the stylesheet draws `.compare-bar` at 3px with a 2px gap. */
const BAR_GAP = 2;
const BAR_PITCH = 3 + BAR_GAP;
/** The most bars the longer voice is drawn with, which keeps the pair inside a phone's width. */
const MOST_BARS = 26;
/** A beat between the two voices, so they are heard as two things to compare rather than one run. */
const BETWEEN_MS = 400;
/** The longest the native half is waited for; a line is a few seconds. */
const THEM_CAP_MS = 15_000;
