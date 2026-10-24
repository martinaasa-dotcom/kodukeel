"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/Locale";
import { ChoiceSegment } from "@/components/Choice";
import { MicError } from "@/components/speech/MicButton";
import { useBackgroundDownloadAllowed, useSpeech, useSpeechConfig } from "@/components/speech/useSpeech";
import { Button } from "@/components/Button";
import { setSpeechInBoxes, setSpeechSendAtOnce } from "@/app/actions";
import { fill } from "@/lib/copy/locale";
import { NOT_REACHED, keepUnits } from "@/lib/copy/values";
import { megabytes, modelBytes } from "@/lib/speech/model";

/**
 * SPEAKING, IN SETTINGS (docs/41-fifth-batch.md, VB-2).
 *
 * What a learner can decide about the microphone, and what the device says
 * about it. Whether the model is downloaded is read from where it is kept
 * (D7), never stored, so the line here is the same answer every microphone
 * in the app is drawn from. The download itself is nobody's decision: the
 * shell fetches it in the background where the connection is free, and where
 * it was held back (a phone on mobile data, or one that cannot say, D10 of
 * docs/44-sixth-batch.md) this says so and offers "Download now", which is a
 * press rather than a question. It says once that speaking is new and that what
 * appears is the machine's hearing (D23), and where this deployment or this
 * device cannot hear Estonian it says why in one line rather than showing
 * controls that do nothing.
 */
export function SpeakingPanel() {
  const t = useT();
  const router = useRouter();
  const config = useSpeechConfig();
  const speech = useSpeech();
  const [sendAtOnce, setSendAtOnce] = useState<"on" | "off">(config.sendAtOnce ? "on" : "off");
  const [inBoxes, setInBoxes] = useState<"on" | "off">(config.inBoxes ? "on" : "off");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const backgroundAllowed = useBackgroundDownloadAllowed();
  const mb = megabytes(modelBytes());

  if (speech.why === "off" || speech.why === "no-model") {
    return (
      <p className="text-sm" style={{ color: "var(--ink-2)" }} data-speaking-status="unavailable">
        {speech.why === "off"
          ? t("Speaking is switched off on this installation, so everything is typed as before.")
          : t("This installation has no speech model, so everything is typed as before.")}
      </p>
    );
  }
  if (speech.why === "too-slow") {
    return (
      <p className="text-sm" style={{ color: "var(--ink-2)" }} data-speaking-status="too-slow">
        {t("This device is too slow to hear speech as you say it, so typing stays as it was.")}
      </p>
    );
  }

  const save = (action: (value: string) => Promise<unknown>, next: "on" | "off", previous: "on" | "off", set: (v: "on" | "off") => void) => {
    set(next);
    setFailed(false);
    start(async () => {
      const landed = await action(next).then(() => true).catch(() => false);
      if (!landed) {
        set(previous);
        setFailed(true);
        return;
      }
      router.refresh();
    });
  };

  // There is no button to delete: a device fetches the model on its own in
  // the background where the connection is free (SpeechPrefetch), which is
  // the operator's call. "Download now" is drawn only where that download was
  // held back and the model is not here yet.
  const downloaded = speech.phase === "ready" || speech.phase === "loading";
  const heldBack = !backgroundAllowed && (speech.phase === "needs-download" || speech.phase === "cleared");

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Speaking is new. Your Estonian is turned into text on this device and the sound never leaves it. What you see is the machine's hearing, and you can always change it before it counts.")}
      </p>

      <div className="flex flex-wrap items-center gap-3" data-speaking-status={speech.phase} data-speaking-held={heldBack ? "" : undefined}>
        <p className="min-w-0 flex-1 text-sm" style={{ color: "var(--ink)" }}>
          {speech.phase === "checking"
            ? t("Checking this device.")
            : downloaded
              ? keepUnits(fill(t("Downloaded on this device ({mb} MB)."), { mb }))
              : speech.phase === "downloading"
                ? keepUnits(fill(t("Downloading {done} of {total} MB"), { done: megabytes(speech.progress.done), total: megabytes(speech.progress.total || modelBytes()) }))
                : heldBack
                  ? keepUnits(fill(t("The speech model is not on this device yet. It downloads on Wi-Fi or the first time you press a microphone, {mb} MB once."), { mb }))
                  : keepUnits(fill(t("The speech model is not on this device yet. It downloads by itself in the background, {mb} MB once."), { mb }))}
        </p>
        {heldBack && (
          <Button variant="secondary" size="sm" onClick={() => void speech.download()}>
            {keepUnits(fill(t("Download now ({mb} MB)"), { mb }))}
          </Button>
        )}
      </div>
      {speech.error && speech.error !== "too-slow" && <MicError error={speech.error} onRetry={null} />}

      <div>
        <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Microphone in answer boxes")}</h3>
        <ChoiceSegment
          ariaLabel={t("Microphone in answer boxes")}
          value={inBoxes}
          disabled={pending}
          onSelect={(next) => save(setSpeechInBoxes, next, inBoxes, setInBoxes)}
          options={[
            { id: "on", title: t("Show it"), detail: t("Once the download is on this device, a microphone sits beside every box that takes an Estonian answer.") },
            { id: "off", title: t("Hide it"), detail: t("The microphone stays where speaking is the task: a conversation, the speaking round and meeting a new word.") },
          ]}
        />
      </div>

      <div>
        <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("When what you say matches a line")}</h3>
        <ChoiceSegment
          ariaLabel={t("When what you say matches a line")}
          value={sendAtOnce}
          disabled={pending}
          onSelect={(next) => save(setSpeechSendAtOnce, next, sendAtOnce, setSendAtOnce)}
          options={[
            { id: "off", title: t("Wait a moment"), detail: t("The line you said lights up and is sent after a short ring, so you can stop it if it was misheard.") },
            { id: "on", title: t("Send it straight away"), detail: t("The line you said is sent as soon as it is heard.") },
          ]}
        />
      </div>
      {failed && <p className="text-sm" role="status" style={{ color: "var(--ink-2)" }}>{t(NOT_REACHED)}</p>}
    </div>
  );
}
