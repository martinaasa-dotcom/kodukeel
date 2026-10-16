"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/Locale";
import { Button } from "@/components/Button";
import { ChoiceSegment } from "@/components/Choice";
import { MicError } from "@/components/speech/MicButton";
import { useSpeech, useSpeechConfig } from "@/components/speech/useSpeech";
import { setSpeechInBoxes, setSpeechSendAtOnce } from "@/app/actions";
import { fill } from "@/lib/copy/locale";
import { NOT_REACHED } from "@/lib/copy/values";
import { megabytes, modelBytes } from "@/lib/speech/model";

/**
 * SPEAKING, IN SETTINGS (docs/41-fifth-batch.md, VB-2).
 *
 * What a learner can decide about the microphone, and what the device says
 * about it. Whether the model is downloaded is read from where it is kept
 * (D7), never stored, so the line here is the same answer every microphone
 * in the app is drawn from. It says once that speaking is new and that what
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

  const downloaded = speech.phase === "ready" || speech.phase === "loading";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Speaking is new. Your Estonian is turned into text on this device and the sound never leaves it. What you see is the machine's hearing, and you can always change it before it counts.")}
      </p>

      <div className="flex flex-wrap items-center gap-3" data-speaking-status={speech.phase}>
        <p className="text-sm" style={{ color: "var(--ink)" }}>
          {speech.phase === "checking"
            ? t("Checking this device.")
            : downloaded
              ? fill(t("Downloaded on this device ({mb} MB)."), { mb })
              : speech.phase === "downloading"
                ? fill(t("Downloading {done} of {total} MB"), { done: megabytes(speech.progress.done), total: megabytes(speech.progress.total || modelBytes()) })
                : speech.phase === "cleared"
                  ? t("Your browser cleared the download to save space.")
                  : fill(t("Not downloaded on this device. It is {mb} MB, once."), { mb })}
        </p>
        {downloaded ? (
          <Button variant="secondary" size="sm" onClick={() => void speech.forget()}>
            {t("Delete the download")}
          </Button>
        ) : speech.phase === "needs-download" || speech.phase === "cleared" || speech.phase === "error" ? (
          <Button size="sm" onClick={() => void speech.download()}>
            {fill(t("Download {mb} MB"), { mb })}
          </Button>
        ) : null}
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
