"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Recorder } from "@/components/Recorder";
import { useT } from "@/components/Locale";
import { MicButton } from "@/components/speech/MicButton";
import { useSpeech } from "@/components/speech/useSpeech";
import { fill } from "@/lib/copy/locale";
import { core } from "@/lib/speech/reconcile";
import { SPEECH_SETTINGS } from "@/lib/speech/settings";

/**
 * THE SPOKEN PART, HEARD ON THE DEVICE AND STILL MARKED BY THE CANDIDATE
 * (docs/39-speech.md SP-5, docs/41-fifth-batch.md D22).
 *
 * The answer is spoken into the one microphone (D5) as a single long turn that
 * ends when the candidate presses, never on a pause, because a monologue has
 * pauses in it. A count-up clock runs beside it, as the examiner's does, and
 * going past the target is never stopped. Afterwards the screen shows what was
 * understood and which of the suggested words were heard, and plays the
 * candidate's own voice back. None of it marks anything: the criteria below
 * are still ticked by the candidate (ADR-018, amended by ADR-028, which still
 * scores no sound), and speaking stays outside `SCORED_SKILLS`.
 *
 * With the microphone denied or unavailable the part still runs: the
 * candidate speaks aloud with nobody listening and says so with one press.
 */
export function SpokenAnswer({ targetSeconds, ideas, onSpoken }: {
  targetSeconds: number;
  /** The words the card suggests, lit where they were heard. */
  ideas: readonly string[];
  onSpoken?: () => void;
}) {
  const t = useT();
  const [heard, setHeard] = useState<string | null>(null);
  const [said, setSaid] = useState(false);
  const expect = useMemo(() => new Set(ideas.map(core).filter(Boolean)), [ideas]);
  // Longer than the target, so somebody who keeps talking is not cut off; never past the engine's own limit.
  const maxSeconds = Math.min(SPEECH_SETTINGS.maxFileSeconds, Math.max(60, targetSeconds * 2));
  const speech = useSpeech({
    endpoint: false,
    maxSeconds,
    keepAudio: true,
    expect,
    onHeard: (hearing) => {
      setHeard(hearing.understood);
      setSaid(true);
      onSpoken?.();
    },
  });

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!speech.listening) return;
    const started = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [speech.listening]);

  const heardWords = new Set((heard ?? "").split(/\s+/).map(core).filter(Boolean));
  const usedIdeas = ideas.filter((idea) => heardWords.has(core(idea)));
  const noMicrophone = !speech.offered || speech.error === "refused" || speech.error === "no-microphone";

  return (
    <div className="flex flex-col items-start gap-3" data-spoken-answer>
      <div className="flex flex-wrap items-center gap-3">
        <MicButton speech={speech} label={t("Speak your answer")} shortcut showPartial={false} />
        {speech.listening && (
          <span
            className="tnum text-sm font-semibold"
            style={{ color: elapsed >= targetSeconds ? "var(--sky-ink)" : "var(--ink-2)" }}
            role="timer"
          >
            {clock(elapsed)} <span style={{ color: "var(--ink-3)" }}>{fill(t("of {total}"), { total: clock(targetSeconds) })}</span>
          </span>
        )}
        <Recorder audio={speech.audio} />
      </div>

      {heard !== null && (
        <div className="w-full rounded-[var(--r-lg)] border px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
          <p className="label-xs mb-1.5" style={{ color: "var(--ink-3)" }}>{t("What was understood")}</p>
          {heard ? (
            <p lang="et" className="text-md leading-relaxed" style={{ color: "var(--ink)" }} data-understood>{heard}</p>
          ) : (
            <p className="text-md" style={{ color: "var(--ink-2)" }}>{t("Nothing was heard.")}</p>
          )}
          {ideas.length > 0 && (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
              {usedIdeas.length > 0 ? (
                <>
                  {t("Suggested words heard:")}{" "}
                  {usedIdeas.map((idea, i) => (
                    <span key={idea}>
                      <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{idea}</span>
                      {i < usedIdeas.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </>
              ) : t("None of the suggested words were heard, which is fine: they are only ideas.")}
            </p>
          )}
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
            {t("This is the machine's hearing of your words, not a mark. You decide the marks below.")}
          </p>
        </div>
      )}

      {noMicrophone && !said && (
        <Button variant="secondary" size="sm" onClick={() => { setSaid(true); onSpoken?.(); }}>
          {t("I said it out loud")}
        </Button>
      )}
    </div>
  );
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
