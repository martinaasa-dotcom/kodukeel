"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/Locale";
import { Button } from "@/components/Button";
import { MicButton } from "@/components/speech/MicButton";
import { SpeechProvider, useSpeech } from "@/components/speech/useSpeech";
import { fill } from "@/lib/copy/locale";
import { matchPick } from "@/lib/speech/matchPick";
import { lineWords } from "@/lib/speech/lightUp";
import { core } from "@/lib/speech/reconcile";
import { megabytes, modelBytes } from "@/lib/speech/model";
import { keepUnits } from "@/lib/copy/values";

/**
 * THE CAFÉ, SAID OUT LOUD (docs/41-fifth-batch.md, VB-15).
 *
 * Loaded only when a visitor presses "Say it instead", by a dynamic import, so
 * nothing here (the hook, the engine's main-thread half, the microphone) is in
 * the landing page's first load and `npm run check:landing` does not grow. The
 * model itself downloads only after a sentence saying how large it is (D7).
 *
 * What was heard is matched to the step's own lines after decoding (D8, D20):
 * a line lights only when most of its words were heard in order and no other
 * line comes near, and nothing is sent until the visitor presses it or the
 * café's countdown runs out with it visibly lit. The scene still receives a
 * pick's id and never the text (`app/api/demo-scene/route.ts`), so every path
 * through the café is the one a pick takes.
 */
export default function CafeVoice(props: CafeVoiceProps & { readonly modelBase: string }) {
  return (
    <SpeechProvider value={{ modelBase: props.modelBase, unavailable: null, inBoxes: false, sendAtOnce: false }}>
      <Listening {...props} />
    </SpeechProvider>
  );
}

export interface CafeVoiceProps {
  /** The Estonian of the step's picks, in their order on screen. */
  readonly picks: readonly string[];
  /** A pick was heard clearly enough to light it. */
  readonly onMatch: (index: number) => void;
  /** A new turn began, so whatever was lit is no longer what was said. */
  readonly onListen: () => void;
  /**
   * The press that loaded this was a press to talk, so the first time it
   * appears it listens, or asks for the download, without a second press.
   * The café draws this afresh at every step, and a later step opens the
   * microphone only on a press of its own: the microphone is used after a
   * press and never on arrival (D21), and a "Not now" stays said.
   */
  readonly startAtOnce: boolean;
  /** Called once the first press has been answered, so a later step does not answer it again. */
  readonly onStarted: () => void;
}

function Listening({ picks, onMatch, onListen, startAtOnce, onStarted }: CafeVoiceProps) {
  const t = useT();
  // The step's lines as one value: the café hands a fresh array on every
  // render, and a new array is not a new step (lighting a line re-renders it).
  const step = picks.join("\n");
  const expect = useMemo(
    () => new Set(step.split("\n").flatMap((pick) => lineWords(pick).map((w) => core(w.text))).filter(Boolean)),
    [step],
  );
  const [said, setSaid] = useState<{ readonly text: string; readonly matched: boolean } | null>(null);
  const [nothing, setNothing] = useState(false);
  const [asking, setAsking] = useState(false);
  const latest = useRef({ picks, onMatch });
  latest.current = { picks, onMatch };

  const speech = useSpeech({
    endpoint: true,
    expect,
    onHeard: (hearing) => {
      const match = matchPick(latest.current.picks, hearing.understood);
      setSaid({ text: hearing.understood, matched: match.index !== null });
      if (match.index !== null) latest.current.onMatch(match.index);
    },
    onNothing: () => setNothing(true),
  });

  // The press that loaded this was a press to talk: once the device has been looked at, talk, or ask for the download.
  const started = useRef(false);
  useEffect(() => {
    if (!startAtOnce || started.current || speech.phase === "checking") return;
    started.current = true;
    onStarted();
    if (speech.phase === "ready") void speech.start();
    else if (speech.phase === "needs-download" || speech.phase === "cleared") setAsking(true);
  }, [speech, startAtOnce, onStarted]);

  // A new step is a new turn: what was said about the last one is gone.
  useEffect(() => {
    setSaid(null);
    setNothing(false);
  }, [step]);

  useEffect(() => {
    if (speech.listening) {
      setSaid(null);
      setNothing(false);
      onListen();
    }
  }, [speech.listening, onListen]);

  const mb = megabytes(modelBytes());
  const download = async () => {
    setAsking(false);
    await speech.download();
    void speech.start();
  };

  if (asking) {
    return (
      <div className="explain-panel flex flex-col gap-3" role="group" aria-label={t("Download for speaking")}>
        <p className="text-sm" style={{ color: "var(--ink)" }}>
          {keepUnits(fill(t("To hear you, Kodukeel needs a one-time download of {mb} MB. It stays in this browser, and what you say never leaves your device."), { mb }))}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>{t("Not now")}</Button>
          <Button variant="primary" size="sm" onClick={() => void download()}>{keepUnits(fill(t("Download {mb} MB"), { mb }))}</Button>
        </div>
      </div>
    );
  }

  const refused = speech.error === "refused" || speech.error === "no-microphone";
  return (
    <div className="flex flex-col gap-2" data-cafe-voice>
      <div className="flex flex-wrap items-center gap-3">
        <MicButton speech={speech} label={t("Say one of the lines")} shortcut speaksForItself />
        {!speech.listening && !speech.thinking && speech.phase !== "downloading" && speech.phase !== "loading" && (
          // A lit line is announced by the café itself, with what happens next
          // (CafeScene's own status), so this line is not a second voice saying it.
          <p className="min-w-0 flex-1 text-sm" style={{ color: "var(--ink-2)" }} role={said?.matched ? undefined : "status"}>
            {refused
              ? t("The microphone is blocked for this site, so picking a line is the way on.")
              : speech.error === "too-slow"
                // Its own cause, said as itself: trying again on the same device would end the same way.
                ? t("This device is too slow to hear speech, so picking a line is the way on.")
              : speech.error
                ? t("Hearing didn't work just now. Picking a line works the same.")
                : said
                  ? said.matched
                    ? fill(t("Heard “{text}”, and that line is lit."), { text: said.text })
                    : fill(t("Heard “{text}”, which isn't close enough to one of these lines. Try again, or pick one."), { text: said.text })
                  : nothing
                    ? t("Nothing was heard. Press the microphone and say one of the lines.")
                    : t("Press the microphone and say one of the lines.")}
          </p>
        )}
      </div>
    </div>
  );
}
